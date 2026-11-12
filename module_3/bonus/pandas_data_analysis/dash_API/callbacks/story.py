# =============================================================================
# callbacks/story.py — Вкладка «📖 Історія даних» (data storytelling)
# =============================================================================
# Інші вкладки — це ДОСЛІДЖЕННЯ (exploratory): користувач сам крутить фільтри
# і шукає цікаве. Ця вкладка — ПОЯСНЕННЯ (explanatory): аналітик уже знайшов
# головне і веде читача від питання до рішення.
#
# Структура — наративна дуга з книги «Storytelling with Data» (C. N. Knaflic):
#
#   Сюжет        → хто питає і навіщо; Big Idea одним реченням
#   Наростання   → ціни 2014–2021: росли, але поступово
#   Кульмінація  → 2022: стрибок курсу і ціни, що обігнали долар
#   Розв'язка    → що робити фонду + кнопки «дослідити самому»
#
# Правила оформлення графіків (теж із книги):
#   1. Заголовок графіка = ВИСНОВОК («Курс злетів на 31%»), а не опис
#      («Курс UAH/USD»). Висновок рахується з даних — див. f-рядки нижче.
#   2. Контекст — сірим, головне — одним акцентним кольором.
#   3. Мінімум «шуму»: без сітки, без легенди — підписи прямо біля ліній.
#   4. Між графіками — короткий текст «Так що?»: що це означає для рішення.
#
# Дані рахує data_utils/story.py; тут лише візуалізація і текст.
# =============================================================================

import plotly.graph_objects as go
from dash import Input, Output, ctx, html, dcc, no_update

from data_utils import get_dataset
from data_utils.story import (
    BASKET_LABEL,
    get_basket_cost_by_oblast,
    get_basket_index,
    get_change_vs_rate,
    get_rate_shock,
    last_full_year,
)
from config import PLOTLY_TEMPLATE


# ─── Кольори історії ─────────────────────────────────────────────────────────
# Лише ДВА «змістовні» кольори: сірий для контексту, помаранчевий для головного.
# Якщо все яскраве — нічого не виділено.

GREY   = "#6e7681"   # контекст
ACCENT = "#f0883e"   # те, на що має подивитися читач
TEXT   = "#c9d1d9"
MUTED  = "#8b949e"

# Вкладки, на які ведуть кнопки в розв'язці: id кнопки → value вкладки
STORY_LINKS = {
    "story-go-food":        ("🍞 Ціни на товари: обери свій товар", "food"),
    "story-go-spatial":     ("🗺️ Карта: де дорожче",               "spatial"),
    "story-go-correlation": ("🔗 Ціни і курс: перевір зв'язок",     "correlation"),
}


# =============================================================================
# Головна функція вкладки
# =============================================================================

