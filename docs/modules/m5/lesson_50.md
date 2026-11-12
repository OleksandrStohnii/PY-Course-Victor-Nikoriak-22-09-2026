# Урок 50. Docker Compose + деплой

В уроці 49 `news_hub` став образом. Але щоб він запрацював, довелося руками створити мережу, запустити Redis, окремим контейнером прогнати міграції, передати десяток змінних і не переплутати порядок. На сервері цього ніхто не повторюватиме вручну.

**Docker Compose** описує всю систему одним файлом `docker-compose.yml`: які контейнери, з яких образів, у якій мережі, з якими томами й змінними, у якому порядку запускаються. Одна команда — `docker compose up -d --wait` — і вона або повністю працює, або каже, що саме не так.

Сьогодні так запускаються обидва проєкти курсу:

- **`news_hub`**: nginx → API → PostgreSQL + Redis; міграції — окремим кроком; Telegram-бот. Основа — `docker-compose.yml` зі стартового `production_bot`;
- **`crispy_notes_project`** (Django, чат на WebSocket): nginx → daphne → PostgreSQL + Redis. Основа — `Dockerfile`, `entrypoint.sh`, `nginx.conf` і `docker-compose.yml` з [Django-книги](https://nikoriakviktor.github.io/notes_chat_app/) (кроки 8–9).

Як і раніше, спершу запускаємо старі файли **без змін** і дивимось, що ламається. Потім виправляємо — і показуємо, як це все переноситься на сервер.

| Урок | Крок |
|---|---|
| 48 | образ `news_hub`: `Dockerfile`, `.dockerignore`, `/health/ready`, тести образу |
| **49** | **Compose для обох проєктів; nginx; реальний IP клієнта; деплой і бекап** |
| 50 | CI/CD: тести й збірка образу на кожен PR |

Проєкти: [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_50_compose_deploy/news_hub), [`crispy_notes_project`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_50_compose_deploy/crispy_notes_project).

**Що потрібно з попередніх уроків:** образ, том, мережа, `/health` і `/health/ready` (48); rate limit входу (39, 46); webhook Telegram (47); чат на WebSocket і channel layer (45); `set -euo pipefail` ([бонус Linux](bonus_linux.md#pipes)).

**Після уроку ти зможеш:**

- описати систему з кількох сервісів у `docker-compose.yml` і запускати її в правильному порядку;
- поставити nginx перед застосунком і не загубити реальний IP клієнта;
- тримати секрети в `.env`, не зіпсувавши значення з `$`;
- розділити «випуск» (міграції, статика) і «роботу» (сервер) — щоб масштабувати без гонок;
- розгорнути стек на сервері, оновити його, зробити бекап і відновитись з нього.

**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_50_compose_deploy/note_lesson_50_compose_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_50_compose_deploy/note_lesson_50_compose.ipynb){ .solutions-link } — читаємо `docker-compose.yml` як дані: порядок запуску за `depends_on` (топологічне сортування), підстановка `${VAR}`, IP клієнта за `X-Forwarded-For`. Docker для ноутбука не потрібен.

## Пригадай

1. Що означає `localhost` усередині контейнера (урок 49)?
2. Чим `/health` відрізняється від `/health/ready`?
3. Як працює rate limit входу адміна і за чим він рахує спроби (уроки 40, 47)?

??? success "Відповіді"

    1. Сам контейнер. Інші контейнери — за іменем у спільній мережі.
    2. `/health` — процес відповідає (його питає HEALTHCHECK образу); `/health/ready` — ще й база й Redis доступні, інакше 503.
    3. Лічильник у Redis за ключем `rate:login:<IP клієнта>`: 5 спроб за 300 с, далі 429. IP береться з `request.client.host`.

## Старт: з якого коду починаємо

| Звідки | Що там | Куди |
|---|---|---|
| `production_bot/docker-compose.yml` | сервіси `bot` (FastAPI + aiogram), `nginx`, `postgres`, `redis`, `migrate`; healthchecks, томи | `news_hub/docker-compose.yml` |
| `production_bot/nginx/default.conf` | upstream, `proxy_set_header`, таймаут для webhook | `news_hub/nginx/nginx.conf` |
| Django-книга `notes_chat_app`: `Dockerfile`, `entrypoint.sh`, `docker-compose.yml`, `nginx/nginx.conf` | `migrate` + `collectstatic` + uvicorn при старті, статика з тому, WebSocket через nginx | `crispy_notes_project/` |

### Compose за хвилину

```yaml
services:
  api:                                  # ім'я сервісу = ім'я в мережі (redis://redis:6379)
    build: .                            # або image: nginx:1.27-alpine
    env_file: .env                      # змінні для процесу в контейнері
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on:
      redis:
        condition: service_healthy      # чекати не «запущено», а «здоровий»
    healthcheck: {test: [...], interval: 10s}
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["80:80"]                    # відкрити назовні (лише те, що треба)
    profiles: [polling]                 # запускати лише з --profile polling
volumes:
  pgdata:
```

| Команда | Що робить |
|---|---|
| `docker compose up -d --build --wait` | зібрати образи, запустити все у фоні й чекати, доки всі стануть healthy (або впасти з причиною) |
| `docker compose ps`, `logs -f api` | стан сервісів; журнал одного |
| `docker compose exec api sh` | команда в запущеному контейнері |
| `docker compose down` / `down -v` | зупинити й видалити контейнери / і томи (дані!) |
| `docker compose config` | показати файл після підстановки змінних — перша перевірка при будь-якій помилці |

### Старий compose над `news_hub`

Беремо `docker-compose.yml` і `default.conf` з `production_bot`: міняємо лише шлях збірки й порт (8080 замість 80, без SSL-блоку — сертифікатів тут немає). Запускаємо й кожні 2 секунди питаємо API через nginx:

```text
$ docker compose up -d --build
t=2s: 000
t=4s: 502
t=6s: 502
t=8s: 502
t=10s: 502
t=12s: 200
```

Через півтори хвилини:

```text
$ docker compose ps
SERVICE    STATUS
bot        Up About a minute (unhealthy)
migrate    Exited (0) About a minute ago
nginx      Up About a minute
postgres   Up About a minute (healthy)
redis      Up About a minute (healthy)

$ docker inspect old49-bot-1 -f '{{range .State.Health.Log}}{{.Output}}{{end}}'
OCI runtime exec failed: exec failed: unable to start container process: exec: "curl": executable file not found in $PATH
```

Що бачимо:

- **nginx віддає 502 перші ~10 секунд**: `depends_on: [bot]` чекає лише, поки контейнер *запуститься*, а не поки API буде готовий;
- **бот «unhealthy», хоча працює**: healthcheck викликає `curl`, якого в `python:3.12-slim` немає. Будь-який сервіс з `condition: service_healthy` на бот не запустився б ніколи;
- **пароль бази** (`POSTGRES_PASSWORD: password`) — у самому `docker-compose.yml`, тобто в git.

## Рефакторинг 1. Порядок запуску: healthy, а не «запущено» { #refactor-1 }

```yaml title="news_hub/docker-compose.yml (скорочено)"
name: news_hub

x-app: &app                                  # спільне для migrate, api, bot — YAML-якір
  build: .
  image: news_hub:49
  env_file: .env
  environment: &app-env
    DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER:-news}:${POSTGRES_PASSWORD:?задай POSTGRES_PASSWORD у .env}@postgres:5432/${POSTGRES_DB:-news_hub}
    REDIS_URL: redis://redis:6379/0
  networks: [backend]

services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  migrate:
    <<: *app
    command: ["alembic", "upgrade", "head"]
    healthcheck: {disable: true}             # HEALTHCHECK образу питає :8000 — у міграцій сервера немає
    depends_on:
      postgres: {condition: service_healthy}
  api:
    <<: *app
    depends_on:
      migrate: {condition: service_completed_successfully}
      redis:   {condition: service_healthy}
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=4)"]
      start_period: 60s
      start_interval: 2s
  nginx:
    depends_on:
      api: {condition: service_healthy}
```

Як це запускається:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph T1["t ≈ 0 с: без залежностей"]
        direction LR
        P1["postgres: starting"] --> R1["redis: starting"]
    end
    subgraph T2["t ≈ 8 с: pg_isready і redis-cli ping"]
        direction LR
        P2["postgres: healthy"] --> R2["redis: healthy"] --> M2["migrate стартує"]
    end
    subgraph T3["t ≈ 12 с: alembic upgrade head"]
        direction LR
        M3["migrate: exit 0"] --> A3["api стартує"]
    end
    subgraph T4["t ≈ 21 с: /health/ready → 200"]
        direction LR
        A4["api: healthy"] --> N4["nginx стартує"]
    end
    subgraph T5["t ≈ 32 с: curl /nginx-health"]
        direction LR
        N5["nginx: healthy"] --> W5["up --wait повертає 0"]
    end
    T1 --> T2 --> T3 --> T4 --> T5

    class P1,R1,M2,A3,N4 step
    class P2,R2,M3,A4,N5 success
    class W5 success
```

```text
$ time docker compose up -d --build --wait
 Container news_hub-redis-1 Healthy
 Container news_hub-api-1 Healthy
 Container news_hub-migrate-1 Exited
 Container news_hub-postgres-1 Healthy
 Container news_hub-nginx-1 Healthy
real    0m31.680s

$ curl localhost/health/ready
{"status":"ok","checks":{"database":"ok","redis":"ok"}}
```

| Було | Стало | Чому |
|---|---|---|
| `depends_on: [bot]` | `condition: service_healthy` | nginx не віддає 502, поки API стартує |
| bot не чекав `migrate` | `service_completed_successfully` | API не приймає запити, доки таблиць немає; впали міграції — API не стартує зовсім |
| `curl` у healthcheck | `python -c urllib…` (у slim є лише python) | перевірка, що справді може спрацювати |
| healthcheck `/health` | `/health/ready` для api в Compose | nginx стартує, коли API **готовий** (база й Redis), а не лише «живий» |
| — | `healthcheck: {disable: true}` для `migrate`, `bot`, `twin` | HEALTHCHECK образу успадковують усі ролі; бот не слухає :8000 і завжди був би «unhealthy» |
| `POSTGRES_PASSWORD: password` | `${POSTGRES_PASSWORD:?…}` з `.env` | пароля в git немає; без нього `docker compose config` падає з поясненням |

`$$POSTGRES_USER` — подвійний `$`: Compose підставляє `${…}` сам, ще до запуску. `$$` означає «залиш `$` як є» — і змінну розкриє вже shell усередині контейнера postgres, де вона задана.

## Рефакторинг 2. nginx і справжній IP клієнта { #refactor-2 }

Перед API стоїть nginx: він приймає з'єднання ззовні, а API назовні взагалі не відкритий. Але тоді кожен запит до API приходить **від nginx**. Що це означає для rate limit входу (урок 47)?

```text
# старий nginx + uvicorn за замовчуванням: 5 невдалих спроб, потім адмін з правильним паролем
401 401 401 401 401
{"detail":"забагато запитів: 5 за 300 с; спробуй через 298 с"} 429

$ docker compose exec redis redis-cli --scan --pattern 'rate:*'
rate:login:172.19.0.6                  ← це IP контейнера nginx
```

Один зловмисник, п'ять неправильних паролів — і **ніхто** на сайті не може увійти п'ять хвилин. Для застосунку всі клієнти — один і той самий nginx.

Реальний IP клієнта nginx передає в заголовку `X-Forwarded-For`, а uvicorn уміє його прочитати, але довіряє лише адресам із `FORWARDED_ALLOW_IPS` (за замовчуванням — `127.0.0.1`). Перше, що спадає на думку, — «довіряти всім»:

```text
# FORWARDED_ALLOW_IPS=*  + старий nginx ($proxy_add_x_forwarded_for — ДОПИСАТИ до того, що надіслав клієнт)
$ for i in 1..8: curl -X POST /api/admin/token -H "X-Forwarded-For: 10.66.0.$i" …
401 401 401 401 401 401 401 401
rate:login:10.66.0.1
rate:login:10.66.0.2
rate:login:10.66.0.3 …
```

Тепер **ліміту немає зовсім**: клієнт сам пише собі будь-яку «адресу», і кожна спроба — з «нового IP». Захист від перебору пароля обійдено одним заголовком.

```mermaid
sequenceDiagram
    participant C as клієнт 203.0.113.7
    participant N as nginx 172.28.0.10
    participant U as uvicorn (api)
    participant R as Redis
    Note over C,R: було: $proxy_add_x_forwarded_for + FORWARDED_ALLOW_IPS=*
    C->>N: X-Forwarded-For: 10.66.0.1 (вигадано)
    N->>U: X-Forwarded-For: 10.66.0.1, 203.0.113.7
    U->>R: INCR rate:login:10.66.0.1
    Note over U: клієнт = крайній лівий — те, що написав сам клієнт
    Note over C,R: стало: nginx перезаписує, uvicorn вірить лише nginx
    C->>N: X-Forwarded-For: 10.66.0.1 (вигадано)
    N->>U: X-Forwarded-For: 203.0.113.7 ($remote_addr)
    U->>U: з'єднання від 172.28.0.10 — у FORWARDED_ALLOW_IPS
    U->>R: INCR rate:login:203.0.113.7
```

Правильно — дві речі разом:

```nginx title="news_hub/nginx/nginx.conf"
proxy_set_header X-Forwarded-For   $remote_addr;      # перезаписати, а не дописати
proxy_set_header Host              $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
```

```yaml title="news_hub/docker-compose.yml"
  api:
    environment:
      FORWARDED_ALLOW_IPS: 172.28.0.10       # вірити заголовку лише від nginx
    networks: [backend, edge]
  nginx:
    networks:
      edge:
        ipv4_address: 172.28.0.10            # фіксована адреса nginx у мережі edge
networks:
  backend: {}                                # api, база, Redis, міграції, бот
  edge:
    ipam: {config: [{subnet: 172.28.0.0/24}]}
```

```text
$ for i in 1..7: curl -X POST /api/admin/token -H "X-Forwarded-For: 10.66.0.$i" …
401 401 401 401 401 429 429
rate:login:172.28.0.1                  ← справжня адреса клієнта (з цього комп'ютера — шлюз Docker)

# інший клієнт (контейнер у мережі edge) з правильним паролем — входить:
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…
rate:login:172.28.0.3
```

Дві мережі — теж захист: база й Redis у `backend`, куди nginx не має доступу, а портів назовні в них немає зовсім.

## Рефакторинг 3. Секрети в `.env`: `$` і лапки { #refactor-3 }

Compose читає файл `.env` поруч із `docker-compose.yml` двічі: для `${ЗМІННИХ}` у самому файлі і як `env_file` для контейнерів. І в обох випадках **підставляє `$змінні`** у значеннях без лапок. bcrypt-хеш пароля адміна (урок 47) — `$2b$12$eBDJ…`:

```text
$ cat .env
ADMIN_PASSWORD_HASH=$2b$12$eBDJbnUjhmlfS7yVErP6f…
$ docker compose up -d
level=warning msg="The \"eBDJbnUjhmlfS7yVErP6f\" variable is not set. Defaulting to a blank string."
…
$ curl -X POST localhost:8080/api/admin/token -d '{"username":"admin","password":"…"}'
500
```

`$eBDJ…` — «змінна», її немає, отже порожньо: від хешу лишилось `$2b$12`. Перевірка з уроку 47 («починається з `$2`») це пропустила, і вхід падав з 500 **під час роботи**, а не при старті. Два виправлення:

- `.env.example` каже: значення з `$` — **в одинарних лапках** (так їх і друкує `python -m news_hub.security`). В одинарних лапках Compose нічого не підставляє;
- `load_admin_settings` перевіряє повний формат bcrypt — обрізаний хеш зупиняє старт з поясненням:

```python title="news_hub/security.py"
BCRYPT_HASH = re.compile(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}")     # $2b$12$ + сіль і хеш (22 + 31)
...
    if not BCRYPT_HASH.fullmatch(password_hash):
        raise RuntimeError("ADMIN_PASSWORD_HASH — bcrypt-хеш ($2b$12$ + 53 символи), а не пароль і не обрізаний "
                           "рядок; у .env для Compose — в одинарних лапках; згенеруй: python -m news_hub.security")
```

| Інструмент | Лапки | `$змінна` |
|---|---|---|
| `export X='…'` у bash | знімає | в одинарних — ні, у подвійних і без лапок — підставляє |
| `.env` для Compose | знімає | в одинарних — ні, у подвійних і без лапок — підставляє |
| `docker run --env-file` (урок 49) | **лишає** | не підставляє |

Django-ключ з `get_random_secret_key()` теж буває з `$` і `#` — тому в `.env.example` нотаток він теж в одинарних лапках.

## Рефакторинг 4. Зовнішній сервіс не зупиняє старт { #refactor-4 }

У `.env` задано бота (`BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`), а Telegram у цю мить недоступний (мережа, збій, у нас — двійник ще не запущений):

```text
$ docker compose up -d --wait
dependency failed to start: container news_hub-api-1 is unhealthy
$ docker compose logs api
aiogram.exceptions.TelegramNetworkError: HTTP Client says - ClientConnectorDNSError: Cannot connect to host twin:8081 …
ERROR:    Application startup failed. Exiting.
```

API новин лежить через те, що недоступний Telegram. Причина — `set_webhook` у lifespan (так само в `production_bot/backend/app.py`): виняток у lifespan — старт не вдався, контейнер перезапускається по колу. Реєстрація бота переїхала у фонову задачу з повторами:

```python title="news_hub/api.py"
async def start_bot(app: FastAPI) -> None:
    ...
    app.state.bot_setup = asyncio.create_task(register_bot(bot, settings))


TELEGRAM_RETRY_DELAYS = (1, 2, 5, 10, 30)       # секунд між спробами; далі — кожні 30 с


async def register_bot(bot: Bot, settings: BotSettings) -> bool:
    for attempt in itertools.count():
        try:
            if settings.webhook_url:
                await bot.set_webhook(settings.webhook_url, secret_token=settings.webhook_secret,
                                      allowed_updates=["message"])
            await set_commands(bot)
            logger.info("Telegram: бот зареєстрований (спроба %s)", attempt + 1)
            return True
        except TelegramUnauthorizedError:
            logger.error("Telegram: BOT_TOKEN не прийнято (401) — бот не працюватиме, API працює")
            return False
        except (TelegramAPIError, OSError) as error:
            delay = TELEGRAM_RETRY_DELAYS[min(attempt, len(TELEGRAM_RETRY_DELAYS) - 1)]
            logger.warning("Telegram недоступний (%s): повтор через %s с", error, delay)
            await asyncio.sleep(delay)
```

```text
$ docker compose up -d --wait
 Container news_hub-api-1 Healthy
 Container news_hub-nginx-1 Healthy
api-1  | 10:01:02 WARNING news_hub: Telegram недоступний (… Cannot connect to host twin:8081 …): повтор через 1 с
api-1  | 10:01:03 WARNING news_hub: Telegram недоступний (…): повтор через 2 с
api-1  | 10:01:05 WARNING news_hub: Telegram недоступний (…): повтор через 5 с
$ docker compose --profile twin up -d twin
api-1  | 10:01:20 INFO news_hub: Telegram: бот зареєстрований (спроба 5)
```

Повний шлях webhook — теж через nginx, як від справжнього Telegram:

```text
$ curl -X POST localhost:8081/_twin/say -d '{"text": "/subscribe бюджет", "chat_id": 2002}'
{"mode": "webhook", "status": 200}
$ curl 'localhost:8081/_twin/sent?chat_id=2002'
['✅ Підписка на «бюджет»']
nginx-1  | 172.28.0.3 - - [28/Sep/2026:09:53:05 +0000] "POST /api/telegram/webhook HTTP/1.1" 200 11
```

Той самий принцип для LLM (урок 44): без ключа чи з лежачим провайдером API стартує, а аналіз відповідає 503.

## Рефакторинг 5. Django: випуск окремо від роботи { #refactor-5 }

Файли Django-книги над `crispy_notes_project`:

```sh title="entrypoint.sh (Django-книга)"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec python -m uvicorn notes_project.asgi:application --host 0.0.0.0 --port 8001 --reload
```

Що показав запуск:

```text
# 1. compose книги монтує папку проєкту в контейнер (.:/app), і chmod +x з Dockerfile зникає:
Error: exec: "./entrypoint.sh": permission denied
$ git ls-files -s entrypoint.sh
100644 … entrypoint.sh                       ← у git файл не виконуваний (на Windows Docker Desktop цього не видно)

# 2. дві репліки web на чистій базі, три запуски — друга падає щоразу:
web-2  | psycopg.errors.UniqueViolation: duplicate key value violates unique constraint "pg_type_typname_nsp_index"
web-2  | DETAIL:  Key (typname, typnamespace)=(auth_permission, 2200) already exists.
web-2  | django.db.utils.ProgrammingError: column "name" of relation "django_content_type" does not exist

# 3. nginx на порту 8080 — вхід формою:
http://localhost:8080 403  Origin checking failed - http://localhost:8080 does not match any trusted origins.
http://localhost:8001 302 /notes/                ← напряму, минаючи nginx, — працює
```

- **Міграції при старті кожного контейнера** — гонка: дві репліки одночасно створюють ті самі таблиці. Міграції — це крок **випуску** нової версії, він має виконатись один раз;
- **`$host` у nginx відкидає порт.** Django порівнює `Origin: http://localhost:8080` з адресою сайту, яку бачить у `Host` (`localhost`) — не збігається, форма відхилена. У книзі nginx слухає порт 80, тому там цього не видно; але на сервері, де 80 зайнятий, чи локально на 8080 — кожна форма дає 403;
- **`--reload`** — для розробки: стежить за файлами й перезапускає процес. У контейнері продакшну змін файлів немає;
- у самому проєкті нотаток не було `STATIC_ROOT` (`collectstatic` → `ImproperlyConfigured`), а `DEBUG` за замовчуванням — `1`: через nginx віддавалась сторінка помилки з `DEBUG = True`.

```yaml title="crispy_notes_project/docker-compose.yml (скорочено)"
  release:                                   # випуск: один раз на запуск стеку
    <<: *app
    command: ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput --clear"]
    volumes: [staticfiles:/app/staticfiles]
    depends_on: {db: {condition: service_healthy}}
  web:                                       # робота: скільки завгодно реплік
    <<: *app
    depends_on:
      release: {condition: service_completed_successfully}
      redis:   {condition: service_healthy}
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - staticfiles:/staticfiles:ro          # статику віддає nginx, не Django
```

```dockerfile title="crispy_notes_project/Dockerfile (кінець)"
USER app
HEALTHCHECK … CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/', timeout=4)"]
CMD ["daphne", "--bind", "0.0.0.0", "--port", "8000", "--proxy-headers", "hello_project.asgi:application"]
```

У налаштуваннях — те, що на сервері вмикається змінними, а не правкою коду:

```python title="hello_project/settings.py"
if not DEBUG and SECRET_KEY == DEV_SECRET_KEY:          # ключ з git на сервері — не стартуємо
    raise ImproperlyConfigured("DJANGO_DEBUG=0: задай DJANGO_SECRET_KEY …")

STATIC_ROOT = Path(os.environ.get("DJANGO_STATIC_ROOT", BASE_DIR / "staticfiles"))

if os.environ.get("DJANGO_HTTPS") == "1":                # TLS знімає nginx перед Django
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o]
```

```text
$ docker compose up -d --build --wait
$ docker compose ps
db        Up 26 seconds (healthy)
nginx     Up 10 seconds (healthy)
redis     Up 26 seconds (healthy)
release   Exited (0) 14 seconds ago
web       Up 14 seconds (healthy)
$ curl localhost:8080/health/
{"status": "ok", "checks": {"database": "ok", "redis": "ok"}}
$ python csrf_login.py http://localhost:8080
http://localhost:8080 302 /notes/
$ curl -o /dev/null -w '%{http_code}' localhost:8080/static/admin/css/base.css
200
$ docker compose exec web python manage.py check --deploy        # скорочено: лише коди попереджень
W004 SECURE_HSTS_SECONDS · W008 SECURE_SSL_REDIRECT · W012 SESSION_COOKIE_SECURE · W016 CSRF_COOKIE_SECURE
System check identified 4 issues (0 silenced).
$ docker compose exec -e DJANGO_HTTPS=1 web python manage.py check --deploy
W005 SECURE_HSTS_INCLUDE_SUBDOMAINS · W008 SECURE_SSL_REDIRECT · W021 SECURE_HSTS_PRELOAD
System check identified 3 issues (0 silenced).
```

Без HTTPS чотири попередження — очікувані: сайт на http. З `DJANGO_HTTPS=1` лишаються три свідомі рішення: HSTS для піддоменів і preload вмикають, лише коли **всі** піддомени на https, а перенаправлення http → https робить nginx.

### Дві репліки і чат

```text
$ docker compose up -d --scale web=2 --wait
до перезапуску nginx:     web-1: 10 запитів, web-2: 0
$ docker compose exec nginx nginx -s reload
після nginx -s reload:    web-1: 7,  web-2: 3
```

nginx визначає адреси `web` **один раз, при старті**: нову репліку він не бачить до `nginx -s reload`. Далі чат (урок 46): Олена й Тарас підключаються через nginx, кожен може потрапити на іншу репліку.

```text
# REDIS_URL задано — RedisChannelLayer
Redis, run 1: [з'єднань на web-1 / web-2: 2 / 3] taras отримав: {'type': 'message', …, 'content': 'Привіт з першої вкладки'}
… 4 з 4 доставлено
# REDIS_URL порожній — InMemoryChannelLayer
InMemory: доставлено 1, не доставлено 5 з 6
чужий Origin: handshake 403
```

У пам'яті процесу канал бачить лише своя репліка: повідомлення доходить, тільки якщо обоє випадково на одній. Саме тому channel layer — у Redis (урок 46), і тепер це видно на справжніх двох процесах.

Те саме правило — для throttle входу (урок 41: 5 спроб за хвилину на `/api/token/`). DRF рахує спроби в **кеші Django**, а типовий кеш — пам'ять процесу. Тому в `settings.py` кеш теж у Redis, коли є `REDIS_URL`:

```python
# Кеш Django — у ньому DRF рахує спроби throttle («login»: 5/min). Типовий кеш — пам'ять ОДНОГО процесу:
# з --scale web=2 кожна репліка рахувала б свої 5 спроб. REDIS_URL є → кеш спільний для всіх процесів.
if REDIS_URL:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}}
```

```text
$ for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:8080/api/token/ …; done
401 401 401 401 401 429 429 429 429 429 429 429
web-1: 4 запити, web-2: 8
$ docker compose exec redis redis-cli --scan --pattern '*throttle*'
:1:throttle_login_172.19.0.1
```

Запити розійшлися по двох репліках, а ліміт один: шоста спроба — 429.

## Деплой на сервер { #deploy }

Сервер — це звичайний Linux з Docker (VPS за кілька доларів на місяць). Кроки нижче — стандартні; у середовищі, де писався урок, справжнього сервера не було, тому все, що стосується самого стеку, перевірено локально тими самими командами, а кроки сервера (SSH, firewall, DNS, сертифікат) — ні.

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    S1["сервер: користувач deploy,<br>вхід лише за SSH-ключем"]
    S2["Docker Engine + Compose<br>firewall: 22, 80, 443"]
    S3["git clone у /srv/course"]
    S4[".env з .env.example<br>chmod 600 .env"]
    S5["docker compose up -d --build --wait"]
    S6{"curl /health/ready<br>→ 200?"}
    S7["DNS → IP сервера,<br>TLS: certbot чи Caddy"]
    S8["cron: scripts/backup.sh<br>щоночі"]
    S9["docker compose logs api"]
    S1 --> S2 --> S3 --> S4 --> S5 --> S6
    S6 -->|так| S7 --> S8
    S6 -->|ні| S9 --> S5

    class S1,S2,S3,S5 step
    class S4 warning
    class S6 decision
    class S7,S8 success
    class S9 error
```

```bash
# 1. на сервері (Ubuntu 24.04), від root один раз
adduser deploy && usermod -aG docker deploy      # docker — фактично root: лише довіреним
# вхід за ключем (довідник Linux, розділ 7), у /etc/ssh/sshd_config: PasswordAuthentication no
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable

# 2. від deploy
git clone https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026.git /srv/course
cd /srv/course/module_5/lessons/lesson_50_compose_deploy/news_hub
cp .env.example .env && chmod 600 .env && nano .env
docker compose up -d --build --wait
curl localhost/health/ready
```

!!! warning "Docker і firewall"
    `ports: ["5432:5432"]` відкриває порт **в обхід ufw**: Docker сам пише правила iptables. Тому в `docker-compose.yml` портів у бази й Redis немає зовсім, а для розробки — окремий `docker-compose.dev.yml` з `127.0.0.1:5432:5432`.

**HTTPS.** Telegram надсилає webhook лише на https, браузери вимагають його для форм входу. Два типові шляхи: certbot на сервері отримує сертифікат Let's Encrypt, а в `nginx.conf` додається блок `listen 443 ssl` з `ssl_certificate` (як у `production_bot`); або перед стеком ставлять Caddy, який отримує й оновлює сертифікати сам. Для Django після цього — `DJANGO_HTTPS=1` і `DJANGO_CSRF_TRUSTED_ORIGINS=https://домен`.

**Оновлення.**

```bash
git pull && docker compose up -d --build --wait
```

```text
 Image news_hub:49 Built
 Container news_hub-postgres-1 Running
 Container news_hub-redis-1 Running
 Container news_hub-migrate-1 Recreated        ← нова версія: міграції знову, один раз
 Container news_hub-api-1 Recreated
 Container news_hub-nginx-1 Running
```

Перезапускається лише змінене. Але поки старий api зупинено, а новий стартує, — простій: запити кожні 0.5 с під час оновлення дали `200 ×38, 502 ×21, 000 ×1` (~10 с). Без простою — дві репліки й перезапуск по черзі, або новий стек поруч і перемикання nginx (blue-green); для навчального проєкту 10 секунд — прийнятна ціна простоти.

**Бекап і відновлення.** `scripts/backup.sh` — `pg_dump` з контейнера, `set -euo pipefail`, недописаний файл видаляється:

```text
$ ./scripts/backup.sh
бекап: backups/news_hub-20260928-094724.sql.gz (20K)
$ curl -X DELETE localhost/api/news -H "Authorization: Bearer …"      # «аварія»
$ curl localhost/api/news/count
{"count":0}
$ ./scripts/restore.sh backups/news_hub-20260928-094724.sql.gz
відновлено з backups/news_hub-20260928-094724.sql.gz
$ curl localhost/api/news/count
{"count":168}

$ docker compose stop postgres && ./scripts/backup.sh; echo "код: $?"
service "postgres" is not running
код: 1                                   ← і жодного порожнього файлу в backups/
```

Бекап, з якого жодного разу не відновлювались, — не бекап. На сервері: `cron` щоночі + копія файлу **на інший сервер** (диск може вмерти разом з базою).

## Архітектура { #architecture }

```mermaid
graph LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    U["користувачі,<br>Telegram"]
    subgraph EDGE["мережа edge"]
        NG["nginx :80<br>172.28.0.10"]
    end
    subgraph BACK["мережа backend"]
        API["api ×N<br>uvicorn"]
        MIG["migrate<br>один раз"]
        BOT["bot<br>profile polling"]
        PG[("postgres<br>том pgdata")]
        RD[("redis")]
    end
    ENV[".env<br>секрети"]
    U -->|":80"| NG -->|"X-Forwarded-For"| API
    MIG --> PG
    API --> PG
    API --> RD
    BOT --> PG
    BOT --> RD
    ENV -.-> API
    ENV -.-> BOT
    ENV -.-> PG

    class NG decision
    class API,BOT step
    class MIG warning
    class PG,RD success
    class ENV warning
    class U step
```

| Сервіс | Образ | Назовні | Скільки | Чекає |
|---|---|---|---|---|
| nginx | `nginx:1.27-alpine` | `:80` | 1 | api healthy |
| api | `news_hub:49` | — | 1…N | migrate завершився, redis healthy |
| migrate | `news_hub:49` | — | один раз | postgres healthy |
| bot | `news_hub:49` | — | 1 (profile) | migrate, redis |
| postgres, redis | офіційні | — | 1 | — |

Проєкт нотаток влаштований так само: `nginx` → `web ×N` (daphne), `release` замість `migrate` (міграції + статика), `db`, `redis` (channel layer чату); статику nginx читає зі спільного тому `staticfiles`.

## Тести { #tests }

| Де | Що перевіряє | Тестів |
|---|---|---|
| `news_hub/tests/unit/test_security.py` | обрізаний хеш (як після підстановки Compose) → помилка при старті | +1 |
| `news_hub/tests/integration/test_telegram_webhook.py` | Telegram недоступний → API стартує, реєстрація повторюється й завершується, коли «Telegram» з'явився; неправильний токен (401) → бот вимкнено, API працює | +2 |
| `crispy_notes_project/hello_app/tests_deploy.py` | `/health/` (ок і Redis недоступний → 503); `DEBUG=0` без ключа → `ImproperlyConfigured`; з ключем — старт; `DJANGO_HTTPS=1` → secure cookies, `SECURE_PROXY_SSL_HEADER`, trusted origins | 5 |

```text
news_hub:             343 passed (SQLite + fakeredis; PostgreSQL 16 + Redis 7; Python 3.10 з мінімальними версіями)
                      pytest -m docker: 6 passed
crispy_notes_project: Ran 81 tests … OK
```

Сам стек (порядок запуску, nginx, IP клієнта, webhook, бекап, репліки й чат) перевірено наживо командами вище. У уроці 51 частина цього переїде в CI: збірка образу й smoke-запуск на кожен PR.

## Як обрати, де запускати { #how-to-choose }

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    Q0["застосунок готовий<br>до публікації"]
    Q1{"хочеш сам керувати<br>сервером?"}
    Q2{"потрібні десятки серверів,<br>автомасштаб, без простою?"}
    P["PaaS: Render, Fly.io, Railway<br>образ + керована база"]
    C["VPS + Docker Compose<br>цей урок"]
    K["Kubernetes<br>довідник Linux, розділ 17"]
    Q0 --> Q1
    Q1 -->|ні| P
    Q1 -->|так| Q2
    Q2 -->|ні| C
    Q2 -->|так| K

    class Q0 step
    class Q1,Q2 decision
    class C success
    class P,K step
```

Той самий образ підходить для всіх трьох: PaaS і Kubernetes запускають контейнер з тими самими змінними середовища й перевірками здоров'я. Compose на одному сервері — найпростіший спосіб, де видно кожну частину системи.

## Практика { #practice }

### Розібраний приклад: дві репліки API

Rate limit, кеш і статуси задач `news_hub` зберігає в Redis (урок 40), а не в пам'яті процесу. Отже, API можна запустити в кількох копіях:

```bash
docker compose up -d --scale api=2 --wait
docker compose exec nginx nginx -s reload        # nginx дізнається про нову репліку
for i in $(seq 1 7); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost/api/admin/token \
    -H 'content-type: application/json' -d '{"username":"admin","password":"guess'$i'"}'; done
```

```text
 Container news_hub-api-1 Healthy
 Container news_hub-api-2 Healthy
401 401 401 401 401 429 429
news_hub-api-1: 5 запитів
news_hub-api-2: 2 запити
```

Запити розійшлися по двох процесах, а ліміт спрацював на шостій спробі — лічильник один, у Redis. Якби rate limit жив у словнику Python, кожна репліка рахувала б свої п'ять — і з N репліками зловмисник мав би 5·N спроб.

### Зміни приклад

1. Прибери з api `FORWARDED_ALLOW_IPS` (uvicorn повернеться до `127.0.0.1`). Який ключ з'явиться в Redis після спроби входу?
2. У `nginx.conf` заміни `$http_host` на `$host` і відкрий стек нотаток на порту 8080. Що станеться з формою входу?

??? success "Що покаже запуск"

    1. `rate:login:172.28.0.10` — адреса nginx: заголовку `X-Forwarded-For` від нього uvicorn більше не вірить, і всі клієнти знову «одна людина».
    2. `403 Origin checking failed - http://localhost:8080 does not match any trusted origins.` — Django бачить `Host: localhost` без порту. На порту 80 різниці не видно, тому помилка «з'являється» лише на сервері з іншим портом чи за іншим проксі.

### Спробуй самостійно: бекап за розкладом у Compose

Додай сервіс `backup` з профілем `backup`: образ `postgres:16-alpine`, щоночі (або кожні N секунд для перевірки) робить `pg_dump | gzip` у том `backups`, зберігає останні 7 файлів.

**Критерії перевірки:**

- пароль — з `.env`, не в `docker-compose.yml`;
- `set -euo pipefail`: недоступна база — жодного порожнього файлу;
- `./scripts/restore.sh` відновлює базу з файлу, зробленого сервісом;
- без `--profile backup` сервіс не запускається.

### Знайди помилку { #find-bug }

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: news_hub
      POSTGRES_USER: news
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
  api:
    image: news_hub:49
    environment:
      DATABASE_URL: postgresql+asyncpg://news:${POSTGRES_PASSWORD}@localhost:5432/news_hub
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on: [db, redis]
  redis:
    image: redis:7-alpine
```

```text
$ docker compose up -d && sleep 20 && docker compose ps
api     Up 22 seconds (healthy)   0.0.0.0:8000->8000/tcp
db      Up 22 seconds             0.0.0.0:5432->5432/tcp
redis   Up 22 seconds             6379/tcp
$ curl localhost:8000/health/ready
{"status":"unavailable","checks":{"database":"ConnectionRefusedError","redis":"ok"}}
```

`docker compose ps` каже «healthy». Що не так? Знайди три проблеми.

??? success "Відповідь"

    1. **`localhost` у `DATABASE_URL`.** У контейнері api `localhost` — сам api, бази там немає: `ConnectionRefusedError`. Адреса — ім'я сервісу: `@db:5432`.
    2. **Порт бази відкритий усьому світу.** `"5432:5432"` на сервері — це `0.0.0.0:5432`, і Docker пропускає його в обхід ufw. Для api цей порт не потрібен (вони в одній мережі). Для розробки — `127.0.0.1:5432:5432` в окремому файлі.
    3. **`depends_on` без умов і без міграцій.** api стартує, щойно контейнер db запущений, а не готовий, і таблиць ніхто не створює. Потрібні healthcheck у db, `condition: service_healthy` і окремий `migrate` з `service_completed_successfully`.

    А «healthy» — бо HEALTHCHECK образу питає `/health` (процес живий), і це правда. Готовність до роботи показує `/health/ready` — саме її Compose має чекати перед nginx.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| `depends_on` | лише з `condition`: `service_healthy`, `service_completed_successfully` |
| healthcheck | інструментом, що є в образі; для API в Compose — готовність (`/health/ready`) |
| випуск і робота | міграції й статика — окремим one-shot сервісом; сервер — скільки завгодно реплік |
| nginx | `X-Forwarded-For $remote_addr` + довіра лише адресі nginx; `Host $http_host` |
| мережі й порти | назовні — лише nginx; база й Redis — без `ports`; Docker обходить ufw |
| `.env` | поза git; значення з `$` — в одинарних лапках; `${VAR:?…}` — обов'язкові |
| зовнішні сервіси | Telegram, LLM недоступні → API однаково стартує |
| сервер | ключ SSH, firewall, `.env` 600, `up -d --build --wait`, TLS, бекап + перевірка відновлення |

### Самоперевірка

1. Чим `depends_on: [api]` відрізняється від `condition: service_healthy`?
2. Чому міграції — окремий сервіс, а не перший рядок `entrypoint.sh`?
3. Навіщо nginx перезаписує `X-Forwarded-For`, якщо uvicorn і так вірить лише nginx?
4. У `.env` без лапок `ADMIN_PASSWORD_HASH=$2b$12$abc…`. Що отримає застосунок?
5. Чому бот у Compose має `healthcheck: disable: true`?
6. Що перевірити після кожного бекапу?

??? success "Відповіді"

    1. Перше чекає, поки контейнер **запуститься** (процес створено) — API ще не відповідає. Друге — поки його healthcheck поверне успіх.
    2. Кілька реплік одночасно запускають міграції й конфліктують (у Django-проєкті друга репліка падала 3 з 3 разів). Випуск — один раз, робота — у N копіях.
    3. Вірити лише nginx — щоб клієнт не міг звернутися до API напряму з вигаданим заголовком. Перезаписувати — щоб вигаданий клієнтом заголовок не дійшов до API навіть через nginx. Кожне окремо закриває одну дірку.
    4. `$2b$12` — решту Compose сприйняв як змінні й підставив порожнечу (з попередженням). Тепер це помилка при старті; раніше — 500 на кожен вхід.
    5. HEALTHCHECK образу питає `:8000/health`, а бот не сервер — він був би «unhealthy» завжди, і `up --wait` падав би.
    6. Що з нього відновлюється: `restore.sh` на копії стеку й перевірка даних. Плюс копія на інший сервер.

### Що далі

- Ноутбук заняття: [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_50_compose_deploy/note_lesson_50_compose_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_50_compose_deploy/note_lesson_50_compose.ipynb){ .solutions-link }.
- Урок 51: те, що тут перевіряли руками, — тести, типи, збірка образу, smoke-запуск — робить GitHub Actions на кожен PR.

## Документація і джерела

- Код: [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_50_compose_deploy/news_hub) — `docker-compose.yml` і `nginx.conf` зі стартового `production_bot`; [`crispy_notes_project`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_50_compose_deploy/crispy_notes_project) — Docker-файли з Django-книги [notes_chat_app](https://nikoriakviktor.github.io/notes_chat_app/).
- Поглиблено в Django-книзі: крок 8–9 — Docker Compose, entrypoint, nginx, PostgreSQL, Redis, production checklist ([розділ «Деплой»](https://nikoriakviktor.github.io/notes_chat_app/)).
- Docker Compose: [Compose file reference](https://docs.docker.com/reference/compose-file/), [services: depends_on, healthcheck, profiles](https://docs.docker.com/reference/compose-file/services/), [interpolation](https://docs.docker.com/reference/compose-file/interpolation/), [`.env` і env_file](https://docs.docker.com/compose/how-tos/environment-variables/), [networks](https://docs.docker.com/reference/compose-file/networks/), [startup order](https://docs.docker.com/compose/how-tos/startup-order/).
- Docker і firewall: [Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/).
- nginx: [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [WebSocket proxying](https://nginx.org/en/docs/http/websocket.html), [variables](https://nginx.org/en/docs/varindex.html).
- uvicorn: [settings — `--forwarded-allow-ips`, `--proxy-headers`](https://www.uvicorn.org/settings/). Django: [deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/), [`SECURE_PROXY_SSL_HEADER`](https://docs.djangoproject.com/en/5.2/ref/settings/#secure-proxy-ssl-header), [`CSRF_TRUSTED_ORIGINS`](https://docs.djangoproject.com/en/5.2/ref/settings/#csrf-trusted-origins). Channels: [channel layers](https://channels.readthedocs.io/en/latest/topics/channel_layers.html).
- PostgreSQL: [`pg_dump`](https://www.postgresql.org/docs/16/app-pgdump.html). Let's Encrypt: [certbot](https://certbot.eff.org/).
