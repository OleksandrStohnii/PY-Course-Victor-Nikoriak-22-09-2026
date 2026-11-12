# =============================================================================
# data_utils/story.py — Дані для вкладки «📖 Історія даних»
# =============================================================================
# Тут лише pandas-обчислення: жодних графіків і жодного Dash.
# Графіки та тексти будує callbacks/story.py — він бере готові числа звідси.
#
# Чому окремий модуль?
#   Історія відповідає на ОДНЕ питання керівниці фонду:
#   «Скільки тепер має коштувати продуктовий набір і де він найдорожчий?»
#   Усі числа для відповіді зібрано в одному місці — їх легко перевірити
#   в ноутбуці: from data_utils.story import get_basket_index ...
#
# Важливо: числа НЕ захардкоджені. Якщо оновити CSV — історія
# перерахується сама, разом із заголовками-висновками на графіках.
# =============================================================================

import pandas as pd


# ─── «Кошик» історії ─────────────────────────────────────────────────────────
# Базові продукти, які є в усіх областях і в усі роки (2014 → сьогодні).
# Гречку не беремо: у даних WFP вона з'являється лише з 2018 року.
# Ключ — назва товару в даних (loader уже переклав її українською,
# див. utils/translator.py), значення — короткий підпис для графіків.

STORY_BASKET = {
    "Цукор":            "Цукор",
    "Рис":              "Рис",
    "Макарони":         "Макарони",
    "Картопля":         "Картопля",
    "Олія соняшникова": "Олія",
    "Яйця":             "Яйця (10 шт)",
    "Сало":             "Сало",
    "Свинина":          "Свинина",
    "Курка (тушка)":    "Курка",
}

BASKET_LABEL = "Типовий продукт (медіана кошика)"


def _market_rows(food_df: pd.DataFrame) -> pd.DataFrame:
    """
    Лишає тільки ціни конкретних ринків (з областю).

    Рядки «National Average» не мають області — і після 2017 року
    вони рахуються інакше (див. урок, розділ «National Average»).
    Тому середнє по країні рахуємо самі: медіаною по ринках.
    """
    dff = food_df[food_df["область"].notna() & food_df["товар"].isin(STORY_BASKET)]
    return dff.assign(рік=dff["дата"].dt.year)


def last_full_year(food_df: pd.DataFrame) -> int:
    """
    Останній рік, за який є всі 12 місяців.

    Порівнювати повний рік з половиною року — нечесно:
    ціни мають сезонність (картопля навесні дорожча, ніж восени).
    """
    last = food_df["дата"].max()
    return last.year if last.month == 12 else last.year - 1


def get_yearly_prices(food_df: pd.DataFrame) -> pd.DataFrame:
    """
    Медіанна ціна кожного товару кошика за рік (по всіх ринках).

    Повертає «широку» таблицю: рядки — роки, колонки — товари (укр. назви).
    """
    return (
        _market_rows(food_df)
        .groupby(["рік", "товар"])["ціна"]
        .median()
        .unstack("товар")
        .rename(columns=STORY_BASKET)
    )


def get_basket_index(food_df: pd.DataFrame, start: int = 2014, end: int = 2021) -> pd.DataFrame:
    """
    Індекс цін: рік `start` = 100.

    Навіщо індекс? Яйця коштують ~10 грн, свинина ~50 грн —
    на одній осі в гривнях яйця «лежали б на дні». В індексі всі
    товари стартують зі 100 і видно, ХТО ріс швидше.

    Остання колонка — медіана індексів кошика («типовий продукт»):
    вона стійка до одного товару з дивною поведінкою.
    """
    yearly = get_yearly_prices(food_df).loc[start:end]
    index = yearly / yearly.iloc[0] * 100
    index[BASKET_LABEL] = index.median(axis=1)
    return index


def get_rate_shock(exchange_df: pd.DataFrame, before: str = "2022-01-01", year: int = 2022) -> dict:
    """
    Стрибок курсу UAH/USD у році `year`.

    Повертає словник:
        before_rate — курс у місяці `before` (до вторгнення)
        peak_rate   — максимум курсу за `year`
        peak_date   — коли був максимум
        pct         — на скільки відсотків подорожчав долар
    """
    ts = exchange_df.dropna(subset=["дата", "курс"]).sort_values("дата")
    before_rate = ts.loc[ts["дата"] == pd.Timestamp(before), "курс"].iloc[0]
    in_year = ts[ts["дата"].dt.year == year]
    peak = in_year.loc[in_year["курс"].idxmax()]
    return {
        "before_rate": float(before_rate),
        "peak_rate": float(peak["курс"]),
        "peak_date": peak["дата"],
        "pct": float((peak["курс"] / before_rate - 1) * 100),
    }


def get_change_vs_rate(food_df: pd.DataFrame, exchange_df: pd.DataFrame,
                       start: int = 2021, end: int | None = None) -> tuple[pd.Series, float]:
    """
    Порівнює зростання цін із зростанням курсу між роками `start` і `end`.

    Повертає:
        changes  — Series: товар → зміна ціни у %, від меншої до більшої
        rate_pct — на скільки % зріс середньорічний курс UAH/USD

    Курс тут — «лінійка»: товар, що подорожчав більше за долар,
    подорожчав і для того, хто отримує допомогу в доларах.
    """
    end = end or last_full_year(food_df)
    yearly = get_yearly_prices(food_df)
    changes = ((yearly.loc[end] / yearly.loc[start] - 1) * 100).sort_values()

    rate_by_year = exchange_df.groupby("рік")["курс"].mean()
    rate_pct = float((rate_by_year.loc[end] / rate_by_year.loc[start] - 1) * 100)
    return changes, rate_pct


def get_basket_cost_by_oblast(food_df: pd.DataFrame, months: int = 12) -> pd.Series:
    """
    Вартість одного кошика (по 1 одиниці кожного товару) за останні `months` місяців.

    Крок 1: медіанна ціна кожного товару в кожній області (робастно до викидів).
    Крок 2: сума по товарах = ціна кошика.
    Області, де бракує хоча б одного товару, відкидаємо (dropna) —
    інакше їхній кошик здавався б «дешевшим» лише через пропуск.
    """
    dff = _market_rows(food_df)
    recent = dff[dff["дата"] > dff["дата"].max() - pd.DateOffset(months=months)]
    by_oblast = recent.groupby(["область", "товар"])["ціна"].median().unstack("товар")
    cost = by_oblast.dropna().sum(axis=1).sort_values()
    return cost  # області вже українською (переклад у loader)
