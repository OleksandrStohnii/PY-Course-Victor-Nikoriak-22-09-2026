# Урок 53. Випускний: презентація фінального проєкту — питч-дек

Сторінка уроку в книзі: [Урок 53](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m6/lesson_52/) — презентація як питч інвестору, клієнту чи техліду; 5 «чому» (Toyota); The Mom Test; структури деків Sequoia, Y Combinator, Кавасакі (10/20/30); ринок знизу вгору; демо; питання; критерії оцінювання.

| Файл | Що це |
|---|---|
| `pitch_deck_template.md` | шаблон деку на 10 слайдів для [Marp](https://marp.app/): слайди — Markdown, нотатки доповідача — у `<!-- … -->` |
| `example_news_digest_deck.md` | приклад: питч «Тема дня» на основі `news_hub`, з повним текстом виступу |
| `example_news_digest_deck.pdf` | той самий приклад, зібраний Marp (`--pdf --pdf-notes`) |
| `pitch_check.py` | перевірка деку: 8–12 слайдів, ≤ 45 слів на слайді, 4–7 хв мови за нотатками, обов'язкові розділи, забуті `[заготовки]` / TODO |
| `test_pitch_check.py` | тести перевірки (`python -m pytest`) |
| `note_lesson_53_pitch.ipynb` | ноутбук: 5 «чому» як дерево, питання за The Mom Test, ринок знизу вгору, дек як дані, знайди помилку |

```bash
cp pitch_deck_template.md my_deck.md                   # заповнити слайди й нотатки
python pitch_check.py my_deck.md                        # до «✓ готово до репетиції»
npx @marp-team/marp-cli my_deck.md --pdf --pdf-notes    # PDF (потрібен Chrome/Edge/Chromium або CHROME_PATH)
npx @marp-team/marp-cli my_deck.md --pptx               # PowerPoint
```
