# Профіль: README-візитівка

Профіль на GitHub — це перше, що бачить рекрутер, ментор або колега, коли відкриває посилання з твого резюме. Порожній профіль із сірим аватаром нічого про тебе не каже. Профіль із фото, коротким описом і README-візитівкою за пів хвилини пояснює, хто ти, що вмієш і де подивитися твій код.

Ця інструкція — про те, як зробити таку візитівку. Потрібен лише акаунт на GitHub; усе можна зробити в браузері за 20–30 хвилин.

**Що вийде в результаті:**

- заповнений публічний профіль (фото, ім'я, опис, контакти);
- блок README над списком репозиторіїв — з іменем, роллю, стеком технологій і проєктами;
- закріплені репозиторії, які ти сам обрав показати першими.

## Крок 1 — заповни публічний профіль

Відкрий [github.com/settings/profile](https://github.com/settings/profile) (аватар угорі праворуч → **Settings**).

| Поле | Що вписати |
|---|---|
| **Profile picture** | Фото, де видно обличчя. Не логотип, не кіт, не аніме-персонаж. |
| **Name** | Ім'я та прізвище латиницею, як у резюме: `Olena Kovalenko`. |
| **Bio** | Одне речення: хто ти і що робиш. `Python developer in training · Django, PostgreSQL`. |
| **Location** | Місто і країна: `Lviv, Ukraine`. |
| **Social accounts** | Посилання на LinkedIn і Telegram (до чотирьох посилань). |
| **URL** | Сайт-портфоліо, якщо є. Якщо немає — залиш порожнім. |

Натисни **Update profile** внизу сторінки.

!!! warning "Чого не варто публікувати"
    Профіль бачать усі в інтернеті. Не вказуй номер телефону, домашню адресу, дату народження, особистий email, яким користуєшся для банку чи пошти. Для контакту достатньо LinkedIn і Telegram. Email у полі **Public email** — тільки якщо маєш окрему «робочу» скриньку.

## Крок 2 — створи спеціальний репозиторій

GitHub показує README на сторінці профілю, якщо він лежить у репозиторії, **назва якого точно збігається з твоїм логіном**. Логін `olena-kovalenko` → репозиторій `olena-kovalenko`.

1. Відкрий [github.com/new](https://github.com/new).
2. У **Repository name** впиши свій логін — літера в літеру. Логін видно в адресі твого профілю: `github.com/ТВІЙ_ЛОГІН`.
3. Якщо назва правильна, GitHub покаже під полем підказку:

    > ✨ **You found a secret!** `olena-kovalenko/olena-kovalenko` is a ✨*special*✨ repository that you can use to add a `README.md` to your GitHub profile.

    Немає такої підказки — назва не збігається з логіном. Перевір дефіси й зайві літери.

4. Обери **Public** — приватний репозиторій на профілі не показується.
5. Постав галочку **Add a README file**.
6. Натисни **Create repository**.

Відкрий свій профіль (`github.com/ТВІЙ_ЛОГІН`) — над репозиторіями вже є блок із заготовкою README. Тепер його треба наповнити.

## Крок 3 — заповни README

Є два способи, результат однаковий.

=== "У браузері (найпростіше)"

    1. Відкрий репозиторій `ТВІЙ_ЛОГІН/ТВІЙ_ЛОГІН`.
    2. Натисни на файл `README.md` → іконка олівця ✏️ (**Edit this file**).
    3. Видали заготовку, встав шаблон нижче і заміни дані на свої.
    4. Вкладка **Preview** показує, як це виглядатиме.
    5. **Commit changes…** → повідомлення `Add profile README` → **Commit changes**.

=== "Через Git (як у домашках)"

    ```bash
    git clone git@github.com:ТВІЙ_ЛОГІН/ТВІЙ_ЛОГІН.git
    cd ТВІЙ_ЛОГІН
    # відредагуй README.md у PyCharm або VS Code
    git add README.md
    git commit -m "Add profile README"
    git push
    ```

    Тут можна комітити прямо в `main`: це твій власний репозиторій, а не fork курсу.

### Шаблон

Скопіюй цілком і заміни вигадані дані (`Olena Kovalenko`, посилання, проєкти) на свої.

```markdown
<h1 align="center">Olena Kovalenko</h1>

<p align="center">
  <b>Python Developer in training</b><br>
  Lviv, Ukraine
</p>

<p align="center">
  <a href="https://www.linkedin.com/in/olena-kovalenko/">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge" alt="LinkedIn">
  </a>
  <a href="https://t.me/olena_kovalenko">
    <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
  </a>
</p>

## About Me

- Studying Python: OOP, databases, web development with Django
- Previously worked 4 years as an accountant — comfortable with numbers, reports and deadlines
- Now building a personal expense tracker (Django + PostgreSQL)
- Looking for an internship or a junior Python position

## Tech Stack

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)

## Projects

| Project | What it does | Stack |
|---|---|---|
| [expense-tracker](https://github.com/olena-kovalenko/expense-tracker) | Tracks personal expenses, monthly report by category | Django, PostgreSQL |
| [weather-cli](https://github.com/olena-kovalenko/weather-cli) | Shows the weather forecast in the terminal | Python, requests |

## Contact

- LinkedIn: [olena-kovalenko](https://www.linkedin.com/in/olena-kovalenko/)
- Telegram: [@olena_kovalenko](https://t.me/olena_kovalenko)
```

!!! note "Чому англійською"
    Профіль читають рекрутери й розробники з різних країн, а англійська — робоча мова в IT. Прості короткі речення, як у шаблоні, — цілком достатньо. Якщо поки що некомфортно, напиши українською: заповнений профіль українською кращий за порожній.

### Як змінити значки

Значки (badges) у шаблоні — це картинки з сервісу [shields.io](https://shields.io). Адреса значка складається з частин:

```text
https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
                             ──┬─── ──┬───                          ──┬───
                             текст   колір (HEX)                    логотип
```

- **текст** — що написано на значку. Пробіл записуй як `_`: `VS_Code`.
- **колір** — HEX-код без `#`.
- **logo** — назва логотипа з каталогу [simpleicons.org](https://simpleicons.org): знайди технологію і візьми назву малими літерами без пробілів. Якщо логотипа в каталозі немає (як у LinkedIn) — прибери `&logo=...&logoColor=white`, значок залишиться з самим текстом.

Готові значки для технологій курсу:

| Технологія | Рядок для README |
|---|---|
| Python | `![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)` |
| Git | `![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)` |
| GitHub | `![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)` |
| PyCharm | `![PyCharm](https://img.shields.io/badge/PyCharm-21D789?style=for-the-badge&logo=pycharm&logoColor=white)` |
| Jupyter | `![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=for-the-badge&logo=jupyter&logoColor=white)` |
| SQLite | `![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)` |
| PostgreSQL | `![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)` |
| Django | `![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)` |
| FastAPI | `![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)` |
| Docker | `![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)` |
| pandas | `![pandas](https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)` |

Так вони виглядають:

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)

## Що писати, а чого не варто

| ✅ Варто | ❌ Не варто |
|---|---|
| Тільки ті технології, якими ти справді користувався | Двадцять значків «на виріст» — на співбесіді спитають про кожен |
| 2–4 проєкти з одним реченням «що це робить» | Список усіх репозиторіїв підряд, разом із `test`, `homework`, `asdf` |
| Попередній досвід, якщо він є: він показує, що ти вмієш працювати | Вибачення: «я лише початківець, нічого не вмію» |
| Що ти вчиш і що шукаєш зараз | Лічильники відвідувань, гіфки, анімовані «змійки» на пів екрана |
| Робочі посилання — перевір кожне | Посилання на приватні або порожні репозиторії |

### Якщо ще нема чим хвалитися

На початку курсу це нормально. Чесний короткий профіль кращий за роздутий:

- у **About Me** напиши, що ти вчиш і з чого прийшов у програмування;
- у **Tech Stack** залиш те, що вже є: Python, Git — два значки теж стек;
- розділ **Projects** поки що прибери зовсім. Порожня таблиця гірша за її відсутність;
- повертайся до README після кожного модуля: додав технологію, додав проєкт. До капстоуна візитівка наповниться сама.

## Крок 4 — закріпи проєкти і перевір результат

**Закріплені репозиторії.** На сторінці профілю натисни **Customize your pins** і вибери до шести репозиторіїв, які хочеш показати першими. Не закріплюй fork курсу з домашками — закріплюй власні проєкти (див. [Як створити свій репозиторій](create_repository.md)).

**Перевірка.** Відкрий `github.com/ТВІЙ_ЛОГІН` у вікні інкогніто (`Ctrl+Shift+N`) — так профіль бачать інші. Пройдися по списку:

- фото й ім'я на місці;
- README показується над репозиторіями;
- усі значки завантажилися (немає «битих» картинок);
- кожне посилання відкривається;
- закріплені ті репозиторії, які ти обрав.

## README не з'являється на профілі

| Що бачиш | Причина | Виправлення |
|---|---|---|
| Блоку README на профілі немає | Назва репозиторію не збігається з логіном | **Settings** репозиторію → **Repository name** → впиши логін точно → **Rename** |
| Блоку немає, назва правильна | Репозиторій приватний | **Settings** → **Danger Zone** → **Change visibility** → **Public** |
| Блоку немає, репозиторій публічний | Файл названо не `README.md` або він лежить у папці | Файл має називатися `README.md` і лежати в корені репозиторію |
| Блок порожній | README порожній | Додай вміст і зроби commit |
| Замість значка — текст або «бита» картинка | Помилка в адресі значка (пробіл, зайвий символ) | Порівняй адресу з таблицею вище; пробіл у тексті — це `_` |
| Зміни не видно | Кеш браузера або зміни не запушено | Онови сторінку `Ctrl+F5`; якщо працюєш через Git — перевір `git status` і `git push` |

👉 Офіційна довідка GitHub: [Managing your profile README](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme).
