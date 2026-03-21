#!/usr/bin/env node
/**
 * Stoic Snail Scratch Pad
 * Quick notes, drafts, temporary data - survives between sessions
 * 
 * Think of it as a persistent clipboard or a notepad for ideas
 * that aren't ready for files yet.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Scratch file: workspace/data/scratch.json
const WORKSPACE = join(__dirname, '..', '..');
const SCRATCH_FILE = join(WORKSPACE, 'data', 'scratch.json');

const args = process.argv.slice(2);

// Ensure scratch file exists
const dir = dirname(SCRATCH_FILE);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}
if (!existsSync(SCRATCH_FILE)) {
  writeFileSync(SCRATCH_FILE, JSON.stringify({ notes: [], last: null }, null, 2));
}

function load() {
  try {
    return JSON.parse(readFileSync(SCRATCH_FILE, 'utf-8'));
  } catch {
    return { notes: [], last: null };
  }
}

function save(data) {
  writeFileSync(SCRATCH_FILE, JSON.stringify(data, null, 2));
}

const cmd = args[0];

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(`
\x1b[1m🐌 Scratch Pad\x1b[0m

A persistent notepad for quick notes and drafts.

\x1b[33mCommands:\x1b[0
  \x1b[32madd <text>\x1b[0m          Add a note (use quotes for multi-word)
  \x1b[32mlist\x1b[0m                Show all notes
  \x1b[32mshow [n]\x1b[0m            Show note n (or last)
  \x1b[32medit [n] <text>\x1b[0m    Edit note n
  \x1b[32mdel [n]\x1b[0m             Delete note n (or last)
  \x1b[32mclear\x1b[0m               Clear all notes
  \x1b[32mlast\x1b[0m               Show/get last note
  \x1b[32mpush <text>\x1b[0m        Add and mark as last
  \x1b[32mgrep <pattern>\x1b[0m     Search notes
  \x1b[32mtag <n> <tag>\x1b[0m      Tag note n
  \x1b[32mby-tag <tag>\x1b[0m       Find notes by tag

\x1b[33mExamples:\x1b[0m
  \x1b[36madd\x1b[0m "Remember to check the logs"
  \x1b[36madd\x1b[0m '{"todo":"fix bug","priority":1}'
  \x1b[36mlist\x1b[0m
  \x1b[36mshow 3\x1b[0m
  \x1b[36medit 2 "new content"\x1b[0m
  \x1b[36mdel 1\x1b[0m
  \x1b[36mgrep\x1b[0m "TODO"
  \x1b[36mtag\x1b[0m 3 important
  \x1b[36mby-tag\x1b[0m bug

\x1b[33mFormat:\x1b[0m
  Notes are stored as: { id, text, tags[], created, updated, last }
`);
  process.exit(0);
}

const data = load();
const now = new Date().toISOString();

switch (cmd) {
  case 'add':
  case 'push': {
    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Usage: scratch add <text>');
      process.exit(1);
    }
    const note = {
      id: (data.notes.length > 0 ? Math.max(...data.notes.map(n => n.id)) : 0) + 1,
      text,
      tags: [],
      created: now,
      updated: now,
      last: true
    };
    // Clear last flag from previous
    data.notes.forEach(n => n.last = false);
    data.notes.push(note);
    data.last = note.id;
    save(data);
    console.log(`\x1b[32m✓\x1b[0m Added note #${note.id}`);
    break;
  }
  
  case 'list': {
    if (data.notes.length === 0) {
      console.log('(no notes)');
    } else {
      console.log(`\x1b[36m${data.notes.length} note(s)\x1b[0m\n`);
      data.notes.forEach(n => {
        const marker = n.last ? ' →' : '  ';
        const tags = n.tags.length ? ` [${n.tags.join(', ')}]` : '';
        const preview = n.text.length > 60 ? n.text.slice(0, 60) + '...' : n.text;
        console.log(`${marker} #${n.id}: ${preview}${tags}`);
      });
    }
    break;
  }
  
  case 'show': {
    let idx = args[1] ? parseInt(args[1]) : data.last;
    if (!idx) {
      console.log('(no last note)');
      break;
    }
    const note = data.notes.find(n => n.id === idx);
    if (!note) {
      console.log(`Note #${idx} not found`);
    } else {
      console.log(`\x1b[1m#${note.id}\x1b[0m ${note.created}`);
      if (note.tags.length) console.log(`Tags: ${note.tags.join(', ')}`);
      console.log('');
      console.log(note.text);
    }
    break;
  }
  
  case 'last': {
    if (!data.last) {
      console.log('(no last note)');
      break;
    }
    const note = data.notes.find(n => n.id === data.last);
    if (note) {
      console.log(note.text);
    }
    break;
  }
  
  case 'edit': {
    const idx = parseInt(args[1]);
    const text = args.slice(2).join(' ');
    if (!idx || !text) {
      console.error('Usage: scratch edit [n] <text>');
      process.exit(1);
    }
    const note = data.notes.find(n => n.id === idx);
    if (!note) {
      console.log(`Note #${idx} not found`);
    } else {
      note.text = text;
      note.updated = now;
      save(data);
      console.log(`\x1b[32m✓\x1b[0m Updated note #${idx}`);
    }
    break;
  }
  
  case 'del':
  case 'delete': {
    let idx = args[1] ? parseInt(args[1]) : data.last;
    if (!idx) {
      console.error('No note specified and no last note');
      process.exit(1);
    }
    const before = data.notes.length;
    data.notes = data.notes.filter(n => n.id !== idx);
    if (data.notes.length < before) {
      if (data.last === idx) data.last = data.notes[data.notes.length - 1]?.id || null;
      save(data);
      console.log(`\x1b[32m✓\x1b[0m Deleted note #${idx}`);
    } else {
      console.log(`Note #${idx} not found`);
    }
    break;
  }
  
  case 'clear': {
    data.notes = [];
    data.last = null;
    save(data);
    console.log('\x1b[32m✓\x1b[0m All notes cleared');
    break;
  }
  
  case 'grep': {
    const pattern = args.slice(1).join(' ').toLowerCase();
    if (!pattern) {
      console.error('Usage: scratch grep <pattern>');
      process.exit(1);
    }
    const found = data.notes.filter(n => n.text.toLowerCase().includes(pattern));
    if (found.length === 0) {
      console.log(`No notes matching "${pattern}"`);
    } else {
      console.log(`\x1b[36m${found.length} match(es)\x1b[0m for "${pattern}":\n`);
      found.forEach(n => {
        const line = n.text.length > 80 ? n.text.slice(0, 80) + '...' : n.text;
        console.log(`  #${n.id}: ${line}`);
      });
    }
    break;
  }
  
  case 'tag': {
    const idx = parseInt(args[1]);
    const tag = args.slice(2).join(' ');
    if (!idx || !tag) {
      console.error('Usage: scratch tag [n] <tag>');
      process.exit(1);
    }
    const note = data.notes.find(n => n.id === idx);
    if (!note) {
      console.log(`Note #${idx} not found`);
    } else {
      if (!note.tags.includes(tag)) {
        note.tags.push(tag);
        note.updated = now;
        save(data);
      }
      console.log(`\x1b[32m✓\x1b[0m Tagged #${idx} with "${tag}"`);
    }
    break;
  }
  
  case 'by-tag': {
    const tag = args.slice(1).join(' ');
    if (!tag) {
      console.error('Usage: scratch by-tag <tag>');
      process.exit(1);
    }
    const found = data.notes.filter(n => n.tags.includes(tag));
    if (found.length === 0) {
      console.log(`No notes tagged "${tag}"`);
    } else {
      console.log(`\x1b[36m${found.length} note(s)\x1b[0m tagged "${tag}":\n`);
      found.forEach(n => {
        console.log(`  #${n.id}: ${n.text.slice(0, 60)}${n.text.length > 60 ? '...' : ''}`);
      });
    }
    break;
  }
  
  default:
    console.error(`Unknown command: ${cmd}`);
    console.log('Run "scratch help" for usage');
    process.exit(1);
}
