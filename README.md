# 🐍 Python Programming — Viktor Nikoriak

Курс Python українською, від основ до просунутих тем — у форматі: **ноутбуки занять** + **книга теорії**.

Цей репозиторій містить:

- ✅ матеріали занять (ноутбуки, по модулях)
- ✅ практичні завдання й домашні роботи
- ✅ workflow роботи через GitHub (як у реальній IT-команді)

## 📖 Книга курсу

Повна теорія, довідники та інструкції — у [книзі курсу на GitHub Pages](https://nikoriakviktor.github.io/PY-Course-Victor-Nikoriak-22-09-2026/).

[Вихідні файли книги](docs/index.md)

Швидкі посилання:

- [Як користуватися курсом](docs/00_getting_started/README.md)
- [Ноутбуки в Google Colab](docs/00_getting_started/colab.md)
- [SSH-ключі для GitHub](docs/00_getting_started/github/ssh_keys.md)
- [Профіль GitHub: README-візитівка](docs/00_getting_started/github/profile_readme.md)
- [Здача домашніх робіт](docs/00_getting_started/homework_workflow.md)
- [Часті проблеми](docs/00_getting_started/troubleshooting.md)

## 🚀 Швидкий старт

### 1. Встановіть Git

[Інструкція з встановлення Git](docs/00_getting_started/git_setup.md)

Перевірте:

```bash
git --version
```

---

### 2. Зробіть Fork репозиторію

Натисніть **Fork** у верхній частині цього репозиторію.

Працюйте у **власному Fork**, а не безпосередньо в репозиторії викладача.

Детально: [Fork, SSH і Clone](docs/00_getting_started/github/fork_and_clone.md)

---

### 3. Клонуйте свій Fork

```bash
git clone git@github.com:<your-username>/PY-Course-Victor-Nikoriak-22-09-2026.git
cd PY-Course-Victor-Nikoriak-22-09-2026
```

Додайте репозиторій викладача як `upstream`:

```bash
git remote add upstream https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026.git
```

Перевірте:

```bash
git remote -v
```

Має бути:

```text
origin    → ваш Fork
upstream  → репозиторій курсу
```

---

### 4. Налаштуйте Python

Створіть віртуальне середовище та підключіть його в PyCharm/Jupyter:

👉 [Налаштування Python-середовища](docs/00_getting_started/environment_setup.md)

Після цього відкрийте потрібний урок у:

```text
module_1/lessons/lesson_NN_<тема>/    ← NN = номер уроку за програмою курсу
```

Без встановлення Python кожен ноутбук можна відкрити в Google Colab кнопкою **Open in Colab** у його першій клітинці: [Ноутбуки в Google Colab](docs/00_getting_started/colab.md).

---

### 5. Перед кожним заняттям оновлюйте `main`

```bash
git checkout main
```
```bash
git pull upstream main
```

```bash
git push origin main
```

```bash
git checkout main
git pull upstream main
git push origin main
```


Так ви отримаєте нові матеріали курсу.

---

### 6. Домашні роботи виконуйте в окремій гілці

```bash
git checkout -b homework-01
```

```bash
# після виконання завдання
git add .
```
```bash
git commit -m "Homework 01"
```
```bash
git push origin homework-01
```

```bash
git checkout -b homework-01

# після виконання завдання
git add .
git commit -m "Homework 01"
git push origin homework-01
```


Після цього на GitHub створіть **Pull Request**:

```text
homework-01 → main
```

**Pull Request = здача домашнього завдання.**

👉 [Детальна інструкція зі здачі домашніх робіт](docs/00_getting_started/homework_workflow.md)

> ⚠️ **Не виконуйте домашні роботи у `main`.**
> Одна домашня робота = одна окрема гілка.

Якщо щось не працює: [Часті проблеми](docs/00_getting_started/troubleshooting.md)


## Про курс і викладача

- [Архітектура репозиторію](architecture.md)
- [Про викладача](instructor.md)
- [Сертифікати](certificates/beetroot_python_2021.md)
