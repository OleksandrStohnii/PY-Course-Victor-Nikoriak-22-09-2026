# CLAUDE.md — Agent-Oriented Guide: PY-Course-Victor-Nikoriak-22-09-2026

> Authoritative entry point for AI agents working in this repository.
> Read this file entirely before touching code, notebooks, or tooling.
> This repo is the **v5.0 migration target**, replacing `PY-Course-Victor-Nikoriak-23_02`. See `.claude/plan_md/migration_plan.md` for the full migration plan and current phase.

---

## Course Identity

| Field | Value |
|-------|-------|
| **Name** | PY Course — Viktor Nikoriak |
| **Language** | Ukrainian (primary), English (technical terms) |
| **Level** | Beginner → Intermediate Python |
| **Instructor** | Viktor Nikoriak (Hydrologist, PhD student, Python Developer) |
| **GitHub** | https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026 |
| **Audience** | Ukrainian-speaking students, groups 1–4 |
| **Architecture** | Theory lives as an MkDocs "book" under `docs/` (see `mkdocs.yml`); lesson notebooks keep short in-context explanation + task, not full theory. |

---

## Repository Structure (current — not aspirational)

```
PY-Course-Victor-Nikoriak-22-09-2026/
├── CLAUDE.md                   ← this file
├── README.md                   ← short student-facing entry point (Ukrainian)
├── course.yaml                 ← Course/module config (source of truth; used by Django LMS sync)
├── course.json                 ← Course/module config (generated mirror of course.yaml)
├── mkdocs.yml                  ← book config (MkDocs Material)
├── requirements-docs.txt       ← deps for building the book (mkdocs-material)
├── architecture.md, instructor.md
│
├── docs/                       ← the book (docs_dir for mkdocs)
│   ├── index.md
│   ├── stylesheets/extra.css, javascripts/sidebars.js ← custom styles; header buttons that collapse the left nav / right TOC (state in localStorage)
│   ├── 00_getting_started/     ← git/environment/homework-workflow/troubleshooting + github/ subsection
│   ├── modules/                ← per-module stub pages (М1–М6 + AI bonus), content pending
│   └── 00_python_mental_model.md, 01_zen_of_python.md, git-cheatsheet.md
│
├── module_1/                   ← М1. Python Core
│   ├── docs/                   ← Module 1 reference notebooks (separate from the top-level docs/ book)
│   └── lessons/                ← lesson_01_… through lesson_18_… (v5.0 lessons 1–17)
├── module_2/
│   └── lessons/                ← lesson_19_functions_first_class/ … lesson_29_practicum_data_structures/ (all of М2)
├── module_3/
│   ├── lessons/                ← lesson_30_sql_basics/, lesson_31_redis_overview/ (all of М3)
│   └── bonus/pandas_data_analysis/ ← bonus lesson (before 29): 3 old-course notebooks + note_bonus_extra_datasets.ipynb, dash_API/ (Dash, 7 tabs), data/ (instructor's WFP/HDX/data.gov.ua files); book page docs/modules/m3/bonus_pandas.md + reference pages docs/modules/m3/pandas/
├── module_4/
│   └── lessons/                ← lesson_32_http_requests/ (+ smachno_api.py — local training HTTP API, stdlib only),
│                                 lesson_33_rest_api_design/ (meteo_api/ FastAPI v2 + all API types + gRPC, weather_map/ Streamlit, tests/, docker-compose.yml),
│                                 lesson_34_django_intro/ (hello_project/ — Django 5.2 notes app, step 1–2 of the Django book),
│                                 lesson_35_django_forms/ (old-course django_bootstrap_project/ → crispy_notes_project/, taught as two refactorings of lesson 33; tests added),
│                                 lesson_36_drf_fastapi/ (crispy_notes_project/ from 34 + DRF api.py over services/selectors, tests_api; fastapi_notes.py),
│                                 lesson_37_typing_pydantic/ (news_hub/ — news aggregator step 1: typed parse_rbc_news from the old course, NewsItem (Pydantic), rbc.ua snapshot, pytest + mypy),
│                                 lesson_38_fastapi_basics/ (news_hub/ step 2: FastAPI api.py from old news_dashboard/app/main.py, NewsStore via Depends, aiohttp scraper, postman/ collection, TestClient tests; fastapi_demo/ from old course — async vs blocking + load_test.py),
│                                 lesson_39_fastapi_sqlalchemy/ (news_hub/ step 3: db.py/tables.py/repository.py from old production_bot — async SQLAlchemy 2, NewsRepository replaces NewsStore, full CRUD, Alembic migrations/, docker-compose.yml with PostgreSQL; tests run on SQLite or PostgreSQL via TEST_DATABASE_URL),
│                                 lesson_40_middleware_redis/ (news_hub/ step 4: cache.py (Redis client from old production_bot, NewsCache with version key), middleware.py (request id/timing, rate limit from old ai_bot → 429, cache invalidation after COMMIT), jobs.py (202 background scrape, status in Redis); REDIS_URL=fakeredis:// for tests/notebook),
│                                 lesson_41_auth_security/ (crispy_notes_project/ from 35 + old-course lesson_Django_authentication_and_security code: Group sharing, password change/reset, security settings; + simplejwt /api/token/ with throttle, SECRET_KEY/DEBUG from env, tests_auth.py; fixed: API let group members edit/delete others' notes → 403),
│                                 lesson_42_api_testing/ (news_hub/ step 5: tests of lesson 39 rebuilt — tests/unit + tests/integration with markers, tests/fixtures/*.html from the old web-scraping notebook, factories.py, mock network (patch where used) + aiohttp TestServer fake, httpx.AsyncClient aclient, real get_db test, .coveragerc (branch, greenlet); fixed: ISO time rejected by NewsItem, undecodable page killed whole scrape, endswith("rbc.ua") let fakerbc.ua through → is_rbc_host, parser crash on bs4 4.12),
│                                 lesson_43_ai_dev_tools/ (news_hub/ step 6: CLAUDE.md, .claude/settings.json + hooks/unit_tests.py + skills/add-news-source, rss.py (Ukrainska Pravda RSS written by headless Claude Code against spec tests/unit/test_pravda.py; reviewer fixes + tests/unit/test_pravda_review.py, tzdata); depression_dashboard/ — AI-generated Flask+Streamlit+sklearn project from old module_5/lesson_53_claude_code with prompts/, tests/test_review.py (17 tests, 10 defects fixed); book page + reference docs/modules/m4/ai/claude_code.md from old CLAUDE_DOC.md, verified against docs),
│                                 lesson_44_llm_api/ (news_hub/ step 7: llm.py from old ai_bot ai_service.py — LLMClient Protocol, GeminiClient (client.aio, model pool by error code), AnthropicClient (model from ANTHROPIC_MODEL env), FakeLLM, Redis CircuitBreaker + GuardedLLM; analysis.py — NewsAnalysis (Pydantic), prompt with data in <news>, 1 retry, cache by text hash + PROMPT_VERSION; POST /api/news/{id}/analyze (db → cache → llm, 502/503), /api/analyze/jobs, migration 0002; tests with FakeLLM, tests/live (-m llm, contract test works without a key); no API key in the session yet — model output on the page is marked «Приклад виводу»),
│                                 lesson_45_architecture_patterns/ (crispy_notes_project/ from 40, Django book step 3: notes/notebooks/tags as CBV from old notes_project_cbv (LoginRequiredMixin, OwnerRequiredMixin, SelectorQuerySetMixin), access rules only in selectors (*_visible_to / *_owned_by, distinct for M2M), no ORM in views/api — enforced by tests_architecture.py (ast), DATABASE_URL → PostgreSQL 16 (docker-compose.yml, psycopg 3) or SQLite; fixed: list shared with 2 users → 500, group shopping list 404, ?next= open redirect; book page = patterns catalog over notes + news_hub),
│                                 lesson_46_websocket_chat/ (crispy_notes_project/ from 44, Django book step 7B: group chat from old module_5/lesson_Django_Async/notes_chat_app — Channels 4 + daphne, asgi.py (websocket_application(): AllowedHostsOriginValidator → AuthMiddlewareStack → URLRouter), routing.py, consumers.GroupChatConsumer as a thin transport over selectors.is_group_member/recent_chat_messages + services.post_chat_message (membership checked per message; member.removed/group.deleted events after COMMIT → close 4403), ChatMessage + migration 0004, group_chat page + static js/group_chat.js (no reconnect on 4xxx), CHANNEL_LAYERS InMemory or Redis via REDIS_URL, docker-compose redis; tests_consumers.py (old 9) + tests_chat.py, consumers.py in tests_architecture),
│                                 lesson_47_security_advanced/ (news_hub/ step 8: security.py from old production_bot core/security.py + api/deps.py + admin/auth.py — bcrypt directly (passlib 1.7.4 breaks on bcrypt 5), JWT HS256 with required exp/sub/role, AdminSettings from env (no "change-me" defaults: unset → 503, short secret → startup fails), require_admin/AdminDep on every write endpoint, POST /api/admin/token + login rate limit; safe_fetch.py (SSRF: PolicyResolver checks IP after DNS, manual redirects re-checked, ports 80/443, size/type limits) + sources table (migration 0003) + /api/sources; webhooks.py — HMAC(timestamp + raw body), 5-min window, SET NX replay → 409, from old api/webhook.py; tests_admin_api walks all routes vs PUBLIC; 279 tests),
│                                 lesson_48_telegram_bot/ (news_hub/ step 9: bot/ — aiogram 3 bot from old ai_bot + echo_bot: factory.py (create_bot with TELEGRAM_API_URL, create_dispatcher, build_router() per dispatcher), handlers.py (/news, /digest via analyze_news, /subscribe /unsubscribe /subscriptions, admin /scrape by user_id), middlewares.py (RateLimiter from lesson 39, DB session per update + COMMIT), formatting.py (esc/link, split_message between lines ≤ 4096, keyword prefix match); notify.py from old workers/notifications.py (only new news via insert_new RETURNING, 403 → remove chat subscriptions, 429 → retry_after); subscriptions table (BigInteger chat_id, migration 0004); POST /api/telegram/webhook (secret header via verify_secret_token), setWebhook in lifespan, webhook kept on shutdown; polling: python -m news_hub.bot; tests/telegram_twin.py — local Telegram Bot API twin (records calls, HTML rules, 401/403/429); 335 tests)
├── module_5/                   ← М5. Production
│   ├── bonus/linux_devops/     ← bonus lesson (after 47): note_bonus_linux_devops.ipynb — 9 shell exercises that run in Colab (pipes, exit codes, permissions via runuser, signals/trap, 127.0.0.1 vs 0.0.0.0, env vars and `$`, set -euo pipefail, empty-backup find-bug); book page docs/modules/m5/bonus_linux.md + reference docs/modules/m5/linux/ (18 old-course sections + index, every command re-run in containers)
│   └── lessons/                ← lesson_49_docker/ (news_hub/ step 10: Dockerfile from old production_bot — deps layer first, user app UID 10001, SQLite on /data volume, HEALTHCHECK via python (no curl in slim), exec-form CMD; .dockerignore with **/ patterns; requirements.txt (runtime) / requirements-dev.txt; GET /health/ready (db + Redis, 503); `python -m news_hub.security --env-file` (docker run --env-file keeps quotes); tests/docker/test_image.py — pytest -m docker (6 tests: no .env/.venv/__pycache__ in image, no dev deps, non-root, healthy, docker stop < 8 s exit 0, alembic on a volume); twin --host; 340 tests + 6 docker),
│                                 lesson_50_compose_deploy/ (news_hub/ step 11: docker-compose.yml from old production_bot — postgres/redis healthchecks, one-shot migrate (service_completed_successfully), api healthcheck /health/ready, nginx after api healthy; networks backend + edge with nginx fixed at 172.28.0.10 and FORWARDED_ALLOW_IPS (real client IP for the login rate limit; nginx overwrites X-Forwarded-For), profiles polling (bot) and twin; .env.example (values with $ in single quotes), docker-compose.dev.yml (ports on 127.0.0.1), scripts/backup.sh + restore.sh; bcrypt hash validated in full; bot registration in Telegram as a background task with retries; 343 tests. crispy_notes_project/ from 45 + Django book steps 8–9: Dockerfile (daphne, user app, HEALTHCHECK), one-shot release service (migrate + collectstatic) instead of the book's entrypoint, nginx ($http_host, static volume, WebSocket), STATIC_ROOT, DEBUG=0 requires DJANGO_SECRET_KEY, DJANGO_HTTPS / DJANGO_CSRF_TRUSTED_ORIGINS, CACHES → Redis when REDIS_URL (DRF login throttle shared across replicas; added in lesson 51 audit, same in lesson 50), /health/, tests_deploy.py; 81 tests),
│                                 lesson_51_ci_cd/ (news_hub/ step 12 + crispy_notes_project/ from 49 with scripts/make_env.py and scripts/smoke.sh (stack through nginx, cleanup via trap; same in CI and locally); simplejwt floor → 5.3.1; workflows at repo root: .github/workflows/news_hub.yml (tests matrix 3.10/3.13, min-versions via uv --resolution lowest-direct, PostgreSQL + Redis + alembic check, mypy --strict, docker: pytest -m docker + smoke, publish to ghcr.io only on push to main) and crispy_notes.yml (tests matrix + PostgreSQL + makemigrations --check, min-versions, check --deploy, docker smoke, publish); pull_request without branches, push only main, paths, concurrency, permissions contents: read)
│
├── module_6/                   ← М6. Капстоун (lessons 51–52 + CV bonus)
│   ├── lessons/lesson_52_final_project/ ← course slice + audit of both projects (lesson 50 copies): architecture_audit.py (ast import graph, fan-in/out, Tarjan cycles, --mermaid) + test_architecture_audit.py, db_audit.sql (PostgreSQL: table sizes, redundant indexes incl. opclass check, unused indexes), query_count.py (Django N+1 check), patches/news_hub_search_index.patch (migration 0005: pg_trgm GIN on lower(title), drop redundant ix_subscriptions_chat_id; verified: 343 tests on SQLite + PostgreSQL, alembic check), note_lesson_52_final_project.ipynb; book page docs/modules/m6/lesson_52.md (ER diagrams, EXPLAIN evidence, Redis key map, state vs replicas, final-project requirements/plan)
│   ├── lessons/lesson_53_graduation_pitch/ ← graduation as a pitch deck (investor / client / hiring tech lead): pitch_deck_template.md (Marp, 10 slides, speaker notes in <!-- -->), example_news_digest_deck.md + .pdf («Тема дня» on news_hub, full speech), pitch_check.py (8–12 slides, ≤ 45 words/slide, 4–7 min of speech at 130 wpm, required sections, leftover [placeholders]/TODO) + test_pitch_check.py, note_lesson_53_pitch.ipynb; book page docs/modules/m6/lesson_53.md (5 Whys from Toyota + Minoura's critique, The Mom Test, Sequoia / YC / Kawasaki 10/20/30 structures, TAM/SAM/SOM bottom-up, demo, Q&A, grading rubric); sources found via web search (sites themselves blocked by the egress proxy)
│   └── bonus/cv_maker/         ← bonus lesson (after 52): old course's module_5/CV_maker as is (README, CV_mini_tutorial_UA.md, instructor's HTML CV + PDF, generate_cv_pdf.py with optional html/pdf args) + cv_template.html, generate_cv_pdf_chromium.py (Playwright), note_bonus_cv_maker.ipynb; book page docs/modules/m6/bonus_cv.md + reference docs/modules/m6/cv/cv_tutorial.md
│
├── tools/
│   ├── sync_notebook_metadata.py ← generates the Colab badge + metadata.lms of every notebook
│   ├── generate_student.py     ← master notebook → `<name>_student.ipynb` next to it (solutions and `instructor` cells removed); `--check` in CI
│   ├── test_generate_student.py ← its tests (`cd tools && python -m pytest`)
│   ├── templates/lesson_page.md ← template of a book lesson page (header, notebook buttons, section order)
│   └── lessons_v5.json         ← v5.0 lesson titles (1–52), stream slug
│
├── assignments/                ← empty — homework not migrated yet
├── certificates/                ← beetroot_python_2021.md only
│
├── .claude/plan_md/            ← migration plan + per-module audits (migration_plan.md, module_1_audit.md, …)
├── data/                       ← gitignored — source material, not published
│   ├── PY_UKR_Navigation_table_5 [UPDATE].xlsx   ← authoritative v5.0 curriculum source
│   └── v.5.0/, Модуль 1. Python core/            ← legacy raw source material
│
└── .github/workflows/
    ├── docs.yml                ← builds/publishes docs/ to GitHub Pages on push
    ├── notebooks.yml           ← runs tools/sync_notebook_metadata.py --check on push/PR
    ├── news_hub.yml            ← lesson 50: CI/CD for module_5/lessons/lesson_51_ci_cd/news_hub
    └── crispy_notes.yml        ← lesson 50: CI/CD for module_5/lessons/lesson_51_ci_cd/crispy_notes_project
```

