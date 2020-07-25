import {readFileSync} from 'fs';
import {Simplified} from './interfaces';
import {kata2hira} from './kana';

var all = JSON.parse(readFileSync('all-vocab.json', 'utf8'));
var data: unknown[] = all.flatMap((o: any) => o.data);
var wanikani = data.flatMap((o: any) => ({
                              kanji: o.data.characters as string,
                              kanas: o.data.readings.map((o: any) => o.reading) as string[],
                              level: o.data.level as number,
                              lesson_position: o.data.lesson_position as number,
                              gloss: o.data.meanings.map((o: any) => o.meaning).join(', ') as string,
                            }));
wanikani.sort((a, b) =>
                  (a.level < b.level) ? -1 : (a.level > b.level) ? 1 : a.lesson_position < b.lesson_position ? -1 : 1);
var dict: Simplified['words'] = JSON.parse(readFileSync('jmdict-eng-3.0.1.json', 'utf8')).words;

function upsert2(map: BigMap, key: string, subkey: string, val: string) {
  const hit = map.get(key);
  if (hit) {
    const subhit = hit.get(subkey);
    if (subhit && !subhit.includes(val)) {
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
  const kanji = entry.kanji.filter(o => !o.tags.includes('iK'))
                    .map(o => [o.text, o.common] as [string, boolean]); // omit irregular kanji
  for (const [j, jcommon] of kanji) {
    const kana = entry.kana.filter(o => o.appliesToKanji[0] === '*' || o.appliesToKanji.includes(j))
                     .map(o => [o.text, o.common] as [string, boolean]);
    for (const [n, ncommon] of kana) {
      const gloss = entry.sense
                        .filter(sense => (sense.appliesToKanji[0] === '*' || sense.appliesToKanji.includes(j)) &&
                                         (sense.appliesToKana[0] === '*' || sense.appliesToKana.includes(n)))
                        .map(sense => sense.gloss.map(g => g.text).join(', '))
                        .join('; ');
      const full = `(${gloss}. #${entry.id}${(jcommon || ncommon) ? ', common!' : ''})`;
      upsert2(kanjiToKanaToSenses, kata2hira(j), kata2hira(n), full);
    }
  }
}

const skip = new Set([
  'ふじ山',     '二万',     '二台',     '五台',   '十台', 'シアトル市', '四十二', '二斤',
  '別の',       '四十二階', '三番目',   '一億円', '五枚', '三冊',       '八冊',   '三個',
  'アメリカ製', '二巻',     '結構です', '二杯',   '三杯', '興味がない', '二泊',   '四匹'
]);
const glosses = new Map([
  ['２０１１年', '2011'],
  ['二時半', 'half past two'],
  ['第二章', 'chapter two'],
  ['田代島', 'Tashirojima'],
  ['新宿', 'Shinjuku'],
  ['福島', 'Fukushima'],
  ['同期中', 'in sync'],
  ['何枚', 'how many flat things'],
  ['大きい順', 'descending order'],
  ['小さい順', 'ascending order'],
  ['総体的', 'holistic'],
  ['中国製', 'made in China'],
  ['第一段', 'first stage'],
  ['腹が減った', 'hungry'],
  ['徳川', 'Tokugawa'],
  ['撮影禁止', 'photograpy prohibited'],
  ['獄内', 'in prison'],
  ['山中湖', 'Yamanaka Lake'],
  ['募集中', 'hiring'],
  ['渋谷', 'Shibuya'],
  ['東芝', 'Toushiba'],
  ['軍艦島', 'Gunkajima'],
  ['伊勢', 'Ise'],
  ['塊魂', 'Katamari Damacy'],
  ['淀川', 'Yodogawa'],
  ['鰐蟹', 'Wani kani']
]);
// 田代島 is a place-name?

const makeSummary = (card: typeof wanikani[0]) =>
    `${card.kanji} ${card.kanas.join(' ')} (§${card.level}.${card.lesson_position} ${card.gloss})`;

for (const card of wanikani) {
  let {kanji, kanas, gloss} = card;
  let summary = makeSummary(card);
  let hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
  {
    // special rules
    if (skip.has(kanji)) { continue; }
    if (glosses.has(kanji)) {
      hit = [glosses.get(kanji) || 'TYPESCRIPT PACIFICATION'].map(s => `(${s})`)
    } else if (kanji === 'ハチの巣') {
      kanji = '蜂の巣';
      summary = makeSummary({...card, kanji});
      hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
    } else if (kanji === '御手洗') {
      kanji = '御手洗い';
      summary = makeSummary({...card, kanji});
      hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
    }
  }
  if (hit) {
    console.log(`@ ${summary} ${hit.join('//')}`);
  } else {
    if (kanji.includes('〜')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('〜', ''))?.get(kanas[0]);
      if (hit) { console.log(`@ ${summary} ${hit.join('//')}`); }
    } else if (kanji.includes('する')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('する', ''))?.get(kanas[0].replace('する', ''));
      if (hit) { console.log(`@ ${summary} ${hit.join('//')}`); }
    } else {
      console.log(`! ${summary}`);
    }
  }
}
