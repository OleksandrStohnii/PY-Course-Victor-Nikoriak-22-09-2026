# Бонус. Pandas: аналіз даних, графіки і Dash

Python сьогодні — насамперед **data science**: більшість вакансій і задач, де його обирають, — це аналіз даних, графіки, дашборди й машинне навчання. Тому модуль 3 відкривається бонусним уроком (поза нумерацією 1–52): до того як класти дані в базу (уроки 30–31), навчимося їх **розуміти**.

Урок — на справжніх даних про Україну: ціни на продукти WFP за 2014–2026 роки (112 тис. записів по 27 ринках — обласних центрах і Києву), курс гривні, зовнішній борг, показники Світового банку, зарплати Держстату, щоденна робота портів і ціни у 71 країні. Стартовий код: три ноутбуки й Dash-застосунок; до них — четвертий ноутбук на додаткових датасетах.

!!! note "📖 Історія уроку"
    **Ліна** — молода аналітикиня благодійного фонду **«Хлібний кошик»**, який розвозить продуктові набори по Україні. У понеділок керівниця фонду **Марта Петрівна** ставить їй два питання:

    > «Що сталося з цінами на їжу в Україні за ці роки? І куди везти допомогу першою?»

    У Марти Петрівни є п'ять хвилин між дзвінками. Таблиця на 112 тисяч рядків їй не потрібна — їй потрібен **висновок**, якому можна довіряти, і **дія**. Ліна має файли WFP, курс гривні й волонтера **Тараса**, який приносить «сирі» таблиці з сюрпризами.

    Весь урок — це шлях Ліни від питання до відповіді. Кожен ноутбук — розділ її історії.

Ідея сторітелінгу взята з книги Cole Nussbaumer Knaflic *«Storytelling with Data: Let's Practice!»* (SWD). Спершу аналітик **досліджує** дані (exploratory: перебирає сотню «устриць», щоб знайти дві «перлини»), потім **пояснює** (explanatory: показує аудиторії лише перлини). Ноутбуки 1–4 — дослідження, дашборд і фінальний висновок для Марти Петрівни — пояснення. Сюжет уроку побудовано за **наративною дугою**:

```mermaid
flowchart LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;

    P["сюжет<br>питання Марти,<br>файли WFP<br>(ноутбук 1)"] --> T["напруга<br>National Average<br>зникає після 2017,<br>одиниці різні"]
    T --> C["кульмінація<br>олія ×6, злам 2022,<br>курс тягне ціни<br>(ноутбуки 2–3)"]
    C --> F["спад<br>зарплати, порти,<br>світ — перевіряємо<br>(ноутбук 4)"]
    F --> R["розв'язка<br>дашборд і Big Idea<br>для Марти<br>(Dash)"]

    class P step
    class T warning
    class C error
    class F step
    class R success
```

| Крок | Матеріал | Що вчимо |
|---|---|---|
| 1 | [`note_bonus_pandas_foundation.ipynb`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_pandas_foundation.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_pandas_foundation.ipynb) | DataFrame, типи й пам'ять, `read_csv`, `loc`/`query`, `groupby`, дати й `resample`, `merge`/`concat` |
| 2 | [`note_bonus_matplotlib.ipynb`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_matplotlib.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_matplotlib.ipynb) | Figure і Axes, line / bar / histogram, subplots, стилі |
| 3 | [`note_bonus_seaborn_plotly.ipynb`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_seaborn_plotly.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_seaborn_plotly.ipynb) | boxplot, heatmap кореляцій, pairplot «курс ↔ ціни», злам 2022 року, інтерактивний Plotly |
| 4 | [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_extra_datasets_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/note_bonus_extra_datasets.ipynb){ .solutions-link } | «брудний» CSV Держстату, зарплата проти хліба, `pivot`, порти й `resample`, ціни у світі |
| 5 | [`dash_API/`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_3/bonus/pandas_data_analysis/dash_API) | дашборд на Dash: вкладка «📖 Історія даних» + 7 аналітичних вкладок, фільтри, карта ринків, кореляції |

