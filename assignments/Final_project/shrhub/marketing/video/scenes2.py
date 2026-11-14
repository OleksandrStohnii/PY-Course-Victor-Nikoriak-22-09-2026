#!/usr/bin/env python3
# Ещё два вертикальных ролика SHRhub: прогнозы и потерянная флешка.
import base64, pathlib, subprocess
from PIL import Image

root = pathlib.Path('/home/claude/video')
emb = base64.b64encode(pathlib.Path('/home/claude/shrhub/app/brand/emblem-256.png').read_bytes()).decode()
g = Image.open('/tmp/game_hi.png')
g.crop((30, 215, 850, 855)).save(root / 'chart.png')      # свечи и объёмы
g.crop((45, 855, 840, 1215)).save(root / 'vote.png')      # настроение и кнопки
b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()

HEAD = open(root / 's1.html', encoding='utf-8').read().split('</head>')[0] + '</head><body><div class="glow"></div><div class="glow b"></div>\n'
FOOT = "</body></html>"

sets = {
 'b': {  # прогнозы
  'b1': """<div class="kicker">битком через час</div>
<h1><em>62%</em> клуба ставят,<br>что цена вырастет.</h1>
<p>А ты с ними или против?</p>""",
  'b2': """<div class="kicker">живые свечи, 13 таймфреймов</div>
<img class="shot" src="data:image/png;base64,%s">
<p>Настоящая цена, обновляется каждые 3 секунды</p>""" % b64(root / 'chart.png'),
  'b3': """<div class="kicker">один прогноз в час</div>
<img class="shot" src="data:image/png;base64,%s">
<p>Угадал — очки, серия и место в рейтинге</p>""" % b64(root / 'vote.png'),
  'b4': """<h1>Ставок нет.<br>Денежных призов нет.</h1>
<p>Это игра про чутьё, а не казино.<br>Проиграть деньги здесь невозможно.</p>
<div class="note">18+ · спот без плеча</div>""",
  'b5': """<div class="logo"><img src="data:image/png;base64,%s"><span>SHR<i>hub</i></span></div>
<p style="margin-top:50px">Прогнозы, кланы и средняя цена<br>покупки — в Telegram</p>
<div class="handle">@SHRhub_bot</div>""" % emb,
 },
 'c': {  # флешка
  'c1': """<div class="kicker">городская легенда</div>
<h1>Где-то на свалке<br>лежит <em>флешка</em><br>с биткоинами.</h1>""",
  'c2': """<h1>Мы её <em>спрятали</em><br>внутри приложения.</h1>
<p>Каждый день — в новом месте</p>""",
  'c3': """<div class="kicker">пять попыток в сутки</div>
<div class="row" style="justify-content:center;flex-wrap:wrap">
  <div class="pill">❄️ Холодно</div><div class="pill">♨️ Теплее</div><div class="pill"><b>🔥 Горячо</b></div></div>
<p style="margin-top:46px">Копаешь — приложение подсказывает</p>""",
  'c4': """<div class="kicker">нашёл — забрал</div>
<h1>Значок, фишки<br>и золотое сообщение.</h1>
<p>Настоящих биткоинов на ней нет 😄<br>Завтра она потеряется снова.</p>""",
  'c5': """<div class="logo"><img src="data:image/png;base64,%s"><span>SHR<i>hub</i></span></div>
<p style="margin-top:50px">Крипто-клуб в Telegram:<br>прогнозы, кланы, живые графики</p>
<div class="handle">@SHRhub_bot</div>
<div class="foot">18+ · ставок и денежных призов нет</div>""" % emb,
 },
}

for group in sets.values():
    for name, body in group.items():
        (root / f'{name}.html').write_text(HEAD + body + FOOT, encoding='utf-8')
        out = root / f'{name}.jpg'
        subprocess.run(['google-chrome', '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
                        '--window-size=1080,1920', '--virtual-time-budget=6000',
                        f'--screenshot={out}', f'file://{root}/{name}.html'], check=True, capture_output=True)
        print(name, Image.open(out).size)
