import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
const db = JSON.parse(readFileSync("all-radical-kanji.json", "utf-8"));

const kanjis = db.kanjis.flatMap((v) => v.data);
const radicals = db.radicals.flatMap((v) => v.data);

const multipleOns = kanjis.filter(
  (k) => k.data.readings.filter((r) => r.type === "onyomi").length > 1
);
console.log("multiple onyomi", multipleOns.length);

function unique(v) {
  return Array.from(new Set(v));
}

function removeSingleDescendants(pairs) {
  const firstToN = new Map();
  for (const [left] of pairs) {
    firstToN.set(left, (firstToN.get(left) ?? 0) + 1);
  }
  return pairs.filter(([left]) => firstToN.get(left) > 1);
}

function analyzeKanji(targetKanji) {
  const matches = kanjis.filter((k) => k.data.characters === targetKanji);
  if (matches.length !== 1) {
    throw new Error("single target kanji not found");
  }
  const match = matches[0];

  // How many other kanji share its onyomi?

  const sameOn = kanjis.filter((k) =>
    k.data.readings.some(
      (r) =>
        r.primary === true &&
        r.type === "onyomi" &&
        r.reading === match.data.readings[0].reading
    )
  );

  console.log(
    sameOn.length,
    sameOn.map((k) => k.data.characters)
  );

  // Now how many of those are "related" to the onaji kanji?

  const readingKanjiPairs = sameOn.flatMap((k) =>
    k.data.readings
      .filter((r) => r.primary && r.type === "onyomi")
      .map((r) => r.reading)
      .map((reading) => [reading, k.data.characters])
  );

  const edges = `digraph ${targetKanji} {
overlap=false;
mindist=3;
overlap_scaling=-16;

// reading nodes
${unique(readingKanjiPairs.map((o) => o[0]))
  .map((r) => `${r} [style=filled, fillcolor=pink, shape=diamond];`)
  .join("\n")}

// onyomi
${readingKanjiPairs.map(([l, r]) => `${l} -> ${r}`).join("\n")}
  
// components
${removeSingleDescendants(
  sameOn.flatMap((k) =>
    k.data.component_subject_ids
      .map((radicalId) => {
        const r = radicals.find((r) => r.id === radicalId);
        return r.data.characters || r.data.slug;
      })
      .map((rad) => [rad, k.data.characters])
  )
)
  .map(([left, right]) => `${left} -> ${right}`)
  .join("\n")}
}`;

  mkdirSync(targetKanji, { recursive: true });
  writeFileSync(`${targetKanji}/${targetKanji}.dot`, edges);
  for (const layout of "neato,sfdp,twopi".split(",")) {
    for (const output of "png,svg".split(",")) {
      execSync(
        `${layout} -T${output} "${targetKanji}/${targetKanji}.dot" -o "${targetKanji}/${layout}.${output}"`
      );
    }
  }
}
analyzeKanji("同");
analyzeKanji("心");
analyzeKanji("東");
analyzeKanji("高");
