# Урок 30. Основи SQL (PostgreSQL)

У модулі 2 диспетчерська «Смачно + Таксі» тримала замовлення в пам'яті програми (пакет `dispatch`, урок 29), а звіти — у JSON-файлах (урок 15). Поки сервіс маленький, цього досить. Але вже зараз:

- програма перезапустилася — черга замовлень **зникла**;
- три оператори одночасно записують у той самий JSON-файл — хтось **перезаписує** зміни іншого;
- власниця питає «скільки заробив кожен кур'єр у Поділ за тиждень» — і доводиться писати новий цикл на Python;
- у файлі опинилося замовлення з сумою `-120` і кур'єром, якого не існує, — **ніхто не перевірив**.

Усе це — задачі **бази даних**. Сьогодні — реляційна база **PostgreSQL** і мова запитів до неї **SQL**: як описати таблиці, записати й змінити дані, поставити запитання до даних і працювати з базою з Python.

**Що потрібно з попередніх уроків:** словники й підрахунок за ключем (урок 6), файли й JSON (урок 15), винятки (урок 14), `eval` і небезпека виконання чужого тексту (довідник «eval()»), класи й композиція (уроки 20–21), `with` (урок 15), пакет `dispatch` (урок 29).

**Після уроку ти зможеш:**

- пояснити, що дає база даних порівняно з файлами, і як влаштована пара «клієнт — сервер PostgreSQL»;
- спроєктувати таблиці з первинними й зовнішніми ключами та обмеженнями (`NOT NULL`, `UNIQUE`, `CHECK`);
- створювати таблиці (`CREATE TABLE`) і змінювати дані (`INSERT`, `UPDATE`, `DELETE`);
- писати запити `SELECT` з фільтрами, сортуванням, агрегатами, `GROUP BY`, `JOIN` і підзапитами;
- пояснити, що таке транзакція, і користуватися `COMMIT` / `ROLLBACK`;
- працювати з PostgreSQL з Python через `psycopg`, передаючи дані **параметрами**, а не f-рядками.

**Задача розділу.** База диспетчерської: ресторани, кур'єри, замовлення — і звіти для власниці. Повний приклад — у розділі [«Практика»](#practice).

**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/lessons/lesson_30_sql_basics/note_lesson_30_sql_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/lessons/lesson_30_sql_basics/note_lesson_30_sql.ipynb){ .solutions-link } — з кліткою, що встановлює PostgreSQL прямо в Colab.

## Пригадай

1. Як порахувати кількість чеків за кожен день списку `orders` у Python (урок 6)?
2. Чому `eval(input())` небезпечний?
3. Що гарантує `with open(...) as f:`?

??? success "Відповіді"

    1. Словник-лічильник: для кожного чека `counts[order.day] = counts.get(order.day, 0) + 1`. Сьогодні той самий звіт — одним рядком SQL: `GROUP BY`.
    2. Він виконує будь-який код, який ввів користувач. Сьогодні побачимо ту саму діру в базах даних — SQL-ін'єкцію — і як її закрити.
    3. Файл закриється, навіть якщо всередині блоку станеться виняток. Так само працюватиме з'єднання з базою.

## База даних і сервер

**База даних** — організоване сховище, яке саме стежить за правилами даних. **Система керування базами даних** (СКБД) — програма, що цим сховищем керує. **PostgreSQL** — одна з найпоширеніших вільних реляційних СКБД.

PostgreSQL працює як **сервер**: окрема програма, що постійно запущена, тримає дані на диску й приймає запити від **клієнтів** — консолі `psql`, програм на Python, графічних інструментів.

```mermaid
flowchart LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    P["psql<br>консоль"] -- "SQL-запит" --> S["сервер PostgreSQL<br>порт 5432"]
    A["Python<br>psycopg"] -- "SQL-запит" --> S
    O["оператор 2<br>psql"] -- "SQL-запит" --> S
    S -- "рядки результату" --> A
    S <--> D[("диск<br>таблиці, журнал")]

    class P,A,O step
    class S success
    class D decision
```

Що дає сервер порівняно з JSON-файлом:

| Проблема з файлами | Що робить база |
|---|---|
| програма впала — дані в пам'яті зникли | дані на диску; після `COMMIT` не губляться |
| кілька програм пишуть одночасно | сервер упорядковує паралельні зміни |
| кожен звіт — новий цикл на Python | запит мовою SQL: кажемо **що** потрібно, а не **як** шукати |
| сума `-120`, неіснуючий кур'єр | **обмеження** (`CHECK`, `FOREIGN KEY`) не пустять такі дані |
| пошук серед мільйонів записів | **індекси** — як словник з уроку 17, але на диску |

### Встановлення і підключення

Потрібен запущений сервер PostgreSQL і клієнт `psql`. Обери один спосіб:

=== "Docker (рекомендовано)"

    Якщо встановлено Docker (урок 49 розбере його докладно), сервер запускається однією командою:

    ```bash
    docker run --name smachno-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
    docker exec -it smachno-db psql -U postgres
    ```

    `-e POSTGRES_PASSWORD` задає пароль користувача `postgres`, `-p 5432:5432` відкриває порт для Python.

