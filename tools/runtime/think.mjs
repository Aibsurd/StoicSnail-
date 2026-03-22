#!/usr/bin/env node
/**
 * Stoic Snail Think — Structured Reasoning Framework
 *
 * Persistent thought log + structured problem decomposition.
 * Helps maintain clarity across complex multi-step tasks.
 *
 * Usage: think.mjs <command> [args]
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(__dirname, '..', '..');
const DB_PATH = join(WORKSPACE, 'data', 'snail.db');

if (!existsSync(join(WORKSPACE, 'data'))) {
  mkdirSync(join(WORKSPACE, 'data'), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_tag TEXT,
    kind TEXT NOT NULL CHECK(kind IN ('problem','hypothesis','step','observation','conclusion','blocker','question')),
    content TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    resolved INTEGER DEFAULT 0,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES thoughts(id)
  );

  CREATE TABLE IF NOT EXISTS reasoning_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','resolved','abandoned')),
    problem TEXT NOT NULL,
    conclusion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_thoughts_session ON thoughts(session_tag);
  CREATE INDEX IF NOT EXISTS idx_thoughts_kind ON thoughts(kind);
`);

const args = process.argv.slice(2);
const cmd = args[0];

function fmt(t) {
  const icons = {
    problem: '❓', hypothesis: '💭', step: '→',
    observation: '👁', conclusion: '✅', blocker: '🚧', question: '🤔'
  };
  const icon = icons[t.kind] || '•';
  const conf = t.confidence !== null ? ` [${Math.round(t.confidence * 100)}%]` : '';
  const done = t.resolved ? ' ✓' : '';
  return `#${t.id} ${icon} ${t.kind}${conf}${done}\n   ${t.content}`;
}

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(`
\x1b[1m🧠 Structured Reasoning\x1b[0m

\x1b[33mThought Commands:\x1b[0m
  \x1b[32mproblem <text>\x1b[0m       Define the problem
  \x1b[32mhypothesis <text>\x1b[0m   Add a hypothesis
  \x1b[32mstep <text>\x1b[0m         Record a reasoning step
  \x1b[32mobservation <text>\x1b[0m  Note an observation
  \x1b[32mconclusion <text>\x1b[0m  Record a conclusion
  \x1b[32mblocker <text>\x1b[0m      Mark a blocker
  \x1b[32mquestion <text>\x1b[0m     Open question

\x1b[33mView Commands:\x1b[0m
  \x1b[32mlog [n]\x1b[0m              Show last n thoughts (default: 10)
  \x1b[32mchain\x1b[0m                Show current reasoning chain
  \x1b[32mopen\x1b[0m                 Show unresolved thoughts
  \x1b[32mblockers\x1b[0m             Show all blockers
  \x1b[32msession [tag]\x1b[0m       Show thoughts for session tag

\x1b[33mManage Commands:\x1b[0m
  \x1b[32mresolve <id>\x1b[0m        Mark thought as resolved
  \x1b[32mchild <parent_id> <kind> <text>\x1b[0m  Add child thought
  \x1b[32mclear\x1b[0m                Clear all thoughts (with confirmation)
  \x1b[32msummary\x1b[0m              Print structured summary

\x1b[33mFlags:\x1b[0m
  --tag <tag>        Tag thought with session label
  --conf <0-1>       Confidence level (default: 0.5)

\x1b[33mExamples:\x1b[0m
  think.mjs problem "How to optimize search pipeline?"
  think.mjs hypothesis "SearXNG has rate limits" --conf 0.8
  think.mjs step "Checked logs: found timeout at 3s"
  think.mjs conclusion "Set timeout to 10s, add retry"
  think.mjs resolve 3
  think.mjs summary
`);
  process.exit(0);
}

// Parse flags
let tag = null;
let confidence = 0.5;
let parentId = null;
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tag' && args[i + 1]) {
    tag = args[++i];
  } else if (args[i] === '--conf' && args[i + 1]) {
    confidence = parseFloat(args[++i]);
  } else if (args[i] === '--parent' && args[i + 1]) {
    parentId = parseInt(args[++i]);
  } else {
    filteredArgs.push(args[i]);
  }
}

const [command, ...rest] = filteredArgs;
const text = rest.join(' ');

const THOUGHT_KINDS = ['problem', 'hypothesis', 'step', 'observation', 'conclusion', 'blocker', 'question'];

try {
  if (THOUGHT_KINDS.includes(command)) {
    if (!text) {
      console.error(`Usage: think.mjs ${command} <text>`);
      process.exit(1);
    }
    const result = db.prepare(`
      INSERT INTO thoughts (session_tag, kind, content, confidence, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(tag, command, text, confidence, parentId);

    const icons = {
      problem: '❓', hypothesis: '💭', step: '→',
      observation: '👁', conclusion: '✅', blocker: '🚧', question: '🤔'
    };
    console.log(`\x1b[32m✓\x1b[0m ${icons[command]} [#${result.lastInsertRowid}] ${command}: ${text}`);

  } else if (command === 'log') {
    const limit = parseInt(rest[0]) || 10;
    const rows = db.prepare(`SELECT * FROM thoughts ORDER BY id DESC LIMIT ?`).all(limit);
    if (rows.length === 0) { console.log('(no thoughts yet)'); process.exit(0); }
    console.log(`\x1b[36mLast ${rows.length} thoughts:\x1b[0m\n`);
    rows.reverse().forEach(t => console.log(fmt(t) + '\n'));

  } else if (command === 'open') {
    const rows = db.prepare(`SELECT * FROM thoughts WHERE resolved = 0 ORDER BY id`).all();
    if (rows.length === 0) { console.log('(no open thoughts)'); process.exit(0); }
    console.log(`\x1b[33m${rows.length} unresolved:\x1b[0m\n`);
    rows.forEach(t => console.log(fmt(t) + '\n'));

  } else if (command === 'blockers') {
    const rows = db.prepare(`SELECT * FROM thoughts WHERE kind = 'blocker' AND resolved = 0 ORDER BY id`).all();
    if (rows.length === 0) { console.log('\x1b[32m✓ No active blockers\x1b[0m'); process.exit(0); }
    console.log(`\x1b[31m${rows.length} active blockers:\x1b[0m\n`);
    rows.forEach(t => console.log(fmt(t) + '\n'));

  } else if (command === 'chain') {
    const rows = db.prepare(`SELECT * FROM thoughts ORDER BY id`).all();
    if (rows.length === 0) { console.log('(empty reasoning chain)'); process.exit(0); }
    console.log('\x1b[1mReasoning Chain:\x1b[0m\n');

    // Group by kind
    const groups = {};
    THOUGHT_KINDS.forEach(k => { groups[k] = []; });
    rows.forEach(t => groups[t.kind]?.push(t));

    const order = ['problem', 'question', 'hypothesis', 'step', 'observation', 'blocker', 'conclusion'];
    order.forEach(kind => {
      if (groups[kind]?.length > 0) {
        console.log(`\x1b[33m${kind.toUpperCase()}S:\x1b[0m`);
        groups[kind].forEach(t => console.log('  ' + fmt(t)));
        console.log('');
      }
    });

  } else if (command === 'session') {
    const sessionTag = rest[0];
    if (!sessionTag) {
      // List all tags
      const tags = db.prepare(`SELECT DISTINCT session_tag, COUNT(*) as cnt FROM thoughts WHERE session_tag IS NOT NULL GROUP BY session_tag`).all();
      if (tags.length === 0) { console.log('(no tagged sessions)'); process.exit(0); }
      console.log('\x1b[36mSessions:\x1b[0m');
      tags.forEach(t => console.log(`  ${t.session_tag} (${t.cnt} thoughts)`));
    } else {
      const rows = db.prepare(`SELECT * FROM thoughts WHERE session_tag = ? ORDER BY id`).all(sessionTag);
      console.log(`\x1b[36mSession: ${sessionTag}\x1b[0m (${rows.length} thoughts)\n`);
      rows.forEach(t => console.log(fmt(t) + '\n'));
    }

  } else if (command === 'resolve') {
    const id = parseInt(rest[0]);
    if (!id) { console.error('Usage: think resolve <id>'); process.exit(1); }
    const result = db.prepare(`UPDATE thoughts SET resolved = 1 WHERE id = ?`).run(id);
    if (result.changes > 0) {
      console.log(`\x1b[32m✓\x1b[0m Resolved thought #${id}`);
    } else {
      console.log(`Not found: thought #${id}`);
    }

  } else if (command === 'child') {
    const [pidStr, childKind, ...childTextParts] = rest;
    const pid = parseInt(pidStr);
    const childText = childTextParts.join(' ');
    if (!pid || !THOUGHT_KINDS.includes(childKind) || !childText) {
      console.error('Usage: think child <parent_id> <kind> <text>');
      process.exit(1);
    }
    const result = db.prepare(`
      INSERT INTO thoughts (session_tag, kind, content, confidence, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(tag, childKind, childText, confidence, pid);
    console.log(`\x1b[32m✓\x1b[0m [#${result.lastInsertRowid}] child of #${pid}: ${childText}`);

  } else if (command === 'summary') {
    const total = db.prepare(`SELECT COUNT(*) as c FROM thoughts`).get().c;
    const resolved = db.prepare(`SELECT COUNT(*) as c FROM thoughts WHERE resolved = 1`).get().c;
    const byKind = db.prepare(`SELECT kind, COUNT(*) as c, AVG(confidence) as avg_conf FROM thoughts GROUP BY kind`).all();
    const problems = db.prepare(`SELECT content FROM thoughts WHERE kind = 'problem' ORDER BY id`).all();
    const conclusions = db.prepare(`SELECT content FROM thoughts WHERE kind = 'conclusion' ORDER BY id`).all();
    const openBlockers = db.prepare(`SELECT content FROM thoughts WHERE kind = 'blocker' AND resolved = 0`).all();

    console.log('\x1b[1m📊 Reasoning Summary\x1b[0m\n');
    console.log(`Total: ${total} thoughts (${resolved} resolved, ${total - resolved} open)\n`);

    if (problems.length > 0) {
      console.log('\x1b[33mProblems:\x1b[0m');
      problems.forEach(p => console.log(`  ❓ ${p.content}`));
      console.log('');
    }

    if (conclusions.length > 0) {
      console.log('\x1b[32mConclusions:\x1b[0m');
      conclusions.forEach(c => console.log(`  ✅ ${c.content}`));
      console.log('');
    }

    if (openBlockers.length > 0) {
      console.log('\x1b[31mActive Blockers:\x1b[0m');
      openBlockers.forEach(b => console.log(`  🚧 ${b.content}`));
      console.log('');
    }

    console.log('\x1b[36mBreakdown:\x1b[0m');
    byKind.forEach(r => {
      const pct = r.c > 0 && r.avg_conf ? ` (avg conf: ${Math.round(r.avg_conf * 100)}%)` : '';
      console.log(`  ${r.kind}: ${r.c}${pct}`);
    });

  } else if (command === 'clear') {
    const count = db.prepare(`SELECT COUNT(*) as c FROM thoughts`).get().c;
    if (count === 0) { console.log('(already empty)'); process.exit(0); }
    db.prepare(`DELETE FROM thoughts`).run();
    console.log(`\x1b[32m✓\x1b[0m Cleared ${count} thoughts`);

  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "think.mjs help" for usage');
    process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  process.exit(1);
} finally {
  db.close();
}
