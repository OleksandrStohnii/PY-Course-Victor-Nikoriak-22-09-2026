#!/usr/bin/env python3
# Сборка SHRhub: app.src.html + css -> tap.html (веб) и shrhub/app/index.html (Telegram)
import pathlib, sys

root = pathlib.Path('/home/claude')
src = (root / 'app.src.html').read_text(encoding='utf-8')
# style.css — ровно тот CSS, что в рабочей сборке (club.css + hub.css + старые правила)
css = (root / 'style.css').read_text(encoding='utf-8')

assert '/*CSS*/' in src, 'нет плейсхолдера /*CSS*/'
tap = src.replace('/*CSS*/', css)
(root / 'tap.html').write_text(tap, encoding='utf-8')

# Telegram-сборка: тот же файл + скрипт Telegram + блок входа, сервера и оплаты
idx_path = root / 'shrhub' / 'app' / 'index.html'
tg_tail = '\n' + (root / 'tgtail.js').read_text(encoding='utf-8')

lines = tap.splitlines(keepends=True)
end = next(i for i, l in enumerate(lines) if l.strip() == '</script>')
head = ''.join(lines[:end])

tag = '<script src="https://telegram.org/js/telegram-web-app.js"></script>\n'
head = head.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>\n', '')
anchor = head.index('\n', head.index('<title')) + 1
head = head[:anchor] + tag + head[anchor:]

idx_path.write_text(head + tg_tail, encoding='utf-8')
(root / 'shrhub' / 'app' / 'index.web.html').write_text(tap, encoding='utf-8')

print('tap.html', len(tap))
print('index.html', idx_path.stat().st_size)
