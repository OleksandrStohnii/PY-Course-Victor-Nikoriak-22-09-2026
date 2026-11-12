# М5. Production

Модуль 4 закінчився застосунками, які працюють «у мене на комп'ютері»: новинний агрегатор `news_hub` (FastAPI, PostgreSQL, Redis, LLM, Telegram-бот) і проєкт нотаток `crispy_notes_project` (Django, DRF, чат на WebSocket). Модуль 5 переносить обидва туди, де їх побачать інші: в образ Docker, на сервер з Compose і в CI, який перевіряє кожну зміну.

| Урок | Що робимо | Проєкт |
|---|---|---|
| [Бонус. Linux для розробника](m5/bonus_linux.md) | процеси й сигнали, права, порти, змінні середовища, скрипти з `set -euo pipefail`; довідник у 18 розділах | — |
| [48. Docker](m5/lesson_49.md) | `Dockerfile` і `.dockerignore`, шари й кеш, користувач без root, том, мережа, `/health` і `/health/ready`, коректна зупинка, тести образу | `news_hub` |
| [49. Docker Compose + деплой](m5/lesson_50.md) | уся система однією командою: nginx, API, міграції, PostgreSQL, Redis, бот; той самий підхід для Django-проєкту (кроки 8–9 книги); деплой, бекап | `news_hub`, `crispy_notes_project` |
| [50. CI/CD (GitHub Actions)](m5/lesson_51.md) | тести, типи й збірка образу на кожен PR; публікація образу | обидва |

Кожен урок — рефакторинг стартового коду (`production_bot`) і Django-книги ([notes_chat_app](https://nikoriakviktor.github.io/notes_chat_app/)): спершу запускаємо його як є і дивимось, що ламається, потім виправляємо — з реальним виводом.
