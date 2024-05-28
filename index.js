import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export { entryToGlossParts } from './helpers';
export * from './interfaces';
export const vocab = JSON.parse(readFileSync(join(__dirname, "table.json"), "utf8"));
export const dependencies = JSON.parse(readFileSync(join(__dirname, "wanikani-kanji-graph.json"), "utf8"));
