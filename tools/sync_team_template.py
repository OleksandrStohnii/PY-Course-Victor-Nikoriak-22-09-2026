#!/usr/bin/env python3
"""Синхронізація шаблону командного проєкту уроку 16 з курсом.

Джерело — `module_1/lessons/lesson_16_git_github_system/team_project/` (без `solution/`),
ціль — локальний клон https://github.com/NikoriakViktor/cafe-kasa-template.

    python tools/sync_team_template.py                       # скопіювати і показати, що змінилося
    python tools/sync_team_template.py --push -m "TEAM.md: …"  # ще й закомітити й запушити шаблон
    python tools/sync_team_template.py --template ШЛЯХ        # клон шаблону лежить не поруч з курсом

Репозиторії команд, уже створені з шаблону, від цього не оновляться — лише нові.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "module_1/lessons/lesson_16_git_github_system/team_project"
DEFAULT_TEMPLATE = ROOT.parent / "cafe-kasa-template"
SKIP = shutil.ignore_patterns("solution", "__pycache__", "*.pyc", "report.json", "errors.txt", "*:Zone.Identifier")


def git(template, *args):
    return subprocess.run(["git", *args], cwd=template, check=True, capture_output=True, text=True).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE, help="локальний клон cafe-kasa-template")
    parser.add_argument("--push", action="store_true", help="закомітити й запушити зміни шаблону")
    parser.add_argument("-m", "--message", help="повідомлення коміту (потрібне з --push)")
    args = parser.parse_args()

    template = args.template.resolve()
    if not (template / ".git").is_dir():
        sys.exit(f"Немає клону шаблону: {template}\n"
                 f"  git clone https://github.com/NikoriakViktor/cafe-kasa-template.git {template}")
    if args.push and not args.message:
        sys.exit("--push потребує -m \"повідомлення коміту\"")

    git(template, "pull", "-q", "--ff-only")
    for item in template.iterdir():                     # усе, крім .git, береться з курсу заново
        if item.name != ".git":
            shutil.rmtree(item) if item.is_dir() else item.unlink()
    shutil.copytree(SOURCE, template, ignore=SKIP, dirs_exist_ok=True)

    status = git(template, "status", "--short")
    if not status:
        print("Шаблон уже збігається з курсом.")
        return 0
    print(status, end="")
    if not args.push:
        print(f"\nЗміни лише локально в {template}. Щоб опублікувати: --push -m \"…\"")
        return 0
    git(template, "add", "-A")
    git(template, "commit", "-q", "-m", args.message)
    git(template, "push", "-q")
    print("✅ Шаблон оновлено:", git(template, "log", "--oneline", "-1").strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
