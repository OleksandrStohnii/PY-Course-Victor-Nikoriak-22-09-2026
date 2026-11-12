# `eval()` в Python: від «зручної функції» до «дірки в безпеці»

Довідник про вбудовану функцію `eval()` — що вона робить, чому вона небезпечна з чужим вводом, і чим її замінити залежно від задачі. Наскрізний приклад — CLI-калькулятор без `eval()` ([`cli_calculator.py`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_1/lessons/lesson_13_modules_stdlib/calculator_project/cli_calculator.py)); `calculator_project/` лежить у папці Уроку 13 (`lesson_13_modules_stdlib/`, модулі та `import`); концептуально пов'язаний також з Уроком 18 (міні-проєкт CLI).

## Що таке `eval()`?

`eval()` — вбудована функція Python, яка **виконує рядок як Python-вираз** і повертає результат:

```python
eval(expression, globals=None, locals=None)
```

| Параметр | Тип | Опис |
|----------|-----|------|
| `expression` | `str` | Рядок з Python-виразом |
| `globals` | `dict` або `None` | Глобальні змінні, доступні у виразі |
| `locals` | `dict` або `None` | Локальні змінні, доступні у виразі |

```text
eval("2 + 3 * 4")

рядок "2 + 3 * 4"  →  Python парсить  →  виконує  →  повертає 14
```

### `eval()` проти `exec()`

| Функція | Що робить | Повертає |
|---------|-----------|----------|
| `eval(expr)` | Виконує **вираз** (expression) | Значення виразу |
| `exec(code)` | Виконує **код** (statements) | `None` |

### Базові приклади

```python
result = eval("2 + 3 * 4")
print(f"eval('2 + 3 * 4') = {result}")
print(f"Тип результату: {type(result).__name__}")

expressions = ["10 + 5", "10 - 5", "10 * 5", "10 / 3", "10 // 3", "10 % 3", "2 ** 8", "(3 + 5) * 4"]
for expr in expressions:
    r = eval(expr)
    print(f"{expr!r:<15} -> {r!r} ({type(r).__name__})")
```

```text
eval('2 + 3 * 4') = 14
Тип результату: int

'10 + 5'        -> 15 (int)
'10 - 5'        -> 5 (int)
'10 * 5'        -> 50 (int)
'10 / 3'        -> 3.3333333333333335 (float)
'10 // 3'       -> 3 (int)
'10 % 3'        -> 1 (int)
'2 ** 8'        -> 256 (int)
'(3 + 5) * 4'   -> 32 (int)
```

### `eval()` бачить поточні змінні

```python
number = 9
greeting = "Привіт"
pi = 3.14159

print(eval("number * number"))       # 81
print(eval("number ** 0.5"))         # 3.0
print(eval("pi * 2"))                # 6.28318
print(eval("len(greeting)"))         # 6
print(eval("greeting.upper()"))      # ПРИВІТ
```

`eval()` бачить **усі** змінні поточного scope — це і зручно, і, як стане видно нижче, небезпечно.

### `eval()` підтримує будь-який вираз — не тільки арифметику

```python
import math

examples = [
    "math.sqrt(16)",
    "math.factorial(5)",
    "abs(-42)",
    "round(3.14159, 2)",
    "max(1, 5, 3, 2)",
    "[x**2 for x in range(5)]",  # навіть list comprehension
]
for expr in examples:
    print(f"eval({expr!r}) -> {eval(expr)}")
```

```text
eval('math.sqrt(16)') -> 4.0
eval('math.factorial(5)') -> 120
eval('abs(-42)') -> 42
eval('round(3.14159, 2)') -> 3.14
eval('max(1, 5, 3, 2)') -> 5
eval('[x**2 for x in range(5)]') -> [0, 1, 4, 9, 16]
```

## Параметри `globals` та `locals`

`eval()` приймає два необов'язкові словники, що контролюють **яке середовище** бачить вираз:

```text
Пошук змінної у eval():
  1. locals  (якщо переданий)
  2. globals (якщо переданий)
  3. Стандартні builtins (якщо globals не забороняє)
```

