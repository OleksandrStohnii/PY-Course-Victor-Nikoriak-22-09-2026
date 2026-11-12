# Урок 51. CI/CD (GitHub Actions)

За уроки 37–50 у `news_hub` з'явилося 343 тести, `mypy --strict`, тести образу, smoke-тест Compose. У проєкті нотаток — 81 тест і `check --deploy`. Але все це працює, лише коли хтось **не забуває** запустити. Забути легко: змінив одну функцію, «це ж дрібниця», push — і зламав те, що ламатися не мало.

**CI** (continuous integration) — автомат, який на кожну зміну сам збирає проєкт і проганяє всі перевірки, а результат показує прямо в pull request: зелена галочка чи червоний хрестик з журналом. **CD** (continuous delivery) — наступний крок: те, що пройшло перевірки в `main`, автоматично стає готовим до встановлення артефактом — у нас образом Docker у реєстрі.

Сьогодні обидва проєкти курсу отримують справжні workflows GitHub Actions. Вони вже працюють на PR, у якому з'явився цей урок, — і все, що на сторінці названо «прогоном CI», взято з їхніх журналів.

Основа — `.github/workflows/django-tests.yml` з [Django-книги](https://nikoriakviktor.github.io/notes_chat_app/) (крок 8: тести й CI).

| Урок | Крок |
|---|---|
| 48 | образ `news_hub`, тести образу |
| 49 | Compose для обох проєктів; nginx; деплой і бекап |
| **50** | **CI на кожен PR: тести ×2 версії Python, мінімальні версії, PostgreSQL, типи, образ + smoke; CD: образ у ghcr.io з `main`** |

Проєкти: [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_51_ci_cd/news_hub), [`crispy_notes_project`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_51_ci_cd/crispy_notes_project). Workflows: [`.github/workflows/news_hub.yml`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/.github/workflows/news_hub.yml), [`.github/workflows/crispy_notes.yml`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/.github/workflows/crispy_notes.yml).

**Що потрібно з попередніх уроків:** pytest, маркери й фікстури (25, 41); Git, гілки й pull request (15); тести образу (48); Compose, `.env`, smoke-перевірки (49); коди виходу ([бонус Linux](bonus_linux.md#pipes)).

**Після уроку ти зможеш:**

- прочитати й написати workflow GitHub Actions: тригери, jobs, steps, matrix, services;
- налаштувати, **коли** CI запускається, і не пропустити жодного PR;
- перевірити проєкт у кількох середовищах: версії Python, мінімальні версії залежностей, справжня PostgreSQL;
- давати workflow лише потрібні права й не світити секрети в журналах;
- публікувати образ у реєстр з `main`.

**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_51_ci_cd/note_lesson_51_ci_cd_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_51_ci_cd/note_lesson_51_ci_cd.ipynb){ .solutions-link } — workflow як дані: чи запуститься він на цей PR, у якому порядку підуть jobs, що розгорне matrix, які права отримає токен.

## Пригадай

1. Що таке код виходу і що він означає для скрипта з `set -e` (бонус Linux)?
2. Що перевіряє `pytest -m docker` і чому його немає у звичайному `pytest` (урок 49)?
3. Що робить `scripts/smoke.sh` (урок 50–51) і чим він відрізняється від тестів?

??? success "Відповіді"

    1. Число, яким програма повідомляє результат: 0 — успіх, інше — помилка. З `set -e` скрипт зупиняється на першій команді з ненульовим кодом. CI працює так само: крок з кодом не 0 — червоний.
    2. Збирає справжній образ і запускає контейнери: що в образі немає `.env` і тестів, користувач не root, healthcheck, коректна зупинка. Це повільно й потребує Docker, тому — окремий маркер.
    3. Піднімає весь стек у Compose і проходить шлях користувача через nginx (готовність, вхід, збір, база без портів), потім прибирає за собою. Тести перевіряють код, smoke — що зібрана система справді працює.

## Старт: з якого коду починаємо

```yaml title="notes_chat_app/.github/workflows/django-tests.yml (Django-книга, скорочено)"
on:
  push:
    branches: [ main, master ]
    paths: ['notes_app/**', 'notes_project/**', 'templates/**', 'static/**', 'requirements.txt', ...]
  pull_request:
    branches: [ main, master ]
    paths: [ ... ]
  workflow_dispatch:

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:16-alpine
        env: {POSTGRES_DB: notes_db, POSTGRES_USER: notes_user, POSTGRES_PASSWORD: notes_pass}
        ports: [5432:5432]
        options: --health-cmd pg_isready ...
    env:
      DATABASE_URL: postgres://notes_user:notes_pass@localhost:5432/notes_db
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "3.12"}
      - uses: actions/cache@v4
        with: {path: ~/.cache/pip, key: ...}
      - run: pip install -r requirements.txt
      - run: python manage.py check
      - run: |
          python manage.py test \
            notes_app.tests.test_models \
            notes_app.tests.test_services \
            ...
      - run: |
          coverage run manage.py test notes_app.tests.test_models ...
          coverage report --show-missing
  selenium-e2e:
    needs: unit-and-integration
    services:
      selenium: {image: "selenium/standalone-chrome:latest", ...}
```

Тут уже багато правильного — це й лишаємо:

- PostgreSQL як `services` з healthcheck — тести на тій самій базі, що в продакшні;
- `paths` — workflow не запускається, коли змінились лише файли, що до проєкту не стосуються;
- кеш pip, `workflow_dispatch` (кнопка «Run workflow»), `needs` — повільні E2E лише після швидких тестів;
- `manage.py check` перед тестами.

### Анатомія workflow

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    E["подія: push, pull_request,<br>workflow_dispatch"]
    F{"on: гілки, paths —<br>запускати?"}
    W["workflow = jobs"]
    J1["job: окрема чиста VM<br>runs-on: ubuntu-latest"]
    S1["services: контейнери<br>поруч з job"]
    ST["steps по черзі: uses (готова дія)<br>або run (команда)"]
    R{"код виходу кроку<br>= 0?"}
    OK["job зелений"]
    BAD["job червоний,<br>наступні кроки не йдуть"]
    E --> F
    F -->|так| W --> J1 --> ST --> R
    S1 -.-> J1
    R -->|так, усі кроки| OK
    R -->|ні| BAD

    class E,W,J1,S1,ST step
    class F,R decision
    class OK success
    class BAD error
```

| Поняття | Що це |
|---|---|
| **workflow** | файл `.github/workflows/*.yml` у корені репозиторію |
| **job** | набір кроків на окремій чистій віртуальній машині (runner); jobs ідуть паралельно, якщо немає `needs` |
| **step** | `uses: дія@версія` (готова дія з Marketplace) або `run: команда` |
| **services** | контейнери (PostgreSQL, Redis) поруч з job — доступні на `localhost:порт` |
| **matrix** | один job у кількох варіантах (версії Python) |
| **secrets / `GITHUB_TOKEN`** | секрети репозиторію й тимчасовий токен прогону |

## Рефакторинг 1. Коли CI запускається { #refactor-1 }

```yaml
  pull_request:
    branches: [ main, master ]
```

`branches` у `pull_request` — це гілка, **у яку** PR хочуть злити. Цей урок прийшов у PR, націлений не на `main`, а на гілку попереднього PR (так роблять, коли одна робота продовжує іншу, ще не злиту). Workflow книги на такому PR **не запустився б зовсім** — і червоного хрестика не було б, бо не було б і перевірки. Відсутність перевірки виглядає так само, як успіх.

Друга половина — `push` без обмеження гілок:

```text
# Actions цього репозиторію: workflow «Notebooks» (push і pull_request без branches)
run 206  pull_request  claude/m5-production  a54d686  success
run 205  push          claude/m5-production  a54d686  success     ← той самий коміт удруге
run 204  pull_request  claude/m5-production  a9272e7  success
run 203  push          claude/m5-production  a9272e7  success
```

Кожен коміт у гілці PR перевірявся двічі: на `push` і на `pull_request`. Хвилини раннерів подвоюються, а статус у PR один.

```yaml title=".github/workflows/news_hub.yml"
on:
  push:
    branches: [main]                 # push — лише main (звідти йде публікація образу)
    paths:
      - 'module_5/lessons/lesson_51_ci_cd/news_hub/**'
      - '.github/workflows/news_hub.yml'
  pull_request:                      # без branches: PR у будь-яку гілку
    paths:
      - 'module_5/lessons/lesson_51_ci_cd/news_hub/**'
      - '.github/workflows/news_hub.yml'
  workflow_dispatch:

concurrency:                         # новий push у той самий PR скасовує попередній прогін
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

У `paths` є й сам файл workflow: змінив перевірки — перевір, що вони працюють.

## Рефакторинг 2. Що саме перевіряти { #refactor-2 }

### Тести без списку

Книга перелічує модулі тестів руками. Той самий прийом у проєкті нотаток — список модулів, що були на уроці 46:

```text
$ python manage.py test hello_app.tests hello_app.tests_api hello_app.tests_auth \
      hello_app.tests_architecture hello_app.tests_chat hello_app.tests_consumers
Ran 76 tests … OK

$ python manage.py test
Ran 81 tests … OK
```

П'ять тестів уроку 50 (`tests_deploy.py`: `/health/`, ключ при `DEBUG=0`, HTTPS за nginx) CI мовчки не запускав би: новий файл тестів не потрапляє в список, поки хтось не згадає його туди дописати. `manage.py test` і `pytest` знаходять тести самі — список не потрібен.

А `coverage run manage.py test …` у книзі — **другий** повний прогін тих самих тестів одразу після першого: удвічі довше, а нового знання не дає. Покриття, коли потрібне, — одним прогоном (`coverage run`, `pytest --cov`), без окремого `manage.py test`.

### Кілька середовищ

| Job | Що ловить |
|---|---|
| `pytest · Python 3.10 / 3.13` (matrix) | код, що працює лише на новому Python (або лише на старому) |
| `мінімальні версії` | неправдиві нижні межі в `requirements.txt` |
| `PostgreSQL 16 + Redis 7` | відмінності SQLite і PostgreSQL; `alembic check` — моделі збігаються з міграціями |
| `makemigrations --check` (нотатки) | змінили модель і забули міграцію |
| `mypy --strict` | помилки типів |
| `check --deploy` (нотатки) | налаштування сервера: `DEBUG=0` без ключа не стартує, HTTPS-налаштування без помилок |
| `образ і smoke-тест` | зібрана система працює: тести образу (48) + стек через nginx (49) |

**Мінімальні версії.** `requirements.txt` обіцяє: `djangorestframework-simplejwt>=5.3` — «працює з 5.3 і новішими». Але CI зазвичай ставить **найновіші** версії, тож нижню межу ніхто не перевіряє. `uv` уміє поставити саме найменші дозволені:

```yaml
  min-versions:
    steps:
      - uses: astral-sh/setup-uv@v6
      - run: uv venv --python 3.10 .venv
      - run: uv pip install --resolution lowest-direct -r requirements.txt
      - run: .venv/bin/python manage.py test
```

Перший же запуск для проєкту нотаток:

```text
ImportError: Could not import 'rest_framework_simplejwt.authentication.JWTAuthentication' for API setting
'DEFAULT_AUTHENTICATION_CLASSES'. ModuleNotFoundError: No module named 'pkg_resources'.
```

simplejwt 5.3.0 імпортує `pkg_resources` з `setuptools`, а в чистому середовищі (новий venv на Python 3.12+, `uv`) setuptools немає. Перевірка версій: 5.3.0 — помилка, 5.3.1 і 5.4.0 — працюють. Нижня межа тепер `>=5.3.1`; для `news_hub` усі 343 тести пройшли з мінімальними версіями одразу (`aiogram 3.15.0`, `fastapi 0.121.0`, `pydantic 2.9.0`, `sqlalchemy 2.0.30`…).

**Smoke-тест стеку.** Тести перевіряють код, а `scripts/smoke.sh` — зібрану систему, як її побачить користувач:

```bash title="news_hub/scripts/smoke.sh (скорочено)"
set -euo pipefail
trap cleanup EXIT                  # і при помилці: журнали в CI, потім docker compose down -v

docker compose up -d --build --wait --wait-timeout 180
check "готовність через nginx" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$base/health/ready")"
...
check "збір зі знімка" 168 "$saved"
check "база й Redis без портів назовні" "" "$(docker compose ps postgres redis --format '{{.Ports}}' | grep -- '->' || true)"
```

Прогін CI на цьому PR (журнал job «образ і smoke-тест Compose»):

```text
10:54:59.87  Container news_hub-postgres-1  Healthy
10:55:01.01  Container news_hub-migrate-1  Exited
10:55:08.13  Container news_hub-api-1  Healthy
10:55:18.78  Container news_hub-nginx-1  Healthy
10:55:18.79  ✓ готовність через nginx
10:55:18.80  ✓ nginx відповідає
10:55:19.08  ✓ вхід адміна
10:55:19.09  ✓ запис без токена
10:55:19.15  ✓ збір зі знімка
10:55:19.16  ✓ новини в PostgreSQL
10:55:19.24  ✓ база й Redis без портів назовні
10:55:19.24  smoke: усе гаразд
```

Чи ловить smoke справжню поломку? Повертаємо в nginx нотаток `$host` замість `$http_host` (урок 50):

```text
✓ готовність через nginx
✓ статика з тому nginx
✓ DEBUG вимкнено (404 без трасування)
✗ вхід формою через nginx: очікували 302 http://localhost:8080/notes/, отримали 403
```

Жоден з 81 тесту Django цього не бачить — вони не проходять через nginx.

## Рефакторинг 3. Порядок і паралельність { #refactor-3 }

Jobs без `needs` стартують одночасно, кожен на своїй машині. `needs` будує граф: `docker` чекає `tests` (нема сенсу збирати образ з кодом, що не пройшов тести), `publish` — усіх.

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph T0["10:52:19 — подія pull_request, коміт 5c6f1b3"]
        direction LR
        P0{"paths: змінено<br>lesson_51_ci_cd/news_hub/**"} --> Q0["workflow news_hub — CI/CD"]
    end
    subgraph T1["10:52:23 — хвиля 1: п'ять jobs паралельно"]
        direction LR
        A1["pytest 3.10<br>62 с"] --> B1["pytest 3.13<br>56 с"] --> C1["мін. версії<br>35 с"] --> D1["mypy<br>42 с"] --> E1["PostgreSQL<br>94 с"]
    end
    subgraph T2["10:53:28 — хвиля 2: needs tests (обидва з matrix)"]
        direction LR
        F2["образ + smoke<br>115 с"]
    end
    subgraph T3["10:55:23 — хвиля 3: needs усі"]
        direction LR
        G3{"push у main?"} --> H3["publish:<br>skipped"]
    end
    T0 --> T1 --> T2 --> T3

    class P0,G3 decision
    class Q0 step
    class A1,B1,C1,D1,E1,F2 success
    class H3 warning
```

Три хвилини від push до зеленого статусу — замість ~7 хвилин, якби всі кроки йшли одним job по черзі. `fail-fast: false` у matrix: якщо впала 3.10, 3.13 однаково доходить до кінця — видно, чи проблема в одній версії чи в обох.

## Рефакторинг 4. Права, секрети, публікація { #refactor-4 }

**Права.** Кожен прогін отримує тимчасовий `GITHUB_TOKEN`. Без блоку `permissions` його права визначає налаштування репозиторію — у старших репозиторіях це запис у весь репозиторій. Workflow книги блоку не має. Тепер — найменше потрібне:

```yaml
permissions:
  contents: read                     # тести лише читають код

jobs:
  publish:
    permissions:
      contents: read
      packages: write                # писати в реєстр — лише цьому job
```

**Секрети в CI.** Паролі тестової бази в `services` — не секрет: база живе кілька хвилин на одноразовій машині. А пароль адміна для smoke генерується на кожен прогін і маскується в журналі:

```yaml
      - name: .env для smoke — випадкові секрети, пароль адміна замасковано в журналі
        run: |
          password="$(openssl rand -hex 16)"
          echo "::add-mask::$password"
          echo "ADMIN_PASSWORD=$password" >> "$GITHUB_ENV"
          ADMIN_PASSWORD="$password" HTTP_PORT=8080 python scripts/make_env.py
```

Справжні секрети (ключ LLM, токен бота, SSH-ключ сервера) — лише в **Settings → Secrets and variables → Actions** і в workflow через `${{ secrets.ІМ'Я }}`. На PR із форку секрети не передаються — інакше чужий код у PR міг би їх прочитати.

**CD: образ у реєстр.** Після злиття в `main` той самий образ, що пройшов smoke, публікується в GitHub Container Registry:

```yaml
  publish:
    needs: [tests, min-versions, postgres, types, docker]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # тимчасовий токен прогону, не особистий
      - id: meta
        uses: docker/metadata-action@v5            # імена образів — у нижньому регістрі (вимога реєстру)
        with:
          images: ghcr.io/${{ github.repository_owner }}/news_hub
          tags: |
            type=sha
            type=raw,value=latest
      - uses: docker/build-push-action@v6
        with:
          context: ${{ env.PROJECT }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
```

На PR цей job — `skipped` (видно на графі вище). Тег `sha-5c6f1b3` відповідає на питання «яка версія зараз на сервері?»: кожен образ прив'язаний до коміту. `metadata-action` сам переводить `NikoriakViktor` у нижній регістр — `docker push ghcr.io/NikoriakViktor/…` реєстр відхилив би.

!!! note "Що з цього перевірено"
    Усі jobs, крім `publish`, пройшли на справжньому PR цього уроку (див. [Тести](#tests)). `publish` запускається лише на push у `main`, тому на PR він `skipped`; його кроки — стандартні дії Docker, синтаксис перевірено `actionlint`. Автоматичний деплой на сервер у workflow не входить — див. [Як обрати](#how-to-choose).

## Архітектура { #architecture }

```mermaid
sequenceDiagram
    participant D as розробник
    participant G as GitHub
    participant R as runners (VM)
    participant C as ghcr.io
    participant S as сервер
    D->>G: git push у гілку PR
    G->>R: pull_request: 6 jobs (paths збігся)
    R-->>G: статуси jobs → галочка в PR
    D->>G: merge у main (після рев'ю)
    G->>R: push у main: ті самі jobs
    R->>C: publish: news_hub:sha-…, :latest
    Note over S: деплой — окремий крок (урок 50)
    S->>C: docker compose pull && up -d --wait
```

| Файл | Що в ньому |
|---|---|
| `.github/workflows/news_hub.yml` | 6 jobs: tests (matrix), min-versions, postgres (+ `alembic check`), types, docker (образ + smoke), publish |
| `.github/workflows/crispy_notes.yml` | 5 jobs: tests (matrix, PostgreSQL, `makemigrations --check`), min-versions, deploy-check, docker, publish |
| `.github/workflows/notebooks.yml`, `docs.yml` | метадані ноутбуків і збірка книги курсу — вже були |
| `*/scripts/make_env.py` | `.env` з випадковими секретами (значення з `$` — в одинарних лапках) |
| `*/scripts/smoke.sh` | стек через nginx; однаково в CI і локально |

Правило: **усе, що робить CI, можна запустити локально тими самими командами** (`pytest`, `mypy`, `pytest -m docker`, `./scripts/smoke.sh`). Workflow лише вирішує, коли й де.

## Тести { #tests }

Прогін на PR з цим уроком (коміт `5c6f1b3`):

| Workflow | Job | Тривалість | Результат |
|---|---|---|---|
| news_hub — CI/CD | pytest · Python 3.10 / 3.13 | 62 с / 56 с | ✅ |
| | pytest · мінімальні версії (Python 3.10) | 35 с | ✅ |
| | pytest і Alembic · PostgreSQL 16 + Redis 7 | 94 с | ✅ |
| | mypy --strict | 42 с | ✅ |
| | образ і smoke-тест Compose | 115 с | ✅ |
| | публікація образу в ghcr.io | — | skipped (не `main`) |
| crispy_notes — CI/CD | manage.py test · Python 3.10 / 3.13 · PostgreSQL | 90 с / 87 с | ✅ |
| | manage.py test · мінімальні версії | 40 с | ✅ |
| | manage.py check --deploy | 32 с | ✅ |
| | образ і smoke-тест Compose | 57 с | ✅ |
| | публікація образу в ghcr.io | — | skipped |

Локально перед push: `actionlint` для обох файлів — без зауважень; кожен крок (мінімальні версії через `uv`, `alembic check` на чистій PostgreSQL, `check --deploy` з `DEBUG=0` без ключа й з ключем, обидва smoke) запущено тими самими командами.

## Як обрати: деплоїти автоматично? { #how-to-choose }

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    Q0["образ з main<br>опубліковано"]
    Q1{"CI перевіряє те, що<br>ламається в продакшні?"}
    Q2{"міграції бази<br>зворотно сумісні?"}
    Q3{"є відкат за хвилину:<br>попередній тег образу?"}
    A["автоматичний деплой:<br>job deploy з SSH-секретом"]
    M["ручний деплой:<br>pull && up -d на сервері"]
    F["спершу — посилити CI<br>(smoke, PostgreSQL, міграції)"]
    Q0 --> Q1
    Q1 -->|ні| F
    Q1 -->|так| Q2
    Q2 -->|ні| M
    Q2 -->|так| Q3
    Q3 -->|так| A
    Q3 -->|ні| M

    class Q0 step
    class Q1,Q2,Q3 decision
    class A success
    class M step
    class F warning
```

Для навчальних проєктів курсу — ручний деплой (урок 50): `git pull`/`docker compose pull` і `up -d --build --wait` на сервері. Автоматичний — окремим job після `publish`, з SSH-ключем у секретах і `environment: production` (GitHub може вимагати підтвердження людиною перед цим job).

## Практика { #practice }

### Розібраний приклад: бейдж статусу в README

Статус CI видно не лише в PR. GitHub віддає SVG-бейдж для кожного workflow:

```markdown
[![news_hub — CI/CD](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/actions/workflows/news_hub.yml/badge.svg)](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/actions/workflows/news_hub.yml)
```

Адреса складається з імені файлу workflow; за замовчуванням бейдж показує статус останнього прогону на гілці за замовчуванням (`main`), `?branch=…` — іншої гілки. Він зелений лише після першого прогону в `main`: доки урок не злитий, прогонів там немає.

### Зміни приклад

1. У `news_hub.yml` поверни `pull_request: branches: [main]`. Що буде з PR цього уроку?
2. У `requirements.txt` нотаток поверни `djangorestframework-simplejwt>=5.3`. Який job почервоніє і з якою помилкою?

??? success "Що покаже запуск"

    1. Workflow не запуститься зовсім: PR націлений на гілку попереднього PR, а не на `main`. У PR лишиться лише перевірка ноутбуків — і нічого червоного.
    2. `manage.py test · мінімальні версії`: `ImportError: … JWTAuthentication … ModuleNotFoundError: No module named 'pkg_resources'`. Решта jobs зелені — вони ставлять найновішу simplejwt.

### Спробуй самостійно: coverage як артефакт

Додай до job `tests` (Python 3.13) покриття: `pytest --cov=news_hub --cov-report=xml` і збережи `coverage.xml` дією `actions/upload-artifact@v4`.

**Критерії перевірки:**

- тести проходять **один** раз (не `pytest` і ще `pytest --cov`);
- артефакт — лише з одного варіанта matrix (`if: matrix.python == '3.13'`);
- у вкладці Summary прогону з'являється артефакт `coverage-xml`;
- `.coveragerc` проєкту (урок 42) підхоплюється: у звіті є гілки (`branch = true`).

### Знайди помилку { #find-bug }

Workflow для `news_hub`. На PR він зелений.

```yaml
on:
  push:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      GEMINI_API_KEY: AIzaSyD-course-demo-key-not-real-0000000
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: {python-version: "3.13"}
      - run: pip install -r module_5/lessons/lesson_51_ci_cd/news_hub/requirements.txt
      - run: cd module_5/lessons/lesson_51_ci_cd/news_hub && pytest || true
```

Знайди чотири проблеми.

??? success "Відповідь"

    1. **`pytest || true`** — `|| true` робить код виходу кроку нульовим за будь-якого результату. Тести можуть падати скільки завгодно, CI зелений. Зелений CI, що нічого не перевіряє, гірший за відсутній: йому вірять.
    2. **`requirements.txt` замість `requirements-dev.txt`** — pytest, fakeredis немає; `pytest` падає з `command not found`, і `|| true` ховає й це.
    3. **Ключ у файлі workflow** — він у git назавжди, і його бачить кожен, хто бачить репозиторій. Справжній ключ — у Secrets (`${{ secrets.GEMINI_API_KEY }}`); для тестів він не потрібен зовсім (`FakeLLM`, урок 44).
    4. **Тригери** — `push` без гілок запускає workflow на кожен push у будь-яку гілку (разом з `pull_request` — двічі на коміт), а `pull_request: branches: [main]` пропускає PR у інші гілки. І немає `paths`: зміна в документації курсу теж запускає тести.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| тригери | `pull_request` без `branches` + `paths`; `push` — лише `main`; `concurrency` скасовує застарілі прогони |
| тести | без ручного списку — `pytest` / `manage.py test` знаходять самі; один прогін |
| середовища | matrix версій Python; мінімальні версії (`uv --resolution lowest-direct`); справжня PostgreSQL у `services` |
| система | тести образу + smoke стеку через nginx — те, чого не бачать unit-тести |
| порядок | jobs паралельно; `needs` — лише де справді треба чекати |
| права | `permissions: contents: read`; `packages: write` — лише job публікації |
| секрети | у Secrets, не у файлі; згенеровані в прогоні — `::add-mask::` |
| CD | образ з тегом коміту в ghcr.io з `main`; деплой — окремий, свідомий крок |

### Самоперевірка

1. Чому відсутній прогін CI небезпечніший за червоний?
2. Що перевіряє job з мінімальними версіями, чого не перевіряє звичайний?
3. Навіщо `needs: tests` у job з образом, якщо jobs можна запустити паралельно?
4. Звідки `publish` бере право писати в ghcr.io і чому це право не в усього workflow?
5. Що зробить `echo "::add-mask::$password"`?

??? success "Відповіді"

    1. Червоний видно — його виправлять. Відсутній виглядає як «усе гаразд»: PR зливають без жодної перевірки.
    2. Що нижні межі в `requirements.txt` правдиві. Звичайний job ставить найновіші версії; у проєкті нотаток межа `>=5.3` виявилась неправдивою (5.3.0 не стартує без setuptools).
    3. Щоб не витрачати дві хвилини на образ і smoke, якщо код уже не пройшов тести, — і щоб червоний статус показував першу причину, а не лавину наслідків.
    4. З `GITHUB_TOKEN` цього прогону з `permissions: packages: write` лише в job `publish`. Решта jobs запускають код з PR — їм достатньо читати.
    5. Далі в журналі прогону це значення буде замінене на `***` — навіть якщо якась команда його надрукує.

### Що далі

- Ноутбук заняття: [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_51_ci_cd/note_lesson_51_ci_cd_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_5/lessons/lesson_51_ci_cd/note_lesson_51_ci_cd.ipynb){ .solutions-link }.
- Модуль 6 — капстоун: власний проєкт з тестами, Docker, Compose і CI з перших днів.

## Документація і джерела

- Код: workflows [`news_hub.yml`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/.github/workflows/news_hub.yml) і [`crispy_notes.yml`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/.github/workflows/crispy_notes.yml) — з `.github/workflows/django-tests.yml` Django-книги [notes_chat_app](https://nikoriakviktor.github.io/notes_chat_app/); проєкти — [`lesson_51_ci_cd`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_5/lessons/lesson_51_ci_cd).
- GitHub Actions: [workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions), [events that trigger workflows (`pull_request`, `paths`)](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows), [service containers](https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services/about-service-containers), [`GITHUB_TOKEN`](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication), [secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions), [workflow commands (`add-mask`)](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions), [status badge](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/adding-a-workflow-status-badge).
- Дії: [actions/checkout](https://github.com/actions/checkout), [actions/setup-python](https://github.com/actions/setup-python), [astral-sh/setup-uv](https://github.com/astral-sh/setup-uv), [docker/build-push-action](https://github.com/docker/build-push-action), [docker/metadata-action](https://github.com/docker/metadata-action). Реєстр: [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
- uv: [resolution strategies (`--resolution lowest-direct`)](https://docs.astral.sh/uv/concepts/resolution/). actionlint: [rhysd/actionlint](https://github.com/rhysd/actionlint).