def render_story() -> html.Div:
    """
    Будує всю історію: 4 акти, 4 графіки, тексти між ними.

    Фільтри сайдбару тут НЕ діють: історія розповідає одну конкретну
    відповідь. Для власних запитань — кнопки в кінці.
    """
    food_df     = get_dataset("food")
    exchange_df = get_dataset("exchange")

    # ── Рахуємо всі числа історії один раз ──
    end_year         = last_full_year(food_df)
    index_df         = get_basket_index(food_df, start=2014, end=2021)
    shock            = get_rate_shock(exchange_df)
    changes, rate_pct = get_change_vs_rate(food_df, exchange_df, start=2021, end=end_year)
    cost             = get_basket_cost_by_oblast(food_df, months=12)

    n_faster   = int((changes > rate_pct).sum())
    n_total    = len(changes)
    cost_gap   = (cost.iloc[-1] / cost.iloc[0] - 1) * 100
    basket_x   = index_df[BASKET_LABEL].iloc[-1] / 100

    # ── Big Idea: одне речення = позиція + що на кону ──
    big_idea = (
        f"Після 2022 року {n_faster} з {n_total} базових продуктів подорожчали швидше "
        f"за долар, а той самий кошик у різних областях відрізняється на {cost_gap:.0f}% — "
        "тому бюджет продуктового набору треба перераховувати регулярно й окремо для регіонів."
    )

    return html.Div(
        style={"maxWidth": "920px"},
        children=[
            # ── Акт 1. Сюжет ──
            _act("Сюжет", "Питання, з якого все почалося"),
            html.P(
                "Марта Петрівна керує благодійним фондом «Хлібний кошик», який розвозить "
                "продуктові набори по Україні. Бюджет набору фонд затвердив ще у 2021 році. "
                "Тепер вона питає аналітикиню Ліну: «Нам досі вистачає грошей на той самий набір? "
                "І чи однаково він коштує в усіх областях?»",
                style=_p_style(),
            ),
            html.P(
                f"Ліна взяла ціни WFP з ринків {len(cost)} регіонів і курс гривні від FAO. "
                "Ось що вона розповіла за три хвилини.",
                style=_p_style(),
            ),
            _big_idea_card(big_idea),

            # ── Акт 2. Наростання ──
            _act("Наростання", "2014–2021: ціни повзли вгору"),
            dcc.Graph(figure=_fig_prewar_index(index_df), config={"displayModeBar": False}),
            _so_what(
                f"За сім років типовий продукт кошика подорожчав у {basket_x:.1f} раза. "
                "Це відчутно, але передбачувано: фонд щороку додавав до бюджету трохи грошей "
                "і встигав. Сірі лінії — окремі продукти; помаранчева — «типовий» (медіана): "
                "її й варто тримати в голові."
            ),

            # ── Акт 3. Кульмінація ──
            _act("Кульмінація", "2022: правила змінилися"),
            dcc.Graph(figure=_fig_rate_shock(exchange_df, shock), config={"displayModeBar": False}),
            _so_what(
                f"За кілька місяців 2022 року долар подорожчав на {shock['pct']:.0f}%. "
                "Частину продуктів (олію, рис) Україна імпортує або продає за кордон за долари — "
                "тож логічно чекати, що й ціни підуть угору. Але чи всі однаково?"
            ),
            dcc.Graph(figure=_fig_change_vs_rate(changes, rate_pct, end_year), config={"displayModeBar": False}),
            _so_what(
                f"Пунктир — «лінійка» курсу: +{rate_pct:.0f}% за 2021→{end_year}. "
                f"Помаранчеві продукти ({n_faster} з {n_total}) його обігнали: для них набір "
                "подорожчав навіть у доларах. Отже, просто «перерахувати бюджет за курсом» — замало."
            ),

            # ── Акт 4. Розв'язка ──
            _act("Розв'язка", "Що робити фонду"),
            dcc.Graph(figure=_fig_cost_by_oblast(cost), config={"displayModeBar": False}),
            _so_what(
                f"Набір із {n_total} продуктів (по одиниці кожного) за останні 12 місяців коштує "
                f"від {cost.iloc[0]:.0f} грн ({cost.index[0]}) до {cost.iloc[-1]:.0f} грн "
                f"({cost.index[-1]}). Один бюджет «на всю країну» означає, що в найдорожчих "
                "областях люди отримують менше."
            ),
            html.Div(
                style={**_card_style(), "borderLeft": f"4px solid {ACCENT}"},
                children=[
                    html.H4("Рекомендація Ліни", style={"marginTop": "0", "color": ACCENT}),
                    html.Ol([
                        html.Li("Перераховувати бюджет набору щокварталу за свіжими цінами, а не за курсом."),
                        html.Li(f"Для регіонів верхньої трійки ({', '.join(cost.index[-3:][::-1])}) закласти окремий, вищий бюджет."),
                        html.Li("Стежити окремо за продуктами, що обганяють долар, — вони першими «з'їдають» бюджет."),
                    ], style={"lineHeight": "1.7", "margin": "0"}),
                ],
            ),

            # ── Заклик: перейти від пояснення до дослідження ──
            html.H4("Перевір сам", style={"marginTop": "32px"}),
            html.P(
                "Історія — це висновок Ліни. Не вір на слово: відкрий вкладки-дослідження й "
                "перевір на своєму товарі чи своїй області.",
                style=_p_style(),
            ),
            html.Div(
                [html.Button(label, id=btn_id, n_clicks=0, className="story-button",
                             style=_button_style())
                 for btn_id, (label, _) in STORY_LINKS.items()],
                style={"display": "flex", "gap": "12px", "flexWrap": "wrap"},
            ),
            html.P(
                "Як читати: ціни — медіани по ринках (стійкі до помилок запису); рядки "
                "«National Average» не використано; порівнюємо лише повні роки. "
                "Кореляція з курсом — не доказ причини (див. вкладку «Методологія»).",
                style={"color": MUTED, "fontSize": "12px", "marginTop": "24px"},
            ),
        ],
    )


