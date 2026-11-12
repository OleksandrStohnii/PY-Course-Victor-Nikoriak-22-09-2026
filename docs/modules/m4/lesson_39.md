# Урок 39. FastAPI + SQLAlchemy: повний CRUD

В уроці 38 агрегатор став HTTP-сервісом, але новини лежать у `NewsStore` — словнику в пам'яті процесу. Зупинили сервер — новин немає; запустили два процеси uvicorn — у кожного свої новини. Сьогодні агрегатор отримує **базу даних**: новини переживають перезапуск, унікальність `url` гарантує сама база, а API вміє повний CRUD окремої новини.

Знову не з нуля: є готовий шар бази — стартовий `production_bot` (Telegram-бот з адмін-API): async SQLAlchemy 2.0, репозиторії, Alembic-міграції. Беремо його і робимо три рефакторинги `news_hub` з уроку 38.

| Урок | Крок агрегатора |
|---|---|
| 36 | парсер з типами; `NewsItem` на Pydantic |
| 37 | FastAPI: `GET /api/news`, `POST /api/scrape`, `/docs`, Postman |
| **38** | **SQLAlchemy: новини в базі, унікальний `url`, повний CRUD, Alembic** |
| 39 | middleware, кеш і rate limit на Redis |
| 41 | тести API |
| 43 | Gemini: підсумок, категорія, тональність |
| 47 | Telegram-бот |
| 48–50 | Docker, Compose, CI/CD |

Проєкт: [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/news_hub).

**Що потрібно з попередніх уроків:** SQL — таблиці, `UNIQUE`, `GROUP BY`, транзакції, параметри замість f-рядків (урок 30); `async`/`await` (27); FastAPI, `Depends`, `lifespan`, `TestClient` (37); `NewsItem` (36).

**Після уроку ти зможеш:**

- описати таблицю моделлю SQLAlchemy 2.0 (`Mapped`, `mapped_column`) і відрізнити її від Pydantic-моделі;
- підключити async-engine і дати кожному HTTP-запиту свою сесію й транзакцію;
- винести SQL у репозиторій і прочитати SQL, який генерує SQLAlchemy;
- написати повний CRUD з правильними кодами: `201`, `404`, `409`, `204`;
- створити й застосувати міграцію Alembic;
- пояснити, чому «перевір, а потім встав» ламається під навантаженням.

**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/note_lesson_39_sqlalchemy_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/note_lesson_39_sqlalchemy.ipynb){ .solutions-link } — база й CRUD на SQLite, без встановлення PostgreSQL.

**Довідник:** [FastAPI: архітектура, async і production-патерни](fastapi/fastapi_documentation.md) — розділи 6–8: пул з'єднань, Repository, Unit of Work.

## Пригадай

1. Що зробить PostgreSQL з `INSERT`, який порушує `UNIQUE` (урок 30)?
2. Що буде з уже виконаними змінами транзакції, якщо в ній стався виняток?
3. Навіщо в уроці 38 сховище отримували через `Depends`, а не глобальною змінною?

??? success "Відповіді"

    1. Відхилить рядок з помилкою `duplicate key value violates unique constraint`. Обмеження перевіряє сама база — для будь-якої програми, що в неї пише.
    2. `ROLLBACK` скасує всі зміни транзакції: або все, або нічого.
    3. Щоб замінити реалізацію, не чіпаючи ендпоінтів. Сьогодні саме це й зробимо: `NewsStore` → `NewsRepository`.

## Старт: з якого коду починаємо

`production_bot` — Telegram-бот з адмін-API на FastAPI. Нам потрібен його **шар бази**, а не бот:

| Файл `production_bot` | Що в ньому | Куди в `news_hub` |
|---|---|---|
| `backend/core/database.py` | `create_async_engine` з пулом, `async_sessionmaker`, `Base`, `get_db` з COMMIT/ROLLBACK | `news_hub/db.py` |
| `backend/models/user.py` | модель таблиці: `Mapped[...]`, `mapped_column(...)` | `news_hub/tables.py` — `NewsRow` |
| `backend/repositories/base.py` | `BaseRepository[ModelT]`: `get`, `create`, `delete`, `count` | `news_hub/repository.py` |
| `alembic.ini`, `migrations/env.py` | async-міграції | `alembic.ini`, `migrations/` |
| `docker-compose.yml`, сервіс `postgres` | PostgreSQL 16 з volume і healthcheck | `docker-compose.yml` |
| бот, JWT, Redis, платежі | — | уроки 40, 41, 48 |

