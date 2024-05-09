// Hand-written interfaces for https://github.com/scriptin/jmdict-simplified 3.0.1
export type Tag = string;
export interface Kanji {
  common: boolean;
  text: string;
  tags: Tag[];
}
export interface Kana {
  common: boolean;
  text: string;
  tags: Tag[];
  appliesToKanji: string[];
}
export type Xref = [string, string, number]|[string, number]|[string];
export interface Source {
  lang: string;
  full: boolean;
  wasei: boolean;
  text?: string;
}
export interface Gloss {
  lang: string;
  text: string;
}
export interface Sense {
  partOfSpeech: Tag[];
  appliesToKanji: string[];
  appliesToKana: string[];
  related: Xref[];
  antonym: Xref[];
  field: Tag[];
  dialect: Tag[];
  misc: Tag[];
  info: string[];
  languageSource: Source[];
  gloss: Gloss[];
}
export interface Word {
  id: string;
  kanji: Kanji[];
  kana: Kana[];
  sense: Sense[];
}
export interface Simplified {
  version: string;
  dictDate: string;
  dictRevisions: string[];
  tags: {[k: string]: string};
  words: Word[];
}

// My custom WaniKani data shape
export interface Wanikani {
  kanji: string;
  kanas: string[];
  level: number;
  lesson_position: number;
  gloss: string;
}
// Ebi-Eki data shapes
export type PublicGloss = Word|{gloss: string};
export type WithGloss = {
  card: Wanikani,
  glossObj: PublicGloss
};
export interface WithExtra extends WithGloss {
  common?: boolean;
  glossStr: string;
}
export interface WithDistance extends WithExtra {
  closest: {kanji: string, distance: number}[]
}