**Not yet migrated from the old repo** (planned, not present): `SETUP.md`, `install_course.*`/`start_course.*`, `dashboard.ipynb`, the old `tools/` scripts (`qa_suite.py`, `client.py`, `config.json` — `tools/` holds the notebook-metadata sync and the student-notebook generator), `generator/`, `run_data/`, `docker-compose.yml`. The old `module_5` (Django/DevOps content) is not migrated as a module — it isn't part of the v5.0 navigation table (see `.claude/plan_md/migration_plan.md` §0), but it is the **source material** for М4 lessons: `lesson_Django_Network_Architecture/network_foundation.md` + `network_mermaid.md` (URL/DNS/ports/TCP/TLS → lesson 31, REST → 32). Lesson 32 is built on the instructor's meteo API: repo `NikoriakViktor/ogimet` → `ogimet-main/` in the old course (`module_4/lessons/lesson_32_http_requests/`) → client `meteo_parser/telegram_filter.py` in `NikoriakViktor/Data_Science_Course_SSWU`; its data snapshot comes from ogimet.com via `meteo_api/fetch_snapshot.py`, the `Django_*` / `DJANGO_*` files (→ 33–35), `lesson_Django_Async/` (async HTTP → 31, async views → later), `lesson_Django_Testing/` (→ 41), `lesson_47_Telegram_API/` (→ 47) — see `.claude/plan_md/module_4_audit.md`. **Django lessons (33+) follow the instructor's Django book** — repo `NikoriakViktor/notes_chat_app`, published at https://nikoriakviktor.github.io/notes_chat_app/ (MkDocs, «Zero to Hero» steps 0–9 ending in Notes Chat App). Mapping: 33 = steps 1–2 (`hello_project`, `Note`), 34 = steps 2 + 4 (`django_bootstrap_project` → `crispy_notes_project`), 35 = API for notes, 38/44 = step 3, 40 = step 5, 41 = step 6, 45 = step 7, 48–49 = steps 8–9. **Instructor's rule (2026-09-27): don't rewrite what exists.** Each Django lesson takes the code from the old course (`module_5/...` projects, copied into the lesson folder with their README) and is written as a **refactoring** of the previous lesson's project: a table «what changed / why», diffs of key files, architecture before/after, real output, and «Поглиблено» links to the book — no retelling of the book's theory. Fixes to old code (bugs found while verifying) are made in the course copy and logged in `instructor_notes/old_course_fixes.md` (instructor-only, outside the book) — **never** on book pages or project READMEs: no «Що виправлено» sections, no «виправлено в копії курсу» wording (instructor's rule 2026-09-27); pages show the correct code and why it is correct. **Instructor's rule (2026-09-28): never mention the old course on student-facing material** — book pages (`docs/`), notebooks and project READMEs don't say «старий курс», «23_02» or give paths into the old repo; the starting code is called «стартовий код» / «прототип `news_dashboard`» etc. Provenance lives only here, in `.claude/plan_md/` and in `instructor_notes/`. **FastAPI track (36–39, 41–43, 46–50) = one «news aggregator» project** grown lesson by lesson from the old course's `module_4/lessons/lesson_35_asyncio/news_dashboard/` (rbc.ua parser) + Telegram bots from `module_5/lesson_47_Telegram_API/` (LLM = Gemini, `ai_bot`). **Linux** goes into the book as a bonus lesson in М5 before 48 (from `module_5/lesson_Linux_DevOps_Basics/`). Full lesson-by-lesson plan: `.claude/plan_md/module_4_audit.md`. Keep model/field names aligned with the final `notes_app` (`is_pinned`, `priority` 1–4, `Notebook`). Do not assume any of these exist without checking.

