# Передбачення ДО запуску:
#   create_slogan("BMW")   -> "* drinks * in his brand new *!"
#       (ім'я теж потрапляє в рядок, що повертається, тому також замінюється)
#   create_slogan("Pepsi") -> "Pepsi drinks * in his brand new *!"
#       (заміна чутлива до регістру: "Pepsi" != "pepsi", тож залишається)
import functools
def stop_words(words: list):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            for word in words:
                result = result.replace(word, "*")
            return result
        return wrapper
    return decorator
@stop_words(['pepsi', 'BMW'])
def create_slogan(name: str) -> str:
    return f"{name} drinks pepsi in his brand new BMW!"
assert create_slogan("Steve") == "Steve drinks * in his brand new *!"
print(create_slogan("BMW"))
print(create_slogan("Pepsi"))
# Al log : Запитував про роботу декоратора stop_words та перевірив очікуваний результат.
# Після пояснення перевірив логіку заміни стоп-слів.