# Fork і Clone

## 1️⃣ Створи Fork репозиторію

Перейди у репозиторій курсу:

```
https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026
```

Натисни кнопку **Fork**.

### У вікні «Create a new fork»

**Owner** — твій GitHub акаунт

**Repository name**

```
PY-Course-Victor-Nikoriak-22-09-2026
```

### Обов'язково перевір

✅ **Copy the main branch only** — увімкнено

Після цього натисни **Create fork**.

### Що відбудеться

GitHub створить копію репозиторію у твоєму акаунті:

```
https://github.com/<your-username>/PY-Course-Victor-Nikoriak-22-09-2026
```

Приклад:

```
https://github.com/student123/PY-Course-Victor-Nikoriak-22-09-2026
```

### Важливо

Ти працюєш **тільки у своєму fork**:

```
NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026  → repo викладача
your-username/PY-Course-Victor-Nikoriak-22-09-2026   → твій fork
```

## 2️⃣ Clone у PyCharm

PyCharm → `File → New Project from Version Control`

Встав **URL свого fork**:

```
github.com/<your-username>/PY-Course-Victor-Nikoriak-22-09-2026
```

## 3️⃣ Додай upstream (один раз)

У Terminal:

```bash
git remote add upstream https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026.git
```

Перевірка:

```bash
git remote -v
```

Повинно бути:

```
origin   → твій repo
upstream → repo викладача
```

## 🔄 Перед кожним заняттям

Оновлення матеріалів:

```bash
git checkout main
git pull upstream main
git push origin main
```
