// SHRhub: сервер бота и общая база для Cloudflare Workers.
// Переменные (Settings → Variables and Secrets):
//   BOT_TOKEN       токен от @BotFather (тип Secret)
//   WEBHOOK_SECRET  любая длинная случайная строка из букв и цифр (тип Secret)
//   APP_URL         адрес игры, например https://lively-moon-1a1c.shrhub.workers.dev
//   SUPPORT_CHAT_ID твой Telegram ID или id группы поддержки (необязательно)
// Привязки (Settings → Bindings):
//   DB              база Cloudflare D1 — общий профиль, прогнозы, чаты и кланы
//   PAYMENTS        KV для истории оплат (необязательно, D1 и так хранит оплаты)

const MONTH = 2592000; // 30 дней: единственный период подписки, который принимает Telegram
const PRODUCTS = {
  tier1: { title: 'SHRhub Mini', stars: 55, sub: true, tier: 1 },
  tier2: { title: 'SHRhub Plus', stars: 105, sub: true, tier: 2 },
  tier3: { title: 'SHRhub Pro', stars: 210, sub: true, tier: 3 },
  tier4: { title: 'SHRhub Max', stars: 370, sub: true, tier: 4 },
  tier5: { title: 'SHRhub Ultra', stars: 525, sub: true, tier: 5 },
  coin: { title: 'Отдельная монета', stars: 155, sub: true, coin: true },
  pass: { title: 'Клубный пропуск недели', stars: 99, pass: true },
  save: { title: 'Спасение серии', stars: 50, save: true },
  codes: { title: '+3 кода-приглашения', stars: 75, codes: true },
  badge: { title: 'Значок профиля', stars: 100, own: 'badge' },
  cap: { title: 'Клан на 50 мест', stars: 300, own: 'cap' },
  emb: { title: 'Эмблема клана', stars: 150, own: 'emb' },
  banner: { title: 'Боевое знамя клана', stars: 150, own: 'banner' },
  frame: { title: 'Золотая рамка аватара', stars: 50, own: 'frame' },
  plat: { title: 'Тема «Платина»', stars: 100, own: 'plat' },
  emer: { title: 'Тема «Изумруд»', stars: 100, own: 'emer' },
  rbskin: { title: 'Облики робота', stars: 75, own: 'rbskin' },
  felt: { title: 'Чёрно-золотое сукно', stars: 100, own: 'felt' },
  shovel: { title: 'Золотая лопата', stars: 50, own: 'shovel' },
  gm: { title: 'Золотое сообщение', stars: 25, gm: true },
  // Голос в чате — одноразовая мелочь. Платят не за доступ к людям, а за то,
  // чтобы спамить стало дороже, чем оно того стоит: читать можно и без этого.
  chat: { title: 'Голос в чате, навсегда', stars: 1, chatOn: true },
  // Продвижение ролика: место в начале ленты на 7 дней
  boost: { title: 'Продвижение ролика, 7 дней', stars: 150, boost: true },
  // Место на виду. Это рекламное место, а не победа: в таблице оно подписано
  // «место оплачено» и стоит над настоящим рейтингом, не занимая первую строчку.
  spot: { title: 'Место на виду, 7 дней', stars: 250, spot: 'player' },
  cspot: { title: 'Место на виду для клана, 7 дней', stars: 400, spot: 'clan' },
};

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}
// Проверка подписи Telegram: без неё любой мог бы выдать себя за другого игрока.
export async function verifyInitData(initData, token) {
  const p = new URLSearchParams(initData || '');
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac('WebAppData', token);
  if (hex(await hmac(secret, check)) !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
const pairOf = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
// Картинку в приложении нельзя попросить с подписью Telegram в заголовке: тег
// <img> её не пошлёт. Поэтому на каждое вложение выдаём ссылку, подписанную для
// конкретного зрителя, — чужую подобрать нельзя, а токен бота никуда не уходит.
async function mediaSig(token, id, uid, kind) {
  return hex(await hmac(token, `${id}:${uid}:${kind}`)).slice(0, 24);
}
async function mediaUrl(env, origin, id, uid, kind) {
  return `${origin}/pmfile?id=${id}&u=${uid}&k=${kind}&s=${await mediaSig(env.BOT_TOKEN, id, uid, kind)}`;
}

// Письмо о новом сообщении: с кнопкой, которая открывает ту же переписку в
// приложении, и с пометкой, к какой ветке относится, чтобы ответ прямо из
// Telegram дошёл адресату.
async function pmNotify(env, to, fromId, fromName, text, media, origin) {
  // Адрес сервера обязателен: без него приложение, открытое впервые, не знает,
  // куда стучаться, и переписки не увидит.
  const api = origin || env.API_URL || '';
  const app = env.APP_URL
    ? `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}` +
      (api ? `api=${encodeURIComponent(api)}&` : '') + `pm=${fromId}`
    : '';
  const kb = app ? { inline_keyboard: [[{ text: '💬 Ответить в SHRhub', web_app: { url: app } }]] } : undefined;
  const cap = `✉️ ${fromName} в SHRhub${text ? `:\n\n${text}` : ''}\n\nМожно ответить прямо здесь: ответь на это сообщение.`;
  let r = null;
  try {
    if (media && media.kind === 'photo') {
      r = await tg(env, 'sendPhoto', { chat_id: to, photo: media.file_id, caption: cap, reply_markup: kb });
    } else if (media && media.kind === 'video') {
      r = await tg(env, 'sendVideo', { chat_id: to, video: media.file_id, caption: cap, reply_markup: kb });
    } else {
      r = await tg(env, 'sendMessage', { chat_id: to, text: cap, reply_markup: kb });
    }
  } catch (e) { return; }
  const mid = r && r.ok && r.result && r.result.message_id;
  if (!mid) return;
  try {
    await env.DB.prepare('INSERT OR REPLACE INTO pmlink(mid,uid,peer,at) VALUES(?,?,?,?)')
      .bind(mid, to, fromId, NOW()).run();
    if (Math.random() < 0.05)
      await env.DB.prepare('DELETE FROM pmlink WHERE at < ?').bind(NOW() - 30 * 86400000).run();
  } catch (e) {}
}
// Положить сообщение в ветку. Возвращает true, если получилось.
async function pmPut(env, from, to, text, fromName, origin) {
  await env.DB.prepare('INSERT INTO pm(pair,uid,peer,text,at,seen,kind) VALUES(?,?,?,?,?,0,?)')
    .bind(pairOf(from, to), from, to, text, NOW(), 'text').run();
  const peer = await env.DB.prepare('SELECT seen FROM players WHERE id=?').bind(to).first();
  if (!peer || !peer.seen || NOW() - peer.seen > 60000) {
    await pmNotify(env, to, from, fromName || 'Участник клуба', text, null, origin);
  }
  return true;
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
const json = (data, status, cors) => new Response(JSON.stringify(data), { status: status || 200, headers: { 'Content-Type': 'application/json', ...cors } });

// ---------- база ----------
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players(
    id INTEGER PRIMARY KEY, nick TEXT, av TEXT, lang INTEGER DEFAULT 0,
    tier INTEGER DEFAULT 0, tier_until INTEGER DEFAULT 0,
    extra TEXT DEFAULT '[]', owned TEXT DEFAULT '{}',
    saves INTEGER DEFAULT 0, codes INTEGER DEFAULT 0, gm INTEGER DEFAULT 0,
    pass_until INTEGER DEFAULT 0,
    pts INTEGER DEFAULT 0, streak INTEGER DEFAULT 0, best INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0, wins INTEGER DEFAULT 0,
    clan INTEGER DEFAULT 0, state TEXT, seen INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS preds(
    uid INTEGER, sym TEXT, hour INTEGER, dir INTEGER, k REAL DEFAULT 0, at INTEGER,
    PRIMARY KEY(uid, sym, hour))`,
  `CREATE INDEX IF NOT EXISTS preds_hour ON preds(sym, hour)`,
  `CREATE TABLE IF NOT EXISTS msgs(
    id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, uid INTEGER,
    nick TEXT, av TEXT, text TEXT, gold INTEGER DEFAULT 0, at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS msgs_room ON msgs(room, id)`,
  `CREATE TABLE IF NOT EXISTS clans(
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, emb TEXT,
    cap INTEGER DEFAULT 20, owner INTEGER, tr INTEGER DEFAULT 0, at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS pf(
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, sym TEXT, usd REAL, price REAL, at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS pf_uid ON pf(uid)`,
  `CREATE TABLE IF NOT EXISTS flags(uid INTEGER PRIMARY KEY, as_player INTEGER DEFAULT 0)`,
  // Полный доступ, выданный владельцем вручную: другу, активному игроку, победителю.
  // until = 0 выключено, until = -1 бессрочно, иначе срок в миллисекундах.
  // Напоминания. tz — сдвиг местного времени игрока от UTC в минутах (Киев зимой 120).
  // mh/eh — час утреннего и вечернего напоминания по его местному времени.
  // lastm/laste — день последней отправки, чтобы не писать дважды.
  `CREATE TABLE IF NOT EXISTS notif(
    uid INTEGER PRIMARY KEY, on_ INTEGER DEFAULT 0, tz INTEGER DEFAULT 0,
    mh INTEGER DEFAULT 12, eh INTEGER DEFAULT 20, lastm TEXT, laste TEXT)`,
  // Видимость в списке «кто сейчас в игре». hidden=1 — другие игроки не видят,
  // владелец платформы видит всегда: об этом прямо написано в самой игре.
  `CREATE TABLE IF NOT EXISTS prefs(uid INTEGER PRIMARY KEY, hidden INTEGER DEFAULT 0)`,
  // Оплаченное место на виду: кто, до какого числа, сколько заплатил
  `CREATE TABLE IF NOT EXISTS spots(
    kind TEXT, id INTEGER, until INTEGER, stars INTEGER, at INTEGER,
    PRIMARY KEY(kind, id))`,
  // Настройки клуба, которые меняет владелец: сейчас это скидка на звёзды
  `CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT)`,
  // Видео. Сами файлы лежат в Telegram, мы храним только file_id — пересылка по
  // нему не имеет ограничения по размеру, поэтому хранилище нам не нужно.
  `CREATE TABLE IF NOT EXISTS vids(
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, title TEXT,
    file_id TEXT, thumb TEXT, dur INTEGER, size INTEGER,
    at INTEGER, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
    boost_until INTEGER DEFAULT 0, boost_stars INTEGER DEFAULT 0,
    flags INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0)`,
  // Кто что смотрел и лайкал: без этого просмотры накрутит любой, обновляя экран
  `CREATE TABLE IF NOT EXISTS vseen(vid INTEGER, uid INTEGER, liked INTEGER DEFAULT 0,
    PRIMARY KEY(vid, uid))`,
  // Подписки: односторонние, как в инстаграме. Взаимности не требуем — так проще
  // и никто никого не ждёт. Нужны, чтобы не потерять человека в общем списке.
  `CREATE TABLE IF NOT EXISTS follows(
    uid INTEGER, target INTEGER, at INTEGER, PRIMARY KEY(uid, target))`,
  // Личная переписка с владельцем хранится в базе, а не только улетает в Telegram:
  // человек может прочитать её утром прямо в приложении, и ничего не теряется.
  // dir: in — письмо человеку, out — его ответ.
  `CREATE TABLE IF NOT EXISTS dms(
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, dir TEXT, text TEXT, at INTEGER, seen INTEGER DEFAULT 0)`,
  // Обращения в поддержку хранятся здесь, а не только улетают в личку владельцу:
  // без истории нельзя ни разобраться в споре, ни обосновать блокировку.
  // Личная переписка между людьми. pair — пара собеседников в порядке возрастания
  // id, чтобы обе стороны видели одну и ту же ветку, а не две разные.
  `CREATE TABLE IF NOT EXISTS pm(
    id INTEGER PRIMARY KEY AUTOINCREMENT, pair TEXT, uid INTEGER, peer INTEGER,
    text TEXT, at INTEGER, seen INTEGER DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS pm_pair ON pm(pair, id)`,
  `CREATE INDEX IF NOT EXISTS pm_new ON pm(peer, seen)`,
  // Какое письмо бота к какой ветке относится: нужно, чтобы ответ прямо из
  // Telegram попал тому, кому человек отвечает, а не в поддержку.
  `CREATE TABLE IF NOT EXISTS pmlink(mid INTEGER, uid INTEGER, peer INTEGER, at INTEGER,
    PRIMARY KEY(uid, mid))`,
  `CREATE TABLE IF NOT EXISTS tickets(
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, text TEXT, at INTEGER, done INTEGER DEFAULT 0)`,
  // Лента новостей. Храним только заголовок, источник и ссылку: текст статьи
  // чужой, копировать его нельзя. Заголовок со ссылкой — это сноска, а не перепечатка.
  `CREATE TABLE IF NOT EXISTS feed(
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT UNIQUE, src TEXT, at INTEGER)`,
  // Лента событий для владельца: кто пришёл, кто что сделал. Сами суммы из
  // записей SHR сюда не попадают — это чужие деньги, а не статистика клуба.
  `CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, kind TEXT, note TEXT, at INTEGER)`,
  // Новости от владельца: показываем в игре один раз и шлём в утреннем письме
  `CREATE TABLE IF NOT EXISTS ann(
    id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, at INTEGER, sent INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS gifts(
    uid INTEGER PRIMARY KEY, until INTEGER DEFAULT 0, note TEXT, by INTEGER, at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS pays(
    charge TEXT PRIMARY KEY, uid INTEGER, product TEXT, arg TEXT, stars INTEGER, at INTEGER)`,
];
let READY = false;
// Новые колонки к таблицам, которые уже созданы у работающих игроков.
// Если колонка есть — SQLite ругается, и это нормально: просто идём дальше.
const PATCH = [
  `ALTER TABLE pm ADD COLUMN kind TEXT DEFAULT 'text'`,
  `ALTER TABLE pm ADD COLUMN file_id TEXT`,
  `ALTER TABLE pm ADD COLUMN thumb TEXT`,
  `ALTER TABLE pm ADD COLUMN dur INTEGER DEFAULT 0`,
  `ALTER TABLE pm ADD COLUMN size INTEGER DEFAULT 0`,
  'ALTER TABLE pf ADD COLUMN cur TEXT',
  'ALTER TABLE pf ADD COLUMN amt REAL',
  'ALTER TABLE pf ADD COLUMN rate REAL',
  "ALTER TABLE pf ADD COLUMN k TEXT DEFAULT 'b'",
  'ALTER TABLE players ADD COLUMN no INTEGER',
  'ALTER TABLE players ADD COLUMN rep INTEGER DEFAULT 0',
  'ALTER TABLE players ADD COLUMN repday TEXT',
  'ALTER TABLE players ADD COLUMN repn INTEGER DEFAULT 0',
  'ALTER TABLE players ADD COLUMN trial INTEGER DEFAULT 0',
  'ALTER TABLE players ADD COLUMN banned INTEGER DEFAULT 0',
  'ALTER TABLE players ADD COLUMN ban_note TEXT',
  'ALTER TABLE players ADD COLUMN chat_ok INTEGER DEFAULT 0',
  "ALTER TABLE pf ADD COLUMN m TEXT DEFAULT 'sp'",
  'ALTER TABLE pf ADD COLUMN note TEXT',
];
async function ensure(env) {
  if (READY || !env.DB) return !!env.DB;
  await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  for (const q of PATCH) { try { await env.DB.prepare(q).run(); } catch (e) {} }
  READY = true;
  await movePm(env);
  return true;
}
// Старые письма владельца жили в отдельной таблице. Переписка теперь общая для
// всех, поэтому переносим их в неё один раз, чтобы ничего не пропало.
async function movePm(env) {
  try {
    const done = await env.DB.prepare("SELECT v FROM settings WHERE k='pm_moved'").first();
    if (done && done.v) return;
    const own = Number(env.OWNER_ID) || 0;
    if (own) {
      const r = await env.DB.prepare('SELECT uid, dir, text, at, seen FROM dms ORDER BY id').all();
      for (const x of (r.results || [])) {
        const from = x.dir === 'in' ? own : x.uid;
        const to = x.dir === 'in' ? x.uid : own;
        await env.DB.prepare('INSERT INTO pm(pair,uid,peer,text,at,seen) VALUES(?,?,?,?,?,?)')
          .bind(pairOf(own, x.uid), from, to, x.text, x.at, x.seen | 0).run();
      }
    }
    await env.DB.prepare("INSERT INTO settings(k,v) VALUES('pm_moved','1') ON CONFLICT(k) DO UPDATE SET v='1'").run();
  } catch (e) {}
}
const NOW = () => Date.now();
// Пробный доступ новичку
const TRIAL_DAYS = 14, TRIAL_TIER = 5;
// Рейтинг клуба. Его даёт сервер и только за то, что он сам видит:
// прогноз отправлен, сообщение написано, запись в SHR сделана, человек зашёл.
// Потолок в сутки нужен, чтобы рейтинг нельзя было накрутить за вечер:
// без него выигрывает не тот, кто играет, а тот, кто быстрее жмёт.
const REP_DAY_CAP = 40;
const DAY = (ms) => new Date(ms || NOW()).toISOString().slice(0, 10);
async function logEvent(env, uid, kind, note) {
  try {
    await env.DB.prepare('INSERT INTO events(uid,kind,note,at) VALUES(?,?,?,?)')
      .bind(uid, kind, (note || '').slice(0, 48), NOW()).run();
    // Лента нужна свежая, старое только занимает место
    if (Math.random() < 0.02)
      await env.DB.prepare('DELETE FROM events WHERE at < ?').bind(NOW() - 30 * 86400000).run();
  } catch (e) {}
}
// Сообщение владельцу. Молча, без ответа: если он заблокировал бота, это не повод
// ронять запрос игрока.
async function tellOwner(env, text) {
  const owner = Number(env.OWNER_ID || env.SUPPORT_CHAT_ID || 0);
  if (!owner) return;
  try { await tg(env, 'sendMessage', { chat_id: owner, text }); } catch (e) {}
}
async function addRep(env, uid, n) {
  if (!(n > 0)) return;
  const day = DAY();
  const r = await env.DB.prepare('SELECT repday, repn FROM players WHERE id=?').bind(uid).first();
  if (!r) return;
  const used = r.repday === day ? (r.repn | 0) : 0;
  const give = Math.max(0, Math.min(n, REP_DAY_CAP - used));
  if (!give) return;
  await env.DB.prepare('UPDATE players SET rep=COALESCE(rep,0)+?, repday=?, repn=? WHERE id=?')
    .bind(give, day, used + give, uid).run();
}
// ---------- скидка ----------
// Скидка настоящая: обычная цена остаётся обычной ценой, по ней покупают, когда
// скидки нет. Зачёркивать можно только то, что человек действительно заплатил бы
// в другой день, иначе это не скидка, а нарисованная цифра.
async function getSale(env) {
  const r = await env.DB.prepare("SELECT v FROM settings WHERE k='sale'").first();
  if (!r) return null;
  let sale = null;
  try { sale = JSON.parse(r.v); } catch (e) { return null; }
  if (!sale || !(sale.pct > 0) || !(sale.until > NOW())) return null;
  return { pct: Math.min(80, sale.pct | 0), until: sale.until };
}
function salePrice(stars, sale) {
  if (!sale) return stars;
  return Math.max(1, Math.round(stars * (100 - sale.pct) / 100));
}
// Плата за голос в чате выключена по умолчанию: пока клуб маленький, цена входа
// отсекает живых новичков вернее, чем спамеров. Включается одной кнопкой, если
// в чаты начнут ломиться чужие.
async function chatPaid(env) {
  const r = await env.DB.prepare("SELECT v FROM settings WHERE k='chatpay'").first();
  return !!(r && r.v === '1');
}
async function lastAnn(env) {
  return await env.DB.prepare('SELECT id,text,at FROM ann ORDER BY id DESC LIMIT 1').first();
}
// Кто сейчас занимает оплаченное место
async function spotOf(env, kind) {
  const r = await env.DB.prepare('SELECT id, until FROM spots WHERE kind=? AND until>? ORDER BY until DESC LIMIT 1')
    .bind(kind, NOW()).first();
  return r || null;
}
async function asPlayer(env, uid) {
  const r = await env.DB.prepare('SELECT as_player FROM flags WHERE uid=?').bind(uid).first();
  return !!(r && r.as_player);
}
const isOwner = (env, user) => {
  const owner = Number(env.OWNER_ID || env.SUPPORT_CHAT_ID || 0);
  return !!owner && user.id === owner;
};
const HOUR = () => Math.floor(Date.now() / 3600000);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

// Номер в клубе выдаёт сервер и только один раз. Раньше игра брала случайное
// шестизначное число — у каждого свой, но смысла в нём не было никакого.
// Теперь это порядок вступления: основатель клуба первый, дальше по очереди.
async function clubNo(env, uid, owner) {
  if (owner) {
    await env.DB.prepare('UPDATE players SET no=1 WHERE id=?').bind(uid).run();
    return 1;
  }
  const r = await env.DB.prepare('SELECT COALESCE(MAX(no),1) m FROM players').first();
  const n = ((r && r.m) | 0) + 1;
  await env.DB.prepare('UPDATE players SET no=? WHERE id=?').bind(n, uid).run();
  return n;
}
async function getPlayer(env, user) {
  const id = user.id;
  let row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
  if (!row) {
    // Пробный доступ на две недели — один раз на Telegram ID. Ничего не списывается
    // и само не продлевается: через 14 дней человек просто возвращается на Free.
    const until = NOW() + TRIAL_DAYS * 86400000;
    await env.DB.prepare('INSERT INTO players(id,nick,seen,tier,tier_until,trial) VALUES(?,?,?,?,?,?)')
      .bind(id, clean(user.first_name, 16), NOW(), TRIAL_TIER, until, until).run();
    row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
    const total = await env.DB.prepare('SELECT COUNT(*) n FROM players').first();
    await logEvent(env, id, 'join', clean(user.first_name, 16));
    await tellOwner(env, `👤 Новый человек в клубе: ${clean(user.first_name, 16) || 'без имени'}` +
      (user.username ? ` (@${user.username})` : '') + `\nВсего в клубе: ${total ? total.n : '?'}`);
  }
  const own = isOwner(env, user);
  if (!row.no || (own && row.no !== 1)) row.no = await clubNo(env, id, own);
  return row;
}
// Что сервер считает правдой: всё оплаченное. Остальной прогресс — на слово игроку.
// У владельца платформа открыта всегда — кроме случая, когда он сам включил режим
// «смотреть как обычный игрок», чтобы проверить, что видят остальные.
const ALL_SKINS = () => {
  const o = {};
  for (const k in PRODUCTS) if (PRODUCTS[k].own) o[PRODUCTS[k].own] = 1;
  return o;
};
// Действует ли сейчас выданный владельцем доступ
async function giftOn(env, uid) {
  const g = await env.DB.prepare('SELECT until FROM gifts WHERE uid=?').bind(uid).first();
  if (!g) return false;
  return g.until === -1 || g.until > NOW();
}
function paid(row, full) {
  const now = NOW();
  if (full) return { tier: 5, tier_until: now + 31 * 86400000, extra: JSON.parse(row.extra || '[]'),
    owned: ALL_SKINS(), saves: 99, codes: 99, gmFree: 99, pass: true, owner: true };
  if (row.gift) return { tier: 5, tier_until: row.gift === -1 ? now + 3650 * 86400000 : row.gift,
    extra: JSON.parse(row.extra || '[]'), owned: ALL_SKINS(), saves: 99, codes: 99, gmFree: 99, pass: true, gift: true };
  const onTrial = (row.trial | 0) > now && row.tier_until > now;
  return {
    trial: onTrial ? row.trial : 0,
    tier: row.tier_until > now ? row.tier : 0,
    tier_until: row.tier_until,
    extra: JSON.parse(row.extra || '[]'),
    owned: JSON.parse(row.owned || '{}'),
    saves: row.saves | 0,
    codes: row.codes | 0,
    gmFree: row.gm | 0,
    pass: row.pass_until > now,
  };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': env.APP_URL ? new URL(env.APP_URL).origin : '*', 'Access-Control-Allow-Headers': 'Content-Type, x-init', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const appUrl = `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}api=${encodeURIComponent(url.origin)}`;

    // Общая часть для всех запросов из игры: разобрать тело и проверить подпись
    const API = ['/invoice', '/support', '/me', '/vote', '/sent', '/chat', '/clans', '/top', '/pf', '/stats', '/owner', '/notif', '/pref', '/online', '/feed', '/dm', '/profile', '/follow', '/vids', '/vid', '/pm', '/pms'];
    let body = null, user = null;
    if (req.method === 'POST' && API.includes(url.pathname)) {
      try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400, cors); }
      user = await verifyInitData(body.initData, env.BOT_TOKEN);
      if (!user) return json({ error: 'auth' }, 401, cors);
    }

    // 0. Загрузка ролика прямо из приложения: человек нажимает плюсик, выбирает
    // файл, и мы передаём его Telegram. Байты идут сырым телом, без multipart:
    // разбирать multipart в воркере дороже, чем просто принять поток.
    if (req.method === 'POST' && url.pathname === '/vup') {
      if (!await ensure(env)) return json({ error: 'db' }, 503, cors);
      let init = '';
      try { init = decodeURIComponent(req.headers.get('x-init') || ''); } catch (e) {}
      const who = await verifyInitData(init, env.BOT_TOKEN);
      if (!who) return json({ error: 'auth' }, 401, cors);
      const row = await env.DB.prepare('SELECT COALESCE(banned,0) b FROM players WHERE id=?').bind(who.id).first();
      if (row && row.b) return json({ error: 'banned' }, 403, cors);
      // Бот умеет заливать файл до 50 МБ. Что крупнее — человек отправляет
      // в чат сам: оттуда ролик проходит любого размера.
      const max = 40 * 1024 * 1024;
      const len = Number(req.headers.get('content-length') || 0);
      if (len > max) return json({ error: 'big', max: max }, 413, cors);
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: 'empty' }, 400, cors);
      if (buf.byteLength > max) return json({ error: 'big', max: max }, 413, cors);
      let title = '';
      try { title = clean(decodeURIComponent(url.searchParams.get('title') || ''), 80); } catch (e) {}
      const fd = new FormData();
      fd.append('chat_id', String(who.id));
      fd.append('disable_notification', 'true');
      fd.append('caption', `🎬 ${title || 'Без названия'}\n\nТвой ролик в ленте SHRhub`);
      fd.append('video', new Blob([buf], { type: 'video/mp4' }), 'video.mp4');
      const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendVideo`, { method: 'POST', body: fd });
      const j = await r.json();
      const v = j && j.ok && j.result && (j.result.video || j.result.document);
      if (!v || !v.file_id) return json({ error: 'tg' }, 502, cors);
      const thumb = (v.thumbnail && v.thumbnail.file_id) || (v.thumb && v.thumb.file_id) || '';
      const ins = await env.DB.prepare(
        `INSERT INTO vids(uid,title,file_id,thumb,dur,size,at) VALUES(?,?,?,?,?,?,?)`)
        .bind(who.id, title || 'Без названия', v.file_id, thumb, v.duration || 0, v.file_size || buf.byteLength, NOW()).run();
      await logEvent(env, who.id, 'vid', (title || '').slice(0, 40));
      await addRep(env, who.id, 2);
      await tellOwner(env, `🎬 Новый ролик: «${title || 'без названия'}»\nАвтор: id ${who.id}`);
      return json({ ok: true, id: (ins.meta && ins.meta.last_row_id) || 0 }, 200, cors);
    }

    // 0b. Фото или ролик в личную переписку. Файл приходит сырым телом, как и в
    // ленту: Telegram хранит его у себя, мы держим только file_id.
    if (req.method === 'POST' && url.pathname === '/pmup') {
      if (!await ensure(env)) return json({ error: 'db' }, 503, cors);
      let init = '';
      try { init = decodeURIComponent(req.headers.get('x-init') || ''); } catch (e) {}
      const who = await verifyInitData(init, env.BOT_TOKEN);
      if (!who) return json({ error: 'auth' }, 401, cors);
      const me = await getPlayer(env, who);
      if (me && me.banned) return json({ error: 'banned' }, 403, cors);
      const to = Number(url.searchParams.get('with')) || 0;
      if (!to || to === who.id) return json({ error: 'who' }, 400, cors);
      const peer = await env.DB.prepare('SELECT id, nick, seen FROM players WHERE id=?').bind(to).first();
      if (!peer) return json({ error: 'nope' }, 404, cors);
      const kind = url.searchParams.get('kind') === 'video' ? 'video' : 'photo';
      const max = (kind === 'video' ? 40 : 10) * 1024 * 1024;
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: 'empty' }, 400, cors);
      if (buf.byteLength > max) return json({ error: 'big' }, 413, cors);
      let cap = '';
      try { cap = clean(decodeURIComponent(url.searchParams.get('caption') || ''), 300); } catch (e) {}
      const from = (me && me.nick) || 'Участник клуба';
      // Файл грузим в чат отправителя: так у него остаётся своя копия, а у нас
      // появляется file_id, по которому ролик пересылается уже без загрузки.
      const fd = new FormData();
      fd.append('chat_id', String(who.id));
      fd.append('disable_notification', 'true');
      if (cap) fd.append('caption', cap);
      fd.append(kind, new Blob([buf], { type: kind === 'video' ? 'video/mp4' : 'image/jpeg' }),
        kind === 'video' ? 'video.mp4' : 'photo.jpg');
      const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${kind === 'video' ? 'sendVideo' : 'sendPhoto'}`,
        { method: 'POST', body: fd });
      const j = await r.json();
      if (!j || !j.ok || !j.result) return json({ error: 'tg' }, 502, cors);
      const res = j.result;
      let fid = '', thumb = '', dur = 0, size = buf.byteLength;
      if (kind === 'video') {
        const v = res.video || res.document || {};
        fid = v.file_id || '';
        thumb = (v.thumbnail && v.thumbnail.file_id) || (v.thumb && v.thumb.file_id) || '';
        dur = v.duration || 0;
        size = v.file_size || size;
      } else {
        const ph = res.photo || [];
        const big = ph.length ? ph[ph.length - 1] : null;
        fid = big ? big.file_id : '';
        thumb = ph.length > 1 ? ph[0].file_id : fid;
        size = big && big.file_size ? big.file_size : size;
      }
      if (!fid) return json({ error: 'tg' }, 502, cors);
      await env.DB.prepare(
        `INSERT INTO pm(pair,uid,peer,text,at,seen,kind,file_id,thumb,dur,size) VALUES(?,?,?,?,?,0,?,?,?,?,?)`)
        .bind(pairOf(who.id, to), who.id, to, cap, NOW(), kind, fid, thumb, dur, size).run();
      await addRep(env, who.id, 1);
      // Нет человека в приложении — донесём файл в Telegram по тому же file_id
      if (!peer.seen || NOW() - peer.seen > 60000) {
        await pmNotify(env, to, who.id, from, cap, { kind, file_id: fid }, url.origin);
      }
      return json({ ok: true }, 200, cors);
    }

    // 1. Счёт на оплату звёздами
    if (body && url.pathname === '/invoice') {
      const pr = PRODUCTS[body.product];
      if (!pr) return json({ error: 'product' }, 400, cors);
      const arg = clean(body.arg, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const sale = await getSale(env);
      const amount = salePrice(pr.stars, sale);
      const inv = { title: pr.title, description: `${pr.title}. Игровая покупка в SHRhub, денежной ценности не имеет.`, payload: `${user.id}:${body.product}:${arg}`, currency: 'XTR', prices: [{ label: pr.title, amount }] };
      if (pr.sub) inv.subscription_period = MONTH;
      const r = await tg(env, 'createInvoiceLink', inv);
      return r.ok ? json({ link: r.result }, 200, cors) : json({ error: r.description || 'telegram' }, 502, cors);
    }

    // 2. Поддержка
    if (body && url.pathname === '/support') {
      const text = clean(body.text, 1000);
      if (!text) return json({ error: 'empty' }, 400, cors);
      await env.DB.prepare('INSERT INTO tickets(uid,text,at,done) VALUES(?,?,?,0)')
        .bind(user.id, text, NOW()).run();
      await logEvent(env, user.id, 'help', text.slice(0, 40));
      if (env.SUPPORT_CHAT_ID) await tg(env, 'sendMessage', { chat_id: env.SUPPORT_CHAT_ID, text: `💬 Поддержка\nОт: ${clean(user.first_name, 32)} (id ${user.id})\n\n${text}` });
      return json({ ok: true }, 200, cors);
    }

    if (body && !(await ensure(env))) return json({ error: 'nodb' }, 503, cors);

    // 3. Профиль: что куплено — слово сервера, остальной прогресс хранится как есть
    if (body && url.pathname === '/me') {
      const row = await getPlayer(env, user);
      if (body.state) {
        const st = clean(JSON.stringify(body.state), 60000);
        await env.DB.prepare(`UPDATE players SET nick=?,av=?,lang=?,pts=?,streak=?,best=?,total=?,wins=?,state=?,seen=? WHERE id=?`)
          .bind(clean(body.state.nick, 16) || clean(user.first_name, 16), clean(body.state.av, 8), body.state.lang | 0,
            body.state.pts | 0, body.state.streak | 0, body.state.best | 0, body.state.total | 0, body.state.wins | 0,
            st, NOW(), user.id).run();
      }
      // Первый заход за сутки — небольшая награда за то, что человек вернулся
      if (!row.repday || row.repday !== DAY()) await addRep(env, user.id, 3);
      const online = await env.DB.prepare('SELECT COUNT(*) n FROM players WHERE seen>?').bind(NOW() - 300000).first();
      const own = isOwner(env, user), ap = own ? await asPlayer(env, user.id) : false;
      if (!own || ap) { const g = await env.DB.prepare('SELECT until FROM gifts WHERE uid=?').bind(user.id).first();
        if (g && (g.until === -1 || g.until > NOW())) row.gift = g.until; }
      const nt = await env.DB.prepare('SELECT on_,mh,eh FROM notif WHERE uid=?').bind(user.id).first();
      const pf = await env.DB.prepare('SELECT hidden FROM prefs WHERE uid=?').bind(user.id).first();
      const sale = await getSale(env);
      const an = await lastAnn(env);
      const unread = await env.DB.prepare("SELECT COUNT(*) n FROM dms WHERE uid=? AND dir='in' AND seen=0").bind(user.id).first();
      const foll = await env.DB.prepare('SELECT COUNT(*) n FROM follows WHERE uid=?').bind(user.id).first();
      const pmn = await env.DB.prepare('SELECT COUNT(*) n FROM pm WHERE peer=? AND seen=0').bind(user.id).first();
      return json({ id: user.id, owner: own, asPlayer: ap, gift: !!row.gift, no: row.no || null, paid: paid(row, own && !ap),
        notif: { on: !!(nt && nt.on_), mh: nt ? nt.mh : 12, eh: nt ? nt.eh : 20, asked: !!nt },
        hidden: !!(pf && pf.hidden),
        banned: !!row.banned, banNote: row.ban_note || '', dmNew: unread ? unread.n : 0, pmNew: pmn ? pmn.n : 0, following: foll ? foll.n : 0,
        chatOk: !!row.chat_ok || own || !(await chatPaid(env)),
        sale: sale, ann: an ? { id: an.id, text: an.text, at: an.at } : null,
        state: body.state ? null : (row.state ? JSON.parse(row.state) : null), online: online ? online.n : 1 }, 200, cors);
    }

    // 3e. Личная переписка игрока с владельцем
    if (body && url.pathname === '/dm') {
      const row = await getPlayer(env, user);
      const text = clean(body.text, 600);
      if (text) {
        await env.DB.prepare('INSERT INTO dms(uid,dir,text,at,seen) VALUES(?,?,?,?,1)')
          .bind(user.id, 'out', text, NOW()).run();
        await tellOwner(env, `✉️ ${row.nick || user.id} (id ${user.id})\n\n${text}`);
      }
      // Открыл переписку — значит прочитал
      await env.DB.prepare("UPDATE dms SET seen=1 WHERE uid=? AND dir='in'").bind(user.id).run();
      const r = await env.DB.prepare('SELECT id,dir,text,at FROM dms WHERE uid=? ORDER BY id DESC LIMIT 50')
        .bind(user.id).all();
      return json({ list: (r.results || []).reverse() }, 200, cors);
    }

    // 3h. Видео: лента и страница человека
    if (body && url.pathname === '/vids') {
      const own = isOwner(env, user);
      const who = Number(body.uid) || 0;
      const see = own ? 1 : 0;
      const sql = who
        ? `SELECT v.*, p.nick, p.av FROM vids v LEFT JOIN players p ON p.id=v.uid
            WHERE v.uid=? AND (v.hidden=0 OR ?=1 OR v.uid=?) ORDER BY v.id DESC LIMIT 40`
        : `SELECT v.*, p.nick, p.av FROM vids v LEFT JOIN players p ON p.id=v.uid
            WHERE v.hidden=0 OR ?=1 OR v.uid=? ORDER BY (v.boost_until > ${NOW()}) DESC, v.id DESC LIMIT 40`;
      const r = who
        ? await env.DB.prepare(sql).bind(who, see, user.id).all()
        : await env.DB.prepare(sql).bind(see, user.id).all();
      const mine = await env.DB.prepare('SELECT vid, liked FROM vseen WHERE uid=?').bind(user.id).all();
      const liked = {};
      (mine.results || []).forEach((x) => { if (x.liked) liked[x.vid] = 1; });
      const list = (r.results || []).map((v) => ({
        id: v.id, uid: v.uid, nick: v.nick, av: v.av, title: v.title,
        dur: v.dur, size: v.size, at: v.at, views: v.views, likes: v.likes,
        boost: v.boost_until > NOW(), until: v.boost_until | 0, paid: v.boost_stars | 0,
        hidden: !!v.hidden, flags: v.flags,
        thumb: v.thumb && !v.hidden ? `${url.origin}/vfile?id=${v.id}&kind=thumb` : '',
        src: !v.hidden && v.size > 0 && v.size <= 19 * 1024 * 1024
          ? `${url.origin}/vfile?id=${v.id}&kind=video` : '',
        playable: v.size > 0 && v.size <= 19 * 1024 * 1024,
        me: v.uid === user.id, liked: !!liked[v.id],
      }));
      return json({ list, owner: own }, 200, cors);
    }

    // 3i. Действия с роликом
    if (body && url.pathname === '/vid') {
      const vid = Number(body.id) || 0;
      if (!vid) return json({ error: 'id' }, 400, cors);
      const v = await env.DB.prepare('SELECT * FROM vids WHERE id=?').bind(vid).first();
      if (!v) return json({ error: 'nope' }, 404, cors);
      const act = clean(body.act, 12);
      if (act === 'view') {
        // Просмотр считаем один раз с человека, иначе его накрутит кто угодно
        const seen = await env.DB.prepare('SELECT 1 x FROM vseen WHERE vid=? AND uid=?').bind(vid, user.id).first();
        if (!seen) {
          await env.DB.prepare('INSERT OR IGNORE INTO vseen(vid,uid,liked) VALUES(?,?,0)').bind(vid, user.id).run();
          await env.DB.prepare('UPDATE vids SET views=views+1 WHERE id=?').bind(vid).run();
        }
        // Файл крупнее 20 МБ скачать боту нельзя, но переслать по file_id можно любой
        await tg(env, 'sendVideo', { chat_id: user.id, video: v.file_id,
          caption: `🎬 ${v.title || ''}\n\nИз ленты SHRhub` });
      } else if (act === 'like') {
        const row = await env.DB.prepare('SELECT liked FROM vseen WHERE vid=? AND uid=?').bind(vid, user.id).first();
        const now = row && row.liked ? 0 : 1;
        await env.DB.prepare('INSERT INTO vseen(vid,uid,liked) VALUES(?,?,?) ON CONFLICT(vid,uid) DO UPDATE SET liked=?')
          .bind(vid, user.id, now, now).run();
        await env.DB.prepare('UPDATE vids SET likes=MAX(0,likes+?) WHERE id=?').bind(now ? 1 : -1, vid).run();
      } else if (act === 'report') {
        await env.DB.prepare('UPDATE vids SET flags=flags+1 WHERE id=?').bind(vid).run();
        await tellOwner(env, `🚩 Жалоба на ролик #${vid} «${v.title || ''}»\nОт: id ${user.id}\nВсего жалоб: ${(v.flags | 0) + 1}`);
      } else if (act === 'del' && (v.uid === user.id || isOwner(env, user))) {
        await env.DB.prepare('DELETE FROM vids WHERE id=?').bind(vid).run();
        await env.DB.prepare('DELETE FROM vseen WHERE vid=?').bind(vid).run();
      } else if (act === 'hide' && isOwner(env, user)) {
        await env.DB.prepare('UPDATE vids SET hidden=? WHERE id=?').bind(body.on ? 1 : 0, vid).run();
        if (body.on) { try { await tg(env, 'sendMessage', { chat_id: v.uid,
          text: `Твой ролик «${v.title || ''}» снят с ленты: он нарушает правила клуба (без наркотиков, оружия, насилия и чужого контента). Если считаешь это ошибкой — ответь на это сообщение.` }); } catch (e) {} }
      }
      return json({ ok: true }, 200, cors);
    }

    // 3j. Личная переписка: список разговоров
    if (body && url.pathname === '/pms') {
      await getPlayer(env, user);
      const r = await env.DB.prepare(
        `SELECT m.pair, m.uid, m.text, m.at, m.kind,
                CASE WHEN m.uid=? THEN m.peer ELSE m.uid END who,
                (SELECT COUNT(*) FROM pm x WHERE x.pair=m.pair AND x.peer=? AND x.seen=0) unread
           FROM pm m
           JOIN (SELECT pair, MAX(id) mid FROM pm WHERE uid=? OR peer=? GROUP BY pair) g
             ON g.mid = m.id
          ORDER BY m.id DESC LIMIT 40`)
        .bind(user.id, user.id, user.id, user.id).all();
      const rows = r.results || [];
      const out = [];
      for (const x of rows) {
        const p = await env.DB.prepare(
          'SELECT id, nick, av, seen FROM players WHERE id=?').bind(x.who).first();
        const hid = await env.DB.prepare(
          'SELECT COALESCE(hidden,0) h FROM prefs WHERE uid=?').bind(x.who).first();
        out.push({
          id: x.who, nick: (p && p.nick) || '?', av: (p && p.av) || '🎩',
          seen: hid && hid.h ? 0 : (p && p.seen) || 0,
          last: x.text, kind: x.kind || 'text', at: x.at, mine: x.uid === user.id, unread: x.unread | 0,
        });
      }
      return json({ list: out, n: out.reduce((a, x) => a + x.unread, 0) }, 200, cors);
    }

    // 3k. Личная переписка: одна ветка
    if (body && url.pathname === '/pm') {
      const me = await getPlayer(env, user);
      const who = Number(body.with) || 0;
      if (!who || who === user.id) return json({ error: 'who' }, 400, cors);
      const peer = await env.DB.prepare(
        'SELECT id, nick, av, seen, COALESCE(banned,0) b FROM players WHERE id=?').bind(who).first();
      if (!peer) return json({ error: 'nope' }, 404, cors);
      const pair = pairOf(user.id, who);
      const text = clean(body.text, 600);
      if (text) {
        if (me && me.banned) return json({ error: 'banned' }, 403, cors);
        // Защита от шквала сообщений: больше 20 за минуту — это уже не разговор
        const spam = await env.DB.prepare(
          'SELECT COUNT(*) n FROM pm WHERE uid=? AND at>?').bind(user.id, NOW() - 60000).first();
        if (spam && spam.n >= 20) return json({ error: 'slow' }, 429, cors);
        await env.DB.prepare('INSERT INTO pm(pair,uid,peer,text,at,seen) VALUES(?,?,?,?,?,0)')
          .bind(pair, user.id, who, text, NOW()).run();
        await addRep(env, user.id, 1);
        // Если человека сейчас нет в приложении, пусть письмо дождётся его в Telegram
        // Приложение отмечается на сервере раз в 20 секунд. Значит, кто сейчас
        // в нём — молчим, он и так увидит сообщение в открытой ветке. Все
        // остальные получают письмо от бота, даже если вышли минуту назад.
        if (!peer.seen || NOW() - peer.seen > 60000) {
          await pmNotify(env, who, user.id, (me && me.nick) || 'Участник клуба', text, null, url.origin);
        }
      }
      // Входящие в этой ветке прочитаны
      await env.DB.prepare('UPDATE pm SET seen=1 WHERE pair=? AND peer=? AND seen=0')
        .bind(pair, user.id).run();
      const before = Number(body.before) || 0;
      const cols = 'id,uid,text,at,seen,kind,thumb,file_id,dur,size';
      const r = before
        ? await env.DB.prepare(`SELECT ${cols} FROM pm WHERE pair=? AND id<? ORDER BY id DESC LIMIT 40`)
            .bind(pair, before).all()
        : await env.DB.prepare(`SELECT ${cols} FROM pm WHERE pair=? ORDER BY id DESC LIMIT 40`)
            .bind(pair).all();
      const raw = (r.results || []).reverse();
      const more = raw.length === 40;
      const list = [];
      for (const m of raw) {
        const o = { id: m.id, uid: m.uid, text: m.text, at: m.at, seen: m.seen | 0, kind: m.kind || 'text' };
        if (o.kind !== 'text' && m.file_id) {
          o.thumb = await mediaUrl(env, url.origin, m.id, user.id, 'thumb');
          o.dur = m.dur | 0;
          o.size = m.size | 0;
          // Ролик крупнее 20 МБ в приложении не играет: Telegram не отдаёт файл
          o.src = (o.kind === 'photo' || (m.size > 0 && m.size <= 19 * 1024 * 1024))
            ? await mediaUrl(env, url.origin, m.id, user.id, 'full') : '';
        }
        list.push(o);
      }
      const hid = await env.DB.prepare('SELECT COALESCE(hidden,0) h FROM prefs WHERE uid=?').bind(who).first();
      return json({ list, more, peer: { id: peer.id, nick: peer.nick, av: peer.av,
        seen: hid && hid.h ? 0 : peer.seen } }, 200, cors);
    }

    // 3g. Подписки
    if (body && url.pathname === '/follow') {
      await getPlayer(env, user);
      const target = Number(body.target) || 0;
      if (target && target !== user.id) {
        if (body.on) {
          await env.DB.prepare('INSERT OR IGNORE INTO follows(uid,target,at) VALUES(?,?,?)')
            .bind(user.id, target, NOW()).run();
        } else {
          await env.DB.prepare('DELETE FROM follows WHERE uid=? AND target=?').bind(user.id, target).run();
        }
      }
      // Список тех, за кем человек следит: это его записная книжка
      const r = await env.DB.prepare(
        `SELECT p.id, p.nick, p.av, p.pts, p.best, p.seen, p.tier, p.tier_until,
                COALESCE(f.hidden,0) hidden
           FROM follows w JOIN players p ON p.id = w.target
           LEFT JOIN prefs f ON f.uid = p.id
          WHERE w.uid = ? ORDER BY p.seen DESC LIMIT 100`).bind(user.id).all();
      const list = (r.results || []).map((x) => ({
        id: x.id, nick: x.nick, av: x.av, pts: x.pts, best: x.best,
        tier: x.tier_until > NOW() ? x.tier : 0,
        seen: x.hidden ? 0 : x.seen,
      }));
      return json({ list, n: list.length }, 200, cors);
    }

    // 3f. Карточка игрока: то, что любой участник может о нём узнать
    if (body && url.pathname === '/profile') {
      const uid = Number(body.uid) || 0;
      if (!uid) return json({ error: 'uid' }, 400, cors);
      const own = isOwner(env, user);
      const p = await env.DB.prepare(
        `SELECT id,nick,av,no,pts,best,total,seen,tier,tier_until,COALESCE(rep,0) rep,
                COALESCE(banned,0) banned, COALESCE(chat_ok,0) chat_ok, clan
           FROM players WHERE id=?`).bind(uid).first();
      if (!p) return json({ error: 'nope' }, 404, cors);
      const hid = await env.DB.prepare('SELECT hidden FROM prefs WHERE uid=?').bind(uid).first();
      const stars = own ? await env.DB.prepare('SELECT COALESCE(SUM(stars),0) s FROM pays WHERE uid=?').bind(uid).first() : null;
      const fo = await env.DB.prepare('SELECT COUNT(*) n FROM follows WHERE target=?').bind(uid).first();
      const fi = await env.DB.prepare('SELECT COUNT(*) n FROM follows WHERE uid=?').bind(uid).first();
      const mine = await env.DB.prepare('SELECT 1 x FROM follows WHERE uid=? AND target=?').bind(user.id, uid).first();
      const out = {
        id: p.id, nick: p.nick, av: p.av, no: p.no, pts: p.pts, best: p.best, rep: p.rep,
        tier: p.tier_until > NOW() ? p.tier : 0,
        seen: (hid && hid.hidden && !own) ? 0 : p.seen,
        clan: p.clan || null,
        followers: fo ? fo.n : 0, following: fi ? fi.n : 0, iFollow: !!mine,
      };
      if (own) { out.banned = !!p.banned; out.chat_ok = !!p.chat_ok; out.stars = stars ? stars.s : 0; out.total = p.total; }
      return json({ player: out, owner: own }, 200, cors);
    }

    // 3d. Лента новостей: отдаём заголовки и ссылки, текст статей не трогаем
    if (body && url.pathname === '/feed') {
      const r = await env.DB.prepare('SELECT title,url,src,at FROM feed ORDER BY at DESC LIMIT 40').all();
      return json({ list: r.results || [] }, 200, cors);
    }

    // 3a. Видимость: игрок может спрятаться от других игроков
    if (body && url.pathname === '/pref') {
      await getPlayer(env, user);
      if (body.hidden !== undefined) {
        const h = body.hidden ? 1 : 0;
        await env.DB.prepare('INSERT INTO prefs(uid,hidden) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET hidden=?')
          .bind(user.id, h, h).run();
      }
      const r = await env.DB.prepare('SELECT hidden FROM prefs WHERE uid=?').bind(user.id).first();
      return json({ ok: true, hidden: !!(r && r.hidden) }, 200, cors);
    }

    // 3c. Кто сейчас в игре. Обычный игрок не видит спрятавшихся, владелец видит всех.
    if (body && url.pathname === '/online') {
      const own = isOwner(env, user);
      const since = NOW() - 300000;
      const r = await env.DB.prepare(
        `SELECT p.id, p.nick, p.av, p.pts, p.best, p.seen, p.tier, p.tier_until,
                COALESCE(f.hidden,0) hidden
           FROM players p LEFT JOIN prefs f ON f.uid = p.id
          WHERE p.seen > ?${own ? '' : ' AND COALESCE(f.hidden,0) = 0'}
          ORDER BY p.seen DESC LIMIT 60`).bind(since).all();
      const list = (r.results || []).map(x => own ? x
        : { id: x.id, nick: x.nick, av: x.av, pts: x.pts, best: x.best, tier: x.tier_until > NOW() ? x.tier : 0 });
      return json({ list, n: list.length, owner: own, now: NOW() }, 200, cors);
    }

    // 3b. Напоминания: игрок сам решает, писать ему или нет
    if (body && url.pathname === '/notif') {
      await getPlayer(env, user);
      const tz = Math.max(-840, Math.min(840, Number(body.tz) || 0));
      if (body.set !== undefined) {
        const on = body.set ? 1 : 0;
        await env.DB.prepare(`INSERT INTO notif(uid,on_,tz) VALUES(?,?,?)
          ON CONFLICT(uid) DO UPDATE SET on_=?, tz=?`).bind(user.id, on, tz, on, tz).run();
      } else {
        // просто обновляем часовой пояс, если игрок уехал или перевёл часы
        await env.DB.prepare('UPDATE notif SET tz=? WHERE uid=?').bind(tz, user.id).run();
      }
      const r = await env.DB.prepare('SELECT on_,mh,eh FROM notif WHERE uid=?').bind(user.id).first();
      return json({ ok: true, on: !!(r && r.on_), mh: r ? r.mh : 12, eh: r ? r.eh : 20 }, 200, cors);
    }

    // 4. Прогноз игрока: один на монету в час, он же считает настроение толпы
    if (body && url.pathname === '/vote') {
      const sym = clean(body.sym, 12).toUpperCase();
      const dir = body.dir > 0 ? 1 : -1;
      const k = Math.max(0, Math.min(1, Number(body.k) || 0));
      if (!sym) return json({ error: 'sym' }, 400, cors);
      const had = await env.DB.prepare('SELECT 1 x FROM preds WHERE uid=? AND sym=? AND hour=?')
        .bind(user.id, sym, HOUR()).first();
      await env.DB.prepare('INSERT OR REPLACE INTO preds(uid,sym,hour,dir,k,at) VALUES(?,?,?,?,?,?)')
        .bind(user.id, sym, HOUR(), dir, k, NOW()).run();
      if (!had) { await addRep(env, user.id, 3); await logEvent(env, user.id, 'pred', sym + ' ' + (dir > 0 ? '↑' : '↓')); }
      return json(await counts(env, sym), 200, cors);
    }

    // 5. Настроение толпы по монете
    if (body && url.pathname === '/sent') {
      const out = {};
      for (const s of (Array.isArray(body.syms) ? body.syms : []).slice(0, 30)) {
        const sym = clean(s, 12).toUpperCase();
        if (sym) out[sym] = await counts(env, sym);
      }
      return json(out, 200, cors);
    }

    // 6. Чат: сообщения общие для всех
    if (body && url.pathname === '/chat') {
      const room = clean(body.room, 32) || 'general';
      if (body.text) {
        const row = await getPlayer(env, user);
        const text = clean(body.text, 140);
        // Заблокированному чат закрыт, но ответ честный: он должен понимать, что
        // это не поломка, а решение, и что оспорить его можно через поддержку.
        if (row.banned) return json({ error: 'banned', note: row.ban_note || '' }, 403, cors);
        // Голос в чате открывается один раз и навсегда — но только если владелец
        // вообще включил плату. По умолчанию чат бесплатный.
        if (!row.chat_ok && !isOwner(env, user) && await chatPaid(env))
          return json({ error: 'needchat' }, 402, cors);
        const last = await env.DB.prepare('SELECT at FROM msgs WHERE uid=? ORDER BY id DESC LIMIT 1').bind(user.id).first();
        if (text && (!last || NOW() - last.at > 1500)) {
          await env.DB.prepare('INSERT INTO msgs(room,uid,nick,av,text,gold,at) VALUES(?,?,?,?,?,?,?)')
            .bind(room, user.id, row.nick || clean(user.first_name, 16), row.av || '🎩', text, body.gold ? 1 : 0, NOW()).run();
          if (body.gold && row.gm > 0) await env.DB.prepare('UPDATE players SET gm=gm-1 WHERE id=?').bind(user.id).run();
          await addRep(env, user.id, 1);
          await logEvent(env, user.id, 'msg', room);
        }
      }
      // before — листание в прошлое: игрок может дочитать переписку до самого начала
      const before = Math.max(0, Number(body.before) || 0);
      if (before) {
        const old = await env.DB.prepare('SELECT id,uid,nick,av,text,gold,at FROM msgs WHERE room=? AND id<? ORDER BY id DESC LIMIT 40')
          .bind(room, before).all();
        const list = (old.results || []).reverse();
        return json({ msgs: list, more: list.length === 40 }, 200, cors);
      }
      const after = Math.max(0, Number(body.after) || 0);
      const r = await env.DB.prepare('SELECT id,uid,nick,av,text,gold,at FROM msgs WHERE room=? AND id>? ORDER BY id DESC LIMIT 40')
        .bind(room, after).all();
      return json({ msgs: (r.results || []).reverse() }, 200, cors);
    }

    // 7. Кланы из живых людей
    if (body && url.pathname === '/clans') {
      const row = await getPlayer(env, user);
      const act = clean(body.act, 10);
      if (act === 'create') {
        const name = clean(body.name, 20);
        if (name.length < 3) return json({ error: 'name' }, 400, cors);
        try {
          await env.DB.prepare('INSERT INTO clans(name,emb,owner,at) VALUES(?,?,?,?)').bind(name, clean(body.emb, 4) || '🛡', user.id, NOW()).run();
        } catch (e) { return json({ error: 'taken' }, 409, cors); }
        const c = await env.DB.prepare('SELECT id FROM clans WHERE name=?').bind(name).first();
        await env.DB.prepare('UPDATE players SET clan=? WHERE id=?').bind(c.id, user.id).run();
      } else if (act === 'join') {
        const cid = Number(body.id) || 0;
        const c = await env.DB.prepare('SELECT * FROM clans WHERE id=?').bind(cid).first();
        if (!c) return json({ error: 'gone' }, 404, cors);
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM players WHERE clan=?').bind(cid).first();
        if (n && n.n >= c.cap) return json({ error: 'full' }, 409, cors);
        await env.DB.prepare('UPDATE players SET clan=? WHERE id=?').bind(cid, user.id).run();
      } else if (act === 'leave') {
        await env.DB.prepare('UPDATE players SET clan=0 WHERE id=?').bind(user.id).run();
      }
      const me = await env.DB.prepare('SELECT clan FROM players WHERE id=?').bind(user.id).first();
      const list = await env.DB.prepare(
        `SELECT c.id,c.name,c.emb,c.cap,c.tr,COUNT(p.id) n,COALESCE(SUM(p.pts),0) pts
         FROM clans c LEFT JOIN players p ON p.clan=c.id GROUP BY c.id ORDER BY pts DESC LIMIT 30`).all();
      let members = [];
      if (me && me.clan) {
        const r = await env.DB.prepare('SELECT id,nick,av,pts FROM players WHERE clan=? ORDER BY pts DESC LIMIT 50').bind(me.clan).all();
        members = r.results || [];
      }
      return json({ clan: me ? me.clan : 0, clans: list.results || [], members }, 200, cors);
    }

    // 7b. Калькулятор средней цены: записи покупок игрока
    if (body && url.pathname === '/pf') {
      await getPlayer(env, user);
      if (body.add) {
        const sym = clean(body.add.sym, 12).toUpperCase();
        const usd = Number(body.add.usd), price = Number(body.add.price);
        if (!sym || !(usd > 0) || !(price > 0)) return json({ error: 'bad' }, 400, cors);
        // Валюта, в которой человек реально платил, и курс на момент записи.
        // Курс храним, чтобы задним числом не пересчитывать старую покупку по сегодняшнему.
        const cur = clean(body.add.cur, 4).toLowerCase() || 'usd';
        const amt = Number(body.add.amt) > 0 ? Number(body.add.amt) : usd;
        const rate = Number(body.add.rate) > 0 ? Number(body.add.rate) : 1;
        const k = body.add.k === 's' ? 's' : 'b'; // покупка или продажа
        const m = ['sp', 'ex', 'bg'].includes(body.add.m) ? body.add.m : 'sp'; // раздел учёта
        const note = clean(body.add.note, 24);
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM pf WHERE uid=?').bind(user.id).first();
        if (n && n.n >= 300) return json({ error: 'limit' }, 409, cors);
        await env.DB.prepare('INSERT INTO pf(uid,sym,usd,price,at,cur,amt,rate,k,m,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .bind(user.id, sym, usd, price, NOW(), cur, amt, rate, k, m, note).run();
        // За запись в SHR рейтинг даём, но за её размер — нет: сумму человек
        // вписывает сам, и миллион в поле не делает его лучшим в клубе.
        await addRep(env, user.id, 1);
        // В ленту кладём только монету и раздел. Сумму — нет: это его деньги.
        await logEvent(env, user.id, 'pf', m + ' ' + sym);
      } else if (body.edit) {
        // Правка своей записи. Дату не трогаем: покупка была тогда, когда была.
        const e = body.edit;
        const id = Number(e.id) || 0;
        const usd = Number(e.usd), price = Number(e.price);
        if (id && usd > 0 && price > 0) {
          const cur = clean(e.cur, 4).toLowerCase() || 'usd';
          const amt = Number(e.amt) > 0 ? Number(e.amt) : usd;
          const rate = Number(e.rate) > 0 ? Number(e.rate) : 1;
          const k = e.k === 's' ? 's' : 'b';
          await env.DB.prepare('UPDATE pf SET usd=?,price=?,cur=?,amt=?,rate=?,k=? WHERE id=? AND uid=?')
            .bind(usd, price, cur, amt, rate, k, id, user.id).run();
        }
      } else if (body.del) {
        await env.DB.prepare('DELETE FROM pf WHERE id=? AND uid=?').bind(Number(body.del) || 0, user.id).run();
      }
      const r = await env.DB.prepare('SELECT id,sym,usd,price,at,cur,amt,rate,k,m,note FROM pf WHERE uid=? ORDER BY id').bind(user.id).all();
      return json({ list: r.results || [] }, 200, cors);
    }

    // 7c. Сводка для владельца бота
    if (body && url.pathname === '/stats') {
      if (!isOwner(env, user)) return json({ error: 'forbidden' }, 403, cors);
      const p = await env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN seen>? THEN 1 ELSE 0 END) live, SUM(CASE WHEN tier_until>? THEN 1 ELSE 0 END) subs FROM players')
        .bind(NOW() - 86400000, NOW()).first();
      const f = await env.DB.prepare('SELECT COUNT(DISTINCT uid) users, COUNT(*) rows, COALESCE(SUM(usd),0) usd FROM pf').first();
      const top = await env.DB.prepare('SELECT sym, COUNT(*) n, COALESCE(SUM(usd),0) usd FROM pf GROUP BY sym ORDER BY n DESC LIMIT 10').all();
      const pay = await env.DB.prepare('SELECT COUNT(*) n, COALESCE(SUM(stars),0) stars FROM pays').first();
      // Кто что купил: по человеку и последние оплаты по одной
      const byUser = await env.DB.prepare(
        `SELECT y.uid, p.nick, p.av, COUNT(*) n, COALESCE(SUM(y.stars),0) stars, MAX(y.at) last
           FROM pays y LEFT JOIN players p ON p.id = y.uid
          GROUP BY y.uid ORDER BY stars DESC LIMIT 30`).all();
      const last = await env.DB.prepare(
        `SELECT y.uid, p.nick, y.product, y.arg, y.stars, y.at
           FROM pays y LEFT JOIN players p ON p.id = y.uid
          ORDER BY y.at DESC LIMIT 30`).all();
      // Лента последних событий. Сумм из чужих записей SHR здесь нет и не будет.
      const ev = await env.DB.prepare(
        `SELECT e.kind, e.note, e.at, e.uid, p.nick FROM events e LEFT JOIN players p ON p.id = e.uid
          ORDER BY e.id DESC LIMIT 60`).all();
      // Настоящий баланс звёзд у бота, если Telegram его отдаёт
      let balance = null;
      try {
        const b = await tg(env, 'getMyStarBalance', {});
        if (b && b.ok && b.result) balance = b.result.amount != null ? b.result.amount : b.result;
      } catch (e) {}
      const msgs = await env.DB.prepare('SELECT COUNT(*) n FROM msgs').first();
      const clans = await env.DB.prepare('SELECT COUNT(*) n FROM clans').first();
      return json({ players: p.n, active: p.live, subs: p.subs, pfUsers: f.users, pfRows: f.rows, pfUsd: f.usd,
        coins: top.results || [], pays: pay.n, stars: pay.stars, msgs: msgs.n, clans: clans.n,
        buyers: byUser.results || [], lastPays: last.results || [],
        events: ev.results || [], balance,
        titles: Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, v.title])) }, 200, cors);
    }

    // 7d. Режим владельца: платформа открыта всегда, плюс переключатель «как игрок»
    if (body && url.pathname === '/owner') {
      if (!isOwner(env, user)) return json({ error: 'forbidden' }, 403, cors);
      await getPlayer(env, user);
      const act = clean(body.act, 12), id = user.id;
      if (act === 'asplayer') {
        await env.DB.prepare('INSERT INTO flags(uid,as_player) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET as_player=?')
          .bind(id, body.on ? 1 : 0, body.on ? 1 : 0).run();
      } else if (act === 'clearpf') {
        await env.DB.prepare('DELETE FROM pf WHERE uid=?').bind(id).run();
      } else if (act === 'sale') {
        // Скидка на всё сразу: процент и срок. 0 — выключить.
        const pct = Math.max(0, Math.min(80, Number(body.pct) | 0));
        const days = Math.max(1, Math.min(60, Number(body.days) || 7));
        const v = pct ? JSON.stringify({ pct, until: NOW() + days * 86400000 }) : JSON.stringify({ pct: 0, until: 0 });
        await env.DB.prepare("INSERT INTO settings(k,v) VALUES('sale',?) ON CONFLICT(k) DO UPDATE SET v=?")
          .bind(v, v).run();
        return json({ ok: true, sale: await getSale(env) }, 200, cors);
      } else if (act === 'announce') {
        const text = clean(body.text, 400);
        if (!text) return json({ error: 'text' }, 400, cors);
        await env.DB.prepare('INSERT INTO ann(text,at,sent) VALUES(?,?,0)').bind(text, NOW()).run();
        return json({ ok: true, ann: await lastAnn(env) }, 200, cors);
      } else if (act === 'dm') {
        // Личное письмо игроку от владельца. Подписываем, от кого оно: человек
        // должен понимать, что это живой владелец клуба, а не автоответчик.
        const uid = Number(body.uid) || 0;
        const text = clean(body.text, 600);
        if (!uid || !text) return json({ error: 'bad' }, 400, cors);
        // Сначала кладём в базу: даже если человек закрыл личку боту, письмо
        // дождётся его в приложении.
        await env.DB.prepare('INSERT INTO dms(uid,dir,text,at,seen) VALUES(?,?,?,?,0)')
          .bind(uid, 'in', text, NOW()).run();
        await logEvent(env, uid, 'dm', text.slice(0, 40));
        const r = await tg(env, 'sendMessage', { chat_id: uid,
          text: `✉️ Сообщение от владельца SHRhub\n\n${text}\n\n— ответь прямо здесь или в приложении, я прочитаю.` });
        if (r && r.ok === false) return json({ ok: true, telegram: 'blocked' }, 200, cors);
        return json({ ok: true }, 200, cors);
      } else if (act === 'announce_all') {
        // Письмо всем сразу. Только тем, кто разрешил писать себе: остальным
        // рассылка без спроса — прямой путь в блокировку бота.
        const text = clean(body.text, 600);
        if (!text) return json({ error: 'text' }, 400, cors);
        const r = await env.DB.prepare('SELECT uid FROM notif WHERE on_=1').all();
        const list = (r.results || []).map((x) => x.uid).filter((x) => x !== id);
        let sent = 0;
        for (const uid of list) {
          try {
            const res = await tg(env, 'sendMessage', { chat_id: uid, text: `📣 SHRhub\n\n${text}` });
            if (!res || res.ok !== false) sent++;
          } catch (e) {}
        }
        return json({ ok: true, sent, total: list.length }, 200, cors);
      } else if (act === 'chatpay') {
        const v = body.on ? '1' : '0';
        await env.DB.prepare("INSERT INTO settings(k,v) VALUES('chatpay',?) ON CONFLICT(k) DO UPDATE SET v=?")
          .bind(v, v).run();
        return json({ ok: true, chatpay: body.on ? 1 : 0 }, 200, cors);
      } else if (act === 'chatopen') {
        // Владелец может открыть голос бесплатно: другу, активному игроку, тому,
        // у кого просто нет чем платить.
        const uid = Number(body.uid) || 0;
        if (!uid) return json({ error: 'uid' }, 400, cors);
        await env.DB.prepare('UPDATE players SET chat_ok=? WHERE id=?').bind(body.on ? 1 : 0, uid).run();
        if (body.on) { try { await tg(env, 'sendMessage', { chat_id: uid, text: 'Тебе открыли голос в чатах SHRhub — бесплатно. Пиши.' }); } catch (e) {} }
        return json({ ok: true }, 200, cors);
      } else if (act === 'ban') {
        // Блокировка закрывает чат, новости и клан, но оставляет SHR и поддержку:
        // его записи не наше имущество, а без поддержки он не оспорит решение.
        const uid = Number(body.uid) || 0;
        if (!uid || uid === id) return json({ error: 'uid' }, 400, cors);
        const on = body.on ? 1 : 0;
        const note = clean(body.note, 120);
        await env.DB.prepare('UPDATE players SET banned=?, ban_note=? WHERE id=?').bind(on, note, uid).run();
        await logEvent(env, uid, on ? 'ban' : 'unban', note);
        try {
          await tg(env, 'sendMessage', { chat_id: uid, text: on
            ? `Тебе закрыли доступ к чатам и клану SHRhub.${note ? '\nПричина: ' + note : ''}\n\nКалькулятор SHR и твои записи остались на месте. Если считаешь, что это ошибка — ответь на это сообщение, я прочитаю.`
            : 'Доступ к чатам и клану SHRhub вернули. Добро пожаловать обратно.' });
        } catch (e) {}
        return json({ ok: true, uid, banned: on }, 200, cors);
      } else if (act === 'tickets') {
        const r = await env.DB.prepare(
          `SELECT t.id, t.uid, t.text, t.at, t.done, p.nick, p.av, COALESCE(p.banned,0) banned
             FROM tickets t LEFT JOIN players p ON p.id = t.uid
            ORDER BY t.done ASC, t.id DESC LIMIT 50`).all();
        return json({ ok: true, tickets: r.results || [] }, 200, cors);
      } else if (act === 'ticket_done') {
        await env.DB.prepare('UPDATE tickets SET done=1 WHERE id=?').bind(Number(body.tid) || 0).run();
        return json({ ok: true }, 200, cors);
      } else if (act === 'players') {
        // Список игроков для выдачи доступа: кто давно в игре, кто платил, кому уже открыто
        const q = clean(body.q, 32);
        const like = '%' + q.toLowerCase() + '%';
        const r = await env.DB.prepare(
          `SELECT p.id, p.nick, p.av, p.pts, p.best, p.total, p.seen, p.tier, p.tier_until,
                  COALESCE(p.banned,0) banned, p.ban_note, COALESCE(p.chat_ok,0) chat_ok,
                  g.until gift,
                  (SELECT COALESCE(SUM(stars),0) FROM pays WHERE uid=p.id) stars
             FROM players p LEFT JOIN gifts g ON g.uid = p.id
            WHERE p.id <> ? AND (? = '' OR LOWER(COALESCE(p.nick,'')) LIKE ? OR CAST(p.id AS TEXT) LIKE ?)
            ORDER BY (g.until IS NOT NULL AND g.until <> 0) DESC, p.seen DESC
            LIMIT 60`).bind(id, q, like, like).all();
        return json({ ok: true, players: r.results || [], now: NOW() }, 200, cors);
      } else if (act === 'gift') {
        const uid = Number(body.uid) || 0;
        if (!uid || uid === id) return json({ error: 'uid' }, 400, cors);
        // days: 0 — забрать, -1 — бессрочно, иначе на столько дней
        const days = Number(body.days);
        const until = days === 0 ? 0 : days < 0 ? -1 : NOW() + Math.min(days, 3650) * 86400000;
        if (!until) await env.DB.prepare('DELETE FROM gifts WHERE uid=?').bind(uid).run();
        else await env.DB.prepare(
          `INSERT INTO gifts(uid,until,note,by,at) VALUES(?,?,?,?,?)
           ON CONFLICT(uid) DO UPDATE SET until=?, note=?, by=?, at=?`)
          .bind(uid, until, clean(body.note, 64), id, NOW(), until, clean(body.note, 64), id, NOW()).run();
        // Сообщить человеку: иначе он просто не заметит, что ему открыли
        try {
          await tg(env, 'sendMessage', { chat_id: uid, text: until
            ? 'Тебе открыли полный доступ в SHRhub: все функции без подписки. Открой приложение заново, чтобы он включился.'
            : 'Полный доступ в SHRhub завершён. Твой прогресс и записи SHR остались на месте.' });
        } catch (e) {}
        return json({ ok: true, uid, until }, 200, cors);
      } else if (act !== 'read') return json({ error: 'act' }, 400, cors);
      const row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
      const ap = await asPlayer(env, id);
      return json({ ok: true, asPlayer: ap, paid: paid(row, !ap), sale: await getSale(env),
        ann: await lastAnn(env), chatpay: (await chatPaid(env)) ? 1 : 0 }, 200, cors);
    }

    // 8. Общий рейтинг
    if (body && url.pathname === '/top') {
      const r = await env.DB.prepare(
        'SELECT id,nick,av,pts,best,COALESCE(rep,0) rep FROM players ORDER BY rep DESC, pts DESC LIMIT 30').all();
      // Оплаченное место идёт отдельным полем, а не подменяет собой первую строчку:
      // в таблице оно рисуется над рейтингом и подписано как оплаченное.
      const sp = await spotOf(env, 'player');
      let promo = null;
      if (sp) {
        const p = await env.DB.prepare('SELECT id,nick,av,pts,best,COALESCE(rep,0) rep FROM players WHERE id=?').bind(sp.id).first();
        if (p) promo = Object.assign({ until: sp.until }, p);
      }
      const csp = await spotOf(env, 'clan');
      let cpromo = null;
      if (csp) {
        const c = await env.DB.prepare('SELECT id,name,emb,tr FROM clans WHERE id=?').bind(csp.id).first();
        if (c) cpromo = Object.assign({ until: csp.until }, c);
      }
      const spotFree = { player: !sp, clan: !csp,
        playerUntil: sp ? sp.until : 0, clanUntil: csp ? csp.until : 0 };
      return json({ top: r.results || [], promo, cpromo, spot: spotFree }, 200, cors);
    }

    // 9. Сообщения от Telegram
    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const u = await req.json();
      if (u.pre_checkout_query) {
        const [, product] = String(u.pre_checkout_query.invoice_payload).split(':');
        await tg(env, 'answerPreCheckoutQuery', { pre_checkout_query_id: u.pre_checkout_query.id, ok: !!PRODUCTS[product], error_message: 'Товар не найден' });
      } else if (u.message && u.message.successful_payment) {
        const sp = u.message.successful_payment;
        const [uid, product, arg] = String(sp.invoice_payload).split(':');
        if (env.PAYMENTS) await env.PAYMENTS.put(`pay:${sp.telegram_payment_charge_id}`, JSON.stringify({ user: u.message.from.id, payload: sp.invoice_payload, stars: sp.total_amount, at: NOW() }));
        if (await ensure(env)) await grant(env, Number(uid) || u.message.from.id, product, arg || '', sp);
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: '⭐ Оплата получена. Спасибо! Покупка уже открыта в SHRhub.' });
      } else if (u.callback_query) {
        // Кнопка под напоминанием: выключить, не открывая игру
        const cq = u.callback_query, uid = cq.from.id;
        let note = 'Готово';
        if (cq.data === 'nooff' && await ensure(env)) {
          await env.DB.prepare('INSERT INTO notif(uid,on_) VALUES(?,0) ON CONFLICT(uid) DO UPDATE SET on_=0').bind(uid).run();
          note = 'Больше не напоминаю. Включить обратно можно в игре, в Кабинете.';
        } else if (String(cq.data || '').startsWith('pmto:') && await ensure(env)) {
          // Человек выбрал, кому уходит его сообщение
          const to = Number(String(cq.data).slice(5)) || 0;
          const d = await env.DB.prepare('SELECT v FROM settings WHERE k=?').bind(`pmdraft:${uid}`).first();
          const txt = d && d.v ? String(d.v) : '';
          if (to && txt) {
            const me = await env.DB.prepare('SELECT nick FROM players WHERE id=?').bind(uid).first();
            await pmPut(env, uid, to, txt, (me && me.nick) || 'Участник клуба', url.origin);
            await env.DB.prepare('DELETE FROM settings WHERE k=?').bind(`pmdraft:${uid}`).run();
            const p = await env.DB.prepare('SELECT nick FROM players WHERE id=?').bind(to).first();
            note = `Отправил: ${(p && p.nick) || 'участнику'}`;
          } else note = 'Сообщение потерялось, напиши ещё раз';
        }
        await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: note, show_alert: false });
        if (cq.message) await tg(env, 'editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } });
      } else if (u.message && typeof u.message.text === 'string' && u.message.text.startsWith('/id')) {
        // Свой ID всегда безопаснее спросить у своего же бота, чем у чужого
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: `Твой Telegram ID: ${u.message.from.id}` });
      } else if (u.message && (u.message.video || u.message.video_note)) {
        // Ролик приходит в бот, а мы запоминаем только его file_id: сам файл
        // остаётся у Telegram, и пересылать его можно без ограничения по размеру.
        const m = u.message, v = m.video || m.video_note, from = m.from || {};
        if (await ensure(env)) {
          const row = await env.DB.prepare('SELECT COALESCE(banned,0) b FROM players WHERE id=?').bind(from.id).first();
          if (row && row.b) {
            await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Тебе закрыт доступ к публикациям в SHRhub.' });
          } else {
            const title = clean(m.caption, 80);
            const thumb = (v.thumbnail && v.thumbnail.file_id) || (v.thumb && v.thumb.file_id) || '';
            await env.DB.prepare(
              `INSERT INTO vids(uid,title,file_id,thumb,dur,size,at) VALUES(?,?,?,?,?,?,?)`)
              .bind(from.id, title || 'Без названия', v.file_id, thumb, v.duration || 0, v.file_size || 0, NOW()).run();
            await logEvent(env, from.id, 'vid', title.slice(0, 40));
            await addRep(env, from.id, 2);
            await tg(env, 'sendMessage', { chat_id: m.chat.id, text:
              'Ролик добавлен в ленту SHRhub.' + (title ? '' : '\n\nПодпись пустая: отправь видео с подписью, и она станет заголовком.') +
              '\n\nПравила простые: без наркотиков, оружия, насилия и чужого контента. Нарушишь — ролик снимут, а доступ закроют.' });
            await tellOwner(env, `🎬 Новый ролик: ${title || 'без названия'}\nОт: ${clean(from.first_name, 32)} (id ${from.id})`);
          }
        }
      } else if (u.message && typeof u.message.text === 'string' && u.message.text.trim() && !u.message.text.startsWith('/')) {
        const m = u.message, from = m.from || {};
        const text = clean(m.text, 600);
        const rep = m.reply_to_message && m.reply_to_message.message_id;
        let sent = false;
        if (await ensure(env)) {
          const me = await env.DB.prepare('SELECT nick, COALESCE(banned,0) b FROM players WHERE id=?')
            .bind(from.id).first();
          if (me && me.b) {
            await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Доступ к клубу закрыт.' });
            sent = true;
          } else {
            // Ответ на письмо бота — это ответ человеку, а не в поддержку
            let to = 0;
            if (rep) {
              const link = await env.DB.prepare('SELECT peer FROM pmlink WHERE uid=? AND mid=?')
                .bind(from.id, rep).first();
              if (link) to = link.peer;
            }
            if (!to) {
              // Без ответа на письмо: если переписка за сутки ровно одна,
              // понятно, кому человек пишет. Если их несколько — спросим.
              const r = await env.DB.prepare(
                `SELECT CASE WHEN uid=? THEN peer ELSE uid END who, MAX(at) at
                   FROM pm WHERE (uid=? OR peer=?) AND at > ?
                  GROUP BY who ORDER BY at DESC LIMIT 4`)
                .bind(from.id, from.id, from.id, NOW() - 86400000).all();
              const list = r.results || [];
              if (list.length === 1) to = list[0].who;
              else if (list.length > 1) {
                const rows = [];
                for (const x of list) {
                  const p = await env.DB.prepare('SELECT nick FROM players WHERE id=?').bind(x.who).first();
                  rows.push([{ text: (p && p.nick) || `id ${x.who}`, callback_data: `pmto:${x.who}` }]);
                }
                await env.DB.prepare(
                  "INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")
                  .bind(`pmdraft:${from.id}`, text).run();
                await tg(env, 'sendMessage', { chat_id: m.chat.id,
                  text: 'Кому отправить? Нажми на имя, а в следующий раз просто ответь на его сообщение.',
                  reply_markup: { inline_keyboard: rows } });
                sent = true;
              }
            }
            if (to && !sent) {
              await pmPut(env, from.id, to, text, (me && me.nick) || clean(from.first_name, 32), url.origin);
              const p = await env.DB.prepare('SELECT nick FROM players WHERE id=?').bind(to).first();
              await tg(env, 'sendMessage', { chat_id: m.chat.id,
                text: `Отправил: ${(p && p.nick) || 'участнику'}.` });
              sent = true;
            }
          }
        }
        // Переписки не нашлось — значит, человек пишет нам. Это поддержка.
        if (!sent && Number(env.OWNER_ID || env.SUPPORT_CHAT_ID || 0) !== from.id) {
          await tellOwner(env, `💬 ${clean(from.first_name, 32)}` +
            (from.username ? ` (@${from.username})` : '') + ` · id ${from.id}\n\n${String(m.text).slice(0, 900)}`);
          await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Передал. Отвечу, как только прочитаю.' });
        }
      } else if (u.message && typeof u.message.text === 'string' && u.message.text.startsWith('/start')) {
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: 'SHRhub — закрытый клуб прогнозов. Это игра, а не биржа: ставок и денежных призов нет. 18+', reply_markup: { inline_keyboard: [[{ text: 'Открыть SHRhub', web_app: { url: appUrl } }]] } });
      }
      return new Response('ok');
    }

    // 10. Одноразовая настройка: открыть /setup?key=WEBHOOK_SECRET в браузере
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const db = await ensure(env);
      const a = await tg(env, 'setWebhook', { url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query', 'callback_query'] });
      const b = await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'SHRhub', web_app: { url: appUrl } } });
      return json({ webhook: a, menu_button: b, database: db ? 'ok' : 'не привязана' });
    }
    // Вложение из переписки. Ссылка подписана для конкретного зрителя, поэтому
    // подглядеть чужую переписку, подставив номер, нельзя.
    if (url.pathname === '/pmfile') {
      if (!await ensure(env)) return new Response('no db', { status: 503 });
      const id = Number(url.searchParams.get('id')) || 0;
      const uid = Number(url.searchParams.get('u')) || 0;
      const kind = url.searchParams.get('k') === 'thumb' ? 'thumb' : 'full';
      const sig = url.searchParams.get('s') || '';
      if (!id || !uid || sig !== await mediaSig(env.BOT_TOKEN, id, uid, kind)) {
        return new Response('forbidden', { status: 403 });
      }
      const m = await env.DB.prepare('SELECT uid, peer, kind, file_id, thumb, size FROM pm WHERE id=?').bind(id).first();
      if (!m || (m.uid !== uid && m.peer !== uid)) return new Response('not found', { status: 404 });
      const fid = kind === 'thumb' ? (m.thumb || m.file_id) : m.file_id;
      if (!fid) return new Response('not found', { status: 404 });
      // Больше 20 МБ Telegram боту не отдаёт — такой ролик смотрят у себя в чате
      if (kind === 'full' && m.kind === 'video' && !(m.size > 0 && m.size <= 19 * 1024 * 1024)) {
        return new Response('too large', { status: 413 });
      }
      try {
        const f = await tg(env, 'getFile', { file_id: fid });
        const path = f && f.ok && f.result && f.result.file_path;
        if (!path) return new Response('not found', { status: 404 });
        const range = req.headers.get('range');
        const r = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${path}`,
          range ? { headers: { range } } : undefined);
        if (!r.ok && r.status !== 206) return new Response('not found', { status: 404 });
        const h = {
          'content-type': r.headers.get('content-type') ||
            (m.kind === 'video' && kind === 'full' ? 'video/mp4' : 'image/jpeg'),
          'cache-control': 'private, max-age=86400',
          'access-control-allow-origin': '*',
          'accept-ranges': 'bytes',
        };
        const len = r.headers.get('content-length');
        if (len) h['content-length'] = len;
        const cr = r.headers.get('content-range');
        if (cr) h['content-range'] = cr;
        return new Response(r.body, { status: r.status, headers: h });
      } catch (e) { return new Response('error', { status: 502 }); }
    }

    // Обложка и сам ролик. Ссылку у Telegram приходится просить заново: она живёт
    // около часа. Файл забираем сами и отдаём байтами: в ссылке Telegram лежит
    // токен бота, и перенаправлением мы бы отдали его прямо в браузер.
    if (url.pathname === '/vfile') {
      if (!await ensure(env)) return new Response('no db', { status: 503 });
      const id = Number(url.searchParams.get('id')) || 0;
      const kind = url.searchParams.get('kind') === 'video' ? 'video' : 'thumb';
      const v = await env.DB.prepare('SELECT thumb, file_id, size FROM vids WHERE id=? AND hidden=0').bind(id).first();
      if (!v) return new Response('not found', { status: 404 });
      // Скачать у Telegram можно только файл до 20 МБ. Крупный ролик бот
      // пересылает в чат по file_id, в приложении он не играет.
      const fid = kind === 'video' ? v.file_id : v.thumb;
      if (!fid) return new Response('not found', { status: 404 });
      if (kind === 'video' && !(v.size > 0 && v.size <= 19 * 1024 * 1024)) {
        return new Response('too large', { status: 413 });
      }
      try {
        const f = await tg(env, 'getFile', { file_id: fid });
        const path = f && f.ok && f.result && f.result.file_path;
        if (!path) return new Response('not found', { status: 404 });
        const range = req.headers.get('range');
        const r = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${path}`,
          range ? { headers: { range } } : undefined);
        if (!r.ok && r.status !== 206) return new Response('not found', { status: 404 });
        const h = {
          'content-type': r.headers.get('content-type') ||
            (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          'cache-control': 'public, max-age=86400',
          'access-control-allow-origin': '*',
          'accept-ranges': 'bytes',
        };
        const len = r.headers.get('content-length');
        if (len) h['content-length'] = len;
        const cr = r.headers.get('content-range');
        if (cr) h['content-range'] = cr;
        return new Response(r.body, { status: r.status, headers: h });
      } catch (e) { return new Response('error', { status: 502 }); }
    }

    return new Response('SHRhub bot is running');
  },

  // Расписание: Cloudflare будит воркер раз в час, мы сами решаем, кому сейчас писать.
  // Час у каждого игрока свой — тот, что у него на телефоне, а не киевский.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendReminders(env));
    ctx.waitUntil(pullFeed(env));
  },
};

