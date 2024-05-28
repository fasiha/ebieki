import {Word} from "./interfaces";

const entryToCommon =
    (entry: Word, kanji: string, kana: string) => {
      const kanjiCommon = entry.kanji.filter(k => !k.tags.includes('iK') && k.text === kanji).some(k => k.common)
      const kanaCommon =
          entry.kana
              .filter(o => o.text.includes(kana) && (o.appliesToKanji[0] === '*' || o.appliesToKanji.includes(kanji)))
              .some(k => k.common)
      return kanaCommon || kanjiCommon;
    }

export const entryToGlossParts = (entry: Word, kanji: string, kana: string) => {
  const glossStr = entry.sense
                       .filter(sense => (sense.appliesToKanji[0] === '*' || sense.appliesToKanji.includes(kanji)) &&
                                        (sense.appliesToKana[0] === '*' || sense.appliesToKana.includes(kana)))
                       .filter(sense => ['vulg', 'X', 'arch', 'derog', "obs"].every(bad => !sense.misc.includes(bad)))
                       .map(sense => sense.gloss.map(g => g.text).join(', '))
                       .join('; ');
  const common = entryToCommon(entry, kanji, kana)
  return { glossStr, common }
};
