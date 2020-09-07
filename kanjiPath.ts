import {readFileSync} from 'fs';

import {hasKanji} from './kana';
import {setup as setupKanjidic, summarizeCharacter} from './kanjidic';
import {findBestPathVocab, kanjiToRadicals, radicalToString} from './wanikani-parse-kanji';

if (require.main === module) {
  (async function main() {
    const kanjidic = new Map((await setupKanjidic()).character.map(c => [c.literal[0], summarizeCharacter(c)]));

    const known = '一日十目田中口人二三木月';
    const lines = readFileSync(process.argv[2] || 'table.txt', 'utf8').split('\n').map(s => s.trim());
    const vocabToLine =
        new Map(lines
                    .map(line => [line.slice(0, line.split('').findIndex(s => s === ' ' || s === '・' || s === '「')),
                                  line] as [string, string])
                    .filter(([vocab, _]) => !!vocab));
    const vocab = Array.from(vocabToLine.keys());

    const notInWani = vocab.join('').split('').filter(hasKanji).filter(s => !kanjiToRadicals.has(s));
    const vset = new Set(vocab);
    const res = findBestPathVocab(vocab.filter(s => s.split('').filter(hasKanji).every(c => !notInWani.includes(c))),
                                  known, {greedySearchLimit: 500});
    console.log('## Path through radicals for vocabulary')
    console.log(
        Array
            .from(res.unlocked,
                  ([v, note]) => `${vocabToLine.get(v) || v}: ${note} ${
                      Array
                          .from(new Set(v.split('')
                                            .flatMap(c => [c, ...(kanjiToRadicals.get(c)?.map(radicalToString) || [])])
                                            .map(c => kanjidic.get(c))
                                            .filter(c => !!c)))
                          .join(' || ')} `)
            .join('\n'));
    if (res.locked.size > 0) {
      console.log(`### Didn't reach these in time :(`);
      console.log(Array.from(res.locked).join('!'));
    }
    if (notInWani.length) {
      console.log(`## Kanji in input that is NOT in Wanikani!`);
      console.log(notInWani.join('\n'));
    }
  })();
}
