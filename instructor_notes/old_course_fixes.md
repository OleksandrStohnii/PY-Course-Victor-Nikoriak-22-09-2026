# Виправлення старого коду — нотатки викладача

> Файл для викладача, у книгу курсу (`docs/`) не входить. Тут — усе, що довелося змінити в коді й
> матеріалах старого курсу `PY-Course-Victor-Nikoriak-23_02` під час перенесення: уроки 34–50, бонуси Linux і CV,
> бонус-урок pandas, довідники. На сторінках уроків цих списків немає — студенти бачать лише
> правильний код і пояснення «чому так».

## Урок 34. Django: forms, HTML practice

| Де | Було | Стало |
|---|---|---|
| `services.create_note`, `note_create` (`crispy_notes_project`) | `is_pinned` з форми не доходив до сервісу — прапорець губився при створенні | параметр `is_pinned` у сервісі й view; тест `test_is_pinned_is_saved_on_create` |
| `django_bootstrap_project/templates/base.html` | SRI-хеш Bootstrap JS не відповідав версії 5.3.3 — браузер блокував скрипт (меню, модальні вікна) | правильний хеш |
| обидва проєкти | тестів не було | `hello_app/tests.py` |

«Знайди помилку» уроку побудовано на баг `is_pinned`.

## Урок 35. DRF overview + Django vs FastAPI

| Де | Було | Стало |
|---|---|---|
| `services.update_note` (з уроку 34) | `save(update_fields=changed_fields)` без `updated_at` — `auto_now` не оновлювався, редагована нотатка не піднімалась у списку | `update_fields=changed_fields + ['updated_at']`; тест `test_patch_changes_only_sent_fields_and_updated_at` |

«Знайди помилку» уроку побудовано на цьому баг.

## Урок 36. Typing + Pydantic

| Де | Було | Стало |
|---|---|---|
| `news_dashboard/app/scraper.py`, категорія | URL розбирався рядком (`url.replace("https://www.rbc.ua", "")`) — для `auto.rbc.ua` категорією ставав домен | `urlsplit` у `NewsItem.derive_from_url` |

«Знайди помилку» уроку побудовано на цьому баг.

## Урок 37. FastAPI basics + Postman + OpenAPI

| Де | Було | Стало |
|---|---|---|
| `news_dashboard/app/main.py` | `@app.on_event("startup")` — застарілий API FastAPI | `lifespan` |
| `main.py`, `ScrapeRequest.pages` | будь-які URL — сервер завантажить що завгодно (SSRF) | лише сторінки rbc.ua, не більше 20; інше — `422` |
| `main.py`, `lang` | вільний рядок: `?lang=en` — порожній список без помилки | `Literal["uk", "ru"]` → `422` |
| `news_dashboard/app/scraper.py`, `fetch_one` | статус відповіді не перевірявся: сторінку «403» розбирало як стрічку, «0 новин, помилки немає»; `except Exception` ховав будь-які помилки | `raise_for_status()`; ловимо лише мережеві помилки й тайм-аут |
| `scraper.py`, `_parse_page` | друга копія парсера зі своїм словником категорій (і помилкою з піддоменами, урок 36) | `parse_rbc_news` + `NewsItem` з уроку 36 |
| `fastapi_demo/load_test.py` | клієнт `httpx` на 500 з'єднаннях сам гальмував вимір; тайм-аут 30 с < 40 с тесту | клієнт навантаження — `aiohttp` без ліміту з'єднань, тайм-аут 60 с |
| `load_test.py`, docstring | «`uvicorn app.main:app --reload`» — порт 8000, а тест стукає на 8001 | `uvicorn app.main:app --port 8001` |

Вимір `fastapi_demo/load_test.py`: перший запуск показав «❌ ПРОБЛЕМА» для 500 запитів до `/async-correct` (16.56 с замість 2 с). Винен був клієнт тесту: `httpx.AsyncClient` на сотнях з'єднань сам гальмує (500 запитів до `/health`: httpx 5.66 с, aiohttp 0.22 с), а тайм-аут 30 с менший за 40 с тесту. Після заміни клієнта на aiohttp і тайм-ауту 60 с — числа в таблиці уроку.

## Урок 38. FastAPI + SQLAlchemy: повний CRUD

| Де (`production_bot`) | Було | Стало |
|---|---|---|
| `core/database.py`, `get_db` | COMMIT після `yield` — з FastAPI ≥ 0.118 після відповіді: клієнт бачить успіх, навіть якщо COMMIT не вдався | `Depends(get_db, scope="function")`; `fastapi>=0.121`; тест |
| `core/database.py`, `get_db` | анотація `-> AsyncSession`, хоча це генератор (mypy `--strict` — помилка) | `-> AsyncIterator[AsyncSession]` |
| `core/database.py`, `alembic.ini` | адреса лише PostgreSQL, у `alembic.ini` — ще й окремо, з паролем | одна `DATABASE_URL` зі змінної середовища для застосунку й міграцій; без неї — SQLite |
| `repositories/base.py`, `user_repo.py` | `from sqlalchemy import func, select` усередині методів; `datetime` — теж | імпорти вгорі модуля |
| міграція, згенерована autogenerate | `server_default=sa.text('now()')` — лише PostgreSQL | `sa.func.now()` — PostgreSQL і SQLite |
| — (нове в уроці) | SQLite `lower()` знає лише латиницю: пошук «ЗЕЛЕНСЬК» не знаходив «Зеленськ» | `lower()` з Unicode для SQLite (`db.py`); тест пошуку на обох базах |

## Урок 39. Middlewares і кешування (Redis)

| Де | Було | Стало |
|---|---|---|
| `ai_bot/…/rate_limit_repo.py` | `INCR`, потім окремий `EXPIRE` лише при `count == 1`: збій між ними — ключ без TTL, блокування назавжди | транзакція `INCR` + `EXPIRE … NX`; «залишок» без TTL лікується |
| `ai_bot/…/rate_limit.py` | алгоритм названо «Sliding Window Counter», а це фіксоване вікно | назву виправлено; межу вікна показано вимірюванням |
| `production_bot/…/redis.py` | глобальна змінна `_redis_pool`, не підміниш у тестах | клієнт у `app.state` з `lifespan`, `Depends(get_redis)`; `fakeredis://` для тестів |
| `news_dashboard/…/main.py`, `/api/scrape/archive` | у фонову задачу передавали `db` запиту; статус задач — у базі новин | своя сесія бази в задачі; статус — Redis-hash з TTL; помилка → `failed` |
| — (урок 39) | рядки журналу `news_hub` нікуди не виводились: uvicorn налаштовує лише свої логери | `setup_logging()` у `lifespan` |
| — (урок 39) | інвалідація кешу в ендпоінті йшла б до COMMIT | middleware `invalidate_cache` — після COMMIT |

## Урок 40. Автентифікація та security basics

| Де | Було | Стало |
|---|---|---|
| `api.py` (урок 35) + групи зі старого курсу | через API учасник групи міняв (`200`) і видаляв (`204`) чужі нотатки: `get_note_detail` віддає нотатки групи, а перевірка автора була лише в HTML-views | `_get_own_note` для `PATCH`, `DELETE`, `pin` → `403`; тест |
| `settings.py`, `DEFAULT_AUTHENTICATION_CLASSES` | `Session` + `Basic`: пароль у кожному запиті; анонім отримував `403` | `JWT` першим + `Session`: анонім — `401` з `WWW-Authenticate: Bearer` |
| `settings.py` | `SECRET_KEY`, `DEBUG = True`, `ALLOWED_HOSTS` — у коді | зі змінних середовища (значення для навчання — за замовчуванням) |
| — (нове в уроці 40) | вхід для API лише через сесію | `/api/token/`, `/api/token/refresh/`, throttle 5/хв |
| `services.create_note` | у старому курсі не приймав `is_pinned` (виправлено в уроці 34) — конфлікт при перенесенні | `is_pinned` і `group` разом |

