# =============================================================================
# utils/translator.py — Українські назви для колонок і значень
# =============================================================================
# У CSV від WFP усе англійською (або латиницею): товари, області, ринки,
# одиниці виміру. Перекладаємо ОДИН раз — одразу після завантаження
# (data_utils/loader.py). Далі весь код і всі графіки бачать українські назви.
#
# Чому словники, а не автоматичний переклад?
#   Назв небагато (45 товарів, 26 областей), а точність важлива:
#   «Bread (rye)» — це «Хліб житній», а не «Хліб (жито)».
#
# Значення, якого немає у словнику, лишається як є — нічого не губиться.
# =============================================================================

import pandas as pd

COL_MAP = {
    # базові
    "date": "дата",
    "commodity": "товар",
    "price": "ціна",
    "usdprice": "ціна_usd",

    # географія
    "admin1": "область",
    "admin2": "район",
    "market": "ринок",
    "market_id": "id_ринку",
    "latitude": "широта",
    "longitude": "довгота",

    # типи
    "category": "категорія",
    "commodity_id": "id_товару",
    "unit": "одиниця",
    "currency": "валюта",

    # економіка
    "value": "значення",
    "indicator": "індикатор",

    # порти
    "port": "порт",
    "shipments": "перевезення",

    # борг
    "debt": "борг",

    # інше
    "region": "регіон",
}


def translate_columns(df):
    return df.rename(columns={k: v for k, v in COL_MAP.items() if k in df.columns})


# ─── Товари ──────────────────────────────────────────────────────────────────

COMMODITY_UA = {
    # хліб і крупи
    "Bread (first grade flour)":  "Хліб із борошна першого ґатунку",
    "Bread (high grade flour)":   "Хліб із борошна вищого ґатунку",
    "Bread (rye)":                "Хліб житній",
    "Bread (wheat)":              "Хліб пшеничний",
    "Wheat flour":                "Борошно пшеничне",
    "Wheat flour (first grade)":  "Борошно пшеничне першого ґатунку",
    "Barley":                     "Ячмінна крупа",
    "Buckwheat":                  "Гречка",
    "Buckwheat grits":            "Гречана крупа",
    "Millet":                     "Пшоно",
    "Rice":                       "Рис",
    "Semolina":                   "Манна крупа",
    "Pasta":                      "Макарони",
    "Potatoes":                   "Картопля",
    # овочі й фрукти
    "Apples":                     "Яблука",
    "Beetroots":                  "Буряк",
    "Cabbage":                    "Капуста",
    "Carrots":                    "Морква",
    "Onions":                     "Цибуля",
    # м'ясо, риба, яйця
    "Meat (beef)":                "Яловичина",
    "Meat (pork)":                "Свинина",
    "Meat (chicken, whole)":      "Курка (тушка)",
    "Meat (chicken, fillet)":     "Куряче філе",
    "Meat (mixed, sausage)":      "Ковбаса",
    "Fat (salo)":                 "Сало",
    "Fish (frozen)":              "Риба заморожена",
    "Eggs":                       "Яйця",
    # молочне
    "Milk":                       "Молоко",
    "Butter":                     "Масло вершкове",
    "Curd":                       "Сир кисломолочний",
    "Sour cream":                 "Сметана",
    # інше
    "Oil (sunflower)":            "Олія соняшникова",
    "Sugar":                      "Цукор",
    # непродовольчі
    "Fuel (LPG)":                 "Пальне (автогаз)",
    "Fuel (diesel)":              "Пальне (дизель)",
    "Fuel (petrol-gasoline)":     "Пальне (бензин)",
    "Fuel (petrol-gasoline, 92 octane)": "Пальне (бензин А-92)",
    "Fuel (petrol-gasoline, 95 octane)": "Пальне (бензин А-95)",
    "Transport (public)":         "Громадський транспорт",
    "Antibiotics (imported)":     "Антибіотики (імпортні)",
    "Antibiotics (local)":        "Антибіотики (вітчизняні)",
    "Antipyretic (imported)":     "Жарознижувальні (імпортні)",
    "Antipyretic (local)":        "Жарознижувальні (вітчизняні)",
    "Vasodilating agents (imported)": "Судинорозширювальні (імпортні)",
    "Vasodilating agents (local)":    "Судинорозширювальні (вітчизняні)",
}

