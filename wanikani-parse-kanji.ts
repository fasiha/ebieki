import assert from 'assert';
import {readFileSync, writeFileSync} from 'fs';

interface AuxiliaryMeaning {
  meaning: string;
  type: string;
}
interface Meaning {
  meaning: string;
  primary: boolean;
  accepted_answer: boolean;
}
interface Common {
  id: number;
  auxiliary_meanings: AuxiliaryMeaning[];
  characters: string;
  created_at: string;
  document_url: string;
  hidden_at: string|null;
  lesson_position: number;
  level: number;
  meaning_mnemonic: string;
  meanings: Meaning[];
  slug: string;
  spaced_repetition_system_id: number;
}

interface CharacterImage {
  url: string;
  content_type: string;
  metadata: Record<string, any>;
}
interface RadicalOnly {
  amalgamation_subject_ids: number[];
  characters: string|null;
  character_images: CharacterImage[];
}

interface Reading {
  reading: string;
  primary: boolean;
  accepted_answer: boolean;
  type: string;
}
interface KanjiOnly {
  amalgamation_subject_ids: number[];
  component_subject_ids: number[];
  meaning_hint: string;
  reading_hint: string;
  reading_mnemonic: string;
  readings: Reading[];
  visually_similar_subject_ids: number[];
}
type Kanji = KanjiOnly&Common;
type Radical = RadicalOnly&Common;

const radicalToUnicode: Record<string, string> = {
  stick: '丨',
  gun: '𠂉',
  leaf: '丆',
  hat: '𠆢',
  triceratops: '⺌',
  beggar: '⿺㇉一',
  horns: '丷',
  spikes: '业',
  viking: '⿱𭕄冖',
  kick: '𧘇',  // 展 doesn't have the 丿 but the rest do
  hills: '之', // all kanji using this use it with the "drop" on top so
  cleat: '爫',
  pope: '⿱十目',
  chinese: '𦰩',
  blackjack: '龷',
  trash: '⿱亠厶',
  bear: '㠯',
  tofu: '⿸⿱丿𠄌⿺乀丿',
  spring: '𡗗',
  cape: '𠃌',
  creeper: '𠮛',
  bar: '㦮',
  grass: '𭕄',
  zombie: '袁',
  squid: '㑒',
  yurt: '⿸广廿',
  explosion: '⿱丷八',
  comb: '⿰丨亖',
  morning: '𠦝',
  coral: '丞',
  cactus: '⿰业丶',
  psychopath: '⿱冖⿰鬯彡',
  satellite: '⿱爫𠙻',
  elf: '⿰⿱丅耳攵',
  gladiator: '龹',
  'death-star': '俞',
};
const IDC = new Set('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻'.split(''));

const [radicals, kanjis] =
    JSON.parse(readFileSync('all-radical-kanji.json', 'utf8'))
        .map((o: any) => o.data.map((o: any) => ({...o.data, id: o.id}))) as [Radical[], Kanji[]];
{
  const nounicode = radicals.filter(r => !r.hidden_at).filter(r => !(r.characters || radicalToUnicode[r.slug]));
  if (nounicode.length) { console.error(nounicode); }
  assert(nounicode.length === 0, 'Missing Unicode character');
}

const idToRadical = new Map(radicals.map(r => [r.id, r]))
const kanjiToRadicals =
    new Map(kanjis.map(k => [k.characters, k.component_subject_ids.map(n => idToRadical.get(n) as Radical)]));
{ assert(Array.from(kanjiToRadicals.values()).filter(x => !x).length === 0, 'Found kanji without radicals'); }
function radicalToString(r: Radical) { return r.characters || radicalToUnicode[r.slug]; }
/** This contains single-char strings of full kanji or Unicode pieces */
const radicalFullSet =
    new Set(radicals.filter(r => !r.hidden_at).flatMap(r => radicalToString(r).split('').concat(radicalToString(r))));
const radicalSet = new Set(radicals.filter(r => !r.hidden_at).flatMap(r => radicalToString(r)));

/**
 * Goal: return an array that contains all the kanji in input that I know about interspersed with radicals to learn.
 */