## Урок 41. Тестування API (pytest + httpx)

| Де | Було | Хто знайшов | Стало |
|---|---|---|---|
| `models.py` (урок 36) | `published_time` приймав лише «HH:MM»; ISO-час з `<time datetime>` → новину відхилено | тест конвеєра на збереженій сторінці | `field_validator`: з ISO береться час |
| `scraper.py` (урок 37, `news_dashboard`) | `resp.text()` на битому байті — `UnicodeDecodeError` повз `except`, `gather` губив усі сторінки | фейковий HTTP-сервер | `resp.text(errors="replace")` |
| `models.py`, `api.py` (36–37) | `host.endswith("rbc.ua")` пропускав `fakerbc.ua`: сервер завантажував чужий сайт на запит | покриття гілок → тест межових значень | `is_rbc_host` |
| `parser.py` (урок 36) | з beautifulsoup4 4.12 `_classes` падав на тезі без `class` | прогін на мінімальних версіях | порожні значення відкидаються |
| `tests/` (урок 39) | один рівень, HTML у рядках, мережа й `get_db` не тестувались, покриття занижене | — | unit / integration, фікстури, мок і фейк, `aclient`, `.coveragerc` |

## Урок 42. AI-інструменти розробника

| Де | Було | Хто знайшов | Стало |
|---|---|---|---|
| `news_hub/CLAUDE.md` | приклад старого курсу описував MongoDB, `nlp.py`, Streamlit | звірка з кодом | команди перевірки й правила проєкту |
| `news_hub/rss.py` (код агента) | новина без `<pubDate>` валила всю стрічку; `-0000` — як час сервера | тест рецензента | новина без часу; `-0000` = UTC |
| `news_hub/models.py` (код агента) | без `<category>` категорія «2026» | тест рецензента | розділ — перший сегмент шляху для не-rbc доменів |
| `news_hub/requirements.txt` | `zoneinfo` без `tzdata` — у Windows модуль не імпортується | тест рецензента (без бази поясів) | `tzdata>=2024.1` |
| `depression_dashboard` | 10 вад з таблиці вище + пороги, підписи, залежності | `tests/test_review.py`, AppTest | див. таблицю й README |
| [довідник Claude Code](../docs/modules/m4/ai/claude_code.md) | моделі, режими, події hooks, Agent SDK, CI — станом на 2025-05 | звірка з документацією й `claude --help` | виправлено; AI-аудитор помилився в 4 пунктах, їх відкинуто |

### `depression_dashboard` — 10 вад, виправлених у копії курсу

| # | Знахідка | Як доведено | Виправлення в копії |
|---|---|---|---|
| 1 | «топ-ознаки» й «найсильніші предиктори» — за абеткою | тест порядку після `jsonify` | `StrictJSONProvider(sort_keys=False)`, сортування в UI |
| 2 | назви кластерів вшиті в UI: «Sleep Deprived» — кластер, що спить **найбільше** (8,15 год), «Financially Stressed» — кластер з 2 людей | центроїди моделі старого курсу; тест «назва відповідає профілю» | назву дає профіль кластера порівняно з середнім |
| 3 | `/api/predict` приймав похідні ознаки від клієнта: `Risk_Score=-100` змінював прогноз; `Age=-500` → `200`; пропущене поле → `500` з текстом pandas | тести з поганими даними | `StudentProfile` (Pydantic, `extra="forbid"`) → `422`; похідні ознаки — `add_features` на сервері, одна функція для навчання й прогнозу |
| 4 | повзунок CGPA ні на що не впливав: CGPA немає в ознаках моделі | прогноз з CGPA 0,1 і 10 однаковий | повзунок прибрано; невідоме поле → `422` |
| 5 | `POST /api/train` без захисту перезаписував модель | тест: без токена → `403` | `X-Admin-Token` = `ADMIN_TOKEN` (`hmac.compare_digest`); без змінної — вимкнено |
| 6 | витік даних: імпутер і скейлер навчались на всіх рядках до `train_test_split` | тест: медіани імпутера = медіани навчальної вибірки | `Pipeline`, навчений лише на навчальній частині; скейлер для лісу прибрано |
| 7 | pickle на 57 МБ читався з диска на кожен запит; перезапис на місці | тест: 3 прогнози — 0 читань з диска | кеш у пам'яті, атомарна заміна файлу, версія scikit-learn у файлі |
| 8 | `/api/groups` дописував колонку в кешований DataFrame | тест: після `/api/groups` у `/api/summary` є чужа колонка | `.copy()` |
| 9 | невідоме значення у стовпці → `NaN` у відповіді — невалідний JSON | тест зі строгим парсером JSON | `null`, `allow_nan=False` |
| 10 | папка `ui/pages/` — Streamlit автоматично додає 5 порожніх сторінок у меню | Streamlit AppTest | `ui/views/` |

А ще: пороги ризику в UI (0,3 / 0,5) не збігались з бекендом (0,5 / 0,75); `delta="vs overall"` — підпис без порівняння; `requirements.txt` з `==` під Python 3.11, без колес для 3.13. Усе виправлено й перелічено в [README проєкту](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_42_ai_dev_tools/depression_dashboard/README.md). Streamlit-дашборд після змін пройдено через `streamlit.testing.AppTest` проти живого бекенду: 5 розділів, форма прогнозу, жодного винятку.

## Урок 43. Інтеграція LLM API

Джерела: `module_5/lesson_46_Telegram_API/ai_bot/app/services/ai_service.py` (+ `handlers/chat.py`, `config/settings.py`) і `module_4/lessons/lesson_34_asyncio/news_dashboard/app/nlp.py`.

| Де | Було | Як перевірено | Стало (`news_hub/llm.py`, `analysis.py`) |
|---|---|---|---|
| `ai_service.py`, docstring | «google-genai SDK НЕ підтримує native async» → `asyncio.to_thread` | `client.aio.models.generate_content` є в google-genai з 1.x | асинхронний клієнт, без потоків |
| `_call_gemini_sync` | новий `genai.Client` на кожен виклик («Client не thread-safe») | потоків більше немає | один клієнт на застосунок (`lifespan`) |
| `_classify_error` | класифікація за словами в тексті винятку; результат ніде не використовується — **будь-яка** помилка веде до наступної моделі | невалідний ключ: Gemini відповідає `400 INVALID_ARGUMENT` «API key not valid» — старий код пробував усі 4 моделі й рахував збій | `APIError.code`; 400/401/403 — одразу `LLMUnavailable`, без перебору пулу; тест `test_gemini_client_error_stops_at_once` |
| `_circuit_record_failure` | `GET` + `SETEX` — не атомарно: одночасні збої перезаписують лічильник | Redis 7: 20 одночасних збоїв → лічильник 3 (на fakeredis гонки не видно — урок 41; у ноутбуці — Redis із затримкою мережі) | `INCR` + `EXPIRE … NX` у транзакції; тест `test_breaker_counts_concurrent_failures` |
| `ask()` + `handlers/chat.py` | збій повертався **рядком** («😔 AI сервіс наразі недоступний…»), а `chat.py` перевіряв `is None` — текст помилки зберігався в історію як відповідь асистента й ішов у наступні промпти | читання коду: `ask()` ніде не повертає `None` | винятки `LLMUnavailable` / `CircuitOpen` → 502 / 503 |
| `nlp.py` | тональність за основами слів («загин» −, «перемог» +), ключові слова — частота, тема — з URL (у знімку rbc.ua всі 168 новин мають категорію «Новини») | знімок | `NewsAnalysis` від LLM, перевірка Pydantic; розділ сайту лишився в `category`, тема — `ai_category` |