=== "Windows / macOS"

    Завантаж інсталятор з [postgresql.org/download](https://www.postgresql.org/download/) (для Windows і macOS — інсталятор EDB, для macOS також [Postgres.app](https://postgresapp.com/)). Під час встановлення запам'ятай пароль користувача `postgres`. Консоль `psql` — у меню «Пуск» як **SQL Shell (psql)** або в терміналі.

=== "Linux (Ubuntu)"

    ```bash
    sudo apt install postgresql
    sudo -u postgres psql
    ```

=== "Google Colab"

    Colab — це віртуальна машина з Ubuntu, тож PostgreSQL ставиться в неї так само. Готова клітинка — на початку ноутбука заняття; сервер живе, доки працює сесія Colab.

Перевірка — запит до сервера:

```sql
SELECT version();
```

```text
                                                                 version
------------------------------------------------------------------------------------------------------------------------------------------
 PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit
(1 row)
```

Команди самого `psql` (не SQL) починаються зі зворотної скісної риски: `\l` — список баз, `\dt` — список таблиць, `\d назва` — будова таблиці, `\q` — вийти. SQL-команди закінчуються **крапкою з комою** — без неї `psql` чекає продовження.

## Таблиці, рядки, ключі

Реляційна база зберігає дані в **таблицях**. Таблиця — як список `NamedTuple` з уроку 5: **рядок** — один запис (одне замовлення), **стовпець** — поле з фіксованим типом.

Для диспетчерської — три таблиці:

```mermaid
erDiagram
    RESTAURANTS ||--o{ ORDERS : "готує"
    COURIERS |o--o{ ORDERS : "везе"
    RESTAURANTS {
        int id PK
        text name UK
        text district
    }
    COURIERS {
        int id PK
        text name
        text phone UK
        boolean is_active
    }
    ORDERS {
        int id PK
        int restaurant_id FK
        int courier_id FK "NULL - ще не призначено"
        text customer
        numeric total "CHECK > 0"
        text status
        timestamp created_at
    }
```

- **Первинний ключ** (`PRIMARY KEY`, PK) — стовпець, що однозначно визначає рядок: номер замовлення. Двох рядків з однаковим ключем бути не може.
- **Зовнішній ключ** (`FOREIGN KEY`, FK) — стовпець, що посилається на первинний ключ іншої таблиці: `orders.restaurant_id` → `restaurants.id`. База не дасть записати замовлення від ресторану, якого немає.
- **Один-до-багатьох**: один ресторан — багато замовлень. Тому ресторан не зберігають у кожному замовленні повністю (назва, район…), а лише його `id`. Змінилась назва — змінюємо один рядок у `restaurants`, а не сотні замовлень. Прибирати такі повтори — суть **нормалізації** схеми.

### CREATE TABLE

Мова опису структури — **DDL** (Data Definition Language):

```sql
CREATE TABLE restaurants (
    id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     text NOT NULL UNIQUE,
    district text NOT NULL
);

CREATE TABLE couriers (
    id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      text NOT NULL,
    phone     text UNIQUE,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE orders (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id integer NOT NULL REFERENCES restaurants (id),
    courier_id    integer REFERENCES couriers (id),
    customer      text NOT NULL,
    total         numeric(8, 2) NOT NULL CHECK (total > 0),
    status        text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'delivering', 'delivered', 'cancelled')),
    created_at    timestamp NOT NULL DEFAULT now()
);
```

```text
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

| Запис | Що означає |
|---|---|
| `integer`, `text`, `boolean`, `timestamp` | тип стовпця: ціле, рядок, логічне, дата-час |
| `numeric(8, 2)` | точне десяткове число: до 8 цифр, 2 після коми. Для грошей — не `float` (урок 3: `0.1 + 0.2`) |
| `GENERATED ALWAYS AS IDENTITY` | номер генерує база: 1, 2, 3… |
| `NOT NULL` | значення обов'язкове. `NULL` у SQL — як `None`: «значення немає» |
| `UNIQUE` | повтори заборонені |
| `DEFAULT` | значення, якщо його не вказали |
| `CHECK (умова)` | рядок, для якого умова хибна, не буде записано |
| `REFERENCES restaurants (id)` | зовнішній ключ |

`courier_id` без `NOT NULL`: нове замовлення ще не має кур'єра. У `psql` будову таблиці покаже `\d orders`.

## Змінюємо дані: INSERT, UPDATE, DELETE

Мова зміни даних — **DML** (Data Manipulation Language). Додамо ресторани й кур'єрів:

```sql
INSERT INTO restaurants (name, district) VALUES
    ('Борщ і Ко', 'Поділ'),
    ('Піца Поділ', 'Поділ'),
    ('Суші Оболонь', 'Оболонь'),
    ('Вареники 24/7', 'Центр');

INSERT INTO couriers (name, phone) VALUES
    ('Оксана', '+380501112233'),
    ('Тарас', '+380672223344'),
    ('Ігор', '+380633334455'),
    ('Марія', '+380994445566');
```

```text
INSERT 0 4
INSERT 0 4
```

`INSERT 0 4` — додано 4 рядки (перше число історичне, завжди 0). Стовпці `id` і `is_active` ми не вказували: їх заповнили `IDENTITY` і `DEFAULT`.

`RETURNING` одразу повертає те, що записала база, — зокрема новий `id`:

```sql
INSERT INTO orders (restaurant_id, courier_id, customer, total, status, created_at) VALUES
    (1, 1, 'Анна',   540.00, 'delivered',  '2026-09-21 12:10'),
    (1, 2, 'Богдан', 320.00, 'delivered',  '2026-09-21 13:05'),
    (2, 1, 'Віра',   980.00, 'delivered',  '2026-09-21 19:40'),
    (3, 3, 'Галина', 760.00, 'delivered',  '2026-09-22 18:15'),
    (4, 2, 'Дмитро', 450.00, 'cancelled',  '2026-09-22 20:30'),
    (2, 1, 'Анна',   610.00, 'delivered',  '2026-09-23 12:45'),
    (3, 2, 'Євген',  1250.00, 'delivered', '2026-09-23 19:20'),
    (1, 3, 'Жанна',  280.00, 'delivering', '2026-09-24 13:00'),
    (4, NULL, 'Зоя', 390.00, 'new',        '2026-09-24 13:10')
RETURNING id, customer, total;
```

```text
 id | customer |  total
----+----------+---------
  1 | Анна     |  540.00
  2 | Богдан   |  320.00
  3 | Віра     |  980.00
  4 | Галина   |  760.00
  5 | Дмитро   |  450.00
  6 | Анна     |  610.00
  7 | Євген    | 1250.00
  8 | Жанна    |  280.00
  9 | Зоя      |  390.00
(9 rows)

INSERT 0 9
```

### Обмеження не пустять погані дані

```sql
INSERT INTO orders (restaurant_id, customer, total) VALUES (1, 'Ірина', -120);
```

```text
ERROR:  new row for relation "orders" violates check constraint "orders_total_check"
DETAIL:  Failing row contains (10, 1, null, Ірина, -120.00, new, 2026-09-26 15:43:02.52544).
```

```sql
INSERT INTO orders (restaurant_id, customer, total) VALUES (99, 'Ірина', 300);
```

```text
ERROR:  insert or update on table "orders" violates foreign key constraint "orders_restaurant_id_fkey"
DETAIL:  Key (restaurant_id)=(99) is not present in table "restaurants".
```

```sql
INSERT INTO couriers (name, phone) VALUES ('Оксана-2', '+380501112233');
```

```text
ERROR:  duplicate key value violates unique constraint "couriers_phone_key"
DETAIL:  Key (phone)=(+380501112233) already exists.
```

Кожна помилка називає порушене правило, а рядок **не записано**. У Python ми б писали ці перевірки вручну в кожному місці, де змінюються дані; тут вони в одному місці — у схемі.

### UPDATE і DELETE

```sql
UPDATE orders SET status = 'delivered' WHERE id = 8;
DELETE FROM orders WHERE status = 'cancelled';
```

```text
UPDATE 1
DELETE 1
```

`UPDATE 1` / `DELETE 1` — скільки рядків змінено.

!!! danger "`WHERE` — не забувай"
    `UPDATE orders SET status = 'cancelled';` без `WHERE` скасує **всі** замовлення, а `DELETE FROM orders;` — видалить усі. База не перепитує. Перед небезпечним `UPDATE` / `DELETE` спершу виконай `SELECT` з тим самим `WHERE` і подивись, що зачепиш, — або працюй у транзакції (розділ [«Транзакції»](#transactions)).

## SELECT: питаємо дані

Мова запитів — **DQL** (Data Query Language), а весь SQL будується навколо однієї команди: `SELECT`. Вона **описує результат**, а як його знайти — вирішує база.

```sql
SELECT id, customer, total, status
FROM orders
WHERE total >= 500
ORDER BY total DESC;
```

```text
 id | customer |  total  |  status
----+----------+---------+-----------
  7 | Євген    | 1250.00 | delivered
  3 | Віра     |  980.00 | delivered
  4 | Галина   |  760.00 | delivered
  6 | Анна     |  610.00 | delivered
  1 | Анна     |  540.00 | delivered
(5 rows)
```

| Частина | Що робить |
|---|---|
| `SELECT стовпці` | які стовпці показати (`*` — усі) |
| `FROM таблиця` | звідки брати рядки |
| `WHERE умова` | лишити рядки, для яких умова істинна |
| `ORDER BY стовпець [DESC]` | сортування (`DESC` — за спаданням) |
| `LIMIT n` | не більше `n` рядків |

Без `ORDER BY` база повертає рядки в будь-якому зручному їй порядку — і він може змінитися після `UPDATE`. Якщо порядок важливий, завжди пиши `ORDER BY`.

Умови в `WHERE` — як в `if` (урок 4), але з власним синтаксисом:

```sql
SELECT id, customer, status, courier_id
FROM orders
WHERE status IN ('new', 'delivering')
   OR customer LIKE 'А%'
ORDER BY id;
```

```text
 id | customer |  status   | courier_id
----+----------+-----------+------------
  1 | Анна     | delivered |          1
  6 | Анна     | delivered |          1
  9 | Зоя      | new       |
(3 rows)
```

- `=` і `<>` — рівність і нерівність (у SQL одне `=`, не `==`);
- `AND`, `OR`, `NOT` — як в уроці 4, і так само варто ставити дужки;
- `IN (...)` — значення зі списку; `BETWEEN a AND b` — діапазон включно;
- `LIKE 'А%'` — рядок за шаблоном: `%` — будь-які символи, `_` — один символ. `ILIKE` — без урахування регістру;
- `IS NULL` / `IS NOT NULL` — перевірка «немає значення». `courier_id = NULL` **не працює**: порівняння з `NULL` дає не `true`, а `NULL`.

```sql
SELECT count(*) AS by_equals FROM orders WHERE courier_id = NULL;
SELECT count(*) AS by_is FROM orders WHERE courier_id IS NULL;
```

```text
 by_equals
-----------
         0
(1 row)

 by_is
-------
     1
(1 row)
```

### У якому порядку виконується SELECT

Ми **пишемо** `SELECT` першим, але база **виконує** його частини в іншому порядку:

```mermaid
flowchart LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    F["1. FROM / JOIN<br>усі рядки таблиць"] --> W["2. WHERE<br>відкинути рядки"]
    W --> G["3. GROUP BY<br>зібрати в групи"]
    G --> H["4. HAVING<br>відкинути групи"]
    H --> S["5. SELECT<br>обчислити стовпці"]
    S --> O["6. ORDER BY<br>відсортувати"]
    O --> L["7. LIMIT<br>обрізати"]

    class F,G,S,O step
    class W,H warning
    class L success
```

Звідси два правила, які пояснюють більшість помилок новачків:

- у `WHERE` не можна використати псевдонім з `SELECT` (`AS ...`): на кроці 2 його ще не існує;
- `WHERE` фільтрує **рядки** до групування, `HAVING` — **групи** після.

## Агрегати і GROUP BY

**Агрегатні функції** згортають багато рядків в одне значення: `count`, `sum`, `avg`, `min`, `max`.

```sql
SELECT count(*) AS orders, sum(total) AS revenue, round(avg(total), 2) AS avg_check
FROM orders
WHERE status = 'delivered';
```

```text
 orders | revenue | avg_check
--------+---------+-----------
      7 | 4740.00 |    677.14
(1 row)
```

`GROUP BY` рахує агрегати **для кожної групи** — це патерн «підрахунок за ключем» з уроку 6 одним рядком:

```sql
SELECT courier_id, count(*) AS orders, sum(total) AS revenue
FROM orders
WHERE status = 'delivered'
GROUP BY courier_id
ORDER BY revenue DESC;
```

```text
 courier_id | orders | revenue
------------+--------+---------
          1 |      3 | 2130.00
          2 |      2 | 1570.00
          3 |      2 | 1040.00
(3 rows)
```

Те саме на Python — для порівняння:

```python
delivered = [(1, 540.00), (2, 320.00), (1, 980.00), (3, 760.00), (1, 610.00), (2, 1250.00), (3, 280.00)]

revenue = {}
for courier_id, total in delivered:
    revenue[courier_id] = revenue.get(courier_id, 0) + total
print(sorted(revenue.items(), key=lambda item: item[1], reverse=True))
```

```text
[(1, 2130.0), (2, 1570.0), (3, 1040.0)]
```

Покроково, що робить база з `GROUP BY courier_id`:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph W["WHERE status = 'delivered' — 7 рядків"]
        direction LR
        R["540 к1 · 320 к2 · 980 к1 · 760 к3<br>610 к1 · 1250 к2 · 280 к3"]
    end
    subgraph G["GROUP BY courier_id — 3 групи"]
        direction LR
        G1["к1: 540, 980, 610"] ~~~ G2["к2: 320, 1250"] ~~~ G3["к3: 760, 280"]
    end
    subgraph A["count, sum — один рядок на групу"]
        direction LR
        A1["к1: 3 · 2130"] ~~~ A2["к2: 2 · 1570"] ~~~ A3["к3: 2 · 1040"]
    end
    W --> G --> A

    class R step
    class G1,G2,G3 warning
    class A1,A2,A3 success
```

**HAVING** — фільтр по групах: кур'єри з виторгом понад 1500 грн.

```sql
SELECT courier_id, sum(total) AS revenue
FROM orders
WHERE status = 'delivered'
GROUP BY courier_id
HAVING sum(total) > 1500
ORDER BY courier_id;
```

```text
 courier_id | revenue
------------+---------
          1 | 2130.00
          2 | 1570.00
(2 rows)
```

!!! warning "Кожен стовпець — або в GROUP BY, або в агрегаті"
    ```sql
    SELECT courier_id, customer, sum(total) FROM orders GROUP BY courier_id;
    ```

    ```text
    ERROR:  column "orders.customer" must appear in the GROUP BY clause or be used in an aggregate function
    LINE 1: SELECT courier_id, customer, sum(total) FROM orders GROUP BY...
                               ^
    ```

    У групі кур'єра 1 — кілька клієнтів. Якого з них показати в одному рядку групи? База не вгадує, а відмовляє.

## JOIN: з'єднуємо таблиці

У `orders` лише номери кур'єрів. Щоб побачити імена, треба **з'єднати** таблиці: для кожного замовлення знайти рядок кур'єра, у якого `couriers.id = orders.courier_id`.

```sql
SELECT o.id, o.customer, c.name AS courier, o.total
FROM orders AS o
JOIN couriers AS c ON c.id = o.courier_id
ORDER BY o.id;
```

```text
 id | customer | courier |  total
----+----------+---------+---------
  1 | Анна     | Оксана  |  540.00
  2 | Богдан   | Тарас   |  320.00
  3 | Віра     | Оксана  |  980.00
  4 | Галина   | Ігор    |  760.00
  6 | Анна     | Оксана  |  610.00
  7 | Євген    | Тарас   | 1250.00
  8 | Жанна    | Ігор    |  280.00
(7 rows)
```

`orders AS o` — короткий псевдонім таблиці. `JOIN` (повністю — `INNER JOIN`) лишає лише пари, для яких умова `ON` істинна. Покроково для перших замовлень:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph J1["замовлення 1 · courier_id = 1"]
        direction LR
        Q1{"шукаємо couriers.id = 1"} --> R1["Оксана<br>рядок у результаті"]
    end
    subgraph J2["замовлення 2 · courier_id = 2"]
        direction LR
        Q2{"шукаємо couriers.id = 2"} --> R2["Тарас<br>рядок у результаті"]
    end
    subgraph J3["замовлення без кур'єра · courier_id = NULL"]
        direction LR
        Q3{"NULL = будь-що?"} --> R3["пари немає<br>INNER JOIN відкидає"]
    end
    J1 --> J2 --> J3

    class Q1,Q2,Q3 decision
    class R1,R2 success
    class R3 error
```

Кур'єр без замовлень теж зникає з `INNER JOIN`: для нього немає пари. Щоб побачити **всіх** кур'єрів — `LEFT JOIN`: усі рядки лівої таблиці, а де пари немає — `NULL`.

```sql
SELECT c.name, count(o.id) AS orders, coalesce(sum(o.total), 0) AS revenue
FROM couriers AS c
LEFT JOIN orders AS o ON o.courier_id = c.id AND o.status = 'delivered'
GROUP BY c.id, c.name
ORDER BY revenue DESC;
```

```text
  name  | orders | revenue
--------+--------+---------
 Оксана |      3 | 2130.00
 Тарас  |      2 | 1570.00
 Ігор   |      2 | 1040.00
 Марія  |      0 |       0
(4 rows)
```

- `count(o.id)` рахує лише не-`NULL`, тому у Марії — 0, а не 1;
- `coalesce(x, 0)` — «перше не-`NULL`»: як `x if x is not None else 0`;
- умова `o.status = 'delivered'` стоїть в `ON`, а не у `WHERE`. Чому це важливо — у розділі [«Знайди помилку»](#find-bug).

JOIN кількох таблиць — ланцюжком: виторг за районами ресторанів.

```sql
SELECT r.district, count(*) AS orders, sum(o.total) AS revenue
FROM orders AS o
JOIN restaurants AS r ON r.id = o.restaurant_id
WHERE o.status = 'delivered'
GROUP BY r.district
ORDER BY revenue DESC;
```

```text
 district | orders | revenue
----------+--------+---------
 Поділ    |      5 | 2730.00
 Оболонь  |      2 | 2010.00
(2 rows)
```

## Підзапити і WITH

**Підзапит** — `SELECT` усередині іншого запиту. Замовлення, дорожчі за середнє:

```sql
SELECT id, customer, total
FROM orders
WHERE total > (SELECT avg(total) FROM orders)
ORDER BY total DESC;
```

```text
 id | customer |  total
----+----------+---------
  7 | Євген    | 1250.00
  3 | Віра     |  980.00
  4 | Галина   |  760.00
(3 rows)
```

Кур'єри, які хоч раз возили від «Суші Оболонь»:

```sql
SELECT name
FROM couriers
WHERE id IN (
    SELECT o.courier_id
    FROM orders AS o
    JOIN restaurants AS r ON r.id = o.restaurant_id
    WHERE r.name = 'Суші Оболонь'
)
ORDER BY name;
```

```text
 name
-------
 Ігор
 Тарас
(2 rows)
```

Довгий запит легше читати, якщо дати проміжному результату ім'я — **CTE** (`WITH`): як змінна з результатом запиту.

```sql
WITH courier_revenue AS (
    SELECT courier_id, sum(total) AS revenue
    FROM orders
    WHERE status = 'delivered'
    GROUP BY courier_id
)
SELECT c.name, cr.revenue
FROM courier_revenue AS cr
JOIN couriers AS c ON c.id = cr.courier_id
WHERE cr.revenue > (SELECT avg(revenue) FROM courier_revenue)
ORDER BY cr.revenue DESC;
```

```text
  name  | revenue
--------+---------
 Оксана | 2130.00
(1 row)
```

## Транзакції { #transactions }

Власниця виплачує кур'єрові бонус із загального фонду: **зняти** гроші з фонду і **додати** кур'єрові — дві зміни. Якщо програма впаде між ними, гроші зникнуть або задвояться. **Транзакція** — група команд, яка виконується **повністю або ніяк**.

```sql
CREATE TABLE balances (owner text PRIMARY KEY, amount numeric(10, 2) NOT NULL CHECK (amount >= 0));
INSERT INTO balances VALUES ('фонд', 1000), ('Оксана', 0);

BEGIN;
UPDATE balances SET amount = amount - 300 WHERE owner = 'фонд';
UPDATE balances SET amount = amount + 300 WHERE owner = 'Оксана';
COMMIT;

SELECT * FROM balances ORDER BY owner;
```

```text
CREATE TABLE
INSERT 0 2
BEGIN
UPDATE 1
UPDATE 1
COMMIT
 owner  | amount
--------+--------
 Оксана | 300.00
 фонд   | 700.00
(2 rows)
```

Тепер бонус у 900 грн — більше, ніж лишилось у фонді:

```sql
BEGIN;
UPDATE balances SET amount = amount + 900 WHERE owner = 'Оксана';
UPDATE balances SET amount = amount - 900 WHERE owner = 'фонд';
SELECT * FROM balances;
ROLLBACK;

SELECT * FROM balances ORDER BY owner;
```

```text
BEGIN
UPDATE 1
ERROR:  new row for relation "balances" violates check constraint "balances_amount_check"
DETAIL:  Failing row contains (фонд, -200.00).
ERROR:  current transaction is aborted, commands ignored until end of transaction block
ROLLBACK
 owner  | amount
--------+--------
 Оксана | 300.00
 фонд   | 700.00
(2 rows)
```

Другий `UPDATE` порушив `CHECK (amount >= 0)`. Після помилки транзакція «зламана»: навіть звичайний `SELECT` у ній PostgreSQL відмовляється виконувати (`current transaction is aborted`), доки не буде `ROLLBACK`. Перший `UPDATE` — додавання Оксані — теж скасовано: баланси як до `BEGIN`.

Властивості транзакцій скорочують як **ACID**:

- **Atomicity** (атомарність) — усе або нічого;
- **Consistency** (узгодженість) — після транзакції всі обмеження виконані;
- **Isolation** (ізольованість) — паралельні транзакції не бачать незавершених змін одна одної;
- **Durability** (довговічність) — після `COMMIT` зміни переживуть навіть вимкнення сервера.

Без `BEGIN` кожна команда `psql` — окрема транзакція, яка підтверджується одразу.

## PostgreSQL з Python

Популярний драйвер PostgreSQL для Python — **psycopg** (версія 3): `pip install "psycopg[binary]"`.

```python
import psycopg

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/smachno"

with psycopg.connect(DATABASE_URL) as conn:
    rows = conn.execute(
        "SELECT c.name, count(o.id) FROM couriers AS c "
        "LEFT JOIN orders AS o ON o.courier_id = c.id "
        "GROUP BY c.id, c.name ORDER BY c.id"
    ).fetchall()

print(rows)
```

```text
[('Оксана', 3), ('Тарас', 2), ('Ігор', 2), ('Марія', 0)]
```

Кожен рядок результату — кортеж. `with psycopg.connect(...)` наприкінці блоку робить `COMMIT`, а якщо стався виняток — `ROLLBACK`, і закриває з'єднання (урок 15: `with` прибирає за собою).

### Параметри, а не f-рядки

Оператор шукає замовлення клієнта за ім'ям з форми. Спокуса — підставити текст у запит f-рядком:

```python
def find_orders_unsafe(conn, customer):
    query = f"SELECT id, customer, total FROM orders WHERE customer = '{customer}'"
    return conn.execute(query).fetchall()


with psycopg.connect(DATABASE_URL) as conn:
    print(find_orders_unsafe(conn, "Анна"))
    print(find_orders_unsafe(conn, "x' OR '1'='1"))
```

```text
[(1, 'Анна', Decimal('540.00')), (6, 'Анна', Decimal('610.00'))]
[(1, 'Анна', Decimal('540.00')), (2, 'Богдан', Decimal('320.00')), (3, 'Віра', Decimal('980.00')), (4, 'Галина', Decimal('760.00')), (6, 'Анна', Decimal('610.00')), (7, 'Євген', Decimal('1250.00')), (9, 'Зоя', Decimal('390.00')), (8, 'Жанна', Decimal('280.00'))]
```

Другий виклик повернув **усі** замовлення. «Ім'я» `x' OR '1'='1` закрило лапки й дописало умову, яка завжди істинна: запит став `WHERE customer = 'x' OR '1'='1'`. Це **SQL-ін'єкція** — та сама проблема, що `eval(input())`: дані користувача стали кодом. Замість `OR '1'='1'` зловмисник може дописати й `; DROP TABLE orders`.

Правильно — **параметри**: у запиті `%s`, а значення — окремим аргументом. Драйвер передає їх серверу як дані, а не як частину SQL.

```python
def find_orders(conn, customer):
    return conn.execute(
        "SELECT id, customer, total FROM orders WHERE customer = %s",
        (customer,),
    ).fetchall()


with psycopg.connect(DATABASE_URL) as conn:
    print(find_orders(conn, "Анна"))
    print(find_orders(conn, "x' OR '1'='1"))
```

```text
[(1, 'Анна', Decimal('540.00')), (6, 'Анна', Decimal('610.00'))]
[]
```

!!! danger "Правило без винятків"
    Дані від користувача — **лише параметрами** (`%s` + кортеж). Ніколи не будуй SQL через f-рядок, `+` чи `.format()`, навіть «для швидкої перевірки». `%s` у psycopg — не форматування рядка Python: не став навколо нього лапок.

### Запис з Python і транзакція

```python
with psycopg.connect(DATABASE_URL) as conn:
    new_id = conn.execute(
        "INSERT INTO orders (restaurant_id, customer, total) VALUES (%s, %s, %s) RETURNING id",
        (3, "Ірина", 430),
    ).fetchone()[0]
    print("нове замовлення:", new_id)

try:
    with psycopg.connect(DATABASE_URL) as conn:
        conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = %s", (new_id,))
        conn.execute("INSERT INTO orders (restaurant_id, customer, total) VALUES (%s, %s, %s)", (3, "Ірина", -1))
except psycopg.errors.CheckViolation as error:
    print("помилка:", error.diag.message_primary)

with psycopg.connect(DATABASE_URL) as conn:
    print(conn.execute("SELECT status FROM orders WHERE id = %s", (new_id,)).fetchone())
```

```text
нове замовлення: 12
помилка: new row for relation "orders" violates check constraint "orders_total_check"
('new',)
```

Номер 12, а не 10: невдалі вставки з розділу про обмеження теж «витратили» номери — лічильник `IDENTITY` не повертається назад, тому в номерах бувають пропуски. Перший блок підтвердив вставку. У другому скасування (`UPDATE`) і помилкова вставка — одна транзакція: вставка впала, `with` зробив `ROLLBACK`, і скасування теж не збереглося — статус лишився `new`. Помилки PostgreSQL приходять у Python як винятки (урок 14): `psycopg.errors.CheckViolation`, `UniqueViolation`, `ForeignKeyViolation`.

## Архітектура: SQL в одному місці { #architecture }

Якщо SQL розкидано по всій програмі, зміна однієї таблиці ламає десятки місць. Звичайне рішення — **репозиторій**: клас, який знає SQL і таблиці, а назовні дає методи мовою предметної області.

```python
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class OrderRow:
    id: int
    customer: str
    total: Decimal
    status: str


class OrderRepository:
    """Уся робота з таблицею orders — тут і лише тут."""

    def __init__(self, conn):
        self._conn = conn

    def add(self, restaurant_id, customer, total):
        row = self._conn.execute(
            "INSERT INTO orders (restaurant_id, customer, total) VALUES (%s, %s, %s) "
            "RETURNING id, customer, total, status",
            (restaurant_id, customer, total),
        ).fetchone()
        return OrderRow(*row)

    def waiting(self):
        rows = self._conn.execute(
            "SELECT id, customer, total, status FROM orders "
            "WHERE status = 'new' ORDER BY created_at, id"
        ).fetchall()
        return [OrderRow(*row) for row in rows]

    def assign(self, order_id, courier_id):
        self._conn.execute(
            "UPDATE orders SET courier_id = %s, status = 'delivering' WHERE id = %s AND status = 'new'",
            (courier_id, order_id),
        )


with psycopg.connect(DATABASE_URL) as conn:
    repo = OrderRepository(conn)
    print(repo.waiting())
    repo.assign(repo.waiting()[0].id, 4)
    print(repo.waiting())
```

```text
[OrderRow(id=9, customer='Зоя', total=Decimal('390.00'), status='new'), OrderRow(id=12, customer='Ірина', total=Decimal('430.00'), status='new')]
[OrderRow(id=12, customer='Ірина', total=Decimal('430.00'), status='new')]
```

`numeric` приходить у Python як `Decimal` — точне десяткове число: гроші не отримують похибки `float`.

```mermaid
flowchart LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    UI["інтерфейс<br>CLI, веб (модуль 4)"] --> SVC["сервіс<br>Dispatcher: правила"]
    SVC --> REPO["репозиторій<br>OrderRepository: SQL"]
    REPO --> DB[("PostgreSQL<br>таблиці, обмеження")]

    class UI,SVC step
    class REPO warning
    class DB success
```

- **Правила даних** (сума > 0, кур'єр існує) — у схемі бази: їх не обійде жоден клієнт.
- **Правила бізнесу** (хто отримує наступне замовлення) — у сервісі, як `Dispatcher` з уроку 29.
- **SQL** — у репозиторії. Сервіс не знає назв стовпців; тести сервісу можуть підставити замість репозиторію підробку (урок 26).

### Індекси: словник для таблиці

`WHERE customer = 'Анна'` без підготовки змушує базу переглянути **всю** таблицю — лінійний пошук з уроку 12. **Індекс** — окрема структура (у PostgreSQL за замовчуванням — B-дерево), яка знаходить рядки за значенням стовпця за `O(log n)`. Первинний ключ і `UNIQUE` отримують індекс автоматично.

Як база збирається виконувати запит, показує `EXPLAIN`. Додамо 100 000 тестових замовлень:

```sql
INSERT INTO orders (restaurant_id, customer, total, status)
SELECT 1 + n % 4, 'клієнт ' || n, 100 + n % 900, 'delivered'
FROM generate_series(1, 100000) AS n;
ANALYZE orders;

EXPLAIN SELECT * FROM orders WHERE customer = 'клієнт 777';
```

```text
INSERT 0 100000
ANALYZE
                        QUERY PLAN
----------------------------------------------------------
 Seq Scan on orders  (cost=0.00..2281.11 rows=1 width=53)
   Filter: (customer = 'клієнт 777'::text)
(2 rows)
```

`Seq Scan` — послідовний перегляд усієї таблиці. Створимо індекс:

```sql
CREATE INDEX orders_customer_idx ON orders (customer);

EXPLAIN SELECT * FROM orders WHERE customer = 'клієнт 777';
```

```text
CREATE INDEX
                                    QUERY PLAN
-----------------------------------------------------------------------------------
 Index Scan using orders_customer_idx on orders  (cost=0.42..8.44 rows=1 width=53)
   Index Cond: (customer = 'клієнт 777'::text)
(2 rows)
```

`Index Scan` — база знайшла рядок через індекс. Ціна індексу — місце на диску і повільніші `INSERT`/`UPDATE` (індекс теж треба оновити), тому його створюють для стовпців, за якими справді шукають. `EXPLAIN ANALYZE` виконає запит і покаже реальний час.

## Практика { #practice }

### Розібраний приклад: тижневий звіт власниці

«Для кожного району: скільки доставлених замовлень, виторг і найбільший чек; лише райони з виторгом понад 1000 грн». Спершу приберемо тестові 100 000 замовлень:

```sql
DELETE FROM orders WHERE customer LIKE 'клієнт %';

SELECT r.district,
       count(*)     AS orders,
       sum(o.total) AS revenue,
       max(o.total) AS max_check
FROM orders AS o
JOIN restaurants AS r ON r.id = o.restaurant_id
WHERE o.status = 'delivered'
GROUP BY r.district
HAVING sum(o.total) > 1000
ORDER BY revenue DESC;
```

```text
DELETE 100000
 district | orders | revenue | max_check
----------+--------+---------+-----------
 Поділ    |      5 | 2730.00 |    980.00
 Оболонь  |      2 | 2010.00 |   1250.00
(2 rows)
```

Порядок думання — той самий, що порядок виконання:

1. **звідки** дані: `orders` + `restaurants` (район живе в ресторані);
2. **які рядки**: лише доставлені — `WHERE`;
3. **групи**: за районом — `GROUP BY`;
4. **що порахувати** в кожній групі: `count`, `sum`, `max`;
5. **які групи лишити**: `HAVING`;
6. **порядок**: `ORDER BY`.

### Зміни приклад: звіт по ресторанах

Перероби звіт: групуй за **назвою ресторану**, покажи ще середній чек (`round(avg(...), 2)`) і лиши лише ресторани з принаймні двома доставленими замовленнями.

**Критерії перевірки:**

- 3 рядки: «Суші Оболонь», «Піца Поділ», «Борщ і Ко»;
- у «Суші Оболонь» середній чек `1005.00`;
- фільтр кількості — у `HAVING`, а не у `WHERE`.

??? tip "Підказка"
    `GROUP BY r.name`, `HAVING count(*) >= 2`. Кількість рахується після групування — тому не `WHERE`.

### Спробуй самостійно: таблиця відгуків

Спроєктуй і створи таблицю `reviews`: відгук належить замовленню, має оцінку від 1 до 5 і необов'язковий текст; на одне замовлення — щонайбільше один відгук.

**Критерії перевірки:**

- `reviews.order_id` — зовнішній ключ на `orders (id)`, `NOT NULL` і `UNIQUE`;
- `rating` — `CHECK (rating BETWEEN 1 AND 5)`;
- вставка з `rating = 6`, з неіснуючим `order_id` і другий відгук на те саме замовлення — усі три дають помилку;
- запит: середня оцінка для кожного ресторану (`JOIN` трьох таблиць).

### Знайди помилку { #find-bug }

Колега переписав звіт «усі кур'єри та їхні доставлені замовлення» — і Марія з нулем замовлень зникла:

```sql
SELECT c.name, count(o.id) AS orders
FROM couriers AS c
LEFT JOIN orders AS o ON o.courier_id = c.id
WHERE o.status = 'delivered'
GROUP BY c.id, c.name
ORDER BY c.name;
```

```text
  name  | orders
--------+--------
 Ігор   |      2
 Оксана |      3
 Тарас  |      2
(3 rows)
```

??? success "Відповідь"
    `LEFT JOIN` дав Марії рядок з `NULL` у всіх стовпцях `orders`. Потім `WHERE o.status = 'delivered'` порівняв `NULL` з `'delivered'` — результат не `true`, і рядок відкинуто. Фільтр, що стосується правої таблиці `LEFT JOIN`, треба ставити в `ON` (як у розділі про JOIN) — тоді він обирає **пари**, а не викидає кур'єрів.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| База даних / сервер | дані на диску, спільні для всіх клієнтів; правила — у схемі |
| Таблиця, рядок, стовпець | стовпці мають типи; `numeric` для грошей |
| `PRIMARY KEY` / `FOREIGN KEY` | унікальний номер рядка / посилання на рядок іншої таблиці |
| `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT` | обмеження не пускають погані дані |
| `INSERT … RETURNING`, `UPDATE`, `DELETE` | зміни; `UPDATE`/`DELETE` без `WHERE` — усі рядки |
| `SELECT … FROM … WHERE … ORDER BY … LIMIT` | запит описує результат; `NULL` перевіряють `IS NULL` |
| Порядок виконання | FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT |
| Агрегати, `GROUP BY`, `HAVING` | згорнути рядки; фільтр груп — `HAVING` |
| `JOIN` / `LEFT JOIN` | лише пари / усі з лівої, решта `NULL` |
| Підзапит, `WITH` | запит у запиті; іменований проміжний результат |
| Транзакція | `BEGIN` … `COMMIT` / `ROLLBACK`; ACID |
| psycopg | `with psycopg.connect(...)`; дані — лише параметрами `%s` |
| Індекс | `O(log n)` пошук за стовпцем; `EXPLAIN` показує план |

### Самоперевірка

1. Чим база даних краща за JSON-файл, коли в сервісу три оператори?
2. Навіщо в `orders` зберігати `restaurant_id`, а не назву й район ресторану?
3. Чому `WHERE courier_id = NULL` не знаходить нічого?
4. Чим `WHERE` відрізняється від `HAVING`? Чому в `WHERE` не можна написати `sum(total) > 1000`?
5. Чим `LEFT JOIN` відрізняється від `JOIN`? Коли потрібен саме `LEFT`?
6. Що станеться з першою командою транзакції, якщо друга впаде?
7. Чому `f"... WHERE customer = '{name}'"` небезпечний і як правильно?
8. Коли індекс допомагає, а коли шкодить?

??? success "Відповіді"

    1. Сервер упорядковує одночасні зміни, перевіряє обмеження для всіх клієнтів, дає запити SQL і транзакції; дані не зникають після падіння програми.
    2. Щоб не дублювати дані ресторану в кожному замовленні: зміна назви — один рядок, а не сотні (нормалізація). Назву отримують через `JOIN`.
    3. Порівняння з `NULL` дає `NULL`, а не `true`. Для «немає значення» — `IS NULL`.
    4. `WHERE` фільтрує рядки до групування, `HAVING` — групи після. На кроці `WHERE` груп ще немає, тож і суми по них — теж.
    5. `JOIN` лишає лише пари; `LEFT JOIN` — усі рядки лівої таблиці, навіть без пари (з `NULL`). Потрібен, коли в звіті мають бути й «нульові» записи: кур'єр без замовлень.
    6. Буде скасована разом з усією транзакцією: або всі команди, або жодна.
    7. Текст користувача стає частиною SQL (ін'єкція: `x' OR '1'='1`). Правильно — `%s` у запиті й значення окремим кортежем.
    8. Допомагає, коли часто шукаємо за стовпцем серед багатьох рядків. Шкодить, коли таблицю переважно змінюють, а за стовпцем майже не шукають: кожен `INSERT`/`UPDATE` оновлює і індекс.

### Що далі

- Ноутбук заняття: [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/lessons/lesson_30_sql_basics/note_lesson_30_sql_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/lessons/lesson_30_sql_basics/note_lesson_30_sql.ipynb){ .solutions-link } — встановлення PostgreSQL у Colab, запити з перевірками, ін'єкція і параметри, репозиторій.
- Наступний урок — 31, Redis: база в пам'яті для кешу, черг і лічильників — ті самі структури з уроку 29, але спільні для багатьох програм.
- У модулі 4 до бази під'єднаються веб-застосунки: ORM у Django (урок 34) і SQLAlchemy / SQLModel у FastAPI (урок 39) пишуть SQL за тебе — але читати й перевіряти його доведеться самому.

## Документація і джерела

- PostgreSQL: [Tutorial](https://www.postgresql.org/docs/current/tutorial.html) — розділи «The SQL Language» і «Advanced Features» (зовнішні ключі, транзакції); [Data Types](https://www.postgresql.org/docs/current/datatype.html); [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html); [Queries](https://www.postgresql.org/docs/current/queries.html) (JOIN, GROUP BY, `WITH`); [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html); [psql](https://www.postgresql.org/docs/current/app-psql.html)
- Встановлення: [postgresql.org/download](https://www.postgresql.org/download/); образ [postgres на Docker Hub](https://hub.docker.com/_/postgres)
- Python: [psycopg 3 — Basic module usage](https://www.psycopg.org/psycopg3/docs/basic/usage.html), [Passing parameters to SQL queries](https://www.psycopg.org/psycopg3/docs/basic/params.html) — чому не f-рядки; [Transactions management](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)
- [OWASP: SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
