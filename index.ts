import {readFileSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export {entryToGlossParts} from './helpers';

export * from './interfaces';

import {DependencyGraph, WithDistance} from "./interfaces";

export const vocab: WithDistance[] = JSON.parse(readFileSync(join(__dirname, "table.json"), "utf8"))
export const dependencies: DependencyGraph =
    JSON.parse(readFileSync(join(__dirname, "wanikani-kanji-graph.json"), "utf8"))
