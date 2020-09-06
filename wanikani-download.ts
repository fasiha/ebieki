import assert from 'assert';
import {writeFileSync} from 'fs';
import fetch, {RequestInit} from 'node-fetch';

require('dotenv').config();
const {WANIKANI_TOKEN} = process.env;
assert(WANIKANI_TOKEN, 'Put Wanikani v2 token in .env as WANIKANI_TOKEN=YOUR_TOKEN');

enum Subject {
  Radical = 'radical',
  Kanji = 'kanji',
  Vocabulary = 'vocabulary',
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
export async function download(subject: Subject, verbose = true) {
  const ret = [];
  let url = `https://api.wanikani.com/v2/subjects?types=${subject}`;
  const opt: RequestInit = {headers: {'Wanikani-Revision': '20170710', Authorization: `Bearer ${WANIKANI_TOKEN}`}};
  while (true) {
    const fullres = await fetch(url, opt);
    if (fullres.ok) {
      const res = await fullres.json();
      ret.push(res);
      url = res.pages.next_url;
      if (!url) { break; }
      await sleep(500);
      if (verbose) { console.log(url, ret.length); }
    } else {
      break;
    }
  }
  return ret;
}

if (require.main === module) {
  (async function main() {
    {
      const radicals = await download(Subject.Radical);
      const kanjis = await download(Subject.Kanji);
      writeFileSync('all-radical-kanji.json', JSON.stringify({radicals, kanjis}, null, 1));
    }
    {
      const ret = await download(Subject.Vocabulary);
      writeFileSync('all-vocab.json', JSON.stringify(ret, null, 1));
    }
  })();
}
