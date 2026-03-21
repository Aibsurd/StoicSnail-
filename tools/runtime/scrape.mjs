#!/usr/bin/env node
/**
 * Stoic Snail Web Scraper v2
 * Better output formatting, multiple selectors, data extraction
 */

import { load } from 'cheerio';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
\x1b[1mWeb Scraper\x1b[0m - Extract data from HTML using CSS selectors

\x1b[33mUsage:\x1b[0m
  scrape.mjs <source> <selector> [attr|operation]

\x1b[33mArguments:\x1b[0m
  source     URL or local HTML file path
  selector   CSS selector (h1, .class, #id, div p, etc.)
  attr       What to extract:
               text     - Text content (default)
               html     - Inner HTML
               outer    - Outer HTML
               href     - Link URL
               src      - Image source
               [attr]   - Any attribute

\x1b[33mOperations:\x1b[0m
               all      - Show all matches (default if multiple)
               first    - First match only
               count    - Count of matches
               dump     - Full HTML dump of matches

\x1b[33mExamples:\x1b[0m
  scrape.mjs https://example.com h1
  scrape.mjs https://example.com a href
  scrape.mjs https://example.com img src
  scrape.mjs page.html "article h2" text
  scrape.mjs https://example.com ".post h2" first
  scrape.mjs https://example.com "li" count
  scrape.mjs https://example.com "pre" dump

\x1b[33mJSON mode:\x1b[0m
  Use {} syntax to extract from JSON:
  scrape.mjs https://api.example.com/data {results[0].name}

\x1b[33mLocal file:\x1b[0m
  scrape.mjs ./page.html "h1,h2,h3" text
`);
  process.exit(1);
}

const [source, selector, operation = 'text'] = args;

let html;
let isUrl = source.startsWith('http://') || source.startsWith('https://');

if (isUrl) {
  try {
    if (!operation || operation === 'help') {
      console.log(`Fetching ${source}...`);
    }
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (e) {
    console.error(`Fetch error: ${e.message}`);
    process.exit(1);
  }
} else {
  try {
    html = readFileSync(source, 'utf-8');
  } catch (e) {
    console.error(`File error: ${e.message}`);
    process.exit(1);
  }
}

const $ = load(html);

// JSON extraction
if (selector.startsWith('{')) {
  try {
    const json = JSON.parse(html);
    // Simple JSONPath: {key.subkey} or {array[index].key}
    const path = selector.slice(1, -1).split('.').filter(Boolean);
    let result = json;
    for (const segment of path) {
      // Check for array index
      const match = segment.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        result = result[match[1]][parseInt(match[2])];
      } else {
        result = result[segment];
      }
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('JSON parse/path error:', e.message);
  }
  process.exit(0);
}

// Selector operations
const count = $(selector).length;

if (operation === 'count') {
  console.log(count);
  process.exit(0);
}

if (operation === 'dump') {
  $(selector).each((i, el) => {
    console.log(`--- Element ${i + 1} ---`);
    console.log($.html(el));
    console.log('');
  });
  process.exit(0);
}

if (operation === 'first') {
  const el = $(selector).first();
  if (el.length === 0) {
    console.log('(no match)');
  } else if (el.is('img, script, iframe, source, input')) {
    console.log(el.attr('src') || el.attr('href') || '');
  } else {
    console.log(el.text().trim());
  }
  process.exit(0);
}

// Default: show all matches
if (count === 0) {
  console.log('(no matches)');
  process.exit(0);
}

if (count === 1) {
  const el = $(selector);
  if (operation === 'html') {
    console.log(el.html() || '');
  } else if (operation === 'outer') {
    console.log($.html(el) || '');
  } else if (operation === 'text') {
    console.log(el.text().trim());
  } else {
    console.log(el.attr(operation) || '');
  }
} else {
  // Multiple matches
  const elements = $(selector);
  
  console.log(`\x1b[36m${count} matches\x1b[0m\n`);
  
  if (operation === 'html') {
    elements.each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('\n') || content.length > 100) {
        console.log(`--- ${i + 1} ---`);
        console.log(content);
      } else {
        console.log(`${i + 1}. ${content}`);
      }
    });
  } else if (operation === 'outer') {
    elements.each((i, el) => {
      console.log(`--- ${i + 1} ---`);
      console.log($.html(el));
    });
  } else if (operation === 'text') {
    elements.each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        // If text is multiline or long, format it
        if (text.includes('\n') || text.length > 80) {
          console.log(`--- ${i + 1} ---`);
          console.log(text);
        } else {
          console.log(`${i + 1}. ${text}`);
        }
      }
    });
  } else {
    // Attribute - list all
    elements.each((i, el) => {
      const val = $(el).attr(operation);
      if (val !== undefined) {
        console.log(`${i + 1}. ${val}`);
      }
    });
  }
}
