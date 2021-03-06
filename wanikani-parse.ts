import {existsSync, readFileSync, writeFileSync} from 'fs';

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
{
  const DICTFILE = 'jmdict-eng-3.1.0.json';
  if (!existsSync(DICTFILE)) {
    console.error(`Download ${DICTFILE} from https://github.com/scriptin/jmdict-simplified/releases`);
    process.exit(1);
  }
  var dict: Simplified['words'] = JSON.parse(readFileSync(DICTFILE, 'utf8')).words;
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

const kanjiToJmdict = new Map([
  ['駆ける', 1244720], ['揚げ', 1545490], ['ばい菌', 1575400], ['恨む', 1289780], ['卸', 1589530], ['三', 1579350],
  ['元', 1260670], ['かき氷', 1399920], ['宝くじ', 1516170], ['ゴミ箱', 1005010], ['妻', 1294330], ['腰', 1288340],
  ['河', 1390020], ['解ける', 1198910]
]);

const makeSummary = (card: typeof wanikani[0]) =>
    `${card.kanji} ${card.kanas.join(' ')} (§${card.level}.${card.lesson_position} ${card.gloss})`;

const lines = wanikani.map(card => {
  let {kanji, kanas} = card;
  let summary = makeSummary(card);
  let hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
  {
    // special rules
    if (skip.has(kanji)) { return; }
    if (glosses.has(kanji)) {
      hit = [glosses.get(kanji) || 'TYPESCRIPT PACIFICATION'].map(s => `(${s})`)
    } else if (kanjiToJmdict.has(kanji)) {
      const id = '' + (kanjiToJmdict.get(kanji) || 0);
      hit = [(hit || []).find(s => s.includes(id)) || '']; // DOUBLE typescript pacification needed!
    } else if (kanji === 'ハチの巣') {
      kanji = '蜂の巣';
      summary = makeSummary({...card, kanji});
      hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
    } else if (kanji === '御手洗') {
      kanji = '御手洗い';
      summary = makeSummary({...card, kanji});
      hit = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
    } else if (kanji === '〜才') {
      // this needs to be a special case because we need to strip 〜 (below) AND provide a specific JMdict id.
      hit = kanjiToKanaToSenses.get(kata2hira('才'))?.get(kata2hira(kanas[0])) || [];
      hit = [hit.find(s => s.includes('1294940')) || ''];
    }
  }
  if (hit) {
    return `${summary} ${hit.join('//')}`;
  } else {
    if (kanji.includes('〜')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('〜', ''))?.get(kanas[0]);
      if (hit) { return (`${summary} ${hit.join('//')}`); }
    } else if (kanji.includes('する')) {
      hit = kanjiToKanaToSenses.get(kanji.replace('する', ''))?.get(kanas[0].replace('する', ''));
      if (hit) { return (`${summary} ${hit.join('//')}`); }
    } else {
      // No luck finding JMDict
      return (`! ${summary}`);
    }
  }
});
{
  const skipped = lines.filter(s => !s).length;
  const bang = lines.filter(s => s ? s.startsWith('!') : false).length;
  const mult = lines.filter(s => s ? s.includes('//') : false).length;
  const nohash = lines.filter(s => s ? !s.includes('#') : false).length;
  console.log(`Statistics:
- ${wanikani.length} vocabulary from Wanikani
- ${skipped} skipped
- ${nohash} custom definitions used
- ${bang} unable to find JMdict defintion ${bang === 0 ? '✅' : '❌'}
- ${mult} found multiple JMdict definitions  ${mult === 0 ? '✅' : '❌'}`);

  const linesOk = lines.filter(s => !!s);
  writeFileSync('table.txt', linesOk.map(s => s?.replace(/\((§[0-9.]+)[^)]+\) \(/, '($1 ')).join('\n'));
  writeFileSync('table-with-wanikani.txt', linesOk.join('\n'));
}