def register_story_callbacks(app) -> None:
    """
    Кнопки в кінці історії перемикають вкладку.

    Кнопки з'являються в DOM лише коли відкрито «Історію», тому в app.py
    увімкнено suppress_callback_exceptions=True. Коли вкладка рендериться,
    Dash викликає цей callback з n_clicks=0 — такий виклик ігноруємо.
    """
    @app.callback(
        Output("tabs", "value"),
        [Input(btn_id, "n_clicks") for btn_id in STORY_LINKS],
        prevent_initial_call=True,
    )
    def go_to_tab(*clicks):
        if not ctx.triggered_id or not any(clicks):
            return no_update
        return STORY_LINKS[ctx.triggered_id][1]


# =============================================================================
# Графіки
# =============================================================================

def _fig_prewar_index(index_df) -> go.Figure:
    """Наростання: індекс цін 2014=100, продукти сірим, «типовий» — акцентом."""
    fig = go.Figure()
    years = index_df.index

    for col in index_df.columns:
        is_key = col == BASKET_LABEL
        fig.add_trace(go.Scatter(
            x=years, y=index_df[col], name=col, mode="lines",
            line={"color": ACCENT if is_key else GREY, "width": 4 if is_key else 1.2},
            opacity=1 if is_key else 0.6,
            hovertemplate=f"{col}<br>%{{x}}: %{{y:.0f}}<extra></extra>",
        ))

    # Прямі підписи замість легенди: акцент + найшвидший і найповільніший продукт
    last = index_df.iloc[-1].drop(BASKET_LABEL)
    labels = {
        BASKET_LABEL: ("Типовий продукт", ACCENT),
        last.idxmax(): (last.idxmax(), GREY),
        last.idxmin(): (last.idxmin(), GREY),
    }
    for col, (text, color) in labels.items():
        fig.add_annotation(
            x=years[-1], y=index_df[col].iloc[-1],
            text=f"{text}: {index_df[col].iloc[-1] / 100:.1f}×",
            xanchor="left", xshift=8, showarrow=False,
            font={"color": color, "size": 12},
        )

    basket_x = index_df[BASKET_LABEL].iloc[-1] / 100
    _story_layout(
        fig,
        title=f"До 2022 року типовий продукт подорожчав у {basket_x:.1f} раза — поступово, рік за роком",
        subtitle=f"Індекс медіанної ціни, {years[0]} = 100",
    )
    fig.update_layout(margin={"r": 170})
    return fig


def _fig_rate_shock(exchange_df, shock: dict) -> go.Figure:
    """Кульмінація-1: курс UAH/USD, до 2022 — сірим, з 2022 — акцентом."""
    ts = exchange_df[exchange_df["дата"] >= "2014-01-01"].sort_values("дата")
    before = ts[ts["дата"] <= "2022-01-01"]
    after  = ts[ts["дата"] >= "2022-01-01"]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=before["дата"], y=before["курс"], mode="lines",
        line={"color": GREY, "width": 2},
        hovertemplate="%{x|%m.%Y}: %{y:.2f} грн/$<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=after["дата"], y=after["курс"], mode="lines",
        line={"color": ACCENT, "width": 4},
        hovertemplate="%{x|%m.%Y}: %{y:.2f} грн/$<extra></extra>",
    ))

    # Анотація на ключовій точці — пік 2022 року
    fig.add_annotation(
        x=shock["peak_date"], y=shock["peak_rate"],
        text=f"{shock['peak_date']:%m.%Y}: {shock['peak_rate']:.1f} грн/$<br>"
             f"(+{shock['pct']:.0f}% за кілька місяців)",
        showarrow=True, arrowcolor=ACCENT, ax=-120, ay=-40,
        font={"color": ACCENT, "size": 12}, align="left",
    )

    _story_layout(
        fig,
        title=f"У 2022 році долар подорожчав на {shock['pct']:.0f}%: "
              f"з {shock['before_rate']:.1f} до {shock['peak_rate']:.1f} грн",
        subtitle="Курс UAH/USD, середній за місяць (FAO)",
    )
    return fig


def _fig_change_vs_rate(changes, rate_pct: float, end_year: int) -> go.Figure:
    """Кульмінація-2: зміна цін 2021→end_year проти «лінійки» курсу."""
    colors = [ACCENT if v > rate_pct else GREY for v in changes]

    fig = go.Figure(go.Bar(
        x=changes.values, y=changes.index, orientation="h",
        marker_color=colors,
        text=[f"+{v:.0f}%" for v in changes.values], textposition="outside",
        textfont={"color": TEXT},
        hovertemplate="%{y}: %{x:+.0f}%<extra></extra>",
    ))
    fig.add_vline(x=rate_pct, line_dash="dash", line_color=TEXT, opacity=0.7)
    fig.add_annotation(
        x=rate_pct, y=1.0, yref="paper", yanchor="bottom",
        text=f"долар +{rate_pct:.0f}%", showarrow=False,
        font={"color": TEXT, "size": 12},
    )

    n_faster = int((changes > rate_pct).sum())
    _story_layout(
        fig,
        title=f"{n_faster} з {len(changes)} продуктів подорожчали швидше, ніж долар",
        subtitle=f"Зміна медіанної ціни, 2021 → {end_year}, %",
    )
    fig.update_layout(xaxis={"visible": False}, height=420)
    return fig


