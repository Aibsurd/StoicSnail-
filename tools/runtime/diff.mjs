#!/usr/bin/env node
/**
 * Stoic Snail Diff Tool v2
 * Compare files with stat, ignore whitespace, better output
 */

import { readFileSync } from "fs";

const args = process.argv.slice(2);

let fileA = null,
  fileB = null,
  inlineA = null,
  inlineB = null;
let sideBySideMode = false;
let unifiedMode = false;
let statMode = false;
let ignoreWhitespace = false;
let showContext = 3;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-s" || arg === "--side-by-side") sideBySideMode = true;
  else if (arg === "-u" || arg === "--unified") unifiedMode = true;
  else if (arg === "-w" || arg === "--ignore-whitespace") ignoreWhitespace = true;
  else if (arg === "--stat") statMode = true;
  else if (arg === "-c" || arg === "--context") showContext = parseInt(args[++i]) || 3;
  else if (arg === "-i" || arg === "--inline") {
    inlineA = args[++i];
    inlineB = args[++i];
  } else if (!fileA) fileA = arg;
  else if (!fileB) fileB = arg;
}

if (!fileA && !inlineA) {
  console.log("Usage: diff.mjs [options] <fileA> [fileB]");
  console.log("       diff.mjs -i <stringA> <stringB>");
  console.log("");
  console.log("Options:");
  console.log("  -s, --side-by-side    Side-by-side diff");
  console.log("  -u, --unified         Unified diff format");
  console.log("  -w, --ignore-whitespace  Ignore whitespace changes");
  console.log("  --stat                Show diff statistics only");
  console.log("  -c, --context <n>     Show n lines of context (default: 3)");
  console.log("  -i, --inline A B      Inline diff with strings");
  process.exit(1);
}

let contentA,
  contentB,
  labelA = fileA || "A",
  labelB = fileB || "B";

if (inlineA !== null && inlineB !== null) {
  contentA = inlineA;
  contentB = inlineB;
  labelA = "(string A)";
  labelB = "(string B)";
} else {
  try {
    contentA = readFileSync(fileA, "utf-8");
    contentB = fileB ? readFileSync(fileB, "utf-8") : "";
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

function normalize(str) {
  if (!ignoreWhitespace) return str;
  return str
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n");
}

contentA = normalize(contentA);
contentB = normalize(contentB);

function computeLCS(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result = { added: [], removed: [], unchanged: [] };
  let i = m,
    j = n;
  const changes = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unchanged.unshift({ content: a[i - 1], lineA: i, lineB: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.added.unshift({ content: b[j - 1], lineB: j });
      j--;
    } else {
      result.removed.unshift({ content: a[i - 1], lineA: i });
      i--;
    }
  }

  return result;
}

function toLines(str) {
  return str.split("\n");
}

const linesA = toLines(contentA);
const linesB = toLines(contentB);
const diff = computeLCS(linesA, linesB);

// Statistics
const stats = {
  added: diff.added.length,
  removed: diff.removed.length,
  unchanged: diff.unchanged.length,
  totalA: linesA.length,
  totalB: linesB.length,
};

if (statMode) {
  console.log("📊 Diff Statistics");
  console.log("==================");
  console.log(`${labelA} → ${labelB}\n`);
  console.log(`Lines: ${stats.totalA} → ${stats.totalB}`);
  console.log(`Changed: +${stats.added} / -${stats.removed}`);
  console.log(
    `Similarity: ${Math.round((stats.unchanged / Math.max(stats.totalA, stats.totalB)) * 100)}%`,
  );
  process.exit(0);
}

// Show summary
console.log(`📊 Diff: ${labelA} → ${labelB}`);
console.log("═".repeat(50));
console.log(`Added:    ${stats.added} lines`);
console.log(`Removed:  ${stats.removed} lines`);
console.log(`Unchanged: ${stats.unchanged} lines`);
console.log("");

if (stats.added === 0 && stats.removed === 0) {
  console.log("✓ Files are identical");
  process.exit(0);
}

if (unifiedMode) {
  console.log("--- " + labelA);
  console.log("+++ " + labelB);

  // Show removed lines with context
  diff.removed.forEach((r) => {
    const ctx = diff.unchanged.filter(
      (u) => u.lineA < r.lineA + showContext && u.lineA > r.lineA - showContext,
    );
    console.log(`-${r.content}`);
  });

  diff.added.forEach((a) => {
    console.log(`+${a.content}`);
  });

  process.exit(0);
}

if (sideBySideMode) {
  const width = process.stdout.columns || 120;
  const halfWidth = Math.floor((width - 4) / 2);
  const maxLines = Math.max(linesA.length, linesB.length);

  console.log("┌" + "─".repeat(halfWidth) + "┬" + "─".repeat(halfWidth) + "┐");

  for (let i = 0; i < maxLines; i++) {
    const left = (linesA[i] || "").slice(0, halfWidth).padEnd(halfWidth);
    const right = (linesB[i] || "").slice(0, halfWidth).padEnd(halfWidth);

    let marker = " ";
    if (i >= diff.removed.length && i < linesA.length) marker = "-";
    else if (i >= diff.added.length && i < linesB.length) marker = "+";
    else if (linesA[i] !== linesB[i]) marker = "│";

    // Color
    let leftColor = "\x1b[37m",
      rightColor = "\x1b[37m";
    if (linesA[i] && !diff.unchanged.find((u) => u.content === linesA[i])) leftColor = "\x1b[31m";
    if (linesB[i] && !diff.unchanged.find((u) => u.content === linesB[i])) rightColor = "\x1b[32m";

    console.log(`${leftColor}│${left}${rightColor}│${right}\x1b[0m`);
  }

  console.log("└" + "─".repeat(halfWidth) + "┴" + "─".repeat(halfWidth) + "┘");
  process.exit(0);
}

// Default: pretty diff
if (diff.removed.length > 0) {
  console.log("\x1b[41m\x1b[97m REMOVED (" + diff.removed.length + " lines) \x1b[0m");
  diff.removed.slice(0, 50).forEach((r, i) => {
    const lineNum = r.lineA.toString().padStart(4);
    console.log(`\x1b[31m-${lineNum} │ ${r.content}\x1b[0m`);
  });
  if (diff.removed.length > 50) {
    console.log(`  ... and ${diff.removed.length - 50} more removed lines`);
  }
}

if (diff.added.length > 0) {
  console.log("\x1b[42m\x1b[97m ADDED (" + diff.added.length + " lines) \x1b[0m");
  diff.added.slice(0, 50).forEach((a, i) => {
    const lineNum = a.lineB.toString().padStart(4);
    console.log(`\x1b[32m+${lineNum} │ ${a.content}\x1b[0m`);
  });
  if (diff.added.length > 50) {
    console.log(`  ... and ${diff.added.length - 50} more added lines`);
  }
}

console.log("\n" + "─".repeat(50));
console.log(
  `Similarity: ${Math.round((stats.unchanged / Math.max(stats.totalA, stats.totalB)) * 100)}%`,
);
