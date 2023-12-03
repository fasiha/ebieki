import { readFileSync, writeFileSync } from "fs";
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

function analyzeKanji(targetKanji) {
  const matches = kanjis.filter((k) => k.data.characters === targetKanji);
  if (matches.length !== 1) {
    throw new Error("single target kanji not found");
  }
  const match = matches[0];

  // How many other kanji share its onyomi?

  const sameOn = kanjis.filter((k) =>
    k.data.readings.some(
      (r) => r.type === "onyomi" && r.reading === match.data.readings[0].reading
    )
  );

  console.log(
    sameOn.length,
    sameOn.map((k) => k.data.characters)
  );

  // Now how many of those are "related" to the onaji kanji?

  const edges = `digraph Onaji {
overlap=false;

// onyomi
${sameOn
  .flatMap((k) =>
    k.data.readings
      .filter((r) => r.type === "onyomi")
      .map((r) => r.reading)
      .map((reading) => `${reading} -> ${k.data.characters}`)
  )
  .join("\n")}
  
// components
${unique(
  sameOn.flatMap((k) =>
    k.data.component_subject_ids
      .map((radicalId) => {
        const r = radicals.find((r) => r.id === radicalId);
        return r.data.characters || r.data.slug;
      })
      .map((rad) => `${rad} -> ${k.data.characters}`)
  )
).join("\n")}
}`;

  // console.log(edges);
  writeFileSync(`${targetKanji}.dot`, edges);
  console.log(`Now run
$ sfdp -Tsvg ${targetKanji}.dot -o ${targetKanji}.svg; sfdp -Tpng ${targetKanji}.dot -o ${targetKanji}.png
`);
}
analyzeKanji("同");
// analyzeKanji("心");
