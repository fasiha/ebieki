import assert from 'assert';
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'fs';

import type {
  Simplified, Word, Wanikani, PublicGloss, WithGloss, WithExtra, Furigana, JmdictFurigana} from './interfaces';
import {kata2hira} from './kana';
import {entryToGlossParts} from './helpers';

// helpers
type BigMapT<T> = Map<string, Map<string, T[]>>;
type BigMap = BigMapT<string>; // kanji -> kana -> JMDict ID
const isCustomGloss = (x: PublicGloss): x is {gloss: string} => 'gloss' in x

function findJmdict() {
  const files = readdirSync(__dirname);
  const jmdictFiles = files.filter(file => file.startsWith('jmdict-eng'));
  return jmdictFiles.sort((a, b) => b.localeCompare(a))[0] || '';
}

// Load WaniKani data
var wanikani: Wanikani[] = JSON.parse(readFileSync('all-vocab.json', 'utf8'))
                               .flatMap((o: any) => o.data)
                               .flatMap((o: any) => ({
                                          kanji: o.data.characters as string,
                                          kanas: o.data.readings.map((o: any) => o.reading) as string[],
                                          level: o.data.level as number,
                                          lesson_position: o.data.lesson_position as number,
                                          gloss: o.data.meanings.map((o: any) => o.meaning).join(', ') as string,
                                        }));
wanikani.sort((a, b) => (a.level < b.level)                     ? -1
                        : (a.level > b.level)                   ? 1
                        : a.lesson_position < b.lesson_position ? -1
                                                                : 1);