Знахідки в новому коді уроку (під час перевірки, до коміту) — «Знайди помилку» й розділ «Контракт з провайдером» уроку побудовано на першій:

| Що | Як знайдено | Стало |
|---|---|---|
| `response_schema=NewsAnalysis` з `extra="forbid"` → у схемі `additionalProperties`, Gemini відповідає `400 Unknown name "additional_properties"`; усі тести з FakeLLM зелені | `pytest -m llm` з невалідним ключем: Google перевіряє структуру запиту раніше за ключ | `response_json_schema`; контрактний тест `test_gemini_accepts_request_shape` |
| тайм-аут ловився як `httpx.TransportError`, а SDK з встановленим aiohttp кидає `TimeoutError` / `aiohttp.ClientError` → 500 замість наступної моделі | `timeout=0.001` проти справжнього API | `NETWORK_ERRORS`; параметризований тест на 4 типи |
| `google-genai>=1.21` у першій версії requirements — там немає `response_json_schema` у `GenerateContentConfig`, до 1.39 — `client.aio.aclose()` | прогін на мінімальних версіях | `>=1.39`; `httpx>=0.28.1` (вимога google-genai), `typing-extensions>=4.14` (anthropic 1.x) |
| aiohttp 3.10.0–3.10.9: google-genai при помилці запиту звертається до `aiohttp.ClientConnectorDNSError` → `AttributeError` замість `LLMUnavailable` | контрактний тест на мінімальних версіях | `aiohttp>=3.10.10` |
| клієнт Gemini не закривав aiohttp-сесію → на 3.10 `RuntimeError: Event loop is closed` при виході | прогін ноутбука на 3.10 | `LLMClient.aclose()`, виклик у `lifespan` |

## Урок 44. Архітектура застосунків і патерни

Джерела: `crispy_notes_project` уроку 40 (код `lesson_Django_authentication_and_security` старого курсу) і `module_5/lesson_Django_ORM_Database/notes_project_cbv/` (CBV).

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `selectors.get_todo_list_detail`, `get_shopping_list_detail`, views `*_edit` / `*_delete` | `.get(Q(user=u) \| Q(shared_with=u), pk=…)` — M2M з OR дає рядок на кожного, з ким поділено: список, поділений з двома, — `MultipleObjectsReturned` (500) для власника на сторінці, редагуванні й видаленні | тест: поділити з ann і bob → `get()` повертає 2 рядки | `todo_lists_visible_to` / `shopping_lists_visible_to` з `.distinct()`; тест `test_list_shared_with_two_users_is_returned_once` |
| `get_user_shopping_lists` vs `get_shopping_list_detail` | список груп є в «Мої списки», а сторінка списку групи — 404 (різні правила доступу у двох selectors); відмітити товар учасник групи теж не міг | тест: учасник групи → `/shopping/<pk>/` → 404 | одне правило `shopping_lists_visible_to`; тест `test_every_listed_shopping_list_opens` |
| `views.tag_create` | `redirect(request.GET['next'])` без перевірки — відкритий редирект (`?next=https://evil…`) | тест з `https://evil.example` і `//evil.example` | `url_has_allowed_host_and_scheme` у `TagCreateView.next_url` |
| `views.notebook_create` | опис записника дописувався у view після `create_notebook` (другий `save`) | читання коду | параметр `description` у `services.create_notebook` |
| `views.group_delete` | не учасник групи отримував 403 (а неіснуюча група — 404): видно, що група існує | читання коду | 404 для обох (`get_group_with_members`) |
| `views.group_detail` (remove) | `User.objects.get(pk=…)` — будь-який користувач сайту | читання коду | `selectors.get_group_member` — лише учасник |
| `notes_project_cbv` `NoteCreateView` / `UserQuerySetMixin` | `is_pinned` не передавався в сервіс (як в уроці 34); міксин `filter(user=…)` ховав нотатки групи | перенос на проєкт з групами | `NoteFormMixin.note_fields`, `SelectorQuerySetMixin` + `OwnerRequiredMixin` |
| `requirements.txt` | `django-debug-toolbar>=4.0` — з Django 5.2 не імпортується (`get_storage_class`), `debug_toolbar_urls` лише з 4.4 | прогін на мінімальних версіях (Python 3.10) | `>=4.4.3` (4.4.4 має баг з `jinja2`, pip однаково бере новішу) |

Знахідка в новому коді уроку (до коміту): фільтри `NoteListView` спершу читались у `setup()` — він виконується до `dispatch()`, тобто до `LoginRequiredMixin`: анонім з `?tag=1` робив запит до бази з `AnonymousUser` (`TypeError`). Перенесено в `get()`; тест `test_anonymous_is_redirected_before_any_query` (0 запитів). Використано на сторінці як приклад життєвого циклу CBV.

«Знайди помилку» уроку побудовано на M2M + OR без `distinct()`.

## Урок 45. WebSockets + практика: чат

Джерело: `module_5/lesson_Django_Async/notes_chat_app/` старого курсу (= застосунок Django-книги, крок 7B): `consumers.py`, `routing.py`, `asgi.py`, `ChatMessage`, `group_chat.html`, `js/group_chat.js`, `tests/test_consumers.py` (9 тестів — перенесено без змін, проходять).

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `notes_project/asgi.py` | `AuthMiddlewareStack(URLRouter(...))` без перевірки `Origin` — Cross-Site WebSocket Hijacking: будь-який сайт, відкритий у браузері залогіненого користувача, під'єднується до чату (cookie сесії йде з будь-якої сторінки) і читає історію | тест з `Origin: https://evil.example` → `connect()` = `(True, None)` | `AllowedHostsOriginValidator`; тести `ChatOriginTests` (чужий сайт, `localhost.evil.example`, без Origin) |
| `consumers.GroupChatConsumer` | членство перевіряється лише в `connect()`: вилучений з групи учасник з відкритою вкладкою далі отримує всі повідомлення й пише (повідомлення зберігаються) | тест: `group.user_set.remove(ann)` → Анна отримує наступне повідомлення, її повідомлення збережено | `services.post_chat_message` перевіряє членство на кожне повідомлення (→ close 4403); `remove_user_from_group` / `delete_group` надсилають подію `member.removed` / `group.deleted` після COMMIT → consumer закриває з'єднання |
| `consumers.py` | ORM у consumer (`Group.objects.get`, `ChatMessage.objects…`) — правило членства вдруге, окремо від сторінок групи | `tests_architecture` (ast) | `selectors.is_group_member` / `recent_chat_messages`, `services.post_chat_message` |
| `js/group_chat.js` | перепідключення з backoff без кінця: відмову в handshake (не учасник) браузер бачить як 1006 — спроба кожні 30 с назавжди | читання коду | коди 4000–4999 — без перепідключення; не більше 5 невдалих спроб поспіль |
| `views.group_chat` | `get_object_or_404(Group)` + перевірка членства у view | — | `selectors.get_group_with_members`, не учасник → 404 (як сторінки групи в уроці 44) |
| `templates/notes_app/group_chat.html` | чотири багаторядкові `{# … #}` — у Django `{#` лише однорядковий, тож текст іде в HTML; рядок «inline <script> з {{ group.pk }}» відкриває справжній `<script>`, який поглинає решту сторінки разом з `#chat-config` → `group_chat.js`: `Cannot read properties of null (reading 'dataset')`, чат не підключається взагалі. Тести старого курсу сторінку не рендерили | наживо (Playwright): статус «Підключення...» назавжди, помилки в консолі | `{% comment %} … {% endcomment %}`; тест `test_template_comments_are_not_rendered` (на старому шаблоні — червоний) |