| Виклик | Що доступно у виразі |
|--------|----------------------|
| `eval(expr)` | Всі глобальні + локальні змінні + builtins |
| `eval(expr, {})` | Тільки builtins |
| `eval(expr, {'__builtins__': None})` | НІЧОГО (навіть `print` недоступний) |
| `eval(expr, {'sqrt': math.sqrt})` | Тільки `sqrt` + builtins |
| `eval(expr, {'__builtins__': None}, {'x': 5})` | Тільки `x` |

### Контроль через `globals`

```python
import math

result1 = eval("math.sqrt(16)")
print(result1)  # 4.0 — без обмежень, eval() бачить усе

try:
    result2 = eval("math.sqrt(16)", {})   # порожній globals — math недоступний
except NameError as e:
    print(f"NameError: {e}")

allowed = {"sqrt": math.sqrt, "pi": math.pi}
result3 = eval("sqrt(16) + pi", allowed)
print(f"{result3:.4f}")
```

```text
4.0
NameError: name 'math' is not defined
7.1416
```

`globals` дозволяє точно контролювати, які символи доступні у виразі — аж до перейменування функцій під власні імена:

```python
custom_names = {
    "square_root": math.sqrt,
    "power":       pow,
    "cube":        lambda x: x ** 3,
    "__builtins__": None,   # забороняємо стандартні builtins
}

for expr in ["square_root(25)", "power(2, 10)", "cube(4)"]:
    print(f"{expr} = {eval(expr, custom_names)}")
```

```text
square_root(25) = 5.0
power(2, 10) = 1024
cube(4) = 64
```

`globals` і `locals` можна передати разом — `locals` при цьому перекриває `globals`:

```python
a = 169
globals_dict = {"__builtins__": None, "sqrt": math.sqrt}
locals_dict = {"a": a, "b": 25}
print(eval("sqrt(a) + sqrt(b)", globals_dict, locals_dict))   # 18.0

globals_dict2 = {"x": 100}
locals_dict2 = {"x": 5}
print(eval("x * 2", globals_dict2, locals_dict2))   # 10 — locals перемогли
```

## Чому `eval()` небезпечний

!!! danger "Головне правило безпеки"
    Ніколи не передавайте в `eval()` дані від користувача без суворої фільтрації.

`eval()` виконує **будь-який Python вираз** — включно з викликом `__import__()` для завантаження будь-якого модуля, виконанням системних команд через `os.system()`, читанням/записом файлів і доступом до `__builtins__`, а через нього — до всього Python:

```text
Ваш код:           print(eval(input("Вираз: ")))

Звичайний ввід:     2 + 2                                   → 4  ✅

Шкідливий ввід:
  __import__("os").system("whoami")   → виконує системну команду ❌
  __import__("os").system("ls /")     → читає список файлів     ❌
  open("/etc/passwd").read()          → читає довільні файли    ❌
  __import__("shutil").rmtree(".")    → видаляє файли           ❌
```

> «Я зробив калькулятор через `eval()`!» — «Ти зробив Remote Code Execution вразливість.»

Ось таблиця ризику для кількох типових рядків вводу (навмисно НЕ виконуємо шкідливі з них — лише класифікуємо):

```text
Ввід користувача                              Ризик
----------------------------------------------------------------
'2 + 2'                                       ✅ безпечний
'__import__("os").getcwd()'                   ⚠️  читає поточну папку
'__import__("os").system("whoami")'           ❌ ВИКОНУЄ системну команду
'open("passwords.txt").read()'                ❌ ЧИТАЄ файли на диску
'[x for x in ().__class__.__bases__[0].__subclasses__()]'   💀 дістає доступ до всіх класів Python
```

### Навіть «захищений» `eval()` можна обійти

Заборона `__builtins__` не рятує сама по собі — через ланцюжок `__class__` / `__subclasses__` можна дістатись до довільних класів Python, включно з тими, що дають доступ до `os`/`subprocess`:

```python
safe_globals = {"__builtins__": None}

result = eval("2 + 2", safe_globals)
print(result)   # 4 — прості вирази й далі працюють

exploit_expr = "().__class__.__bases__[0].__subclasses__()"
subclasses = eval(exploit_expr, safe_globals)
print(len(subclasses))   # кілька сотень підкласів — серед них можна знайти шлях до os/subprocess
```

