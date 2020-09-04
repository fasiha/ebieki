import assert from 'assert';
import {readFileSync, writeFileSync} from 'fs';

import {combinations} from './comb';

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
function findBestPath(newKanji: string, knownKanji: string, {
  verbose = false,
  limit = Infinity,
  greedySearchLimit = 20,
  maxRadicalsToLearn = 2,
} = {}) {
  let unlockedEither: Set<string> = new Set(enumerateAllKnown(knownKanji));
  const unlockedNotes: Map<string, string> =
      new Map(Array.from(unlockedEither, s => [s, 'Already known ' + kanjiToRadicals.has(s) ? 'kanji' : 'radical']));

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
        unlockedNotes.set(k, 'All radicals known');
      } else {
        cannotLearnNow.push(k);
      }
    }
    if (cannotLearnNow.length === 0) { break; }

    // Of all the radicals we could learn, find the two (customizable) that'll enable us to learn the most kanji right
    // away
    const unlockableRadicals = cannotLearnNow.map(
        k => ({k, r: (kanjiToRadicals.get(k))?.map(radicalToString).filter(s => !unlockedEither.has(s)) || []}));
    let candidateRadicals = Array.from(new Set(unlockableRadicals.flatMap(o => o.r)));
    const freq = hist(candidateRadicals, x => x);
    if (candidateRadicals.length > greedySearchLimit) {
      candidateRadicals = freq.slice(0, greedySearchLimit).map(o => o.val);
    }
    let best = {radicals: [] as string[][], nUnlocked: 0};
    const it: IterableIterator<typeof candidateRadicals> = combinations(candidateRadicals, maxRadicalsToLearn);
    for (const toLearn of it) {
      const s = Array.from(new Set(toLearn));
      const numDeps =
          unlockableRadicals.map(o => o.r.reduce((count, rad) => count - (s.includes(rad) && 1 || 0), o.r.length));
      const kanjiUnlocked = numDeps.filter(x => x === 0).length;
      if (kanjiUnlocked > best.nUnlocked) {
        best = {radicals: [s], nUnlocked: kanjiUnlocked};
      } else if (kanjiUnlocked === best.nUnlocked) {
        best.radicals.push(s);
      }
    }
    if (best.radicals.length > 0) {
      const freqMap = new Map(freq.map(o => [o.val, o.freq]));
      const status = {argmin: -1};
      argmin(best.radicals, rads => -rads.reduce((prev, curr) => prev + (freqMap.get(curr) || 0), 0), status);
      const chosen = best.radicals[status.argmin];
      for (const r of chosen) {
        unlockedEither.add(r);
        lockedKanji.delete(r);
        unlockedNotes.set(r, `Will unlock ${best.nUnlocked} now!`);
      }
    } else {
      unlockedEither.add(freq[0].val);
      lockedKanji.delete(freq[0].val);
      unlockedNotes.set(freq[0].val, `Will _eventually_ unlock ${freq[0].freq}`);
    }
  }
  if (verbose) {
    console.log('final', {unlocked: Array.from(unlockedEither).join(' '), locked: Array.from(lockedKanji).join(' ')});
  }
  return {unlocked: unlockedEither, locked: lockedKanji, notes: unlockedNotes};
}

/**
 * Given an array of `T` and a function to map `T` to a number, find the index of the `T` that yields the smallest
 * number. If `status = {}` if provided, you will also get
 * - the minimizing `T` element, `min`
 * - the minimizing index, `argmin`
 * - the number that this minimizer was mapped to.
 */
export function argmin<T>(arr: T[], map: (element: T) => number,
                          status?: {min?: T, argmin?: number, minmapped?: number}): number {
  let smallestElement: T|undefined = undefined;
  let smallestMapped = Infinity;
  let smallestIdx = -1;
  for (const [i, x] of arr.entries()) {
    const mapped = map(x)
    if (mapped < smallestMapped) {
      smallestElement = x;
      smallestMapped = mapped;
      smallestIdx = i;
    }
  }
  if (status) {
    status.min = smallestElement;
    status.argmin = smallestIdx;
    status.minmapped = smallestMapped;
  }
  return smallestIdx;
}

/**
 * Given a string containing kanji you know, make a list of all kanji and radicals that you must known. I.e., enumerate
 * all ancestors of the kanji you know.
 */
function enumerateAllKnown(raw: string) {
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

/**
 * Pseudo-histogram. Given an array of `T` and a function that maps `T` to `number|string`, return the sorted list of
 * `T`s and the number of times `T` appeared in the input.
 */
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

  const res = findBestPath(unknown, known, {limit: 1000, verbose: false});
  console.log(
      Array.from(res.unlocked, k => `${k} (${kanjiToRadicals.has(k) ? 'K' : 'R'}: ${res.notes.get(k)})`).join('\n'));
  console.log(Array.from(res.locked).join('!'));
  console.log(enumerateAllKnown('配子成育'))
}