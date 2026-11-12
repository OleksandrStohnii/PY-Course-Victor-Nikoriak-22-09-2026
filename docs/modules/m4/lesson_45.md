# Урок 45. Архітектура застосунків і патерни

За уроки 34–44 курс виростив два проєкти:

- **нотатки** на Django: сторінки, форми, DRF API, групи й JWT (уроки 34–36, 41);
- **агрегатор новин** на FastAPI: парсер, база, Redis, тести, LLM (уроки 37–44).

Кожен крок додавав можливості. Сьогодні — **жодної нової можливості**: лише те, **як** код розкладено по частинах. Архітектура не видна користувачу, поки не зламається. Тож спершу — дві вади, які жили в нотатках з уроку 41 і яких не бачив жоден із 29 тестів:

- власник списку справ, поділеного з **двома** людьми, отримує `500 Internal Server Error` на сторінці свого списку;
- учасник групи бачить список покупок групи у своєму переліку, але сторінка цього списку відповідає `404`.

Обидві мають одну причину: правило «хто що бачить» записано в кількох місцях — у selectors і у views, — і ці копії розійшлися.

| Урок | Django-гілка: застосунок нотаток | Проєкт |
|---|---|---|
| 33 | MVT, ORM, admin | `hello_project` |
| 34 | форми, Bootstrap, crispy | `crispy_notes_project` |
| 35 | REST API на DRF | + `api.py` |
| 40 | групи, паролі, JWT, налаштування безпеки | + групи, `/api/token/` |
| **44** | **архітектура: CBV, правила доступу в selectors, PostgreSQL; каталог патернів обох проєктів** | **+ `tests_architecture.py`, `DATABASE_URL`** |
| 45 | чат на WebSocket | — |

Проєкт: [`crispy_notes_project`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_45_architecture_patterns/crispy_notes_project). Друга половина уроку — патерни агрегатора [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_44_llm_api/news_hub) з уроку 44; його код не змінюється.

Це **крок 3 Django-книги** — [«CRUD і архітектура»](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/): services і selectors, class-based views, PostgreSQL. Теорію кроку тут не переказуємо: лише зміни в коді, їхні причини і те, що знайшли дорогою.

**Що потрібно з попередніх уроків:** `services` / `selectors` і тонкий view (33–35); групи і правило «змінює лише автор» (40); класи, успадкування, MRO (уроки 20–21); декоратори (урок 10); `Depends`, репозиторій і `LLMClient` у `news_hub` (37–43).

**Після уроку ти зможеш:**

- пояснити, за що відповідає кожен шар (транспорт → service / selector → ORM) і куди класти новий код;
- переписати function-based view на class-based і пояснити, у якому порядку Django викликає його методи;
- тримати правило доступу в одному місці й перевірити це автоматичним тестом;
- підключити PostgreSQL через одну змінну середовища, не ламаючи SQLite для тестів і Colab;
- впізнати в коді патерни Repository, Service layer, Strategy, Decorator, Factory, Dependency Injection, Unit of Work — і пояснити, яку проблему кожен розв'язує.

**Ноутбук заняття:** [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_45_architecture_patterns/note_lesson_45_architecture_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_45_architecture_patterns/note_lesson_45_architecture.ipynb){ .solutions-link } — selectors без HTTP, життєвий цикл CBV, кількість SQL-запитів, патерни `news_hub`.

## Пригадай

1. Чим `selectors.py` відрізняється від `services.py` у проєкті нотаток (урок 34)?
2. Клас `C(A, B)`, у `A` і `B` є метод `run()`, обидва викликають `super().run()`. У якому порядку вони виконаються (урок 21)?
3. Як у тестах `news_hub` підмінили справжню модель Gemini на фейкову, не змінюючи коду ендпоінта (урок 44)?

