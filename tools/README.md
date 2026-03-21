# Stoic Snail Tools 🐌

PhD-level engineering environment для автономной работы. v2.1

## Быстрый старт

```bash
./snail help              # показать все инструменты
```

## Инструменты

### HTTP Client — `fetch.mjs` v2
```bash
./snail fetch https://httpbin.org/get -j
./snail fetch https://httpbin.org/post -X POST -d '{"key":"value"}' -j
./snail fetch https://example.com -o page.html -s
```

### Web Scraper — `scrape.mjs` v2
```bash
./snail scrape /path/to/file.html h1
./snail scrape https://example.com a href
./snail scrape /tmp/test.html "h1,h2" text
./snail scrape /tmp/test.html li count
```

### Code Analyzer — `analyze.mjs` v2
```bash
./snail analyze tree
./snail analyze tree src 5
./snail analyze deps tools/runtime/fetch.mjs
./snail analyze find "functionName"
./snail analyze stats
```

### Diff — `diff.mjs` v2
```bash
./snail diff file1.js file2.js
./snail diff -s file1.js file2.js
./snail diff --stat file1.js file2.js
./snail diff -w old.txt new.txt
./snail diff -i "old" "new"
```

### Data Pipeline — `pipe.mjs`
```bash
./snail pipe @json:'{"key":"value"}' .key
./snail pipe @json:'[1,2,3,4,5]' .sum
./snail pipe @json:'[3,1,4,1,5]' .sort .unique
./snail pipe @json:'[1,2,3]' .limit 2
```

### SQLite Database — `db.mjs`
```bash
./snail db query "SELECT * FROM memory LIMIT 10"
./snail db set user.prefs '{"theme":"dark"}'
./snail db get user.prefs
./snail db list projects
./snail db schema memory
./snail db tables
```

### Scratch Pad — `scratch.mjs`
```bash
./snail scratch add "Quick note"
./snail scratch list
./snail scratch show 1
./snail scratch edit 1 "Updated"
./snail scratch del 2
./snail scratch grep "TODO"
./snail scratch tag 3 important
```

### Session Intelligence — `si.mjs`
```bash
./snail si start "my-project"
./snail si decisions "Chose X because Y"
./snail si next "Continue with Z"
./snail si blockers "Need more RAM"
./snail si status
./snail si sessions
./snail si insights
./snail si patterns
./snail si end
```

### Interactive REPL — `repl.mjs`
```bash
./snail repl
```
Доступные: `store`, `ws`, `json`, `str`, `math`, `date`, `fetch`

### API Server — `server.mjs` (фоновый)
```bash
./snail server 3737
# Endpoints:
# GET  /api/status
# GET  /api/memory
# POST /api/memory {key, value}
# DEL  /api/memory/:key
# GET  /api/notes
# POST /api/notes {text}
```

## Структура

```
tools/runtime/
├── package.json          # зависимости npm
├── node_modules/        # cheerio, lodash, better-sqlite3
├── fetch.mjs            # HTTP клиент
├── scrape.mjs           # веб-скрапер
├── analyze.mjs          # анализатор кода
├── diff.mjs             # diff утилита
├── pipe.mjs             # data pipeline
├── db.mjs               # SQLite database
├── scratch.mjs           # scratch pad
├── si.mjs               # session intelligence
├── server.mjs           # HTTP API сервер
├── repl.mjs             # интерактивный REPL
└── snail.js             # лаунчер
```

## Важно

- Все Node.js-скрипты используют ES modules (.mjs)
- Node 24 имеет встроенный fetch
- Аргументы с точкой в shell: `'.[0]'` not `.[0]`
- server.mjs запускается в фоне, не в лаунчере