// ---------- лента новостей ----------
// Берём обычные RSS изданий: ключей не нужно, лимитов нет, и если одно издание
// замолчит, остальные продолжат работать.
const FEEDS = [
  ['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'],
  ['Cointelegraph', 'https://cointelegraph.com/rss'],
  ['The Block', 'https://www.theblock.co/rss.xml'],
  ['Decrypt', 'https://decrypt.co/feed'],
];
const unxml = (x) => String(x || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

function parseFeed(xml) {
  const out = [];
  const blocks = String(xml).split(/<item[\s>]|<entry[\s>]/i).slice(1);
  for (const b of blocks.slice(0, 20)) {
    const t = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let l = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    let url = l ? unxml(l[1]) : '';
    if (!url) { const h = b.match(/<link[^>]*href="([^"]+)"/i); if (h) url = h[1]; }
    const d = b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || b.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const title = t ? unxml(t[1]) : '';
    if (!title || !/^https?:\/\//.test(url)) continue;
    const ts = d ? Date.parse(unxml(d[1])) : NaN;
    out.push({ title: title.slice(0, 200), url: url.slice(0, 400), at: isNaN(ts) ? NOW() : ts });
  }
  return out;
}

async function pullFeed(env) {
  if (!await ensure(env)) return;
  for (const [src, url] of FEEDS) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'SHRhub/1.0 (+telegram mini app)' } });
      if (!r.ok) continue;
      const items = parseFeed(await r.text());
      for (const it of items) {
        await env.DB.prepare('INSERT OR IGNORE INTO feed(title,url,src,at) VALUES(?,?,?,?)')
          .bind(it.title, it.url, src, it.at).run();
      }
    } catch (e) {}
  }
  // Старое никому не нужно и только занимает базу
  try { await env.DB.prepare('DELETE FROM feed WHERE at < ?').bind(NOW() - 14 * 86400000).run(); } catch (e) {}
}

