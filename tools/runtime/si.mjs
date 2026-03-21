#!/usr/bin/env node
/**
 * Stoic Snail Session Intelligence
 * 
 * Maintains context across sessions.
 */

import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(__dirname, '..', '..');
const DB_PATH = join(WORKSPACE, 'data', 'snail.db');

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.error('Database not available:', e.message);
  process.exit(1);
}

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT UNIQUE,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    summary TEXT,
    status TEXT DEFAULT 'active',
    tools_used TEXT,
    files_changed TEXT,
    key_decisions TEXT,
    blockers TEXT,
    next_actions TEXT
  );
  
  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    category TEXT,
    insight TEXT NOT NULL,
    importance INTEGER DEFAULT 1,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
  
  CREATE TABLE IF NOT EXISTS working_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT,
    context TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_session TEXT
  );
  
  CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );
`);

const args = process.argv.slice(2);
const cmd = args[0];

function getLastSession() {
  return db.prepare(`SELECT * FROM sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1`).get();
}

function getSessions(limit = 10) {
  return db.prepare(`SELECT * FROM sessions ORDER BY id DESC LIMIT ?`).all(limit);
}

function getInsights(limit = 20) {
  return db.prepare(`SELECT * FROM insights ORDER BY importance DESC, created_at DESC LIMIT ?`).all(limit);
}

function getContext() {
  return db.prepare(`SELECT * FROM working_context ORDER BY updated_at DESC`).all();
}

function getPatterns() {
  return db.prepare(`SELECT * FROM patterns ORDER BY frequency DESC LIMIT 20`).all();
}

function updateContext(project, context) {
  const existing = db.prepare(`SELECT * FROM working_context WHERE project = ?`).get(project);
  if (existing) {
    db.prepare(`UPDATE working_context SET context = ?, updated_at = CURRENT_TIMESTAMP WHERE project = ?`)
      .run(context, project);
  } else {
    db.prepare(`INSERT INTO working_context (project, context) VALUES (?, ?)`)
      .run(project, context);
  }
}

function addInsight(category, insight, importance = 1, tags = null) {
  const session = getLastSession();
  db.prepare(`
    INSERT INTO insights (session_id, category, insight, importance, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(session?.id || null, category, insight, importance, tags);
}

function recordPattern(pattern) {
  const existing = db.prepare(`SELECT * FROM patterns WHERE pattern = ?`).get(pattern);
  if (existing) {
    db.prepare(`UPDATE patterns SET frequency = frequency + 1, last_seen = CURRENT_TIMESTAMP WHERE pattern = ?`)
      .run(pattern);
  } else {
    db.prepare(`INSERT INTO patterns (pattern, frequency) VALUES (?, 1)`).run(pattern);
  }
}

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(`
\x1b[1m🐌 Session Intelligence\x1b[0m

Maintains context and learns across sessions.

\x1b[33mCommands:\x1b[0m
  status              Current session status
  start [project]    Start new session tracking
  end                 End current session
  summary [text]      Add session summary
  decisions [text]     Record key decisions
  blockers [text]     Record current blockers
  next [text]         Set next actions
  sessions [n]        Show last n sessions
  insights [n]        Show top insights
  context [project]    Show context for project
  set-context [proj] [text]  Set working context
  patterns            Show recurring patterns
  record [pattern]    Record a pattern occurrence
  gen                 Generate insight from patterns

\x1b[33mSession Workflow:\x1b[0m
  start <project>       Begin tracking
  ... work ...
  decisions "Made X because Y"
  next "Continue Z, start W"
  end                 Finish session
`);
  process.exit(0);
}