```text
4
236
```

**Висновок:** надійно захистити `eval()` від зловмисника **дуже складно**. Найкращий захист — не використовувати `eval()` із user input взагалі.

## Безпечні альтернативи

Яку альтернативу обрати, залежить від задачі:

| Задача | Альтернатива |
|---|---|
| Прочитати одне число/дату з рядка | явне перетворення типу (`int()`, `float()`, `datetime.fromisoformat()` тощо) |
| Прочитати структуровані дані (списки, словники) у відомому, довіреному форматі | `json.loads()` |
| Прочитати рядок, що є Python-літералом (число, список, словник, кортеж, множина, bool, `None`) | `ast.literal_eval()` |
| Обчислити арифметичний вираз від користувача | власний парсер (нижче) або бібліотека для безпечної математики |

### Варіант А — явне перетворення типів

Найпростіший і найнадійніший спосіб для одного значення очікуваного типу:

```python
age = int(input("Вік: "))          # ValueError, якщо не число — і це нормально, це очікувана помилка
price = float(input("Ціна: "))
```

Жодного виконання довільного коду тут неможливе в принципі — `int()`/`float()` вміють перетворювати лише рядок у число, більше нічого.

### Варіант Б — `json.loads()` для структурованих даних

Якщо дані приходять у форматі JSON (наприклад, з конфіг-файлу, API, фронтенду) — `json.loads()` розбирає лише JSON-синтаксис, без жодного виконання коду:

```python
import json

data = json.loads('{"name": "Alice", "scores": [95, 87, 92]}')
print(data, type(data))   # {'name': 'Alice', 'scores': [95, 87, 92]} <class 'dict'>
```

### Варіант В — `ast.literal_eval()` для Python-літералів

`ast.literal_eval()` розбирає рядок як **абстрактне синтаксичне дерево** і дозволяє лише вузли, що є літералами — числа, рядки, списки, словники, кортежі, множини, `True`/`False`/`None`. Будь-який виклик функції, доступ до атрибута чи інший виконуваний вираз відхиляється з `ValueError`/`SyntaxError`:

```python
import ast

safe_inputs = ["42", "3.14", "[1, 2, 3]", "{'name': 'Alice', 'age': 25}", "(1, 2, 3)", "True"]
unsafe_inputs = ["2 + 2", "os.system('ls')", "__import__('os')"]

for s in safe_inputs:
    print(f"ast.literal_eval({s!r}) -> {ast.literal_eval(s)!r}")

for s in unsafe_inputs:
    try:
        ast.literal_eval(s)
    except (ValueError, SyntaxError) as e:
        print(f"ast.literal_eval({s!r}) -> заблоковано: {type(e).__name__}")
```

```text
ast.literal_eval('42') -> 42
ast.literal_eval('3.14') -> 3.14
ast.literal_eval('[1, 2, 3]') -> [1, 2, 3]
ast.literal_eval("{'name': 'Alice', 'age': 25}") -> {'name': 'Alice', 'age': 25}
ast.literal_eval('(1, 2, 3)') -> (1, 2, 3)
ast.literal_eval('True') -> True
ast.literal_eval('2 + 2') -> заблоковано: ValueError
ast.literal_eval("os.system('ls')") -> заблоковано: ValueError
ast.literal_eval("__import__('os')") -> заблоковано: ValueError
```

!!! warning "`ast.literal_eval()` — значно безпечніший, але не «безумовно безпечний»"
    `ast.literal_eval()` не виконує код — він лише перевіряє, що вираз складається з дозволених літералів, і гарантує, що виклики функцій, доступ до атрибутів (`__class__` тощо) та імпорти пройти не зможуть. Це робить його придатним для розбору довіреного/напівдовіреного вводу у форматі Python-літералів.

    Але це **не універсальний "safe eval"**: він все одно повністю парсить вхідний рядок через `ast`, і на дуже великих чи спеціально сконструйованих рядках (наприклад, глибоко вкладені структури або величезні числові літерали) можливі проблеми продуктивності (DoS через складність парсингу) — у різних версіях Python траплялися відповідні виправлення. Для даних із недовірених джерел, де формат заздалегідь відомий (а не довільний Python-літерал), надійніше використовувати `json.loads()` — парсер JSON вужчий і передбачуваніший за граматику Python-літералів.

