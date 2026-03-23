#!/usr/bin/env node
/**
 * Stoic Snail Agenda — Task & Project Manager
 *
 * Unified interface for managing tasks, projects, and priorities.
 * Backed by SQLite (snail.db) for persistence across sessions.
 *
 * Usage: agenda.mjs <command> [args]
 */

import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(__dirname, "..", "..");
const DB_PATH = join(WORKSPACE, "data", "snail.db");

if (!existsSync(join(WORKSPACE, "data"))) {
  mkdirSync(join(WORKSPACE, "data"), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Ensure agenda tables exist (extends existing db schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS agenda_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    project TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo','doing','done','blocked','cancelled')),
    priority INTEGER DEFAULT 2 CHECK(priority BETWEEN 1 AND 5),
    tags TEXT,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS agenda_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','done','cancelled')),
    goal TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_agenda_tasks_status ON agenda_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_agenda_tasks_project ON agenda_tasks(project);
  CREATE INDEX IF NOT EXISTS idx_agenda_tasks_priority ON agenda_tasks(priority DESC);
`);

const args = process.argv.slice(2);
const cmd = args[0];

const PRIORITY_LABEL = { 1: "low", 2: "normal", 3: "high", 4: "urgent", 5: "critical" };
const PRIORITY_COLOR = { 1: "\x1b[90m", 2: "", 3: "\x1b[33m", 4: "\x1b[31m", 5: "\x1b[35m" };
const STATUS_ICON = { todo: "○", doing: "◉", done: "✓", blocked: "✗", cancelled: "—" };
const STATUS_COLOR = {
  todo: "",
  doing: "\x1b[36m",
  done: "\x1b[32m",
  blocked: "\x1b[31m",
  cancelled: "\x1b[90m",
};

function fmtTask(t, compact = false) {
  const pc = PRIORITY_COLOR[t.priority] || "";
  const sc = STATUS_COLOR[t.status] || "";
  const reset = "\x1b[0m";
  const icon = STATUS_ICON[t.status] || "•";
  const pLabel = PRIORITY_LABEL[t.priority] || "";
  const proj = t.project ? `\x1b[90m[${t.project}]\x1b[0m ` : "";
  const due = t.due_date ? ` \x1b[90mdue:${t.due_date}\x1b[0m` : "";
  const tags = t.tags ? ` \x1b[90m#${t.tags.split(",").join(" #")}\x1b[0m` : "";

  if (compact) {
    return `${sc}${icon}${reset} #${t.id} ${proj}${t.title}${due}${tags}`;
  }
  return `${sc}${icon} #${t.id}${reset} ${proj}\x1b[1m${t.title}\x1b[0m  ${pc}[${pLabel}]${reset}${due}${tags}`;
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

if (!cmd || cmd === "help" || cmd === "--help") {
  console.log(`
\x1b[1m📋 Agenda — Task & Project Manager\x1b[0m

\x1b[33mTask Commands:\x1b[0m
  \x1b[32madd <title>\x1b[0m                 Add a task
  \x1b[32mdone <id>\x1b[0m                   Mark done
  \x1b[32mstart <id>\x1b[0m                  Start working on it
  \x1b[32mblock <id> [reason]\x1b[0m         Mark as blocked
  \x1b[32mcancel <id>\x1b[0m                 Cancel task
  \x1b[32medit <id> [--title] [--desc] [--proj] [--priority] [--due] [--tags]\x1b[0m
  \x1b[32mdel <id>\x1b[0m                    Delete task

\x1b[33mView Commands:\x1b[0m
  \x1b[32mlist [--status todo|doing|done|blocked] [--proj <name>] [--priority <1-5>]\x1b[0m
  \x1b[32mnext\x1b[0m                        Next high-priority task to work on
  \x1b[32mdoing\x1b[0m                       What's in progress
  \x1b[32mblocked\x1b[0m                     Show blocked tasks
  \x1b[32mshow <id>\x1b[0m                   Show task details
  \x1b[32mstats\x1b[0m                       Overview statistics

\x1b[33mProject Commands:\x1b[0m
  \x1b[32mproject add <name> [--goal text]\x1b[0m
  \x1b[32mproject list\x1b[0m
  \x1b[32mproject done <name>\x1b[0m
  \x1b[32mproject show <name>\x1b[0m

\x1b[33mFlags for add/edit:\x1b[0m
  --proj <project>   Assign to project
  --priority <1-5>   1=low 2=normal 3=high 4=urgent 5=critical
  --due <YYYY-MM-DD> Due date
  --tags <a,b,c>     Comma-separated tags
  --desc <text>      Description

\x1b[33mExamples:\x1b[0m
  \x1b[36madd\x1b[0m "Fix fetch_content stub" --proj research-pipe --priority 3
  \x1b[36mstart\x1b[0m 5
  \x1b[36mdone\x1b[0m 5
  \x1b[36mlist\x1b[0m --status doing
  \x1b[36mnext\x1b[0m
  \x1b[36mstats\x1b[0m
`);
  process.exit(0);
}

// Parse flags
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--") && args[i + 1] && !args[i + 1].startsWith("--")) {
    flags[a.slice(2)] = args[++i];
  } else if (a.startsWith("--")) {
    flags[a.slice(2)] = true;
  } else {
    positional.push(a);
  }
}

const [command, ...rest] = positional;

try {
  switch (command) {
    case "add": {
      const title = rest.join(" ");
      if (!title) {
        console.error("Usage: agenda add <title> [flags]");
        process.exit(1);
      }
      const priority = parseInt(flags.priority) || 2;
      const result = db
        .prepare(`
        INSERT INTO agenda_tasks (title, description, project, priority, tags, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .run(
          title,
          flags.desc || null,
          flags.proj || null,
          priority,
          flags.tags || null,
          flags.due || null,
        );
      console.log(`\x1b[32m✓\x1b[0m Added task #${result.lastInsertRowid}: ${title}`);
      break;
    }

    case "done": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda done <id>");
        process.exit(1);
      }
      const r = db
        .prepare(`UPDATE agenda_tasks SET status='done', completed_at=?, updated_at=? WHERE id=?`)
        .run(now(), now(), id);
      if (r.changes > 0) console.log(`\x1b[32m✓\x1b[0m Task #${id} done`);
      else console.log(`Not found: #${id}`);
      break;
    }

    case "start": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda start <id>");
        process.exit(1);
      }
      const r = db
        .prepare(`UPDATE agenda_tasks SET status='doing', updated_at=? WHERE id=?`)
        .run(now(), id);
      if (r.changes > 0) console.log(`\x1b[36m◉\x1b[0m Task #${id} in progress`);
      else console.log(`Not found: #${id}`);
      break;
    }

    case "block": {
      const id = parseInt(rest[0]);
      const reason = rest.slice(1).join(" ");
      if (!id) {
        console.error("Usage: agenda block <id> [reason]");
        process.exit(1);
      }
      const task = db.prepare(`SELECT * FROM agenda_tasks WHERE id=?`).get(id);
      if (!task) {
        console.log(`Not found: #${id}`);
        break;
      }
      const desc = reason ? `[BLOCKED: ${reason}] ${task.description || ""}` : task.description;
      db.prepare(
        `UPDATE agenda_tasks SET status='blocked', description=?, updated_at=? WHERE id=?`,
      ).run(desc, now(), id);
      console.log(`\x1b[31m✗\x1b[0m Task #${id} blocked${reason ? ": " + reason : ""}`);
      break;
    }

    case "cancel": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda cancel <id>");
        process.exit(1);
      }
      const r = db
        .prepare(`UPDATE agenda_tasks SET status='cancelled', updated_at=? WHERE id=?`)
        .run(now(), id);
      if (r.changes > 0) console.log(`\x1b[90m—\x1b[0m Task #${id} cancelled`);
      else console.log(`Not found: #${id}`);
      break;
    }

    case "del":
    case "delete": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda del <id>");
        process.exit(1);
      }
      const r = db.prepare(`DELETE FROM agenda_tasks WHERE id=?`).run(id);
      if (r.changes > 0) console.log(`\x1b[32m✓\x1b[0m Deleted #${id}`);
      else console.log(`Not found: #${id}`);
      break;
    }

    case "edit": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda edit <id> [--title x] [--desc x] ...");
        process.exit(1);
      }
      const task = db.prepare(`SELECT * FROM agenda_tasks WHERE id=?`).get(id);
      if (!task) {
        console.log(`Not found: #${id}`);
        break;
      }

      const updates = [];
      const vals = [];
      if (flags.title) {
        updates.push("title=?");
        vals.push(flags.title);
      }
      if (flags.desc) {
        updates.push("description=?");
        vals.push(flags.desc);
      }
      if (flags.proj) {
        updates.push("project=?");
        vals.push(flags.proj);
      }
      if (flags.priority) {
        updates.push("priority=?");
        vals.push(parseInt(flags.priority));
      }
      if (flags.due) {
        updates.push("due_date=?");
        vals.push(flags.due);
      }
      if (flags.tags) {
        updates.push("tags=?");
        vals.push(flags.tags);
      }
      if (flags.status) {
        updates.push("status=?");
        vals.push(flags.status);
      }

      if (updates.length === 0) {
        console.log("No changes specified. Use --title, --desc, --proj, etc.");
        break;
      }
      updates.push("updated_at=?");
      vals.push(now());
      vals.push(id);

      db.prepare(`UPDATE agenda_tasks SET ${updates.join(", ")} WHERE id=?`).run(...vals);
      console.log(`\x1b[32m✓\x1b[0m Updated task #${id}`);
      break;
    }

    case "show": {
      const id = parseInt(rest[0]);
      if (!id) {
        console.error("Usage: agenda show <id>");
        process.exit(1);
      }
      const t = db.prepare(`SELECT * FROM agenda_tasks WHERE id=?`).get(id);
      if (!t) {
        console.log(`Not found: #${id}`);
        break;
      }
      console.log(`\n${fmtTask(t)}`);
      if (t.description) console.log(`\n  ${t.description}`);
      console.log(`\n  Created: ${t.created_at}`);
      if (t.completed_at) console.log(`  Done: ${t.completed_at}`);
      console.log("");
      break;
    }

    case "list": {
      let q = `SELECT * FROM agenda_tasks WHERE 1=1`;
      const vals = [];

      if (flags.status) {
        q += ` AND status=?`;
        vals.push(flags.status);
      } else {
        q += ` AND status NOT IN ('done','cancelled')`;
      }

      if (flags.proj) {
        q += ` AND project=?`;
        vals.push(flags.proj);
      }
      if (flags.priority) {
        q += ` AND priority>=?`;
        vals.push(parseInt(flags.priority));
      }

      q += ` ORDER BY priority DESC, id`;

      const rows = db.prepare(q).all(...vals);
      if (rows.length === 0) {
        console.log("(no tasks)");
        break;
      }

      // Group by project
      const byProject = {};
      rows.forEach((t) => {
        const key = t.project || "(none)";
        (byProject[key] = byProject[key] || []).push(t);
      });

      Object.entries(byProject).forEach(([proj, tasks]) => {
        console.log(`\n\x1b[33m${proj}\x1b[0m (${tasks.length})`);
        tasks.forEach((t) => console.log("  " + fmtTask(t)));
      });
      console.log(`\n\x1b[90m${rows.length} task(s)\x1b[0m`);
      break;
    }

    case "next": {
      const t = db
        .prepare(`
        SELECT * FROM agenda_tasks
        WHERE status IN ('todo','doing')
        ORDER BY priority DESC, id
        LIMIT 1
      `)
        .get();
      if (!t) {
        console.log("\x1b[32m✓ Nothing on the agenda\x1b[0m");
        break;
      }
      console.log("\n\x1b[1mNext task:\x1b[0m\n");
      console.log("  " + fmtTask(t));
      if (t.description) console.log(`\n  ${t.description}`);
      console.log("");
      break;
    }

    case "doing": {
      const rows = db
        .prepare(`SELECT * FROM agenda_tasks WHERE status='doing' ORDER BY priority DESC`)
        .all();
      if (rows.length === 0) {
        console.log("(nothing in progress)");
        break;
      }
      console.log(`\x1b[36mIn progress (${rows.length}):\x1b[0m\n`);
      rows.forEach((t) => console.log("  " + fmtTask(t)));
      break;
    }

    case "blocked": {
      const rows = db
        .prepare(`SELECT * FROM agenda_tasks WHERE status='blocked' ORDER BY priority DESC`)
        .all();
      if (rows.length === 0) {
        console.log("\x1b[32m✓ No blocked tasks\x1b[0m");
        break;
      }
      console.log(`\x1b[31mBlocked (${rows.length}):\x1b[0m\n`);
      rows.forEach((t) => console.log("  " + fmtTask(t)));
      break;
    }

    case "stats": {
      const total = db.prepare(`SELECT COUNT(*) as c FROM agenda_tasks`).get().c;
      const byStatus = db
        .prepare(`SELECT status, COUNT(*) as c FROM agenda_tasks GROUP BY status`)
        .all();
      const byProject = db
        .prepare(`
        SELECT project, COUNT(*) as total,
               SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
        FROM agenda_tasks GROUP BY project ORDER BY total DESC
      `)
        .all();

      console.log("\n\x1b[1m📊 Agenda Stats\x1b[0m\n");
      console.log(`Total tasks: ${total}\n`);

      console.log("\x1b[33mBy Status:\x1b[0m");
      byStatus.forEach((s) => {
        const icon = STATUS_ICON[s.status] || "•";
        console.log(`  ${icon} ${s.status}: ${s.c}`);
      });

      if (byProject.length > 0) {
        console.log("\n\x1b[33mBy Project:\x1b[0m");
        byProject.forEach((p) => {
          const name = p.project || "(none)";
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
          console.log(`  ${name}: ${p.done}/${p.total} ${bar} ${pct}%`);
        });
      }
      console.log("");
      break;
    }

    case "project": {
      const sub = rest[0];
      if (!sub || sub === "list") {
        const rows = db.prepare(`SELECT * FROM agenda_projects ORDER BY status, name`).all();
        if (rows.length === 0) {
          console.log("(no projects)");
          break;
        }
        console.log("\x1b[33mProjects:\x1b[0m\n");
        rows.forEach((p) => {
          const sc =
            p.status === "done" ? "\x1b[90m" : p.status === "active" ? "\x1b[32m" : "\x1b[33m";
          console.log(
            `  ${sc}${p.name}\x1b[0m [${p.status}]${p.goal ? "\n    Goal: " + p.goal : ""}`,
          );
        });
      } else if (sub === "add") {
        const name = rest.slice(1).join(" ") || flags.name;
        if (!name) {
          console.error("Usage: agenda project add <name> [--goal text]");
          process.exit(1);
        }
        const r = db
          .prepare(`INSERT OR IGNORE INTO agenda_projects (name, goal) VALUES (?, ?)`)
          .run(name, flags.goal || null);
        if (r.changes > 0) console.log(`\x1b[32m✓\x1b[0m Project: ${name}`);
        else console.log(`Already exists: ${name}`);
      } else if (sub === "done") {
        const name = rest.slice(1).join(" ");
        db.prepare(`UPDATE agenda_projects SET status='done', updated_at=? WHERE name=?`).run(
          now(),
          name,
        );
        console.log(`\x1b[32m✓\x1b[0m Project done: ${name}`);
      } else if (sub === "show") {
        const name = rest.slice(1).join(" ");
        const p = db.prepare(`SELECT * FROM agenda_projects WHERE name=?`).get(name);
        if (!p) {
          console.log(`Not found: ${name}`);
          break;
        }
        const tasks = db
          .prepare(`SELECT * FROM agenda_tasks WHERE project=? ORDER BY priority DESC`)
          .all(name);
        console.log(`\n\x1b[1m${p.name}\x1b[0m [${p.status}]`);
        if (p.goal) console.log(`Goal: ${p.goal}`);
        console.log(`\nTasks (${tasks.length}):`);
        tasks.forEach((t) => console.log("  " + fmtTask(t, true)));
        console.log("");
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "agenda.mjs help" for usage');
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  process.exit(1);
} finally {
  db.close();
}
