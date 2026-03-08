# Developer notes for ebi-eki

This file is for maintainers. See README.md for user-facing docs.

## Pipeline overview

```
npm run download   →  all-vocab.json, all-radical-kanji.json
npm run table      →  table.txt, table.json, table-with-wanikani.{txt,json}
npm run distances  →  appends `closest` arrays to table.json
```

`wanikani-parse.ts` is the heart of `npm run table`. It joins WaniKani vocabulary with JMdict definitions and furigana data.

## Data files

| File | Source | Role |
|------|--------|------|
| `all-vocab.json` | WaniKani API (via `npm run download`) | Raw WaniKani vocabulary cards |
| `jmdict-eng-*.json` | [JMdict-Simplified](https://github.com/scriptin/jmdict-simplified/releases/latest) | Definitions; script auto-picks the newest file |
| `JmdictFurigana.json` | [JmdictFurigana](https://github.com/Doublevil/JmdictFurigana/releases) | Furigana for dictionary words |
| `JmnedictFurigana.json` | same release | Furigana for proper names |

## How `wanikani-parse.ts` works

### Two lookup maps

**`kanjiToKanaToSenses`** — built from JMdict. Maps `kata2hira(kanji) → kata2hira(kana) → [JMdict IDs]`. Used to find definitions.

**`kanjiReadingToFurigana`** — built from `JmdictFurigana.json` + `JmnedictFurigana.json` + `extraFurigana`. Maps `kata2hira(text) → kata2hira(reading) → [Furigana[]]`. Used to find ruby annotation data.

Both maps normalise keys through `kata2hira()` (katakana → hiragana), so lookups are reading-form-agnostic.

### Resolution order for each WaniKani card

1. **`skip`** set — silently drop the card (e.g. made-up counters like 二万, 二台)
2. **`customGlosses`** map — use a hand-written English gloss; still calls `lookupFurigana`
3. **`kanjiToJmdict`** map — force a specific JMdict entry ID when multiple candidates exist
4. **Hard-coded special cases** — inline `if/else` for handful of words needing bespoke logic (e.g. 朝日, 蜂の巣, 御手洗, 〜才, 〜ヶ月)
5. **JMdict lookup** — if exactly one candidate entry found, use it
6. **`する`/`〜` stripping** — retry lookup after removing common prefixes/suffixes
7. **Fallback** — print `unable to find` warning and emit an invalid empty entry

### Furigana format

`Furigana[]` is an array of either:
- `{ruby: string, rt: string}` — a kanji span with its reading
- `string` — a kana/punctuation span that needs no annotation

Example: 食べ物 → `[{ruby:"食", rt:"た"}, "べ", {ruby:"物", rt:"もの"}]`

## Updating for a new year (when WaniKani adds/changes vocabulary)

Run `npm run table` and look at the warnings. Three kinds of errors appear:

### 1. `unable to find <word> [<readings>] undefined`

The word is not in JMdict at all. Fix: add entries to **both**:

- **`extraFurigana`** (around line 42) — provide the ruby annotation:
  ```ts
  {text: "他の人", reading: "ほかのひと", furigana: [{ruby: "他", rt: "ほか"}, "の", {ruby: "人", rt: "ひと"}]},
  ```
  - Plain strings for kana/katakana spans; `{ruby, rt}` objects for kanji spans.
  - `kata2hira` is applied to both `text` and `reading` at lookup time, so you only need one entry even when WaniKani lists both hiragana and katakana readings.

- **`customGlosses`** (around line 226) — provide the English gloss:
  ```ts
  ['他の人', 'other people'],
  ```
  - The gloss for `customGlosses` uses `kanas[0]` (first listed reading) for the furigana lookup, so make sure your `extraFurigana` entry uses that reading.

### 2. `no known furigana <word> <reading>`

The word IS in JMdict (definition found) but its furigana isn't in `JmdictFurigana.json`. Fix: add only to **`extraFurigana`** — no `customGlosses` entry needed.

**Before adding to `extraFurigana`, check `JmnedictFurigana.json` first.** Proper names (人名) and many other words are often already there — the script loads both files into `kanjiReadingToFurigana`, so if the entry exists in either JSON the error will go away without any code change. Search with e.g.:

```sh
grep -i '"text":"亮平"' JmnedictFurigana.json
```

Only add to `extraFurigana` if the word is genuinely absent from both furigana files.

### 3. `<word> [<readings>] [<ids>] [[<glosses>], ...]` followed by `throw new Error('too many entries')`

Multiple JMdict entries match. Fix: add an entry to **`kanjiToJmdict`** with the correct numeric ID:
```ts
['元', 1260670],
```
Look up candidates at `http://www.edrdg.org/jmdictdb/cgi-bin/entr.py?svc=jmdict&sid=&q=<ID>`.

## Statistics line interpretation

At the end of `npm run table`:
```
- 6369 vocabulary from Wanikani
- 24 skipped          ← entries in `skip` set
- 28 custom definitions used  ← entries in `customGlosses`
- 0 unable to find JMdict defintion ✅   ← must be 0 before committing
```

The goal is `0 unable to find`. Any nonzero count means the output JSON has invalid empty entries.