Знахідка в новому коді уроку (до коміту): `AllowedHostsOriginValidator` читає `ALLOWED_HOSTS`/`DEBUG` один раз при імпорті `asgi.py` — у тестах (`DEBUG=False`, порожній `ALLOWED_HOSTS`) відхиляв і власні сторінки; стек винесено у `websocket_application()`, тест збирає його з `override_settings(ALLOWED_HOSTS=['localhost'])`. На сервері треба `DJANGO_ALLOWED_HOSTS` — інакше чат не підключиться (сказано на сторінці уроку).

«Знайди помилку» уроку побудовано на перевірці членства лише в `connect()`.

## Урок 46. Security advanced

Джерела:
- `module_5/lesson_46_Telegram_API/production_bot/backend/`:
  - `core/security.py`, `core/config.py`;
  - `api/deps.py`, `api/admin/auth.py`;
  - `api/webhook.py`;
- `module_5/lesson_Django_authentication_and_security/OWASP_TOP_10.md`, розділ A10 (SSRF).

У `news_hub` уроку 43 не було жодної автентифікації: `DELETE /api/news`, збір і платний аналіз LLM міг запустити будь-хто.

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `core/security.py` + `api/admin/auth.py` | `passlib` `CryptContext(schemes=["bcrypt"])`; `auth.py` хешує пароль **при імпорті** (`_ADMIN_PASSWORD_HASH = hash_password(...)`) | чиста установка (`passlib 1.7.4`, `bcrypt 5.0.0`): `(trapped) error reading bcrypt version`, потім `ValueError: password cannot be longer than 72 bytes` — застосунок не стартує | `bcrypt` напряму; пароль > 72 байт — «не той пароль» (bcrypt 5 кидає `ValueError` і в `checkpw` → було б 500); тест |
| `core/config.py` | `JWT_SECRET` за замовчуванням `"change-me-in-production"`, `ADMIN_PASSWORD="change-me"`; `validate()` перевіряє лише «не порожній» | `validate()` пропускає; токен, підписаний `"change-me-in-production"`, приймається (`{'sub': 'admin', 'role': 'admin', …}`); PyJWT сам попереджає: ключ 23 байти < 32 | без значень за замовчуванням: нічого не задано → 503; секрет < 32 символів → застосунок не стартує; у env — хеш пароля, не пароль |
| `core/config.py` | `JWT_ALGORITHM` з env | — | алгоритм у коді (HS256); `decode` вимагає `exp`, `sub`, `role`; тести `alg: none`, HS512 тим самим секретом, без `role` |
| `api/admin/auth.py` | ім'я — `!=`, при чужому імені пароль не перевіряється (відповідь швидша — видно, що ім'я не те); без ліміту спроб | читання коду | `hmac.compare_digest` для імені, bcrypt завжди; 5 спроб за 5 хв з адреси → 429 |
| `api/webhook.py` | секрет у **шляху** `/webhook/{SECRET}` + заголовок, порівняння `!=` | uvicorn пише шлях у журнал: `"POST /webhook/s3cr3t-from-env HTTP/1.1" 200 OK` | для власних webhook — підпис HMAC(час + тіло), вікно 5 хв, повтор → 409 (Redis `SET NX`), `compare_digest`; для Telegram (урок 47) — `verify_secret_token` з `compare_digest`, секрет не в URL |
| `OWASP_TOP_10.md`, A10 | захист SSRF: `urlparse(url).hostname in ALLOWED_HOSTS_FOR_FETCH`, потім `requests.get(url)` — `requests` сам іде за перенаправленням | локальний демо-сервер: дозволений хост відповідає `302 → http://localhost:<порт>/latest/meta-data/`; `is_safe_url: True`, фінальна адреса — внутрішня, відповідь `INTERNAL: aws_secret_access_key=...` | `safe_fetch`: перевірка IP **після DNS** у resolver з'єднання, кожне перенаправлення вручну через ті самі перевірки, порти 80/443, розмір, тип; тест `test_redirect_is_checked_again` (внутрішній сервер не отримує жодного запиту) |

Знахідки в новому коді уроку (до коміту):
- `POST /api/webhooks/scrape` з підписаним, але не-JSON тілом відповідав 500: `error.errors()` містить сирі `bytes`, а JSONResponse їх не серіалізує. Виправлено: `include_input=False`, тест `test_signature_is_checked_before_json`.
- Тест з другим `TestClient(app)` проходив на новому Starlette й падав на мінімальних версіях. Причина: `Queue is bound to a different event loop` — база тесту живе в циклі першого клієнта. Тепер тест використовує той самий клієнт.

Обмеження середовища: `www.pravda.com.ua` заблоковано мережевою політикою (`connect_rejected`). Справжню стрічку через `POST /api/sources/{id}/fetch` не завантажено — відповідь `HTTP 403` від проксі середовища. Позитивний шлях перевірено на локальному aiohttp-сервері з фікстурою `pravda_rss.xml`.

«Знайди помилку» уроку побудовано на SSRF-захисті з `OWASP_TOP_10.md` (перенаправлення).

## Урок 47. Telegram Bot API

Джерела — `module_5/lesson_46_Telegram_API/` старого курсу:
- `ai_bot/app/`: `bot.py`, `handlers/commands.py`, `middlewares/`, `utils/`;
- `echo_bot/`;
- `production_bot/backend/`: `app.py`, `api/webhook.py`, `workers/notifications.py`, `models/subscription.py`.

