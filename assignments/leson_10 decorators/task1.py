def get_greeter():
    def greeter(name):
        return f"Hello, {name}!"
    return greeter
#Виведе об'єк функції (саму функцію)
print(get_greeter())
# Виведе рядок "Hello, Olena!"
print(get_greeter()("Olena"))
# Перший print показуе, що get_greeter повертае функцію.
# Другий print викликае повернуту функцію з аргументом "Olena" і повертае рядок привштання.
# Al log : Я запитав ,як пояснити різницю між  двох print
