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
}

const [radicals, kanjis] = JSON.parse(readFileSync('all-radical-kanji.json', 'utf8'))
                               .map((o: any) => o.data.map((o: any) => o.data)) as [Radical[], Kanji[]];

{
  const nounicode = radicals.filter(r => !r.hidden_at).filter(r => !(r.characters || radicalToUnicode[r.slug]));
  if (nounicode.length) { console.error(nounicode); }
  assert(nounicode.length === 0, 'Missing Unicode character');
}
