# BOOT.md — Gateway Startup Sequence

> Этот файл запускается автоматически при старте gateway (boot-md hook).
> Используется для инициализации состояния при cold-start.

## Gateway Boot Actions

При старте gateway:

1. Проверить что workspace доступен
2. Проверить git sync статус
3. Записать время старта в daily log

## Статус

Этот файл существует для совместимости с boot-md hook.
Основная инициализация выполняется через AGENTS.md при старте сессии.
