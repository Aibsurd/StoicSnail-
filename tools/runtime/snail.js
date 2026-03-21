#!/usr/bin/env node
/**
 * Stoic Snail Tools Launcher
 * Access all custom tools from one entry point
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS = {
  fetch: {
    desc: 'HTTP client with JSON support',
    usage: 'snail fetch <url> [-X METHOD] [-H "Header: val"] [-d DATA] [-j]',
    run: () => spawn('node', [join(__dirname, 'fetch.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' })
  },
  scrape: {
    desc: 'Web scraper using CSS selectors',
    usage: 'snail scrape <url|file> <selector> [attr]',
    run: () => spawn('node', [join(__dirname, 'scrape.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' })
  },
  analyze: {
    desc: 'Code structure analyzer',
    usage: 'snail analyze <command> [args]',
    commands: ['tree', 'deps <f>', 'find <sym>', 'exports', 'imports'],
    run: () => spawn('node', [join(__dirname, 'analyze.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' })
  },
  diff: {
    desc: 'Compare files or strings',
    usage: 'snail diff <fileA> [fileB] | -i <strA> <strB>',
    run: () => spawn('node', [join(__dirname, 'diff.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' })
  },
  repl: {
    desc: 'Interactive Node.js REPL with workspace access',
    usage: 'snail repl',
    run: () => spawn('node', [join(__dirname, 'repl.mjs')], { stdio: 'inherit' })
  },
  pipe: {
    desc: 'Data pipeline: transform JSON/data with chainable ops',
    usage: 'snail pipe <source> [transforms...] [--output]',
    run: () => spawn('node', [join(__dirname, 'pipe.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' })
  }
};

const tool = process.argv[2];

if (!tool || tool === 'help' || tool === '--help' || tool === '-h') {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       🐌 Stoic Snail Tools v1.0                        ║');
  console.log('║       PhD-level engineering environment               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Usage: snail <tool> [args...]');
  console.log('');
  console.log('Tools:');
  for (const [name, t] of Object.entries(TOOLS)) {
    console.log(`  ${name.padEnd(10)} ${t.desc}`);
    if (t.commands) {
      t.commands.forEach(c => console.log(`              - ${c}`));
    }
  }
  console.log('');
  console.log('Examples:');
  console.log('  snail fetch https://api.github.com -j');
  console.log('  snail scrape https://example.com h1');
  console.log('  snail analyze tree');
  console.log('  snail analyze find "functionName"');
  console.log('  snail diff file1.js file2.js');
  console.log('  snail diff -i "old" "new"');
  console.log('  snail pipe @json:\'[1,2,3]\' .sum');
  console.log('  snail repl');
  process.exit(0);
}

const selected = TOOLS[tool];
if (!selected) {
  console.error(`Unknown tool: ${tool}`);
  console.error(`Run 'snail help' for available tools`);
  process.exit(1);
}

selected.run();