Теорія — у двох довідниках: [**аналіз даних: патерни й мислення**](pandas/data_analytics.md) (рівні аналітики, «дані = інформація + шум», вісім патернів — агрегація, фільтрація, групування, порівняння, час, простір, зв'язки, розподіл — повний цикл, типові помилки, метрики) і [**архітектура Dash**](pandas/dash_architecture.md). На цій сторінці — маршрут уроку й ключові результати на справжніх даних.

**Що потрібно з попередніх уроків:** списки й словники (М1), функції та `lambda` (уроки 8, 19), класи й методи (19–23), файли й CSV (14), модулі й pip (12).

**Після уроку ти зможеш:**

- завантажити CSV у pandas, оглянути (`info`, `describe`) і відфільтрувати дані;
- групувати й агрегувати (`groupby` → Split-Apply-Combine), працювати з датами (`resample`);
- об'єднувати джерела (`merge`, `concat`) і перетворювати форму таблиці (`melt`, `pivot`);
- очистити «брудний» файл: кодування, роздільники, пропуски;
- побудувати графік у matplotlib, seaborn і Plotly й обрати, яку бібліотеку для чого;
- перетворити графік на історію: заголовок-висновок, сірий контекст і один акцентний колір, Big Idea одним реченням;
- запустити й прочитати Dash-застосунок: layout, callbacks, шар даних.

!!! info "Звідки дані"
    Файли в [`data/`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_3/bonus/pandas_data_analysis/data) завантажив викладач (вересень 2026): **HDX** (Humanitarian Data Exchange) — ціни й ринки WFP, курси FAO, показники Світового банку, активність портів; **data.gov.ua** — зарплати Держстату. Ліцензії й описи — у [`data/README.md`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_3/bonus/pandas_data_analysis/data/README.md). У Colab перша клітинка кожного ноутбука завантажує папку уроку разом із даними.

## Пригадай

1. Як прочитати CSV модулем `csv` і що він повертає для кожного рядка (урок 15)?
2. Як порахувати середнє значень словника «місто → ціна» без pandas?
3. Що робить `sorted(items, key=lambda x: x[1], reverse=True)` (урок 19)?

??? success "Відповіді"

    1. `csv.reader` → список рядків-рядків; `csv.DictReader` → словник на рядок. Усі значення — рядки, числа доводиться перетворювати самому.
    2. `sum(prices.values()) / len(prices)`. На 112 тис. записах і десятках полів таких циклів стає багато — pandas робить це однією операцією над стовпцем.
    3. Сортує пари за другим елементом, від більшого до меншого — у pandas це `sort_values(ascending=False)`.

## Дані уроку { #data }

!!! note "📖 Історія"
    Перш ніж щось рахувати, Ліна відкриває папку `data/` і робить те, що робить будь-який детектив на місці події: **оглядає, що є**. Скільки файлів, скільки рядків, що з чого. Питання Марти Петрівни — про ціни, але щоб відповісти «чому», знадобляться й курс, і порти, і зарплати.

```python
import os

import pandas as pd

DATA_DIR = "data"
files = {
    "wfp_food_prices_ukr.csv": "ціни WFP, Україна",
    "wfp_markets_ukr.csv": "ринки WFP з координатами",
    "exchange-rates_ukr.csv": "курс UAH/USD (FAO)",
    "external-debt_ukr.csv": "зовнішній борг (Світовий банк)",
    "poverty_ukr.csv": "бідність і соціальні показники (Світовий банк)",
    "global-market-monitor.csv": "Global Market Monitor (WFP)",
    "climate-change_ukr.csv": "показники Світового банку",
    "ukraine-daily-port-activity-data-and-shipment-estimates.csv": "активність портів",
    "wfp_food_prices_global_2026.csv": "ціни WFP, 71 країна, 2026",
}
for name, what in files.items():
    size_mb = os.path.getsize(os.path.join(DATA_DIR, name)) / 1e6
    rows = sum(1 for _ in open(os.path.join(DATA_DIR, name), encoding="utf-8")) - 1
    print(f"{what:48} {rows:>8,} рядків  {size_mb:5.1f} МБ")
```

```text
ціни WFP, Україна                                 112,259 рядків   14.1 МБ
ринки WFP з координатами                              268 рядків    0.0 МБ
курс UAH/USD (FAO)                                    431 рядків    0.1 МБ
зовнішній борг (Світовий банк)                      1,650 рядків    0.2 МБ
бідність і соціальні показники (Світовий банк)        382 рядків    0.0 МБ
Global Market Monitor (WFP)                        11,957 рядків    3.0 МБ
показники Світового банку                           1,405 рядків    0.1 МБ
активність портів                                  42,288 рядків    4.8 МБ
ціни WFP, 71 країна, 2026                         245,288 рядків   32.0 МБ
```

Плюс таблиця зарплат Держстату (`101-…-pr.csv` і `.xlsx`) — з нею працюємо в ноутбуці 4, бо вона «брудна».

## Конвеєр аналітика

Кожен ноутбук — крок одного процесу: від сирого файлу до рішення. Зверни увагу: конвеєр починається не з `read_csv`, а з **питання** — і закінчується не графіком, а **рішенням**. За SWD, спершу з'ясуй контекст: *хто* аудиторія (Марта Петрівна), *що* їй треба вирішити (куди везти набори), *як* ти їй це покажеш (одна сторінка дашборду, 3 хвилини розмови). Детально, з прикладами кожного кроку — у довіднику [«Аналіз даних»](pandas/data_analytics.md) (розділи «Повний цикл аналізу даних» і «Як мислить аналітик»).

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    Q["питання<br>як війна змінила ціни?"] --> L["завантажити<br>read_csv, типи"]
    L --> C["очистити<br>пропуски, кодування, одиниці"]
    C --> T["перетворити<br>filter, groupby, merge, resample"]
    T --> V["візуалізувати<br>matplotlib, seaborn, Plotly"]
    V --> D["дашборд<br>Dash: фільтри й вкладки"]
    D --> R["рішення<br>висновок з обмеженнями"]
    R -.-> Q

    class Q decision
    class L,T step
    class C warning
    class V,D step
    class R success
```

Найдовший крок у реальному житті — **очищення**. У цьому уроці воно трапилось не у вправі, а в самих даних — див. наступний розділ.

## Ноутбук 1. pandas { #pandas }

!!! note "📖 Історія · сюжет"
    Перше, що хоче знати Марта Петрівна, — найпростіше: «Цукор цього місяця дорожчий, ніж минулого?» Ліна могла б відкрити CSV в Excel і рахувати середнє калькулятором по кожному місту. Але міст 27, товарів десятки, місяців — понад сто. Їй потрібен інструмент, який рахує «по групах» однією командою.

Ноутбук починається з моделі: **DataFrame** — таблиця, де кожен стовпець — `Series` одного типу, а рядки вирівняні за індексом. Далі — пам'ять і типи (`category`, PyArrow), читання CSV, огляд, фільтрація, групування, дати, об'єднання. Головна операція аналітика — **Split-Apply-Combine**: розбити дані на групи, застосувати функцію до кожної, зібрати результат.

Ось вона в роботі — середня ціна цукру по чотирьох обласних центрах на дві дати:

```python
food = pd.read_csv(os.path.join(DATA_DIR, "wfp_food_prices_ukr.csv"), parse_dates=["date"])

sample = food.query(
    "commodity == 'Sugar' and unit == 'KG' and currency == 'UAH' "
    "and market in ['Kharkiv', 'Kyiv city', 'Lviv', 'Odesa'] "
    "and date in @dates",
    local_dict={"dates": pd.to_datetime(["2026-07-15", "2026-08-15"])},
)[["date", "market", "price"]]
print(sample.sort_values(["date", "market"]).to_string(index=False))
print(sample.groupby("date")["price"].mean().round(2))
```

```text
      date    market  price
2026-07-15   Kharkiv  29.08
2026-07-15 Kyiv city  31.38
2026-07-15      Lviv  30.30
2026-07-15     Odesa  30.09
2026-08-15   Kharkiv  29.44
2026-08-15 Kyiv city  32.81
2026-08-15      Lviv  31.37
2026-08-15     Odesa  30.72
date
2026-07-15    30.21
2026-08-15    31.08
Name: price, dtype: float64
```

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph SPLIT ["1. split: groupby('date') — дві групи"]
        direction LR
        G1["2026-07-15<br>29.08 · 31.38 · 30.30 · 30.09"]
        G2["2026-08-15<br>29.44 · 32.81 · 31.37 · 30.72"]
    end
    subgraph APPLY ["2. apply: mean() у кожній групі"]
        direction LR
        A1["120.85 / 4<br>= 30.21"]
        A2["124.34 / 4<br>= 31.08"]
    end
    subgraph COMBINE ["3. combine: одна Series з індексом date"]
        direction LR
        C1["2026-07-15 → 30.21<br>2026-08-15 → 31.08"]
    end
    SPLIT --> APPLY --> COMBINE

    class G1,G2 step
    class A1,A2 warning
    class C1 success
```

`groupby` — ліниве: поки не викликано агрегацію (`mean`, `sum`, `agg`), він лише запам'ятовує, як розбити дані. Докладно — у ноутбуці (розділ 7) і в довіднику, [патерн «Групування»](pandas/data_analytics.md#33-grouping).

!!! tip "Як Ліна сказала б це Марті Петрівні"
    Не «середнє `price` по `date` дорівнює 30.21 і 31.08», а: **«Цукор за місяць подорожчав у середньому на 87 копійок — з 30,21 до 31,08 грн/кг; найдорожчий — у Києві».** Число з одиницею, напрямок і одна деталь, яку можна запам'ятати.

### «National Average» після 2017 року

!!! note "📖 Історія · напруга"
    Окрилена першим успіхом, Ліна хоче показати «ціни по Україні» за всі роки — WFP публікує їх як ринок **National Average**. Вона будує графік… і лінія обривається на 2017 році. Саме тоді, коли найцікавіше (2022) ще попереду. Це перший сюжетний поворот: **дані не такі, якими здаються**.

«Ціну по Україні» WFP публікує як ринок **National Average** — це рядки без області, `admin1.isna()`. Подивимось, які роки вони покривають:

```python
national = food[food["admin1"].isna()]
regional = food[food["admin1"].notna()]
print("National Average:", national["date"].min().date(), "—", national["date"].max().date(), f"({len(national)} рядків)")
print("регіональні ринки:", regional["date"].min().date(), "—", regional["date"].max().date(), f"({len(regional):,} рядків)")
print("Bread (wheat) на рівні країни:", (national["commodity"] == "Bread (wheat)").sum())
```

```text
National Average: 2014-03-15 — 2017-12-15 (986 рядків)
регіональні ринки: 2014-03-15 — 2026-08-15 (111,273 рядків)
Bread (wheat) на рівні країни: 0
```

З 2018 року WFP публікує ціни **лише по регіональних ринках**. Графік по рядках National Average обривався б на 2017 році — і «зламу 2022» просто не було б видно.

Тому в ноутбуках 1–3 одразу після завантаження національне середнє дораховується як **просте середнє по всіх ринках** — тим самим Split-Apply-Combine:

```python title="клітинка «🆕 National Average» у ноутбуках 1–3"
def add_national_average(df):
    official_dates = set(df.loc[df["admin1"].isna(), "date"])       # де WFP сам дав National Average
    regional = df[df["admin1"].notna() & ~df["date"].isin(official_dates)]
    computed = (
        regional
        .groupby(["date", "category", "commodity", "unit", "currency"], as_index=False)["price"]
        .mean()
        .assign(market="National Average (розрахунок)")
    )
    return pd.concat([df, computed], ignore_index=True)
```

```python
def add_national_average(df):
    official_dates = set(df.loc[df["admin1"].isna(), "date"])
    regional = df[df["admin1"].notna() & ~df["date"].isin(official_dates)]
    computed = (
        regional
        .groupby(["date", "category", "commodity", "unit", "currency"], as_index=False)["price"]
        .mean()
        .assign(market="National Average (розрахунок)")
    )
    return pd.concat([df, computed], ignore_index=True)


food = add_national_average(food)
national = food[food["admin1"].isna()]
print("National Average:", national["date"].min().date(), "—", national["date"].max().date())
print(national.groupby("market").size().to_dict())
```

```text
National Average: 2014-03-15 — 2026-08-15
{'National Average': 986, 'National Average (розрахунок)': 3787}
```

!!! warning "Обмеження розрахунку"
    **Одиниці.** Офіційний «National Average» житнього хліба (2014–2017) — ціна **буханки** (`Loaf`), регіональні ринки з 2018 — ціна **кілограма** (`KG`). Графіки хліба в ноутбуках, що беруть `commodity.str.contains('Bread')`, після 2017 року порівнюють різні одиниці й різні сорти — перш ніж робити висновок, фільтруй за `unit`. Так само молоко й сметана трапляються і в `L`, і в `KG`.

    **Вага ринків.** Просте середнє по ринках — не те саме, що офіційний індекс: Київ і Чернівці важать однаково, а склад ринків змінюється — для цукру це 27 ринків у 2014, 25 у 2015–2022 і 23 з 2023 року (ряди окупованих і прифронтових областей обриваються). Для навчального аналізу динаміки цього досить; для висновків «на рівні країни» — зважуй ринки або бери дані Держстату. Це і є «Pattern → Модель → Обмеження» з [довідника](pandas/data_analytics.md#24-pattern).

!!! tip "Висновок розділу"
    **Big Idea для себе (не для Марти):** «Ряд "по Україні" після 2017 року — наш розрахунок, а не офіційне число; висновки по країні роблю з цією приміткою». Аналітик, який знає межі своїх даних, викликає довіру — а довіра в історії важить більше за красивий графік.

## Ноутбук 2. matplotlib { #matplotlib }

!!! note "📖 Історія · кульмінація"
    Тепер у Ліни є безперервний ряд 2014–2026. Марта Петрівна питає: «Що подорожчало найбільше?» Порівняти картоплю (грн/кг) з олією (грн/л) напряму не можна — різні одиниці. Ліна згадує простий прийом із життя: ніхто не порівнює зарплату 2014 і 2026 років у гривнях — кажуть «виросла у 3 рази». Так само й тут: **індекс, 2014 = 100**.

Matplotlib — «низькорівневий рушій»: **Figure** (полотно) містить одну чи кілька **Axes** (систем координат), і все малюється методами `ax.plot`, `ax.bar`, `ax.hist`. Ноутбук проходить line, bar, histogram, subplots і стилі на тих самих цінах.

Приклад з уроку: як змінились ціни трьох базових продуктів відносно 2014 року. Ціни мають різні одиниці (кг, л), тож порівнюємо **індекси** (2014 = 100) — одна вісь, одна шкала. Товари обрано з **незмінною одиницею** за всі роки (про хліб — нижче):

```python
basket = {"Potatoes": "Картопля", "Oil (sunflower)": "Олія соняшникова", "Meat (pork)": "Свинина"}
yearly = (
    food.query("admin1.isna() and currency == 'UAH' and commodity in @basket")
    .assign(рік=lambda d: d["date"].dt.year, місяць=lambda d: d["date"].dt.month)
    .groupby(["commodity", "рік"])
    .agg(ціна=("price", "mean"), місяців=("місяць", "nunique"))
    .query("місяців >= 6")                                    # 2018: лише грудень — пропускаємо
    .reset_index()
)
yearly["індекс"] = yearly["ціна"] / yearly.groupby("commodity")["ціна"].transform("first") * 100
print(yearly.pivot(index="рік", columns="commodity", values="індекс").round(0).to_string())
```

```text
commodity  Meat (pork)  Oil (sunflower)  Potatoes
рік
2014             100.0            100.0     100.0
2015             125.0            179.0     101.0
2016             123.0            203.0     113.0
2017             162.0            213.0     146.0
2019             213.0            225.0     269.0
2020             212.0            231.0     246.0
2021             215.0            380.0     216.0
2022             264.0            435.0     228.0
2023             339.0            419.0     240.0
2024             323.0            397.0     494.0
2025             408.0            523.0     513.0
2026             412.0            608.0     380.0
```

```python title="графік (у ноутбуці — plt.show(), тут — збережено в PNG)"
import matplotlib.pyplot as plt

colors = {"Potatoes": "#2a78d6", "Oil (sunflower)": "#eb6834", "Meat (pork)": "#1baf7a"}
fig, ax = plt.subplots(figsize=(10, 4.5))
for commodity, group in yearly.groupby("commodity"):
    ax.plot(group["рік"], group["індекс"], color=colors[commodity], linewidth=2, marker="o", markersize=5,
            label=basket[commodity])
    ax.annotate(basket[commodity], (group["рік"].iloc[-1], group["індекс"].iloc[-1]),
                xytext=(6, 0), textcoords="offset points", va="center", fontsize=9, color="#52514e")
ax.axvline(2022, color="#9e9e9e", linestyle="--", linewidth=1)
ax.set_title("Ціни базових продуктів в Україні, 2014 = 100 (середнє за рік, WFP)")
ax.set_ylabel("індекс, 2014 = 100")
ax.legend(frameon=False)
ax.grid(axis="y", alpha=0.3)
fig.tight_layout()
```

![Індекс цін на картоплю, олію соняшникову і свинину в Україні 2014–2026, 2014 = 100](img/bonus_pandas_price_index.png)

За 2014–2026 олія подорожчала у 6 разів, свинина — у 4, картопля — у 3,8 (у 2025 — у 5,1: 2026 рік ще неповний, а картопля дешевшає влітку). Прискорення видно після 2021–2022, але різна швидкість — це вже питання для діагностичної аналітики («чому?»), не для графіка. Пропуск 2018 — не збій графіка: того року в даних лише грудень, і фільтр `місяців >= 6` його прибрав.

### Від графіка до історії: принципи SWD { #swd }

Графік вище — **дослідницький**: три кольори однакової яскравості, назва описує, *що* показано, а не *що з цього випливає*. Ліні він допоміг знайти перлину. Але Марта Петрівна, глянувши на нього, спитає: «І що?». Книга SWD пропонує кілька кроків:

| Принцип SWD | Що робимо з графіком |
|---|---|
| обери ефективний візуал | час → лінія; різні одиниці → індекс на одній осі (не дві осі) |
| прибери зайве | без рамки зверху й справа, без легенди — підписи прямо біля ліній |
| сфокусуй увагу | один акцентний колір для головного, решта — сірий контекст |
| думай як дизайнер | заголовок-висновок (takeaway title) замість опису |

Заголовок рахуємо з даних, а не пишемо «з голови» — тоді він не збреше, коли дані оновляться:

```python
last = yearly[yearly["рік"] == yearly["рік"].max()].set_index("commodity")["індекс"]
leader = last.idxmax()                                  # товар, що подорожчав найбільше
title = f"{basket[leader]} подорожчала у {last[leader] / 100:.0f} разів з 2014 року — найбільше в кошику"
print(title)

fig, ax = plt.subplots(figsize=(10, 4.5))
for commodity, group in yearly.groupby("commodity"):
    is_hero = commodity == leader
    ax.plot(group["рік"], group["індекс"],
            color="#eb6834" if is_hero else "#b0b0b0",      # один акцент, решта — сірий контекст
            linewidth=3 if is_hero else 1.5)
    ax.annotate(f"{basket[commodity]}: {group['індекс'].iloc[-1]:.0f}",
                (group["рік"].iloc[-1], group["індекс"].iloc[-1]), xytext=(6, 0),
                textcoords="offset points", va="center",
                color="#eb6834" if is_hero else "#808080")
ax.axvline(2022, color="#d0d0d0", linestyle="--", linewidth=1)
ax.set_title(title, loc="left")                          # заголовок-висновок, а не опис
ax.spines[["top", "right"]].set_visible(False)           # прибираємо зайве
ax.set_ylabel("індекс, 2014 = 100")
fig.tight_layout()
```

```text
Олія соняшникова подорожчала у 6 разів з 2014 року — найбільше в кошику
```

![Індекс цін 2014–2026: олія соняшникова виділена помаранчевим, картопля і свинина — сірим; заголовок-висновок](img/bonus_pandas_price_index_swd.png)

Ті самі дані, але тепер око спершу падає на помаранчеву лінію, а заголовок уже каже, що з нею не так. Сірі лінії не зникли — вони дають контекст: «олія — не єдина, що дорожчала, але лідер».

??? question "Перевір себе"
    Марта Петрівна хоче зрозуміти, **коли** саме олія відірвалась від інших. Що змінити в графіку, не додаючи нових кольорів?

    ??? success "Відповідь"
        Підписати один момент прямо на графіку (`ax.annotate`) — наприклад, стрибок 2020 → 2021 (індекс 231 → 380) — і згадати його в заголовку. Новий колір лише розпорошить увагу; текстова анотація веде око туди, куди треба.

## Ноутбук 3. seaborn і Plotly { #seaborn-plotly }

!!! note "📖 Історія · «а чому?»"
    Марта Петрівна дивиться на помаранчеву лінію олії й ставить головне питання: «А чому?» Тарас із порога: «Та це все курс долара!» Звучить переконливо — але Ліна вже знає, що «звучить переконливо» і «підтверджено даними» — різні речі. Час перейти від описової аналітики («що сталося») до діагностичної («чому»).

Три рівні візуалізації: **matplotlib** — повний контроль, **seaborn** — статистика й стиль одним викликом (boxplot, heatmap, pairplot), **Plotly** — інтерактивність (hover, zoom, RangeSlider). Центральна частина ноутбука — pairplot «ціни ↔ курс UAH/USD» до і після 2022 року. Ось кореляція, яку він показує, на свіжих даних:

```python
rates = pd.read_csv(os.path.join(DATA_DIR, "exchange-rates_ukr.csv"), usecols=["StartDate", "Value"], parse_dates=["StartDate"])
rates = rates.rename(columns={"StartDate": "date", "Value": "uah_per_usd"})
rates["month"] = rates["date"].dt.to_period("M")

monthly = (
    food.query("admin1.isna() and currency == 'UAH' and commodity in ['Meat (pork)', 'Oil (sunflower)']")
    .assign(month=lambda d: d["date"].dt.to_period("M"))
    .pivot_table(index="month", columns="commodity", values="price")
    .reset_index()
    .merge(rates[["month", "uah_per_usd"]], on="month", how="inner")
)
monthly["епоха"] = monthly["month"].dt.year.map(lambda y: "до 2022" if y < 2022 else "з 2022")
corr = {epoch: part[["Meat (pork)", "Oil (sunflower)"]].corrwith(part["uah_per_usd"])
        for epoch, part in monthly.groupby("епоха")}
print(pd.DataFrame(corr).T.round(2))
print(monthly.groupby("епоха").size().to_dict(), "місяців")
```

```text
         Meat (pork)  Oil (sunflower)
до 2022         0.66             0.68
з 2022          0.78             0.43
{'до 2022': 94, 'з 2022': 57} місяців
```

Після 2022 року ціна свинини ходить за курсом тісніше (0,66 → 0,78), а олії — слабше (0,68 → 0,43): на олію сильніше вплинули власні фактори ринку. Кореляція — не причинність: і ціни, і курс ростуть з часом, тож частина зв'язку — спільний тренд (див. довідник, [«Relationship Analysis»](pandas/data_analytics.md#37-relationship-analysis)).

!!! tip "Висновок розділу"
    Відповідь Тарасу: **«Курс пояснює свинину краще, ніж олію: після 2022 року свинина ходить за доларом тісніше (r = 0,78), а олія — слабше (0,43). Тож "це все курс" — правда лише наполовину».** Хороша історія з даними не підтверджує першу гіпотезу, яка спала на думку, а перевіряє її.

## Ноутбук 4. Додаткові датасети { #extra }

!!! note "📖 Історія · перевірка з різних боків"
    Перед зустріччю з Мартою Петрівною Ліна ставить собі незручні питання. «Олія ×6» — це багато чи мало, якщо зарплати теж росли? Чи справді 2022 рік — злам, чи лише збіг? Чи дешева їжа в Україні порівняно зі світом? Тарас приносить нові файли — і кожен зі своєю «хворобою».

Чотири нових джерела — кожне зі своєю «хворобою» і своїм прийомом pandas:

| Датасет | Проблема | Прийом | Результат на справжніх даних |
|---|---|---|---|
| зарплати Держстату, 2000–2018 | cp1251, `;` навколо рядка, тисячі через пробіл, `…` і `х` | `encoding`, `str.split`, `melt`, `to_numeric(errors="coerce")` | Київ 2018 — 13 542 грн, у 1,94 раза більше за Тернопільську |
| зарплата проти хліба | два джерела, різна частота | `groupby` за роком + `merge` | 2014 — 619 буханок на зарплату, 2015 — 458, 2017 — 595 |
| показники Світового банку | «довгий» формат (показник, рік, значення) | `pivot` | населення: пік 52,35 млн у 1993, 37,86 млн у 2024 |
| порти, щоденно 2019–2026 | 42 тис. рядків по 16 портах | `resample("YE")`, `resample("ME")` | експорт 2022 — на 63% менше за 2021 |
| ціни WFP у 71 країні, 32 МБ | великий файл | `usecols`, фільтр, `median`, рейтинг | цукор: Україна — 4-те місце з 40 за дешевизною ($0,66/кг) |

Дані портів за місяцями — тим самим `resample`:

![Експорт через порти України, млн т на місяць, 2019–2026, з позначкою 24.02.2022](img/bonus_pandas_ports_export.png)

Остання точка — березень 2026 року неповний: дані закінчуються 27.03.

!!! tip "Висновок розділу"
    Три незалежні джерела розповідають одну історію: експорт через порти у 2022 впав на 63%, ціни після 2022 прискорились, а купівельна сила зарплати «в буханках» коливається роками (619 → 458 → 595). Коли різні дані сходяться в одному висновку, історії можна довіряти більше, ніж будь-якому окремому графіку.

## Dash-застосунок { #architecture }

!!! note "📖 Історія · розв'язка"
    Ноутбуки — робочий стіл Ліни: там безлад, спроби, глухі кути. Марті Петрівні їх не покажеш. Їй потрібен **один екран**, де історія розказана від початку до кінця, а за потреби можна «копнути глибше» — вибрати свій товар чи область. Це і є дашборд: explanatory-шар поверх exploratory-роботи.

**Dash** — фреймворк для аналітичних вебзастосунків на Python: інтерфейс описується Python-об'єктами (`html.Div`, `dcc.Graph`, `dcc.Dropdown`), а реакція на дії користувача — **callbacks**: функції, які Dash викликає, коли змінюється вхід. Під капотом — Flask (сервер) і React (браузер). Теорія — у довіднику [«Архітектура Dash»](pandas/dash_architecture.md).

Запуск:

```text
cd module_3/bonus/pandas_data_analysis
pip install -r requirements.txt
cd dash_API
python app.py            # → http://localhost:8055
```

Структура `dash_API/`:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    APP["app.py<br>Dash(), layout, запуск"] --> LAY["layouts/<br>main_layout, sidebar, tabs"]
    APP --> CB["callbacks/tabs_callbacks.py<br>3 callbacks"]
    CB --> REG["data_utils/registry.py<br>get_dataset: кеш lru_cache"]
    LAY --> REG
    REG --> LOAD["data_utils/loader.py<br>read_csv, перевірка колонок"]
    CB --> PRE["data_utils/preprocessing.py<br>фільтри, групування, кореляція"]
    LOAD --> DATA[("data/*.csv")]
    CFG["config.py<br>шляхи, порт, стиль"] -.-> APP
    CFG -.-> LOAD

    class APP decision
    class LAY,LOAD,PRE step
    class CB warning
    class REG success
    class DATA step
    class CFG step
```

- **Дані завантажуються один раз** — `get_dataset` кешує DataFrame (`functools.lru_cache`), callbacks лише фільтрують і групують (anti-pattern «читати CSV у callback» розібрано в довіднику, розділ «Data Flow у Dash»).
- **Три callbacks на весь застосунок:** `update_unit_options` (товар → доступні одиниці), `render_tab` (активна вкладка + усі фільтри → вміст вкладки) і в `callbacks/story.py` — кнопки «Перевір сам» в історії, що перемикають вкладку.

```mermaid
sequenceDiagram
    participant U as користувач
    participant B as браузер (React)
    participant S as сервер Dash (Flask)
    participant R as render_tab
    participant P as preprocessing
    U->>B: вкладка «Ціни на товари», товар Sugar
    B->>S: POST /_dash-update-component (tabs, фільтри)
    S->>R: render_tab("food", "Sugar", "KG", …)
    R->>P: get_food_timeseries(df, …)
    P-->>R: DataFrame по місяцях
    R-->>S: html.Div з dcc.Graph
    S-->>B: JSON компонентів
    B-->>U: графік
```

Перша вкладка — **«📖 Історія даних»** (`value="story"`): дашборд відкривається не фільтрами, а розповіддю. Угорі — Big Idea для Марти Петрівни, далі чотири кроки наративної дуги (сюжет → наростання → кульмінація → розв'язка): 4 графіки, у кожного — **заголовок-висновок**, порахований із даних, стиль SWD (сірий контекст, один акцентний колір, без легенди й сітки) і блок «Так що?». Наприкінці — рекомендації Ліни й кнопки на аналітичні вкладки, де кожен висновок можна перевірити самому. Решта вкладок — **дослідницькі**: там користувач сам обирає товар, область і період.

Вкладка «Ціни на товари» — медіана й середнє по всіх ринках, 2014–2026:

![Dash, вкладка «Ціни на товари»: динаміка ціни цукру 2014–2026 і медіанна ціна по областях](img/bonus_pandas_dash_food.png)

Вкладка «Ціни та курс валюти» — ціна товару поруч із курсом UAH/USD і коефіцієнт кореляції:

![Dash, вкладка «Ціни та курс валюти»: цукор проти курсу UAH/USD, r = 0,863](img/bonus_pandas_dash_correlation.png)

!!! tip "Big Idea для Марти Петрівни"
    Після всіх ноутбуків Ліна вміщує відповідь в одне речення — **позиція + що на кону**:

    > «З 2022 року базові продукти дорожчають швидше, ніж до війни (олія — у 6 разів від 2014), і ціни різняться між областями — тож набори варто везти насамперед туди, де ціна кошика росте найшвидше, а склад набору — зсунути в бік найдорожчих товарів.»

    Які саме області — порахуєш сам у завданні [«Спробуй самостійно»](#practice): це той шматок історії, якого Ліні ще бракує.

    Перевірка SWD: чи зможе Ліна розповісти це за **3 хвилини** без слайдів? Якщо так — історія готова. Якщо ні — ще рано малювати дашборд.

## Практика { #practice }

### Розібраний приклад: індекс замість двох осей

!!! note "📖 Історія"
    Тарас показує Марті Петрівні вкладку «Ціни та курс валюти»: «Бачите, лінії йдуть разом!» Ліна мовчки змінює масштаб правої осі — і лінії розходяться. Ті самі дані, протилежне враження. Час показати чесніший спосіб.

На вкладці «Ціни та курс валюти» дашборд малює ціну й курс на **двох вертикальних осях**. Такий графік легко «підкрутити»: зсунь масштаб однієї осі — і лінії зійдуться чи розійдуться, хоча дані ті самі. Чесніша альтернатива — звести обидва ряди до спільної бази, як у ноутбуці 2: індекс, 2014 = 100.

```python
sugar = (
    food.query("commodity == 'Sugar' and unit == 'KG' and currency == 'UAH' and admin1.isna()")
    .assign(month=lambda d: d["date"].dt.to_period("M"))
    .groupby("month", as_index=False)["price"].mean()
    .merge(rates[["month", "uah_per_usd"]], on="month", how="inner")
)
base = sugar.iloc[0]
sugar["ціна, індекс"] = sugar["price"] / base["price"] * 100
sugar["курс, індекс"] = sugar["uah_per_usd"] / base["uah_per_usd"] * 100
print("база:", base["month"], f"| ціна {base['price']:.2f} грн/кг | курс {base['uah_per_usd']:.2f}")
print(sugar.iloc[[0, -1]][["month", "ціна, індекс", "курс, індекс"]].round({"ціна, індекс": 0, "курс, індекс": 0}).to_string(index=False))
```

```text
база: 2014-03 | ціна 8.90 грн/кг | курс 9.92
  month  ціна, індекс  курс, індекс
2014-03         100.0         100.0
2026-01         325.0         430.0
```

Тепер обидва ряди — на одній шкалі «у скільки разів від старту», і висновок не залежить від того, як налаштовано осі. Заголовок-висновок для такого графіка: **«Цукор подорожчав у 3,25 раза, а долар — у 4,3: ціна цукру росла повільніше за курс»**.

### Зміни приклад

1. У `yearly` (ноутбук 2) заміни кошик на `Milk`, `Eggs`, `Sugar`. Пам'ятай про одиниці: `Eggs` продаються десятками — перевір `unit` перед усередненням.
2. Поріг `місяців >= 6` прибирає 2018 рік (лише грудень). Що покаже графік, якщо поріг прибрати? Чому це неправда?

### Спробуй самостійно

Марта Петрівна чекає останній шматок історії: **куди везти набори першими**. Порахуй, як змінилась **ціна хліба в областях** між 2021 і 2025 роками: середня ціна `Bread (first grade flour)` за рік у кожній області (`admin1`), зміна у відсотках, топ-5 областей за зростанням. Одна область — один рядок; відсортуй через `sort_values`. Підказка: `pivot_table(index="admin1", columns="рік", values="price")`.

**Критерії перевірки:** у таблиці лише області, для яких є обидва роки; відсотки — одним знаком після коми; поясни, чому прифронтові області можуть «випадати» з порівняння. Наприкінці напиши **заголовок-висновок** одним реченням (наприклад, «Хліб найшвидше дорожчав у …: +…% за 2021–2025») — так, ніби це перший рядок повідомлення Марті Петрівні.

### Знайди помилку { #find-bug }

Тарас знайшов в інтернеті старий ноутбук «аналіз цін WFP» і радісно запускає його на свіжому файлі. Фрагмент на даних до 2018 року працював. А тепер:

```python
key_foods = ["Bread (wheat)", "Potatoes", "Oil (sunflower)", "Milk"]
raw = pd.read_csv(os.path.join(DATA_DIR, "wfp_food_prices_ukr.csv"), parse_dates=["date"])
df_pairplot = (
    raw.query("commodity in @key_foods and admin1.isna() and currency == 'UAH'")
    .pivot_table(index="date", columns="commodity", values="price")
)
print(df_pairplot.columns.tolist(), df_pairplot.index.min().date(), df_pairplot.index.max().date())
try:
    df_pairplot[key_foods]
except KeyError as error:
    print("KeyError:", error)
```

```text
['Milk', 'Oil (sunflower)', 'Potatoes'] 2014-03-15 2017-12-15
KeyError: "['Bread (wheat)'] not in index"
```

Код синтаксично правильний і роками працював. Що змінилося — і чому це найнебезпечніший вид помилки в аналітиці?

??? success "Відповідь"

    Змінились **дані**, а не код: у свіжому файлі WFP «National Average» (`admin1` порожній) є лише за 2014–2017, а `Bread (wheat)` на рівні країни немає взагалі. `query` повертає менше, ніж очікує автор, `pivot_table` мовчки будує таблицю без стовпця, і помилка вибухає далеко від причини — на `df_pairplot[key_foods]`.

    Гірше, коли вибуху немає: графіки з `admin1.isna()` для інших товарів **мовчки** обриваються на 2017 році. Код «працює», висновок «ціни після 2022» — зроблено на даних без 2022 року.

    Захист: перевіряй дані перед аналізом — діапазон дат, наявність потрібних категорій, кількість рядків після кожного фільтра (`assert len(df) > 0`, `df["date"].max()`). У ноутбуках курсу — клітинка «🆕 National Average» і `print` діапазону одразу після завантаження.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| DataFrame / Series | таблиця зі стовпцями одного типу, вирівняна за індексом |
| `read_csv` | `usecols`, `parse_dates`, `encoding`, `sep` — читай лише потрібне й одразу з правильними типами |
| Огляд | `head`, `info`, `describe`, `isna().sum()` — спершу зрозумій, потім рахуй |
| Фільтрація | `loc[маска]`, `query("…")`; `@змінна` у `query` |
| Split-Apply-Combine | `groupby(...)` → `mean`/`agg` → нова таблиця; `transform` — результат тієї ж довжини |
| Дати | `.dt.year`, `to_period("M")`, `resample("ME")` на `DatetimeIndex` |
| Об'єднання | `merge` — як SQL JOIN за ключем; `concat` — «поставити одна під одною» |
| Форма таблиці | `melt` — широка → довга; `pivot` / `pivot_table` — довга → широка |
| Очищення | кодування, роздільники, `to_numeric(errors="coerce")`, пропуски — `NaN` |
| Візуалізація | matplotlib — контроль, seaborn — статистика, Plotly — інтерактив; одна вісь, різні одиниці — індекс |
| Dash | layout з Python-об'єктів + callbacks; дані — один раз при старті |
| Дані змінюються | перевіряй діапазон і наявність категорій після кожного фільтра |
| Історія з даних (SWD) | контекст (хто, що вирішує) → Big Idea одним реченням → заголовок-висновок, сірий контекст + один акцент |

### Самоперевірка

1. Чим `groupby(...).mean()` відрізняється від `groupby(...).transform("mean")`?
2. Навіщо `usecols` і `parse_dates` у `read_csv`?
3. Коли `merge(how="inner")` втрачає рядки і як це помітити?
4. Чому для цін з різними одиницями — індекс, а не дві осі?
5. Чому в Dash дані завантажують при старті, а не в callback?
6. Код працював роками і раптом дав «порожні» графіки. Де шукати причину?
7. Чим заголовок «Ціни на продукти, 2014–2026» гірший за «Олія соняшникова подорожчала у 6 разів з 2014 року»?

??? success "Відповіді"

    1. `mean()` повертає одне значення на групу (коротша таблиця); `transform("mean")` — значення групи для **кожного** рядка (та сама довжина) — зручно для частки від групи чи індексу.
    2. Менше пам'яті й часу (лише потрібні стовпці) і одразу правильний тип дат — без окремого `pd.to_datetime`.
    3. Коли ключ є лише в одній таблиці: рядки без пари зникають. Порівнюй `len` до і після, або `merge(..., indicator=True)` і дивись на `left_only`/`right_only`.
    4. Дві осі мають два незалежні масштаби — їх можна налаштувати так, щоб лінії «збігались» або «розходились». Індекс дає одну шкалу «у скільки разів від бази».
    5. Callback викликається на кожну дію користувача; читати CSV щоразу — повільно й марно. Дані читаються один раз і кешуються, callback лише фільтрує.
    6. У даних: нова версія файлу, змінені категорії, обірваний ряд. Перевір діапазон дат і кількість рядків після кожного фільтра.
    7. Перший лише описує, *що* на графіку, — висновок читач мусить знайти сам (і може знайти не той). Другий одразу каже, *що з цього випливає*, і готує око до акцентної лінії. Заголовок — перше, що бачить аудиторія; за SWD, туди йде головний висновок.

### Що далі

- Уроки 30–31 — бази даних (PostgreSQL, Redis): куди класти дані, коли CSV стає замало. `pd.read_sql` поєднує обидва світи.
- Довідники: [аналіз даних — патерни й мислення](pandas/data_analytics.md), [архітектура Dash](pandas/dash_architecture.md).

## Документація і джерела

- Код: [`module_3/bonus/pandas_data_analysis`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_3/bonus/pandas_data_analysis) — ноутбуки 1–3 і `dash_API` — стартовий код; ноутбук 4 — новий.
- pandas: [10 minutes to pandas](https://pandas.pydata.org/docs/user_guide/10min.html), [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html), [Reshaping and pivot tables](https://pandas.pydata.org/docs/user_guide/reshaping.html), [Time series](https://pandas.pydata.org/docs/user_guide/timeseries.html), [Merge, join, concatenate](https://pandas.pydata.org/docs/user_guide/merging.html)
- Сторітелінг: Cole Nussbaumer Knaflic, *Storytelling with Data: Let's Practice!* (Wiley, 2019) — контекст і Big Idea (розд. 1), вибір візуалу (2), прибирання зайвого (3), фокус уваги (4), заголовки-висновки й наративна дуга (5–6); сайт [storytellingwithdata.com](https://www.storytellingwithdata.com/)
- [Matplotlib](https://matplotlib.org/stable/users/index.html), [seaborn](https://seaborn.pydata.org/tutorial.html), [Plotly Express](https://plotly.com/python/plotly-express/), [Dash](https://dash.plotly.com/)
- Дані: [HDX — Ukraine Food Prices (WFP)](https://data.humdata.org/dataset/wfp-food-prices-for-ukraine), [HDX — Ukraine](https://data.humdata.org/group/ukr), [data.gov.ua — середньомісячна заробітна плата за регіонами](https://data.gov.ua/)
