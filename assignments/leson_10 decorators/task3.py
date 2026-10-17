# Передбачення ДО запуску:
#   operation_mapper("/")(7, 2)   -> 3.5
#   operation_mapper("**")(2, 10) -> 1024
# Чи є operation_mapper декоратором? Ні. Він приймає рядок, а не функцію,
# і не обгортає жодну існуючу функцію, а лише вибирає і повертає потрібну
# операцію. Це фабрика функцій.
def _add(a, b):
    return a + b
def _sub(a, b):
    return a - b
def _mul(a, b):
    return a * b
def _div(a, b):
    return a / b
def _pow(a, b):
    return a ** b
_OPERATIONS = {
    "+": _add,
    "-": _sub,
    "*": _mul,
    "/": _div,
    "**": _pow,
}
def operation_mapper(operation):
    return _OPERATIONS[operation]
print(operation_mapper("+")(1, 2))  # 3
print(operation_mapper("/")(7, 2))  # 3.5
print(operation_mapper("**")(2, 10))  # 1024
# Al log : Запитував про фабрику функцій та перевірив логіку коду.
# Змінив код після пояснення.