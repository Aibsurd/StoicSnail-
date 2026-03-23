#!/usr/bin/env node
/**
 * Stoic Snail SQLite Database
 * Persistent structured data storage with SQL queries
 *
 * Database file: ~/.openclaw/workspace/data/snail.db
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database location: workspace/data/snail.db
// tools/runtime is 2 levels deep in workspace
const WORKSPACE = join(__dirname, "..", "..");
const DB_PATH = join(WORKSPACE, "data", "snail.db");
const DB_DIR = join(WORKSPACE, "data");

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

const args = process.argv.slice(2);
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Initialize schema if needed
db.exec(`
  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
  
  CREATE TABLE IF NOT EXISTS research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    summary TEXT,
    data TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    category TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
`);

function output(rows, format = "pretty") {
  if (!rows || rows.length === 0) {
    console.log("(empty result)");
    return;
  }

  if (format === "json") {
    console.log(JSON.stringify(rows, null, 2));
  } else if (format === "table") {
    const keys = Object.keys(rows[0]);
    const widths = keys.map((k) =>
      Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)),
    );

    console.log(keys.map((k, i) => k.padEnd(widths[i])).join(" │ "));
    console.log(widths.map((w) => "─".repeat(w)).join("─┼─"));

    rows.forEach((row) => {
      console.log(keys.map((k, i) => String(row[k] ?? "").padEnd(widths[i])).join(" │ "));
    });
  } else if (format === "line") {
    rows.forEach((row) => {
      const str =
        typeof row === "object"
          ? Object.entries(row)
              .map(([k, v]) => `${k}=${v}`)
              .join(" ")
          : String(row);
      console.log(str);
    });
  } else {
    // pretty with row count
    console.log(`\x1b[36m${rows.length} row(s)\x1b[0m`);
    console.log(JSON.stringify(rows, null, 2));
  }
}

// Parse command
const cmd = args[0];

if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(`
\x1b[1m🐌 SQLite Database\x1b[0m

Database: ${DB_PATH}

\x1b[33mCommands:\x1b[0m
  \x1b[32mquery <sql>\x1b[0m          Execute SQL query
  \x1b[32mset <key> <value>\x1b[0m   Store key-value pair
  \x1b[32mget <key>\x1b[0m           Get value by key
  \x1b[32mdel <key>\x1b[0m           Delete by key
  \x1b[32mlist [table]\x1b[0m        List rows from table
  \x1b[32mschema [table]\x1b[0m       Show table schema
  \x1b[32mtables\x1b[0m               List all tables
  \x1b[32mbackup <file>\x1b[0m       Export database to SQL file

\x1b[33mOutput formats:\x1b[0m
  --json    JSON output
  --table   Formatted table (default)
  --line    One line per row

\x1b[33mExamples:\x1b[0m
  \x1b[36mquery\x1b[0m SELECT * FROM memory LIMIT 10
  \x1b[36mset\x1b[0m user.preferences '{"theme":"dark"}'
  \x1b[36mset\x1b[0m project.argo 'active project'
  \x1b[36mget\x1b[0m user.preferences
  \x1b[36mlist\x1b[0m memory
  \x1b[36mlist\x1b[0m tasks --json
  \x1b[36mschema\x1b[0m memory
  
\x1b[33mTables:\x1b[0m
  memory    - Key-value store
  projects  - Projects with status/priority
  tasks     - Tasks linked to projects
  research  - Research topics and data
  notes     - General notes
`);
  process.exit(0);
}

let format = "table";
const filteredArgs = args.filter((a) => {
  if (a === "--json") {
    format = "json";
    return false;
  }
  if (a === "--table") {
    format = "table";
    return false;
  }
  if (a === "--line") {
    format = "line";
    return false;
  }
  return true;
});

const [command, ...rest] = filteredArgs;

try {
  switch (command) {
    case "query":
    case "q": {
      const sql = rest.join(" ");
      if (!sql) {
        console.error("Usage: db query <sql>");
        process.exit(1);
      }
      const start = Date.now();
      const stmt = db.prepare(sql);
      const isSelect = sql.trim().toLowerCase().startsWith("select");

      if (isSelect) {
        const rows = stmt.all();
        console.log(`\x1b[90mQuery executed in ${Date.now() - start}ms\x1b[0m`);
        output(rows, format);
      } else {
        const result = stmt.run();
        console.log(`\x1b[32mOK\x1b[0m - ${result.changes} row(s) affected`);
      }
      break;
    }

    case "set": {
      const [key, ...valueParts] = rest;
      const value = valueParts.join(" ");
      if (!key || value === undefined) {
        console.error("Usage: db set <key> <value>");
        process.exit(1);
      }

      // Determine type
      let type = "text";
      let finalValue = value;
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object") {
          finalValue = JSON.stringify(parsed);
          type = "json";
        } else {
          type = typeof parsed;
        }
      } catch {}

      const stmt = db.prepare(`
        INSERT INTO memory (key, value, type, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, type = ?, updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, finalValue, type, finalValue, type);
      console.log(`\x1b[32m✓\x1b[0m Set ${key}`);
      break;
    }

    case "get": {
      const [key] = rest;
      if (!key) {
        console.error("Usage: db get <key>");
        process.exit(1);
      }
      const stmt = db.prepare("SELECT * FROM memory WHERE key = ?");
      const row = stmt.get(key);
      if (!row) {
        console.log("(not found)");
      } else {
        if (row.type === "json") {
          console.log(JSON.stringify(JSON.parse(row.value), null, 2));
        } else {
          console.log(row.value);
        }
      }
      break;
    }

    case "del":
    case "delete": {
      const [key] = rest;
      if (!key) {
        console.error("Usage: db del <key>");
        process.exit(1);
      }
      const stmt = db.prepare("DELETE FROM memory WHERE key = ?");
      const result = stmt.run(key);
      console.log(`\x1b[32m✓\x1b[0m Deleted ${result.changes} row(s)`);
      break;
    }

    case "list":
    case "ls": {
      let [table] = rest;
      if (!table) table = "memory";

      const allowedTables = ["memory", "projects", "tasks", "research", "notes"];
      if (!allowedTables.includes(table)) {
        console.error(`Unknown table: ${table}`);
        console.log(`Available: ${allowedTables.join(", ")}`);
        process.exit(1);
      }

      const stmt = db.prepare(`SELECT * FROM ${table} LIMIT 100`);
      const rows = stmt.all();
      console.log(`\x1b[36m${table}\x1b[0m (${rows.length} rows)`);
      output(rows, format);
      break;
    }

    case "schema": {
      let [table] = rest;
      if (!table) {
        // Show all tables
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log("\x1b[36mTables:\x1b[0m");
        tables.forEach((t) => console.log(`  - ${t.name}`));
        break;
      }

      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      console.log(`\x1b[36mSchema: ${table}\x1b[0m\n`);
      info.forEach((col) => {
        const pk = col.pk ? " (PK)" : "";
        const notnull = col.notnull ? " NOT NULL" : "";
        console.log(`  ${col.name}: ${col.type}${notnull}${pk}`);
      });
      break;
    }

    case "tables":
    case ".tables": {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      console.log("\x1b[36mTables:\x1b[0m");
      tables.forEach((t) => {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
        console.log(`  ${t.name} (${count.c} rows)`);
      });
      break;
    }

    case "backup": {
      const [file] = rest;
      if (!file) {
        console.error("Usage: db backup <file>");
        process.exit(1);
      }
      const backup = db.backup(file);
      console.log(`\x1b[32m✓\x1b[0m Backup saved to ${file}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "db help" for usage');
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  process.exit(1);
} finally {
  db.close();
}
