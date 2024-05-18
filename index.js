"use strict";
exports.__esModule = true;
exports.dependencies = exports.vocab = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
exports.vocab = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "table.json"), "utf8"));
exports.dependencies = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "wanikani-kanji-graph.json"), "utf8"));