Код старого курсу запущено без змін (`aiogram 3.15.0` з його `requirements.txt`) проти двійника Telegram Bot API. Двійник відтворює задокументовані правила HTML-розмітки: «<», «>», «&» поза тегом — помилка «can't parse entities».

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `ai_bot/app/handlers/commands.py`, `/start` | `f"Привіт, <b>{user.first_name}</b>!…"` з `parse_mode=HTML` — ім'я не екрановано | `/start` від `<Олена>` → `TelegramBadRequest: … can't parse entities: unexpected character`; від `Tom & Jerry` → `… unsupported entity`: бот мовчить | `esc(...)` для всього зовнішнього; тест `test_start_escapes_user_name` |
| `ai_bot/app/utils/formatter.py`, `split_long_message` | розріз кожні 4000 символів | довга відповідь AI з блоком коду (`format_ai_response`) → 4 частини, 2 з них з розірваним `<pre>`: «can't find end tag» | `split_message` по рядках; тести `test_split_only_between_lines`, `test_old_split_cuts_inside_markup` |
| `ai_bot/app/utils/formatter.py` | regex у docstring без `r"…"` | Python 3.13: `SyntaxWarning: invalid escape sequence '\w'` (ще `'\s'`, `'\*'`) при імпорті | у перенесеному коді docstring без таких послідовностей |
| `ai_bot/app/handlers/*.py` + `bot.py` | `router = Router(...)` — змінна модуля | другий `create_dispatcher(redis)` у тому ж процесі → `RuntimeError: Router is already attached to <Dispatcher …>` (тести, API + polling) | `build_router()` — новий роутер на кожен диспетчер |
| `production_bot/backend/app.py`, lifespan | при зупинці `await bot.delete_webhook()` | читання коду: під час перезапуску (новий процес уже поставив webhook) старий його видаляє — Telegram перестає надсилати update | webhook не видаляється при зупинці; тест `test_lifespan_sets_webhook_and_keeps_it`; наживо — після зупинки uvicorn `getWebhookInfo` показує той самий url |
| `production_bot/backend/workers/notifications.py` | `while True` + `sleep(3600)`; `except Exception: logger.warning` на кожне повідомлення | читання коду: заблокований користувач (403) отримує спробу щогодини назавжди; 429 не обробляється | розсилка після збору лише нових новин (`insert_new`); 403 → підписки чату видаляються; 429 → `retry_after`; тести `test_blocked_chat_loses_subscriptions`, `test_retry_after_429` |
| `production_bot/backend/models/subscription.py` | `user_id` FK на `users`, тариф | — | підписка = (`chat_id` BigInteger, слово): id груп у Telegram — понад 32 біти; тест `test_group_chat_id_fits` падає з `Integer` на PostgreSQL |

Обмеження середовища: `api.telegram.org` заблоковано мережевою політикою — справжнім ботом не перевірено. Бот, webhook і polling перевірено на двійнику: uvicorn + `setWebhook` + update через webhook; `python -m news_hub.bot` + `getUpdates`. Ключа LLM немає — `/digest` на `FakeLLM`.

## Бонус. Linux для розробника (довідник)

Джерело — `module_5/lesson_Linux_DevOps_Basics/` старого курсу (18 розділів + `INDEX.md`), перенесено в `docs/modules/m5/linux/`.
Команди запущено в контейнерах `ubuntu:24.04`, `debian`, `python:3.12-slim`, `postgres:16-alpine`, `nginx:1.27-alpine`
(`nginx -t`, `systemd-analyze verify`, `docker compose config`, actionlint, kubernetes-validate, GNU Make 4.3, sshd у контейнері).
Mermaid: `\n` → `<br>`, світла палітра й класи; parse error у розділі 16 виправлено.

| Файл | Було | Як перевірено | Стало |
|---|---|---|---|
| 01 | «Ubuntu, Debian, CentOS»; рядок «CentOS / Rocky Linux» | CentOS Linux 7 — EOL 30.06.2024 (CentOS 8 — раніше) | Rocky Linux / AlmaLinux — наступники CentOS Linux |
| 02 | `ls --all` як довга форма `ls -l -a` | `ls --all -l /` в ubuntu:24.04 | `ls -l --all` (довга форма лише `-a`) |
| 02 | Ctrl+Z «відправити у background» | pty: `jobs` → `Stopped` | «призупинити (Stopped); далі `fg`/`bg`» |
| 03 | `/usr/bin`: python, git, nginx | ubuntu:24.04: `/usr/sbin/nginx`, `python` немає | python3, git; nginx — у `/usr/sbin` |
| 03 | `tree` без примітки | у ubuntu:24.04 немає | `sudo apt install tree` |
| 03 | `rm -rf /` знищить систему | `rm: it is dangerous to operate recursively on '/'` (--preserve-root) | небезпечні `rm -rf /*` і `rm -rf "$DIR"/*` з порожньою змінною |
| 04 | `w` на файлі — «змінювати і видаляти» | файл 777 у папці 555 не видаляється; 444 у папці з w — видаляється | видалення залежить від `w` на директорії |
| 04 | `chown` без sudo | `Operation not permitted` | `sudo chown` |
| 05 | nginx worker від користувача `nginx` | ubuntu: `www-data` | `www-data`, примітка про скорочений вивід |
| 05 | вигаданий вивід `ss -tulpn`, runserver на 0.0.0.0:8000 | справжній `ss`/`lsof`: runserver слухає 127.0.0.1:8000 | справжній формат; примітка про 127.0.0.1 |
| 05 | `journalctl -u nginx # всі логи Nginx` | (з документації) access/error — у /var/log/nginx | журнал сервісу — старт/стоп; `nginx -t` |
| 06 | `pip install django` у системний Python | ubuntu:24.04 → `externally-managed-environment` (PEP 668) | лише у venv; не обходити `--break-system-packages` |
| 06 | `.venv` 100+ МБ | venv з Django — 67 МБ | «десятки–сотні МБ» |
| 06 | `which python` | у ubuntu:24.04 немає `python` | `which python3` |
| 07 | «при наступних підключеннях перевірки не буде» | known_hosts; `ssh-keygen -R` в ubuntu:24.04 | SSH мовчки звіряє ключ з `known_hosts` |
| 07 | `echo … >> ~/.ssh/authorized_keys` без каталогу | новий користувач: `Directory nonexistent` | `mkdir -p ~/.ssh` (вхід по ed25519 перевірено sshd у контейнері) |
| 08 | `python` замість `/usr/bin/python3` | в Ubuntu `python` за замовчуванням немає | `python3` |
| 08 | лише `KeyError: 'SECRET_KEY'` | decouple → `UndefinedValueError`, django-environ → `ImproperlyConfigured` (python:3.12-slim) | усі три повідомлення |
| 09 | `set -e` зупиняє на будь-якій помилці | `false \| true`, `false && …`, `if` — не зупиняють | примітка про винятки і `set -euo pipefail` |
| 09 | CRLF: `$'\r': command not found` | `./crlf.sh` → `/usr/bin/env: 'bash\r'`; `bash crlf.sh` → `$'\r'` | обидва справжні повідомлення |
| 10 | `.PHONY` без `clean`, `format`, `restart`… | GNU Make 4.3: `'clean' is up to date` після `touch clean` | повні списки `.PHONY` |
| 10 | діаграма: `make test` → `pytest --tb=short` | Makefile сторінки: `python manage.py test` | виправлено вузол |
| 11 | `GRANT ALL PRIVILEGES ON DATABASE` | postgres:16: `permission denied for schema public` | `ALTER DATABASE … OWNER TO myapp_user` |
| 11 | `User=www-data` + сокет `/run/myapp.sock` | gunicorn від www-data: `Can't connect to /run/myapp.sock` | `RuntimeDirectory=myapp`, `/run/myapp/myapp.sock`; nginx → gunicorn 200 |
| 11 | `STATIC_ROOT` у `.env`, але settings його не читає | `collectstatic`: `ImproperlyConfigured … STATIC_ROOT` | примітка (сторінка 08) |
| 11 | runserver «однопотоковий» | `runserver --help`: `--nothreading` | «один процес (dev-сервер)» |
| 12 | `uvicorn … --bind 0.0.0.0:8000` | uvicorn 0.54: `No such option '--bind'` | `--host 0.0.0.0 --port 8000` |
| 12 | `-k uvicorn.workers.UvicornWorker` | uvicorn 0.54: DeprecationWarning | `uvicorn-worker`, `-k uvicorn_worker.UvicornWorker` |
| 12 | сокет `/run/myapp.sock` | як 11 | `/run/myapp/myapp.sock` |
| 12 | Django «завантажує файл у пам'ять» | `django.views.static.serve` → `FileResponse` | «віддає шматками» |
| 13 | вигаданий traceback `[ERROR] Exception in application … could not connect to server` | Django 5.2 + gunicorn з недоступним PostgreSQL | справжній текст (`connection to server at … failed`); з DEBUG=False без LOGGING traceback у лог не йде |
| 13 | `FileHandler` у `/var/log/myapp/` без застереження | без папки: `ValueError: Unable to configure handler 'file'` | папка має існувати й бути доступною на запис |
| 13 | `try:` з тілом лише коментарем | `compile()` → `IndentationError` | `...` |
| 14 | `apt-get install libpq-dev` «для psycopg2» | у python:3.12-slim немає gcc | `gcc libpq-dev`, лише для збирання з сирців; з `psycopg[binary]` не потрібно |
| 14 | `docker run postgres:16` без пароля | `Database is uninitialized and superuser password is not specified` | `-e POSTGRES_PASSWORD=…` |
| 14 | дані PostgreSQL зникають після перезапуску | `restart`, `stop`+`start` дані зберігають; зникають після `rm` + `run` без тому | уточнено |
| 15 | healthcheck `pg_isready -U $POSTGRES_USER` | `compose config`: `variable is not set` → `-U  -d` | `$$POSTGRES_USER` + пояснення |
| 15 | `worker`: `depends_on` без умов | `compose config` | `condition: service_healthy` |
| 15 | `docker compose exec web ping db` | `ping` у slim немає (127) | `getent hosts db` |
| 15 | ключ у `services:` — ім'я контейнера | `compose ps`: `проєкт-web-1` | ім'я сервісу |
| 15 | застарілий текст помилки libpq | libpq 17 | `connection to server at "db" … failed` |
| 16 | `deploy.yml` з `needs: test` | actionlint: `needs job "test" which does not exist` | job у тому самому `ci.yml` |
| 16 | `safety check` | safety 3.8: вимагає облікового запису | `pip-audit` |
| 16 | PR не можна змерджити, якщо CI впав | лише з branch protection | уточнено |
| 16 | відкат `docker pull myapp:v1.2.3; docker compose up -d` | compose з `myapp:latest` тег не підхоплює | `image: myapp:${TAG:-latest}`, `TAG=v1.2.3 docker compose up -d` |
| 16 | mermaid `{Ручне QA\n(або auto E2E)}` | mermaid 11: `Parse error on line 8` | мітка в лапках |
| 17 | HPA `target:` без `type` | kubernetes-validate 1.31: `'type' is a required property` | `type: Utilization` |
| 17 | HPA за CPU без `resources.requests` | документація k8s | `requests.cpu: 250m`, metrics-server |
| 17 | Secret — «зашифровані дані» | за замовчуванням base64 | уточнено |
| 17 | `kubectl` одразу після minikube | minikube kubectl не ставить | `minikube kubectl -- …` |
| 18 | `Linus` у діаграмі; DigitalOcean $5, Ubuntu 22.04 | — | `Linux`; від $4, Ubuntu 24.04 LTS |

Не перевірено (лишилось як є): реальний SSH на віддалений сервер, certbot, systemd на живому сервері (лише `systemd-analyze`),
кластер Kubernetes (лише валідація схем), ціни хостингу, зовнішні посилання розділу 18 (проксі блокує).
Розбіжності з новим курсом, лишені як є: довідник Django-центричний (деплой через systemd + gunicorn без Docker,
`python-decouple`/`django-environ`, `psycopg2-binary`); у курсі деплой — Docker (уроки 48–49), psycopg 3, змінні середовища без бібліотек.

## Урок 48. Docker

Джерело — `module_5/lesson_46_Telegram_API/production_bot/Dockerfile` старого курсу. Перевірено справжньою збіркою
(Docker 29, `python:3.12-slim`): сам `production_bot` і той самий Dockerfile над `news_hub` уроку 47.

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `production_bot/` | немає `.dockerignore`, а `Dockerfile` робить `COPY . .` | у проєкт покладено `.env` і `docker/ssl/privkey.pem` (обидва в `.gitignore`, тобто очікувані локально) → `docker run … ls /app` показує `.env`, `ls /app/docker/ssl` — `privkey.pem`: секрети й приватний ключ TLS — в образі й у кожному реєстрі, куди його штовхнуть | `.dockerignore` (`.env`, `.venv`, `tests`, `*.db`, …); тест `test_local_files_are_not_in_the_image` (перевіряє й `docker history`) |
| той самий Dockerfile над `news_hub` з локальним `.venv` | контекст збірки 1.17 ГБ (27 с лише на передачу), образ 2.2 ГБ, шар `COPY . .` — 1.31 ГБ | `docker build --progress=plain`, `docker history` | 415 МБ, шар коду — 336 кБ (`**/__pycache__` у `.dockerignore`: шаблон без `**/` діє лише в корені контексту) |
| `requirements.txt` (у `news_hub` — спільний з тестами) | в образі pytest, mypy, fakeredis; шар залежностей 289 МБ | `pip list` в контейнері | `requirements.txt` / `requirements-dev.txt`; шар 192 МБ; тест `test_dev_dependencies_are_not_installed` |
| `CMD … --workers 4` | 4 процеси незалежно від ліміту пам'яті контейнера | `docker stats`: 969 МіБ проти 251 МіБ з одним процесом | один процес; `WEB_CONCURRENCY` за потреби; масштаб — кількістю контейнерів (урок 49) |
| HEALTHCHECK | в образі немає; у `docker-compose.yml` — `curl` | `which curl` в образі → немає (curl-перевірка в Compose завжди падає — урок 49) | `HEALTHCHECK` через `python -c urllib…`; тест `test_healthcheck_reports_healthy` |
| база за замовчуванням (для `news_hub`) | відносний `news_hub.db` у `/app` | локальний `news_hub.db` потрапив в образ → `alembic upgrade head` у контейнері: `file is not a database`; користувач без root не може створити файл у `/app` | `DATABASE_URL=sqlite+aiosqlite:////data/news_hub.db`, `/data` належить `app`; тест `test_migrations_run_on_a_volume` |