# ─── Області (admin1) ────────────────────────────────────────────────────────

OBLAST_UA = {
    "Avtonomna Respublika Krym": "АР Крим",
    "Cherkaska":        "Черкаська",
    "Chernihivska":     "Чернігівська",
    "Chernivetska":     "Чернівецька",
    "Dnipropetrovska":  "Дніпропетровська",
    "Donetska":         "Донецька",
    "Ivano-Frankivska": "Івано-Франківська",
    "Kharkivska":       "Харківська",
    "Khersonska":       "Херсонська",
    "Khmelnytska":      "Хмельницька",
    "Kirovohradska":    "Кіровоградська",
    "Kyiv":             "Київ",
    "Luhanska":         "Луганська",
    "Lvivska":          "Львівська",
    "Mykolaivska":      "Миколаївська",
    "Odeska":           "Одеська",
    "Poltavska":        "Полтавська",
    "Rivnenska":        "Рівненська",
    "Sevastopol":       "Севастополь",
    "Sumska":           "Сумська",
    "Ternopilska":      "Тернопільська",
    "Vinnytska":        "Вінницька",
    "Volynska":         "Волинська",
    "Zakarpatska":      "Закарпатська",
    "Zaporizka":        "Запорізька",
    "Zhytomyrska":      "Житомирська",
}

# ─── Ринки (назви міст) ──────────────────────────────────────────────────────
# «National Average» НЕ перекладаємо: це службова позначка WFP,
# за якою preprocessing.py відкидає середнє по країні.

MARKET_UA = {
    "Cherkasy": "Черкаси", "Chernihiv": "Чернігів", "Chernivtsi": "Чернівці",
    "Crimea": "Крим", "Dnipropetrovsk": "Дніпро", "Donetsk": "Донецьк",
    "Ivano-Frankivsk": "Івано-Франківськ", "Kharkiv": "Харків",
    "Kherson": "Херсон", "Khmelnytskiy": "Хмельницький",
    "Kirovohrad": "Кропивницький", "Kyiv": "Київ", "Kyiv city": "Київ (місто)",
    "Luhansk": "Луганськ", "Lviv": "Львів", "Mykolaiv": "Миколаїв",
    "Odesa": "Одеса", "Poltava": "Полтава", "Rivne": "Рівне", "Sumy": "Суми",
    "Ternopyl": "Тернопіль", "Vinnytsya": "Вінниця", "Volyn": "Волинь",
    "Zakarpattya": "Закарпаття", "Zaporizhzhya": "Запоріжжя",
    "Zhytomyr": "Житомир", "m. Sevastopol": "Севастополь",
}

# ─── Одиниці виміру й категорії ──────────────────────────────────────────────

UNIT_UA = {
    "KG": "кг", "L": "л", "Loaf": "буханка", "10 pcs": "10 шт",
    "200 G": "200 г", "500 G": "500 г", "1 sachet": "1 пакетик",
    "1 ticket": "1 квиток", "10 tablets": "10 таблеток",
}

CATEGORY_UA = {
    "cereals and tubers":    "крупи й коренеплоди",
    "meat, fish and eggs":   "м'ясо, риба, яйця",
    "milk and dairy":        "молочні продукти",
    "miscellaneous food":    "інші продукти",
    "non-food":              "непродовольчі",
    "oil and fats":          "олії й жири",
    "vegetables and fruits": "овочі й фрукти",
}

# Яка колонка (уже з українською назвою) яким словником перекладається
VALUE_MAPS = {
    "товар":     COMMODITY_UA,
    "область":   OBLAST_UA,
    "ринок":     MARKET_UA,
    "одиниця":   UNIT_UA,
    "категорія": CATEGORY_UA,
}


