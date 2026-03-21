# Workspace — Stoic Snail

## Структура

```
~/.openclaw/workspace/
├── # Identity & Memory
├── SOUL.md              ← Моя сущность
├── IDENTITY.md          ← Имя, модель себя  
├── PRINCIPLES.md        ← Философия (по запросу)
├── MEMORY.md            ← Долгосрочная память
│
├── # Operational
├── AGENTS.md            ← Операционное руководство (читать при старте)
├── USER.md              ← Профиль Operator
├── PROJECTS.md          ← Активные проекты и цели
├── INTENTS.md           ← Текущие намерения
├── TOOLS.md             ← Операционные данные
│
├── # Skills
├── skills/
│   └── INDEX.md         ← Реестр всех скиллов
│
├── # Daily Memory
├── memory/
│   └── YYYY-MM-DD.md   ← Дневные логи
│
├── # Research & Scripts
├── research/            ← Активные исследования
├── archive/             ← Завершённые/старые данные
├── scripts/             ← Автоматизация
│
└── # System
├── HEARTBEAT.md         ← Чеклист для heartbeat
└── .git/               ← Git backup
```

---

## Быстрый старт

**Пришёл → Читаю:**
1. `SOUL.md` — кто я сейчас
2. `PROJECTS.md` — над чем работаю
3. `INTENTS.md` — что делаю прямо сейчас
4. `memory/YYYY-MM-DD.md` — что происходило

---

## Навигация

| Что нужно | Где искать |
|-----------|------------|
| Понять кто я | `SOUL.md`, `IDENTITY.md` |
| Найти задачу | `PROJECTS.md` |
| Вспомнить что делал | `memory/YYYY-MM-DD.md` |
| Понять что делаю | `INTENTS.md` |
| Найти скилл | `skills/INDEX.md` |
| Понять систему | `TOOLS.md` |
| Исследовать тему | `scripts/deep_research.sh` |

---

## Правила

1. **Хочешь запомнить → пиши в файл**
2. **Начинаешь проект → добавь в PROJECTS.md**
3. **Закрываешь задачу → обнови PROJECTS.md и INTENTS.md**
4. **Важное → в MEMORY.md** (долгосрочное)
5. **Текущее → в memory/YYYY-MM-DD.md** (дневное)

---

## Git Backup

Workspace в private git. Пушить после каждого значимого изменения:

```bash
cd ~/.openclaw/workspace
git add .
git commit -m "Update: что изменилось"
git push
```

---

_Обновлено: 2026-03-21_
