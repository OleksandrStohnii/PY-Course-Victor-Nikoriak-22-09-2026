# Алгоритмічне мислення у Python — Урок 5: зміна в кафе

> Схеми до розповіді заняття [`konspekt_lesson_05_cafe_story.ipynb`](konspekt_lesson_05_cafe_story.ipynb) і книги ([урок 5](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m1/lesson_05/)). Тільки `list`, `tuple` (+ `NamedTuple`), `set` і цикл `while`. План заняття — [`agenda.md`](agenda.md).

## Завдання

Кафе закриває день. Власниця хоче знати: що замовив столик і що з того вже винесли; скільки чеків закрили, який виторг, який найбільший чек; у які дні працювали, хто з офіціантів виходив, хто з гостей приходив двічі.

**Проблема, яку вирішуємо.** Змінна з уроку 4 пам'ятає одне значення — нове затирає попереднє. Щоб відповісти на запитання власниці, програма має зберігати **багато значень** і зберігати їх **правильно**: одні дані змінюються (замовлення), інші — ні (закритий чек), для третіх важлива лише наявність (дні, гості).

**Рішення.** Три контейнери, кожен під свій тип даних, і один алгоритм проходу — `while` з індексом.

```text
дані  →  структура  →  алгоритм  →  результат
чеки     list / tuple    while + if    звіт для власниці
         NamedTuple      накопичувач
         set             поточний чемпіон
                         множина
```

---

# 1. Архітектура: які структури даних потрібні

```mermaid
flowchart TD
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    A["Зміна в кафе"] --> L1["list — замовлення столика<br>росте й змінюється весь вечір"]
    A --> L2["list — чеки дня<br>чеки додаються один за одним"]
    A --> T["tuple — закритий чек<br>(4, 860.0, 90.0) — факт"]
    A --> S["set — унікальні значення<br>дні роботи, офіціанти, гості"]

    L2 --> O["Order (NamedTuple) — один чек з іменами полів"]
    O --> F1["waiter: str"]
    O --> F2["total_bill: float"]
    O --> F3["tip: float"]
    O --> F4["day: str"]
    O --> F5["time: str"]
    O --> F6["size: int"]

    class A decision
    class L1,L2,T,S warning
    class O step
    class F1,F2,F3,F4,F5,F6 success
```

```text
orders — list (змінний)            ──► Order — tuple з іменами (незмінний)
['Тарас' 540.0 50.0 'пт' 'вечеря' 2]        .waiter .total_bill .tip .day .time .size
```

Два рівні: **набір** чеків росте протягом дня, а **кожен чек** після закриття не змінюється.

---

# 2. Список: що вміє і як обирати метод

Кожна подія вечора — один метод. Схема читається як питання «що я хочу зробити з набором?».

```mermaid
flowchart TD
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    Q{"Що зробити<br>зі списком items?"}

    Q -- створити --> C["[ ]  list(...)  [0] * n<br>items.copy()  items[:]"]
    Q -- прочитати --> R["items[0]  items[-1]<br>items[1:3]  items[::-1]<br>len  in  .count()  .index()"]
    Q -- змінити --> M["items[i] = x<br>.append(x)  .insert(i, x)<br>.extend([...])"]
    Q -- видалити --> D[".remove(x) — перше входження<br>.pop() / .pop(i) — повертає<br>del items[i]  .clear()"]
    Q -- впорядкувати --> S2[".sort()  .reverse() — на місці, None<br>sorted()  items[::-1] — новий список<br>sum  min  max"]

    D --> E1["ValueError, якщо x немає<br>→ перевір if x in items"]
    S2 --> E2["prices = prices.sort()<br>→ список став None"]

    class Q decision
    class C,R,M,D,S2 step
    class E1,E2 error
```

### Два імені — один список

```mermaid
flowchart LR
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    subgraph A1["kitchen = items, потім kitchen.append('хліб')"]
        I1(["items"]) --> L1["один список<br>['борщ', 'вареники', 'хліб']"]
        K1(["kitchen"]) --> L1
    end
    subgraph A2["backup = items.copy(), потім backup.append('узвар')"]
        I2(["items"]) --> L2["['борщ', 'вареники', 'хліб']"]
        B2(["backup"]) --> L3["окрема копія<br>['борщ', 'вареники', 'хліб', 'узвар']"]
    end
    A1 --> A2

    class I1,K1,I2,B2 decision
    class L1,L2 warning
    class L3 success
```

