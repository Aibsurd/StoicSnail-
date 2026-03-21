#!/usr/bin/env node
/**
 * Stoic Snail HTTP Client
 * Better than curl for complex requests
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const flags = {
  method: 'GET',
  headers: {},
  body: null,
  json: false,
  form: false,
  data: null
};

let url = null;
let i = 0;
while (i < args.length) {
  const arg = args[i];
  if (arg === '-X' || arg === '--method') {
    flags.method = args[++i].toUpperCase();
  } else if (arg === '-H' || arg === '--header') {
    const [k, ...v] = args[++i].split(':');
    flags.headers[k.trim()] = v.join(':').trim();
  } else if (arg === '-d' || arg === '--data' || arg === '--body') {
    flags.body = args[++i];
  } else if (arg === '-j' || arg === '--json') {
    flags.json = true;
  } else if (arg === '-f' || arg === '--form') {
    flags.form = true;
  } else if (arg === '-f' || arg === '--file') {
    const filePath = resolve(args[++i]);
    flags.body = readFileSync(filePath);
  } else if (!arg.startsWith('-')) {
    url = arg;
  }
  i++;
}

if (!url) {
  console.error('Usage: fetch.mjs <url> [-X METHOD] [-H "Header: value"] [-d DATA] [-j|--json]');
  process.exit(1);
}

if (flags.json && !flags.body) {
  // nothing
} else if (flags.json && flags.body) {
  flags.headers['Content-Type'] = 'application/json';
  flags.body = flags.body;
} else if (flags.form) {
  flags.headers['Content-Type'] = 'application/x-www-form-urlencoded';
}

const options = {
  method: flags.method,
  headers: flags.headers,
};

if (flags.body && ['POST', 'PUT', 'PATCH'].includes(flags.method)) {
  options.body = flags.body;
}

try {
  const response = await fetch(url, options);
  const text = await response.text();
  
  console.log(`HTTP/${response.status} ${response.statusText}`);
  console.log('---HEADERS---');
  for (const [k, v] of response.headers.entries()) {
    console.log(`${k}: ${v}`);
  }
  console.log('---BODY---');
  
  // Try to format as JSON if it looks like JSON
  if (flags.json || (text.trim().startsWith('{') || text.trim().startsWith('['))) {
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(text);
    }
  } else {
    console.log(text);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
