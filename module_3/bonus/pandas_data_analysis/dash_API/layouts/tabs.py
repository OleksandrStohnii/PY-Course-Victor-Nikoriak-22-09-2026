# =============================================================================
# layouts/tabs.py — Визначення вкладок дашборду
# =============================================================================
# Кожна вкладка відповідає окремому аналітичному питанню.
# Перша вкладка — «Історія даних» (пояснення, explanatory): вона веде від
# питання до висновку. Решта — дослідження (exploratory) з фільтрами.
# Дані та callbacks підключаються лише для активної вкладки.
# =============================================================================

from dash import dcc


def create_tabs() -> dcc.Tabs:
    """
    Створює компонент вкладок із 8 розділами.

    Структура вкладок:
        story       — Історія даних: висновок для керівника (відкривається першою)
        overview    — Огляд даних (статистика, структура)
        food        — Ціни на товари (часові ряди, регіони)
        spatial     — Просторовий аналіз (карти ринків)
        exchange    — Валютний курс UAH/USD
        debt        — Зовнішній борг та макроіндикатори
        correlation — Зв'язок цін і валютного курсу
        methodology — Методологія та пояснення
    """
    return dcc.Tabs(
        id="tabs",
        value="story",               # вкладка за замовчуванням: спершу історія, потім дослідження
        persistence=True,            # зберігає активну вкладку при перезавантаженні
        persistence_type="session",
        children=[
            dcc.Tab(
                label="📖 Історія даних",
                value="story",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="📋 Огляд даних",
                value="overview",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="🍞 Ціни на товари",
                value="food",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="🗺️ Просторовий аналіз",
                value="spatial",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="💱 Валютний курс",
                value="exchange",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="📉 Зовнішній борг",
                value="debt",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="🔗 Ціни та курс валюти",
                value="correlation",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
            dcc.Tab(
                label="📖 Методологія",
                value="methodology",
                className="tab-item",
                selected_className="tab-item--selected",
            ),
        ],
    )
