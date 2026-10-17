# Що станеться при create_slogan(12345), якщо перевіряти довжину ПЕРЕД типом?
# len(12345) викличе TypeError ("object of type 'int' has no len()"), і програма
# впаде замість того, щоб повернути False з поясненням. Так само для
# перевірки contains ('05' in 12345 -> TypeError). Тому спершу перевіряємо тип:
# наступні перевірки мають сенс лише для аргументів правильного типу.
import functools
def arg_rules(type_: type, max_length: int, contains: list):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for arg in args:
                # Порядок важливий: тип -> довжина -> вміст
                if not isinstance(arg, type_):
                    print(f"Помилка: {arg!r} має бути типу {type_.__name__}")
                    return False
                if len(arg) > max_length:
                    print(f"Помилка: {arg!r} довший за {max_length} символів")
                    return False
                for symbol in contains:
                    if symbol not in arg:
                        print(f"Помилка: {arg!r} не містить {symbol!r}")
                        return False
            return func(*args, **kwargs)

        return wrapper

    return decorator
@arg_rules(type_=str, max_length=15, contains=['05', '@'])
def create_slogan(name: str) -> str:
    return f"{name} drinks pepsi in his brand new BMW!"
assert create_slogan('johndoe05@gmail.com') is False
assert create_slogan('S@SH05') == 'S@SH05 drinks pepsi in his brand new BMW!'
assert create_slogan(12345) is False
# Застосування до функції з рядком: паліндром.
# Правила: це має бути рядок, не довший за 50 символів, обмежень на вміст немає.
@arg_rules(type_=str, max_length=50, contains=[])
def is_palindrome(text: str) -> bool:
    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())
    return cleaned == cleaned[::-1]
print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("hello"))  # False
print(is_palindrome(12321))  # False + причина
#Al log : Запитував про порядок перевірки типу, довжини та contains у декораторі arg_rules.
# Після пояснення перевірив і змінив порядок перевірок.