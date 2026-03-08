"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
exports.__esModule = true;
exports.dependencies = exports.vocab = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
__exportStar(require("./interfaces"), exports);
exports.vocab = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "table.json"), "utf8"));
exports.dependencies = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "wanikani-kanji-graph.json"), "utf8"));
