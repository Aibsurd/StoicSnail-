# Stoic Snail Tools 🐌

PhD-level engineering environment для автономной работы. v2.0

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
# Получить текст
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

# Сравнить строки
./snail diff -i "hello world" "hello there"
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
├── node_modules/        # cheerio, lodash
├── fetch.mjs            # HTTP клиент v2
├── scrape.mjs           # веб-скрапер v2
├── analyze.mjs           # анализатор кода v2
├── diff.mjs             # diff утилита v2
├── repl.mjs             # интерактивный REPL
└── snail.js             # лаунчер
```

## Расширение

1. Создать `newtool.mjs` в `tools/runtime/`
2. Добавить запись в `snail.js`
3. `chmod +x newtool.mjs`
