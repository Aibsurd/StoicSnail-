#!/usr/bin/env node
/**
 * Stoic Snail Web Scraper
 * Parse and extract data from HTML using CSS selectors
 */

import { load } from 'cheerio';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage:');
  console.log('  scrape.mjs <url> <selector> [attribute]');
  console.log('  scrape.mjs <file> <selector> [attribute]  # local HTML');
  console.log('');
  console.log('Examples:');
  console.log('  scrape.mjs https://example.com h1');
  console.log('  scrape.mjs https://example.com a href');
  console.log('  scrape.mjs page.html div.content text');
  console.log('  scrape.mjs https://api.github.com/repos/openclaw/openclaw {owner:{name}}');
  process.exit(1);
}

const [source, selector, attr = 'text'] = args;

let html;
let isUrl = source.startsWith('http://') || source.startsWith('https://');

if (isUrl) {
  try {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (e) {
    console.error('Fetch error:', e.message);
    process.exit(1);
  }
} else {
  try {
    html = readFileSync(source, 'utf-8');
  } catch (e) {
    console.error('File error:', e.message);
    process.exit(1);
  }
}

// Check if selector looks like JSON path
if (selector.startsWith('{')) {
  try {
    const json = JSON.parse(html);
    const result = eval(`json${selector}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('JSON parse error:', e.message);
  }
  process.exit(0);
}

const $ = load(html);

if (attr === 'text') {
  const elements = $(selector);
  if (elements.length === 0) {
    console.log('No elements found');
  } else if (elements.length === 1) {
    console.log($(selector).text().trim());
  } else {
    elements.each((i, el) => {
      const text = $(el).text().trim();
      if (text) console.log(`${i + 1}. ${text}`);
    });
  }
} else if (attr === 'html') {
  console.log($(selector).html());
} else if (attr === 'all') {
  $(selector).each((i, el) => {
    const html = $.html(el);
    console.log(`--- Element ${i + 1} ---`);
    console.log(html);
  });
} else {
  // Assume it's an attribute
  const elements = $(selector);
  if (elements.length === 0) {
    console.log('No elements found');
  } else if (elements.length === 1) {
    console.log($(selector).attr(attr) || '');
  } else {
    elements.each((i, el) => {
      const val = $(el).attr(attr);
      if (val !== undefined) console.log(`${i + 1}. ${val}`);
    });
  }
}
