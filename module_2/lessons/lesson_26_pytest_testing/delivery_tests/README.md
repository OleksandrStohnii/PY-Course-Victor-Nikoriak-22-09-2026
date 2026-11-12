# delivery_tests — тести для сервісу «Смачно + Таксі»

Навчальний проєкт уроку 26 ([сторінка в книзі](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m2/lesson_25/)).

```text
delivery/
├── pricing.py          Tariff, fare, apply_promo
├── events.py           конвеєр подій з уроку 25 + read_log
├── notify.py           notify_client(…, gateway) — шлюз SMS параметром
├── sms.py, services.py приклад для patch («patch where used»)
tests/
├── conftest.py         fixtures: day_tariff, log_lines, make_event
├── test_pricing.py     AAA, parametrize, pytest.raises, pytest.approx
├── test_events.py      стадії окремо, увесь конвеєр, tmp_path
├── test_notify.py      Mock, side_effect, fake-шлюз
├── test_services.py    patch
└── test_unittest_style.py
```

## Запуск

```bash
pip install pytest pytest-cov      # в активованому середовищі
cd delivery_tests
python -m pytest -v                # 32 тести
python -m pytest --cov=delivery --cov-report=term-missing
```

## Спробуй зламати

1. У `delivery/pricing.py` прибери `max(tariff.min_fare, …)` — має впасти 4 тести.
2. У `delivery/events.py` заміни `yield` у `parse` на накопичення списку — впаде `test_parse_is_lazy`.
3. У `tests/test_services.py` підміни `delivery.sms.send_sms` замість `delivery.services.send_sms` — тест викличе «справжню мережу».

Після кожної спроби поверни код і переконайся, що все знову зелене.
