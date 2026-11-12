// SHRhub: сервер бота для Cloudflare Workers.
// Переменные (Settings → Variables and Secrets):
//   BOT_TOKEN       токен от @BotFather (тип Secret)
//   WEBHOOK_SECRET  любая длинная случайная строка из букв и цифр (тип Secret)
//   APP_URL         адрес игры на Cloudflare Pages, например https://shrhub.pages.dev
//   SUPPORT_CHAT_ID твой Telegram ID или id группы поддержки (необязательно)
// Необязательно: привязка KV с именем PAYMENTS, чтобы хранить историю оплат.

const MONTH = 2592000; // 30 дней: единственный период подписки, который принимает Telegram
const PRODUCTS = {
  tier1: { title: 'SHRhub Mini', stars: 55, sub: true },
  tier2: { title: 'SHRhub Plus', stars: 105, sub: true },
  tier3: { title: 'SHRhub Pro', stars: 210, sub: true },
  tier4: { title: 'SHRhub Max', stars: 370, sub: true },
  tier5: { title: 'SHRhub Ultra', stars: 525, sub: true },
  coin: { title: 'Отдельная монета', stars: 155, sub: true },
  pass: { title: 'Клубный пропуск недели', stars: 99 },
  save: { title: 'Спасение серии', stars: 50 },
  codes: { title: '+3 кода-приглашения', stars: 75 },
  badge: { title: 'Значок профиля', stars: 100 },
  cap: { title: 'Клан на 50 мест', stars: 300 },
  emb: { title: 'Эмблема клана', stars: 150 },
  banner: { title: 'Боевое знамя клана', stars: 150 },
  frame: { title: 'Золотая рамка аватара', stars: 50 },
  plat: { title: 'Тема «Платина»', stars: 100 },
  emer: { title: 'Тема «Изумруд»', stars: 100 },
  rbskin: { title: 'Облики робота', stars: 75 },
  felt: { title: 'Чёрно-золотое сукно', stars: 100 },
  shovel: { title: 'Золотая лопата', stars: 50 },
  gm: { title: 'Золотое сообщение', stars: 25 },
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': env.APP_URL ? new URL(env.APP_URL).origin : '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const appUrl = `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}api=${encodeURIComponent(url.origin)}`;

    // 1. Игра просит счёт на оплату звёздами
    if (req.method === 'POST' && url.pathname === '/invoice') {
      let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400, cors); }
      const user = await verifyInitData(body.initData, env.BOT_TOKEN);
      if (!user) return json({ error: 'auth' }, 401, cors);
      const pr = PRODUCTS[body.product];
      if (!pr) return json({ error: 'product' }, 400, cors);
      const inv = { title: pr.title, description: `${pr.title}. Игровая покупка в SHRhub, денежной ценности не имеет.`, payload: `${user.id}:${body.product}`, currency: 'XTR', prices: [{ label: pr.title, amount: pr.stars }] };
      if (pr.sub) inv.subscription_period = MONTH;
      const r = await tg(env, 'createInvoiceLink', inv);
      return r.ok ? json({ link: r.result }, 200, cors) : json({ error: r.description || 'telegram' }, 502, cors);
    }

    // 1b. Сообщение в поддержку: уходит тебе в Telegram
    if (req.method === 'POST' && url.pathname === '/support') {
      let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400, cors); }
      const user = await verifyInitData(body.initData, env.BOT_TOKEN);
      if (!user) return json({ error: 'auth' }, 401, cors);
      const text = String(body.text || '').slice(0, 1000);
      if (!text) return json({ error: 'empty' }, 400, cors);
      if (env.SUPPORT_CHAT_ID) await tg(env, 'sendMessage', { chat_id: env.SUPPORT_CHAT_ID, text: `💬 Поддержка\nОт: ${user.first_name || ''} (id ${user.id})\n\n${text}` });
      return json({ ok: true }, 200, cors);
    }

    // 2. Сообщения от Telegram
    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const u = await req.json();
      if (u.pre_checkout_query) {
        const [, product] = String(u.pre_checkout_query.invoice_payload).split(':');
        await tg(env, 'answerPreCheckoutQuery', { pre_checkout_query_id: u.pre_checkout_query.id, ok: !!PRODUCTS[product], error_message: 'Товар не найден' });
      } else if (u.message && u.message.successful_payment) {
        const sp = u.message.successful_payment;
        if (env.PAYMENTS) await env.PAYMENTS.put(`pay:${sp.telegram_payment_charge_id}`, JSON.stringify({ user: u.message.from.id, payload: sp.invoice_payload, stars: sp.total_amount, at: Date.now() }));
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: '⭐ Оплата получена. Спасибо! Покупка уже открыта в SHRhub.' });
      } else if (u.message && typeof u.message.text === 'string' && u.message.text.startsWith('/start')) {
        await tg(env, 'sendMessage', { chat_id: u.message.chat.id, text: 'SHRhub — закрытый клуб прогнозов. Это игра, а не биржа: ставок и денежных призов нет. 18+', reply_markup: { inline_keyboard: [[{ text: 'Открыть SHRhub', web_app: { url: appUrl } }]] } });
      }
      return new Response('ok');
    }

    // 3. Одноразовая настройка: открыть /setup?key=WEBHOOK_SECRET в браузере
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const a = await tg(env, 'setWebhook', { url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'] });
      const b = await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'SHRhub', web_app: { url: appUrl } } });
      return json({ webhook: a, menu_button: b });
    }
    return new Response('SHRhub bot is running');
  },
};
