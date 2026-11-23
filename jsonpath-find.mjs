#!/usr/bin/env node
// jsonpath-find: print the exact path of every key or value that contains a word,
// or read the value at a path. Zero dependencies, Node 18+.
// Web version with a clickable tree: https://fbuff.com/tools/json-path-finder/
//
//   node jsonpath-find.mjs response.json "customer"
//   curl -s https://api.example.com/orders | node jsonpath-find.mjs - "4242"
//   node jsonpath-find.mjs response.json --get '$.data.items[0]["sku-id"]'

import { readFileSync } from "node:fs";

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** $.a.b[0]["first name"] (RFC 9535 style, works in JSONPath libraries, Postman, Zapier, n8n) */
export function toJsonPath(segments) {
  return segments.reduce(
    (p, s) => (typeof s === "number" ? `${p}[${s}]` : IDENT.test(s) ? `${p}.${s}` : `${p}[${JSON.stringify(s)}]`),
    "$"
  );
}

/** data.a.b[0]["first name"] (JavaScript, after JSON.parse) */
export function toJsAccessor(segments, root = "data") {
  return toJsonPath(segments).replace(/^\$/, root);
}

/** .a.b[0]["first name"] (jq) */
export function toJqPath(segments) {
  const p = segments
    .map((s) => (typeof s === "number" ? `[${s}]` : IDENT.test(s) ? `.${s}` : `[${JSON.stringify(s)}]`))
    .join("");
  return p.startsWith(".") ? p : `.${p}`;
}

/** Every path whose key or primitive value contains `query` (case-insensitive), in document order. */
export function findPaths(data, query) {
  const q = query.trim().toLowerCase();
  const out = [];
  if (!q) return out;
  const seen = new Set();
  const add = (path) => {
    const key = JSON.stringify(path);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(path);
    }
  };
  (function walk(value, path) {
    if (value === null || typeof value !== "object") {
      if (String(value).toLowerCase().includes(q)) add(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    for (const [k, item] of Object.entries(value)) {
      if (k.toLowerCase().includes(q)) add([...path, k]);
      walk(item, [...path, k]);
    }
  })(data, []);
  return out;
}

/** Parse $.a[0]["b c"]['d'] into segments. Wildcards, filters and slices are not supported. */
export function parsePath(expr) {
  const s = expr.trim();
  if (!s.startsWith("$")) throw new Error("JSONPath must start with $");
  const segs = [];
  let i = 1;
  while (i < s.length) {
    if (s[i] === ".") {
      const m = /^[A-Za-z0-9_$]+/.exec(s.slice(i + 1));
      if (!m) throw new Error(`Invalid segment at position ${i}`);
      segs.push(m[0]);
      i += 1 + m[0].length;
    } else if (s[i] === "[") {
      const close = s.indexOf("]", i);
      if (close === -1) throw new Error("Missing ]");
      const tok = s.slice(i + 1, close).trim();
      if (/^\d+$/.test(tok)) segs.push(Number(tok));
      else if (/^".*"$/.test(tok)) segs.push(JSON.parse(tok));
      else if (/^'.*'$/.test(tok)) segs.push(tok.slice(1, -1));
      else throw new Error(`Unsupported bracket expression [${tok}] (wildcards and filters are not supported)`);
      i = close + 1;
    } else {
      throw new Error(`Unexpected "${s[i]}" at position ${i}`);
    }
  }
  return segs;
}

export function getAt(data, segments) {
  let cur = data;
  for (const seg of segments) {
    const ok =
      typeof seg === "number"
        ? Array.isArray(cur) && seg < cur.length
        : cur !== null && typeof cur === "object" && !Array.isArray(cur) && Object.hasOwn(cur, seg);
    if (!ok) throw new Error(`No match at ${toJsonPath(segments)}`);
    cur = cur[seg];
  }
  return cur;
}

function main(argv) {
  const [file, ...rest] = argv;
  if (!file || file === "-h" || file === "--help") {
    console.log(`Usage:
  node jsonpath-find.mjs <file.json|-> <search text>
  node jsonpath-find.mjs <file.json|-> --get '<$.json.path>'`);
    return 0;
  }
  const text = readFileSync(file === "-" ? 0 : file, "utf8");
  const data = JSON.parse(text);

  if (rest[0] === "--get") {
    const value = getAt(data, parsePath(rest[1] ?? "$"));
    console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    return 0;
  }

  const paths = findPaths(data, rest.join(" "));
  if (paths.length === 0) {
    console.error("No key or value contains that text.");
    return 1;
  }
  for (const p of paths) {
    const v = getAt(data, p);
    const preview = v !== null && typeof v === "object" ? (Array.isArray(v) ? `[${v.length} items]` : "{…}") : JSON.stringify(v);
    console.log(`${toJsonPath(p)}  =  ${preview}`);
    console.log(`  js: ${toJsAccessor(p)}    jq: ${toJqPath(p)}`);
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("jsonpath-find.mjs")) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
