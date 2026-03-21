#!/usr/bin/env node
/**
 * Stoic Snail Code Analyzer
 * Understand code structure, find usages, analyze imports
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const WORKSPACE = process.cwd();

const args = process.argv.slice(2);
const cmd = args[0];

function walkDir(dir, extensions = ['.js', '.mjs', '.ts', '.md', '.json', '.sh']) {
  const files = [];
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      const full = join(dir, item);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...walkDir(full, extensions));
      } else if (extensions.includes(extname(item))) {
        files.push(full);
      }
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
  // Also require
  const requireRe = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
  while ((match = requireRe.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return [...new Set(imports)];
}

function parseExports(content) {
  const exports = [];
  // export function/class/const
  const namedRe = /export\s+(?:function|class|const|let|var)\s+(\w+)/g;
  let match;
  while ((match = namedRe.exec(content)) !== null) {
    exports.push({ name: match[1], type: 'named' });
  }
  // export default
  const defaultRe = /export\s+default\s+(\w+|class|\w+\s+class)/g;
  while ((match = defaultRe.exec(content)) !== null) {
    exports.push({ name: match[1] || 'default', type: 'default' });
  }
  return exports;
}

function findUsages(files, symbol) {
  const usages = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Skip comments and strings roughly
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        if (line.includes(`'${symbol}'`) || line.includes(`"${symbol}"`)) return;
        if (line.includes(symbol)) {
          usages.push({ file, line: i + 1, content: line.trim().slice(0, 100) });
        }
      });
    } catch (e) {}
  }
  return usages;
}

function analyzeFile(file) {
  try {
    const content = readFileSync(file, 'utf-8');
    const imports = parseImports(content);
    const exports = parseExports(content);
    return { file, imports, exports, lines: content.split('\n').length };
  } catch (e) {
    return { file, error: e.message };
  }
}

console.log('🐌 Code Analyzer');
console.log('================\n');

if (cmd === 'tree') {
  const dir = args[1] || '.';
  const fullDir = join(WORKSPACE, dir);
  console.log(`Directory tree: ${fullDir}\n`);
  
  function printTree(dir, prefix = '', isLast = true) {
    const items = readdirSync(dir)
      .filter(f => !f.startsWith('.') && f !== 'node_modules')
      .sort();
    
    items.forEach((item, i) => {
      const full = join(dir, item);
      const stat = statSync(full);
      const isLastItem = i === items.length - 1;
      const connector = isLastItem ? '└── ' : '├── ';
      const isDir = stat.isDirectory();
      console.log(`${prefix}${connector}${item}${isDir ? '/' : ''}`);
      if (isDir) {
        printTree(full, prefix + (isLastItem ? '    ' : '│   '), isLastItem);
      }
    });
  }
  printTree(fullDir);
}

else if (cmd === 'deps') {
  const file = args[1];
  if (!file) {
    console.log('Usage: analyze.mjs deps <file>');
    process.exit(1);
  }
  const full = join(WORKSPACE, file);
  const result = analyzeFile(full);
  console.log(`File: ${file}`);
  console.log(`Lines: ${result.lines}`);
  console.log('\nImports:');
  result.imports.forEach(i => console.log(`  - ${i}`));
  console.log('\nExports:');
  result.exports.forEach(e => console.log(`  - ${e.name} (${e.type})`));
}

else if (cmd === 'find') {
  const symbol = args[1];
  if (!symbol) {
    console.log('Usage: analyze.mjs find <symbol>');
    process.exit(1);
  }
  const files = walkDir(WORKSPACE);
  console.log(`Searching for "${symbol}" in ${files.length} files...\n`);
  const usages = findUsages(files, symbol);
  if (usages.length === 0) {
    console.log('No usages found');
  } else {
    console.log(`Found ${usages.length} usages:\n`);
    usages.forEach(u => {
      console.log(`${u.file}:${u.line}`);
      console.log(`  ${u.content}`);
    });
  }
}

else if (cmd === 'exports') {
  const dir = args[1] || '.';
  const fullDir = join(WORKSPACE, dir);
  const files = walkDir(fullDir);
  console.log(`Analyzing ${files.length} files...\n`);
  
  const allExports = {};
  for (const file of files) {
    const result = analyzeFile(file);
    if (result.exports) {
      for (const exp of result.exports) {
        if (!allExports[exp.name]) {
          allExports[exp.name] = [];
        }
        allExports[exp.name].push({ file, type: exp.type });
      }
    }
  }
  
  console.log('All exports:\n');
  for (const [name, locs] of Object.entries(allExports).sort()) {
    console.log(`${name}:`);
    locs.forEach(l => console.log(`  - ${l.file} (${l.type})`));
  }
}

else if (cmd === 'imports') {
  const dir = args[1] || '.';
  const fullDir = join(WORKSPACE, dir);
  const files = walkDir(fullDir);
  
  const allImports = {};
  for (const file of files) {
    const result = analyzeFile(file);
    if (result.imports) {
      for (const imp of result.imports) {
        if (!imp.startsWith('.')) { // skip relative imports
          if (!allImports[imp]) allImports[imp] = [];
          allImports[imp].push(file);
        }
      }
    }
  }
  
  console.log('External imports:\n');
  for (const [mod, files] of Object.entries(allImports).sort()) {
    console.log(`${mod}:`);
    files.forEach(f => console.log(`  - ${f}`));
  }
}

else {
  console.log('Usage: analyze.mjs <command>\n');
  console.log('Commands:');
  console.log('  tree       - Show directory tree');
  console.log('  deps <f>   - Show dependencies of file');
  console.log('  find <sym> - Find usages of symbol');
  console.log('  exports    - List all exports in directory');
  console.log('  imports    - List all external imports');
}