// ---------- напоминания ----------
const DAY_KEY = (ms) => new Date(ms).toISOString().slice(0, 10);

// Цена биткоина для утреннего письма: если биржа молчит, пишем без неё
async function btcLine(env) {
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (!r.ok) return '';
    const j = await r.json();
    const p = Number(j.lastPrice), d = Number(j.priceChangePercent);
    if (!(p > 0)) return '';
    return `\nBTC $${p.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${d >= 0 ? '+' : ''}${d.toFixed(1)}% за сутки)`;
  } catch (e) { return ''; }
}

async function sendReminders(env) {
  if (!await ensure(env)) return;
  const now = NOW();
  const rows = await env.DB.prepare(
    `SELECT n.uid, n.tz, n.mh, n.eh, n.lastm, n.laste, p.nick, p.streak, p.pts
       FROM notif n JOIN players p ON p.id = n.uid
      WHERE n.on_ = 1`).all();
  const list = rows.results || [];
  if (!list.length) return;

  const btc = await btcLine(env);
  // Новость от владельца уходит один раз, вместе с утренним письмом: отдельных
  // рассылок не делаем, человек соглашался на два письма в день, а не на три.
  const an = await env.DB.prepare('SELECT id,text FROM ann WHERE sent=0 ORDER BY id DESC LIMIT 1').first();
  let annSent = false;
  const kb = { inline_keyboard: [
    [{ text: 'Открыть SHRhub', web_app: { url: env.APP_URL } }],
    [{ text: 'Не напоминать', callback_data: 'nooff' }]] };

  for (const r of list) {
    const local = now + (r.tz | 0) * 60000;
    const hour = new Date(local).getUTCHours();
    const day = DAY_KEY(local);
    let text = null, col = null;

    if (hour === (r.mh | 0) && r.lastm !== day) {
      col = 'lastm';
      text = `Доброе утро${r.nick ? ', ' + r.nick : ''}.${btc}\n\n` +
        (r.streak > 0
          ? `Твоя серия: ${r.streak} подряд. Один прогноз — и она растёт дальше.`
          : 'Сделай прогноз на сегодня — серия начинается с первого попадания.');
      if (an) { text += `\n\n🆕 ${an.text}`; annSent = true; }
    } else if (hour === (r.eh | 0) && r.laste !== day) {
      col = 'laste';
      text = r.streak > 0
        ? `Вечер. Серия ${r.streak} ещё держится — закрой день прогнозом, чтобы не потерять её.`
        : 'Вечер. Загляни в SHRhub: посмотри, как сходили твои монеты за день, и обнови среднюю цену в SHR.';
    }
    if (!text) continue;

    // Если человек заблокировал бота, Telegram вернёт ошибку — просто выключаем ему напоминания
    try {
      const res = await tg(env, 'sendMessage', { chat_id: r.uid, text, reply_markup: kb });
      if (res && res.ok === false && /blocked|deactivated|chat not found/i.test(res.description || '')) {
        await env.DB.prepare('UPDATE notif SET on_=0 WHERE uid=?').bind(r.uid).run();
        continue;
      }
    } catch (e) { continue; }
    await env.DB.prepare(`UPDATE notif SET ${col}=? WHERE uid=?`).bind(day, r.uid).run();
  }
  if (an && annSent) await env.DB.prepare('UPDATE ann SET sent=1 WHERE id=?').bind(an.id).run();
}