Що в старому Dockerfile правильно й лишилось: `python:3.12-slim`, `requirements.txt` окремим шаром перед кодом, користувач без root, `CMD` в exec-формі.

Проміжні перевірки (не дефекти старого коду, але на сторінці — з реальними числами):
- порядок шарів: `COPY . .` перед `pip install` → перезбирання після зміни одного `.py` 39.9 с проти 0.6 с;
- shell-форма `CMD uvicorn …` → PID 1 — `/bin/sh`, `docker stop` 10.2 с і код 137 (SIGKILL) проти 1.8 с і коду 0;
- `docker run --env-file` бере значення з лапками буквально → `ADMIN_PASSWORD_HASH='$2b$…'` не проходить перевірку, контейнер
  завершується з `RuntimeError` (урок 46: fail fast). Додано `python -m news_hub.security --env-file` (без лапок) і тест.

Мутаційна перевірка тестів образу (`tests/docker/`): shell-форма CMD, без `USER app`, без `.env` у `.dockerignore`,
HEALTHCHECK на інший порт — кожну ловить принаймні один тест; старий Dockerfile — 6 з 6 червоні.

Обмеження середовища: Docker Hub відповідав 429 (ліміт анонімних pull) — образи тягнули через дзеркало `mirror.gcr.io`;
pip у збірці ходить через проксі з власним CA, тому базовий `python:3.12-slim` у пісочниці локально доповнено сертифікатом
(в образі курсу цього немає; розміри образів від цього змінились на ~250 кБ).

## Урок 49. Docker Compose + деплой

Джерела: `production_bot/docker-compose.yml` і `nginx/default.conf` старого курсу (для `news_hub`); `Dockerfile`,
`entrypoint.sh`, `docker-compose.yml`, `nginx/nginx.conf` Django-книги `notes_chat_app` (для `crispy_notes_project`).
Обидва запущено майже без змін (шляхи до застосунку, порт 8080 замість 80, без SSL-блоку) — Docker 29, Compose v5.

**news_hub (production_bot)**

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `docker-compose.yml`, `bot.healthcheck` | `curl -f http://localhost:8000/health` | `docker compose ps` → `bot … (unhealthy)`, журнал перевірки: `exec: "curl": executable file not found in $PATH` — API при цьому працює | HEALTHCHECK образу (python), у Compose — `/health/ready` |
| `nginx.depends_on: [bot]` | без умови | curl кожні 2 с після `up`: `000 502 502 502 502 200` — ~10 с nginx віддає 502 | `condition: service_healthy` |
| `nginx/default.conf` + uvicorn за замовчуванням | uvicorn довіряє `X-Forwarded-For` лише від 127.0.0.1 → IP клієнта для застосунку — адреса nginx | 5 невдалих входів → вхід адміна з правильним паролем: 429; у Redis один ключ `rate:login:172.19.0.6` = IP nginx: один зловмисник блокує вхід усім | nginx: `X-Forwarded-For $remote_addr`; uvicorn: `FORWARDED_ALLOW_IPS=172.28.0.10` (фіксована адреса nginx у мережі `edge`) |
| те саме, «виправлення» `FORWARDED_ALLOW_IPS=*` з `$proxy_add_x_forwarded_for` | клієнтський заголовок дописується, uvicorn бере крайній лівий | 8 спроб входу з `X-Forwarded-For: 10.66.0.$i` → `401 ×8`, жодного 429 (ключі `rate:login:10.66.0.1…`) — захист від перебору пароля обходиться | див. рядок вище: 7 спроб → `401 ×5, 429 ×2`; інший клієнт (інша адреса) входить |
| `postgres.environment` | `POSTGRES_PASSWORD: password` у compose, поруч `env_file: .env` | читання | `${POSTGRES_PASSWORD:?…}` з `.env`; без нього `docker compose config` падає |
| `bot` без `depends_on: migrate` | API стартує паралельно з міграціями | читання | `condition: service_completed_successfully` |
| `backend/app.py`, lifespan | `set_webhook()` без обробки помилок (те саме в `news_hub` уроку 47) | Telegram недоступний (`twin` не запущено) → `TelegramNetworkError` → `Application startup failed. Exiting.`, api по колу, новини недоступні | реєстрація — фонова задача з повторами (1, 2, 5, 10, 30 с), 401 — лише журнал; тести `test_api_starts_while_telegram_is_down`, `test_wrong_token_does_not_stop_api`; наживо: api healthy одразу, `бот зареєстрований (спроба 5)` після старту двійника |