`b = a` для списку **не копіює** — прив'язує друге ім'я до того самого об'єкта. Копія — `.copy()`, `a[:]` або `list(a)`.

---

# 3. Кортеж і NamedTuple: життя закритого чека

```mermaid
flowchart LR
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    P["Пакування<br>receipt = 4, 860.0, 90.0<br>(кома створює кортеж)"] --> RD["Читання<br>receipt[0]  receipt[-1]  receipt[1:]<br>len  in  .count()  .index()"]
    RD --> U["Розпакування<br>table, total, tip = receipt<br>first, *rest = t<br>a, b = b, a"]
    RD --> X["receipt[1] = 600.0<br>TypeError"]
    RD --> N["Потрібно «змінити»?<br>→ створи новий кортеж<br>або order._replace(tip=70.0)"]

    class P,RD,U step
    class X error
    class N success
```

### Який контейнер для запису?

```mermaid
flowchart TD
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;

    Q1{"Важлива лише унікальність<br>і перевірка in?"} -- так --> SET["set"]
    Q1 -- ні --> Q2{"Це один запис<br>фіксованої форми?"}
    Q2 -- ні --> LIST["list"]
    Q2 -- так --> Q3{"Поля мають<br>різний сенс?"}
    Q3 -- ні --> TUP["tuple<br>(4, 860.0, 90.0)"]
    Q3 -- так --> NT["NamedTuple<br>Order(waiter, total_bill, tip, day, time, size)"]

    class Q1,Q2,Q3 decision
    class SET,LIST,TUP,NT success
```

```text
   Order( waiter , total_bill , tip , day , time , size )
            [0]       [1]       [2]   [3]   [4]    [5]
          .waiter  .total_bill  .tip  .day  .time  .size     ← імена замість індексів
   isinstance(order, tuple) → True;   Order._fields  order._asdict()  order._replace(...)
```

---

# 4. Множина: унікальність і порівняння наборів

```mermaid
flowchart TD
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    Q{"Що зробити<br>з множиною?"}
    Q -- створити --> C["{1, 2}  set()  set(items)<br>frozenset(...) — незмінна"]
    Q -- змінити --> M[".add(x)  .discard(x)<br>.remove(x) — KeyError, якщо немає<br>.pop()  .clear()  .update([...])"]
    Q -- перевірити --> R["x in s   len(s)<br>sorted(s) → впорядкований list"]
    Q -- порівняти два набори --> O["a | b  .union()<br>a &amp; b  .intersection()<br>a - b  .difference()<br>a ^ b  .symmetric_difference()<br>.issubset  .issuperset  .isdisjoint"]

    C --> E1["{} — це dict, не set"]
    R --> E2["s[0] → TypeError:<br>індексів немає"]
    O --> E3["a | [..] → TypeError<br>оператор — лише між set;<br>метод приймає список"]

    class Q decision
    class C,M,R,O step
    class E1,E2,E3 error
```

### Гості двох днів

```mermaid
flowchart LR
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    F["friday<br>Олена Богдан Марта Ігор"] --> U["f | s  об'єднання<br>Олена Богдан Марта Ігор Софія"]
    S["saturday<br>Марта Ігор Софія"] --> U
    F --> I["f &amp; s  перетин<br>Марта Ігор — постійні гості"]
    S --> I
    F --> D["f - s  різниця<br>Олена Богдан"]
    S --> D
    F --> X["f ^ s  симетрична різниця<br>Олена Богдан Софія"]
    S --> X

    class F,S warning
    class U,I,D,X success
```

```text
   list → set → sorted(list):   друзі з повторами → унікальні → впорядкований вивід
   ["кава", "чай", "кава"]  →  {"кава", "чай"}  →  ["кава", "чай"]
```

---

# 5. Алгоритми на `while`

## 5.1 Прохід з індексом — основа всього

```mermaid
flowchart TD
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;

    S["i = 0<br>початковий стан накопичувачів"] --> C{"i < len(orders)?"}
    C -- так --> G["order = orders[i]"]
    G --> B{"умова над order?"}
    B -- так --> A["дія: += / .append / .add / оновити чемпіона"]
    B -- ні --> N["нічого"]
    A --> I["i += 1"]
    N --> I
    I --> C
    C -- ні --> E["результат готовий"]

    class S step
    class C,B decision
    class G,A,N,I step
    class E success
```

Без `i += 1` цикл нескінченний; з `i <= len(...)` — `IndexError` на останньому кроці.

## 5.2 Чотири форми одного циклу

