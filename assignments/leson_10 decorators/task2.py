from functools import wraps
def logger(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        arguments = []
        # Позиційні аргументи
        arguments.extend(str(arg) for arg in args)
        # Іменовані аргументи
        arguments.extend(f"{key}={value!r}" for key, value in kwargs.items())
        print(f"{func.__name__} викликане з {', '.join(arguments)}")
        return func(*args, **kwargs)
    return wrapper
@logger
def add(x, y):
    return x + y
@logger
def square_all(*args):
    return [arg ** 2 for arg in args]
@logger
def test_some2(a, b, c):
    return a
# Перед запуском:
# add викликане з 4, 5
# 9
print(add(4, 5))
# Без @wraps:
# wrapper
# З @wraps:
# add
print(add.__name__)
test_some2(2, b="y", c="e")
print(square_all(2, 3, 4))
# AL log :Запитував про декоратори та functools.wraps.
# Код написаний за до AI, сам перевірив і виправив помилки.