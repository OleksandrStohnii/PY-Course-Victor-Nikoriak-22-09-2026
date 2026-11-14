#!/usr/bin/env python3
# Кадры для вертикального ролика SHRhub: собираем HTML, снимаем Chrome.
import base64, pathlib, subprocess, sys
from PIL import Image

root = pathlib.Path('/home/claude/video')
root.mkdir(exist_ok=True)

emb = base64.b64encode(pathlib.Path('/home/claude/shrhub/app/brand/emblem-256.png').read_bytes()).decode()

# вырезаем карточку BTC из снимка приложения
app = Image.open('/tmp/app_hi.png')
card = app.crop((56, 1245, 848, 1620))
card.save(root / 'card.png')
phone = app.crop((0, 0, 880, 1760))
phone.save(root / 'phone.png')
b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()

HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Prata&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1920px;background:#0b0e11;color:#eaecef;font-family:'Jost',sans-serif;
  display:flex;flex-direction:column;justify-content:center;align-items:center;padding:110px 80px;text-align:center;overflow:hidden;position:relative}
.glow{position:absolute;width:1200px;height:1200px;border-radius:50%;
  background:radial-gradient(circle,rgba(240,185,11,.13),transparent 62%);top:-340px;left:-60px;pointer-events:none}
.glow.b{top:auto;bottom:-420px;left:auto;right:-220px;background:radial-gradient(circle,rgba(46,189,133,.10),transparent 62%)}
.kicker{font-size:36px;letter-spacing:.18em;text-transform:uppercase;color:#848e9c;margin-bottom:34px}
h1{font-family:'Prata',serif;font-size:96px;line-height:1.12;font-weight:400}
h1 em{font-style:normal;color:#f0b90b}
p{font-size:46px;line-height:1.42;color:#848e9c;margin-top:34px}
.big{font-family:'Prata',serif;font-size:190px;color:#f0b90b;line-height:1;margin:18px 0}
.row{display:flex;gap:26px;margin-top:46px}
.pill{border:2px solid #2b3139;border-radius:18px;padding:22px 34px;font-size:40px;color:#eaecef}
.pill b{color:#f0b90b;font-weight:600}
.shot{width:800px;border-radius:26px;border:1px solid #2b3139;box-shadow:0 40px 90px rgba(0,0,0,.65);display:block}
.logo{display:flex;align-items:center;gap:28px;justify-content:center}
.logo img{width:132px;height:132px;border-radius:30px}
.logo span{font-family:'Prata',serif;font-size:104px}
.logo span i{font-style:normal;color:#f0b90b}
.handle{font-size:56px;color:#f0b90b;margin-top:44px;letter-spacing:.02em}
.foot{position:absolute;bottom:92px;left:0;right:0;font-size:30px;color:#5e6673}
.note{font-size:34px;color:#5e6673;margin-top:30px}
.arrow{font-size:70px;color:#2ebd85;margin:26px 0}
</style></head><body><div class="glow"></div><div class="glow b"></div>
"""
FOOT = "</body></html>"

scenes = {}

scenes['s1'] = """<div class="kicker">спот · без плеча</div>
<h1>Купил по <em>$74 200</em>.<br>Потом по <em>$68 900</em>.</h1>
<p>Какая теперь твоя средняя?</p>
<div class="foot">SHRhub · игра и калькулятор, не биржа</div>"""

scenes['s2'] = """<div class="kicker">считает за тебя</div>
<img class="shot" src="data:image/png;base64,%s">
<p>Две покупки — и средняя сразу на экране</p>""" % b64(root / 'card.png')

scenes['s3'] = """<div class="kicker">средняя цена входа</div>
<div class="big">$70 335</div>
<div class="row"><div class="pill">вложено <b>$350</b></div><div class="pill">на руках <b>0.00498 BTC</b></div></div>
<p>Ни калькулятора, ни блокнота</p>"""

scenes['s4'] = """<div class="kicker">а если докуплю?</div>
<h1>Ещё <em>$200</em><br>по <em>$66 000</em></h1>
<div class="arrow">↓</div>
<div class="big" style="font-size:150px">$68 694</div>
<p>Новая средняя — до покупки, а не после</p>"""

scenes['s5'] = """<div class="kicker">правило первое</div>
<h1>Средняя — это <em>факт</em>,<br>а не цель.</h1>
<p>Докупать только ради красивой средней —<br>значит увеличивать ставку на то,<br>что уже падает.</p>
<div class="note">Правила метода, а не совет, что покупать</div>"""

scenes['s6'] = """<div class="logo"><img src="data:image/png;base64,%s"><span>SHR<i>hub</i></span></div>
<p style="margin-top:50px">Средняя цена, живые графики<br>и клуб прогнозов в Telegram</p>
<div class="handle">@SHRhub_bot</div>
<div class="foot">18+ · ставок и денежных призов нет</div>""" % emb

for name, body in scenes.items():
    (root / f'{name}.html').write_text(HEAD + body + FOOT, encoding='utf-8')
    out = root / f'{name}.jpg'
    subprocess.run(['google-chrome', '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
                    '--window-size=1080,1920', '--virtual-time-budget=6000',
                    f'--screenshot={out}', f'file://{root}/{name}.html'],
                   check=True, capture_output=True)
    print(name, Image.open(out).size)
