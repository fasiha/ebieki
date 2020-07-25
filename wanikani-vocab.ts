import assert from 'assert';
import {writeFileSync} from 'fs';
import fetch, {RequestInit} from 'node-fetch';

require('dotenv').config();
const {WANIKANI_TOKEN} = process.env;
assert(WANIKANI_TOKEN, 'Put Wanikani v2 token in .env as WANIKANI_TOKEN=YOUR_TOKEN');

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
export async function download(verbose = true) {
  const ret = [];
  let url = 'https://api.wanikani.com/v2/subjects?types=vocabulary';
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
    const ret = await download();
    writeFileSync('all-vocab.json', JSON.stringify(ret, null, 1));
  })();
}