def _fig_cost_by_oblast(cost) -> go.Figure:
    """Розв'язка: вартість кошика по областях, верхня трійка — акцентом."""
    top3 = set(cost.index[-3:])
    colors = [ACCENT if name in top3 else GREY for name in cost.index]

    fig = go.Figure(go.Bar(
        x=cost.values, y=cost.index, orientation="h",
        marker_color=colors,
        text=[f"{v:.0f} грн" for v in cost.values], textposition="outside",
        textfont={"color": TEXT, "size": 11},
        hovertemplate="%{y}: %{x:.0f} грн<extra></extra>",
    ))

    gap = (cost.iloc[-1] / cost.iloc[0] - 1) * 100
    _story_layout(
        fig,
        title=f"Той самий кошик у найдорожчому регіоні на {gap:.0f}% дорожчий, ніж у найдешевшому",
        subtitle="Сума медіанних цін продуктів кошика за останні 12 місяців, грн",
    )
    fig.update_layout(
        xaxis={"visible": False},
        height=max(420, 24 * len(cost)),
        margin={"l": 150},
    )
    return fig


# =============================================================================
# Допоміжне: спільний «чистий» стиль графіків і текстові блоки
# =============================================================================

def _story_layout(fig: go.Figure, title: str, subtitle: str) -> None:
    """
    Прибирає «шум» (clutter): сітку, легенду, зайві лінії осей.
    Заголовок — висновок, підзаголовок сірим — що саме виміряно.
    """
    fig.update_layout(
        template=PLOTLY_TEMPLATE,
        paper_bgcolor="#0d1117",
        plot_bgcolor="#0d1117",
        showlegend=False,
        title={
            "text": f"<b>{title}</b><br><span style='font-size:12px;color:{MUTED}'>{subtitle}</span>",
            "x": 0, "xanchor": "left", "font": {"size": 16, "color": TEXT},
        },
        margin={"t": 80, "b": 40, "l": 60, "r": 60},
        height=400,
    )
    fig.update_xaxes(showgrid=False, zeroline=False, color=MUTED)
    fig.update_yaxes(showgrid=False, zeroline=False, color=MUTED)


def _act(name: str, title: str) -> html.Div:
    """Заголовок акту: маленька сіра мітка дуги + великий заголовок."""
    return html.Div(
        style={"marginTop": "36px"},
        children=[
            html.Div(name.upper(), style={"color": ACCENT, "fontSize": "11px",
                                          "letterSpacing": "1px", "fontWeight": "600"}),
            html.H3(title, style={"marginTop": "4px"}),
        ],
    )


def _big_idea_card(text: str) -> html.Div:
    return html.Div(
        style={**_card_style(), "borderLeft": f"4px solid {ACCENT}"},
        children=[
            html.Div("BIG IDEA", style={"color": ACCENT, "fontSize": "11px",
                                        "letterSpacing": "1px", "fontWeight": "600"}),
            html.P(text, style={"fontSize": "16px", "margin": "6px 0 0 0", "lineHeight": "1.5"}),
        ],
    )


def _so_what(text: str) -> html.Div:
    """Блок «Так що?» — пояснює, що графік означає для рішення."""
    return html.Div(
        style={"display": "flex", "gap": "12px", "margin": "8px 0 16px 0"},
        children=[
            html.Div("Так що?", style={"color": ACCENT, "fontWeight": "600",
                                       "whiteSpace": "nowrap", "fontSize": "13px"}),
            html.P(text, style={**_p_style(), "margin": "0"}),
        ],
    )


def _p_style() -> dict:
    return {"color": TEXT, "fontSize": "14px", "lineHeight": "1.6"}


def _card_style() -> dict:
    return {
        "background": "#161b22", "border": "1px solid #30363d",
        "borderRadius": "8px", "padding": "16px 20px", "margin": "16px 0",
    }


def _button_style() -> dict:
    return {
        "background": "#161b22", "color": TEXT, "border": f"1px solid {ACCENT}",
        "borderRadius": "6px", "padding": "8px 14px", "cursor": "pointer",
        "fontSize": "13px",
    }
