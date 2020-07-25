# Ebi-eki 🦐🚉
[Wanikani](https://www.wanikani.com/). It's superb. Go pay them for it. They gave us a discount when my whole family signed up for it—small business FTW.

But I just wanted to review the vocabulary (the purple words) with the definitions from [JMdict](http://edrdg.org/jmdict/j_jmdict.html), the open-source Japanese dictionary [everyone](https://jisho.org/about) [uses](https://tangorin.com/about).

So this repo contains a big [table of Wanikani vocabulary† using JMdict definitions](table.txt). For each line, the first word is the kanji, the next word or words are acceptable readings (per JMdict), followed by the JMdict gloss in parentheses.

† I left out twenty-five vocabulary (out of 6369) because they didn't have entries for JMdict. For twenty-six other vocabulary, JMdict didn't have an entry but I made one.

If you just want to see that [big table, click here](table.txt).

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
5. Download and uncompress `jmdict-eng-3.0.1.json` from the [JMdict-Simplified](https://github.com/scriptin/jmdict-simplified/releases/latest) project's downloads page. (If you download a newer version, change the filename in [`wanikani-parse.ts`](wanikani-parse.ts).) Put this file in the `ebieki` directory you just created (via `git clone`).
6. Create a `.env` file in the `ebieki` directory and put your Wanikani v2 API token in the following format:
```
WANIKANI_TOKEN=YOUR_TOKEN_GOES_HERE
```
7. Run
```console
npm run download
npm run table
```

The `npm run download` invokation will hit the Wanikani API server to download all 6000+ vocabulary. This takes a few seconds (since the server gives us a thousand at a time, and we wait a bit before going back for more to avoid overloading them).

Then the `npm run table` runs some custom code that looks up all the vocab in JMdict. It skips twenty-five vocab that aren't in JMdict and that I felt were ok to skip (e.g., 二万, 二台). For another twenty-six that aren't in JMdict, I created translations; most were obvious (新宿→Shinjuku, 福島→Fukushima) but a couple I just used Google Translate. It takes less than ten seconds to run on my old laptop, and should print out a summary like this:
```
Statistics:
- 6369 vocabulary from Wanikani
- 25 skipped
- 26 custom definitions used
- 0 unable to find JMdict defintion ✅
- 0 found multiple JMdict definitions  ✅
```

It outputs [`table.txt`](table.txt), which contains *no* Wanikani-copyrighted material, as well as `table-with-wanikani.txt` which contains the translations from Wanikani.

## Notes
Here's an example couple of lines from [`table.txt`](table.txt):
```
一 いち (§1.44. one; best; first, foremost; beginning, start; a (single), one (of many); ace (playing card); bottom string (on a shamisen, etc.). #1160790, common!)
一つ ひとつ (§1.45. one; for one thing; only; (not) even; just (e.g. "just try it"); some kind of, one type of. #1160820, common!)
七 なな しち (§1.46. seven; hepta-. #1319210, common!)
```
As you see, the format is
```
<kanji> <kana, possibly multiple> (§<Wanikani lesson number (skips because we're only looking at vocabulary)> <JMdict definition> #<JMdict entry ID> <indicator if this word is common>)
```
The "JMdict entry ID" may need some explication. All JMdict entries have an ID associated with them, even though most dictionaries don't expose it. You can look up an ID using [JMdict advanced search](http://www.edrdg.org/jmdictdb/cgi-bin/srchform.py?svc=jmdict&sid=) by typing it into the "Search by Id or Seq number" section. Doing so can lead you to the JMdict entry for [#1319210, <ruby>一<rt>いち</rt></ruby>](http://www.edrdg.org/jmdictdb/cgi-bin/entr.py?svc=jmdict&sid=&q=1319210).

## [Go pay Wanikani money](https://www.wanikani.com)
