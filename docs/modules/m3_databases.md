# М3. Бази даних

Стан програми виходить за межі Python-процесу: дані живуть у базі, переживають перезапуск і спільні для багатьох програм.

- [Бонус. Pandas: аналіз даних, графіки і Dash](m3/bonus_pandas.md) — поза нумерацією 1–52, бо Python сьогодні — насамперед data science: справжні дані про Україну (ціни WFP 2014–2026, курс, борг, зарплати Держстату, порти, ціни у 71 країні); pandas (`read_csv`, `query`, Split-Apply-Combine, `resample`, `merge`, `melt`/`pivot`, очищення cp1251-файлу), matplotlib, seaborn і Plotly, Dash-застосунок на 8 вкладок (перша — «Історія даних» у стилі storytelling with data); що змінилось у свіжих даних WFP (National Average лише 2014–2017, буханка → кілограм). Довідники: [аналіз даних — патерни й мислення](m3/pandas/data_analytics.md), [архітектура Dash](m3/pandas/dash_architecture.md).

Уроки модуля:

- [Урок 30. Основи SQL (PostgreSQL)](m3/lesson_30.md) — база диспетчерської «Смачно + Таксі»: клієнт і сервер PostgreSQL, встановлення (Docker, інсталятор, Linux, Colab), таблиці з первинними й зовнішніми ключами та обмеженнями, `INSERT … RETURNING` / `UPDATE` / `DELETE`, `SELECT` і порядок його виконання, `NULL`, агрегати з `GROUP BY` / `HAVING`, `JOIN` і `LEFT JOIN`, підзапити й `WITH`, транзакції й ACID; з Python — `psycopg`, SQL-ін'єкція й параметри, репозиторій; архітектура: де живуть правила, індекси й `EXPLAIN`.
- [Урок 31. Redis overview](m3/lesson_31.md) — Redis поруч із PostgreSQL: що класти в пам'ять, а що на диск; `SET` / `GET`, атомарний `INCR` проти гонитви, `EXPIRE` / `TTL`; структури list, hash, set, sorted set (відповідники з уроку 29); `redis-py` і `pipeline`; кеш cache-aside, черга задач producer / consumer (`BLPOP`), Pub/Sub; архітектура: персистентність RDB / AOF, `maxmemory-policy allkeys-lru`, коли Redis не потрібен; протокол RESP. Практика — rate limit.