### Варіант Г — словник операторів (для `a op b`)

Для простого «число - оператор - число» без пріоритетів і дужок:

```python
OPERATORS = {
    '+':  lambda a, b: a + b,
    '-':  lambda a, b: a - b,
    '*':  lambda a, b: a * b,
    '/':  lambda a, b: a / b if b != 0 else None,
    '//': lambda a, b: a // b if b != 0 else None,
    '%':  lambda a, b: a % b if b != 0 else None,
    '**': lambda a, b: a ** b,
}

def safe_calculate(a: float, op: str, b: float):
    """Безпечне обчислення без eval()."""
    if op not in OPERATORS:
        return None, f"Невідомий оператор: {op!r}"
    result = OPERATORS[op](a, b)
    if result is None:
        return None, "Ділення на нуль"
    return result, None

for a, op, b in [(10, '+', 5), (15, '/', 4), (5, '/', 0), (5, '@', 3)]:
    result, err = safe_calculate(a, op, b)
    print(f"{a} {op} {b} -> {err or result}")
```

```text
10 + 5 -> 15
15 / 4 -> 3.75
5 / 0 -> Ділення на нуль
5 @ 3 -> Невідомий оператор: '@'
```

Словник операторів не вміє пріоритетів (`2 + 3 * 4` без дужок), дужок і унарного мінуса — для цього потрібен повноцінний парсер.

### Варіант Д — власний парсер (алгоритм Shunting-Yard)

Для калькулятора з повноцінними пріоритетами та дужками застосовується **алгоритм Shunting-Yard** (Едсгер Дейкстра, 1961): він конвертує інфіксний запис (`2 + 3 * 4`) у постфіксний (RPN, Reverse Polish Notation: `2 3 4 * +`), де немає потреби в дужках, а пріоритети вже враховані, і результат обчислюється простим стеком:

```text
Інфіксний:   2 + 3 * 4
                  ↓  Shunting-Yard
Постфіксний: 2 3 4 * +
                  ↓  обчислення стеком
Результат:   14
```

```text
Покрокове обчислення RPN "2 3 4 * +":

Стек: []          читаємо 2   -> стек: [2]
Стек: [2]         читаємо 3   -> стек: [2, 3]
Стек: [2, 3]      читаємо 4   -> стек: [2, 3, 4]
Стек: [2, 3, 4]   читаємо *   -> pop(4,3), push(3*4=12) -> [2, 12]
Стек: [2, 12]     читаємо +   -> pop(12,2), push(2+12=14) -> [14]
Результат: 14
```

Саме так побудований [`cli_calculator.py`](https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/module_1/lessons/lesson_13_modules_stdlib/calculator_project/cli_calculator.py) — три етапи:

```text
  "2 + 3 * 4"
       ↓  tokenize()
  ["2", "+", "3", "*", "4"]
       ↓  to_rpn()      ← Shunting-Yard
  ["2", "3", "4", "*", "+"]
       ↓  eval_rpn()
  14.0
```

Приклади нижче виконуються, якщо папка `calculator_project/` (де лежить `cli_calculator.py`) додана в `sys.path` — наприклад, запуском з тієї ж теки, звідки лежить сам файл модуля:

```python
from cli_calculator import tokenize, to_rpn, eval_rpn, evaluate, format_number

for expr in ["2 + 3 * 4", "(2 + 3) * 4", "-5 + 3.14", "2 ** 3 ** 2", "10 // 3 + 10 % 3", "2 @ 3"]:
    ok, result = tokenize(expr)
    print(f"{expr!r:<20} -> {result if ok else 'ПОМИЛКА: ' + result}")
```

```text
'2 + 3 * 4'          -> ['2', '+', '3', '*', '4']
'(2 + 3) * 4'        -> ['(', '2', '+', '3', ')', '*', '4']
'-5 + 3.14'          -> ['-', '5', '+', '3.14']
'2 ** 3 ** 2'        -> ['2', '**', '3', '**', '2']
'10 // 3 + 10 % 3'   -> ['10', '//', '3', '+', '10', '%', '3']
'2 @ 3'              -> ПОМИЛКА: Невідомий символ: '@'
```

