# Урок 52. Робота над фінальним проєктом — інструменти аудиту

Сторінка уроку в книзі: [Урок 52](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m5/lesson_51/) — зріз курсу, аудит баз і застосунків `news_hub` та `crispy_notes_project`, рекомендації й вимоги до фінального проєкту.

| Файл | Що робить | Запуск (з кореня репозиторію) |
|---|---|---|
| `architecture_audit.py` | граф імпортів пакета через `ast`: рядки, fan-in / fan-out, цикли (Тар'ян), `--mermaid` | `python module_6/lessons/lesson_52_final_project/architecture_audit.py module_5/lessons/lesson_51_ci_cd/news_hub/news_hub` |
| `test_architecture_audit.py` | тести інструмента на крихітних пакетах | `cd module_6/lessons/lesson_52_final_project && python -m pytest` |
| `db_audit.sql` | PostgreSQL: розміри таблиць, зайві й невикористані індекси, повні перегляди (лише читання) | `psql "$DATABASE_URL" -f module_6/lessons/lesson_52_final_project/db_audit.sql` |
| `query_count.py` | скільки SQL-запитів робить кожна сторінка проєкту нотаток при 10 і 40 записах (N+1) | `cd module_5/lessons/lesson_51_ci_cd/crispy_notes_project && python manage.py shell < ../../../../module_6/lessons/lesson_52_final_project/query_count.py` |
| `patches/news_hub_search_index.patch` | міграція 0005 для `news_hub` уроку 51: trigram-індекс на `lower(title)` для `search()`, без зайвого `ix_subscriptions_chat_id` | `cd module_5/lessons/lesson_51_ci_cd/news_hub && git apply ../../../../module_6/lessons/lesson_52_final_project/patches/news_hub_search_index.patch` |
| `note_lesson_52_final_project.ipynb` | ноутбук заняття: граф імпортів, цикли, правило шарів, індекси й пагінація на SQLite, репліки, чек-лист | Colab або Jupyter |

`architecture_audit.py` і ноутбук потребують лише стандартної бібліотеки. Для вашого проєкту:

```bash
python architecture_audit.py шлях/до/вашого/пакета --mermaid
```
