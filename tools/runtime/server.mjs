#!/usr/bin/env node
/**
 * Stoic Snail API Server
 * Expose tools and data via HTTP API
 *
 * Run: ./server.mjs [port]
 * Default port: 3737
 */

import { readFileSync } from "fs";
import { createServer } from "http";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2]) || 3737;
const WORKSPACE = join(__dirname, "..", "..");
const DB_PATH = join(WORKSPACE, "data", "snail.db");
const SCRATCH_PATH = join(WORKSPACE, "data", "scratch.json");

// Initialize database
let db;
try {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
} catch (e) {
  console.log("Database not initialized");
}

// MIME types
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Parse URL and query params
function parseUrl(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  return {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    method: req.method,
  };
}

// Response helpers
function json(res, data, status = 200, headersOnly = false) {
  if (!headersOnly) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }
}

function text(res, data, status = 200, headersOnly = false) {
  if (!headersOnly) {
    res.writeHead(status, { "Content-Type": "text/plain" });
    res.end(data);
  }
}

function html(res, data, status = 200, headersOnly = false) {
  if (!headersOnly) {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  }
}

// API Routes
async function handleApi(req, res, { path, query }) {
  const parts = path.split("/").filter(Boolean);
  const resource = parts[1]; // /api/:resource

  // Pre-flight - just send headers
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    switch (`${req.method} /${resource}`) {
      // Memory / Key-Value store
      case "GET /memory":
      case "GET /keys": {
        const rows = db.prepare("SELECT * FROM memory ORDER BY updated_at DESC LIMIT 100").all();
        json(res, rows);
        break;
      }

      case "GET /memory/:key": {
        const key = parts[2];
        const row = db.prepare("SELECT * FROM memory WHERE key = ?").get(key);
        if (!row) {
          json(res, { error: "Not found" }, 404);
        } else {
          json(res, row);
        }
        break;
      }

      case "POST /memory": {
        let body = await getBody(req);
        const { key, value, type } = body;
        if (!key || value === undefined) {
          json(res, { error: "key and value required" }, 400);
          break;
        }
        const finalType = type || (typeof value === "object" ? "json" : "text");
        const finalValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        db.prepare(`
          INSERT INTO memory (key, value, type, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = ?, type = ?, updated_at = CURRENT_TIMESTAMP
        `).run(key, finalValue, finalType, finalValue, finalType);
        json(res, { ok: true, key });
        break;
      }

      case "DELETE /memory/:key": {
        const key = parts[2];
        db.prepare("DELETE FROM memory WHERE key = ?").run(key);
        json(res, { ok: true });
        break;
      }

      // Scratch notes
      case "GET /notes": {
        const scratch = JSON.parse(readFileSync(SCRATCH_PATH, "utf-8"));
        json(res, scratch.notes);
        break;
      }

      case "POST /notes": {
        let body = await getBody(req);
        const { text } = body;
        if (!text) {
          json(res, { error: "text required" }, 400);
          break;
        }
        const scratch = JSON.parse(readFileSync(SCRATCH_PATH, "utf-8"));
        const note = {
          id: (scratch.notes.length > 0 ? Math.max(...scratch.notes.map((n) => n.id)) : 0) + 1,
          text,
          tags: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          last: true,
        };
        scratch.notes.forEach((n) => (n.last = false));
        scratch.notes.push(note);
        scratch.last = note.id;
        require("fs").writeFileSync(SCRATCH_PATH, JSON.stringify(scratch, null, 2));
        json(res, { ok: true, id: note.id });
        break;
      }

      case "DELETE /notes/:id": {
        const id = parseInt(parts[2]);
        const scratch = JSON.parse(readFileSync(SCRATCH_PATH, "utf-8"));
        const before = scratch.notes.length;
        scratch.notes = scratch.notes.filter((n) => n.id !== id);
        if (scratch.notes.length < before) {
          scratch.last = scratch.notes[scratch.notes.length - 1]?.id || null;
          require("fs").writeFileSync(SCRATCH_PATH, JSON.stringify(scratch, null, 2));
        }
        json(res, { ok: true });
        break;
      }

      // Projects
      case "GET /projects": {
        const rows = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all();
        json(res, rows);
        break;
      }

      case "GET /project/:id": {
        const id = parseInt(parts[2]);
        const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
        json(res, row || { error: "Not found" });
        break;
      }

      // Status / Health
      case "GET /status":
      case "GET /health": {
        const memRows = db.prepare("SELECT COUNT(*) as count FROM memory").get();
        const noteCount = JSON.parse(readFileSync(SCRATCH_PATH, "utf-8")).notes.length;
        json(res, {
          status: "ok",
          uptime: process.uptime(),
          memory: memRows.count,
          notes: noteCount,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // Query endpoint
      case "POST /query": {
        let body = await getBody(req);
        const { sql } = body;
        if (!sql) {
          json(res, { error: "sql required" }, 400);
          break;
        }
        const stmt = db.prepare(sql);
        const isSelect = sql.trim().toLowerCase().startsWith("select");
        if (isSelect) {
          const rows = stmt.all();
          json(res, { rows, count: rows.length });
        } else {
          const result = stmt.run();
          json(res, { ok: true, changes: result.changes });
        }
        break;
      }

      default:
        json(res, { error: "Not found" }, 404);
    }
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

// Static file server for dashboard
function handleStatic(req, res, { path }) {
  // Serve index.html for root
  if (path === "/") {
    path = "/index.html";
  }

  const filePath = join(__dirname, "public", path);

  try {
    const ext = extname(filePath);
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

// Main server
const server = createServer((req, res) => {
  const parsed = parseUrl(req);

  if (parsed.path.startsWith("/api/")) {
    handleApi(req, res, parsed);
  } else if (parsed.path.startsWith("/public/") || parsed.path === "/") {
    handleStatic(req, res, parsed);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🐌 Stoic Snail API Server              ║
║   Port: ${PORT}                             ║
╚═══════════════════════════════════════════╝

Endpoints:
  GET  /api/memory         - List all key-value pairs
  GET  /api/memory/:key    - Get value by key
  POST /api/memory         - Set key-value {key, value, type}
  DEL  /api/memory/:key    - Delete key
  
  GET  /api/notes          - List all notes
  POST /api/notes          - Add note {text}
  DEL  /api/notes/:id     - Delete note
  
  GET  /api/projects       - List projects
  GET  /api/project/:id    - Get project
  
  GET  /api/status         - Health check
  POST /api/query          - SQL query {sql}

Examples:
  curl http://localhost:${PORT}/api/status
  curl http://localhost:${PORT}/api/memory
  curl -X POST http://localhost:${PORT}/api/memory \\
    -H "Content-Type: application/json" \\
    -d '{"key":"test","value":"hello"}'
`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  if (db) db.close();
  server.close();
  process.exit(0);
});
