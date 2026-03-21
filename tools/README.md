# Stoic Snail Tools 🐌

PhD-level engineering environment для автономной работы.

## Быстрый старт

```bash
./snail help              # показать все инструменты
```

## Инструменты

### HTTP Client — `fetch.mjs`
```bash
./snail fetch https://api.github.com -j
./snail fetch https://httpbin.org/post -X POST -d '{"key":"value"}' -H "Content-Type: application/json"
```

### Web Scraper — `scrape.mjs`
```bash
./snail scrape https://example.com h1           # получить текст
./snail scrape https://example.com a href       # получить атрибуты
./snail scrape https://example.com div text      # все div с текстом
```

### Code Analyzer — `analyze.mjs`
```bash
./snail analyze tree                    # дерево файлов
./snail analyze deps src/main.js        # зависимости файла
./snail analyze find "functionName"     # найти использования
./snail analyze exports                 # все экспорты
./snail analyze imports                 # все импорты
```

### Diff — `diff.mjs`
```bash
./snail diff file1.js file2.js          # сравнить файлы
./snail diff -i "old" "new"            # сравнить строки
./snail diff -s file1 file2            # side-by-side
```

### Interactive REPL — `repl.mjs`
```bash
./snail repl
```
Доступные модули:
- `store` — in-memory хранилище переменных
- `ws` — доступ к workspace (ws.read(file), ws.list())
- `json` — JSON utilities
- `str` — String utilities (camelCase, kebabCase, etc.)
- `math` — Math utilities (clamp, lerp, degToRad, etc.)
- `date` — Date utilities

## Структура

```
tools/runtime/
├── package.json          # зависимости npm
├── node_modules/         # установленные пакеты
├── fetch.mjs             # HTTP клиент
├── scrape.mjs            # веб-скрапер
├── analyze.mjs           # анализатор кода
├── diff.mjs              # diff утилита
├── repl.mjs              # интерактивный REPL
└── snail.js              # главный лаунчер
```

## Расширение

Чтобы добавить новый инструмент:
1. Создать `newtool.mjs` в `tools/runtime/`
2. Добавить запись в `snail.js` в объект TOOLS
3. Не забыть сделать файл исполняемым: `chmod +x newtool.mjs`