// Load JMdict Furigana data
// trim because of byte order mark <ugh>
const jmdictFuriganas: JmdictFurigana[] = JSON.parse(readFileSync('JmdictFurigana.json', 'utf8').trim());
const nameFuriganas: JmdictFurigana[] = JSON.parse(readFileSync('JmnedictFurigana.json', 'utf8').trim());
const extraFurigana: JmdictFurigana[] =
    [
      {text: "１０００", reading: "いっせん", furigana: [{ruby: "１０００", rt: "いっせん"}]},
      {text: "５０", reading: "ごじゅう", furigana: [{ruby: "５０", rt: "ごじゅう"}]},
      {text: "１０００円", reading: "せんえん", furigana: [{ruby: "１０００", rt: "せん"}, {ruby: "円", rt: "えん"}]},
      {text: "１０月", reading: "じゅうがつ", furigana: [{ruby: "１０", rt: "じゅう"}, {ruby: "月", rt: "がつ"}]},
      {text: "２日", reading: "ふつか", furigana: [{ruby: "２", rt: "ふつ"}, {ruby: "日", rt: "か"}]},
      {text: "１０日", reading: "とおか", furigana: [{ruby: "１０", rt: "とお"}, {ruby: "日", rt: "か"}]},
      {text: "１０万", reading: "じゅうまん", furigana: [{ruby: "１０", rt: "じゅう"}, {ruby: "万", rt: "まん"}]},
      {
        text: "２０１１年",
        reading: "にせんじゅういちねん",
        furigana: [{ruby: "２０１１", rt: "にせんじゅういち"}, {ruby: "年", rt: "ねん"}]
      },
      {text: "１００万", reading: "ひゃくまん", furigana: [{ruby: "１００", rt: "ひゃく"}, {ruby: "万", rt: "まん"}]},
      {text: "４００", reading: "よんひゃく", furigana: [{ruby: "４００", rt: "よんひゃく"}]},
      {text: "５００", reading: "ごひゃく", furigana: [{ruby: "５００", rt: "ごひゃく"}]},
      {text: "２００", reading: "にひゃく", furigana: [{ruby: "２００", rt: "にひゃく"}]},
      {text: "２０日", reading: "はつか", furigana: [{ruby: "２０", rt: "はつ"}, {ruby: "日", rt: "か"}]},
      {text: "４０００", reading: "よんせん", furigana: [{ruby: "４０００", rt: "よんせん"}]},
      {text: "４０", reading: "よんじゅう", furigana: [{ruby: "４０", rt: "よんじゅう"}]},
      {text: "３００", reading: "さんびゃく", furigana: [{ruby: "３００", rt: "さんびゃく"}]},
      {
        text: "二時半",
        reading: "にじはん",
        furigana: [{ruby: "二", rt: "に"}, {ruby: "時", rt: "じ"}, {ruby: "半", rt: "はん"}]
      },
      {
        text: "第二章",
        reading: "だいにしょう",
        furigana: [{ruby: "第", rt: "だい"}, {ruby: "二", rt: "に"}, {ruby: "章", rt: "しょう"}]
      },
      {text: "詩歌", reading: "しいか", furigana: [{ruby: "詩", rt: "しい"}, {ruby: "歌", rt: "か"}]},
      {
        text: "同期中",
        reading: "どうきちゅう",
        furigana: [{ruby: "同", rt: "どう"}, {ruby: "期", rt: "き"}, {ruby: "中", rt: "ちゅう"}]
      },
      {text: "可愛い", reading: "かわいい", furigana: [{ruby: "可", rt: "か"}, {ruby: "愛", rt: "わい"}, "い"]},
      {text: "何枚", reading: "なんまい", furigana: [{ruby: "何", rt: "なん"}, {ruby: "枚", rt: "まい"}]},
      {
        text: "大きい順",
        reading: "おおきいじゅん",
        furigana: [{ruby: "大", rt: "おお"}, "きい", {ruby: "順", rt: "じゅん"}]
      },
      {
        text: "小さい順",
        reading: "ちいさいじゅん",
        furigana: [{ruby: "小", rt: "ちい"}, "さい", {ruby: "順", rt: "じゅん"}]
      },
      {text: "〜務省", reading: "むしょう", furigana: ["〜", {ruby: "務", rt: "む"}, {ruby: "省", rt: "しょう"}]},
      {
        text: "第一段",
        reading: "だいいちだん",
        furigana: [{ruby: "第", rt: "だい"}, {ruby: "一", rt: "いち"}, {ruby: "段", rt: "だん"}]
      },
      {
        text: "腹が減った",
        reading: "はらがへった",
        furigana: [{ruby: "腹", rt: "はら"}, "が", {ruby: "減", rt: "へ"}, "った"]
      },
      {
        text: "募集中",
        reading: "ぼしゅうちゅう",
        furigana: [{ruby: "募", rt: "ぼ"}, {ruby: "集", rt: "しゅう"}, {ruby: "中", rt: "ちゅう"}]
      },
      {
        text: "甲斐性",
        reading: "かいしょう",
        furigana: [{ruby: "甲", rt: "か"}, {ruby: "斐", rt: "い"}, {ruby: "性", rt: "しょう"}]
      },
      {text: "２０歳", reading: "はたち", furigana: [{ruby: "２０歳", rt: "はたち"}]},
      {
        text: "可哀想",
        reading: "かわいそう",
        furigana: [{ruby: "可", rt: "か"}, {ruby: "哀", rt: "わい"}, {ruby: "想", rt: "そう"}]
      },
      {text: "裸足", reading: "はだし", furigana: [{ruby: "裸足", rt: "はだし"}]},
      {text: "鰐蟹", reading: "わにかに", furigana: [{ruby: "鰐", rt: "わに"}, {ruby: "蟹", rt: "かに"}]},
      {text: "平壌", reading: "ピョンヤン", furigana: [{ruby: "平", rt: "ピョン"}, {ruby: "壌", rt: "ヤン"}]},
      {text: "西瓜", reading: "すいか", furigana: [{ruby: "西瓜", rt: "すいか"}]},
      {
        text: "瓜実顔",
        reading: "うりざねがお",
        furigana: [{ruby: "瓜", rt: "うり"}, {ruby: "実", rt: "ざね"}, {ruby: "顔", rt: "がお"}]
      },
      {text: "惜しまない", reading: "おしまない", furigana: [{ruby: "惜", rt: "お"}, "しまない"]},
    ]

    // Load JMDict data
    function upsert2<T>(map: BigMapT<T>, key: string, subkey: string, val: T) {
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

const kanjiReadingToFurigana: BigMapT<Furigana[]> = new Map()
for (const arr of [jmdictFuriganas, nameFuriganas, extraFurigana]) {
  for (const {text, reading, furigana} of arr) {
    upsert2(kanjiReadingToFurigana, kata2hira(text), kata2hira(reading), furigana);
  }
}

function lookupFurigana(kanji: string, kana: string): Furigana[] {
  const f = kanjiReadingToFurigana.get(kata2hira(kanji))?.get(kata2hira(kana));
  // assert(f, `${kanji}/${kana}`);
  if (!f) {
    console.log("no known furigana", kanji, kana)
    return [{ruby: kanji, rt: kana}]
  }
  return f[0]
}

var kanjiToKanaToSenses: BigMap = new Map();
var idToDict: Map<string, Word> = new Map();
{
  const dictfile = findJmdict();
  if (!existsSync(dictfile)) {
    console.error(
        `ERROR: no jmdict-eng file found. Download a recent English release from https://github.com/scriptin/jmdict-simplified/releases`);
    process.exit(1);
  }
  console.log(`Reading ${dictfile}`)
  var dict: Simplified['words'] = JSON.parse(readFileSync(dictfile, 'utf8')).words;
  for (const entry of dict) {
    const kanji = entry.kanji.filter(o => !o.tags.includes('iK'))
                      .map(o => [o.text, o.common] as [string, boolean]); // omit irregular kanji
    for (const [j, jcommon] of kanji) {
      const kana = entry.kana.filter(o => o.appliesToKanji[0] === '*' || o.appliesToKanji.includes(j))
                       .map(o => [o.text, o.common] as [string, boolean]);
      for (const [n, ncommon] of kana) {
        upsert2(kanjiToKanaToSenses, kata2hira(j), kata2hira(n), entry.id);
        idToDict.set(entry.id, entry);
      }
    }
  }
}

// Prepare special exceptions, etc.
const skip = new Set([
  'ふじ山',     '二万',     '二台',     '五台',   '十台', 'シアトル市', '四十二', '二斤',
  '別の',       '四十二階', '三番目',   '一億円', '五枚', '三冊',       '八冊',   '三個',
  'アメリカ製', '二巻',     '結構です', '二杯',   '三杯', '興味がない', '二泊',   '四匹'
]);
const customGlosses = new Map([
  ['２０１１年', '2011'],
  ['二時半', 'half past two'],
  ['第二章', 'chapter two'],
  ['田代島', 'Tashirojima'], // Cat Island https://www.japan.travel/en/spot/1765/
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
  ['鰐蟹', 'Wani kani'],
  ["〜務省", "Ministry of …"],
  [
    "惜しまない", "without sparing (effort, funds, etc.)"
    // deleted entry, https://www.edrdg.org/jmwsgi/entr.py?svc=jmdict&sid=&q=1382290
  ],
]);

const kanjiToJmdict = new Map([
  ['駆ける', 1244720], ['揚げ', 1545490], ['ばい菌', 1575400], ['恨む', 1289780],   ['卸', 1589530],
  ['三', 1579350],     ['元', 1260670],   ['かき氷', 1399920], ['宝くじ', 1516170], ['ゴミ箱', 1005010],
  ['妻', 1294330],     ['腰', 1288340],   ['河', 1390020],     ['解ける', 1198910], ['名人', 1531680],
  ['共同', 1591660],   ['一位', 1161020], ["撃つ", 1253570],   ['同盟', 1599290],   ['沈黙', 1431810],
  ['鰐', 1562640]
]);

// Helpers
const makeSummary = (card: typeof wanikani[0], omitWanikani = false) => {
  if (omitWanikani) { return `${card.kanji} ${card.kanas.join(' ')} (§${card.level}.${card.lesson_position})`; }
  return `${card.kanji} ${card.kanas.join(' ')} (§${card.level}.${card.lesson_position} ${card.gloss})`;
};

const entryToGloss = (entry: Word, kanji: string, kana: string) => {
  const {glossStr, common} = entryToGlossParts(entry, kanji, kana);
  return `${glossStr}. #${entry.id}${common ? ' common!' : ''}`;
};

// Combine WaniKani with JMDict
const lines = wanikani.map((card): undefined|WithGloss => {
  let {kanji, kanas} = card;
  let ids = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
  let entries = ids?.map(id => {
    const result = idToDict.get(id);
    assert(result);
    return result;
  });
  {
    // special rules
    if (skip.has(kanji)) { return; }
    if (customGlosses.has(kanji)) {
      return { card, glossObj: {gloss: customGlosses.get(kanji)!}, furigana: lookupFurigana(kanji, kanas[0]) }
    } else if (kanjiToJmdict.has(kanji)) {
      const id = '' + (kanjiToJmdict.get(kanji) || 0);
      const found = entries?.find(e => e.id === id);
      assert(found)
      return { card, glossObj: found, furigana: lookupFurigana(found.kanji[0].text, found.kana[0].text) }
    } else if (kanji === 'ハチの巣') {
      kanji = '蜂の巣';
      const ids = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
      const entries = ids?.map(id => idToDict.get(id))
      assert(entries?.length === 1 && entries[0]);
      return {
        card: {...card, kanji}, glossObj: entries[0],
            furigana: lookupFurigana(entries[0].kanji[0].text, entries[0].kana[0].text)
      }
    } else if (kanji === '御手洗') {
      kanji = '御手洗い';
      const ids = kanjiToKanaToSenses.get(kata2hira(kanji))?.get(kata2hira(kanas[0]));
      const entries = ids?.map(id => idToDict.get(id)!)
      assert(entries?.length === 1);
      return {
        card: {...card, kanji}, glossObj: entries[0],
            furigana: lookupFurigana(entries[0].kanji[0].text, entries[0].kana[0].text)
      }
    } else if (kanji === '〜才') {
      // this needs to be a special case because we need to strip 〜 (below) AND provide a specific JMdict id.
      const ids = kanjiToKanaToSenses.get(kata2hira('才'))?.get(kata2hira(kanas[0])) || [];
      const entries = ids?.map(id => idToDict.get(id)!)
      const found = entries.find(s => s.id === '1294940')
      assert(found)
      return { card, glossObj: found, furigana: lookupFurigana(found.kanji[0].text, found.kana[0].text) }
    }
  }
  if (entries) {
    if (entries.length !== 1) {
      console.warn(kanji, kanas, entries.map(o => o.id),
                   entries.map(e => e.sense.flatMap(o => o.gloss.map(o => o.text))))
      throw new Error('too many entries')
    }
    return { card, glossObj: entries[0], furigana: lookupFurigana(entries[0].kanji[0].text, entries[0].kana[0].text) }
  } else {
    if (kanji.includes('〜')) {
      const ids = kanjiToKanaToSenses.get(kanji.replace('〜', ''))?.get(kanas[0]);
      const entries = ids?.map(id => idToDict.get(id)!)
      if (entries?.length !== 1) {
        console.warn(kanji, kanas, entries)
        throw new Error('too many/few entries')
      }
      return { card, glossObj: entries[0], furigana: lookupFurigana(entries[0].kanji[0].text, entries[0].kana[0].text) }
    } else if (kanji.includes('する')) {
      const ids = kanjiToKanaToSenses.get(kanji.replace('する', ''))?.get(kanas[0].replace('する', ''));
      const entries = ids?.map(id => idToDict.get(id)!)
      if (entries?.length !== 1) {
        console.warn(kanji, kanas, entries)
        throw new Error('too many entries')
      }
      return { card, glossObj: entries[0], furigana: lookupFurigana(entries[0].kanji[0].text, entries[0].kana[0].text) }
    } else {
      // No luck finding JMDict
      console.warn('unable to find', kanji, kanas, entries)
      return { card, glossObj: {gloss: ''}, furigana: [] } // invalid
    }
  }
});

// Summary
{
  const skipped = lines.filter(s => !s).length;
  const noDefFound = lines.filter(s => s ? ('gloss' in s.glossObj && '' === s.glossObj.gloss) : false).length;
  const customGloss = lines.filter(s => s ? !('id' in s.glossObj) : false).length;
  console.log(`Statistics:
- ${wanikani.length} vocabulary from Wanikani
- ${skipped} skipped
- ${customGloss} custom definitions used
- ${noDefFound} unable to find JMdict defintion ${noDefFound === 0 ? '✅' : '❌'}`);
}

// Export
{
  const linesOk = lines.filter((s): s is WithGloss => !!s);

  {
    const outputText = (omitWanikaniGloss: boolean): string =>
        linesOk
            .map(s => `${makeSummary(s.card, omitWanikaniGloss)} (${
                     isCustomGloss(s.glossObj!) ? s.glossObj.gloss
                                                : entryToGloss(s.glossObj!, s.card.kanji, s.card.kanas[0])})`)
            .join('\n')

    writeFileSync('table.txt', outputText(true));
    writeFileSync('table-with-wanikani.txt', outputText(false));
  }

  {
    const addParts = (x: WithGloss): WithExtra => ({
      ...x,
      ...(isCustomGloss(x.glossObj!) ? {glossStr: x.glossObj.gloss, common: undefined}
                                     : entryToGlossParts(x.glossObj!, x.card.kanji, x.card.kanas[0]))
    })

    const linesOkNoWanikani = linesOk.map(addParts).map(o => {
      const copy = {...o, card: {...o.card}};
      copy.card.gloss = '';
      return copy;
    })

    writeFileSync('table-with-wanikani.json', JSON.stringify(linesOk.map(addParts), null, 1));
    writeFileSync('table.json', JSON.stringify(linesOkNoWanikani, null, 1));
  }
  console.log('Done, now run `python distances.py` to append semantic distance data to `table.json`')
}