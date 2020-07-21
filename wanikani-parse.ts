import {readFileSync} from 'fs';
import {Simplified} from './interfaces';

var all = JSON.parse(readFileSync('all-vocab.json', 'utf8'));
var data: unknown[] = all.flatMap((o: any) => o.data);
var wanikani = data.flatMap((o: any) => ({
                              kanji: o.data.characters as string,
                              kanas: o.data.readings.map((o: any) => o.reading) as string[],
                              level: o.data.level as number,
                              lesson_position: o.data.lesson_position as number,
                              gloss: o.data.meanings.map((o: any) => o.meaning).join(', ') as string,
                            }));

var dict: Simplified['words'] = JSON.parse(readFileSync('jmdict-eng-3.0.1.json', 'utf8')).words;

function upsert2(map: BigMap, key: string, subkey: string, val: string) {
  const hit = map.get(key);
  if (hit) {
    const subhit = hit.get(subkey);
    if (subhit) {
      subhit.push(val);
    } else {
      hit.set(subkey, [val])
    }
  } else {
    const subval = new Map([[subkey, [val]]]);
    map.set(key, subval);
  }
}

type BigMap = Map<string, Map<string, string[]>>; // kanji -> kana -> gloss
var kanjiToKanaToSenses: BigMap = new Map();
for (const entry of dict) {
  const kanji = entry.kanji.filter(o => !o.tags.includes('iK')).map(o => o.text); // omit irregular kanji
  for (const j of kanji) {
    const kana = entry.kana.filter(o => o.appliesToKanji[0] === '*' || o.appliesToKanji.includes(j)).map(o => o.text);
    for (const n of kana) {
      const gloss = entry.sense
                        .filter(sense => (sense.appliesToKanji[0] === '*' || sense.appliesToKanji.includes(j)) &&
                                         (sense.appliesToKana[0] === '*' || sense.appliesToKana.includes(n)))
                        .map(sense => sense.gloss.map(g => g.text).join(', '))
                        .join('; ') +
                    ` (#${entry.id})`;
      upsert2(kanjiToKanaToSenses, j, n, gloss);
    }
  }
}

for (const card of wanikani) {
  const {kanji, kanas, gloss} = card;
  let hit = kanjiToKanaToSenses.get(kanji)?.get(kanas[0]);
  if (hit) {
    console.log(`@ ${kanji} ${kanas.join(' ')} (${gloss}) ${hit.join('//')}`);
  } else {
    if (kanji.includes('〜')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('〜', ''))?.get(kanas[0]);
      if (hit) { console.log(`@ ${kanji} ${kanas.join(' ')} (${gloss}) ${hit.join('//')}`); }
    } else if (kanji.includes('する')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('する', ''))?.get(kanas[0].replace('する', ''));
      if (hit) { console.log(`@ ${kanji} ${kanas.join(' ')} (${gloss}) ${hit.join('//')}`); }
    } else {
      console.log(`! ${kanji} ${kanas.join(' ')} (${gloss})`);
    }
  }
}
