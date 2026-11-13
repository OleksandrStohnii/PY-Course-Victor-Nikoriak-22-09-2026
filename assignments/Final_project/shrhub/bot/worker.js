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
  `CREATE TABLE IF NOT EXISTS pays(
    charge TEXT PRIMARY KEY, uid INTEGER, product TEXT, arg TEXT, stars INTEGER, at INTEGER)`,
];
let READY = false;
async function ensure(env) {
  if (READY || !env.DB) return !!env.DB;
  await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  READY = true;
  return true;
}
const NOW = () => Date.now();
const HOUR = () => Math.floor(Date.now() / 3600000);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

async function getPlayer(env, user) {
  const id = user.id;
  let row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
  if (!row) {
    await env.DB.prepare('INSERT INTO players(id,nick,seen) VALUES(?,?,?)')
      .bind(id, clean(user.first_name, 16), NOW()).run();
    row = await env.DB.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
  }
  return row;
}
// Что сервер считает правдой: всё оплаченное. Остальной прогресс — на слово игроку.
function paid(row) {
  const now = NOW();
  return {
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
    const cors = { 'Access-Control-Allow-Origin': env.APP_URL ? new URL(env.APP_URL).origin : '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const appUrl = `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}api=${encodeURIComponent(url.origin)}`;

    // Общая часть для всех запросов из игры: разобрать тело и проверить подпись
    const API = ['/invoice', '/support', '/me', '/vote', '/sent', '/chat', '/clans', '/top', '/pf', '/stats'];
    let body = null, user = null;
    if (req.method === 'POST' && API.includes(url.pathname)) {
      try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400, cors); }
      user = await verifyInitData(body.initData, env.BOT_TOKEN);
      if (!user) return json({ error: 'auth' }, 401, cors);
    }

    // 1. Счёт на оплату звёздами
    if (body && url.pathname === '/invoice') {
      const pr = PRODUCTS[body.product];
      if (!pr) return json({ error: 'product' }, 400, cors);
      const arg = clean(body.arg, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const inv = { title: pr.title, description: `${pr.title}. Игровая покупка в SHRhub, денежной ценности не имеет.`, payload: `${user.id}:${body.product}:${arg}`, currency: 'XTR', prices: [{ label: pr.title, amount: pr.stars }] };
      if (pr.sub) inv.subscription_period = MONTH;
      const r = await tg(env, 'createInvoiceLink', inv);
      return r.ok ? json({ link: r.result }, 200, cors) : json({ error: r.description || 'telegram' }, 502, cors);
    }

    // 2. Поддержка
    if (body && url.pathname === '/support') {
      const text = clean(body.text, 1000);
      if (!text) return json({ error: 'empty' }, 400, cors);
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
      const online = await env.DB.prepare('SELECT COUNT(*) n FROM players WHERE seen>?').bind(NOW() - 300000).first();
      return json({ id: user.id, paid: paid(row), state: body.state ? null : (row.state ? JSON.parse(row.state) : null), online: online ? online.n : 1 }, 200, cors);
    }

    // 4. Прогноз игрока: один на монету в час, он же считает настроение толпы
    if (body && url.pathname === '/vote') {
      const sym = clean(body.sym, 12).toUpperCase();
      const dir = body.dir > 0 ? 1 : -1;
      const k = Math.max(0, Math.min(1, Number(body.k) || 0));
      if (!sym) return json({ error: 'sym' }, 400, cors);
      await env.DB.prepare('INSERT OR REPLACE INTO preds(uid,sym,hour,dir,k,at) VALUES(?,?,?,?,?,?)')
        .bind(user.id, sym, HOUR(), dir, k, NOW()).run();
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
        const last = await env.DB.prepare('SELECT at FROM msgs WHERE uid=? ORDER BY id DESC LIMIT 1').bind(user.id).first();
        if (text && (!last || NOW() - last.at > 1500)) {
          await env.DB.prepare('INSERT INTO msgs(room,uid,nick,av,text,gold,at) VALUES(?,?,?,?,?,?,?)')
            .bind(room, user.id, row.nick || clean(user.first_name, 16), row.av || '🎩', text, body.gold ? 1 : 0, NOW()).run();
          if (body.gold && row.gm > 0) await env.DB.prepare('UPDATE players SET gm=gm-1 WHERE id=?').bind(user.id).run();
        }
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
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM pf WHERE uid=?').bind(user.id).first();
        if (n && n.n >= 300) return json({ error: 'limit' }, 409, cors);
        await env.DB.prepare('INSERT INTO pf(uid,sym,usd,price,at) VALUES(?,?,?,?,?)')
          .bind(user.id, sym, usd, price, NOW()).run();
      } else if (body.del) {
        await env.DB.prepare('DELETE FROM pf WHERE id=? AND uid=?').bind(Number(body.del) || 0, user.id).run();
      }
      const r = await env.DB.prepare('SELECT id,sym,usd,price,at FROM pf WHERE uid=? ORDER BY id').bind(user.id).all();
      return json({ list: r.results || [] }, 200, cors);
    }

    // 7c. Сводка для владельца бота
    if (body && url.pathname === '/stats') {
      const owner = Number(env.OWNER_ID || env.SUPPORT_CHAT_ID || 0);
      if (!owner || user.id !== owner) return json({ error: 'forbidden' }, 403, cors);
      const p = await env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN seen>? THEN 1 ELSE 0 END) live, SUM(CASE WHEN tier_until>? THEN 1 ELSE 0 END) subs FROM players')
        .bind(NOW() - 86400000, NOW()).first();
      const f = await env.DB.prepare('SELECT COUNT(DISTINCT uid) users, COUNT(*) rows, COALESCE(SUM(usd),0) usd FROM pf').first();
      const top = await env.DB.prepare('SELECT sym, COUNT(*) n, COALESCE(SUM(usd),0) usd FROM pf GROUP BY sym ORDER BY n DESC LIMIT 10').all();
      const pay = await env.DB.prepare('SELECT COUNT(*) n, COALESCE(SUM(stars),0) stars FROM pays').first();
      const msgs = await env.DB.prepare('SELECT COUNT(*) n FROM msgs').first();
      const clans = await env.DB.prepare('SELECT COUNT(*) n FROM clans').first();
      return json({ players: p.n, active: p.live, subs: p.subs, pfUsers: f.users, pfRows: f.rows, pfUsd: f.usd,
        coins: top.results || [], pays: pay.n, stars: pay.stars, msgs: msgs.n, clans: clans.n }, 200, cors);
    }

    // 8. Общий рейтинг
    if (body && url.pathname === '/top') {
      const r = await env.DB.prepare('SELECT id,nick,av,pts,best FROM players ORDER BY pts DESC LIMIT 30').all();
      return json({ top: r.results || [] }, 200, cors);
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
      } else if (u.message && typeof u.message.text === 'string' && u.message.text.startsWith('/start')) {
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: 'SHRhub — закрытый клуб прогнозов. Это игра, а не биржа: ставок и денежных призов нет. 18+', reply_markup: { inline_keyboard: [[{ text: 'Открыть SHRhub', web_app: { url: appUrl } }]] } });
      }
      return new Response('ok');
    }

    // 10. Одноразовая настройка: открыть /setup?key=WEBHOOK_SECRET в браузере
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const db = await ensure(env);
      const a = await tg(env, 'setWebhook', { url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'] });
      const b = await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'SHRhub', web_app: { url: appUrl } } });
      return json({ webhook: a, menu_button: b, database: db ? 'ok' : 'не привязана' });
    }
    return new Response('SHRhub bot is running');
  },
};

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
    await env.DB.prepare('UPDATE players SET tier=?,tier_until=? WHERE id=?').bind(pr.tier, until, uid).run();
  } else if (pr.coin) {
    const list = JSON.parse(row.extra || '[]');
    if (arg && !list.includes(arg)) list.push(arg);
    await env.DB.prepare('UPDATE players SET extra=? WHERE id=?').bind(JSON.stringify(list.slice(0, 50)), uid).run();
  } else if (pr.own) {
    const own = JSON.parse(row.owned || '{}');
    own[pr.own] = 1;
    await env.DB.prepare('UPDATE players SET owned=? WHERE id=?').bind(JSON.stringify(own), uid).run();
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