def translate_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Перекладає значення в колонках товар / область / ринок / одиниця / категорія.

    Викликати ПІСЛЯ перейменування колонок. Значення без перекладу
    (і пропуски NaN) лишаються як були — replace не чіпає того,
    чого немає в словнику.
    """
    df = df.copy()
    for col, mapping in VALUE_MAPS.items():
        if col in df.columns:
            df[col] = df[col].replace(mapping)
    return df


# ─── Сортування за українською абеткою ───────────────────────────────────────
# Звичайний sorted() порівнює коди символів Unicode, а в Unicode «І», «Є», «Ї», «Ґ»
# стоять ПЕРЕД «А». Тому «Івано-Франківська» опинилась би на початку списку.
# Ключ нижче замінює кожну літеру її номером в абетці.

_UA_ALPHABET = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя"
_UA_ORDER = {ch: i for i, ch in enumerate(_UA_ALPHABET)}


def ua_sort_key(text: str) -> list:
    """Ключ для sorted(): sorted(names, key=ua_sort_key)."""
    return [(_UA_ORDER.get(ch, 100 + ord(ch)) if ch.isalpha() else ord(ch) - 1000)
            for ch in str(text).lower()]


# ─── Макроіндикатори Світового банку (external-debt_ukr.csv) ────────────────
# Скорочення в дужках — як у Світового банку, українською:
#   ПБ  — платіжний баланс (BoP)          ВНД — валовий національний дохід (GNI)
#   ДГ  — державний і держгарантований борг (PPG)
#   ПНГ — приватний негарантований борг (PNG)
#   МБРР — Міжнародний банк реконструкції та розвитку (IBRD)
#   МАР — Міжнародна асоціація розвитку (IDA), МФК — Міжнародна фінансова корпорація (IFC)
#   ОДР — офіційна допомога розвитку (ODA)
# Код індикатора (колонка код_індикатора) лишається оригінальним — за ним
# легко знайти показник на data.worldbank.org.

DEBT_INDICATOR_UA = {
    "Commercial banks and other lending (PPG + PNG) (NFL, current US$)":
        "Комерційні банки та інше кредитування (ДГ + ПНГ), чисті потоки, $",
    "Current account balance (BoP, current US$)":
        "Сальдо поточного рахунку (ПБ, $)",
    "Debt service (PPG and IMF only, % of exports of goods, services and primary income)":
        "Обслуговування боргу (ДГ і МВФ), % експорту товарів, послуг і первинного доходу",
    "Debt service on external debt, public and publicly guaranteed (PPG) (TDS, current US$)":
        "Обслуговування зовнішнього боргу, ДГ, $",
    "Debt service on external debt, total (TDS, current US$)":
        "Обслуговування зовнішнього боргу, усього, $",
    "Exports of goods, services and primary income (BoP, current US$)":
        "Експорт товарів, послуг і первинного доходу (ПБ, $)",
    "External debt stocks (% of GNI)":
        "Зовнішній борг, % ВНД",
    "External debt stocks, long-term (DOD, current US$)":
        "Зовнішній борг, довгостроковий, $",
    "External debt stocks, private nonguaranteed (PNG) (DOD, current US$)":
        "Зовнішній борг, приватний негарантований (ПНГ), $",
    "External debt stocks, public and publicly guaranteed (PPG) (DOD, current US$)":
        "Зовнішній борг, державний і держгарантований (ДГ), $",
    "External debt stocks, short-term (DOD, current US$)":
        "Зовнішній борг, короткостроковий, $",
    "External debt stocks, total (DOD, current US$)":
        "Зовнішній борг, усього, $",
    "Foreign direct investment, net inflows (BoP, current US$)":
        "Прямі іноземні інвестиції, чистий приплив (ПБ, $)",
    "GNI (current US$)":
        "Валовий національний дохід (ВНД), $",
    "Grants, excluding technical cooperation (BoP, current US$)":
        "Гранти, без технічної допомоги (ПБ, $)",
    "IBRD loans and IDA credits (DOD, current US$)":
        "Позики МБРР і кредити МАР, $",
    "IFC, private nonguaranteed (NFL, US$)":
        "МФК, приватний негарантований, чисті потоки, $",
    "IMF repurchases and charges (TDS, current US$)":
        "Викуп і платежі МВФ, $",
    "Imports of goods, services and primary income (BoP, current US$)":
        "Імпорт товарів, послуг і первинного доходу (ПБ, $)",
    "Multilateral debt service (% of public and publicly guaranteed debt service)":
        "Обслуговування багатостороннього боргу, % обслуговування ДГ-боргу",
    "Multilateral debt service (TDS, current US$)":
        "Обслуговування багатостороннього боргу, $",
    "Net ODA received (% of GNI)":
        "Отримана чиста ОДР, % ВНД",
    "Net ODA received per capita (current US$)":
        "Отримана чиста ОДР на особу, $",
    "Net financial flows, IBRD (NFL, current US$)":
        "Чисті фінансові потоки, МБРР, $",
    "Net financial flows, IDA (NFL, current US$)":
        "Чисті фінансові потоки, МАР, $",
    "Net financial flows, IMF nonconcessional (NFL, current US$)":
        "Чисті фінансові потоки, МВФ (непільгові), $",
    "Net financial flows, RDB nonconcessional (NFL, current US$)":
        "Чисті фінансові потоки, регіональні банки розвитку (непільгові), $",
    "Net financial flows, bilateral (NFL, current US$)":
        "Чисті фінансові потоки, двосторонні, $",
    "Net financial flows, multilateral (NFL, current US$)":
        "Чисті фінансові потоки, багатосторонні, $",
    "Net financial flows, others (NFL, current US$)":
        "Чисті фінансові потоки, інші, $",
    "Net flows on external debt, private nonguaranteed (PNG) (NFL, current US$)":
        "Чисті потоки за зовнішнім боргом, ПНГ, $",
    "Net official development assistance received (current US$)":
        "Отримана чиста офіційна допомога розвитку, $",
    "PNG, bonds (NFL, current US$)":
        "ПНГ, облігації, чисті потоки, $",
    "PNG, commercial banks and other creditors (NFL, current US$)":
        "ПНГ, комерційні банки та інші кредитори, чисті потоки, $",
    "PPG, IBRD (DOD, current US$)":
        "ДГ, борг перед МБРР, $",
    "PPG, IDA (DOD, current US$)":
        "ДГ, борг перед МАР, $",
    "PPG, bonds (NFL, current US$)":
        "ДГ, облігації, чисті потоки, $",
    "PPG, commercial banks (NFL, current US$)":
        "ДГ, комерційні банки, чисті потоки, $",
    "PPG, official creditors (NFL, US$)":
        "ДГ, офіційні кредитори, чисті потоки, $",
    "PPG, other private creditors (NFL, current US$)":
        "ДГ, інші приватні кредитори, чисті потоки, $",
    "PPG, private creditors (NFL, US$)":
        "ДГ, приватні кредитори, чисті потоки, $",
    "Personal remittances, received (current US$)":
        "Отримані приватні грошові перекази, $",
    "Portfolio equity, net inflows (BoP, current US$)":
        "Портфельні інвестиції в акції, чистий приплив (ПБ, $)",
    "Portfolio investment, bonds (PPG + PNG) (NFL, current US$)":
        "Портфельні інвестиції, облігації (ДГ + ПНГ), чисті потоки, $",
    "Present value of external debt (% of GNI)":
        "Приведена вартість зовнішнього боргу, % ВНД",
    "Present value of external debt (% of exports of goods, services and primary income)":
        "Приведена вартість зовнішнього боргу, % експорту товарів, послуг і первинного доходу",
    "Present value of external debt (current US$)":
        "Приведена вартість зовнішнього боргу, $",
    "Public and publicly guaranteed debt service (% of GNI)":
        "Обслуговування ДГ-боргу, % ВНД",
    "Public and publicly guaranteed debt service (% of exports of goods, services and primary income)":
        "Обслуговування ДГ-боргу, % експорту товарів, послуг і первинного доходу",
    "Short-term debt (% of exports of goods, services and primary income)":
        "Короткостроковий борг, % експорту товарів, послуг і первинного доходу",
    "Short-term debt (% of total external debt)":
        "Короткостроковий борг, % усього зовнішнього боргу",
    "Short-term debt (% of total reserves)":
        "Короткостроковий борг, % міжнародних резервів",
    "Technical cooperation grants (BoP, current US$)":
        "Гранти на технічну допомогу (ПБ, $)",
    "Total debt service (% of GNI)":
        "Обслуговування боргу, усього, % ВНД",
    "Total debt service (% of exports of goods, services and primary income)":
        "Обслуговування боргу, усього, % експорту товарів, послуг і первинного доходу",
    "Total reserves (% of total external debt)":
        "Міжнародні резерви, % зовнішнього боргу",
    "Total reserves (includes gold, current US$)":
        "Міжнародні резерви (з золотом), $",
    "Total reserves in months of imports":
        "Міжнародні резерви, місяців імпорту",
    "Use of IMF credit (DOD, current US$)":
        "Використання кредитів МВФ, $",
}
