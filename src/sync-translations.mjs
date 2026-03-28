import { XMLBuilder, XMLParser } from "fast-xml-parser";
import fs from "fs";

const DEFAULT_LANG = "en";
const LANG_DIR = "./langs";

const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: "\t",
  preserveOrder: true,
});

function readXml(lang) {
  return fs.readFileSync(`${LANG_DIR}/Cafe_${lang}.xml`).toString();
}

function writeXml(lang, xml) {
  fs.writeFileSync(`${LANG_DIR}/Cafe_${lang}.xml`, xml, "utf-8");
}

function collapseEmptyTags(contents) {
  return contents.replace(/<(\b\w+\b)( [^>]+)><\/\1>/g, "<$1$2 />");
}

function getLang(file) {
  return file.replace("Cafe_", "").replace(".xml", "");
}

function syncNode(src, dest, stats) {
  src.forEach((srcNode, index) => {
    const srcId = srcNode[":@"]?.["@_id"];

    if (srcId) {
      // translation node, check if id exists in destination
      const destNode = dest.find((n) => n[":@"]?.["@_id"] === srcId);
      if (!destNode) {
        // if missing insert it at the right position
        dest.splice(index, 0, srcNode);
        stats.missing.push(srcId);
      }
    } else {
      // TODO: handle whole structural node missing
      const key = Object.keys(srcNode)[0];
      const destIndex = dest.findIndex((n) => n[key] !== undefined);
      syncNode(srcNode[key], dest[destIndex][key], stats);
    }
  });
}

function syncLang(lang, src) {
  const xml = readXml(lang);
  const dest = parser.parse(xml);
  const stats = { missing: [] };

  syncNode(src[1].cafe, dest[1].cafe, stats);

  if (stats.missing.length > 0) {
    console.log(
      `✎  Cafe_${lang}.xml — adding ${stats.missing.length} missing key(s):`,
    );
    stats.missing.forEach((key) => console.log(`     + ${key}`));
  } else {
    console.log(`✓  Cafe_${lang}.xml — up to date`);
  }

  const updatedXml = builder.build(dest);
  writeXml(lang, collapseEmptyTags(updatedXml));
}

(function syncAll() {
  const xml = readXml(DEFAULT_LANG);
  const src = parser.parse(xml);
  const files = fs.readdirSync(LANG_DIR);

  console.log(`Default language: ${DEFAULT_LANG}`);

  files.forEach((file) => {
    const lang = getLang(file);

    if (lang !== DEFAULT_LANG) {
      syncLang(lang, src);
    }
  });
})();