**news_hub — власний код попередніх уроків**

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `security.load_admin_settings` (урок 46) | хеш перевірявся лише `startswith("$2")` | `.env` Compose з хешем без лапок: Compose підставив `$eBDJ…` → порожньо (попередження `The "eBDJ…" variable is not set`), хеш обрізано до `$2b$12`, старт проходить, а вхід відповідає 500 | повний формат bcrypt (`$2b$12$` + 53 символи), інакше помилка при старті; тест `test_truncated_hash_fails_at_startup`; `.env.example`: значення з `$` — в одинарних лапках |
| `HEALTHCHECK` образу (урок 48) для `bot`, `twin`, `migrate` | успадковується всіма ролями образу | `docker compose ps`: `twin (unhealthy)`, `bot (unhealthy)` — вони не слухають :8000; `up --wait` падає | `healthcheck: disable: true` для цих сервісів |

**crispy_notes_project (Django-книга)**

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `entrypoint.sh` + bind mount `.:/app` | файл у git з режимом `100644`; `chmod +x` в образі перекривається bind mount | `docker compose up` на Linux: `exec: "./entrypoint.sh": permission denied` (на Windows Docker Desktop файли видно як виконувані — там працює) | без entrypoint і без bind mount: команди — у `command:` сервісів |
| `entrypoint.sh`: `migrate` при старті кожного `web` | — | чиста база, `--scale web=2`, 3 запуски: друга репліка падає всі 3 рази — `UniqueViolation … pg_type_typname_nsp_index (auth_permission)`, `(hello_app_notebook)`, `ProgrammingError: column "name" of relation "django_content_type" does not exist` | окремий one-shot сервіс `release` (migrate + collectstatic --clear), `web` чекає `service_completed_successfully` |
| `entrypoint.sh`: `uvicorn … --reload` | reloader у продакшн-контейнері | `docker top`: процес reloader + `spawn_main` | `daphne --proxy-headers` у exec-формі CMD; `docker stop` — 0.7 с, код 0 |
| `nginx.conf`: `proxy_set_header Host $host` | `$host` без порту | стек на порту 8080: вхід формою → `403 Origin checking failed - http://localhost:8080 does not match any trusted origins`; на 80 (як у книзі) працює | `$http_host`; для https — `DJANGO_HTTPS=1` (`SECURE_PROXY_SSL_HEADER`) і `DJANGO_CSRF_TRUSTED_ORIGINS` |
| `crispy_notes_project` (уроки 40–45): немає `STATIC_ROOT` | — | `collectstatic` → `ImproperlyConfigured: … STATIC_ROOT` | `STATIC_ROOT` (`DJANGO_STATIC_ROOT`) |
| `DJANGO_DEBUG` за замовчуванням `1` | compose книги його не задає | через nginx `/no-such-page/` → сторінка з `DEBUG = True` (маршрути, налаштування) | `DJANGO_DEBUG=0` у `.env.example`; з `DEBUG=0` без `DJANGO_SECRET_KEY` — `ImproperlyConfigured` при старті; тести `tests_deploy.py` (5) |

Проміжні перевірки (не дефекти, на сторінці — з числами): оновлення `docker compose up -d --build` — 21 з 60 запитів (кожні 0,5 с)
отримали 502 (~10 с простою); nginx визначає адреси `web` лише при старті — після `--scale web=2` усі 10 запитів ішли в першу
репліку, після `nginx -s reload` — 7/3; чат між двома репліками: з Redis доставлено 4 з 4, з `InMemoryChannelLayer` — 1 з 6.

## Урок 50. CI/CD (GitHub Actions)

Джерело — `.github/workflows/django-tests.yml` Django-книги `notes_chat_app`.

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `on.pull_request.branches: [main, master]` | PR в іншу гілку (PR поверх PR) не перевіряється | PR уроку 50 має базу `claude/wonderful-ride-cinspw` — з таким фільтром workflow не запустився б (правило GitHub: `branches` — base PR); ноутбук відтворює | `pull_request` без `branches`, лише `paths` |
| `on.push` разом з `pull_request` (і в `notebooks.yml` репозиторію курсу) | кожен коміт PR перевіряється двічі | Actions: `notebooks.yml` runs 203/204 і 205/206 — `push` і `pull_request` на тих самих комітах `a9272e7`, `a54d686` | у нових workflows `push: branches: [main]` (`notebooks.yml` не змінювався) |
| список модулів у `manage.py test notes_app.tests.test_models …` | новий файл тестів не запускається, поки його не допишуть | той самий прийом у `crispy_notes_project`: список модулів уроку 45 → `Ran 76 tests`, `manage.py test` → `Ran 81` (5 тестів `tests_deploy.py` мовчки пропущено) | `manage.py test` без списку |
| `coverage run manage.py test …` після `manage.py test …` | ті самі тести двічі | читання | покриття — одним прогоном (вправа «Спробуй самостійно») |
| без `permissions` | права `GITHUB_TOKEN` — з налаштувань репозиторію | читання | `contents: read`; `packages: write` лише job `publish` |
| `selenium/standalone-chrome:latest` | незафіксований образ у CI | читання | у курсі Selenium-job немає (E2E — через smoke-тест стеку) |
| `crispy_notes_project/requirements.txt` (урок 40): `djangorestframework-simplejwt>=5.3` | 5.3.0 імпортує `pkg_resources` (setuptools) | `uv pip install --resolution lowest-direct` на Python 3.10 → `ImportError: … JWTAuthentication … No module named 'pkg_resources'`; 5.3.1 і 5.4.0 — ок | `>=5.3.1`; job `min-versions` |

Прогін на PR #64 (коміт `5c6f1b3`): news_hub — 6 jobs ✅, publish skipped; crispy_notes — 5 jobs ✅, publish skipped; перший же прогін зелений.
`publish` (push у `main`) не запускався — перевірено лише `actionlint`.

## Урок 51. Аудит проєктів курсу (зріз перед фінальним проєктом)

