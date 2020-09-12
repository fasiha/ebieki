import assert from 'assert';
import {readFileSync, writeFileSync} from 'fs';

import {combinations} from './comb';
import {hasKanji} from './kana';

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

let radicals: Radical[];
let kanjis: Kanji[];
let data_updated_at: string;
{
  type Res = {data_updated_at: string, data: {data: any, id: number}[]}[];
  const loaded: {radicals: Res, kanjis: Res} = JSON.parse(readFileSync('all-radical-kanji.json', 'utf8'));
  data_updated_at =
      loaded.kanjis.map(o => o.data_updated_at).concat(loaded.radicals.map(o => o.data_updated_at)).sort()[0];
  radicals = loaded.radicals.flatMap(o => o.data.map(v => ({...v.data, id: v.id})))
  kanjis = loaded.kanjis.flatMap(o => o.data.map(v => ({...v.data, id: v.id})))
}
{
  const nounicode = radicals.filter(r => !r.hidden_at).filter(r => !(r.characters || radicalToUnicode[r.slug]));
  if (nounicode.length) { console.error(nounicode); }
  assert(nounicode.length === 0, 'Missing Unicode character');
}

const idToRadical = new Map(radicals.map(r => [r.id, r]))
export const kanjiToRadicals =
    new Map(kanjis.map(k => [k.characters, k.component_subject_ids.map(n => idToRadical.get(n) as Radical)]));
export const kanjiToRadicalStr = new Map(
    kanjis.map(k => [k.characters, k.component_subject_ids.map(n => radicalToString(idToRadical.get(n) as Radical))]));
{ assert(Array.from(kanjiToRadicals.values()).filter(x => !x).length === 0, 'Found kanji without radicals'); }
export function radicalToString(r: Radical) { return r.characters || radicalToUnicode[r.slug]; }
const radicalSet = new Set(radicals.filter(r => !r.hidden_at).flatMap(r => radicalToString(r)));

export function findBestPathVocab(vocab: string[], knownKanji: string, {
  limit = Infinity,
  greedySearchLimit = 20,
  maxRadicalsToLearn = 2,
} = {}) {
  const locked = new Set(vocab);
  const init = enumerateAllKnown(knownKanji);
  for (const i of init) { locked.delete(i); }
  const unlocked: Map<string, string> = new Map(init.map(o => [o, `Already known`]));

  function vocabToUnknownRadicals(vocab: string) {
    const ret: string[] = [];
    for (const c of vocab) {
      for (const r of kanjiToRadicalStr.get(c) || []) {
        if (!unlocked.has(r)) { ret.push(r); }
      }
    }
    return ret;
  }

  for (let IDX = 0; IDX < limit && locked.size > 0; IDX++) {
    const radicalChoices: Map<string, number> = new Map();
    // First, find vocab that we know all kanji or all the radicals for
    for (const vocab of locked) {
      const unknownRadicals = vocabToUnknownRadicals(vocab);
      if (unknownRadicals.length === 0) {
        locked.delete(vocab);
        unlocked.set(vocab, `All radicals known`);
      } else {
        for (const r of unknownRadicals) { radicalChoices.set(r, (radicalChoices.get(r) || 0) + 1); }
      }
    }
    if (locked.size === 0) { break; }

    // Now let's pick two (customizable) radicals to learn that'll unlock the most vocab right away
    const freq = Array.from(radicalChoices.entries()).sort((a, b) => b[1] - a[1]);
    const memo = Array.from(
        locked, vocab => vocab.split('').flatMap(c => (kanjiToRadicalStr.get(c) || []).filter(c => !unlocked.has(c))));
    let {minX: bestRadicals, minY: numUnlocked} =
        argmin(combinations(freq.slice(0, greedySearchLimit).map(o => o[0]), maxRadicalsToLearn),
               proposed => -memo.filter(rads => rads.every(rad => proposed.includes(rad))).length);
    numUnlocked = Math.abs(numUnlocked);
    let note = '';
    if (!bestRadicals || numUnlocked === 0) {
      // We couldn't find any radicals that will unlock vocab right away. Go with the most useful radical.
      bestRadicals = [freq[0][0]];
      note = `Used in ${freq.length} vocab`;
    } else {
      note = `Will unlock ${numUnlocked} vocab now!`;
    }
    for (const r of bestRadicals) {
      locked.delete(r);
      unlocked.set(r, note);
    }
  }
  return {unlocked, locked};
}

/**
 * Given a list of `T` and a function to map `T` ("x") to a number ("y"), find:
 * - the minimizing `T` element, `minX`
 * - the number that this minimizer was mapped to, `minY`
 * - the minimizing index, `argmin`
 */
export function argmin<T>(arr: IterableIterator<T>|T[], map: (x: T) => number) {
  let minX: T|undefined = undefined;
  let minY = Infinity;
  let idxMin = -1;
  let i = 0;
  for (const x of arr) {
    const y = map(x);
    if (y < minY) {
      minX = x;
      minY = y;
      idxMin = i;
    }
    i++;
  }
  return {minX, argmin: idxMin, minY};
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

if (module === require.main) {
  {
    const metadata = {
      source: 'Dependency graph from Wanikani https://www.wanikani.com via Ebieki https://github.com/fasiha/ebieki',
      data_updated_at,
    };
    let towrite: Record<string, string[]|Record<string, string>> = {
      metadata,
      ...Object.fromEntries(Array.from(kanjiToRadicalStr.entries(), ([k, v]) => [k, v]))
    };
    writeFileSync('wanikani-kanji-graph.json', JSON.stringify(towrite));
  }
  const known = '一日十目田中口人二三木月';

  {
    const vocab = readFileSync('table.txt', 'utf8').split('\n').map(s => s.slice(0, s.indexOf(' ')));

    const vset = new Set(vocab);
    const res = findBestPathVocab(vocab, known);
    console.log('## Path through radicals for vocabulary')
    console.log(Array
                    .from(res.unlocked, ([v, note]) => `${v}: ${note} ${
                                            vset.has(v) ? v.split('')
                                                              .filter(s => kanjiToRadicals.has(s))
                                                              .flatMap(s => kanjiToRadicals.get(s) || [])
                                                              .map(radicalToString)
                                                              .join(';')
                                                        : ''}`)
                    .join('\n'));
    console.log(`### Didn't reach these in time :(`);
    console.log(Array.from(res.locked).join('!'));
  }
  {
    const unknown = Array.from(new Set(readFileSync('table.txt', 'utf8').split('').filter(s => hasKanji(s))));
    const res = findBestPathVocab(unknown, known);
    console.log('## Kanji-only: path through radicals and individual kanji (not vocabulary)');
    console.log(Array.from(res.unlocked, ([v, note]) => `- ${v}: ${note}`).join('\n'));
    console.log(`### Didn't reach these in time :(`);
    console.log(Array.from(res.locked).join('!'));
  }
}