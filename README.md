# Ebi-eki 🦐🚉
[Wanikani](https://www.wanikani.com/). It's superb. Go pay them for it. They gave us a discount when my whole family signed up for it—small business FTW.

But I just wanted to review the vocabulary (the purple words) with the definitions from [JMdict](http://edrdg.org/jmdict/j_jmdict.html), the open-source Japanese dictionary [everyone](https://jisho.org/about) [uses](https://tangorin.com/about).

So this repo contains a big table of Wanikani vocabulary† using JMdict definitions, either in
- plain text, [table.txt](./table.txt), or
- JSON, [table.json](./table.json)

† I left out twenty-five vocabulary (out of 6369) because they didn't have entries for JMdict. For twenty-six other vocabulary, JMdict didn't have an entry but I made one.

**Bonus** I've also run Hugging Face's SentenceTransformers on all definitions and, for each one, identified the four other words that are "semantically closest". This information is in the JSON file (whose shape is described as `WithDistance[]` per [`interfaces.d.ts`](./interfaces.d.ts)).

## Notes

Here's an example few lines from [`table.txt`](table.txt):
```
一 いち (§1.44) (one, 1; best; first, foremost; beginning, start; a (single), one (of many); ace; bottom string (on a shamisen, etc.). #1160790 common!)
一つ ひとつ (§1.45) (one; for one thing; only; (not) even; just (e.g. "just try it"); some kind of, one type of. #1160820 common!)
七 なな しち (§1.46) (seven. #1319210 common!)
```
As you see, the format is
```
<kanji> <kana, possibly multiple> (§<Wanikani lesson number (skips because we're only looking at vocabulary)>) (<JMdict definitions>. #<JMdict entry ID> <indicator if this word is common>)
```
The "JMdict entry ID" may need some explication. All JMdict entries have an ID associated with them, even though most dictionaries don't expose it. You can look up an ID using [JMdict advanced search](http://www.edrdg.org/jmdictdb/cgi-bin/srchform.py?svc=jmdict&sid=) by typing it into the "Search by Id or Seq number" section. Doing so can lead you to the JMdict entry for [#1319210, <ruby>七<rt>なな</rt></ruby>](http://www.edrdg.org/jmdictdb/cgi-bin/entr.py?svc=jmdict&sid=&q=1319210).

TypeScript types in [`interfaces.d.ts`](./interfaces.d.ts) can be used to describe the JSON file: it's contents are `WithDistance[]`. In a nutshell, each element has keys:
- `card`, the WaniKani kanji, kanas, and level info
- `glossObj`, either the JMDict data (per [JMDict-Simplified](https://github.com/scriptin/jmdict-simplified)) *or* just a string with my custom gloss
- convenient summaries derived from `glossObj`:
  - `glossStr`, a plain string of the glosses that apply to this kanji and kanas
  - `common`, a boolean whether JMDict thinks this is a common word
- `closest`, a list of kanji-number pairs. The numbers are between -1 and 1 and represent cosine similarities. The closer to 1, the more similar each element's gloss is to this WaniKani vocab's gloss.

## Dev
If you want to run this code repository to generate the results yourself—

1. Get a Wanikani v2 API key.
2. Install [Git](https://git-scm.com) and [Node.js](https://nodejs.org).
3. Run in your terminal:
```console
git checkout https://github.com/fasiha/ebieki
cd ebieki
npm i
```
4. Prepare a Python environment with `sentence_transformers` (see below for a suggestion)
5. Download and uncompress a recent English release from [JMdict-Simplified](https://github.com/scriptin/jmdict-simplified/releases/latest), i.e., ``jmdict-eng-3.5.0.json`. Put this file in the `ebieki` directory you just created (via `git clone`).
6. Create a `.env` file in the `ebieki` directory and put your Wanikani v2 API token in the following format:
```
WANIKANI_TOKEN=YOUR_TOKEN_GOES_HERE
```
7. Run
```sh
npm run download
npm run table
npm run distances # this needs python
```

The `npm run download` invokation will hit the Wanikani API server to download all 6000+ vocabulary. This takes a few seconds (since the server gives us a thousand at a time, and we wait a bit before going back for more to avoid overloading them).

Then the `npm run table` runs some custom code that looks up all the vocab in JMdict. It skips twenty-five vocab that aren't in JMdict and that I felt were ok to skip (e.g., 二万, 二台). For another twenty-six that aren't in JMdict, I created translations; most were obvious (新宿→Shinjuku, 福島→Fukushima) but a couple I just used Google Translate. It takes less than ten seconds to run on my old laptop, and should print out a summary like this:
```
Statistics:
- 6369 vocabulary from Wanikani
- 24 skipped
- 28 custom definitions used
- 0 unable to find JMdict defintion ✅
Done, now run `python distances.py` to append semantic distance data to `table.json`
```

It outputs [`table.txt`](table.txt) and [`table.json`](./table.json), which contains *no* Wanikani-copyrighted material, as well as `table-with-wanikani.{txt|json}` which *do* contain translations from Wanikani.

As promised, here's an easy way to set up a Python environment with SentenceTransformers that works great on my Apple Silicon laptop, that uses Conda and Conda-Forge:
1. Install [Miniconda](https://docs.anaconda.com/free/miniconda/)
2. `conda create -n ebieki-sentences` to create a new conda environment
3. `conda activate ebieki-sentences` to activate your new conda environment
4. `conda install -c conda-forge sentence-transformers numpy` to install the two requirements needed by `distances.py`

With all this in place, now if you run `npm run distances` (equivalent to `python distances.py`), this will read `table.json`, compute all glosses' embedding vectors, compute each pair's cosine similarity, find the closest four to each entry, and write out a new `table.json`. This takes <30 seconds on a plain laptop with M1 CPU (no GPU, no CUDA).

## [Go pay Wanikani money](https://www.wanikani.com)