Токени переходять у RPN через `to_rpn()` — пріоритет і асоціативність визначають, коли оператор "виштовхується" зі стеку в результат:

```python
for expr, note in [
    ("2 + 3 * 4", "пріоритет * вище +"),
    ("(2 + 3) * 4", "дужки змінюють пріоритет"),
    ("-5 + 3", "унарний мінус"),
    ("2 ** 3 ** 2", "** правоасоціативний"),
    ("1 + 2 + 3 + 4", "ліва асоціативність"),
]:
    ok1, tokens = tokenize(expr)
    ok2, rpn = to_rpn(tokens)
    print(f"{expr!r:<18} {' '.join(rpn):<18} {note}")
```

```text
'2 + 3 * 4'        2 3 4 * +          пріоритет * вище +
'(2 + 3) * 4'      2 3 + 4 *          дужки змінюють пріоритет
'-5 + 3'           5 u- 3 +           унарний мінус
'2 ** 3 ** 2'      2 3 2 ** **        ** правоасоціативний
'1 + 2 + 3 + 4'    1 2 + 3 + 4 +      ліва асоціативність
```

`eval_rpn()` обчислює RPN стеком:

```python
for rpn_str, meaning in [
    ("2 3 4 * +", "2 + 3*4"),
    ("2 3 + 4 *", "(2+3)*4"),
    ("5 u- 3 +", "-5 + 3"),
    ("2 3 2 ** **", "2**(3**2)"),
]:
    ok, result = eval_rpn(rpn_str.split())
    print(f"{rpn_str!r:<15} {meaning:<12} = {result}")
```

```text
'2 3 4 * +'     2 + 3*4      = 14.0
'2 3 + 4 *'     (2+3)*4      = 20.0
'5 u- 3 +'      -5 + 3       = -2.0
'2 3 2 ** **'   2**(3**2)    = 512.0
```

І `evaluate()` збирає весь пайплайн в один виклик, коректно обробляючи й помилки (ділення на нуль, невідомий символ, незакриту дужку):

```python
test_expressions = [
    "2 + 2", "10 - 3 * 2", "(10 - 3) * 2", "2 ** 8", "2 ** 3 ** 2",
    "-5 + 3", "3.14 * 2", "17 // 5", "17 % 5", "10 / 3",
    "10 / 0",     # ділення на нуль
    "abc + 1",    # некоректний символ
    "(2 + 3",     # незакрита дужка
]
for expr in test_expressions:
    ok, result = evaluate(expr)
    print(f"{expr:<15} = {format_number(result) if ok else 'ПОМИЛКА: ' + str(result)}")
```

```text
2 + 2           = 4
10 - 3 * 2      = 4
(10 - 3) * 2    = 14
2 ** 8          = 256
2 ** 3 ** 2     = 512
-5 + 3          = -2
3.14 * 2        = 6.28
17 // 5         = 3
17 % 5          = 2
10 / 3          = 3.3333333333333335
10 / 0          = ПОМИЛКА: Ділення на нуль.
abc + 1         = ПОМИЛКА: Невідомий символ: 'a'
(2 + 3          = ПОМИЛКА: Помилка дужок: не закрито '('.
```

### Результати ідентичні `eval()` — але безпечні

```python
for expr in ["2 + 3 * 4", "(2 + 3) * 4", "2 ** 3 ** 2", "-5 + 10", "10 / 4", "10 // 4", "10 % 3"]:
    eval_result = eval(expr)
    ok, calc_result = evaluate(expr)
    match = "✅" if ok and abs(eval_result - calc_result) < 1e-9 else "⚠️"
    print(f"{expr!r:<15} eval()={eval_result!s:<8} cli_calculator={calc_result} {match}")
```

```text
'2 + 3 * 4'      eval()=14       cli_calculator=14.0 ✅
'(2 + 3) * 4'    eval()=20       cli_calculator=20.0 ✅
'2 ** 3 ** 2'    eval()=512      cli_calculator=512.0 ✅
'-5 + 10'        eval()=5        cli_calculator=5.0 ✅
'10 / 4'         eval()=2.5      cli_calculator=2.5 ✅
'10 // 4'        eval()=2        cli_calculator=2.0 ✅
'10 % 3'         eval()=1        cli_calculator=1.0 ✅
```

