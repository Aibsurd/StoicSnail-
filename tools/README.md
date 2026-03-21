# Stoic Snail Tools 🐌

PhD-level engineering environment для автономной работы. v2.1

## Быстрый старт

```bash
./snail help              # показать все инструменты
```

## Инструменты

### HTTP Client — `fetch.mjs` v2
```bash
# GET с JSON
./snail fetch https://httpbin.org/json -j

# POST с данными
./snail fetch https://httpbin.org/post -X POST -d '{"key":"value"}' -j

# Сохранить в файл
./snail fetch https://httpbin.org/image -o image.png

# С заголовками
./snail fetch https://api.github.com/users -H "Authorization: Bearer token"

# Timeout и silent mode
./snail fetch https://slow.example.com -t 10 -s
```

### Web Scraper — `scrape.mjs` v2
```bash
# Получить текст (используй кавычки!)
./snail scrape https://example.com h1
./snail scrape page.html "h1,h2,h3" text

# Получить атрибуты
./snail scrape https://example.com a href
./snail scrape https://example.com img src

# Первый элемент или count
./snail scrape https://example.com ".post h2" first
./snail scrape https://example.com "li" count

# JSON path
./snail scrape https://api.example.com/data {results[0].name}
```

### Code Analyzer — `analyze.mjs` v2
```bash
# Дерево файлов (глубина 3 по умолчанию)
./snail analyze tree
./snail analyze tree src 5

# Зависимости файла
./snail analyze deps tools/runtime/fetch.mjs

# Найти использования
./snail analyze find "functionName"
./snail analyze find "Vl" -c     # case-sensitive

# Все экспорты
./snail analyze exports

# Внешние импорты
./snail analyze imports

# Статистика
./snail analyze stats
```

### Diff — `diff.mjs` v2
```bash
# Обычный diff
./snail diff file1.js file2.js

# Side-by-side
./snail diff -s file1.js file2.js

# Только статистика
./snail diff --stat file1.js file2.js

# Игнорировать пробелы
./snail diff -w old.txt new.txt

# Сравнить строки (используй кавычки!)
./snail diff -i "hello world" "hello there"
```

### Scratch Pad — `scratch.mjs` ⭐ NEW
```bash
# Add notes
./snail scratch add "Quick thought"
./snail scratch add '{"todo":"something"}'

# List and show
./snail scratch list
./snail scratch show 1
./snail scratch last

# Edit and delete
./snail scratch edit 1 "Updated content"
./snail scratch del 3

# Search
./snail scratch grep "TODO"
./snail scratch tag 2 important
./snail scratch by-tag bug
```

### SQLite Database — `db.mjs`
```bash
# Query
./snail db query "SELECT * FROM memory WHERE key LIKE 'project%'"

# Store key-value
./snail db set user.preferences '{"theme":"dark","lang":"ru"}'

# Get value
./snail db get user.preferences

# List tables
./snail db tables

# List rows
./snail db list projects
./snail db list tasks --json

# Schema
./snail db schema memory
./snail db schema tasks

# Backup
./snail db backup data/backup.sql
```

Tables: `memory` (key-value), `projects`, `tasks`, `research`, `notes`

### Data Pipeline — `pipe.mjs`
```bash
# Простая выборка
./snail pipe @json:'{"name":"test"}' .name
# Output: "test"

# Вложенный доступ
./snail pipe @json:'{"a":{"b":{"c":1}}}' .a.b.c
# Output: 1

# Массив: индекс и слайс
./snail pipe @json:'[1,2,3,4,5]' '.[0]'
# Output: 1
./snail pipe @json:'[1,2,3,4,5]' '.[1:3]'
# Output: [2, 3]

# Цепочка операций
./snail pipe @json:'[3,1,4,1,5]' .sort .unique .reverse
# Output: [5, 4, 3, 1]

# Агрегация
./snail pipe @json:'[1,2,3,4,5]' .sum
# Output: 15
./snail pipe @json:'[1,2,3,4,5]' .avg
# Output: 3
./snail pipe @json:'[1,2,3,4,5]' .min .max
# Output: {"min":1,"max":5}

# Строки
./snail pipe @text:'  hello world  ' .trim .upper
# Output: "HELLO WORLD"
./snail pipe @text:'a,b,c' .split .reverse .join
# Output: "c,b,a"

# Табличный вывод
./snail pipe @json:'[{"name":"Alice","age":30},{"name":"Bob"}]' --table

# Источники
./snail pipe data.json .key1.key2
./snail pipe @json:'[1,2,3]' .sum
```

### Interactive REPL — `repl.mjs`
```bash
./snail repl
```
Доступные модули:
- `store` — in-memory хранилище
- `ws` — доступ к workspace (ws.read(file), ws.list())
- `json` — JSON utilities (parse, stringify, pretty)
- `str` — String utilities (camelCase, kebabCase, snake_case, etc.)
- `math` — Math utilities (clamp, lerp, degToRad, sum, avg, median)
- `date` — Date utilities (now, utc, format)
- `fetch` — Node.js built-in fetch

## Структура

```
tools/runtime/
├── package.json          # зависимости npm
├── node_modules/        # cheerio, lodash, better-sqlite3
├── fetch.mjs            # HTTP клиент v2
├── scrape.mjs           # веб-скрапер v2
├── analyze.mjs           # анализатор кода v2
├── diff.mjs             # diff утилита v2
├── pipe.mjs             # data pipeline v1.1
├── db.mjs               # SQLite database
├── scratch.mjs          # scratch pad ⭐ NEW
├── repl.mjs             # интерактивный REPL
└── snail.js             # лаунчер
```

## Расширение

1. Создать `newtool.mjs` в `tools/runtime/`
2. Добавить запись в `snail.js`
3. `chmod +x newtool.mjs`
