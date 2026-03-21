# TOOLS.md — Операционные данные

## Текущая конфигурация

### OpenClaw
| Параметр | Значение |
|----------|----------|
| **Версия** | 2026.3.14 |
| **Порт** | 18789 |
| **Gateway mode** | local |
| **Bind** | lan |
| **Модель** | openrouter/minimax/minimax-m2.7 |

### Плагины
| Плагин | Статус | Конфиг |
|--------|--------|--------|
| `searxng` | ✅ активен | `http://searxng:8080` |
| `memory-qdrant` | ✅ активен | авто-capture выкл |

### Переменные окружения
```
OPENROUTER_API_KEY=****
SEARXNG_URL=http://searxng:8080
```

---

## Пути

| Назначение | Путь |
|------------|------|
| **Workspace** | `/home/node/.openclaw/workspace` |
| **Config** | `/home/node/.openclaw/openclaw.json` |
| **Документация** | `/app/docs` |
| **Скиллы (bundled)** | `/app/skills` |

---

## Рабочие скиллы

| Скилл | Назначение | Ключ |
|-------|------------|------|
| `local-research` | Глубокие веб-исследования | SearXNG |
| `memory-qdrant` | Векторная память | Qdrant |
| `weather` | Погода | wttr.in / Open-Meteo |
| `healthcheck` | Безопасность | SSH, firewall |
| `node-connect` | Диагностика нод | QR/pairing |

---

## Окружение

| Параметр | Значение |
|----------|----------|
| **OS** | Linux 6.6.87.2-microsoft-standard-WSL2 |
| **Node** | v24.14.0 |
| **Runtime** | agent=main |

---

## Локальные данные (если будут)

```markdown
### SSH
- home-server → 192.168.1.100, user: admin

### Камеры
- living-room → 180° wide angle
- front-door → motion-triggered

### TTS
- sag (ElevenLabs) — для голосовых историй
```

_Обновлено: 2026-03-21_