І, найважливіше — `cli_calculator.evaluate()` **відхиляє** будь-який шкідливий ввід замість того, щоб його виконати, бо його токенізатор розпізнає лише цифри, крапку й символи `+ - * / // % ** ( )` — усе інше одразу дає помилку "Невідомий символ":

```python
attack_inputs = [
    '__import__("os").system("whoami")',
    'open("passwords.txt").read()',
    '[x for x in ().__class__.__bases__]',
    '"" * 10**9',
    'print("hacked")',
]
for inp in attack_inputs:
    ok, result = evaluate(inp)
    print(f"{'⚠️ пройшов' if ok else '✅ заблоковано'}: {inp!r} -> {result}")
```

```text
✅ заблоковано: '__import__("os").system("whoami")' -> Невідомий символ: '_'
✅ заблоковано: 'open("passwords.txt").read()' -> Невідомий символ: 'o'
✅ заблоковано: '[x for x in ().__class__.__bases__]' -> Невідомий символ: '['
✅ заблоковано: '"" * 10**9' -> Невідомий символ: '"'
✅ заблоковано: 'print("hacked")' -> Невідомий символ: 'p'
```

## Коли `eval()` усе-таки прийнятний

| Контекст | Безпечно? |
|----------|-----------|
| `eval("2 + 2")` — хардкодований рядок у власному коді | ✅ Так |
| `eval(user_input)` — будь-який зовнішній ввід | ❌ Ні |
| Особисті скрипти для власного одноразового використання | ⚠️ Обережно |
| Вебзастосунки, публічні API, будь-де, куди доходить чужий ввід | ❌ Ніколи |

## Шпаргалка

```python
# Синтаксис
eval(expression)                            # доступ до всіх змінних
eval(expression, globals_dict)              # тільки вказані символи
eval(expression, globals_dict, locals_dict) # два рівні видимості
eval(expression, {'__builtins__': None})    # заборонити builtins (не гарантує повний захист!)

# Безпечні альтернативи
import ast
value = ast.literal_eval(user_input)   # для Python-літералів; ValueError, якщо не літерал

import json
value = json.loads(user_input)         # для JSON-даних із відомим форматом

OPS = {'+': lambda a, b: a + b, '-': lambda a, b: a - b}   # для простого a op b
result = OPS[op](a, b)

from cli_calculator import evaluate    # для складних арифметичних виразів
ok, result = evaluate(user_input)      # безпечний парсер (tokenize -> to_rpn -> eval_rpn)
```

## Задачі — самостійна робота

### 1. Безпечний `eval` із whitelist

Напишіть функцію `safe_eval(expr, allowed_functions)`, яка виконує вираз через `eval()`, але дозволяє тільки функції зі словника `allowed_functions`, і забороняє `__builtins__`:

```python
allowed = {'sqrt': math.sqrt, 'abs': abs}
safe_eval('sqrt(16)', allowed)            # -> 4.0
safe_eval('__import__("os")', allowed)    # -> має заблокувати виклик
```

### 2. Розширення `safe_calculate` унарним мінусом

Додайте до `safe_calculate` підтримку унарної операції (коли `a is None`):

```python
safe_calculate(None, 'u-', 5)   # -> -5
safe_calculate(None, 'u-', -3)  # -> 3
```

### 3. Аналіз `tokenize()`

Розгляньте функцію `tokenize()` із `cli_calculator.py` і дайте відповідь:

1. Що поверне `tokenize("1.2.3")`? Поясніть чому.
2. Що поверне `tokenize("--5")`? Поясніть чому.
3. Що поверне `tokenize("3 ** -2")`? Поясніть чому.

Підказка — реальна поведінка (можна перевірити самостійно):

```text
tokenize('1.2.3'):  ok=True, result=['1.2', '.3']   -> evaluate() потім падає: "вираз не згорнувся до одного значення"
tokenize('--5'):    ok=True, result=['-', '-', '5']  -> evaluate() = 5.0 (мінус на мінус)
tokenize('3 ** -2'): ok=True, result=['3', '**', '-', '2'] -> evaluate() = 0.111... (3 ** -2)
```
