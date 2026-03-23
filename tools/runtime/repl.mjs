#!/usr/bin/env node
/**
 * Stoic Snail Interactive REPL
 * Node.js REPL with workspace access and utilities
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(__dirname, "../..");

// In-memory store for variables
const store = {
  // Add utilities here
};

// Load workspace files
store.ws = {
  path: WORKSPACE,
  read(file) {
    try {
      return readFileSync(join(WORKSPACE, file), "utf-8");
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
  list(dir = "") {
    try {
      const items = readdirSync(join(WORKSPACE, dir));
      return items.map((name) => {
        const full = join(WORKSPACE, dir, name);
        const stat = statSync(full);
        return { name, type: stat.isDirectory() ? "dir" : "file" };
      });
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
};

// JSON utilities
store.json = {
  parse: JSON.parse,
  stringify: (obj, indent = 2) => JSON.stringify(obj, null, indent),
  pretty: (obj) => JSON.stringify(obj, null, 2),
};

// String utilities (lodash-like)
store.str = {
  camelCase: (s) => s.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")),
  kebabCase: (s) => s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
  snake_case: (s) => s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(),
  trim: (s) => s.trim(),
  upperFirst: (s) => s.charAt(0).toUpperCase() + s.slice(1),
  lowerFirst: (s) => s.charAt(0).toLowerCase() + s.slice(1),
  capitalize: (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
  repeat: (s, n) => s.repeat(n),
  padStart: (s, n, c = " ") => s.padStart(n, c),
  padEnd: (s, n, c = " ") => s.padEnd(n, c),
};

store.math = {
  clamp: (n, min, max) => Math.min(Math.max(n, min), max),
  lerp: (a, b, t) => a + (b - a) * t,
  degToRad: (d) => (d * Math.PI) / 180,
  radToDeg: (r) => (r * 180) / Math.PI,
  sum: (arr) => arr.reduce((a, b) => a + b, 0),
  avg: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
  median: (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
};

// Date utilities
store.date = {
  now: () => new Date(),
  utc: () => new Date().toISOString(),
  format: (d = new Date(), fmt = "YYYY-MM-DD HH:mm:ss") => {
    const pad = (n) => String(n).padStart(2, "0");
    return fmt
      .replace("YYYY", d.getFullYear())
      .replace("MM", pad(d.getMonth() + 1))
      .replace("DD", pad(d.getDate()))
      .replace("HH", pad(d.getHours()))
      .replace("mm", pad(d.getMinutes()))
      .replace("ss", pad(d.getSeconds()));
  },
};

// Create REPL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "🐌 > ",
});

console.log("╔══════════════════════════════════════════╗");
console.log("║   Stoic Snail REPL v1.0                  ║");
console.log("║   Node.js interactive environment        ║");
console.log("╚══════════════════════════════════════════╝");
console.log("");
console.log("Available: store, ws, json, str, math, date, fetch");
console.log("Type .help for commands, .exit to quit");
console.log("");

const context = { ...store, store };

rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();

  if (!input) {
    rl.prompt();
    return;
  }

  if (input === ".exit" || input === ".quit") {
    console.log("Bye!");
    process.exit(0);
  }

  if (input === ".help") {
    console.log(".help    - This help");
    console.log(".exit    - Exit REPL");
    console.log(".clear   - Clear screen");
    console.log(".store   - Show store contents");
    console.log(".node    - Execute Node.js directly");
    console.log("");
    console.log("Pre-loaded:");
    console.log("  store    - In-memory variable store");
    console.log("  ws       - Workspace access (ws.read(file), ws.list())");
    console.log("  json     - JSON utilities");
    console.log("  str      - String utilities");
    console.log("  math     - Math utilities");
    console.log("  date     - Date utilities");
    rl.prompt();
    return;
  }

  if (input === ".clear") {
    console.clear();
    rl.prompt();
    return;
  }

  if (input === ".store") {
    console.log("Store contents:");
    for (const [k, v] of Object.entries(store)) {
      if (typeof v === "function") {
        console.log(`  ${k}: [Function]`);
      } else if (typeof v === "object" && v !== null) {
        console.log(`  ${k}: ${JSON.stringify(v).slice(0, 60)}...`);
      } else {
        console.log(`  ${k}: ${v}`);
      }
    }
    rl.prompt();
    return;
  }

  if (input === ".node") {
    console.log("Enter Node.js expression:");
    const expr = await new Promise((resolve) => {
      rl.question("  ", resolve);
    });
    try {
      const result = eval(expr);
      console.log(result);
    } catch (e) {
      console.error("Error:", e.message);
    }
    rl.prompt();
    return;
  }

  // Try to evaluate
  try {
    // Create function with context variables in scope
    const ctxVars = Object.entries(context).reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
    const fn = new Function(...Object.keys(ctxVars), `return ${input}`);
    const result = fn(...Object.values(ctxVars));
    if (result !== undefined) {
      console.log(typeof result === "object" ? JSON.stringify(result, null, 2) : result);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  rl.prompt();
}).on("close", () => {
  process.exit(0);
});
