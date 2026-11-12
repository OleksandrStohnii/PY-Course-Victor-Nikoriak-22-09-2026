"""Правило посилань на ноутбуки в книзі (sync_notebook_metadata.sync_doc): python -m pytest tools -q"""
from pathlib import Path

import pytest

from sync_notebook_metadata import ROOT, sync_doc

GH = "https://github.com/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/"
CO = "https://colab.research.google.com/github/NikoriakViktor/PY-Course-Victor-Nikoriak-22-09-2026/blob/main/"
BADGE = "[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)]"
MASTER = "module_6/lessons/lesson_52_final_project/note_lesson_52_final_project.ipynb"   # має _student-копію
PLAIN = "module_1/bonus/namespaces_legb.ipynb"                                            # вправ з розв'язками немає


@pytest.fixture
def page():
    path = ROOT / "docs" / "_test_sync_links.md"
    def write(text: str) -> tuple[str, str, list[str]]:
        path.write_text(text, encoding="utf-8")
        errors: list[str] = []
        original, synced = sync_doc(path, errors)
        return original, synced, errors
    yield write
    path.unlink(missing_ok=True)


def test_buttons_are_accepted_and_get_no_extra_badge(page) -> None:
    student = MASTER.replace(".ipynb", "_student.ipynb")
    text = (f"[Відкрити вправи в Colab]({CO}{student}){{ .md-button .md-button--primary }} "
            f"[Переглянути розв’язки]({GH}{MASTER}){{ .solutions-link }}\n")
    original, synced, errors = page(text)
    assert errors == [] and synced == original


OTHER_STUDENT = "module_6/lessons/lesson_53_graduation_pitch/note_lesson_53_pitch_student.ipynb"


@pytest.mark.parametrize("text", [
    f"[`x.ipynb`]({GH}{MASTER}) {BADGE}({CO}{MASTER})\n",       # стара форма: GitHub + Colab на розв'язки
    f"[розв'язки]({GH}{MASTER})\n",                               # GitHub без класу solutions-link
    f"[Переглянути розв’язки]({GH}{MASTER}){{ .solutions-link }}\n",   # лише розв'язки, без кнопки вправ
    f"[Відкрити вправи в Colab]({CO}{OTHER_STUDENT}){{ .md-button .md-button--primary }} "
    f"[Переглянути розв’язки]({GH}{MASTER}){{ .solutions-link }}\n",   # кнопка на чужий _student
    f"[Відкрити вправи в Colab]({CO}{MASTER.replace('.ipynb', '_student.ipynb')}){{ .md-button .md-button--primary }}\n",
])
def test_master_with_student_copy_cannot_be_linked_directly(page, text: str) -> None:
    _, _, errors = page(text)
    assert errors and all("has a student copy" in e for e in errors)


def test_notebook_without_student_copy_keeps_plain_link_and_gets_badge(page) -> None:
    _, synced, errors = page(f"[`n.ipynb`]({GH}{PLAIN})\n")
    assert errors == [] and synced == f"[`n.ipynb`]({GH}{PLAIN}) {BADGE}({CO}{PLAIN})\n"


def test_page_template_passes() -> None:
    template = Path(__file__).parent / "templates" / "lesson_page.md"
    assert "{ .md-button .md-button--primary }" in template.read_text(encoding="utf-8")
