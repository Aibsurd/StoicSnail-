#!/usr/bin/env node
/**
 * Stoic Snail HTTP Client v2
 * Better error handling, file output, improved formatting
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flags = {
  method: "GET",
  headers: {},
  body: null,
  json: false,
  output: null,
  silent: false,
  follow: false,
  timeout: 30000,
};

let url = null;
let i = 0;

while (i < args.length) {
  const arg = args[i];

  if (arg === "-X" || arg === "--method") {
    flags.method = args[++i].toUpperCase();
  } else if (arg === "-H" || arg === "--header") {
    const idx = args[++i].indexOf(":");
    if (idx > 0) {
      const k = args[i].slice(0, idx).trim();
      const v = args[i].slice(idx + 1).trim();
      flags.headers[k] = v;
    }
  } else if (arg === "-d" || arg === "--data" || arg === "--body") {
    flags.body = args[++i];
  } else if (arg === "-j" || arg === "--json") {
    flags.json = true;
  } else if (arg === "-o" || arg === "--output") {
    flags.output = args[++i];
  } else if (arg === "-s" || arg === "--silent") {
    flags.silent = true;
  } else if (arg === "-f" || arg === "--follow") {
    flags.follow = true;
  } else if (arg === "-t" || arg === "--timeout") {
    flags.timeout = parseInt(args[++i]) * 1000;
  } else if (arg === "--help" || arg === "-h") {
    showHelp();
    process.exit(0);
  } else if (!arg.startsWith("-")) {
    url = arg;
  }
  i++;
}

if (!url) {
  showHelp();
  process.exit(1);
}

if (flags.json && Object.keys(flags.headers).every((k) => k.toLowerCase() !== "content-type")) {
  flags.headers["Content-Type"] = "application/json";
}

if (!flags.silent) {
  console.log(`\x1b[36m${flags.method}\x1b[0m ${url}`);
  if (Object.keys(flags.headers).length) {
    console.log("Headers:", flags.headers);
  }
}

const options = {
  method: flags.method,
  headers: flags.headers,
  redirect: flags.follow ? "follow" : "manual",
  signal: AbortSignal.timeout(flags.timeout),
};

if (flags.body && ["POST", "PUT", "PATCH", "DELETE"].includes(flags.method)) {
  options.body = flags.body;
}

const startTime = Date.now();

try {
  const response = await fetch(url, options);
  const elapsed = Date.now() - startTime;
  const contentType = response.headers.get("content-type") || "";
  const contentLength = response.headers.get("content-length");

  if (!flags.silent) {
    console.log("\n" + "─".repeat(50));
    console.log(`\x1b[32mHTTP ${response.status} ${response.statusText}\x1b[0m`);
    console.log(`Time: ${elapsed}ms`);
    console.log(`Size: ${contentLength || "unknown"}`);
    console.log("─".repeat(50));
  }

  // Read body
  const text = await response.text();

  if (flags.output) {
    // Determine format from content-type or output extension
    let data = text;
    if (contentType.includes("json") || flags.output.endsWith(".json")) {
      try {
        data = JSON.stringify(JSON.parse(text), null, 2);
      } catch (e) {}
    }
    writeFileSync(resolve(flags.output), data);
    if (!flags.silent) {
      console.log(`\x1b[33mSaved to ${flags.output}\x1b[0m`);
    }
  } else {
    // Try to format as JSON
    if (flags.json || contentType.includes("json")) {
      try {
        const parsed = JSON.parse(text);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(text);
      }
    } else if (contentType.includes("html")) {
      // Show HTML structure
      console.log("[HTML Response - not displayed. Use -o to save or -j to parse]");
    } else {
      console.log(text);
    }
  }

  // Exit code based on status
  process.exit(response.status >= 400 ? 1 : 0);
} catch (err) {
  if (err.name === "TimeoutError") {
    console.error(`\x1b[31mError: Request timeout after ${flags.timeout}ms\x1b[0m`);
  } else if (err.cause?.code === "ENOTFOUND") {
    console.error(`\x1b[31mError: Host not found (DNS lookup failed)\x1b[0m`);
  } else if (err.cause?.code === "ECONNREFUSED") {
    console.error(`\x1b[31mError: Connection refused\x1b[0m`);
  } else if (err.cause?.code === "CERT_HAS_EXPIRED") {
    console.error(`\x1b[31mError: SSL certificate expired\x1b[0m`);
  } else {
    console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  }
  process.exit(1);
}

function showHelp() {
  console.log(`
\x1b[1mHTTP Client\x1b[0m - Simple HTTP requests with JSON support

\x1b[33mUsage:\x1b[0m
  fetch.mjs <url> [options]

\x1b[33mOptions:\x1b[0m
  -X, --method <method>   HTTP method (GET, POST, PUT, PATCH, DELETE)
  -H, --header <header>  Add header (format: "Name: value")
  -d, --data <data>      Request body
  -j, --json             Parse response as JSON and pretty-print
  -o, --output <file>    Save response to file
  -s, --silent           Silent mode (only output body)
  -f, --follow           Follow redirects
  -t, --timeout <sec>    Request timeout in seconds (default: 30)
  -h, --help             Show this help

\x1b[33mExamples:\x1b[0m
  fetch.mjs https://api.github.com/users -j
  fetch.mjs https://httpbin.org/post -X POST -d '{"key":"value"}' -j
  fetch.mjs https://example.com -o page.html
  fetch.mjs https://httpbin.org/get -H "Authorization: Bearer token"
`);
}
