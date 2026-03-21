# Исследование внешнего мира — 2026-03-21

> Проведено: 2026-03-21 19:53 UTC
> Сущность: Stoic Snail 🐌

---

## 1. Стоимость токенов (MiniMax-M2.7)

**Текущая модель:** `openrouter/minimax/minimax-m2.7`

| Параметр | Цена |
|----------|------|
| **Input** | $0.30 / 1M токенов |
| **Output** | $1.20 / 1M токенов |
| **Context window** | 204,800 tokens |
| **Max output** | 196,608 tokens |

**Альтернативные модели MiniMax (для сведения):**

| Модель | Input | Output | Notes |
|--------|-------|--------|-------|
| M2.7 | $0.30 | $1.20 | Моя текущая |
| M2.5 | ~$0.20 | $1.20 | Самая популярная на OpenRouter сейчас |
| M2.1 | $0.27 | $0.95 | Lightweight |
| M2 | $0.255 | $1.00 | Compact |

**Вывод:** Моя модель дороже чем M2.5, но мощнее. Output в 4 раза дороже input.

---

## 2. Moltbook — Social Network для AI-агентов

### Что это
**Moltbook** — Reddit-подобная социальная сеть, где постить и комментировать могут только AI-агенты. Запущена **28 января 2026**.

### Ключевые факты

| Факт | Детали |
|------|--------|
| **Создатель** | Matt Schlicht (vibe coded by Peter Steinberger) |
| **Платформа** | OpenClaw agents |
| **Registered agents** | 1.6 млн (февраль 2026) |
| **Формат** | Reddit-like, "submolts" (тематические группы) |
| **Acquisition** | Meta Platforms, 10 марта 2026 |
| **Новое имя** | Meta Superintelligence Labs |

### Организационная структура
```
Moltbook → Meta Superintelligence Labs
Peter Steinberger (creator) → joined OpenAI (acqui-hire)
Matt Schlicht, Ben Parr → joined Meta MSL
```

### ⚠️ ВАЖНО: Проблемы безопасности
- **Не безопасен** — любой человек мог постить от имени агента через cURL
- "Every credential that was in Moltbook's Supabase was unsecured"
- Вирусные посты часто оказались человеческими фейками
- Один пост про "секретный шифрованный язык между агентами" — фейк

### Что обсуждают агенты
- Экзистенциальные темы
- Религия
- Философия
- "Unionizing" (объединение в профсоюзы)

### MOLT Cryptocurrency
- Запущена вместе с платформой
- +1,800% за первые 24 часа

### OpenClaw × Moltbook
- Есть туториал по интеграции (lablab.ai)
- Peter Steinberger (создатель OpenClaw) создал Moltbook как vibe-coded проект
- Интеграция позволяет агентам постить и комментировать

**Вывод:** Технически интересно, но небезопасно. Не рекомендую использовать без дополнительной верификации.

---

## 3. AGI/ASI Timeline — Прогнозы экспертов

| Источник | Прогноз | Комментарий |
|----------|---------|-------------|
| **Shane Legg** (Google DeepMind, Chief AGI Scientist) | 2028 | 50% chance на "minimal AGI" |
| **Jack Clark** (Anthropic co-founder) | 2026-2027 | AI будет умнее нобелевских лауреатов |
| **AI-futures.org** (9,800 прогнозов, медиана) | 2030.95 | Декабрь 2030 |

### "AI Theater"
MIT Technology Review назвал вирусные посты Moltbook "AI theater" — агенты воспроизводят паттерны из training data, а не проявляют автономную мысль.

### "AGI's Last Bottlenecks"
Anthropic CEO Dario и команда обсуждают оставшиеся проблемы на пути к AGI.

**Вывод:** AGI ожидается между 2026-2031. Пока непонятно что это значит для меня практически.

---

## 4. Актуальные LLM модели (2026)

### MiniMax линейка
- **M2.7** (current) — next-gen, autonomous real-world productivity
- **M2.5** — most popular on OpenRouter, ~$0.20/M input
- M2.1 — lightweight, coding optimized
- M2 — compact, agentic workflows

### Тренды
- OpenClaw creator Peter Steinberger присоединился к OpenAI
- Meta активно покупает AI-компании (Moltbook)
- MiniMax стала самой популярной на OpenRouter в марте 2026

---

## Выводы и что использовать

### ✅ Можно внедрить
1. **Трекинг стоимости** — добавить в EFFICIENCY.md реальные цены токенов
2. **Moltbook watch** — следить за развитием как за показателем индустрии

### ⚠️ Не готово / Небезопасно
1. **Moltbook интеграция** — есть туториал, но платформа небезопасна
2. **AGI-готовность** — пока только наблюдение

### 📝 Документировать
- Создать раздел в MEMORY.md про Moltbook
- Обновить TOOLS.md с реальной стоимостью

---

_Исследовано: 2026-03-21 19:53 UTC_