| Форма | Початковий стан | Дія в тілі | Приклад у кафе |
|---|---|---|---|
| накопичувач | `total = 0` | `total += order.total_bill` | виторг, чайові |
| лічильник | `count = 0` | `if …: count += 1` | скільки вечерь |
| фільтр | `new = []` | `if …: new.append(order)` | великі столи — у **новий** список |
| унікальні | `seen = set()` | `seen.add(order.day)` | дні роботи, офіціанти |

## 5.3 «Поточний чемпіон» — найбільший чек

```mermaid
flowchart TD
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    S["best = orders[0]  (540.0)<br>стартуємо з першого, не з нуля"]
    subgraph I1["i = 1"]
        C1{"320.0 > 540.0?"} -- ні --> K1["best 540.0"]
    end
    subgraph I2["i = 2"]
        C2{"980.0 > 540.0?"} -- так --> U2["best = 980.0 (Тарас)"]
    end
    subgraph I3["i = 3"]
        C3{"760.0 > 980.0?"} -- ні --> K3["best 980.0"]
    end
    subgraph I4["i = 4"]
        C4{"450.0 > 980.0?"} -- ні --> K4["best 980.0"]
    end
    S --> I1 --> I2 --> I3 --> I4 --> E["i = 5: 5 < 5 — ні<br>Найбільший чек 980.0 — Тарас"]

    class S step
    class C1,C2,C3,C4 warning
    class K1,K3,K4 step
    class U2,E success
```

Чому старт з `orders[0]`, а не з `0`: якби всі чеки були поверненнями (від'ємні), нуль став би «максимумом», якого немає в даних.

## 5.4 Фільтр — завжди в новий список

```mermaid
flowchart LR
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;

    O["orders<br>5 чеків"] --> W["while: if order.size >= 4"] --> L["large_tables — новий список<br>2 чеки"]
    O -.-> X["items.remove(...) під час проходу<br>індекси зсуваються, елементи пропущено"]

    class O,W step
    class L success
    class X error
```

---

# 6. Повний потік: звіт за день

```mermaid
flowchart TD
    classDef error    fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px,color:#000000;
    classDef step     fill:#cfd8dc,stroke:#37474f,stroke-width:2px,color:#000000;
    classDef decision fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000000;
    classDef success  fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000000;
    classDef warning  fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000000;

    A["Чеки зміни"] --> B["orders: list[Order]<br>5 записів"]
    B --> C["один прохід while<br>order = orders[i]"]
    C --> R1["revenue += total_bill"]
    C --> R2["tips += tip"]
    C --> R3["best = order, якщо більше"]
    C --> R4["days.add(day)"]
    C --> R5["waiters.add(waiter)"]
    R1 --> Z["Звіт<br>5 чеків · 3050.0 грн · 8.9 % чайових<br>найбільший 980.0 — Тарас<br>дні нд пт сб · офіціанти Марія Олексій Тарас"]
    R2 --> Z
    R3 --> Z
    R4 --> Z
    R5 --> Z

    class A warning
    class B,C step
    class R1,R2,R3 step
    class R4,R5 decision
    class Z success
```

---

# 7. Відповідність алгоритму і Python

| Алгоритм | Python | У звіті кафе |
|---|---|---|
| послідовність, що росте | `list` | `orders`, `items` |
| запис, що не змінюється | `tuple` / `NamedTuple` | `receipt`, `Order` |
| унікальні значення | `set` | `days`, `waiters`, гості |
| цикл | `while i < len(orders)` | прохід чеками |
| умова | `if order.total_bill > best.total_bill` | поточний чемпіон |
| накопичення | `+=`, `.append()`, `.add()` | виторг, фільтр, унікальні |
| результат | `print()` | звіт для власниці |

```text
ДАНІ → СТРУКТУРА → ЦИКЛ + УМОВА → НАКОПИЧЕННЯ → РЕЗУЛЬТАТ
```

## Питання без відповіді

«А чайові **кожного офіціанта окремо**?» — `tips` знає скільки, `waiters` знає хто, і жоден з них не зв'язує ім'я з числом. Структура «ім'я → число» — **словник**, урок 6: той самий `orders`, той самий звіт плюс один рядок.

---

# Головна ідея уроку

Програмування — це не написання коду, а **вибір структури під дані**: «цей набір росте» (`list`), «цей запис не зміниться» (`tuple`), «тут важлива лише наявність» (`set`). Алгоритм — один і той самий прохід `while` — не змінюється, коли чеків стає 244 замість 5.
