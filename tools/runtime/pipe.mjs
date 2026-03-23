#!/usr/bin/env node
/**
 * Stoic Snail Data Pipeline v1.1
 * Reliable data transformation pipeline
 *
 * Supports: property access, array indexing, string ops, basic aggregation
 */

import { readFileSync } from "fs";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
\x1b[1m🐌 Data Pipeline v1.1\x1b[0m

\x1b[33mUsage:\x1b[0m
  pipe.mjs <source> <transforms...> [--output]

\x1b[33mSources:\x1b[0m
  <file>              Read from file (JSON, text)
  <url>               Fetch from URL
  @json:<json>        Inline JSON
  @text:<string>      Inline text

\x1b[33mTransforms:\x1b[0m
  Property:          .key  .key1.key2  .[n]  .[-n]  .[m:n]
  String:            .trim  .lower  .upper  .split  .join  .replace  .match
  Array:             .length  .unique  .reverse  .sort  .limit(n)
  Object:            .keys  .values  .entries
  Number:            .sum  .avg  .min  .max  .round(n)
  Type:              --type (shows type)
  Count:             --count

\x1b[33mOutput:\x1b[0m
  --pretty           Pretty JSON (default)
  --raw              Raw output
  --table            Formatted table (for arrays of objects)
  --line             Each array item on its own line

\x1b[33mExamples:\x1b[0m
  # Simple property access
  pipe.mjs @json:'{"name":"test"}' .name
  # Output: "test"
  
  # Nested access
  pipe.mjs @json:'{"a":{"b":{"c":1}}}' .a.b.c
  # Output: 1
  
  # Array index
  pipe.mjs @json:'[1,2,3]' .[0]
  # Output: 1
  
  # Array slice
  pipe.mjs @json:'[1,2,3,4,5]' .[1:3]
  # Output: [2, 3]
  
  # Chain operations
  pipe.mjs @json:'[3,1,4,1,5]' .sort .unique .reverse
  # Output: [5, 4, 3, 1]
  
  # String transforms
  pipe.mjs @text:'  hello world  ' .trim .upper
  # Output: "HELLO WORLD"
  
  # Array aggregation
  pipe.mjs @json:'[1,2,3,4,5]' .sum
  # Output: 15
  
  # Table output
  pipe.mjs @json:'[{"name":"A","v":1},{"name":"B","v":2}]' --table
`);
  process.exit(0);
}

// Parse source
let data;
const source = args[0];

// Find output mode (last arg starting with --)
let outputMode = "--pretty";
const transforms = [];
let hasTransforms = false;

for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    outputMode = args[i];
  } else if (args[i] === ".limit" && args[i + 1] && /^\d+$/.test(args[i + 1])) {
    // Special case: .limit followed by a number
    transforms.push(`.limit(${args[++i]})`);
    hasTransforms = true;
  } else {
    transforms.push(args[i]);
    hasTransforms = true;
  }
}

async function loadData() {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    const text = await res.text();
    if (source.endsWith(".json") || res.headers.get("content-type")?.includes("json")) {
      return JSON.parse(text);
    }
    return text;
  } else if (source.startsWith("@json:")) {
    return JSON.parse(source.slice(6));
  } else if (source.startsWith("@text:")) {
    return source.slice(6);
  } else {
    const content = readFileSync(source, "utf-8");
    if (source.endsWith(".json")) {
      return JSON.parse(content);
    }
    return content;
  }
}

// Apply transforms
function applyTransforms(data, transforms) {
  let result = data;

  for (const t of transforms) {
    // Property access: .key  (only for objects, not arrays)
    if (t.match(/^\.[a-zA-Z_][a-zA-Z0-9_]*$/) && !Array.isArray(result)) {
      const key = t.slice(1);
      result = result?.[key];
    }
    // Array/object methods: .sort .reverse .unique .keys .values .entries
    else if (t === ".sort") {
      result = Array.isArray(result) ? [...result].sort() : result;
    } else if (t === ".reverse") {
      result = Array.isArray(result) ? [...result].reverse() : result;
    } else if (t === ".unique") {
      result = Array.isArray(result)
        ? [...new Set(result.map((v) => JSON.stringify(v)))].map((v) => JSON.parse(v))
        : result;
    }
    // Nested: .a.b.c
    else if (t.match(/^\.[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/)) {
      const keys = t.slice(1).split(".");
      result = keys.reduce((obj, k) => obj?.[k], result);
    }
    // Array index: .[n] or .[-n]
    else if (t.match(/^\.\[(-?\d+)\]$/)) {
      const idx = parseInt(t.match(/^\.\[(-?\d+)\]$/)[1]);
      result = Array.isArray(result) ? result[idx] : undefined;
    }
    // Array slice: .[m:n]
    else if (t.match(/^\.\[(-?\d+):(-?\d+)?\]$/)) {
      const match = t.match(/^\.\[(-?\d+):(-?\d+)?\]$/);
      const start = parseInt(match[1]);
      const end = match[2] !== undefined ? parseInt(match[2]) : undefined;
      result = Array.isArray(result) ? result.slice(start, end) : undefined;
    }
    // String transforms
    else if (t === ".trim") {
      result = typeof result === "string" ? result.trim() : result;
    } else if (t === ".lower" || t === ".toLowerCase") {
      result = typeof result === "string" ? result.toLowerCase() : result;
    } else if (t === ".upper" || t === ".toUpperCase") {
      result = typeof result === "string" ? result.toUpperCase() : result;
    } else if (t.startsWith(".split")) {
      const sep = t.match(/\.split\(['"](.*?)['"]\)/)?.[1] || ",";
      result = typeof result === "string" ? result.split(sep) : result;
    } else if (t.startsWith(".join")) {
      const sep = t.match(/\.join\(['"]?(.*?)['"]?\)/)?.[1] || ",";
      result = Array.isArray(result) ? result.join(sep) : result;
    } else if (t.startsWith(".replace")) {
      const match = t.match(/\.replace\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
      if (match) {
        result =
          typeof result === "string" ? result.replace(new RegExp(match[1], "g"), match[2]) : result;
      }
    }
    // Array transforms
    else if (t === ".unique") {
      result = Array.isArray(result)
        ? [...new Set(result.map((v) => JSON.stringify(v)))].map((v) => JSON.parse(v))
        : result;
    } else if (t === ".reverse") {
      result = Array.isArray(result) ? [...result].reverse() : result;
    } else if (t === ".sort") {
      result = Array.isArray(result) ? [...result].sort() : result;
    } else if (t.startsWith(".limit") || t.match(/^\.(\d+)$/)) {
      let n;
      if (t.match(/^\.(\d+)$/)) {
        n = parseInt(t.match(/^\.(\d+)$/)[1]);
      } else {
        n = parseInt(t.match(/\.limit\((\d+)\)/)?.[1]);
      }
      if (n) result = Array.isArray(result) ? result.slice(0, n) : result;
    }
    // Object transforms
    else if (t === ".keys") {
      result =
        result && typeof result === "object" && !Array.isArray(result)
          ? Object.keys(result)
          : result;
    } else if (t === ".values") {
      result =
        result && typeof result === "object" && !Array.isArray(result)
          ? Object.values(result)
          : result;
    } else if (t === ".entries") {
      result =
        result && typeof result === "object" && !Array.isArray(result)
          ? Object.entries(result)
          : result;
    }
    // Array properties
    else if (t === ".length") {
      result = Array.isArray(result)
        ? result.length
        : result && typeof result === "object"
          ? Object.keys(result).length
          : String(result).length;
    }
    // Number aggregation
    else if (t === ".sum") {
      result = Array.isArray(result)
        ? result.filter((v) => typeof v === "number").reduce((a, b) => a + b, 0)
        : result;
    } else if (t === ".avg") {
      const nums = Array.isArray(result) ? result.filter((v) => typeof v === "number") : [];
      result = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : result;
    } else if (t === ".min") {
      const nums = Array.isArray(result) ? result.filter((v) => typeof v === "number") : [];
      result = nums.length ? Math.min(...nums) : result;
    } else if (t === ".max") {
      const nums = Array.isArray(result) ? result.filter((v) => typeof v === "number") : [];
      result = nums.length ? Math.max(...nums) : result;
    } else if (t.startsWith(".round")) {
      const n = parseInt(t.match(/\.round\(?(\d+)?\)?/)?.[1] || "0");
      result =
        typeof result === "number"
          ? n > 0
            ? parseFloat(result.toFixed(n))
            : Math.round(result)
          : result;
    } else if (t === "--type") {
      result = Array.isArray(result) ? "array" : result === null ? "null" : typeof result;
    }
  }

  return result;
}

// Output
function output(data, mode) {
  switch (mode) {
    case "--raw":
      console.log(typeof data === "object" ? JSON.stringify(data) : data);
      break;
    case "--count":
      if (Array.isArray(data)) console.log(data.length);
      else if (data && typeof data === "object") console.log(Object.keys(data).length);
      else console.log(1);
      break;
    case "--table":
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data.every((row) => row && typeof row === "object")
      ) {
        const keys = [...new Set(data.flatMap((r) => Object.keys(r)))];
        const widths = keys.map((k) =>
          Math.max(k.length, ...data.map((r) => String(r[k] ?? "").length)),
        );
        console.log(keys.map((k, i) => k.padEnd(widths[i])).join(" │ "));
        console.log(widths.map((w) => "─".repeat(w)).join("─┼─"));
        data.forEach((row) => {
          console.log(keys.map((k, i) => String(row[k] ?? "").padEnd(widths[i])).join(" │ "));
        });
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
      break;
    case "--line":
      if (Array.isArray(data)) {
        data.forEach((item) => console.log(typeof item === "object" ? JSON.stringify(item) : item));
      } else {
        console.log(data);
      }
      break;
    default:
      console.log(JSON.stringify(data, null, 2));
  }
}

async function main() {
  try {
    data = await loadData();

    if (!hasTransforms) {
      output(data, outputMode);
    } else {
      const result = applyTransforms(data, transforms);
      output(result, outputMode);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
