# dispatch — диспетчерська «Смачно + Таксі»

Артефакт модуля 2, навчальний проєкт уроку 29 ([сторінка в книзі](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/modules/m2/lesson_28/)).

```text
dispatch/
├── __init__.py          Order, Dispatcher — публічний інтерфейс пакета
├── __main__.py          демо: python -m dispatch
├── models.py            Order — незмінний запис (@dataclass(frozen=True))
├── pricing.py           estimate_price — «повільний» розрахунок ціни маршруту
├── service.py           Dispatcher — збирає всі структури в один сервіс
└── structures/
    ├── errors.py        EmptyError(LookupError)
    ├── stack.py         Stack    — LIFO: скасування дій
    ├── queue.py         Queue    — FIFO на deque: звичайні замовлення
    ├── heap.py          MinHeap  — купа: термінові замовлення за дедлайном
    ├── trie.py          Trie     — префіксне дерево: автодоповнення адрес
    └── lru.py           LRUCache — кеш цін маршрутів на OrderedDict
tests/                   57 тестів pytest (урок 26)
```

## Запуск

```bash
cd dispatch_project
python -m dispatch                 # демо-сценарій
pip install pytest pytest-cov      # в активованому середовищі
python -m pytest -v                # 57 тестів
python -m pytest --cov=dispatch --cov-report=term-missing
```

## Спробуй зламати

Зміни одну з структур і подивись, який тест упаде:

- у `Stack.pop` заміни `self._items.pop()` на `self._items.pop(0)`;
- у `MinHeap._sift_up` заміни `<` у `_less` на `<=` і на `>` — що з цього ламає купу?
- у `LRUCache.get` прибери `move_to_end` — кеш стане FIFO замість LRU;
- у `Dispatcher.next_order` поміняй місцями перевірки `_urgent` і `_regular`.
