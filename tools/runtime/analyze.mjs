#!/usr/bin/env node
/**
 * Stoic Snail Code Analyzer v2
 * Improved pattern matching and noise filtering
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

const WORKSPACE = process.cwd();
const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "package-lock.json",
  ".map",
  ".min.js",
  ".min.css",
  "dist/",
  "build/",
  ".next",
  ".nuxt",
  "__pycache__",
  ".venv",
  "venv/",
];

const args = process.argv.slice(2);
const cmd = args[0];

function shouldIgnore(file) {
  return IGNORE_PATTERNS.some((p) => file.includes(p) || file.endsWith(p));
}

function walkDir(dir, extensions = [".js", ".mjs", ".ts", ".tsx", ".md", ".json", ".sh", ".py"]) {
  const files = [];
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      if (item.startsWith(".") || shouldIgnore(item)) continue;
      const full = join(dir, item);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          files.push(...walkDir(full, extensions));
        } else if (extensions.includes(extname(item))) {
          files.push(full);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return files;
}

function parseImports(content) {
  const imports = [];
  const importRe = /import\s+.*?from\s+['"](.+?)['"]/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    imports.push(match[1]);
  }
  // CommonJS require
  const requireRe = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
  while ((match = requireRe.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return [...new Set(imports)];
}

function parseExports(content) {
  const exports = [];
  // export function/class/const/let/var
  const namedRe = /export\s+(?:function|class|const|let|var)\s+(\w+)/g;
  let match;
  while ((match = namedRe.exec(content)) !== null) {
    exports.push({ name: match[1], type: "named" });
  }
  // export default
  const defaultRe = /export\s+default\s+(\w+|\{[^}]+\}|class)/g;
  while ((match = defaultRe.exec(content)) !== null) {
    exports.push({ name: match[1] || "default", type: "default" });
  }
  // export { name }
  const namedGroupRe = /export\s+\{([^}]+)\}/g;
  while ((match = namedGroupRe.exec(content)) !== null) {
    const names = match[1]
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n);
    names.forEach((n) => exports.push({ name: n, type: "named" }));
  }
  return exports;
}

function findUsages(files, symbol, caseSensitive = false) {
  const usages = [];
  const pattern = caseSensitive
    ? symbol
    : new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

  for (const file of files) {
    if (shouldIgnore(file)) continue;
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        // Skip comments
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) return;

        const matches = caseSensitive
          ? line.includes(symbol)
          : line.toLowerCase().includes(symbol.toLowerCase());
        if (matches) {
          const relPath = file.replace(WORKSPACE + "/", "");
          usages.push({ file: relPath, line: i + 1, content: line.trim().slice(0, 120) });
        }
      });
    } catch (e) {}
  }
  return usages;
}

function analyzeFile(file) {
  try {
    const content = readFileSync(file, "utf-8");
    const imports = parseImports(content);
    const exports = parseExports(content);
    const stat = statSync(file);
    return { file, imports, exports, lines: content.split("\n").length, size: stat.size };
  } catch (e) {
    return { file, error: e.message };
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

console.log("🐌 Code Analyzer v2");
console.log("==================\n");

if (cmd === "tree") {
  const dir = args[1] || ".";
  const fullDir = join(WORKSPACE, dir);
  const maxDepth = parseInt(args[2]) || 3;
  let fileCount = 0,
    dirCount = 0;

  console.log(`📁 ${fullDir}\n`);

  function printTree(dir, prefix = "", depth = 0) {
    if (depth > maxDepth) return;

    let items;
    try {
      items = readdirSync(dir)
        .filter((f) => !f.startsWith(".") && !shouldIgnore(f))
        .sort();
    } catch (e) {
      return;
    }

    const dirs = [],
      files = [];
    for (const item of items) {
      const full = join(dir, item);
      try {
        if (statSync(full).isDirectory()) dirs.push(item);
        else files.push(item);
      } catch (e) {}
    }

    const all = [
      ...dirs.map((d) => ({ n: d, t: "dir" })),
      ...files.map((f) => ({ n: f, t: "file" })),
    ];

    all.forEach((item, i) => {
      const isLast = i === all.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const full = join(dir, item.n);
      let size = "";

      if (item.t === "file") {
        try {
          size = formatBytes(statSync(full).size);
        } catch (e) {}
        size = ` (${size})`;
      }

      console.log(`${prefix}${connector}${item.n}${size}`);
      if (item.t === "dir") {
        const ext = isLast ? "    " : "│   ";
        printTree(full, prefix + ext, depth + 1);
        dirCount++;
      } else {
        fileCount++;
      }
    });
  }

  printTree(fullDir);
  console.log(`\n📊 ${fileCount} files, ${dirCount} directories`);
} else if (cmd === "deps") {
  const file = args[1];
  if (!file) {
    console.log("Usage: analyze.mjs deps <file>");
    process.exit(1);
  }
  const full = join(WORKSPACE, file);
  const result = analyzeFile(full);

  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  console.log(`📄 ${result.file}`);
  console.log(`📝 ${result.lines} lines, ${formatBytes(result.size)}\n`);

  console.log("📥 Imports:");
  if (result.imports.length === 0) {
    console.log("  (none)");
  } else {
    result.imports.forEach((i) => console.log(`  - ${i}`));
  }

  console.log("\n📤 Exports:");
  if (result.exports.length === 0) {
    console.log("  (none)");
  } else {
    result.exports.forEach((e) => console.log(`  - ${e.name} (${e.type})`));
  }
} else if (cmd === "find") {
  const symbol = args[1];
  if (!symbol) {
    console.log("Usage: analyze.mjs find <symbol> [-c for case-sensitive]");
    process.exit(1);
  }

  const caseSensitive = args.includes("-c");
  const files = walkDir(WORKSPACE);
  console.log(
    `🔍 Searching for "${symbol}"${caseSensitive ? " (case-sensitive)" : ""} in ${files.filter((f) => !shouldIgnore(f)).length} files...\n`,
  );

  const usages = findUsages(files, symbol, caseSensitive);
  if (usages.length === 0) {
    console.log("No usages found");
  } else {
    // Group by file
    const byFile = {};
    usages.forEach((u) => {
      if (!byFile[u.file]) byFile[u.file] = [];
      byFile[u.file].push(u);
    });

    console.log(`Found ${usages.length} usage(s) in ${Object.keys(byFile).length} file(s):\n`);
    for (const [file, locs] of Object.entries(byFile)) {
      console.log(`📄 ${file}`);
      locs.forEach((u) => console.log(`   ${u.line}: ${u.content}`));
      console.log("");
    }
  }
} else if (cmd === "exports") {
  const dir = args[1] || ".";
  const fullDir = join(WORKSPACE, dir);
  const files = walkDir(fullDir).filter((f) => !shouldIgnore(f));

  console.log(`Analyzing ${files.length} files...\n`);

  const allExports = {};
  for (const file of files) {
    const result = analyzeFile(file);
    if (result.exports) {
      for (const exp of result.exports) {
        if (!allExports[exp.name]) {
          allExports[exp.name] = [];
        }
        allExports[exp.name].push({ file: file.replace(WORKSPACE + "/", ""), type: exp.type });
      }
    }
  }

  if (Object.keys(allExports).length === 0) {
    console.log("No exports found");
  } else {
    console.log("All exports:\n");
    for (const [name, locs] of Object.entries(allExports).sort()) {
      console.log(`${name}:`);
      locs.forEach((l) => console.log(`  - ${l.file} (${l.type})`));
    }
  }
} else if (cmd === "imports") {
  const dir = args[1] || ".";
  const fullDir = join(WORKSPACE, dir);
  const files = walkDir(fullDir).filter((f) => !shouldIgnore(f));

  const allImports = {};
  for (const file of files) {
    const result = analyzeFile(file);
    if (result.imports) {
      for (const imp of result.imports) {
        if (!imp.startsWith(".") && !imp.startsWith("/")) {
          // skip relative imports
          if (!allImports[imp]) allImports[imp] = [];
          allImports[imp].push(file.replace(WORKSPACE + "/", ""));
        }
      }
    }
  }

  if (Object.keys(allImports).length === 0) {
    console.log("No external imports found");
  } else {
    console.log("External imports:\n");
    for (const [mod, files] of Object.entries(allImports).sort()) {
      console.log(`${mod}:`);
      files.forEach((f) => console.log(`  - ${f}`));
    }
  }
} else if (cmd === "stats") {
  const dir = args[1] || ".";
  const fullDir = join(WORKSPACE, dir);
  const files = walkDir(fullDir).filter((f) => !shouldIgnore(f));

  let totalLines = 0,
    totalSize = 0;
  const byExt = {};

  for (const file of files) {
    const result = analyzeFile(file);
    if (!result.error) {
      totalLines += result.lines;
      totalSize += result.size;
      const ext = extname(file) || "no-ext";
      if (!byExt[ext]) byExt[ext] = { files: 0, lines: 0, size: 0 };
      byExt[ext].files++;
      byExt[ext].lines += result.lines;
      byExt[ext].size += result.size;
    }
  }

  console.log("📊 Statistics");
  console.log("============\n");
  console.log(`Total: ${files.length} files, ${totalLines} lines, ${formatBytes(totalSize)}\n`);
  console.log("By extension:");

  for (const [ext, data] of Object.entries(byExt).sort((a, b) => b[1].lines - a[1].lines)) {
    console.log(
      `  ${ext.padEnd(8)} ${data.files.toString().padStart(3)} files  ${data.lines.toString().padStart(6)} lines  ${formatBytes(data.size).padStart(8)}`,
    );
  }
} else {
  console.log("Usage: analyze.mjs <command>\n");
  console.log("Commands:");
  console.log("  tree [dir] [depth]  - Show directory tree (default depth: 3)");
  console.log("  deps <file>         - Show dependencies of file");
  console.log("  find <symbol> [-c]  - Find usages (use -c for case-sensitive)");
  console.log("  exports [dir]       - List all exports");
  console.log("  imports [dir]       - List external imports");
  console.log("  stats [dir]         - Show file statistics");
}