---

## Lesson Structure & Naming Convention

### Folder naming
```
module_<N>/lessons/lesson_<NN>_<topic_slug>/
```
`NN` is the **v5.0 lesson number** from the navigation table — numbering runs through the whole course (1–52) and does not restart per module.
Examples: `module_1/lessons/lesson_05_lists_tuples_sets/`, `module_2/lessons/lesson_19_functions_first_class/`.
`<topic_slug>` becomes the notebook's `metadata.lms.lesson_slug` (see LMS Metadata), so renaming a folder changes the slug.

Materials from the old 23_02 course live in the folder of the v5.0 lesson they belong to (mapping and rationale: `.claude/plan_md/module_1_audit.md`).

### Bonus lessons (outside the 1–52 numbering)

The instructor can add a lesson that is not in the v5.0 table without renumbering the course:

```
module_<N>/bonus/<slug>/        e.g. module_3/bonus/pandas_data_analysis/
docs/modules/mN/bonus_<topic>.md
```

- register it in `tools/lessons_v5.json` → `"bonus": {"<slug>": {"module": N, "after": <lesson it follows>, "title": "Бонус. …"}}`; `sync_notebook_metadata.py` rejects unknown bonus slugs;
- its notebooks get `metadata.lms.lesson_number: null` and `lesson_slug = <slug>`;
- in `mkdocs.yml` put it in its module's nav right after lesson `after`, titled «Бонус. …»;
- `course.yaml` / `course.json` are **not** changed (they list only v5.0 numbers).