## Рефакторинг 1. Engine, сесії й таблиця { #refactor-1 }

### `db.py`: підключення

```python title="news_hub/db.py (скорочено)"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///news_hub.db")


def make_engine(url: str = DATABASE_URL, echo: bool = False, **options: Any) -> AsyncEngine:
    if url.startswith("postgresql"):
        return create_async_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True, echo=echo, **options)
    ...                                            # SQLite: без пулу на 10 з'єднань


engine = make_engine()
SessionFactory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


class Base(DeclarativeBase):
    """Базовий клас моделей; Base.metadata — реєстр таблиць для Alembic і тестів."""
```

- **`DATABASE_URL`** — адреса бази в одному рядку: `postgresql+asyncpg://news:news@localhost:5432/news_hub` — діалект (`postgresql`), драйвер (`asyncpg`), користувач, пароль, хост, порт, база. Береться зі змінної середовища, тож код однаковий для ноутбука, тестів і сервера.
- **Без `DATABASE_URL`** — файл SQLite `news_hub.db` поруч із проєктом: урок і ноутбук працюють без PostgreSQL. У `production_bot` адреса була лише PostgreSQL.
- **`engine`** — пул з'єднань: 10 постійно відкритих, до 20 тимчасових на піку, `pool_pre_ping` перевіряє з'єднання перед видачею. Чому пул — розділ 6 [довідника](fastapi/fastapi_documentation.md#s6).
- **`SessionFactory`** — фабрика сесій. **Сесія** — робоче місце одного запиту: у ній накопичуються зміни, а `commit()` відправляє їх однією транзакцією.

### `tables.py`: таблиця як клас

```python title="news_hub/tables.py"
class NewsRow(Base):
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(500), unique=True)    # унікальність гарантує база, а не код
    title: Mapped[str] = mapped_column(String(300))
    source: Mapped[str] = mapped_column(String(100), index=True)
    lang: Mapped[str] = mapped_column(String(2), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    published_time: Mapped[time | None] = mapped_column(Time)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

`Mapped[str]` — стовпець `NOT NULL`, `Mapped[time | None]` — може бути `NULL`: ті самі анотації типів з уроку 37 описують і таблицю. Який SQL з цього вийде в PostgreSQL (у папці `news_hub`):

```python
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

from news_hub.tables import NewsRow

print(CreateTable(NewsRow.__table__).compile(dialect=postgresql.dialect()))
for index in sorted(NewsRow.__table__.indexes, key=lambda i: i.name):
    print(CreateIndex(index).compile(dialect=postgresql.dialect()))
```

```text

CREATE TABLE news (
	id SERIAL NOT NULL,
	url VARCHAR(500) NOT NULL,
	title VARCHAR(300) NOT NULL,
	source VARCHAR(100) NOT NULL,
	lang VARCHAR(2) NOT NULL,
	category VARCHAR(100) NOT NULL,
	published_time TIME WITHOUT TIME ZONE,
	scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (url)
)


CREATE INDEX ix_news_category ON news (category)
CREATE INDEX ix_news_lang ON news (lang)
CREATE INDEX ix_news_source ON news (source)
```

### Дві моделі однієї новини

| | `NewsItem` (Pydantic, `models.py`) | `NewsRow` (SQLAlchemy, `tables.py`) |
|---|---|---|
| Навіщо | **перевірити** дані з парсера чи тіла запиту | **зберегти** рядок таблиці |
| Звідки поля | з HTML і URL | з бази: `id`, `scraped_at` дає PostgreSQL |
| Правила | довжина заголовка, домен rbc.ua, `Literal["uk", "ru"]` | типи стовпців, `UNIQUE`, `NOT NULL`, індекси |
| Коли працює | до запису | під час запису й читання |

Відповідь API — `NewsOut(NewsItem)` з полями `id` і `scraped_at` та `from_attributes=True`: Pydantic будує її прямо з об'єкта `NewsRow`.

## Рефакторинг 2. Репозиторій замість `NewsStore` { #refactor-2 }

`NewsRepository` має **ті самі методи**, що `NewsStore` з уроку 38: `add_many`, `find`, `count`, `stats`, `clear`. Тому ендпоінти майже не змінилися:

```diff title="news_hub/api.py: було (37) → стало (38)"
-StoreDep = Annotated[NewsStore, Depends(get_store)]
+SessionDep = Annotated[AsyncSession, Depends(get_db, scope="function")]
+
+def get_repo(session: SessionDep) -> NewsRepository:
+    return NewsRepository(session)
+
+RepoDep = Annotated[NewsRepository, Depends(get_repo)]

-@app.get("/api/news", response_model=list[NewsItem], ...)
-async def list_news(store: StoreDep, ...) -> list[NewsItem]:
-    return store.find(skip=skip, limit=limit, category=category, source=source, lang=lang or "")
+@app.get("/api/news", response_model=list[NewsOut], ...)
+async def list_news(repo: RepoDep, ...) -> list[NewsRow]:
+    return await repo.find(skip=skip, limit=limit, category=category, source=source, lang=lang or "")
```

Було: словник і list comprehension у пам'яті. Стало: SQL-запит. Подивимось, який SQL будує SQLAlchemy для трьох методів репозиторію:

```python
from sqlalchemy import func, select

pg = postgresql.dialect()

find = select(NewsRow).where(NewsRow.lang == "uk").order_by(NewsRow.id).offset(0).limit(5)
print(find.compile(dialect=pg), "\n")

stats = select(NewsRow.lang, func.count()).group_by(NewsRow.lang).order_by(func.count().desc(), NewsRow.lang)
print(stats.compile(dialect=pg), "\n")

add_many = (postgresql.insert(NewsRow)
            .values(url="https://www.rbc.ua/ukr/news/x.html", title="Заголовок новини", source="rbc.ua",
                    lang="uk", category="Новини", published_time=None)
            .on_conflict_do_nothing(index_elements=["url"]).returning(NewsRow.id))
print(add_many.compile(dialect=pg))
```

```text
SELECT news.id, news.url, news.title, news.source, news.lang, news.category, news.published_time, news.scraped_at
FROM news
WHERE news.lang = %(lang_1)s::VARCHAR ORDER BY news.id
 LIMIT %(param_1)s::INTEGER OFFSET %(param_2)s::INTEGER

SELECT news.lang, count(*) AS count_1
FROM news GROUP BY news.lang ORDER BY count(*) DESC, news.lang

INSERT INTO news (url, title, source, lang, category, published_time) VALUES (%(url)s::VARCHAR, %(title)s::VARCHAR, %(source)s::VARCHAR, %(lang)s::VARCHAR, %(category)s::VARCHAR, %(published_time)s::TIME WITHOUT TIME ZONE) ON CONFLICT (url) DO NOTHING RETURNING news.id
```

- `%(lang_1)s`, `%(param_1)s` — **параметри**: значення йдуть окремо від SQL, як в уроці 30. SQL-ін'єкція через фільтр `?lang=` неможлива.
- `stats` рахує в базі (`GROUP BY`), а не тягне всі рядки в Python.
- `add_many` — один `INSERT` на весь збір: `ON CONFLICT (url) DO NOTHING` — дублікат **пропускає база**, `RETURNING news.id` повертає id лише вставлених рядків, тож `len(...)` — «скільки нових».

### Покроково: повторний збір з `ON CONFLICT`

Той самий знімок збираємо вдруге. Для кожного рядка PostgreSQL бере наступне значення лічильника `id` **до** перевірки `UNIQUE`:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph S0 ["перший збір: 168 новин"]
        direction LR
        a0["id 1 … 168<br>вставлено 168"] ~~~ a1["лічильник id = 168"]
    end
    subgraph S1 ["другий збір, рядок 1: url уже є"]
        direction LR
        b0["nextval → 169"] --> b1{"url у news?"} -- так --> b2["DO NOTHING<br>id 169 пропав"]
    end
    subgraph S2 ["рядки 2–168: те саме"]
        direction LR
        c0["nextval → 170 … 336"] --> c1["усі url є<br>вставлено 0"]
    end
    subgraph S3 ["POST /api/news: новий url"]
        direction LR
        d0["nextval → 337"] --> d1{"url у news?"} -- ні --> d2["INSERT<br>id = 337"]
    end
    S0 --> S1 --> S2 --> S3

    class a0,a1 step
    class b0,c0,d0 warning
    class b1,d1 decision
    class b2,c1 error
    class d2 success
```

Перевіримо на справжній базі (PostgreSQL, сервер з кроку нижче) — таблиця чиста:

```python
import httpx

api = httpx.Client(base_url="http://127.0.0.1:8000")
for attempt in (1, 2):
    report = api.post("/api/scrape", json={"source": "snapshot"}).json()
    print(f"збір {attempt}:", {key: report[key] for key in ("news_found", "news_saved", "news_total")})

created = api.post("/api/news", json={"title": "Гривня зміцнилася до долара на міжбанку",
                                      "url": "https://www.rbc.ua/ukr/news/hryvnia-777.html"}).json()
print("нова новина: id =", created["id"])
```

```text
збір 1: {'news_found': 168, 'news_saved': 168, 'news_total': 168}
збір 2: {'news_found': 168, 'news_saved': 0, 'news_total': 168}
нова новина: id = 337
```

Дірки в id — нормальні: **id — ідентифікатор, а не лічильник новин**. Скільки новин — питай `count(*)` (`/api/news/count`), а не найбільший id. На SQLite (ноутбук заняття) та сама послідовність дає id = 169: там `INTEGER PRIMARY KEY` бере найбільший id + 1 і пропущені рядки номерів не забирають. Одна програма — різні id на різних базах; ще одна причина не рахувати новини за id.

## Сесія на запит і COMMIT до відповіді { #session }

`get_db` — зі стартового `database.py` майже без змін:

```python title="news_hub/db.py"
async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI Depends: одна сесія (і одна транзакція) на HTTP-запит."""
    async with SessionFactory() as session:
        try:
            yield session                # тут виконується ендпоінт
            await session.commit()       # ендпоінт без винятку → COMMIT
        except Exception:
            await session.rollback()     # виняток → ROLLBACK
            raise
```

Одна сесія на запит — усі зміни запиту однією транзакцією: або все, або нічого. Якщо ендпоінт отримує і `RepoDep`, і `RowDep`, FastAPI викличе `get_db` **один раз** на запит і дасть обом ту саму сесію.

```mermaid
sequenceDiagram
    participant C as Клієнт
    participant F as FastAPI
    participant G as get_db
    participant R as NewsRepository
    participant DB as PostgreSQL

    C->>F: PATCH /api/news/7 {"category": "Економіка"}
    F->>G: відкрити сесію
    F->>R: get(7)
    R->>DB: SELECT … WHERE id = 7
    DB-->>R: рядок
    F->>F: row.category = "Економіка"
    F->>G: ендпоінт завершився без винятку
    G->>DB: UPDATE news SET category=…, потім COMMIT
    DB-->>G: OK
    G-->>F: сесію закрито
    F-->>C: 200 {"id": 7, "category": "Економіка", …}
```

!!! danger "З FastAPI 0.118 COMMIT за замовчуванням іде вже після відповіді"
    До FastAPI 0.118 код після `yield` виконувався **до** відповіді. З версії 0.118 за замовчуванням — **після**: клієнт отримує `200`/`201` ще до COMMIT. Якщо COMMIT не вдасться (обрив з'єднання, обмеження бази, що перевіряється при COMMIT), клієнт уже почув «збережено», а даних немає.

    Перевірили однією залежністю, що падає після `yield` (`raise` замість COMMIT):

    ```text
    FastAPI 0.115.0 → 500 Internal Server Error
    FastAPI 0.117.1 → 500 Internal Server Error
    FastAPI 0.118.0 → 200 {"ok":true}
    FastAPI 0.141.1 → 200 {"ok":true}
    FastAPI 0.141.1, Depends(dep, scope="function") → 500 Internal Server Error
    ```

    Тому — `Depends(get_db, scope="function")` (є з FastAPI 0.121): залежність завершується **до** відправлення відповіді. Тест `test_failed_commit_is_500_not_200` закріплює це: без `scope="function"` він падає.

## Рефакторинг 3. Повний CRUD { #refactor-3 }

| Дія | Метод і шлях | Успіх | Помилки |
|---|---|---|---|
| створити | `POST /api/news` | `201` + новина з `id` | `422` — не пройшла `NewsItem`; `409` — такий url уже є |
| прочитати | `GET /api/news/{news_id}` | `200` | `404` |
| змінити | `PATCH /api/news/{news_id}` | `200` | `404`, `422` |
| видалити | `DELETE /api/news/{news_id}` | `204`, без тіла | `404` |
| список, пошук | `GET /api/news`, `GET /api/news/search?q=` | `200` | `422` |

```python title="news_hub/api.py (фрагмент)"
async def get_news_or_404(news_id: int, repo: RepoDep) -> NewsRow:
    row = await repo.get(news_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"новини {news_id} немає")
    return row


RowDep = Annotated[NewsRow, Depends(get_news_or_404)]


@app.post("/api/news", response_model=NewsOut, status_code=status.HTTP_201_CREATED, ...)
async def create_news(body: NewsCreate, repo: RepoDep) -> NewsRow:
    item = NewsItem.from_raw({...})                   # та сама перевірка, що для парсера (урок 37)
    try:
        return await repo.create(item)                # INSERT + flush: помилку UNIQUE видно одразу
    except IntegrityError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"новина з url {item.url} уже є") from error


@app.patch("/api/news/{news_id}", response_model=NewsOut, ...)
async def update_news(body: NewsPatch, row: RowDep) -> NewsRow:
    for field, value in body.model_dump(exclude_unset=True).items():   # лише передані поля
        setattr(row, field, value)                                     # UPDATE зробить COMMIT у get_db
    return row
```

- **`RowDep`** — «знайди новину або `404`» один раз для `GET`, `PATCH`, `DELETE`.
- **`flush()` у `repo.create`** відправляє `INSERT` одразу, в межах транзакції: помилку `UNIQUE` ловимо в ендпоінті й перетворюємо на `409`, а не на `500` при COMMIT.
- **`exclude_unset=True`** — `PATCH {"category": …}` не затре заголовок.

```python
row = api.post("/api/news", json={"title": "НБУ залишив облікову ставку без змін",
                                  "url": "https://www.rbc.ua/ukr/news/nbu-rate-778.html",
                                  "published_time": "14:00"})
news_id = row.json()["id"]
print("POST  ", row.status_code, {key: row.json()[key] for key in ("id", "lang", "category", "published_time")})

again = api.post("/api/news", json={"title": "НБУ залишив облікову ставку без змін",
                                    "url": "https://www.rbc.ua/ukr/news/nbu-rate-778.html"})
print("POST  ", again.status_code, again.json())

patched = api.patch(f"/api/news/{news_id}", json={"category": "Економіка"})
print("PATCH ", patched.status_code, patched.json()["category"], "|", patched.json()["title"])
print("GET   ", api.get(f"/api/news/{news_id}").json()["category"])

deleted = api.delete(f"/api/news/{news_id}")
print("DELETE", deleted.status_code, repr(deleted.text))
missing = api.get(f"/api/news/{news_id}")
print("GET   ", missing.status_code, missing.json())
```

```text
POST   201 {'id': 338, 'lang': 'uk', 'category': 'Новини', 'published_time': '14:00:00'}
POST   409 {'detail': 'новина з url https://www.rbc.ua/ukr/news/nbu-rate-778.html уже є'}
PATCH  200 Економіка | НБУ залишив облікову ставку без змін
GET    Економіка
DELETE 204 ''
GET    404 {'detail': 'новини 338 немає'}
```

### Дані переживають перезапуск

Новини тепер у PostgreSQL, а не в процесі сервера. Порахуємо їх **окремою програмою** — без FastAPI, лише через репозиторій:

```text
$ python -c "import asyncio; from news_hub.db import SessionFactory; from news_hub.repository import NewsRepository; print(asyncio.run(NewsRepository(SessionFactory()).count()))"
169
```

Зупини uvicorn (`Ctrl+C`), запусти знову — `GET /api/news/count` поверне те саме число. Два процеси uvicorn бачать ті самі новини.

## Міграції Alembic { #alembic }

`Base.metadata.create_all()` створює таблиці, яких немає, — але не змінює наявні. Коли в уроці 44 у таблиці з'явиться стовпець `summary`, база з тисячами новин має отримати його **без втрати даних**. Для цього — **міграції**: версії схеми як код, у git поруч із програмою (як `makemigrations`/`migrate` у Django, урок 34).

```bash
alembic revision --autogenerate --rev-id 0001 -m "news table"   # порівняти NewsRow з базою → файл міграції
alembic upgrade head                                            # застосувати всі нові міграції
alembic downgrade -1                                            # відкотити останню
```

Історія й поточна версія бази:

```text
$ alembic history
<base> -> 0001 (head), news table — таблиця новин агрегатора (урок 39)
$ alembic current
0001 (head)
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
```

SQL, який виконує міграція, можна подивитись, не чіпаючи бази (`--sql` — «офлайн»-режим):

```text
$ alembic upgrade head --sql
BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE TABLE news (
    id SERIAL NOT NULL,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(300) NOT NULL,
    source VARCHAR(100) NOT NULL,
    lang VARCHAR(2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    published_time TIME WITHOUT TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (url)
);

CREATE INDEX ix_news_category ON news (category);

CREATE INDEX ix_news_lang ON news (lang);

CREATE INDEX ix_news_source ON news (source);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

COMMIT;

INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Generating static SQL
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, news table — таблиця новин агрегатора (урок 39)
```

!!! warning "Autogenerate — чернетка, а не готова міграція"
    Alembic записав `server_default=sa.text('now()')`: текст функції PostgreSQL. На SQLite такої функції немає — міграція там падала. Тому в міграції — `sa.func.now()`: SQLAlchemy підставляє правильний SQL для кожної бази (`now()` для PostgreSQL, `CURRENT_TIMESTAMP` для SQLite). Правило: **кожну автоміграцію читай перед комітом**, а `alembic check` покаже, чи збігаються моделі з базою.

## Архітектура: було → стало { #architecture }

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph OLD ["урок 38: у пам'яті процесу"]
        direction LR
        A0["api.py"] -- "Depends" --> S0["NewsStore<br>dict url → NewsItem"]
        S0 --> L0["зникає при<br>перезапуску"]
    end
    subgraph NEW ["урок 39: база даних"]
        direction LR
        A1["api.py<br>CRUD, 201/404/409/204"] -- "Depends" --> R1["NewsRepository<br>увесь SQL"]
        A1 -- "Depends, scope=function" --> G1["get_db<br>сесія й транзакція"]
        R1 --> G1
        G1 --> DB[("PostgreSQL<br>або SQLite")]
        M1["Alembic<br>migrations/"] --> DB
        T1["tables.py<br>NewsRow"] -.-> R1
        T1 -.-> M1
    end
    subgraph NEXT ["далі"]
        direction LR
        N1["урок 40: кеш Redis<br>перед репозиторієм"] ~~~ N2["урок 42: тести API<br>на тестовій базі"] ~~~ N3["урок 44: стовпець summary<br>міграція 0002"]
    end
    OLD --> NEW --> NEXT

    class A0,S0 step
    class L0 error
    class A1,R1,T1 step
    class G1 warning
    class DB,M1 success
    class N1,N2,N3 success
```

- **Репозиторій — єдине місце з SQL.** Ендпоінти не знають, PostgreSQL це чи SQLite; тести ганяють ті самі 32 тести на обох (`TEST_DATABASE_URL`). Детальніше про патерн — розділ 7 [довідника](fastapi/fastapi_documentation.md#s7).
- **Транзакція = запит.** `get_db` відкриває сесію, ендпоінт працює, COMMIT — до відповіді (`scope="function"`). Розділ 8 довідника — Unit of Work, той самий принцип для кількох репозиторіїв.
- **Правила даних — у базі.** `UNIQUE (url)` тримає і API, і міграції, і будь-яку іншу програму, що пише в `news`; код лише перетворює помилку на зрозумілий `409`.
- **Схема — у git.** `tables.py` описує, якою таблиця має бути; `migrations/` — як до цього дійти з будь-якої попередньої версії.

### Тести і mypy

Приклад виводу (час залежить від машини):

```text
$ pytest -q -p no:cacheprovider
................................                                                             [100%]
32 passed in 0.93s
$ TEST_DATABASE_URL=postgresql+asyncpg://news:news@localhost:5432/news_hub_test pytest -q -p no:cacheprovider
................................                                                             [100%]
32 passed in 2.46s
$ mypy --strict news_hub
Success: no issues found in 9 source files
```

`tests/conftest.py` створює для кожного тесту окремий engine і порожні таблиці (`Base.metadata.create_all`) і підміняє `get_db`; за замовчуванням — SQLite у пам'яті, з `TEST_DATABASE_URL` — PostgreSQL. Додалось 9 тестів CRUD: `201`, `409`, `422`, `404`, `PATCH` і збереження змін, `204`, `GROUP BY`, пошук, «COMMIT не вдався → `500`».

## Практика { #practice }

### Розібраний приклад: пошук `GET /api/news/search?q=`

В уроці 38 пошук був завданням «спробуй самостійно». У прототипі `news_dashboard` він виглядав так: `{"title": {"$regex": keyword, "$options": "i"}}` — рядок користувача ставав **регулярним виразом** у MongoDB. Тепер — SQL:

1. **Репозиторій.** `NewsRow.title.icontains(q, autoescape=True)` → `title ILIKE '%' || :q || '%'` у PostgreSQL. `q` — параметр; `autoescape=True` — символи `%` і `_` у запиті шукаються буквально, а не як «будь-що».
2. **Ендпоінт.** `q: str = Query(min_length=2, max_length=60)` — порожній чи надто довгий пошук відсічено до SQL.
3. **Порядок маршрутів.** `/api/news/search` оголошено **до** `/api/news/{news_id}`: інакше FastAPI спробував би прочитати `"search"` як `news_id: int` і відповів би `422` (урок 38, розібраний приклад).

```python
for q in ("зеленськ", "ЗЕЛЕНСЬК", "%%"):
    found = api.get("/api/news/search", params={"q": q, "limit": 100}).json()
    print(repr(q), "→", len(found), [news["title"][:40] for news in found[:2]])
print(api.get("/api/news/search", params={"q": "а"}).status_code)
```

```text
'зеленськ' → 11 ['У Путіна образилися на дозвіл Зеленськог', 'Зеленський дозволив проведення параду в ']
'ЗЕЛЕНСЬК' → 11 ['У Путіна образилися на дозвіл Зеленськог', 'Зеленський дозволив проведення параду в ']
'%%' → 0 []
422
```

### Зміни приклад

1. Додай до пошуку фільтр `lang: Literal["uk", "ru"] | None` — у репозиторії це ще одна умова `.where(...)`.
2. Додай у `NewsRepository` метод `latest(limit)` — найновіші за `scraped_at` (`order_by(NewsRow.scraped_at.desc())`), і ендпоінт `GET /api/news/latest`. Не забудь про порядок маршрутів.

### Спробуй самостійно: міграція 0002

Підготуй таблицю до уроку 44 (підсумки від Gemini):

- у `NewsRow` — стовпець `summary: Mapped[str | None] = mapped_column(Text)`;
- `alembic revision --autogenerate --rev-id 0002 -m "news summary"` → **прочитай** файл міграції;
- `alembic upgrade head` на базі, де вже є новини; `alembic downgrade -1` і знову `upgrade head`;
- `summary` — у `NewsOut` і в `NewsPatch`.

**Критерії перевірки:** новини, зібрані до міграції, лишились на місці з `summary: null`; `PATCH {"summary": "…"}` зберігає підсумок; `alembic check` — «No new upgrade operations detected»; тести проходять на SQLite і PostgreSQL.

### Знайди помилку { #find-bug }

Студент вирішив, що `ON CONFLICT` — це складно, і написав збір «по-простому»: для кожної новини перевірити, чи є такий url, і лише тоді додати. Запускаємо **два збори одночасно** — як два користувачі натиснули «Зібрати» або бот і планувальник спрацювали разом:

```python
import asyncio

from sqlalchemy import delete, select

from news_hub.db import SessionFactory
from news_hub.models import validate_news
from news_hub.repository import news_values
from news_hub.snapshot import load_snapshot

news, _ = validate_news(load_snapshot()[:20])


async def naive_add_many(items):
    async with SessionFactory() as session:
        saved = 0
        for item in items:
            exists = await session.scalar(select(NewsRow.id).where(NewsRow.url == str(item.url)))
            if exists is None:                     # «такого url ще немає — додаю»
                session.add(NewsRow(**news_values(item)))
                saved += 1
        await session.commit()
        return saved


async def two_scrapes_at_once():
    async with SessionFactory() as session:
        await session.execute(delete(NewsRow))
        await session.commit()
    results = await asyncio.gather(naive_add_many(news), naive_add_many(news), return_exceptions=True)
    for result in results:
        print(type(result).__name__, str(result).splitlines()[0].split(") ", 1)[-1])


asyncio.run(two_scrapes_at_once())
```

```text
int 20
IntegrityError duplicate key value violates unique constraint "news_url_key"
```

Кожен збір «перевірив» усі 20 url, і кожен вирішив, що новин немає. Чому, і що з цим робити?

??? success "Відповідь"

    **Гонка «перевір, потім зроби» (check-then-act).** Між `SELECT` і `COMMIT` є проміжок, і на кожному `await` цикл подій перемикається на інший збір. Обидва встигли виконати `SELECT` раніше, ніж хтось зробив `COMMIT`, тож обидва «побачили» порожню таблицю. Перший COMMIT пройшов, другий упав на `UNIQUE`: у справжньому ендпоінті це був би `500`.

    У тестах з одним користувачем цей код працює завжди — помилка проявляється лише під паралельними запитами. Найгірший вид помилок: у розробці її не видно.

    Виправлення — не перевіряти в Python, а **віддати рішення базі одним оператором**: `INSERT … ON CONFLICT (url) DO NOTHING` у `NewsRepository.add_many`. База перевіряє унікальність атомарно, тому два одночасні збори просто вставлять кожну новину рівно один раз. Для одиничного `POST /api/news` — те саме правило з іншого боку: `UNIQUE` у таблиці + `IntegrityError` → `409`.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| `DATABASE_URL` | діалект+драйвер://користувач:пароль@хост:порт/база; зі змінної середовища |
| `create_async_engine` | пул з'єднань; для PostgreSQL — `asyncpg`, для SQLite — `aiosqlite` |
| `Mapped` / `mapped_column` | таблиця як клас; `X \| None` — `NULL` дозволено |
| Pydantic vs SQLAlchemy модель | перевірка даних vs рядок таблиці; `from_attributes=True` з'єднує їх у відповіді |
| Сесія | робоче місце запиту: зміни → `flush` (SQL у транзакції) → `commit` |
| `get_db` + `scope="function"` | одна сесія й транзакція на запит, COMMIT до відповіді |
| Репозиторій | увесь SQL в одному місці; ендпоінти не знають, яка база |
| `ON CONFLICT DO NOTHING` | дублікати відсіює база атомарно; id при цьому можуть «перескакувати» |
| CRUD-коди | `201` створено, `404` немає, `409` конфлікт, `204` видалено без тіла |
| Alembic | версії схеми в git; autogenerate — чернетка, читай перед комітом |
| Check-then-act | «перевір, потім встав» ламається під паралельними запитами — правило даних віддай базі |

### Самоперевірка

1. Чим `NewsRow` відрізняється від `NewsItem` і чому не одна модель на все?
2. Навіщо `flush()` у `repo.create`, якщо COMMIT однаково буде в `get_db`?
3. Що станеться з клієнтом, якщо COMMIT не вдасться, з `scope="function"` і без нього (FastAPI ≥ 0.118)?
4. Чому id новин ідуть з дірками і чи це проблема?
5. Навіщо міграції, якщо є `Base.metadata.create_all()`?
6. Чому два одночасні `naive_add_many` зламались, а два `add_many` — ні?

??? success "Відповіді"

    1. `NewsItem` перевіряє дані ззовні (довжина, домен, мова); `NewsRow` описує рядок таблиці (типи стовпців, `UNIQUE`, `id` і `scraped_at` від бази). У них різні задачі й різний час роботи; змішування тягне SQL у перевірку або правила перевірки в таблицю.
    2. Щоб `INSERT` пішов у базу зараз і помилка `UNIQUE` виникла в ендпоінті — там її перетворюємо на `409`. Без `flush` вона вилетіла б при COMMIT у `get_db` як `500`.
    3. З `scope="function"` — `500`: залежність завершується до відповіді. Без нього — клієнт уже отримав `200`/`201`, а дані не збережено.
    4. PostgreSQL бере значення лічильника до перевірки `UNIQUE`, і пропущені рядки його «з'їдають». Не проблема: id лише ідентифікує рядок; кількість — `count(*)`.
    5. `create_all` лише створює відсутні таблиці. Міграції змінюють наявну схему (додати стовпець, індекс) без втрати даних, у контрольованому порядку, з можливістю відкату — і зберігаються в git.
    6. `naive_add_many` вирішує в Python між `SELECT` і `COMMIT` — інший збір встигає втрутитись. `add_many` робить один `INSERT … ON CONFLICT DO NOTHING`: унікальність перевіряє база атомарно.

### Що далі

- Ноутбук заняття: [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/note_lesson_39_sqlalchemy_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/note_lesson_39_sqlalchemy.ipynb){ .solutions-link }.
- Урок 40 — middleware і Redis: кеш `GET /api/news` перед репозиторієм, rate limit на `POST /api/scrape`, фоновий збір.

## Документація і джерела

- Код: [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_39_fastapi_sqlalchemy/news_hub) — шар бази зі стартового `production_bot` (`backend/core/database.py`, `backend/repositories/base.py`, `migrations/`, `docker-compose.yml`), API — з уроку 38.
- Довідник курсу: [FastAPI: архітектура, async і production-патерни](fastapi/fastapi_documentation.md), розділи 6–8.
- SQLAlchemy 2.0: [ORM Quick Start](https://docs.sqlalchemy.org/en/20/orm/quickstart.html), [Declarative Mapping](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html), [Asynchronous I/O](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html), [Session Basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html), [INSERT…ON CONFLICT (PostgreSQL)](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert)
- FastAPI: [SQL (Relational) Databases](https://fastapi.tiangolo.com/tutorial/sql-databases/), [Dependencies with yield](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)
- Alembic: [Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html), [Auto Generating Migrations](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
- PostgreSQL: [INSERT … ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT), [Sequence functions](https://www.postgresql.org/docs/current/functions-sequence.html)