// Настроение толпы по реальным прогнозам текущего часа
export async function counts(env, sym) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) n,
            SUM(CASE WHEN dir>0 THEN 1 ELSE 0 END) up,
            AVG(CASE WHEN dir>0 THEN k END) tu,
            AVG(CASE WHEN dir<0 THEN k END) td
     FROM preds WHERE sym=? AND hour=?`).bind(sym, HOUR()).first();
  const n = r && r.n ? r.n : 0;
  return { n, up: n ? Math.round((r.up / n) * 100) : 50, tu: r && r.tu != null ? r.tu : .4, td: r && r.td != null ? r.td : .4, real: true };
}

// Выдача купленного: только здесь, и только после подтверждения Telegram
export async function grant(env, uid, product, arg, sp) {
  try {
    const pr0 = PRODUCTS[product];
    if (pr0) {
      await logEvent(env, uid, 'pay', product + ' ' + pr0.stars + '⭐');
      const who = await env.DB.prepare('SELECT nick FROM players WHERE id=?').bind(uid).first();
      await tellOwner(env, `⭐ Оплата: ${pr0.title} — ${pr0.stars} звёзд\nОт: ${(who && who.nick) || uid}`);
    }
  } catch (e) {}
  const pr = PRODUCTS[product];
  if (!pr) return;
  const charge = sp && sp.telegram_payment_charge_id ? sp.telegram_payment_charge_id : `${uid}:${product}:${NOW()}`;
  const seen = await env.DB.prepare('SELECT charge FROM pays WHERE charge=?').bind(charge).first();
  if (seen) return; // та же оплата второй раз ничего не добавляет
  await env.DB.prepare('INSERT INTO pays(charge,uid,product,arg,stars,at) VALUES(?,?,?,?,?,?)')
    .bind(charge, uid, product, arg || '', sp ? sp.total_amount : pr.stars, NOW()).run();
  await getPlayer(env, { id: uid, first_name: '' });
  const row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(uid).first();
  const until = NOW() + 31 * 86400000;
  if (pr.tier) {
    // Купил — проба закончилась, дальше это обычная оплаченная подписка
    await env.DB.prepare('UPDATE players SET tier=?,tier_until=?,trial=0 WHERE id=?').bind(pr.tier, until, uid).run();
  } else if (pr.coin) {
    const list = JSON.parse(row.extra || '[]');
    if (arg && !list.includes(arg)) list.push(arg);
    await env.DB.prepare('UPDATE players SET extra=? WHERE id=?').bind(JSON.stringify(list.slice(0, 50)), uid).run();
  } else if (pr.own) {
    const own = JSON.parse(row.owned || '{}');
    own[pr.own] = 1;
    await env.DB.prepare('UPDATE players SET owned=? WHERE id=?').bind(JSON.stringify(own), uid).run();
  } else if (pr.boost) {
    // arg — номер ролика. Если его нет или он чужой, звёзды не сгорают:
    // продление ляжет на самый свежий ролик этого человека.
    const vid = Number(arg) || 0;
    const row2 = vid
      ? await env.DB.prepare('SELECT id, boost_until FROM vids WHERE id=? AND uid=?').bind(vid, uid).first()
      : await env.DB.prepare('SELECT id, boost_until FROM vids WHERE uid=? ORDER BY id DESC LIMIT 1').bind(uid).first();
    if (row2) {
      const from = row2.boost_until > NOW() ? row2.boost_until : NOW();
      await env.DB.prepare('UPDATE vids SET boost_until=?, boost_stars=boost_stars+? WHERE id=?')
        .bind(from + 7 * 86400000, pr.stars, row2.id).run();
    }
  } else if (pr.chatOn) {
    await env.DB.prepare('UPDATE players SET chat_ok=1 WHERE id=?').bind(uid).run();
  } else if (pr.spot) {
    // Место на неделю. Если оно уже занято, новый срок начинается после старого,
    // чтобы два покупателя не стояли на одном месте и никто не платил впустую.
    const kind = pr.spot;
    const who = kind === 'clan' ? (Number(arg) || row.clan || 0) : uid;
    if (who) {
      const cur = await env.DB.prepare('SELECT until FROM spots WHERE kind=? AND until>? ORDER BY until DESC LIMIT 1')
        .bind(kind, NOW()).first();
      const from = cur && cur.until > NOW() ? cur.until : NOW();
      await env.DB.prepare(
        `INSERT INTO spots(kind,id,until,stars,at) VALUES(?,?,?,?,?)
         ON CONFLICT(kind,id) DO UPDATE SET until=?, stars=stars+?, at=?`)
        .bind(kind, who, from + 7 * 86400000, pr.stars, NOW(), from + 7 * 86400000, pr.stars, NOW()).run();
    }
  } else if (pr.pass) {
    await env.DB.prepare('UPDATE players SET pass_until=? WHERE id=?').bind(NOW() + 7 * 86400000, uid).run();
  } else if (pr.save) {
    await env.DB.prepare('UPDATE players SET saves=saves+1 WHERE id=?').bind(uid).run();
  } else if (pr.codes) {
    await env.DB.prepare('UPDATE players SET codes=codes+3 WHERE id=?').bind(uid).run();
  } else if (pr.gm) {
    await env.DB.prepare('UPDATE players SET gm=gm+1 WHERE id=?').bind(uid).run();
  }
}