Current bonus lessons: `pandas_data_analysis` (module 3, before lesson 29) — instructor's decision: Python is primarily data science today, so М3 opens with pandas, charts and Dash; databases follow. `linux_devops` (module 5, before lesson 48) — the Linux minimum for Docker/Compose/CI (processes and signals, permissions, ports, env vars, scripts); its reference is the old course's `lesson_Linux_DevOps_Basics/` (18 sections). `cv_maker` (module 6, after lesson 52) — CV writing (old `module_5/CV_maker/` tutorial) and HTML → PDF generation.

### Files inside each lesson

| File pattern | Purpose |
|---|---|
| `note_lesson_NN_*.ipynb` | Main v5.0 lesson notebook — master with solutions (the book links it only as «Переглянути розв’язки») |
| `*_student.ipynb` | Student-facing notebook (solutions stripped, `tools/generate_student.py`) — the book's main «Відкрити вправи в Colab» button |
| `konspekt_*.ipynb` or `notes_*.ipynb` | Instructor lecture notes |
| `python_lesson_*_grup_N.ipynb` | Group-specific variant (groups 1–4) |
| `final_project_auto.ipynb` | Automated final project for the lesson |
| `*.py` modules | Example modules taught in the lesson |
| `<project>/` subfolder | Mini-project (e.g., `calculator_project/`) |

### Notebook cell conventions

```python
# Protected system cell (do NOT remove or reorder)
# Cell has metadata: {"tags": ["instructor"]} + {"hide_input": true}
SYSTEM_READY = True
COMPLETED_TASKS = []

def require_system():
    ...

def require_student(student_name):
    ...
```

- **🔒 protected cells** — `"tags": ["instructor"]` — students cannot edit
- **Solution blocks** — wrapped in `# BEGIN SOLUTION … # END SOLUTION`
- `tools/generate_student.py` strips solution blocks to produce `*_student.ipynb`

### Kernel metadata (all notebooks must use this)
```json
{
  "kernelspec": {
    "display_name": "Python Course (.venv)",
    "name": "python-course"
  },
  "language_info": { "name": "python", "version": "3.10.0" }
}
```

### Colab badge & `metadata.lms` — generated, never hand-edited

Every notebook under `module_*/` gets two things from `tools/sync_notebook_metadata.py`, derived from **where the file lives**:

- **cell 0** — markdown cell with `id: view-in-github` holding the "Open in Colab" badge →
  `https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/<path>`;
  plus `metadata.colab.include_colab_link: true`;
- **`metadata.lms`** — see LMS Metadata below.