try {
  switch (cmd) {
    case 'status': {
      const session = getLastSession();
      if (!session) {
        console.log('No active session. Run "si start <project>" to begin.');
      } else {
        console.log(`\x1b[36mActive Session #${session.id}\x1b[0m`);
        console.log(`Started: ${session.started_at}`);
        console.log(`Status: ${session.status}`);
        if (session.summary) console.log(`Summary: ${session.summary}`);
        if (session.next_actions) console.log(`Next: ${session.next_actions}`);
        if (session.blockers) console.log(`Blockers: ${session.blockers}`);
      }
      
      const context = getContext();
      if (context.length > 0) {
        console.log('\n\x1b[33mWorking Context:\x1b[0m');
        context.forEach(c => {
          console.log(`\n\x1b[35m${c.project}:\x1b[0m`);
          console.log(`  ${c.context}`);
        });
      }
      break;
    }
    
    case 'start': {
      const project = args[1] || 'general';
      const sessionKey = `session_${Date.now()}`;
      
      db.prepare(`UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE status = 'active'`)
        .run();
      
      db.prepare(`INSERT INTO sessions (session_key, status) VALUES (?, 'active')`).run(sessionKey);
      
      updateContext(project, `Session started at ${new Date().toISOString()}`);
      
      console.log(`\x1b[32m✓\x1b[0m Started session tracking for "${project}"`);
      recordPattern(`session:${project}`);
      break;
    }
    
    case 'end': {
      const session = getLastSession();
      if (!session) {
        console.log('No active session to end.');
      } else {
        db.prepare(`UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(session.id);
        console.log(`\x1b[32m✓\x1b[0m Session #${session.id} ended`);
      }
      break;
    }
    
    case 'summary': {
      const text = args.slice(1).join(' ');
      if (!text) {
        console.error('Usage: si summary <text>');
        process.exit(1);
      }
      const session = getLastSession();
      if (session) {
        db.prepare(`UPDATE sessions SET summary = ? WHERE id = ?`).run(text, session.id);
        console.log(`\x1b[32m✓\x1b[0m Summary recorded`);
        recordPattern('session_summary');
      } else {
        console.log('No active session. Start one first.');
      }
      break;
    }
    
    case 'decisions': {
      const text = args.slice(1).join(' ');
      if (!text) {
        console.error('Usage: si decisions <text>');
        process.exit(1);
      }
      const session = getLastSession();
      if (session) {
        const existing = session.key_decisions || '';
        const updated = existing ? `${existing}\n- ${text}` : `- ${text}`;
        db.prepare(`UPDATE sessions SET key_decisions = ? WHERE id = ?`).run(updated, session.id);
        console.log(`\x1b[32m✓\x1b[0m Decision recorded`);
        addInsight('lesson', text, 2);
        recordPattern('decision');
      }
      break;
    }
    
    case 'blockers': {
      const text = args.slice(1).join(' ');
      const session = getLastSession();
      if (session) {
        db.prepare(`UPDATE sessions SET blockers = ? WHERE id = ?`).run(text, session.id);
        console.log(`\x1b[32m✓\x1b[0m Blocker recorded`);
        addInsight('blocker', text, 3);
      }
      break;
    }
    
    case 'next': {
      const text = args.slice(1).join(' ');
      const session = getLastSession();
      if (session) {
        db.prepare(`UPDATE sessions SET next_actions = ? WHERE id = ?`).run(text, session.id);
        console.log(`\x1b[32m✓\x1b[0m Next actions recorded`);
      }
      break;
    }
    
    case 'sessions': {
      const limit = parseInt(args[1]) || 10;
      const rows = getSessions(limit);
      console.log(`\x1b[36mLast ${rows.length} Sessions:\x1b[0m\n`);
      rows.forEach(s => {
        const status = s.status === 'active' ? '\x1b[32mactive\x1b[0m' : '\x1b[90mended\x1b[0m';
        console.log(`#${s.id} ${status} - ${s.started_at}`);
        if (s.summary) console.log(`  ${s.summary.slice(0, 80)}...`);
        if (s.next_actions) console.log(`  → ${s.next_actions}`);
        console.log('');
      });
      break;
    }
    
    case 'insights': {
      const limit = parseInt(args[1]) || 20;
      const rows = getInsights(limit);
      console.log(`\x1b[33mTop Insights:\x1b[0m\n`);
      rows.forEach(i => {
        console.log(`[${i.importance}] ${i.category}: ${i.insight}`);
      });
      break;
    }
    
    case 'context': {
      const project = args[1];
      if (project) {
        const ctx = db.prepare(`SELECT * FROM working_context WHERE project = ?`).get(project);
        if (ctx) {
          console.log(`\x1b[35m${ctx.project}\x1b[0m (${ctx.updated_at})`);
          console.log(ctx.context);
        } else {
          console.log(`No context for "${project}"`);
        }
      } else {
        const all = getContext();
        all.forEach(c => {
          console.log(`\x1b[35m${c.project}\x1b[0m: ${c.context.slice(0, 60)}...`);
        });
      }
      break;
    }
    
    case 'set-context': {
      const project = args[1];
      const context = args.slice(2).join(' ');
      if (!project || !context) {
        console.error('Usage: si set-context <project> <context>');
        process.exit(1);
      }
      updateContext(project, context);
      console.log(`\x1b[32m✓\x1b[0m Context updated for "${project}"`);
      break;
    }
    
    case 'patterns': {
      const rows = getPatterns();
      console.log(`\x1b[36mRecurring Patterns:\x1b[0m\n`);
      rows.forEach(p => {
        console.log(`(${p.frequency}x) ${p.pattern}`);
      });
      break;
    }
    
    case 'record': {
      const pattern = args.slice(1).join(' ');
      if (!pattern) {
        console.error('Usage: si record <pattern>');
        process.exit(1);
      }
      recordPattern(pattern);
      console.log(`\x1b[32m✓\x1b[0m Pattern recorded`);
      break;
    }
    
    case 'gen': {
      const patterns = getPatterns().filter(p => p.frequency > 1);
      if (patterns.length === 0) {
        console.log('Not enough patterns yet. Keep recording patterns.');
      } else {
        const top = patterns[0];
        console.log(`\x1b[33mGenerated Insight:\x1b[0m`);
        console.log(`Pattern "${top.pattern}" occurs ${top.frequency} times.`);
        console.log('Consider: Why does this keep happening?');
        addInsight('pattern_analysis', `${top.pattern} (${top.frequency}x)`, top.frequency);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run "si help" for usage');
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
} finally {
  if (db) db.close();
}
