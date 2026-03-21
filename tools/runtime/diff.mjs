#!/usr/bin/env node
/**
 * Stoic Snail Diff Tool
 * Compare files, strings, show differences
 */

import { readFileSync } from 'fs';

const args = process.argv.slice(2);

function diffLines(a, b) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const result = { added: [], removed: [], unchanged: [] };
  
  // Simple line-by-line diff using LCS concept
  // For more complex needs, would use proper diff algorithm
  let i = 0, j = 0;
  
  while (i < linesA.length || j < linesB.length) {
    if (i >= linesA.length) {
      result.added.push({ line: j + 1, content: linesB[j] });
      j++;
    } else if (j >= linesB.length) {
      result.removed.push({ line: i + 1, content: linesA[i] });
      i++;
    } else if (linesA[i] === linesB[j]) {
      result.unchanged.push({ line: i + 1, content: linesA[i] });
      i++; j++;
    } else {
      // Look ahead to see if it's an add or remove
      const aheadA = linesA.slice(i).indexOf(linesB[j]);
      const aheadB = linesB.slice(j).indexOf(linesA[i]);
      
      if (aheadA === -1 && aheadB === -1) {
        // Lines are different and don't exist ahead either - replace
        result.removed.push({ line: i + 1, content: linesA[i] });
        result.added.push({ line: j + 1, content: linesB[j] });
        i++; j++;
      } else if (aheadA === -1 || (aheadB !== -1 && aheadB < aheadA)) {
        // B exists ahead without A - it's an add
        result.added.push({ line: j + 1, content: linesB[j] });
        j++;
      } else {
        // A exists ahead without B - it's a remove
        result.removed.push({ line: i + 1, content: linesA[i] });
        i++;
      }
    }
  }
  
  return result;
}

function formatDiff(diff, context = 3) {
  let output = '';
  
  // Show unchanged context
  const contextLines = [];
  let inContext = false;
  
  for (const change of [...diff.removed, ...diff.added].sort((a, b) => a.line - b.line)) {
    // simplified context display
  }
  
  // Basic diff format
  for (const r of diff.removed) {
    output += `\x1b[31m-${r.content}\x1b[0m`;
  }
  for (const a of diff.added) {
    output += `\x1b[32m+${a.content}\x1b[0m`;
  }
  for (const u of diff.unchanged) {
    output += ` ${u.content}`;
  }
  
  return output;
}

function sideBySide(a, b, width = 80) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const maxLen = Math.max(linesA.length, linesB.length);
  let output = '';
  
  const halfWidth = Math.floor((width - 4) / 2);
  
  output += '┌' + '─'.repeat(halfWidth) + '┬' + '─'.repeat(halfWidth) + '┐\n';
  
  for (let i = 0; i < maxLen; i++) {
    const left = (linesA[i] || '').slice(0, halfWidth).padEnd(halfWidth);
    const right = (linesB[i] || '').slice(0, halfWidth).padEnd(halfWidth);
    const marker = linesA[i] === linesB[i] ? ' ' : '│';
    output += `│${left}${marker}${right}│\n`;
  }
  
  output += '└' + '─'.repeat(halfWidth) + '┴' + '─'.repeat(halfWidth) + '┘';
  
  return output;
}

// Parse arguments
let fileA = null, fileB = null, inlineA = null, inlineB = null;
let sideBySideMode = false;
let unifiedMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-s' || arg === '--side-by-side') {
    sideBySideMode = true;
  } else if (arg === '-u' || arg === '--unified') {
    unifiedMode = true;
  } else if (arg === '-i' || arg === '--inline') {
    inlineA = args[++i];
    inlineB = args[++i];
  } else if (!fileA) {
    fileA = arg;
  } else if (!fileB) {
    fileB = arg;
  }
}

if (!fileA && !inlineA) {
  console.log('Usage: diff.mjs [options] <fileA> [fileB]');
  console.log('       diff.mjs -i <stringA> <stringB>');
  console.log('');
  console.log('Options:');
  console.log('  -s, --side-by-side    Side-by-side diff');
  console.log('  -u, --unified         Unified diff format');
  console.log('  -i, --inline A B      Inline diff with strings');
  process.exit(1);
}

let contentA, contentB;

if (inlineA !== null && inlineB !== null) {
  contentA = inlineA;
  contentB = inlineB;
} else {
  try {
    contentA = readFileSync(fileA, 'utf-8');
    contentB = fileB ? readFileSync(fileB, 'utf-8') : '';
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

const diff = diffLines(contentA, contentB);

console.log('📊 Diff Summary');
console.log('===============');
console.log(`Added:   ${diff.added.length} lines`);
console.log(`Removed: ${diff.removed.length} lines`);
console.log(`Same:    ${diff.unchanged.length} lines`);
console.log('');

if (sideBySideMode) {
  console.log(sideBySide(contentA, contentB));
} else if (unifiedMode) {
  // Unified format
  console.log('--- ' + (fileA || 'A'));
  console.log('+++ ' + (fileB || 'B'));
  
  for (const r of diff.removed) {
    console.log(`-${r.line}: ${r.content}`);
  }
  for (const a of diff.added) {
    console.log(`+${a.line}: ${a.content}`);
  }
} else {
  // Colorized output
  if (diff.removed.length > 0) {
    console.log('\x1b[31m--- Removed (' + diff.removed.length + ' lines) ---\x1b[0m');
    diff.removed.slice(0, 20).forEach(r => {
      console.log(`\x1b[31m-${r.line}: ${r.content}\x1b[0m`);
    });
    if (diff.removed.length > 20) console.log(`  ... and ${diff.removed.length - 20} more`);
  }
  
  if (diff.added.length > 0) {
    console.log('\x1b[32m--- Added (' + diff.added.length + ' lines) ---\x1b[0m');
    diff.added.slice(0, 20).forEach(a => {
      console.log(`\x1b[32m+${a.line}: ${a.content}\x1b[0m`);
    });
    if (diff.added.length > 20) console.log(`  ... and ${diff.added.length - 20} more`);
  }
  
  if (diff.added.length === 0 && diff.removed.length === 0) {
    console.log('✓ Files are identical');
  }
}
