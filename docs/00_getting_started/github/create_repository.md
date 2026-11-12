# Як створити свій репозиторій на GitHub

Це **не** те саме, що [Fork і Clone](fork_and_clone.md). Fork — копія чужого (викладацького) репозиторію, у якій ти здаєш домашні роботи. Власний репозиторій — проєкт, який від самого початку належить тобі: капстоун, пет-проєкт, будь-що для портфоліо.

Є два реалістичні сценарії, залежно від того, де вже існує код.

## Сценарій A — починаєш з GitHub (коду ще немає)

1. На [github.com/new](https://github.com/new) заповни форму **Create a new repository**:
      - **Repository name** — коротка, зрозуміла назва без пробілів (`weather-cli`, не `Мій перший проєкт`).
      - **Description** — одне речення, що це за проєкт (необов'язково, але варто).
      - **Public** / **Private** — для портфоліо обирай **Public**, інакше роботу ніхто не побачить.
      - **Add a README file** — постав галочку. GitHub одразу створить перший commit з `README.md`.
      - **Add .gitignore** — обери шаблон **Python** зі списку. Це готовий, перевірений `.gitignore` для Python-проєктів.
      - **Choose a license** — необов'язково для навчального проєкту, можна пропустити.
2. Натисни **Create repository**.
3. Склонуй його собі, так само як клонував fork курсу (`File → New Project from Version Control` у PyCharm, URL свого нового репозиторію — див. [Fork і Clone](fork_and_clone.md), крок 2️⃣).
4. Working з клонованим репозиторієм — звичайний git workflow: редагуй файли, `git add`, `git commit`, `git push`.

## Сценарій B — код уже є на комп'ютері, GitHub ще немає

У тебе вже є папка з проєктом локально, і ти хочеш вперше відправити її на GitHub.

**Крок 1 — перетвори папку на git-репозиторій:**

```bash
cd шлях/до/твого/проєкту
git init
git add .
git commit -m "Initial commit"
```

**Крок 2 — створи ПОРОЖНІЙ репозиторій на GitHub.**

На [github.com/new](https://github.com/new) заповни **Repository name**, але **не став галочки** на README/.gitignore/license — вони тут не потрібні, у тебе вже є свій перший commit локально, і зайвий commit із GitHub створить конфлікт історій (дві незалежні "перші точки", які потім важко об'єднати).

**Крок 3 — підключи GitHub як remote і відправ код:**

```bash
git remote add origin https://github.com/ТВІЙ_НІК/НАЗВА_РЕПОЗИТОРІЮ.git
git branch -M main
git push -u origin main
```

- `git remote add origin ...` — каже локальному репозиторію, де на GitHub його віддалена копія.
- `git branch -M main` — перейменовує поточну гілку на `main`, якщо вона ще називається `master` (стара дефолтна назва).
- `git push -u origin main` — перший `push` із прапорцем `-u` (`--set-upstream`): запам'ятовує зв'язок `main ↔ origin/main`, тому надалі досить просто `git push`.

## Типові помилки

| Повідомлення | Причина | Виправлення |
|---|---|---|
| `remote origin already exists` | `origin` уже підключено (наприклад, залишився від клонування) | `git remote set-url origin НОВИЙ_URL` замість `add` |
| `Updates were rejected because the remote contains work that you do not have` | На GitHub уже є commit (README створений при створенні репозиторію), якого немає локально | Або `git pull --allow-unrelated-histories origin main` і розв'яжи конфлікт, або створи репозиторій наступного разу без README/.gitignore (сценарій B) |
| `Permission denied (publickey)` | Немає підключеного SSH-ключа, або URL через `https` замість `ssh` без збереженого логіна | Дивись [SSH-ключі](ssh_keys.md) |

👉 Щоб власні проєкти було видно на твоїй сторінці GitHub — оформи [профіль із README-візитівкою](profile_readme.md) і закріпи їх там.

👉 Структуру репозиторію, README і комітну гігієну для портфоліо — дивись [Урок 16](../../modules/m1/lesson_16.md).
