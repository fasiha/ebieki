interfaces.d.ts(87,2): error TS1036: Statements are not allowed in ambient contexts.
wanikani-parse.ts(1,8): error TS1259: Module '"assert"' can only be default-imported using the 'esModuleInterop' flag
wanikani-parse.ts(313,45): error TS2339: Property 'flatMap' does not exist on type 'Sense[]'.
k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
exports.__esModule = true;
exports.dependencies = exports.vocab = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var wanikani_parse_1 = require("./wanikani-parse");
__createBinding(exports, wanikani_parse_1, "entryToGlossParts");
__exportStar(require("./interfaces"), exports);
exports.vocab = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "table.json"), "utf8"));
exports.dependencies = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, "wanikani-kanji-graph.json"), "utf8"));