function findBestPath(newKanji: string, knownKanji: string, {verbose = false, limit = Infinity} = {}) {
  let unlockedEither: Set<string> = new Set(enumerateUpstream(knownKanji));
  let lockedKanji = new Set(newKanji.split('').filter(k => kanjiToRadicals.has(k) && !unlockedEither.has(k)));

  for (let IDX = 0; IDX < limit && lockedKanji.size > 0; IDX++) {
    if (verbose) {
      console.log({IDX, unlocked: Array.from(unlockedEither).join(' '), locked: Array.from(lockedKanji).join(' ')});
    }
    const cannotLearnNow: string[] = [];
    for (const k of lockedKanji) {
      const rad = kanjiToRadicals.get(k);
      if (!rad) { continue; } // TypeScript pacification
      const radStrings = rad.map(radicalToString);
      if (radStrings.every(s => unlockedEither.has(s))) {
        // we can learn this now
        lockedKanji.delete(k);
        // TODO maybe organize the set of kanji added this iteration further?
        unlockedEither.add(k);
      } else {
        cannotLearnNow.push(k);
      }
    }
    if (cannotLearnNow.length === 0) { break; }

    // find kanji with fewest unknown radicals, learn those radicals+kanji. Stop when you find two kanji with same # of
    // unknown radicals
    const unlockableRadicals =
        cannotLearnNow
            .map(k =>
                     ({k, r: (kanjiToRadicals.get(k))?.map(radicalToString).filter(s => !unlockedEither.has(s)) || []}))
            .sort((a, b) => a.r.length - b.r.length);
    let unlockableIdxStop = -1;
    for (let [j, rads] of unlockableRadicals.entries()) {
      if (!unlockableRadicals[j + 1] || rads.r.length < unlockableRadicals[j + 1].r.length) {
        for (const r of rads.r) {
          unlockedEither.add(r);
          lockedKanji.delete(r); // probably not necessary
        }
        unlockedEither.add(rads.k);
        lockedKanji.delete(rads.k);
      } else {
        unlockableIdxStop = j;
        break;
      }
    }
    if (unlockableIdxStop >= 0 && unlockableIdxStop < unlockableRadicals.length) {
      // We've found kanji with equal number of unknown radicals (i.e., two kanji unknown, each with two unknown
      // radicals). Of the kanji with the fewest unknown radicals, find the radical that's most similar to known
      // radicals and learn that. If there's more than one such radical (i.e., two radicals equally similar to known
      // radicals), learn the radical that is used by the most kanji in the set of unknown kanji.
      const subset = unlockableRadicals.filter(o => o.r.length === unlockableRadicals[0].r.length);
      const radicalSubset = subset.map(
          o => ({...o, unknown: o.r.join('').split('').filter(c => !unlockedEither.has(c) && !IDC.has(c)).length}));
      if (!radicalSubset[1] || radicalSubset[0].unknown < radicalSubset[1].unknown) {
        for (const r of radicalSubset[0].r) {
          unlockedEither.add(r);
          lockedKanji.delete(r);
        }
        unlockedEither.add(radicalSubset[0].k);
        lockedKanji.delete(radicalSubset[0].k);
      } else {
        // Find the radical that unlocks the most
        const whichUnlocksMost =
            new Set(radicalSubset.filter(o => o.unknown === radicalSubset[0].unknown).flatMap(o => o.r));
        const freq = hist(
            Array.from(lockedKanji)
                .flatMap(k => kanjiToRadicals.get(k)?.map(radicalToString).filter(s => whichUnlocksMost.has(s)) || []),
            x => x);
        const bestRadical = freq[0].val;
        unlockedEither.add(bestRadical);
        lockedKanji.delete(bestRadical);
      }
    }
  }
  if (verbose) {
    console.log('final', {unlocked: Array.from(unlockedEither).join(' '), locked: Array.from(lockedKanji).join(' ')});
  }
  return Array.from(unlockedEither);
}

function enumerateUpstream(raw: string) {
  let seen: Set<string> = new Set();
  let unseen = raw.split('').filter(s => kanjiToRadicals.has(s));
  for (let i = 0; i < 50 && unseen.length > 0; i++) {
    let up = unseen
                 .flatMap(k => kanjiToRadicals.get(k)?.flatMap(
                                   r => radicalToString(r).split('').concat(radicalToString(r))) ||
                               [])
                 .filter(s => !seen.has(s));
    for (const u of up) { seen.add(u); }
    unseen = up;
  }
  return Array.from(seen.values()).filter(k => kanjiToRadicals.has(k) || radicalSet.has(k));
}

function hist<T>(arr: T[], mapper: (x: T) => string | number) {
  const freq: Record<string|number, {val: T, freq: number}> = {};
  for (const x of arr) {
    const y = mapper(x);
    if (freq[y]) {
      freq[y].freq++;
    } else {
      freq[y] = {val: x, freq: 1};
    }
  }
  return Object.values(freq).sort((a, b) => b.freq - a.freq);
}

if (module === require.main) {
  const fs = require('fs');
  console.log(process.argv)
  const unknown = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8')
                                  : '配る・賦る購入照明深い変わっている・変わってる順路最初白子成育過程示す明';
  const known = process.argv[3] || '日月';
  console.log(findBestPath(unknown, known, {limit: 100, verbose: false}).join(' '));
  console.log(enumerateUpstream('配子成育'))
}