??? success "Відповіді"

    1. Selectors лише **читають** (повертають QuerySet чи об'єкт, нічого не змінюють); services **змінюють** дані — створюють, оновлюють, видаляють, часто в `transaction.atomic()`.
    2. `C.run` → `A.run` → `B.run` → далі по MRO. `super()` — це «наступний клас у MRO цього об'єкта», а не «батько класу, де написано `super()`».
    3. `app.dependency_overrides[get_llm_client] = lambda: fake` — ендпоінт отримує клієнт через `Depends` і не знає, який саме.

## Старт: з якого коду починаємо

| Звідки | Що там | Куди в проєкті |
|---|---|---|
| `notes_project_cbv/hello_app/views.py` | ті самі сторінки нотаток, записників і тегів як class-based views; `UserQuerySetMixin` | `views.py`: `NoteListView` … `TagCreateView` |
| `notes_project/README.md` | «03 Application layers»: тонкі views, selectors читають, services пишуть; крок 10 — PostgreSQL | правила доступу в `selectors.py`, `hello_project/database.py` |
| `DJANGO_PROJECT_STRUCTURE.md` | пари «погано / добре»: ORM у view проти selector, логіка в моделі проти service | «Куди класти код» нижче |
| довідник FastAPI до прототипу `news_dashboard` | §5 Dependency Injection, §7 Repository, §8 Unit of Work | каталог патернів |
| урок 41 курсу | `crispy_notes_project`: 29 тестів, групи, JWT | основа; жоден тест не змінено |

## Де жили правила доступу { #access-rules }

Відкрий `views.py` уроку 41. Selectors там є, але поруч — власні запити:

```python title="hello_app/views.py (урок 41, фрагменти)"
@login_required
def note_list(request):
    ...
    tag = Tag.objects.get(id=int(tag_id), user=request.user)

@login_required
def note_edit(request, pk):
    user_groups = request.user.groups.all()
    note = get_object_or_404(
        Note.objects.filter(Q(user=request.user) | Q(group__in=user_groups)),
        pk=pk,
    )

@login_required
def todo_list_edit(request, pk):
    todo = get_object_or_404(
        TodoList.objects.filter(Q(user=request.user) | Q(shared_with=request.user)),
        pk=pk,
    )
```

Правило «нотатку бачить автор і його група» записано **тричі**: у `selectors.get_user_notes`, `selectors.get_note_detail` і двічі у views. Правило для списків покупок — теж кілька разів, і вже по-різному:

```python title="hello_app/selectors.py (урок 41)"
def get_user_shopping_lists(user):                 # що показати в переліку
    user_groups = user.groups.all()
    return ShoppingList.objects.filter(
        Q(user=user) | Q(group__in=user_groups)    # ← + списки групи
    )...

def get_shopping_list_detail(user, pk):            # що відкрити на сторінці
    return ShoppingList.objects.prefetch_related(
        'items', 'shared_with'
    ).get(Q(user=user) | Q(shared_with=user), pk=pk)   # ← групи немає
```

Урок 41 додав групи в `get_user_shopping_lists`, а в `get_shopping_list_detail` — ні. Учасник групи бачить список у переліку, клацає — `404`. Кожна копія правила — ще одне місце, яке треба не забути змінити.

## Рефакторинг 1. Одне правило доступу — одна функція { #refactor-1 }

| Було (урок 41) | Стало (урок 45) | Навіщо |
|---|---|---|
| `Q(user=…) \| Q(…)` у views, у кількох selectors | `*_visible_to(user)` / `*_owned_by(user)` у `selectors.py` | правило змінюють в одному місці |
| `get_object_or_404(Модель, pk=pk, user=…)` у views | `get_object_or_404(selectors.todo_lists_owned_by(user), pk=pk)` | view каже, **яке** правило, а не **як** його перевірити |
| `Tag.objects.get(...)`, `Notebook.objects.filter(...)` у views і `api.py` | `selectors.find_owned(selectors.tags_owned_by, user, id)` | жодного `Model.objects` у транспортному шарі |
| сума покупок — цикл по пунктах у view | `pending_total` — `SUM` у selector | обчислення над даними — там, де дані |

```python title="hello_app/selectors.py (урок 45, фрагмент)"
def notes_visible_to(user):
    """Свої нотатки + нотатки груп користувача (group — FK: дублікатів рядків немає)."""
    return Note.objects.filter(Q(user=user) | Q(group__in=user.groups.all()))


def notes_owned_by(user):
    """Змінювати й видаляти — лише автор."""
    return Note.objects.filter(user=user)


def todo_lists_visible_to(user):
    """Свої + ті, якими поділились. shared_with — M2M: без distinct() список, поділений з двома,
    повернувся б двічі, і .get() кинув би MultipleObjectsReturned."""
    return TodoList.objects.filter(Q(user=user) | Q(shared_with=user)).distinct()


def shopping_lists_visible_to(user):
    """Свої + поділені + списки груп користувача — те саме правило для списку й сторінки списку."""
    return ShoppingList.objects.filter(
        Q(user=user) | Q(shared_with=user) | Q(group__in=user.groups.all())
    ).distinct()
```

Чому в `todo_lists_visible_to` є `.distinct()`, а в `notes_visible_to` — ні: покроково, що робить база з фільтром `Q(user=olena) | Q(shared_with=olena)` для списку «Ремонт», яким Олена поділилась з Анною й Бобом:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph J1["JOIN: список × проміжна таблиця shared_with"]
        direction LR
        r1["Ремонт · user=olena<br>shared=ann"] ~~~ r2["Ремонт · user=olena<br>shared=bob"]
    end
    subgraph J2["WHERE user = olena OR shared = olena"]
        direction LR
        w1["рядок 1: user = olena<br>так"] ~~~ w2["рядок 2: user = olena<br>так"]
    end
    subgraph J3[".get(pk=…) без distinct()"]
        direction LR
        g1["2 рядки"] --> g2["MultipleObjectsReturned<br>500"]
    end
    subgraph J4[".distinct().get(pk=…)"]
        direction LR
        d1["однакові рядки → 1"] --> d2["TodoList «Ремонт»"]
    end

    J1 --> J2 --> J3
    J2 --> J4

    class r1,r2 step
    class w1,w2 warning
    class g1 step
    class g2 error
    class d1 step
    class d2 success
```

Для Анни правдивий лише рядок з `shared=ann` — вона свій доступ отримує без помилки; падає саме **власник**. У `group` (FK) в кожного рядка одне значення — JOIN не множить рядків, `distinct()` не потрібен.

Функції повертають **QuerySet**, а не список: view чи CBV далі дописує `.get(pk=…)`, `.annotate(…)`, `prefetch_related(…)`, а правило доступу вже вбудоване в SQL. Той самий прийом у книзі — [`UserQuerySetMixin`](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/cbv/); тут його правило переїхало в selectors, щоб ним користувались і CBV, і функції, і API.

Views тепер лише вибирають правило:

```diff title="hello_app/views.py"
 @login_required
 def todo_list_edit(request, pk):
-    todo = get_object_or_404(
-        TodoList.objects.filter(Q(user=request.user) | Q(shared_with=request.user)),
-        pk=pk,
-    )
+    todo = get_object_or_404(selectors.todo_lists_visible_to(request.user), pk=pk)
     if todo.user != request.user:
         messages.error(request, 'Ти не можеш редагувати список іншого користувача.')

 @login_required
 def todo_item_toggle(request, pk):
-    item = get_object_or_404(TodoItem, pk=pk)
-    todo = item.todo_list
-    if todo.user != request.user and not todo.shared_with.filter(pk=request.user.pk).exists():
-        raise Http404
+    item = get_object_or_404(selectors.todo_items_visible_to(request.user), pk=pk)
```

### Тест, що стежить за правилом

Правило «у views немає ORM» легко порушити одним рядком. Тому його перевіряє тест — він читає код як дерево синтаксису (`ast`, урок 13) і шукає `.objects`, `Q(…)` і `get_object_or_404(Модель, …)`:

```python title="hello_app/tests_architecture.py (фрагмент)"
def orm_in_transport_layer(path: Path) -> list[str]:
    """Порушення правила «view не робить ORM»: Model.objects.… (крім .none()), Q(…),
    get_object_or_404(Модель, …) — правило доступу мало б жити в selectors."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    problems = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and node.attr == "objects":
            problems.append(f"{path.name}:{node.lineno} .objects")
        elif isinstance(node, ast.Name) and node.id == "Q":
            problems.append(f"{path.name}:{node.lineno} Q(...)")
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
              and node.func.id == "get_object_or_404" and isinstance(node.args[0], ast.Name)):
            problems.append(f"{path.name}:{node.lineno} get_object_or_404({node.args[0].id}, ...)")
    ...


class ThinTransportLayerTests(TestCase):
    def test_views_and_api_have_no_orm(self):
        for name in ("views.py", "api.py"):
            with self.subTest(name):
                self.assertEqual(orm_in_transport_layer(APP / name), [])
```

`Model.objects.none()` дозволено: це порожній QuerySet без запиту до бази (поле серіалізатора, схема OpenAPI). Другий тест перевіряє саму перевірку — на фрагменті коду уроку 41 вона знаходить порушення. Тест правила, який нічого не може знайти, нічого й не захищає.

А щоб копії правила не розходились, тест формулює його як **властивість**: «кожен список, який видно в переліку, відкривається»:

```python title="hello_app/tests_architecture.py (фрагмент)"
    def test_every_listed_shopping_list_opens(self):
        """Що видно в списку, те відкривається: одне правило доступу для списку й сторінки."""
        ...
        listed = [*selectors.get_user_shopping_lists(self.ann), *selectors.get_shared_shopping_lists(self.ann)]
        self.assertEqual({sl.title for sl in listed}, {"Своє", "На тиждень", "Від Боба"})
        for sl in listed:
            with self.subTest(sl.title):
                self.assertIsNotNone(selectors.get_shopping_list_detail(self.ann, sl.pk))
```

Поглиблено: [services і selectors — матриця відповідальності](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/services_and_selectors/), [selectors: мова домену замість мови ORM](https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/django_selectors_full/).

## Рефакторинг 2. Class-based views { #refactor-2 }

Нотатки, записники й теги — class-based views зі стартового `notes_project_cbv`. Порівняй редагування нотатки:

```python title="FBV (урок 41) — 30 рядків"
@login_required
def note_edit(request, pk):
    user_groups = request.user.groups.all()
    note = get_object_or_404(
        Note.objects.filter(Q(user=request.user) | Q(group__in=user_groups)), pk=pk)
    if note.user != request.user:
        messages.error(request, 'Ти не можеш редагувати нотатку іншого користувача.')
        return redirect('hello_app:note_detail', pk=pk)
    if request.method == 'POST':
        form = NoteForm(request.POST, instance=note, user=request.user)
        if form.is_valid():
            ...                                   # 10 рядків: поля форми → services.update_note
            return redirect('hello_app:note_detail', pk=note.pk)
    else:
        form = NoteForm(instance=note, user=request.user)
    return render(request, 'hello_app/note_form.html', {...})
```

```python title="CBV (урок 45)"
class NoteUpdateView(LoginRequiredMixin, OwnerRequiredMixin, NoteFormMixin, UpdateView):
    selector = selectors.notes_visible_to
    denied_message = 'Ти не можеш редагувати нотатку іншого користувача.'
    denied_url = 'hello_app:note_detail'
    denied_url_with_pk = True

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx.update(note=self.object, title=f'Редагувати: {self.object.title}', action='Зберегти зміни')
        return ctx

    def form_valid(self, form):
        note = services.update_note(self.object, **self.note_fields(form, tags_default=[]))
        messages.success(self.request, f'✅ Нотатку "{note.title}" оновлено!')
        return redirect('hello_app:note_detail', pk=note.pk)
```

`if request.method == 'POST'`, `form.is_valid()`, «порожня форма чи з `instance`» — усе це робить `UpdateView`. Лишилось те, що унікальне для нотатки: яке правило доступу, що робити з валідною формою, які підписи в шаблоні.

| Було (FBV) | Стало (CBV) | Хто робить |
|---|---|---|
| `@login_required` | `LoginRequiredMixin` — **перший** у списку базових класів | міксин |
| `get_object_or_404(Note.objects.filter(Q…), pk=pk)` | `selector = selectors.notes_visible_to` | `SelectorQuerySetMixin.get_queryset()` + `SingleObjectMixin.get_object()` |
| `if note.user != request.user: …` | `OwnerRequiredMixin` | один міксин для нотаток, видалення й будь-чого, що має `user` |
| `NoteForm(request.POST, instance=note, user=…)` | `NoteFormMixin.get_form_kwargs()` | `FormMixin` |
| поля форми → `services.update_note(...)` | `form_valid()` → `services.update_note(...)` | view; **не** `super().form_valid()` — той викликав би `form.save()` повз service |

Три міксини проєкту:

```python title="hello_app/views.py (фрагмент)"
class SelectorQuerySetMixin:
    """QuerySet для Detail/Update/Delete бере функція selectors — `UserQuerySetMixin` стартового коду."""
    selector = None

    def get_queryset(self):
        return type(self).selector(self.request.user)


class OwnerRequiredMixin(SelectorQuerySetMixin):
    """Бачити можна (група), змінювати — лише автор: повідомлення й повернення на сторінку об'єкта."""
    ...
    def dispatch(self, request, *args, **kwargs):
        obj = self.get_object()                       # 404, якщо об'єкт навіть не видно
        if obj.user_id != request.user.id:
            messages.error(request, self.denied_message)
            if self.denied_url_with_pk:
                return redirect(self.denied_url, pk=obj.pk)
            return redirect(self.denied_url)
        return super().dispatch(request, *args, **kwargs)
```

`type(self).selector` — а не `self.selector`: функція, записана як атрибут класу, при зверненні через екземпляр стала б **методом** і отримала б `self` першим аргументом.

### MRO: хто перевіряє першим

`OwnerRequiredMixin.dispatch()` звертається до бази. Якщо він спрацює раніше за перевірку входу, анонім отримає не редирект на логін, а помилку. Порядок визначає MRO — справжній, з Python:

```text
>>> ' → '.join(c.__name__ for c in NoteUpdateView.__mro__)
NoteUpdateView → LoginRequiredMixin → AccessMixin → OwnerRequiredMixin → SelectorQuerySetMixin → NoteFormMixin
→ UpdateView → SingleObjectTemplateResponseMixin → TemplateResponseMixin → BaseUpdateView → ModelFormMixin
→ FormMixin → SingleObjectMixin → ContextMixin → ProcessFormView → View → object
```

Покроково — учасник групи надсилає `POST /notes/7/edit/` для нотатки групи, автор якої інший:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph S1["as_view(): новий об'єкт NoteUpdateView на кожен запит"]
        direction LR
        a1["setup()<br>request, kwargs = {pk: 7}"] --> a2["до перевірки входу!<br>тут не можна ходити в базу"]
    end
    subgraph S2["dispatch() по MRO: LoginRequiredMixin"]
        direction LR
        b1{"request.user<br>увійшов?"} -- так --> b2["super().dispatch()"]
        b1 -- ні --> b3["302 на /accounts/login/"]
    end
    subgraph S3["dispatch(): OwnerRequiredMixin"]
        direction LR
        c1["get_object():<br>notes_visible_to(ann).get(pk=7)"] --> c2{"note.user_id<br>== ann.id?"}
        c2 -- ні --> c3["messages.error<br>302 на /notes/7/"]
    end
    subgraph S4["якби автор: View.dispatch() → post()"]
        direction LR
        d1["get_form() з instance"] --> d2["form_valid()<br>services.update_note"]
    end

    S1 --> S2 --> S3 --> S4

    class a1 step
    class a2 warning
    class b1,c2 decision
    class b2,c1 step
    class b3 warning
    class c3 error
    class d1,d2 success
```

Перший крок — пастка, на яку ми самі натрапили, переносячи `NoteListView`. У стартовому коді фільтри (`?tag=`, `?notebook=`) розбирав допоміжний метод; зручне місце, щоб зробити це «один раз на запит», здається `setup()`. Але `setup()` виконується **до** `dispatch()`, тобто до `LoginRequiredMixin`: анонім з `/notes/?tag=1` дійшов би до запиту `Tag.objects.get(user=AnonymousUser)` і отримав `TypeError`. Правильно — у `get()`, після всіх перевірок `dispatch()`:

```python title="hello_app/views.py — NoteListView (фрагмент)"
    def get(self, request, *args, **kwargs):
        """Фільтри з ?q=&tag=&notebook= — один раз на запит (потрібні і в get_queryset, і в контексті).

        Саме в get(), а не в setup(): setup() виконується ДО dispatch(), тобто до перевірки
        LoginRequiredMixin, — анонім дійшов би до запиту в базу з AnonymousUser.
        """
```

І тест, що анонім не робить **жодного** запиту до бази:

```python title="hello_app/tests_architecture.py (фрагмент)"
    def test_anonymous_is_redirected_before_any_query(self):
        """setup() виконується до dispatch(): якби фільтри читались там, анонім дійшов би до бази."""
        self.client.logout()
        with self.assertNumQueries(0):
            response = self.client.get("/notes/", {"tag": 1, "notebook": 1, "q": "план"})
        self.assertEqual(response.status_code, 302)
```

Списки справ, покупок, нагадування й групи лишились функціями — тонкими, без ORM. CBV — не мета: вони виграють там, де є типовий CRUD (список / сторінка / створити / змінити / видалити). Для «поділитись списком» з двома діями в одній формі функція читається простіше.

### `?next=` — лише адреса цього сайту

Після створення тегу `TagCreateView` повертає користувача туди, звідки він прийшов, — за адресою з `?next=`. Якщо адресу не перевіряти, посилання `…/tags/new/?next=https://evil.example/login` після створення тегу відправило б людину на чужий сайт, що виглядає як наш, — **відкритий редирект** (OWASP, урок 41). Правильно — пропускати лише адреси цього сайту; перевіряє функція Django:

```python title="hello_app/views.py — TagCreateView (фрагмент)"
    def next_url(self):
        """Куди повернутись після створення — лише адреса цього ж сайту (інакше ?next= веде на чужий)."""
        target = self.request.GET.get('next') or self.request.POST.get('next')
        if target and url_has_allowed_host_and_scheme(target, allowed_hosts={self.request.get_host()},
                                                      require_https=self.request.is_secure()):
            return target
        return reverse('hello_app:note_create')
```

Поглиблено: [CBV у Django-книзі — `as_view`, `dispatch`, generic views, `LoginRequiredMixin` і MRO, `UserQuerySetMixin`](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/cbv/), [типові помилки кроку 3](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/checkpoint/) (серед них `super().form_valid()` і `reverse()` в атрибуті класу).

## Рефакторинг 3. PostgreSQL через `DATABASE_URL` { #refactor-3 }

Крок 3 книги переводить нотатки на PostgreSQL. Щоб тести, ноутбук і Colab і далі працювали без сервера, база — з однієї змінної середовища, як у `news_hub` (урок 39):

```python title="hello_project/database.py (фрагмент)"
def database_from_url(url: str | None, *, base_dir: Path) -> dict[str, Any]:
    """postgres://user:pass@host:port/name?sslmode=require → словник для DATABASES["default"]."""
    if not url:
        return {"ENGINE": ENGINES["sqlite"], "NAME": base_dir / "db.sqlite3"}
    parts = urlsplit(url)
    if parts.scheme not in ENGINES:
        raise ValueError(f"DATABASE_URL: невідома схема {parts.scheme!r} (postgres:// або sqlite://)")
    ...
    return {
        "ENGINE": ENGINES[parts.scheme],
        "NAME": unquote(parts.path.lstrip("/")),
        "USER": unquote(parts.username or ""),
        "PASSWORD": unquote(parts.password or ""),   # пароль із @ чи : — закодований (%40, %3A)
        "HOST": parts.hostname or "",
        "PORT": str(parts.port or ""),
        "CONN_MAX_AGE": 60,                       # тримати з'єднання між запитами (сторінка книги postgresql)
        "OPTIONS": dict(parse_qsl(parts.query)),  # напр. ?sslmode=require
    }
```

```diff title="hello_project/settings.py"
-DATABASES = {
-    "default": {
-        "ENGINE": "django.db.backends.sqlite3",
-        "NAME": BASE_DIR / "db.sqlite3",
-    }
-}
+# Урок 45: база — з DATABASE_URL (PostgreSQL у docker compose); без змінної — SQLite, як і раніше
+DATABASES = {"default": database_from_url(os.environ.get("DATABASE_URL"), base_dir=BASE_DIR)}
```

Книга робить те саме через `python-decouple`; готовий пакет для URL — `dj-database-url`. Тут 30 рядків стандартної бібліотеки: видно, що всередині, і немає ще однієї залежності. Драйвер — `psycopg[binary]` (psycopg 3; Django 5.2 підтримує від 3.1.8), сервер — `docker-compose.yml` з тими самими `notes_db` / `notes_user` / `notes_pass`, що в книзі:

```bash
docker compose up -d db
export DATABASE_URL=postgres://notes_user:notes_pass@localhost:5432/notes_db   # Windows: set DATABASE_URL=...
python manage.py migrate
python manage.py test
```

Ті самі 49 тестів проходять на обох базах. На PostgreSQL — справжній запуск (PostgreSQL 16):

```text
$ DATABASE_URL=postgres://notes_user:notes_pass@localhost:5434/notes_db python manage.py test
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
.................................................
----------------------------------------------------------------------
Ran 49 tests in 35.592s

OK
```

### Кількість запитів — теж контракт

N+1 (сторінка робить по запиту на кожен рядок) у проєкті немає: selectors уже мають `select_related` / `prefetch_related` / `annotate`. Заміряли на сторінках з 5 і з 50 нотатками — кількість запитів однакова:

| Сторінка | 5 рядків | 50 рядків |
|---|---|---|
| `/notes/` | 8 | 8 |
| `/notebooks/` | 7 | 7 |
| `/shopping/<pk>/` | 10 | 10 |
| `/todo/<pk>/` | 10 | 10 |

Щоб так і лишилось, тест порівнює кількість запитів на 3 і на 30 рядках. Що він ловить — справжній замір `/notes/`, коли `get_user_notes` забуває `select_related('notebook', 'group').prefetch_related('tags')`:

```text
з select_related / prefetch_related:   3 нотатки →  8 запитів | 30 нотаток →  8 запитів
без них:                               3 нотатки → 16 запитів | 30 нотаток → 97 запитів
```

Кожна нотатка на сторінці дотягує записник, групу й теги окремими запитами — `3 × кількість нотаток` зверху. На 3 нотатках різниці майже не видно, тому тест і міряє на двох розмірах.

Поглиблено: [PostgreSQL у кроці 3 книги](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/postgresql/), [N+1, `select_related`, `prefetch_related`, `F()`, `transaction.atomic`](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/queryset_deep/).

## Каталог патернів: два проєкти, одні ідеї { #patterns }

**Патерн** — назва для рішення, яке повторюється: «проблема такого типу розв'язується такою формою коду». Назва не робить код кращим. Вона допомагає дві речі: швидко пояснити колезі рішення («тут декоратор над клієнтом») і впізнати його в чужому коді. Усі патерни нижче вже є в наших двох проєктах — ми їх лише називаємо.

| Патерн | Яку проблему розв'язує | Нотатки (Django) | Агрегатор `news_hub` (FastAPI) |
|---|---|---|---|
| **Шари** (транспорт → логіка → дані) | зміна в одному місці не ламає інші | `views.py` / `api.py` → `services` / `selectors` → ORM | `api.py` → `analysis.py` / `repository.py` → SQLAlchemy |
| **Service layer** | бізнес-дія (транзакція, кілька таблиць) — одна функція для сторінки, API, фонової задачі | `services.create_note(...)` | `analyze_news(...)`, `run_analyze_job(...)` |
| **CQRS-light** (читання окремо від запису) | запити для показу оптимізують інакше, ніж зміни | `selectors` читають, `services` пишуть | `NewsRepository.find` / `stats` проти `add_many` / `save_analysis` |
| **Repository** | увесь доступ до даних за інтерфейсом; тести без SQL | ORM Django уже є репозиторієм (`Note.objects`); selectors — «запити домену» | `BaseRepository` / `NewsRepository` — «увесь SQL в одному місці» |
| **Dependency Injection** | залежність приходить ззовні → її можна підмінити | `get_queryset()`, `get_form_kwargs()` — CBV питає, а не створює | `Depends(get_repo)`, `Depends(get_llm)`, `dependency_overrides` у тестах |
| **Strategy** (через `Protocol`) | кілька взаємозамінних реалізацій однієї ролі | `selector = selectors.notes_visible_to` — правило як параметр | `LLMClient`: `GeminiClient`, `AnthropicClient`, `FakeLLM` |
| **Decorator / Proxy** | додати поведінку, не змінюючи об'єкт і його інтерфейс | `LoginRequiredMixin` загортає `dispatch()` | `GuardedLLM(client, breaker)` — той самий `generate()` + circuit breaker |
| **Factory** | вибір класу за конфігурацією — в одному місці | `database_from_url(...)` → налаштування потрібної бази | `make_llm()` за `LLM_PROVIDER` |
| **Template method** | каркас алгоритму фіксований, кроки перевизначають | `UpdateView`: `get_object` → `get_form` → `form_valid` | — |
| **Unit of Work** | кілька змін — або всі, або жодної | `transaction.atomic()` у services | сесія на запит + `COMMIT` у `get_db` |

Структура `news_hub` — хто від кого залежить і де стоїть кожен патерн:

```mermaid
graph LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    API["api.py<br>ендпоінти"] -- "Depends — DI" --> REPO["NewsRepository<br>Repository"]
    API -- "Depends — DI" --> GUARD["GuardedLLM<br>Decorator"]
    API --> AN["analyze_news<br>Service"]
    AN --> P["LLMClient (Protocol)<br>Strategy"]
    GUARD --> P
    P -.-> G["GeminiClient"]
    P -.-> A["AnthropicClient"]
    P -.-> F["FakeLLM"]
    MK["make_llm()<br>Factory"] --> G
    MK --> A
    MK --> F
    REPO --> DB["get_db<br>сесія + COMMIT — Unit of Work"]

    class API step
    class AN,REPO success
    class P decision
    class GUARD,MK warning
    class G,A,F,DB step
```

І та сама думка в нотатках — запит `POST /notes/7/edit/` від автора через шари:

```mermaid
sequenceDiagram
    participant B as браузер
    participant V as NoteUpdateView
    participant S as selectors
    participant SV as services
    participant DB as PostgreSQL / SQLite

    B->>V: POST /notes/7/edit/
    V->>V: LoginRequiredMixin.dispatch — увійшов
    V->>S: notes_visible_to(user)
    S-->>V: QuerySet (правило доступу вже в SQL)
    V->>DB: .get(pk=7)
    DB-->>V: Note
    V->>V: OwnerRequiredMixin — автор? так
    V->>V: form.is_valid()
    V->>SV: update_note(note, title=…, tag_ids=…)
    SV->>DB: UPDATE … (update_fields) + теги
    SV-->>V: Note
    V-->>B: 302 → /notes/7/
```

View не знає SQL, selector не знає HTTP, service не знає форм. Тому ту саму `services.update_note` викликають і сторінка, і `api.py`, а в уроці 46 її викличе ще й WebSocket-обробник чату.

### Коли патерн — зайвий

Кожен патерн — ще один рівень, який треба прочитати, щоб зрозуміти код. Він окупається, коли розв'язує **наявну** проблему:

- `LLMClient` з трьома реалізаціями виправданий: провайдерів справді два, а тестам потрібен третій — фейк. Інтерфейс «на майбутнє» з однією реалізацією — лише зайвий файл;
- окремий `NoteRepository` поверх ORM Django у нотатках нічого не додав би: `Note.objects` і selectors уже дають і інтерфейс, і місце для запитів;
- CBV для «поділитись списком» заховав би дві гілки форми в перевизначених методах — функція тут читається простіше.

Куди класти новий код:

```mermaid
flowchart TD
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    Q1{"код знає про HTTP:<br>request, форма, статус?"}
    Q2{"змінює дані?"}
    Q3{"вирішує, хто<br>що бачить?"}
    Q4{"властивість одного<br>об'єкта без запитів?"}
    V["view / api.py<br>тонкий: розібрати запит, викликати, відповісти"]
    SV["services.py<br>+ transaction.atomic"]
    SEL["selectors.py<br>*_visible_to / *_owned_by"]
    SEL2["selectors.py<br>запит для показу"]
    M["models.py<br>метод чи property"]

    Q1 -- так --> V
    Q1 -- ні --> Q2
    Q2 -- так --> SV
    Q2 -- ні --> Q3
    Q3 -- так --> SEL
    Q3 -- ні --> Q4
    Q4 -- так --> M
    Q4 -- ні --> SEL2

    class Q1,Q2,Q3,Q4 decision
    class V step
    class SV,SEL,SEL2,M success
```

Поглиблено: [архітектура застосунку — частина VI Django-книги](https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/), [services](https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/django_services_full/), [services, selectors і серіалізатори разом](https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/services_selectors_full/).

## Архітектура: до і після { #architecture }

```mermaid
graph LR
    classDef step     fill:#eceff1,stroke:#546e7a,stroke-width:1px,color:#1a1a1a;
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#1a1a1a;
    classDef success  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1a1a1a;
    classDef error    fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#1a1a1a;
    classDef warning  fill:#fff8e1,stroke:#e65100,stroke-width:2px,color:#1a1a1a;

    subgraph B["урок 41"]
        V40["views.py<br>FBV + Q(...) + objects"] --> R40a["правило доступу<br>копія у view"]
        S40["selectors.py"] --> R40b["правило доступу<br>копія в selector"]
        A40["api.py<br>+ Notebook.objects"] --> R40c["ще копія"]
        V40 --> S40
        A40 --> S40
    end
    subgraph A["урок 45"]
        V44["views.py<br>CBV + тонкі FBV"] --> S44["selectors.py<br>*_visible_to / *_owned_by"]
        A44["api.py"] --> S44
        V44 --> SV44["services.py"]
        A44 --> SV44
        S44 --> DB44["DATABASE_URL<br>PostgreSQL / SQLite"]
        SV44 --> DB44
        T44["tests_architecture.py"] -. "ast: у views немає ORM" .-> V44
    end
    B ~~~ A

    class V40,S40,A40 step
    class R40a,R40b,R40c error
    class V44,A44 step
    class S44,SV44 success
    class DB44 decision
    class T44 warning
```

- **Одне правило — одне місце.** Зміна правила доступу (новий тип спільного доступу) — одна функція в `selectors.py`; views, CBV і API підхоплюють її самі.
- **Транспорт тонкий.** `views.py` і `api.py` розбирають запит, вибирають правило, викликають service і формують відповідь. ORM у них немає — це перевіряє тест, а не домовленість.
- **База — конфігурація.** Код не знає, SQLite це чи PostgreSQL: той самий набір тестів на обох.

### Тести

```text
$ python manage.py test
.................................................
----------------------------------------------------------------------
Ran 49 tests in 32.825s

OK
```

Більшість часу — хешування паролів у `create_user` (PBKDF2 навмисно повільний, урок 41).

Було 29 тестів (урок 41), стало 49; старі не змінено — CBV мають ті самі URL і ту саму поведінку. `tests_architecture.py` на коді уроку 41 дає 10 червоних тестів. Сім із них — справжні вади: ORM у `views.py` і `api.py`, `MultipleObjectsReturned` на списку, поділеному з двома, список групи з `404` (два тести), відкритий редирект `?next=` (дві адреси). Решта три падають, бо нових функцій (`OwnerRequiredMixin`, `get_group_member`, `pending_total`) ще немає. Нові тести перевірено мутаціями: 14 навмисних поломок (прибрати `distinct()`, дозволити не-автору змінювати, пропустити `?next=` без перевірки, забути `is_pinned`, прибрати `select_related`…) — кожну ловить хоча б один тест.

## Мінімальні версії залежностей { #min-versions }

Прогін на мінімальних версіях `requirements.txt` (Python 3.10) показав, що проєкт з `django-debug-toolbar` 4.0 не запускається:

```text
ImportError: cannot import name 'get_storage_class' from 'django.core.files.storage'
```

`get_storage_class` прибрали в Django 5.1, а `debug_toolbar_urls()`, який використовує `urls.py`, з'явився в debug-toolbar 4.4. Нижня межа тепер `django-debug-toolbar>=4.4.3`. З нею й `psycopg` 3.1.8 усі 49 тестів проходять на SQLite і на PostgreSQL 16.

## Практика { #practice }

### Розібраний приклад: нагадування для групи

Нагадування до нотатки зараз може створити лише її автор (`notes_owned_by` у `reminder_create`). Нове правило: учасник групи теж додає нагадування до нотатки групи, а видаляє нагадування — як і раніше, лише автор нотатки.

1. Правило «хто додає» вже існує — `notes_visible_to`. У view змінюється одне слово:

    ```diff title="hello_app/views.py"
     @login_required
     def reminder_create(request, note_pk):
    -    note = get_object_or_404(selectors.notes_owned_by(request.user), pk=note_pk)
    +    note = get_object_or_404(selectors.notes_visible_to(request.user), pk=note_pk)
    ```

2. Правило «хто видаляє» не змінюється: `reminders_owned_by` (нагадування на нотатках користувача).

3. Тест — обидві половини правила:

    ```python title="hello_app/tests_architecture.py (розв'язок)"
    def test_group_member_adds_reminder_but_cannot_delete(self):
        olena = User.objects.create_user("olena")
        ann = User.objects.create_user("ann")
        group = services.create_group(name="Сім'я", creator=olena)
        services.add_user_to_group(group, "ann")
        note = services.create_note(user=olena, title="Спільна", group=group)
        self.client.force_login(ann)
        when = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M")
        response = self.client.post(f"/notes/{note.pk}/reminders/add/", {"remind_at": when, "repeat_pattern": "none"})
        self.assertRedirects(response, f"/notes/{note.pk}/")
        reminder = Reminder.objects.get(note=note)
        self.assertEqual(self.client.post(f"/reminders/{reminder.pk}/delete/").status_code, 404)
    ```

`views.py` змінився на одне слово, `tests_architecture` лишився зеленим: нове правило склали з наявних.

### Зміни приклад

1. Прибери `.distinct()` з `todo_lists_visible_to` і запусти `python manage.py test hello_app.tests_architecture`. Який тест впав і з якою помилкою?
2. Постав `OwnerRequiredMixin` **перед** `LoginRequiredMixin` у `NoteUpdateView` і відкрий `/notes/1/edit/` без входу. Що бачиш і чому?

### Спробуй самостійно: CBV для списків справ

Перепиши `todo_list_list`, `todo_list_detail`, `todo_list_edit`, `todo_list_delete` на `ListView` / `DetailView` / `UpdateView` / `DeleteView` з міксинами проєкту.

**Критерії перевірки:** URL і імена маршрутів ті самі; усі 49 тестів зелені без змін; `tests_architecture` зелений (жодного `TodoList.objects` у `views.py`); учасник, з яким поділено список, бачить його (`200`), але редагування повертає його на сторінку списку з повідомленням.

### Знайди помилку { #find-bug }

Selector і тест з проєкту — обидва правильні на вигляд, тест зелений:

```python
def get_todo_list_detail(user, pk):
    try:
        return TodoList.objects.prefetch_related(
            'items', 'shared_with'
        ).get(Q(user=user) | Q(shared_with=user), pk=pk)
    except TodoList.DoesNotExist:
        return None


def test_shared_user_opens_list(self):
    todo = services.create_todo_list(user=self.olena, title="Ремонт")
    services.share_todo_list(todo, "ann")
    self.assertEqual(selectors.get_todo_list_detail(self.ann, todo.pk), todo)
    self.assertEqual(selectors.get_todo_list_detail(self.olena, todo.pk), todo)
```

Олена ділиться списком ще й з Бобом — і її власна сторінка списку падає з `500`:

```text
поділено з 1: 📋 Ремонт
MultipleObjectsReturned: get() returned more than one TodoList -- it returned 2!
```

Чому? І чому тест цього не побачив?

??? success "Відповідь"

    `shared_with` — зв'язок **багато-до-багатьох**. Щоб перевірити `Q(shared_with=user)`, Django приєднує проміжну таблицю, і кожен, з ким поділено список, дає окремий рядок:

    ```text
    FROM "hello_app_todolist" LEFT OUTER JOIN "hello_app_todolist_shared_with"
      ON ("hello_app_todolist"."id" = "hello_app_todolist_shared_with"."todolist_id")
    WHERE ("hello_app_todolist"."user_id" = 1 OR "hello_app_todolist_shared_with"."user_id" = 1)
    ```

    Для Олени умова `user_id = 1` правдива в **обох** рядках (з Анною і з Бобом) — `.get()` отримує 2 рядки й кидає `MultipleObjectsReturned`. Для Анни правдивий лише один рядок, тож вона список відкриває.

    Тест перевіряв список, поділений з **однією** людиною — там рядок один. Межовий випадок — «поділено з двома». Правильно — `.distinct()` у правилі доступу (`todo_lists_visible_to`), і тест саме на два поділи. FK (`group`) такої проблеми не має: у кожного рядка одна група.

## Підсумок

| Поняття | Що запам'ятати |
|---|---|
| Шари | транспорт (views, API) → service / selector → ORM; кожен знає лише сусіда нижче |
| Правило доступу | `*_visible_to` / `*_owned_by` у selectors, повертають QuerySet; одне правило для всіх входів |
| Тест архітектури | `ast`: у `views.py` / `api.py` немає `.objects`, `Q(…)`, `get_object_or_404(Модель, …)`; властивість «що видно — відкривається» |
| CBV | `as_view` → `setup` → `dispatch` (міксини по MRO) → `get`/`post`; `LoginRequiredMixin` — першим; до `dispatch` — нічого з базою |
| `form_valid` | викликає service, а не `super().form_valid()` (той зробив би `form.save()`) |
| M2M + OR | дублікати рядків → `.distinct()`; `.get()` на них — `MultipleObjectsReturned` |
| `DATABASE_URL` | одна змінна — PostgreSQL чи SQLite; ті самі тести на обох |
| Кількість запитів | тест: 3 і 30 рядків — однаково запитів |
| Патерни | Service layer, CQRS-light, Repository, DI, Strategy, Decorator, Factory, Template method, Unit of Work — у наших двох проєктах; патерн окупається, коли розв'язує наявну проблему |

### Самоперевірка

1. Чому правило доступу краще повертати як QuerySet, а не як `True`/`False` для одного об'єкта?
2. Що станеться, якщо поставити `OwnerRequiredMixin` перед `LoginRequiredMixin`?
3. Чому фільтри `NoteListView` читаються в `get()`, а не в `setup()`?
4. Де в `news_hub` Strategy, а де Decorator, і чим вони відрізняються?
5. Навіщо тест, який перевіряє сам тест архітектури?
6. Чому для нотаток не потрібен окремий клас-репозиторій, а для `news_hub` — корисний?

??? success "Відповіді"

    1. QuerySet можна доповнити (`.get(pk=…)`, `.annotate`, `prefetch_related`, пагінація), а правило стає частиною SQL: база не віддає чужих рядків узагалі. Перевірка «так/ні» працює з уже завантаженим об'єктом — її легко забути викликати, і вона не допомагає списку.
    2. Анонім дійде до `OwnerRequiredMixin.dispatch()` раніше за перевірку входу: `get_object()` з `AnonymousUser` у фільтрі — помилка, а не редирект на логін.
    3. `setup()` виконується до `dispatch()`, тобто до `LoginRequiredMixin`. Запит до бази там — запит від ще не перевіреного користувача (для аноніма — `TypeError`).
    4. Strategy — `LLMClient`: взаємозамінні реалізації однієї ролі (Gemini, Anthropic, фейк). Decorator — `GuardedLLM`: той самий інтерфейс, обгортає **будь-яку** реалізацію і додає поведінку (breaker). Strategy міняє «хто робить», Decorator додає «що ще відбувається навколо».
    5. Тест, що не здатний знайти порушення, завжди зелений і нічого не захищає. Перевірка на навмисно поганому фрагменті доводить, що правило справді ловить `.objects`, `Q` і `get_object_or_404(Модель…)`.
    6. У Django ORM уже є репозиторієм: `Note.objects` — інтерфейс до таблиці, а selectors дають запити мовою домену. У `news_hub` репозиторій ховає SQLAlchemy й діалекти (`ON CONFLICT` для PostgreSQL і SQLite) — без нього цей SQL розповзся б по ендпоінтах.

### Що далі

- Ноутбук заняття: [Відкрити вправи в Colab](https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_45_architecture_patterns/note_lesson_45_architecture_student.ipynb){ .md-button .md-button--primary } [Переглянути розв’язки](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_4/lessons/lesson_45_architecture_patterns/note_lesson_45_architecture.ipynb){ .solutions-link }.
- Урок 46 — чат на WebSocket: ще один транспорт (consumer) над тими самими services і selectors.
- Урок 48 — Telegram-бот агрегатора: ще один транспорт над `analyze_news` і `NewsRepository`.

## Документація і джерела

- Код: [`crispy_notes_project`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_45_architecture_patterns/crispy_notes_project) — проєкт уроку 41 + CBV зі стартового `notes_project_cbv`; [`news_hub`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/tree/main/module_4/lessons/lesson_44_llm_api/news_hub) уроку 44.
- Django-книга, крок 3: [огляд](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/), [services і selectors](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/services_and_selectors/), [CBV](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/cbv/), [QuerySet глибше](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/queryset_deep/), [PostgreSQL](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/postgresql/), [типові помилки](https://nikoriakviktor.github.io/notes_chat_app/tutorials/03_crud_and_architecture/checkpoint/); частина VI — [архітектура застосунку](https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/).
- Django: [class-based views](https://docs.djangoproject.com/en/5.2/topics/class-based-views/), [generic editing views](https://docs.djangoproject.com/en/5.2/ref/class-based-views/generic-editing/), [`LoginRequiredMixin`](https://docs.djangoproject.com/en/5.2/topics/auth/default/#the-loginrequiredmixin-mixin), [`distinct()`](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#distinct), [`assertNumQueries`](https://docs.djangoproject.com/en/5.2/topics/testing/tools/#django.test.TransactionTestCase.assertNumQueries), [PostgreSQL notes](https://docs.djangoproject.com/en/5.2/ref/databases/#postgresql-notes); [`url_has_allowed_host_and_scheme`](https://github.com/django/django/blob/stable/5.2.x/django/utils/http.py).
- Python: [`ast`](https://docs.python.org/3/library/ast.html), [`urllib.parse.urlsplit`](https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlsplit), [MRO](https://docs.python.org/3/howto/mro.html).
- Патерни: Martin Fowler — [Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html), [Repository](https://martinfowler.com/eaaCatalog/repository.html), [Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html), [CQRS](https://martinfowler.com/bliki/CQRS.html); [refactoring.guru — Strategy, Decorator, Factory Method, Template Method](https://refactoring.guru/uk/design-patterns/catalog).
- [Довідник: FastAPI — архітектура, async і production-патерни](fastapi/fastapi_documentation.md): §5 DI, §7 Repository, §8 Unit of Work.