Аудит `news_hub` і `crispy_notes_project` уроку 50: `architecture_audit.py`, `db_audit.sql`, `query_count.py` з папки уроку.

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `crispy_notes_project/hello_project/settings.py` (уроки 49, 50) | throttle DRF `login: 5/min` (урок 40) рахує спроби в кеші Django; `CACHES` не задано → LocMem, окремий у кожному процесі. `docker-compose.yml` уроку 49 пропонує `--scale web=2` | стек уроку 50, 12 спроб `POST /api/token/` через nginx: 1 репліка → `401×5, 429×7`; **2 репліки → `401×10, 429×2`** (кожна репліка — свої 5) | `CACHES` → `RedisCache` при `REDIS_URL`; стек уроку 49 з 2 репліками → `401×5, 429×7` (web-1: 4 запити, web-2: 8), ключ `:1:throttle_login_172.19.0.1` у Redis; сторінка 49 показує налаштування і вивід |
| `news_hub/tables.py` `SubscriptionRow.chat_id` `index=True` (урок 47) | індекс `(chat_id)` поруч з `UNIQUE (chat_id, keyword)` | PostgreSQL 16, 200 000 підписок: `WHERE chat_id = … ORDER BY keyword` і з індексом, і без нього — `Index Only Scan using uq_subscription_chat_keyword`; `ix_subscriptions_chat_id` — 2304 kB, 0 сканувань | без змін у коді уроків; на сторінці 51 — як рекомендація (міграція `drop_index`) |
| Django FK-індекси (`Note.user`, `Tag.user`, `ChatMessage.group`, M2M-таблиці) | окремий індекс FK поруч зі складеним/унікальним з тим самим першим стовпцем | `db_audit.sql` на базі нотаток: 11 таких пар (4 — у `auth_*` самого Django) | без змін; рекомендація `db_index=False` / `Meta.indexes` на сторінці 51 |
| `NewsRepository.search` (`icontains`) | на PostgreSQL це `lower(title) LIKE '%…%'`: індекс trigram на `title` не використовується | 302 400 новин: без індексу 372 мс, з `gin (title gin_trgm_ops)` — 320 мс (той самий перегляд), з `gin (lower(title) gin_trgm_ops)` — 0.14 мс; 59 MB, 16 с на побудову | без змін; рекомендація на сторінці 51 |
| `NewsRepository.find` (`OFFSET skip`) | глибокі сторінки читають усі попередні рядки | `OFFSET 300000 LIMIT 50` — 263.7 мс, `WHERE id > 300000 LIMIT 50` — 0.08 мс | без змін; keyset — рекомендація |

N+1 не знайдено: `query_count.py` — сторінки `/notes/`, `/notebooks/`, `/shopping/`, `/todo/`, `/api/notes/` роблять однакову кількість запитів при 10 і 40 записах (8/7/8/8/4). Циклів імпорту немає в жодному проєкті.

## Бонус М6. CV розробника (`module_5/CV_maker/`)

Перенесено як є: `README.md`, `CV_mini_tutorial_UA.md` (і сторінка довідника в книзі), `cv_viktor_nikoriak_GeoAI.html` і PDF
(особисте CV викладача з контактами — як у старому курсі), `generate_cv_pdf.py`.

| Де | Було | Як перевірено | Стало |
|---|---|---|---|
| `generate_cv_pdf.py` | — | справжній `pdfkit` 1.0 + `wkhtmltopdf 0.12.6 (with patched qt)` (образ `surnet/alpine-wkhtmltopdf`, apt у пісочниці недоступний) → `PDF created`, 5 сторінок, як PDF старого курсу | без змін; додано необов'язкові аргументи `html pdf` (без них — як було) |
| `README.md`, структура проєкту | `cv_viktor_nikoriak.html` (5 згадок) | такого файлу немає; справжній — `cv_viktor_nikoriak_GeoAI.html` | назву виправлено |
| `CV_mini_tutorial_UA.md` | `##  **Навчальна вправа для студентів` — незакритий `**` | рендер MkDocs | `## Навчальна вправа для студентів` |
| — | студентам лишалось редагувати CV викладача | — | `cv_template.html` (той самий CSS, поля в дужках): 1 сторінка в wkhtmltopdf |
| — | wkhtmltopdf архівований, на новому Linux може не встановитись | Chromium (Playwright) з `CHROMIUM_PATH`: CV викладача 6 сторінок, шаблон 2; `wkhtmltopdf --disable-smart-shrinking` — ті самі 6 і 2 | `generate_cv_pdf_chromium.py`; різниця сторінок пояснена на сторінці (smart shrinking) |

Не перевірено: `sudo apt install wkhtmltopdf` на Ubuntu (apt у пісочниці — 403), встановлення на Windows/macOS з README.

## Довідник Claude Code (`CLAUDE_DOC.md` старого курсу)

Старий довідник датовано 2025-05. Ми попросили AI-агента звірити його з документацією. Агент знайшов справжні застарілі місця, але **сам помилився** щонайменше в чотирьох пунктах. Кожне твердження нижче тому перевірено ще раз — за `claude --help` установленої версії і за документацією.

| Старий довідник | Що не так | Тепер |
|---|---|---|
| таблиця моделей з повними назвами | застаріла за рік | аліаси `--model sonnet` / `opus` / `haiku`; поточний список — `/model` |
| ієрархія CLAUDE.md як «порядок пріоритету» (`/.claude/CLAUDE.md` для організації) | файли не перекривають, а доповнюють один одного; шлях організації — інший | розділ 6 |
| режими дозволів: 4 | з'явились `auto` і `dontAsk`, `default` у CLI зветься Manual | таблиця в розділі 11 |
| події hooks: 9 | понад 30 | головні — у розділі 10, решта — посилання |
| hook блокує `^rm -rf` і друкує JSON разом з `exit 2` | з кодом 2 JSON ігнорується, причина — у stderr; регулярний вираз легко обійти | розділ 10: hook — для якості, безпека — `deny` і sandbox |
| «Agent SDK» — приклад `anthropic.Anthropic().messages.create(...)` | це Client SDK (урок 43), а не Agent SDK | `claude-agent-sdk`, `query(...)` |
| CI: `claude --permission-mode bypassPermissions -p` у workflow | Claude Code не встановлено на раннері; повний автопілот на вмісті PR небезпечний | `anthropics/claude-code-action@v1` |
| `sudo apt install claude-code` одним рядком; автооновлення за замовчуванням — `stable` | apt/dnf/apk — лише після підключення підписаного репозиторію; канал за замовчуванням — `latest` | розділ 2 |
| посилання `docs.anthropic.com/en/docs/claude-code/…` | документація переїхала | `code.claude.com/docs/en/…` |
| — | не було: довіра до папки, `ask`-правила, `AGENTS.md`, `.claude/rules/`, skills з `paths` | розділи 6, 8, 11 |

**Помилки AI-аудитора (перевірено й відкинуто).** Агент стверджував, що імпорти `@path` у CLAUDE.md більше не підтримуються, що ключа `autoMemoryEnabled` немає, що поля skill `argument-hint` немає і що прапорців `--json-schema` і `--system-prompt` немає. Усе це є: `@path` і `autoMemoryEnabled` — у документації Memory, `argument-hint` — у документації Skills, прапорці — у `claude --help`. Урок той самий, що з кодом: **відповідь AI перевіряють за першоджерелом**.

## Довідник FastAPI (`lesson_34_fastapi_documentation.md`)

Перенесено як є. У старій шапці сторінки згадувався «перелік виправлень унизу», але самого переліку на сторінці не було.

## Бонус. Pandas: аналіз даних, графіки і Dash

**Дані WFP змінились.** З 2018 року WFP публікує ціни лише по регіональних ринках; «National Average» є тільки за 2014–2017. Ноутбуки старого курсу брали «ціну по Україні» як `admin1.isna()` і на свіжому файлі або падали (`KeyError: "['Bread (wheat)'] not in index"` у ноутбуці 3), або обривали графіки на 2017 році. Додано одну клітинку «🆕 National Average» у ноутбуки 1–3 (просте середнє по ринках); старі клітинки не змінено.

**`dash_API` на поточних бібліотеках:**

| Проблема | Причина | Виправлення |
|---|---|---|
| вкладка «Просторовий аналіз»: помилка 500 | `px.scatter_mapbox` прибрано в Plotly 6+ | `px.scatter_map` (MapLibre, без ключа Mapbox), `map_style=` замість `mapbox_style=` |
| попередження React у консолі | `html.Tr` безпосередньо в `html.Table` | `html.Table(html.Tbody(rows))` |

**Довідник «Аналіз даних»** (`data_analitic.md`) — виправлено лише огородження блоків коду, які ламали рендер діаграм.