It also rewrites relative links in markdown cells to absolute URLs (relative links don't resolve in Colab) and puts a Colab badge next to every GitHub notebook link in `docs/**/*.md`, failing on links to files that don't exist.

```bash
python tools/sync_notebook_metadata.py          # fix in place — run after adding/moving/renaming a notebook
python tools/sync_notebook_metadata.py --check  # report only, exit 1 on drift (CI: .github/workflows/notebooks.yml)
```

Why this exists: notebooks copied from 23_02 kept badges pointing at `PY-Course-Victor-Nikoriak-23_02/blob/main/<file>.ipynb` (old repo, repo root), so Colab failed with "Could not find … .ipynb". When saving from Colab ("File → Save a copy in GitHub"), always type the **full path** (`module_1/lessons/lesson_NN_…/file.ipynb`) — Colab defaults to the bare filename, i.e. the repo root. Student/teacher Colab guide: `docs/00_getting_started/colab.md`.

---

## Tools & Automation

> ⚠️ Apart from `tools/sync_notebook_metadata.py` (above) and `tools/generate_student.py` (below), none of the old `tools/` scripts, `generator/` or `dashboard.ipynb` have been migrated into this repo yet — the rest of this section documents the intended tooling from the old repo for when that migration phase happens. Don't reference those paths as if they exist here.

### generate_student.py — Create student notebooks
```bash
python tools/generate_student.py                      # every master notebook (has solution markers or `instructor` cells)
python tools/generate_student.py path/to/note.ipynb   # one or more notebooks
python tools/generate_student.py --check              # CI (notebooks.yml): exit 1 if a student copy is missing/outdated or a cell doesn't compile
```
- Removes `# BEGIN SOLUTION … # END SOLUTION` blocks in **every** code cell — no `solution` tag needed (the old script stripped only tagged cells, and none of the course notebooks are tagged, so it leaked every solution). The block becomes `# YOUR CODE HERE` with the same indent; inside a `def`/loop it also gets `pass` so the cell still compiles (a solution inside `{…}` gets no `pass` — the variant that compiles is chosen per cell). Students see the exercise's AssertionError/NameError, not a SyntaxError.
- Removes cells tagged `"instructor"`; clears all outputs and execution counts.
- Output: `<name>_student.ipynb` in the same folder, with its own Colab badge and `metadata.lms` (`notebook_path` = student path) via the logic of `sync_notebook_metadata.py`.
- After editing a master notebook: run `sync_notebook_metadata.py`, then `generate_student.py`, commit both. Markdown `<details>` answers and worked examples stay in the student copy on purpose.

### Notebook links on book pages
A notebook that has a student copy is linked **only** like this (template: `tools/templates/lesson_page.md`):
```markdown
**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/<dir>/<name>_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/<dir>/<name>.ipynb){ .solutions-link } — опис.
```
The main button opens the student copy (no solutions) in Colab; the small link shows the master notebook on GitHub for self-check. `sync_notebook_metadata.py --check` fails on any other GitHub/Colab link to a master that has a student copy, and doesn't add a Colab badge to links with `{ … }` attributes. Styles: `.solutions-link` and `.md-button` in `docs/stylesheets/extra.css`. Notebooks without a student copy keep the plain form `[`file.ipynb`](github) [![Open In Colab](…)](colab)`.

### qa_suite.py — QA & load testing
```bash
python tools/qa_suite.py --unit        # Unit tests for API
python tools/qa_suite.py --lesson4     # Tests for lesson 4
python tools/qa_suite.py --lesson5     # Tests for lesson 5
python tools/qa_suite.py --progress    # Progress tracking tests
python tools/qa_suite.py --load        # Simulate 20 concurrent students (10 workers)
```

### config.json — Active lesson control
```json
{
  "lessons": {
    "04_exam": { "active": true,  "task_ids": [...] },
    "05_exam": { "active": false, "task_ids": [...] }
  }
}
```
Set `active: true` to enable a lesson's API submission endpoint.

### dashboard.ipynb — Admin scoreboard
- Run with Jupyter (not Voila)
- Fetches live data from Google Apps Script
- Shows leaderboard with Bronze/Silver/Gold/Platinum levels
- Color coding: 🟢 ≥70% · 🟡 40–69% · 🔴 <40%

---

## Student GitHub Workflow (Submission Process)

```
Instructor repo (upstream)
        │  fork
        ▼
Student repo (origin)
        │  clone locally
        ▼
git checkout -b homework-04
        │  work on assignment
        ▼
git add . && git commit -m "Homework 04"
git push origin homework-04
        │  open PR: homework-04 → main
        ▼
Instructor reviews → comments in PR
        │  student fixes
        ▼
git add . && git commit -m "Fix after review"
(PR updates automatically)
```

---

## Environment Setup

```bash
# Install (creates .venv)
python install_course.py          # cross-platform
install_course.bat                # Windows shortcut

# Launch (Voila test mode)
python start_course.py            # interactive menu → opens http://localhost:8891
start_course.bat                  # Windows shortcut

# Manual Jupyter editing mode
.venv/Scripts/activate            # Windows
source .venv/bin/activate         # macOS/Linux
jupyter notebook
```

**Python version:** 3.10+
**Key dependencies:** voila, ipywidgets, numpy, pandas, matplotlib, seaborn, scikit-learn, requests, sympy

---

## API & Backend

- **Backend:** Google Apps Script (URL in `tools/config.json`)
- **Auth:** `ADMIN_KEY` from `.env` (64-char hash, keep secret)
- **Submission endpoint:** POST — student task results
- **Progress endpoint:** GET — per-student completion data
- **Client:** `tools/client.py` (token-based session management)

**Rule:** Never hardcode the `ADMIN_KEY` in notebooks or source files.

---

## Pedagogical Philosophy (for content generation)

### 5 Core Python Mental Model Concepts (from `docs/00_python_mental_model.md`)
1. **Interpreter** — Python is a program that runs `.py` files
2. **pip** — package manager; installs into the active environment
3. **venv** — isolated environment; always activate before installing
4. **IDE** — a tool, not the language (PyCharm, VS Code)
5. **Notebook** — interface to a running kernel (not a standalone program)

**Golden Rule for students:** Activate env → Install → Run

### Zen of Python (from `docs/01_zen_of_python.md`)
Integrate these principles in all new lesson content:
- Beautiful > ugly · Explicit > implicit · Simple > complex
- Readability counts · One obvious way · Errors should never pass silently

---

## LMS Metadata — Required in Every Notebook

> ⚠️ **Not connected yet.** The Django 5 LMS (`Python_Curse`) still points `GITHUB_COURSE_REPO` at the old repo (`PY-Course-Victor-Nikoriak-23_02`), not this one — switching it over is the last phase of the migration (see `.claude/plan_md/migration_plan.md`). The block below documents the metadata contract this repo must eventually satisfy, not something already wired up here.
>
> Once connected: this repository becomes a **Django 5 LMS** (Python_Curse project) source. Students log in via GitHub OAuth and access notebooks through the LMS. `main` branch is the **single source of truth** for the LMS sync.

### How sync works

```
GitHub push → webhook → Django server
    → sync_lessons  reads notebooks from repo → creates ContentNode per lesson
    → sync_exams    reads server-side JSON files → links Exam to ContentNode
```

`sync_lessons` uses `metadata.lms.lesson_slug` to set `ContentNode.slug`.
`sync_exams` matches `exam_json.lesson_id` to `ContentNode.slug`.
**These two must match for exams to work.**

### Required `lms` block in every notebook's metadata

Generated by `tools/sync_notebook_metadata.py` — don't write it by hand. Example
(`module_1/lessons/lesson_05_lists_tuples_sets/notes_lists_tuples_sets.ipynb`):

```json
{
  "lms": {
    "course": "python-course",
    "stream": "autumn-2026",
    "module_number": 1,
    "module_slug": "python-core",
    "module_title": "Module 1 — Python Core",
    "lesson_number": 5,
    "lesson_slug": "lists_tuples_sets",
    "lesson_title": "Списки, кортежі та множини",
    "notebook_type": "notes",
    "notebook_path": "module_1/lessons/lesson_05_lists_tuples_sets/notes_lists_tuples_sets.ipynb",
    "version": 1
  }
}
```

| Field | Value | Source |
|-------|-------|--------|
| `course` | `"python-course"` | `tools/lessons_v5.json` |
| `stream` | `"autumn-2026"` (stream 22_09) | `tools/lessons_v5.json` |
| `module_number` / `module_slug` / `module_title` | parent module | `module_N/` + `course.json` |
| `lesson_number` | v5.0 lesson number (1–52) | `NN` in `lesson_NN_<slug>/` (must be in the module's `lessons` in `course.json`) |
| `lesson_slug` | **folder slug** | `<slug>` in `lesson_NN_<slug>/` — must match `lesson_id` in the server-side exam JSON |
| `lesson_title` | Ukrainian v5.0 title | `tools/lessons_v5.json` |
| `notebook_type` | `"notes"` (`note_*`/`notes_*`), `"lesson"` (other), `"docs"` (`module_N/docs/`) | kept if already set |
| `notebook_path` | repo-relative path | file location |
| `version` | `1` | kept if already set |

Reference notebooks in `module_N/docs/` get `lesson_number: null` and keep their own `lesson_slug`/`lesson_title`.

### Exam JSON (`data/lesson_NN_exam.json`) — server-side

```json
{
  "lesson_id": "variables_and_data_types",
  "title": "Exam Title",
  "version": 2,
  "questions": [ ... ]
}
```

`lesson_id` MUST match `lms.lesson_slug` in the corresponding notebook.

### Current lesson slugs

`lesson_slug` is always the folder slug — no exceptions.

| Lesson | Directory | `lesson_slug` | Old 23_02 slug (exam JSON `lesson_id`) |
|--------|-----------|---------------|------------------------------|
| 1 | `module_1/lessons/lesson_01_intro_and_course_format` | `intro_and_course_format` | — |
| 2 | `module_1/lessons/lesson_02_first_steps_environment_setup` | `first_steps_environment_setup` | — |
| 3 | `module_1/lessons/lesson_03_variables_and_data_types` | `variables_and_data_types` | `variables_and_data_types` (same) |
| 4 | `module_1/lessons/lesson_04_conditions_and_control` | `conditions_and_control` | `boolean_logic_and_control` |
| 5 | `module_1/lessons/lesson_05_lists_tuples_sets` | `lists_tuples_sets` | `lists_tuples_sets` (same, was lesson 06) |
| 6 | `module_1/lessons/lesson_06_dicts_loops_comprehensions` | `dicts_loops_comprehensions` | `loops_dicts_comprehensions` |
| 7 | `module_1/lessons/lesson_08_functions` | `functions` | `functions` (same, was lesson 08) |
| 8 | `module_1/lessons/lesson_09_practicum_big_o` | `practicum_big_o` | — |
| 9 | `module_1/lessons/lesson_10_decorators` | `decorators` | — |
| 10 | `module_1/lessons/lesson_11_iterators_generators` | `iterators_generators` | — |
| 11 | `module_1/lessons/lesson_12_practicum_search` | `practicum_search` | — |
| 12 | `module_1/lessons/lesson_13_modules_stdlib` | `modules_stdlib` | `modules_standard_library`, `modules_imports_cli` |
| 13 | `module_1/lessons/lesson_14_exceptions` | `exceptions` | `exceptions_error_handling` |
| 14 | `module_1/lessons/lesson_15_file_io_json` | `file_io_json` | `file_io_json` (same, was lesson 11) |
| 15 | `module_1/lessons/lesson_16_git_github_system` | `git_github_system` | — |
| 16 | `module_1/lessons/lesson_17_practicum_hashing` | `practicum_hashing` | — |
| 17 | `module_1/lessons/lesson_18_module1_review` | `module1_review` | `module_01_final_exam` |
| 18 | `module_2/lessons/lesson_19_functions_first_class` | `functions_first_class` | — |
| 19 | `module_2/lessons/lesson_20_classes_namespace` | `classes_namespace` | — |
| 20 | `module_2/lessons/lesson_21_inheritance_polymorphism` | `inheritance_polymorphism` | — |
| 21 | `module_2/lessons/lesson_22_encapsulation_scope` | `encapsulation_scope` | — |
| 22 | `module_2/lessons/lesson_23_practicum_recursion` | `practicum_recursion` | — |
| 23 | `module_2/lessons/lesson_24_property_decorators_dunder` | `property_decorators_dunder` | — |
| 24 | `module_2/lessons/lesson_25_iterators_advanced` | `iterators_advanced` | — |
| 25 | `module_2/lessons/lesson_26_pytest_testing` | `pytest_testing` | — |
| 26 | `module_2/lessons/lesson_27_practicum_dp_greedy` | `practicum_dp_greedy` | — |
| 27 | `module_2/lessons/lesson_28_concurrency_intro` | `concurrency_intro` | — |
| 28 | `module_2/lessons/lesson_29_practicum_data_structures` | `practicum_data_structures` | — |
| 29 | `module_3/lessons/lesson_30_sql_basics` | `sql_basics` | — |
| 30 | `module_3/lessons/lesson_31_redis_overview` | `redis_overview` | — |
| 31 | `module_4/lessons/lesson_32_http_requests` | `http_requests` | — |
| 32 | `module_4/lessons/lesson_33_rest_api_design` | `rest_api_design` | — |
| 33 | `module_4/lessons/lesson_34_django_intro` | `django_intro` | — |
| 34 | `module_4/lessons/lesson_35_django_forms` | `django_forms` | — |
| 35 | `module_4/lessons/lesson_36_drf_fastapi` | `drf_fastapi` | — |
| 36 | `module_4/lessons/lesson_37_typing_pydantic` | `typing_pydantic` | — |
| 37 | `module_4/lessons/lesson_38_fastapi_basics` | `fastapi_basics` | — |
| 38 | `module_4/lessons/lesson_39_fastapi_sqlalchemy` | `fastapi_sqlalchemy` | — |
| 39 | `module_4/lessons/lesson_40_middleware_redis` | `middleware_redis` | — |
| 40 | `module_4/lessons/lesson_41_auth_security` | `auth_security` | — |
| 41 | `module_4/lessons/lesson_42_api_testing` | `api_testing` | — |
| 42 | `module_4/lessons/lesson_43_ai_dev_tools` | `ai_dev_tools` | — |
| 43 | `module_4/lessons/lesson_44_llm_api` | `llm_api` | — |
| 44 | `module_4/lessons/lesson_45_architecture_patterns` | `architecture_patterns` | — |
| 45 | `module_4/lessons/lesson_46_websocket_chat` | `websocket_chat` | — |
| 46 | `module_4/lessons/lesson_47_security_advanced` | `security_advanced` | — |
| 47 | `module_4/lessons/lesson_48_telegram_bot` | `telegram_bot` | — |
| 48 | `module_5/lessons/lesson_49_docker` | `docker` | — |
| 49 | `module_5/lessons/lesson_50_compose_deploy` | `compose_deploy` | — |
| 50 | `module_5/lessons/lesson_51_ci_cd` | `ci_cd` | — |
| 51 | `module_6/lessons/lesson_52_final_project` | `final_project` | — |
| 52 | `module_6/lessons/lesson_53_graduation_pitch` | `graduation_pitch` | — |

> ⚠️ When the LMS is switched to this repo, server-side exam JSONs from 23_02 whose `lesson_id` differs
> from the new slug (last column) must be renamed to the new slug, otherwise `sync_exams` reports
> "Lesson not found for lesson_id".

### After adding metadata — run on server

```bash
make sync-lessons   # creates/updates ContentNode in Django DB
make sync-exams     # links exam JSON to ContentNode
```

### Troubleshooting sync

If `sync_exams` says "Lesson not found for lesson_id":
1. Check `lesson_slug` in notebook metadata matches `lesson_id` in exam JSON
2. Run `make sync-lessons` first, then `make sync-exams`
3. Query actual slugs in DB:
   ```bash
   docker compose exec web python manage.py shell -c "
   from apps.courses.models import ContentNode
   print(list(ContentNode.objects.filter(type='lesson').values_list('slug', flat=True).order_by('order')))
   "
   ```

---

## Adding a New Lesson

1. Create `module_N/lessons/lesson_NN_topic_slug/` following the naming convention (`NN` = v5.0 lesson number; `topic_slug` becomes `lesson_slug`)
2. Create `__init__.py` (empty)
3. Write **master notebook** (instructor version with full solutions)
4. **Run `python tools/sync_notebook_metadata.py`** — adds the Colab badge and the full `lms` block (incl. `module_*` and `notebook_path`); required for Colab and Django sync. A lesson number outside `tools/lessons_v5.json` needs its title added there first
5. Add protected system cell with `SYSTEM_READY`, `COMPLETED_TASKS`, `require_system()`, `require_student()`
6. Wrap solutions in `# BEGIN SOLUTION … # END SOLUTION`
7. Tag instructor-only cells with `"tags": ["instructor"]`
8. Run `python tools/generate_student.py module_N/lessons/lesson_NN_topic_slug/<notebook>.ipynb` (or without arguments for all) to produce `*_student.ipynb`; CI checks it with `--check`. On the book page link it with the «Відкрити вправи в Colab» button + «Переглянути розв’язки» (see «Notebook links on book pages», template `tools/templates/lesson_page.md`)
9. Add lesson config to `tools/config.json`
10. `course.yaml` / `course.json` already list all v5.0 lesson numbers per module — change them only for a lesson outside the v5.0 table
11. Run `python tools/qa_suite.py --unit` to verify API integration
12. Add a step-by-step Mermaid diagram for every algorithm the lesson teaches and an architecture diagram for its `{#architecture}` section (see Mermaid Diagram Standards)
13. Push to `main` → webhook triggers `sync_lessons` automatically

---

## Mermaid Diagram Standards

> Apply to every Mermaid block: book pages `docs/**/*.md`, `diagrams_lesson_NN_*.md` files, notebooks.

### Algorithm & architecture diagrams — mandatory

Students remember an algorithm when they **see it run**. So diagrams are not decoration — they are part of every lesson:

1. **Every algorithm or control-flow construct a lesson explains** (`if/elif`, loops, `break`/`continue`, `match`, search, sorting, recursion, greedy, DP, …) gets a **step-by-step execution diagram**, not only a generic flowchart:
   - one `subgraph` per step / iteration / pass, titled with what happens (`"ітерація 2: cooked = 1 → 2"`);
   - the **state** is shown in the nodes: loop variables, `lo/mid/hi`, `last_end`, `dp[i]`, the list after each pass;
   - classes carry meaning: `step` — neutral state, `warning` — the element/decision being processed now, `success` — taken / condition true / final result, `error` — rejected / condition false;
   - use the same concrete data as the code example next to it, so the diagram and the printed output can be compared line by line.
   - layout for traces: `flowchart TD` with `direction LR` inside each `subgraph`, and link **the subgraphs** (`P1 --> P2 --> P3`), not nodes inside them — Mermaid ignores a subgraph's `direction` when an edge crosses its border; a long single-row `flowchart LR` shrinks to unreadable on the page. Stack unlinked subgraphs with `A ~~~ B`.
2. **Several approaches in one lesson** (e.g. greedy vs DP, linear vs binary search) → end with a `flowchart TD` «як обрати».
3. **Architecture** — every M2+ `## Архітектура … { #architecture }` section, and later lessons on projects/Django/DB, gets a diagram of the architectural decision: components, who depends on whom, data flow; `classDiagram` / `graph LR` for structure, `sequenceDiagram` for calls over time.
4. **Reference for the style**: the old course `PY-Course-Victor-Nikoriak-23_02`, `module_3/lessons/lesson_28_sorting/diagrams_lesson_28_sorting.md` (a section per algorithm, a `subgraph` per pass, a final «how to choose» flowchart); also `lesson_26_search_hashing`, `lesson_27_trees`, `lesson_29_graphs`.
5. **Verify rendering**: `mkdocs build --strict` plus opening the page in a browser (Playwright) — no "Syntax error in text". A diagram that doesn't render is worse than none.

When editing an existing lesson, add a missing step-by-step diagram for the algorithm it teaches (status per lesson: `.claude/plan_md/diagram_audit.md`).

### Palettes: light on book pages, dark in notebooks and `diagrams_*.md`

The MkDocs theme is light, so **book pages (`docs/**/*.md`) use the light palette**:

```
classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px;
classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px;
classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px;
```

**Notebooks and `diagrams_lesson_NN_*.md` use the dark palette:**

### Dark-theme color system (notebooks, `diagrams_*.md`)

```
classDef step     fill:#263238,stroke:#90a4ae,color:#ffffff;
classDef decision fill:#37474f,stroke:#64b5f6,color:#ffffff;
classDef success  fill:#1b5e20,stroke:#4CAF50,color:#ffffff;
classDef error    fill:#4e1f1f,stroke:#f44336,color:#ffffff;
classDef warning  fill:#4a3b00,stroke:#ff9800,color:#ffffff;
```

**Semantic usage:**

| Class | Use when |
|-------|----------|
| `step` | Normal algorithm steps, neutral tree nodes, regular flow |
| `decision` | Condition/question nodes (`{...}`), neutral comparison panels |
| `success` | Correct result, valid structure, recommended approach |
| `error` | Mistake, invalid case, dangerous operation, deprecated pattern |
| `warning` | Important architectural rule, gotcha, critical note, trick |

### Absolute prohibitions

- **Never** use `style NodeID fill:#...` inline — only `classDef` + `class NodeID className`
- **Never** mix palettes: light backgrounds (`#e3f2fd`, `#ffebee`, `#e8f5e9`, …) only on book pages, dark ones only in notebooks / `diagrams_*.md`
- **Never** use `mindmap` — convert to `flowchart TD` (mindmap is unstable in renderers)
- **Never** use `\n` inside node labels — use `<br>` instead
- **Never** style subgraphs with `style SUBGRAPH_ID fill:#...`

### Text rules

- Max 2 lines per node
- Remove filler prefixes ("Крок 1:", "Step 2:") — use content directly
- Lowercase conditionals: `так` / `ні` (not `ТАК` / `НІ`)
- One node = one idea; split long sentences into chained nodes

### Diagram type conventions

| Use case | Diagram type |
|----------|-------------|
| Algorithm steps / flow | `flowchart TD` |
| Algorithm run on concrete data (step-by-step trace) | `flowchart LR`/`TD` with one `subgraph` per step |
| Calls over time (client → service → DB) | `sequenceDiagram` |
| Classes and their relations | `classDiagram` (escape dunders as `#95;#95;init#95;#95;`) |
| Component comparison (side by side) | `graph LR` |
| Tree / hierarchy structure | `graph TD` |
| Taxonomy / categories | `flowchart TD` (not mindmap) |

### Template — every diagram starts with (dark variant; on book pages swap in the light classDefs above)

```mermaid
flowchart TD
    classDef step     fill:#263238,stroke:#90a4ae,color:#ffffff;
    classDef decision fill:#37474f,stroke:#64b5f6,color:#ffffff;
    classDef success  fill:#1b5e20,stroke:#4CAF50,color:#ffffff;
    classDef error    fill:#4e1f1f,stroke:#f44336,color:#ffffff;
    classDef warning  fill:#4a3b00,stroke:#ff9800,color:#ffffff;

    A["Node text<br>second line"]
    class A step
```

---

## Agent Decision Guide

| Task | Where to start |
|------|----------------|
| Add new lesson content | `module_N/lessons/` → follow naming convention → `tools/sync_notebook_metadata.py` |
| Add / move / rename a notebook | `tools/sync_notebook_metadata.py` (CI fails otherwise) |
| Colab badge wrong / "Could not find … .ipynb" | `tools/sync_notebook_metadata.py`; guide in `docs/00_getting_started/colab.md` |
| v5.0 lesson numbers / titles / stream | `tools/lessons_v5.json` (+ `course.yaml`/`course.json` for modules) |
| Strip solutions from notebook | `tools/generate_student.py` |
| Check/change active lesson | `tools/config.json` |
| Test API backend | `tools/qa_suite.py --unit` |
| Load test (concurrent students) | `tools/qa_suite.py --load` |
| View student progress | `dashboard.ipynb` (run in Jupyter) |
| Explain an algorithm / control flow / architecture | Mermaid step-by-step diagram — see «Algorithm & architecture diagrams — mandatory»; status in `.claude/plan_md/diagram_audit.md` |
| Update repo/GitHub workflow docs | `architecture.md` |
| Update Python mental model doc | `docs/00_python_mental_model.md` |
| Add reference doc for a topic | `module_1/bonus/<topic>_docs.ipynb` |
| Fix submission client | `tools/client.py` |
| Change launcher behavior | `start_course.py` |
| Update instructor bio | `instructor.md` |

---

## Critical Rules

- **Never** expose `ADMIN_KEY` from `.env` in notebooks or commits
- **Never** modify `*_student.ipynb` files manually — they are always generated via `tools/generate_student.py`
- **Always** use the `.venv` kernel (`python-course`) in notebooks — not the system Python
- **Never** remove or reorder the protected system cell (🔒) in lesson notebooks
- Lesson folder numbers **are** v5.0 lesson numbers (1–52, running across modules): `lesson_05_*` = v5.0 lesson 5
- **Never** hand-edit the Colab badge cell (`id: view-in-github`) or `metadata.lms` — run `tools/sync_notebook_metadata.py`
- After adding/moving/renaming a notebook, run `tools/sync_notebook_metadata.py` — otherwise the `notebooks.yml` CI check fails
- All lessons live under `module_N/lessons/` — **not** in a root-level `lessons/` folder
- `assignments/` folder structure mirrors lesson numbering (HW3 ↔ lesson 03)
- When adding a lesson, always update `course.yaml` and `course.json` module `lessons` arrays