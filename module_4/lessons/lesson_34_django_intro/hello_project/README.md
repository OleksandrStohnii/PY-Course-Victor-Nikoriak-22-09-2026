# hello_project — урок 34

Проєкт, який будує [урок 34 «Django intro: MVT, ORM, admin»](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m4/lesson_33/) — кроки 1–2 маршруту [Zero to Hero](https://nikoriakviktor.github.io/notes_chat_app/tutorials/) Django-книги. Стан — після розібраного прикладу (`is_pinned`) і «Знайди помилку» (`priority`).

```bash
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver          # http://127.0.0.1:8000/notes/ і /admin/
python manage.py test               # тести hello_app
```

`SECRET_KEY` у `settings.py` — навчальний (`django-insecure-…`, так його генерує `startproject`). Для справжнього сайту ключ беруть зі змінної середовища (урок 50).
