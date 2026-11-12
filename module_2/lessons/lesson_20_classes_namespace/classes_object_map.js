/*
 * classes_object_map.js — інтерактивна карта об'єктної моделі Python (Урок 20).
 *
 * Окрема програма: уся схема (класи, їхні методи, екземпляри, MRO, пошук методів,
 * створення об'єкта через __new__ / __init__) описана тут. HTML лише підключає цей файл.
 *
 * Структура:
 *   1. Значення в стилі Python (int, bool, str, list, tuple, dict, set) + repr()
 *   2. CLASSES — класи object, type, int, bool, str, list, tuple, dict, set, function, method, Animal, Dog
 *      з власними методами: що кожен робить з об'єктом і як його виконати
 *   3. mro() / lookup() — пошук методу по ланцюжку успадкування
 *   4. Екземпляри: n, flag, city, nums, point, menu, tags, apply_discount, next_id, bark, cat, rex
 *   5. SVG-схема: стрілки __class__ (екземпляр) і __bases__ (успадкування)
 *   6. Панель класу / об'єкта з кнопками виклику методів
 *   7. Покрокове створення об'єкта: type.__call__ → __new__ → __init__
 *
 * Щоб додати свій клас: допишіть його в CLASSES (bases, methods) і в NODES (координати).
 */
"use strict";

/* ===================== Значення в стилі Python ===================== */
const I = v => ({ c: 'int', v });
const B = v => ({ c: 'bool', v });
const S = v => ({ c: 'str', v });
const L = v => ({ c: 'list', v });
const T = v => ({ c: 'tuple', v });
const F = v => ({ c: 'float', v });
const N = { c: 'NoneType', v: null };
// dict: v — масив пар [ключ, значення] у порядку додавання; set: v — масив унікальних елементів
const D = pairs => ({ c: 'dict', v: pairs });
const SE = items => { const s = { c: 'set', v: [] }; items.forEach(x => sAdd(s, x)); return s; };

let idCounter = 0x7f3a10;
function newId() { idCounter += 0x40; return '0x' + idCounter.toString(16); }

function repr(x) {
  switch (x.c) {
    case 'int': return String(x.v);
    case 'bool': return x.v ? 'True' : 'False';
    case 'str': {   // як у Python: є ' і немає " → беремо подвійні лапки
      const t = x.v.replace(/\\/g, '\\\\');
      return x.v.includes("'") && !x.v.includes('"') ? '"' + t + '"' : "'" + t.replace(/'/g, "\\'") + "'";
    }
    case 'list': return '[' + x.v.map(repr).join(', ') + ']';
    case 'tuple': return x.v.length === 1 ? '(' + repr(x.v[0]) + ',)' : '(' + x.v.map(repr).join(', ') + ')';
    case 'dict': return '{' + x.v.map(([k, v]) => repr(k) + ': ' + repr(v)).join(', ') + '}';
    case 'set': return x.v.length ? '{' + x.v.map(repr).join(', ') + '}' : 'set()';
    case 'float': return Number.isInteger(x.v) ? x.v.toFixed(1) : String(x.v);
    case 'NoneType': return 'None';
    case 'function': return `<function ${x.qual || x.name} at ${x.id}>`;
    case 'method': return `<bound method ${x.fq} of ${repr(x.self)}>`;
    case 'raw': return x.text;
    default: return `<__main__.${x.c} object at ${x.id}>`;
  }
}
function clone(x) {
  if (x.c === 'list' || x.c === 'tuple' || x.c === 'set') return { ...x, v: x.v.map(clone) };
  if (x.c === 'dict') return { ...x, v: x.v.map(([k, v]) => [clone(k), clone(v)]) };
  if (x.dict) return { ...x, dict: { ...x.dict } };
  return { ...x };
}
function eq(a, b) {
  const num = o => (o.c === 'int' || o.c === 'bool' || o.c === 'float') ? Number(o.v) : undefined;
  if (num(a) !== undefined && num(b) !== undefined) return num(a) === num(b);
  if (a.c !== b.c) return false;
  if (a.c === 'list' || a.c === 'tuple') return a.v.length === b.v.length && a.v.every((e, i) => eq(e, b.v[i]));
  // dict і set порівнюються БЕЗ урахування порядку
  if (a.c === 'set') return a.v.length === b.v.length && a.v.every(e => b.v.some(f => eq(e, f)));
  if (a.c === 'dict') return a.v.length === b.v.length && a.v.every(([k, v]) => { const i = dIdx(b, k); return i >= 0 && eq(v, b.v[i][1]); });
  if (a.dict) return a === b;
  return a.v === b.v;
}
class PyError extends Error { constructor(kind, msg) { super(msg); this.kind = kind; } }
const toInt = x => Number(x.v);

// Хешованість: змінні колекції не можуть бути ключем dict чи елементом set; кортеж — лише якщо всі елементи хешовані
function unhashable(x) {
  if (x.c === 'list' || x.c === 'dict' || x.c === 'set') return x.c;
  if (x.c === 'tuple') { for (const e of x.v) { const bad = unhashable(e); if (bad) return bad; } }
  return null;
}
const needHash = x => { const bad = unhashable(x); if (bad) throw new PyError('TypeError', `unhashable type: '${bad}'`); };
const dIdx = (d, k) => d.v.findIndex(([kk]) => eq(kk, k));
function dSet(d, k, val) { needHash(k); const i = dIdx(d, k); if (i >= 0) d.v[i][1] = val; else d.v.push([k, val]); }
function sAdd(s, x) { needHash(x); if (s.v.some(e => eq(e, x))) return false; s.v.push(x); return true; }
// елементи будь-якої колекції (для dict — ключі, як при ітерації)
const itemsOf = it => it.c === 'dict' ? it.v.map(([k]) => k) : it.v;
// пари для dict(...) / update(...): інший dict або колекція пар (ключ, значення)
function pairsOf(it) {
  if (it.c === 'dict') return it.v;
  return it.v.map((e, i) => {
    if ((e.c !== 'tuple' && e.c !== 'list') || e.v.length !== 2) throw new PyError('ValueError', `dictionary update sequence element #${i} has wrong length`);
    return [e.v[0], e.v[1]];
  });
}
const keyErr = k => new PyError('KeyError', repr(k));

/* ===================== Рівні складності =====================
   beginner — об'єкт → клас → метод, створення через __new__/__init__, успадкування методів
   advanced — метаклас type, два ланцюжки пошуку, bound methods, C3, дескриптори, межі симуляції */
let LEVEL = 'beginner';
try { LEVEL = localStorage.getItem('cm-level') || 'beginner'; } catch (e) { /* file:// без localStorage */ }
const ADV = () => LEVEL === 'advanced';
const ADV_NODES = new Set(['method']);          // класи, які показуємо лише на Advanced
const ADV_INST = new Set(['bark']);             // об'єкти, які показуємо лише на Advanced
const nodeVisible = k => ADV() || !ADV_NODES.has(k);
const instVisible = k => (ADV() || !ADV_INST.has(k)) && nodeVisible(INST[k].c);

/* ===================== Класи та їхні власні методи =====================
   kind: mut — змінює об'єкт; new — повертає новий об'єкт; info — лише читає;
         create — працює при створенні; none — метод вимкнено (= None)
   ex: аргументи для прикладу; op: як це пишуть звичайно; run(self, ...args, ctx) */
const CLASSES = {
  object: {
    bases: [], kind: 'root',
    about: "Корінь успадкування. Усі класи зрештою успадковуються від object, тому його методи є в будь-якого об'єкта.",
    methods: [
      { n: '__new__', sig: '(cls)', kind: 'create', d: "Виділяє пам'ять і створює порожній об'єкт класу cls. Викликається першим при Клас(...)." },
      { n: '__init__', sig: '(self)', kind: 'create', d: "Заглушка: нічого не робить. Власні класи її перевизначають, щоб заповнити об'єкт.", ex: [],
        run: () => N },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Технічний опис за замовчуванням: <Клас object at 0x...>.', op: 'repr({s})', ex: [],
        run: s => S(`<__main__.${s.c} object at ${s.id}>`) },
      { n: '__str__', sig: '(self) → str', kind: 'info', d: 'Те, що показує print(). За замовчуванням просто викликає type(self).__repr__(self).', op: 'str({s})', ex: [],
        run: (s, ctx) => { const r = callMethod(s, '__repr__', [], ctx, true); ctx.notes.push(`object.__str__ всередині викликав ${r.where}.__repr__`); return r.ret; } },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: "За замовчуванням порівнює ідентичність: якщо це той самий об'єкт — True, інакше повертає NotImplemented, і оператор == у підсумку дає False.", op: '{s} == {a0}', ex: ['self'],
        run: (s, o) => B(s === o) },
      { n: '__hash__', sig: '(self) → int', kind: 'info', d: 'Хеш на основі id об\'єкта. Потрібен, щоб об\'єкт міг бути ключем dict чи елементом set.', op: 'hash({s})', ex: [],
        run: s => I(parseInt(s.id, 16) >> 4) },
      { n: '__setattr__', sig: '(self, name, value)', kind: 'mut', d: 'Викликається при obj.name = value: записує атрибут у obj.__dict__.', op: '{s}.age = {a1}', ex: [S('age'), I(3)],
        run: (s, name, val) => {
          if (!s.dict) throw new PyError('AttributeError', `'${s.c}' object has no attribute '${name.v}' — у вбудованих типів немає __dict__, нові атрибути додати не можна`);
          s.dict[name.v] = val; return N; } },
    ],
  },
  type: {
    bases: ['object'], kind: 'metan',
    about: 'Метаклас: клас, екземплярами якого є інші класи. type(int) is type, type(Dog) is type і навіть type(type) is type.',
    methods: [
      { n: '__call__', sig: '(cls, *args)', kind: 'create', d: 'Саме він працює, коли ви пишете Клас(...): викликає cls.__new__, потім cls.__init__ і повертає готовий об\'єкт.' },
      { n: '__new__', sig: '(mcs, name, bases, ns)', kind: 'create', d: 'Створює новий КЛАС. Виконується, коли Python читає оператор class Dog(Animal): ...' },
      { n: 'mro', sig: '() → list', kind: 'info', d: 'Повертає порядок пошуку методів: list.mro() → [list, object]. Для екземпляра nums.mro() — AttributeError.' },
      { n: '__name__', sig: ': str', kind: 'info', d: "Ім'я класу: list.__name__ → 'list'. У екземпляра nums такого атрибута немає." },
      { n: '__bases__', sig: ': tuple', kind: 'info', d: 'Безпосередні батьки класу: list.__bases__ → (object,).' },
      { n: '__mro__', sig: ': tuple', kind: 'info', d: 'Повний ланцюжок пошуку: list.__mro__ → (list, object).' },
      { n: '__subclasses__', sig: '() → list', kind: 'info', d: 'Прямі нащадки: Animal.__subclasses__() → [Dog].' },
      { n: '__repr__', sig: '(cls) → str', kind: 'info', d: "Дає <class 'int'> при print(int)." },
    ],
  },
  int: {
    bases: ['object'], kind: 'cls',
    about: "Ціле число. Незмінний (immutable): жоден метод не змінює число, усі повертають нове.",
    methods: [
      { n: '__new__', sig: '(cls, x=0)', kind: 'create', d: "Створює число: int('540') → 540. Число не можна змінити, тож усе робиться тут." },
      { n: '__add__', sig: '(self, other) → int', kind: 'new', d: 'Оператор +. Повертає НОВЕ число.', op: '{s} + {a0}', ex: [I(60)],
        run: (s, o) => I(toInt(s) + toInt(o)) },
      { n: '__sub__', sig: '(self, other) → int', kind: 'new', d: 'Оператор -.', op: '{s} - {a0}', ex: [I(40)],
        run: (s, o) => I(toInt(s) - toInt(o)) },
      { n: '__mul__', sig: '(self, other) → int', kind: 'new', d: 'Оператор *.', op: '{s} * {a0}', ex: [I(2)],
        run: (s, o) => I(toInt(s) * toInt(o)) },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==. Порівнює значення (перевизначає object.__eq__).', op: '{s} == {a0}', ex: [I(540)],
        run: (s, o) => B(eq(s, o)) },
      { n: '__hash__', sig: '(self) → int', kind: 'info', d: 'Хеш цілого числа — саме число. Тому числа можуть бути ключами dict.', op: 'hash({s})', ex: [],
        run: s => I(toInt(s)) },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: "Текст числа: '540'. Власного __str__ у int немає — print бере object.__str__, а той викликає цей метод.", op: 'repr({s})', ex: [],
        run: s => S(String(toInt(s))) },
      { n: 'bit_length', sig: '() → int', kind: 'info', d: 'Скільки бітів потрібно, щоб записати число у двійковій системі.', ex: [],
        run: s => I(Math.abs(toInt(s)).toString(2).replace(/^0$/, '').length) },
    ],
  },
  bool: {
    bases: ['int'], kind: 'cls',
    about: 'Логічний тип. Підклас int: True поводиться як 1, False як 0. Тому True + True == 2.',
    methods: [
      { n: '__new__', sig: '(cls, x=False)', kind: 'create', d: "bool(x): перевіряє «істинність» x і повертає один з двох об'єктів — True або False." },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: "Перевизначає int.__repr__: замість '1' показує 'True'.", op: 'repr({s})', ex: [],
        run: s => S(s.v ? 'True' : 'False') },
      { n: '__and__', sig: '(self, other) → bool', kind: 'new', d: 'Оператор & для логічних значень.', op: '{s} & {a0}', ex: [B(false)],
        run: (s, o) => B(Boolean(s.v) && Boolean(o.v)) },
      { n: '__or__', sig: '(self, other) → bool', kind: 'new', d: 'Оператор | для логічних значень.', op: '{s} | {a0}', ex: [B(false)],
        run: (s, o) => B(Boolean(s.v) || Boolean(o.v)) },
    ],
  },
  str: {
    bases: ['object'], kind: 'cls',
    about: "Рядок. Незмінний: upper(), replace() тощо НЕ змінюють рядок, а повертають новий.",
    methods: [
      { n: '__new__', sig: '(cls, x="")', kind: 'create', d: "Створює рядок: str(540) → '540'." },
      { n: '__len__', sig: '(self) → int', kind: 'info', d: 'Функція len(): кількість символів.', op: 'len({s})', ex: [],
        run: s => I([...s.v].length) },
      { n: '__getitem__', sig: '(self, i) → str', kind: 'new', d: 'Індексація s[i]: повертає новий рядок з одного символу.', op: '{s}[{a0}]', ex: [I(0)],
        run: (s, i) => { const ch = [...s.v]; let k = toInt(i); if (k < 0) k += ch.length; if (k < 0 || k >= ch.length) throw new PyError('IndexError', 'string index out of range'); return S(ch[k]); } },
      { n: '__add__', sig: '(self, other) → str', kind: 'new', d: 'Оператор +: склеює і повертає НОВИЙ рядок.', op: '{s} + {a0}', ex: [S('!')],
        run: (s, o) => { if (o.c !== 'str') throw new PyError('TypeError', 'can only concatenate str to str'); return S(s.v + o.v); } },
      { n: '__contains__', sig: '(self, sub) → bool', kind: 'info', d: 'Оператор in.', op: '{a0} in {s}', ex: [S('Поділ')],
        run: (s, o) => B(s.v.includes(o.v)) },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==: порівнює символи.', op: '{s} == {a0}', ex: [S('Київ Поділ')],
        run: (s, o) => B(eq(s, o)) },
      { n: '__str__', sig: '(self) → str', kind: 'info', d: 'print() показує рядок без лапок.', op: 'str({s})', ex: [],
        run: s => S(s.v) },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Представлення з лапками.', op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
      { n: 'upper', sig: '() → str', kind: 'new', d: 'Новий рядок ВЕЛИКИМИ літерами. Оригінал без змін.', ex: [],
        run: s => S(s.v.toUpperCase()) },
      { n: 'lower', sig: '() → str', kind: 'new', d: 'Новий рядок малими літерами.', ex: [],
        run: s => S(s.v.toLowerCase()) },
      { n: 'replace', sig: '(old, new) → str', kind: 'new', d: 'Новий рядок із заміною.', ex: [S('Поділ'), S('Оболонь')],
        run: (s, a, b) => S(s.v.split(a.v).join(b.v)) },
      { n: 'split', sig: '(sep=None) → list', kind: 'new', d: 'Розбиває рядок і повертає НОВИЙ список.', ex: [],
        run: (s, sep) => L((sep && sep.c === 'str' ? s.v.split(sep.v) : s.v.trim().split(/\s+/).filter(Boolean)).map(S)) },
      { n: 'startswith', sig: '(prefix) → bool', kind: 'info', d: 'Чи починається рядок з prefix.', ex: [S('Київ')],
        run: (s, p) => B(s.v.startsWith(p.v)) },
      { n: 'count', sig: '(sub) → int', kind: 'info', d: 'Скільки разів трапляється підрядок.', ex: [S('і')],
        run: (s, p) => I(s.v.split(p.v).length - 1) },
    ],
  },
  list: {
    bases: ['object'], kind: 'cls',
    about: "Список. ЗМІННИЙ (mutable): append, sort, pop... змінюють той самий об'єкт (id не змінюється) і зазвичай повертають None.",
    methods: [
      { n: '__new__', sig: '(cls, ...)', kind: 'create', d: 'Створює ПОРОЖНІЙ список у пам\'яті.' },
      { n: '__init__', sig: '(self, iterable=())', kind: 'create', d: 'Заповнює вже створений список елементами. Якщо викликати повторно — очистить і заповнить знову.', op: '{s}.__init__({a0})', ex: [L([I(1), I(2)])],
        run: (s, it) => { s.v = it ? [...it.v] : []; return N; } },
      { n: '__len__', sig: '(self) → int', kind: 'info', d: 'Функція len(): кількість елементів.', op: 'len({s})', ex: [],
        run: s => I(s.v.length) },
      { n: '__getitem__', sig: '(self, i)', kind: 'info', d: 'Читання s[i]: повертає елемент (список не змінюється).', op: '{s}[{a0}]', ex: [I(0)],
        run: (s, i) => { let k = toInt(i); if (k < 0) k += s.v.length; if (k < 0 || k >= s.v.length) throw new PyError('IndexError', 'list index out of range'); return s.v[k]; } },
      { n: '__setitem__', sig: '(self, i, value)', kind: 'mut', d: 'Запис s[i] = value: змінює елемент на місці.', op: '{s}[{a0}] = {a1}', ex: [I(0), I(999)],
        run: (s, i, val) => { let k = toInt(i); if (k < 0) k += s.v.length; if (k < 0 || k >= s.v.length) throw new PyError('IndexError', 'list assignment index out of range'); s.v[k] = val; return N; } },
      { n: '__add__', sig: '(self, other) → list', kind: 'new', d: 'Оператор +: НОВИЙ список, старий без змін.', op: '{s} + {a0}', ex: [L([I(1)])],
        run: (s, o) => { if (o.c !== 'list') throw new PyError('TypeError', `can only concatenate list (not "${o.c}") to list`); return L([...s.v, ...o.v]); } },
      { n: '__contains__', sig: '(self, x) → bool', kind: 'info', d: 'Оператор in.', op: '{a0} in {s}', ex: [I(540)],
        run: (s, x) => B(s.v.some(e => eq(e, x))) },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==: порівнює елементи по черзі.', op: '{s} == {a0}', ex: [L([I(540), I(320)])],
        run: (s, o) => B(eq(s, o)) },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Текст [540, 320]. Власного __str__ немає — print бере object.__str__, а той викликає цей метод.', op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
      { n: '__hash__', sig: '= None', kind: 'none', d: 'Вимкнено (= None): список змінний, тому не може бути ключем dict. Перекриває object.__hash__.', op: 'hash({s})', ex: [],
        run: () => { throw new PyError('TypeError', "unhashable type: 'list'"); } },
      { n: 'append', sig: '(x) → None', kind: 'mut', d: 'Додає елемент у КІНЕЦЬ того самого списку.', ex: [I(100)],
        run: (s, x) => { s.v.push(x); return N; } },
      { n: 'extend', sig: '(iterable) → None', kind: 'mut', d: 'Додає всі елементи з іншої колекції.', ex: [L([I(1), I(2)])],
        run: (s, it) => { s.v.push(...it.v); return N; } },
      { n: 'insert', sig: '(i, x) → None', kind: 'mut', d: 'Вставляє елемент на позицію i.', ex: [I(0), I(7)],
        run: (s, i, x) => { s.v.splice(Math.max(0, toInt(i)), 0, x); return N; } },
      { n: 'pop', sig: '(i=-1)', kind: 'mut', d: 'Вилучає елемент зі списку І повертає його.', ex: [],
        run: s => { if (!s.v.length) throw new PyError('IndexError', 'pop from empty list'); return s.v.pop(); } },
      { n: 'remove', sig: '(x) → None', kind: 'mut', d: 'Видаляє перше входження x.', ex: [I(540)],
        run: (s, x) => { const k = s.v.findIndex(e => eq(e, x)); if (k < 0) throw new PyError('ValueError', 'list.remove(x): x not in list'); s.v.splice(k, 1); return N; } },
      { n: 'sort', sig: '() → None', kind: 'mut', d: 'Сортує ТОЙ САМИЙ список. Повертає None (на відміну від sorted()).', ex: [],
        run: s => { s.v.sort((a, b) => (a.v > b.v) - (a.v < b.v)); return N; } },
      { n: 'reverse', sig: '() → None', kind: 'mut', d: 'Розвертає список на місці.', ex: [],
        run: s => { s.v.reverse(); return N; } },
      { n: 'clear', sig: '() → None', kind: 'mut', d: 'Видаляє всі елементи.', ex: [],
        run: s => { s.v = []; return N; } },
      { n: 'copy', sig: '() → list', kind: 'new', d: 'ПОВЕРХНЕВА копія: новий зовнішній список (новий id), але елементи ті самі об\'єкти. Для [[1, 2]] вкладений список буде спільним.', ex: [],
        run: (s, ctx) => { ctx.notes.push(`поверхнева копія: новий лише зовнішній список; елементи спільні — копія[0] is ${varOf(s) || 'список'}[0] → True`); return L([...s.v]); } },
      { n: 'count', sig: '(x) → int', kind: 'info', d: 'Скільки разів трапляється x.', ex: [I(540)],
        run: (s, x) => I(s.v.filter(e => eq(e, x)).length) },
      { n: 'index', sig: '(x) → int', kind: 'info', d: 'Позиція першого входження x.', ex: [I(320)],
        run: (s, x) => { const k = s.v.findIndex(e => eq(e, x)); if (k < 0) throw new PyError('ValueError', `${repr(x)} is not in list`); return I(k); } },
    ],
  },
  tuple: {
    bases: ['object'], kind: 'cls',
    about: 'Кортеж. НЕЗМІННИЙ: немає append, sort, pop. Має __hash__, тому (540, 320) може бути ключем dict. Але лише якщо всі елементи хешовані: ([1, 2], 540) → TypeError.',
    methods: [
      { n: '__new__', sig: '(cls, iterable=())', kind: 'create', d: "Створює кортеж ОДРАЗУ з елементами. Власного __init__ немає — заповнити потім неможливо." },
      { n: '__len__', sig: '(self) → int', kind: 'info', d: 'Функція len().', op: 'len({s})', ex: [],
        run: s => I(s.v.length) },
      { n: '__getitem__', sig: '(self, i)', kind: 'info', d: 'Читання t[i]. Запису t[i] = ... немає (немає __setitem__).', op: '{s}[{a0}]', ex: [I(0)],
        run: (s, i) => { let k = toInt(i); if (k < 0) k += s.v.length; if (k < 0 || k >= s.v.length) throw new PyError('IndexError', 'tuple index out of range'); return s.v[k]; } },
      { n: '__add__', sig: '(self, other) → tuple', kind: 'new', d: 'Оператор +: НОВИЙ кортеж.', op: '{s} + {a0}', ex: [T([I(1)])],
        run: (s, o) => { if (o.c !== 'tuple') throw new PyError('TypeError', `can only concatenate tuple (not "${o.c}") to tuple`); return T([...s.v, ...o.v]); } },
      { n: '__contains__', sig: '(self, x) → bool', kind: 'info', d: 'Оператор in.', op: '{a0} in {s}', ex: [I(540)],
        run: (s, x) => B(s.v.some(e => eq(e, x))) },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==.', op: '{s} == {a0}', ex: [T([I(540), I(320)])],
        run: (s, o) => B(eq(s, o)) },
      { n: '__hash__', sig: '(self) → int', kind: 'info', d: 'Хеш з хешів УСІХ елементів. Працює, лише якщо кожен елемент хешований: hash((540, 320)) — так, hash(([1, 2], 540)) — TypeError. Сама незмінність кортежу цього не гарантує.', op: 'hash({s})', ex: [],
        run: s => { needHash(s); return I(s.v.reduce((h, e) => (h * 31 + (Number(e.v) || 7)) % 1000003, 3527)); } },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Текст (540, 320).', op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
      { n: 'count', sig: '(x) → int', kind: 'info', d: 'Скільки разів трапляється x.', ex: [I(540)],
        run: (s, x) => I(s.v.filter(e => eq(e, x)).length) },
      { n: 'index', sig: '(x) → int', kind: 'info', d: 'Позиція першого входження x.', ex: [I(320)],
        run: (s, x) => { const k = s.v.findIndex(e => eq(e, x)); if (k < 0) throw new PyError('ValueError', 'tuple.index(x): x not in tuple'); return I(k); } },
    ],
  },
  dict: {
    bases: ['object'], kind: 'cls',
    about: "Словник: пари «ключ → значення». ЗМІННИЙ, як list: d[key] = value, update, pop змінюють той самий об'єкт. Ключі — лише ХЕШОВАНІ об'єкти (int, str, tuple…), бо dict шукає ключ за hash(). Порядок пар — порядок додавання (з Python 3.7).",
    methods: [
      { n: '__new__', sig: '(cls, ...)', kind: 'create', d: "Створює ПОРОЖНІЙ словник {} у пам'яті." },
      { n: '__init__', sig: '(self, iterable=(), **kw)', kind: 'create', d: 'Заповнює словник парами з іншого dict або зі списку пар (ключ, значення). Повторний виклик НЕ очищає — лише додає/оновлює, як update.', op: '{s}.__init__({a0})', ex: [L([T([S('сік'), I(50)])])],
        run: (s, it) => { if (it) pairsOf(it).forEach(([k, v]) => dSet(s, k, v)); return N; } },
      { n: '__len__', sig: '(self) → int', kind: 'info', d: 'Функція len(): кількість ПАР.', op: 'len({s})', ex: [],
        run: s => I(s.v.length) },
      { n: '__getitem__', sig: '(self, key)', kind: 'info', d: 'Читання d[key]: повертає значення. Немає ключа → KeyError (на відміну від get).', op: '{s}[{a0}]', ex: [S('кава')],
        run: (s, k) => { needHash(k); const i = dIdx(s, k); if (i < 0) throw keyErr(k); return s.v[i][1]; } },
      { n: '__setitem__', sig: '(self, key, value)', kind: 'mut', d: 'Запис d[key] = value: є ключ — оновлює значення, немає — додає нову пару в кінець.', op: '{s}[{a0}] = {a1}', ex: [S('сік'), I(50)],
        run: (s, k, v) => { dSet(s, k, v); return N; } },
      { n: '__delitem__', sig: '(self, key)', kind: 'mut', d: 'Оператор del d[key]: видаляє пару. Немає ключа → KeyError.', op: 'del {s}[{a0}]', ex: [S('чай')],
        run: (s, k) => { const i = dIdx(s, k); if (i < 0) throw keyErr(k); s.v.splice(i, 1); return N; } },
      { n: '__contains__', sig: '(self, key) → bool', kind: 'info', d: 'Оператор in перевіряє КЛЮЧІ, а не значення.', op: '{a0} in {s}', ex: [S('кава')],
        run: (s, k, ctx) => { ctx.notes.push(`in шукає серед ключів; щоб перевірити значення: 45 in ${varOf(s) || 'd'}.values()`); return B(dIdx(s, k) >= 0); } },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==: ті самі пари ключ → значення. Порядок НЕ важливий.', op: '{s} == {a0}', ex: [D([[S('чай'), I(30)], [S('кава'), I(45)]])],
        run: (s, o, ctx) => { ctx.notes.push('пари записано в іншому порядку — для dict це не важливо'); return B(eq(s, o)); } },
      { n: '__or__', sig: '(self, other) → dict', kind: 'new', d: 'Оператор | (Python 3.9+): НОВИЙ словник з парами обох; при однакових ключах перемагає правий.', op: '{s} | {a0}', ex: [D([[S('чай'), I(35)]])],
        run: (s, o) => { if (o.c !== 'dict') throw new PyError('TypeError', `unsupported operand type(s) for |: 'dict' and '${o.c}'`); const r = D(s.v.map(([k, v]) => [k, v])); o.v.forEach(([k, v]) => dSet(r, k, v)); return r; } },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: "Текст {'кава': 45, 'чай': 30}.", op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
      { n: '__hash__', sig: '= None', kind: 'none', d: 'Вимкнено (= None): словник змінний, тому сам не може бути ключем іншого dict чи елементом set.', op: 'hash({s})', ex: [],
        run: () => { throw new PyError('TypeError', "unhashable type: 'dict'"); } },
      { n: 'get', sig: '(key, default=None)', kind: 'info', d: 'Як d[key], але без KeyError: немає ключа → повертає default.', ex: [S('сік'), I(0)],
        run: (s, k, dflt, ctx) => { const i = dIdx(s, k); if (i >= 0) return s.v[i][1]; ctx.notes.push(`ключа ${repr(k)} немає → повернуто default; словник не змінився`); return dflt && dflt.c ? dflt : N; } },
      { n: 'keys', sig: '() → dict_keys', kind: 'info', d: "«Вікно» на ключі, а не копія: змінився словник — змінилось і вікно. list(d.keys()) — справжній список.", ex: [],
        run: s => ({ c: 'raw', tn: 'dict_keys', text: `dict_keys([${s.v.map(([k]) => repr(k)).join(', ')}])` }) },
      { n: 'values', sig: '() → dict_values', kind: 'info', d: '«Вікно» на значення.', ex: [],
        run: s => ({ c: 'raw', tn: 'dict_values', text: `dict_values([${s.v.map(([, v]) => repr(v)).join(', ')}])` }) },
      { n: 'items', sig: '() → dict_items', kind: 'info', d: '«Вікно» на пари (ключ, значення) — саме його перебирають у for k, v in d.items().', ex: [],
        run: s => ({ c: 'raw', tn: 'dict_items', text: `dict_items([${s.v.map(([k, v]) => `(${repr(k)}, ${repr(v)})`).join(', ')}])` }) },
      { n: 'update', sig: '(other) → None', kind: 'mut', d: 'Додає пари з іншого словника в ТОЙ САМИЙ dict; однакові ключі перезаписує.', ex: [D([[S('чай'), I(35)], [S('сік'), I(50)]])],
        run: (s, o) => { pairsOf(o).forEach(([k, v]) => dSet(s, k, v)); return N; } },
      { n: 'setdefault', sig: '(key, default=None)', kind: 'mut', d: 'Є ключ — повертає значення. Немає — ДОДАЄ key: default і повертає default.', ex: [S('сік'), I(50)],
        run: (s, k, dflt) => { const i = dIdx(s, k); if (i >= 0) return s.v[i][1]; dSet(s, k, dflt || N); return dflt || N; } },
      { n: 'pop', sig: '(key)', kind: 'mut', d: 'Вилучає пару І повертає значення. Немає ключа → KeyError.', ex: [S('чай')],
        run: (s, k) => { const i = dIdx(s, k); if (i < 0) throw keyErr(k); return s.v.splice(i, 1)[0][1]; } },
      { n: 'clear', sig: '() → None', kind: 'mut', d: 'Видаляє всі пари.', ex: [],
        run: s => { s.v = []; return N; } },
      { n: 'copy', sig: '() → dict', kind: 'new', d: "ПОВЕРХНЕВА копія: новий словник (новий id), але ключі й значення — ті самі об'єкти.", ex: [],
        run: (s, ctx) => { ctx.notes.push('поверхнева копія: новий лише сам словник; значення-списки були б спільними'); return D(s.v.map(([k, v]) => [k, v])); } },
    ],
  },
  set: {
    bases: ['object'], kind: 'cls',
    about: "Множина: лише УНІКАЛЬНІ елементи, без порядку й без індексів (s[0] → TypeError). ЗМІННА: add, remove, update змінюють той самий об'єкт. Елементи — лише хешовані об'єкти. Незмінна версія — frozenset (вона хешована).",
    methods: [
      { n: '__new__', sig: '(cls, ...)', kind: 'create', d: "Створює ПОРОЖНЮ множину set(). Увага: {} — це порожній dict, а не set!" },
      { n: '__init__', sig: '(self, iterable=())', kind: 'create', d: 'Очищає й заповнює множину елементами; дублікати відкидаються.', op: '{s}.__init__({a0})', ex: [L([S('кава'), S('кава'), S('чай')])],
        run: (s, it, ctx) => { s.v = []; const all = it ? itemsOf(it) : []; all.forEach(x => sAdd(s, x)); if (all.length > s.v.length) ctx.notes.push(`дублікатів відкинуто: ${all.length - s.v.length}`); return N; } },
      { n: '__len__', sig: '(self) → int', kind: 'info', d: 'Функція len(): кількість УНІКАЛЬНИХ елементів.', op: 'len({s})', ex: [],
        run: s => I(s.v.length) },
      { n: '__contains__', sig: '(self, x) → bool', kind: 'info', d: 'Оператор in. Дуже швидкий: шукає за hash(), а не перебором, як list.', op: '{a0} in {s}', ex: [S('кава')],
        run: (s, x) => { needHash(x); return B(s.v.some(e => eq(e, x))); } },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: 'Оператор ==: ті самі елементи. Порядок НЕ важливий.', op: '{s} == {a0}', ex: [SE([S('гаряче'), S('кава')])],
        run: (s, o, ctx) => { ctx.notes.push('елементи записано в іншому порядку — у множини порядку немає'); return B(eq(s, o)); } },
      { n: '__or__', sig: '(self, other) → set', kind: 'new', d: 'Оператор | — об\'єднання: НОВА множина з елементами обох.', op: '{s} | {a0}', ex: [SE([S('чай')])],
        run: (s, o) => { const r = SE(s.v); itemsOf(o).forEach(x => sAdd(r, x)); return r; } },
      { n: '__and__', sig: '(self, other) → set', kind: 'new', d: 'Оператор & — перетин: НОВА множина зі спільних елементів.', op: '{s} & {a0}', ex: [SE([S('кава'), S('чай')])],
        run: (s, o) => SE(s.v.filter(e => itemsOf(o).some(f => eq(e, f)))) },
      { n: '__sub__', sig: '(self, other) → set', kind: 'new', d: 'Оператор - — різниця: НОВА множина з елементів, яких немає в other.', op: '{s} - {a0}', ex: [SE([S('кава')])],
        run: (s, o) => SE(s.v.filter(e => !itemsOf(o).some(f => eq(e, f)))) },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: "Текст {'кава', 'гаряче'}; порожня множина — set().", op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
      { n: '__hash__', sig: '= None', kind: 'none', d: 'Вимкнено (= None): множина змінна. Множина множин — лише через frozenset.', op: 'hash({s})', ex: [],
        run: () => { throw new PyError('TypeError', "unhashable type: 'set'"); } },
      { n: 'add', sig: '(x) → None', kind: 'mut', d: 'Додає елемент у ТУ САМУ множину. Якщо він уже є — нічого не відбувається.', ex: [S('чай')],
        run: (s, x, ctx) => { if (!sAdd(s, x)) ctx.notes.push(`${repr(x)} уже є в множині — дубліката не буде`); return N; } },
      { n: 'update', sig: '(iterable) → None', kind: 'mut', d: 'Додає всі елементи з іншої колекції; дублікати пропускає.', ex: [L([S('кава'), S('чай')])],
        run: (s, it, ctx) => { const skip = itemsOf(it).filter(x => !sAdd(s, x)); if (skip.length) ctx.notes.push(`пропущено, бо вже були: ${skip.map(repr).join(', ')}`); return N; } },
      { n: 'remove', sig: '(x) → None', kind: 'mut', d: 'Видаляє елемент. Немає — KeyError.', ex: [S('гаряче')],
        run: (s, x) => { const k = s.v.findIndex(e => eq(e, x)); if (k < 0) throw keyErr(x); s.v.splice(k, 1); return N; } },
      { n: 'discard', sig: '(x) → None', kind: 'mut', d: 'Як remove, але БЕЗ помилки, якщо елемента немає.', ex: [S('сік')],
        run: (s, x, ctx) => { const k = s.v.findIndex(e => eq(e, x)); if (k < 0) ctx.notes.push(`${repr(x)} немає — discard мовчки нічого не робить (remove дав би KeyError)`); else s.v.splice(k, 1); return N; } },
      { n: 'pop', sig: '() → object', kind: 'mut', d: 'Вилучає й повертає ДОВІЛЬНИЙ елемент — який саме, не гарантовано.', ex: [],
        run: s => { if (!s.v.length) throw new PyError('KeyError', "'pop from an empty set'"); return s.v.shift(); } },
      { n: 'clear', sig: '() → None', kind: 'mut', d: 'Видаляє всі елементи.', ex: [],
        run: s => { s.v = []; return N; } },
      { n: 'issubset', sig: '(other) → bool', kind: 'info', d: 'Чи всі елементи є в other (оператор <=).', ex: [SE([S('кава'), S('гаряче'), S('чай')])],
        run: (s, o) => B(s.v.every(e => itemsOf(o).some(f => eq(e, f)))) },
      { n: 'copy', sig: '() → set', kind: 'new', d: 'Поверхнева копія: нова множина (новий id) з тими самими елементами.', ex: [],
        run: s => SE(s.v) },
    ],
  },
  function: {
    bases: ['object'], kind: 'cls',
    code: "def apply_discount(bill, percent=10):\n    \"\"\"Знижка на чек.\"\"\"\n    return round(bill * (1 - percent / 100), 2)\n\n\ndef make_counter():            # урок 19: замикання\n    count = 0\n    def next_id():\n        nonlocal count\n        count += 1\n        return count\n    return next_id\n\n\nnext_id = make_counter()\n\ntype(apply_discount)           # <class 'function'>\ntype(Dog.__dict__['speak'])    # <class 'function'>  — метод = функція, що лежить у класі\ntype(len)                      # <class 'builtin_function_or_method'>  — вбудовані написані на C",
    about: "Функція — теж об'єкт (урок 19). Її створює оператор def або lambda. Функцію можна покласти в змінну чи список, передати в іншу функцію; у неї є атрибути (__name__, __defaults__) і навіть власний __dict__. Методи класу — це звичайні функції, що лежать у Клас.__dict__.",
    methods: [
      { n: '__new__', sig: '(code, globals, ...)', kind: 'create', d: "Створює об'єкт-функцію. Самі ви його не викликаєте: це робить оператор def (або lambda), коли Python виконує цей рядок." },
      { n: '__call__', sig: '(self, *args, **kwargs)', kind: 'info', d: 'Працює при f(...): виконує тіло функції. Якщо функція має замикання, виклик може змінити його стан (next_id).', op: '{s}({args})',
        ex: s => s.exArgs, run: (s, ...rest) => { const ctx = rest.pop(); return s.impl(rest, ctx); } },
      { n: '__name__', sig: ': str', kind: 'info', d: "Ім'я з рядка def.", op: '{s}.__name__', ex: [],
        run: s => S(s.name) },
      { n: '__qualname__', sig: ': str', kind: 'info', d: 'Повне ім\'я: показує, де функцію оголошено (наприклад, всередині make_counter).', op: '{s}.__qualname__', ex: [],
        run: s => S(s.qual || s.name) },
      { n: '__defaults__', sig: ': tuple | None', kind: 'info', d: 'Значення параметрів за замовчуванням. Створюються ОДИН раз — при def (звідси пастка зі списком за замовчуванням).', op: '{s}.__defaults__', ex: [],
        run: s => s.defaults ? T([...s.defaults]) : N },
      { n: '__doc__', sig: ': str | None', kind: 'info', d: 'Рядок документації — перший рядок у лапках у тілі функції.', op: '{s}.__doc__', ex: [],
        run: s => s.doc ? S(s.doc) : N },
      { n: '__closure__', sig: ': tuple | None', kind: 'info', d: "Комірки замикання: змінні оточуючої функції, які функція «пам'ятає» між викликами (урок 19).", op: '{s}.__closure__', ex: [],
        run: s => s.closure ? { c: 'raw', tn: 'tuple', text: '(' + Object.entries(s.closure).map(([a, v]) => `<cell: ${a} = ${repr(v)}>`).join(', ') + ',)' } : N },
      { n: '__get__', sig: '(self, obj) → method', kind: 'new', d: "Прив'язує функцію до об'єкта й повертає bound method. Саме так rex.speak стає методом: Python викликає Dog.__dict__['speak'].__get__(rex).", op: '{s}.__get__({a0})', ex: ['rex'],
        run: (s, obj) => ({ c: 'method', self: obj, fq: s.qual || s.name, fid: s.id, call: (args, ctx) => s.impl([obj, ...args], ctx), id: newId() }) },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Текст <function ім\'я at 0x...>.', op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
    ],
  },
  method: {
    bases: ['object'], kind: 'cls',
    code: "rex = Dog('Рекс')\nbark = rex.speak             # дужок немає: метод ще НЕ викликано\n\ntype(bark)                   # <class 'method'>\nbark.__self__ is rex         # True  — до кого прив'язано (майбутній self)\nbark.__func__ is Dog.speak   # True  — яка функція всередині\nbark()                       # 'Гав!' — те саме, що Dog.speak(rex)\nrex.speak is rex.speak       # False — кожне звернення створює НОВИЙ method",
    about: "Bound method — функція, прив'язана до об'єкта. Створюється щоразу, коли ви пишете rex.speak: function.__get__ загортає функцію Dog.speak разом з rex. Виклик bark() = Dog.speak(rex) — ось звідки береться self.",
    methods: [
      { n: '__new__', sig: '(func, obj)', kind: 'create', d: 'Створює bound method. Викликається з function.__get__, коли ви пишете obj.метод.' },
      { n: '__call__', sig: '(self, *args)', kind: 'info', d: 'bark(...) викликає __func__(__self__, ...): об\'єкт підставляється як self автоматично.', op: '{s}()', ex: [],
        run: (s, ctx) => { ctx.notes.push(`виконується ${s.fq}(${varOf(s.self) || 'obj'}) — self = ${varOf(s.self) || 'obj'}`); return s.call([], ctx); } },
      { n: '__self__', sig: ': object', kind: 'info', d: "Об'єкт, до якого прив'язано метод, — майбутній self.", op: '{s}.__self__', ex: [],
        run: s => s.self },
      { n: '__func__', sig: ': function', kind: 'info', d: 'Звичайна функція з класу, яку обгорнуто.', op: '{s}.__func__', ex: [],
        run: s => ({ c: 'raw', tn: 'function', text: `<function ${s.fq} at ${s.fid}>` }) },
      { n: '__eq__', sig: '(self, other) → bool', kind: 'info', d: "Рівні, якщо та сама функція прив'язана до того самого об'єкта.", op: '{s} == rex.speak',
        ex: s => [{ ...s, id: newId() }],
        run: (s, o, ctx) => { ctx.notes.push("але bark is rex.speak → False: кожне rex.speak створює НОВИЙ об'єкт method"); return B(s.self === o.self && s.fq === o.fq); } },
      { n: '__setattr__', sig: '(self, name, value)', kind: 'mut', d: 'Перевизначає object.__setattr__: додати атрибут до bound method не можна.', op: '{s}.age = {a1}', ex: [S('age'), I(3)],
        run: (s, name) => { throw new PyError('AttributeError', `'method' object has no attribute '${name.v}'`); } },
      { n: '__repr__', sig: '(self) → str', kind: 'info', d: 'Текст <bound method Dog.speak of <...Dog object>>.', op: 'repr({s})', ex: [],
        run: s => S(repr(s)) },
    ],
  },
  Animal: {
    bases: ['object'], kind: 'user',
    code: "class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return '...'\n\n    def describe(self):\n        return f'{self.name} каже {self.speak()}'",
    about: 'Ваш власний клас. Без явного батька він все одно успадковується від object.',
    methods: [
      { n: '__init__', sig: '(self, name)', kind: 'create', d: "Записує self.name. Перевизначає object.__init__.", op: '{s}.__init__({a0})', ex: [S('Барсик')],
        run: (s, name) => { s.dict.name = name; return N; } },
      { n: 'speak', sig: '(self) → str', kind: 'info', d: "Повертає '...'. Нащадки можуть перевизначити.", ex: [],
        run: () => S('...') },
      { n: 'describe', sig: '(self) → str', kind: 'info', d: 'Викликає self.speak() — і цей виклик знову шукається, починаючи з класу ОБ\'ЄКТА.', ex: [],
        run: (s, ctx) => { const r = callMethod(s, 'speak', [], ctx, true); ctx.notes.push(`всередині describe: self.speak() знайдено в ${r.where}`); return S(`${s.dict.name.v} каже ${r.ret.v}`); } },
    ],
  },
  Dog: {
    bases: ['Animal'], kind: 'user',
    code: "class Dog(Animal):\n    def speak(self):\n        return 'Гав!'\n\n    def fetch(self):\n        return f'{self.name} приносить палицю'",
    about: 'Підклас Animal. Має лише 2 власні методи; __init__ і describe успадковує від Animal, а __repr__, __eq__... — від object.',
    methods: [
      { n: 'speak', sig: '(self) → str', kind: 'info', d: "Перевизначає Animal.speak: повертає 'Гав!'.", ex: [],
        run: () => S('Гав!') },
      { n: 'fetch', sig: '(self) → str', kind: 'info', d: 'Новий метод, якого немає в Animal.', ex: [],
        run: s => S(`${s.dict.name.v} приносить палицю`) },
    ],
  },
};

// MRO за алгоритмом C3 — так само, як у Python (працює й для множинного успадкування)
function mro(cls) {
  const bases = CLASSES[cls].bases;
  const seqs = [...bases.map(b => mro(b)), [...bases]];
  const out = [cls];
  while (seqs.some(q => q.length)) {
    const head = seqs.filter(q => q.length).map(q => q[0]).find(c => !seqs.some(q => q.slice(1).includes(c)));
    if (!head) throw new Error(`C3: неможливо побудувати MRO для ${cls}`);
    out.push(head);
    seqs.forEach(q => { if (q[0] === head) q.shift(); });
  }
  return out;
}
function own(cls, name) { return CLASSES[cls].methods.find(m => m.n === name); }
function lookup(cls, name) {
  const chain = mro(cls);
  for (let i = 0; i < chain.length; i++) { const m = own(chain[i], name); if (m) return { m, where: chain[i], chain, idx: i }; }
  return { m: null, where: null, chain, idx: -1 };
}
function allMethods(cls) {
  const seen = new Set(), out = [];
  for (const c of mro(cls)) for (const m of CLASSES[c].methods) if (!seen.has(m.n)) { seen.add(m.n); out.push({ m, where: c }); }
  return out;
}
function overrides(cls, name) { const ch = mro(cls); for (const c of ch.slice(1)) if (own(c, name)) return c; return null; }
const KIND = { mut: 'змінює', new: 'нове', info: 'дані', create: 'створення', none: 'None' };
const tag = k => `<span class="tag ${k}">${KIND[k]}</span>`;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* ===================== Об'єкти (екземпляри) ===================== */
function makeInstances() {
  return {
    n:     { ...I(540), id: newId() },
    flag:  { ...B(true), id: newId() },
    city:  { ...S('Київ Поділ'), id: newId() },
    nums:  { ...L([I(540), I(320)]), id: newId() },
    point: { ...T([I(540), I(320)]), id: newId() },
    menu:  { ...D([[S('кава'), I(45)], [S('чай'), I(30)]]), id: newId() },
    tags:  { ...SE([S('кава'), S('гаряче')]), id: newId() },
    cat:   { c: 'Animal', dict: { name: S('Мурка') }, id: newId() },
    rex:   { c: 'Dog', dict: { name: S('Рекс') }, id: newId() },
  };
}
function makeAll() {
  const o = makeInstances();
  // функції — теж об'єкти
  const disc = { c: 'function', name: 'apply_discount', defaults: [I(10)], doc: 'Знижка на чек.', dict: {}, exArgs: [F(540)], id: newId(), label: 'def (bill, …)' };
  disc.impl = (args, ctx) => {
    if (args.length < 1 || args.length > 2) throw new PyError('TypeError', `apply_discount() takes from 1 to 2 positional arguments but ${args.length} were given`);
    const bill = args[0];
    if (!['int', 'float', 'bool'].includes(bill.c)) throw new PyError('TypeError', `unsupported operand type(s) for *: '${bill.c}' and 'float'`);
    let percent = args[1];
    if (!percent) { percent = disc.defaults[0]; ctx.notes.push(`percent не передали → взято з apply_discount.__defaults__ = (${repr(percent)},)`); }
    return F(Math.round(Number(bill.v) * (1 - Number(percent.v) / 100) * 100) / 100);
  };
  const counter = { c: 'function', name: 'next_id', qual: 'make_counter.<locals>.next_id', defaults: null, doc: null, dict: {}, closure: { count: I(0) }, exArgs: [], id: newId(), label: 'make_counter()' };
  counter.impl = (args, ctx) => {
    if (args.length) throw new PyError('TypeError', `make_counter.<locals>.next_id() takes 0 positional arguments but ${args.length} was given`);
    counter.closure.count = I(counter.closure.count.v + 1);
    ctx.notes.push("nonlocal count: замикання пам'ятає лічильник між викликами");
    return counter.closure.count;
  };
  const speak = CLASSES.Dog.methods.find(m => m.n === 'speak');
  const bark = { c: 'method', self: o.rex, fq: 'Dog.speak', fid: '0x7f3a0c', call: (args, ctx) => speak.run(o.rex, ctx), id: newId(), label: 'rex.speak' };
  return { n: o.n, flag: o.flag, city: o.city, nums: o.nums, point: o.point, menu: o.menu, tags: o.tags, apply_discount: disc, next_id: counter, bark, cat: o.cat, rex: o.rex };
}
let INST = makeAll();
const INST_SRC = { n: '540', flag: 'True', city: "'Київ Поділ'", nums: '[540, 320]', point: '(540, 320)', menu: "{'кава': 45, 'чай': 30}", tags: "{'кава', 'гаряче'}", cat: "Animal('Мурка')", rex: "Dog('Рекс')",
  apply_discount: 'def apply_discount(bill, percent=10): ...', next_id: 'make_counter()', bark: 'rex.speak' };
const INST_HDR = { apply_discount: 'apply_discount  ← створено оператором def' };
// стан об'єкта: значення або __dict__ для власних класів
function stateOf(o) {
  const parts = [];
  if (o.dict) parts.push(`__dict__ = {${Object.entries(o.dict).map(([a, v]) => `'${a}': ${repr(v)}`).join(', ')}}`);
  if (o.closure) parts.push(`замикання: ${Object.entries(o.closure).map(([a, v]) => `${a} = ${repr(v)}`).join(', ')}`);
  return parts.length ? parts.join(' · ') : repr(o);
}
const exOf = (m, o) => (typeof m.ex === 'function' ? m.ex(o) : (m.ex || []));
function varOf(obj) { return Object.keys(INST).find(k => INST[k] === obj); }

function callMethod(self, name, args, ctx, nested) {
  const r = lookup(self.c, name);
  if (!r.m) throw new PyError('AttributeError', `'${self.c}' object has no attribute '${name}'`);
  if (!r.m.run) throw new PyError('Info', `${r.where}.${name} працює при створенні об'єкта — див. вкладку «Створення об'єкта»`);
  const real = args.map(a => a === 'self' ? self : a);
  const ret = r.m.run(self, ...real, ctx);
  return { ret, where: r.where, m: r.m };
}

/* ===================== SVG-схема ===================== */
const NODES = {
  object: { x: 640, y: 40 }, type: { x: 1300, y: 40 },
  int: { x: 90, y: 150 }, str: { x: 220, y: 150 }, list: { x: 340, y: 150 }, tuple: { x: 460, y: 150 },
  dict: { x: 590, y: 150 }, set: { x: 720, y: 150 },
  function: { x: 860, y: 150 }, method: { x: 1010, y: 150 }, Animal: { x: 1160, y: 150 },
  bool: { x: 140, y: 262 }, Dog: { x: 1260, y: 262 },
};
const INST_POS = { n: 40, flag: 140, city: 250, nums: 365, point: 480, menu: 610, tags: 740, apply_discount: 870, next_id: 1010, bark: 1135, cat: 1245, rex: 1360 };
const INST_Y = 385, H = 32;
const svg = document.getElementById('map');
const NS = 'http://www.w3.org/2000/svg';
function el(tagName, attrs, parent) { const e = document.createElementNS(NS, tagName); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; }
function boxW(label) { return Math.max(56, 16 + label.length * 8.2); }
let selected = { type: 'inst', key: 'nums' };

function drawMap() {
  svg.innerHTML = '';
  const defs = el('defs', {});
  const mk = (id, color, hollow) => {
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: hollow ? '#fff' : color, stroke: color, 'stroke-width': 1.2 }, m);
  };
  mk('arr', '#495057'); mk('tri', '#495057', true); mk('arrM', '#6741d9'); mk('arrH', '#e67700');

  const showMeta = document.getElementById('showMeta').checked;
  const gE = el('g', {}), gN = el('g', {});
  const w = k => boxW(k);

  // успадкування (пунктир, порожній трикутник)
  for (const k in NODES) {
    if (!nodeVisible(k)) continue;
    for (const b of CLASSES[k].bases) {
      const a = NODES[k], p = NODES[b];
      let d;
      if (a.y === p.y) d = `M${a.x - w(k) / 2},${a.y} L${p.x + w(b) / 2 + 2},${p.y}`;
      else d = `M${a.x},${a.y - H / 2} L${p.x + (a.x - p.x) * 0.12},${p.y + H / 2 + 2}`;
      el('path', { d, class: 'edge inh', 'marker-end': 'url(#tri)', 'data-e': `inh-${k}-${b}` }, gE);
    }
  }
  // клас → type
  const metaFor = !ADV() ? [] : showMeta ? Object.keys(NODES).filter(k => k !== 'type' && nodeVisible(k)) : ['object'];
  for (const k of metaFor) {
    const a = NODES[k], t = NODES.type;
    const sx = a.x + w(k) / 2 - 6, sy = a.y - H / 2;
    const d = k === 'object'
      ? `M${a.x + 20},${a.y - H / 2} C${a.x + 120},${a.y - 45} ${t.x - 120},${t.y - 45} ${t.x - 20},${t.y - H / 2 - 2}`
      : `M${sx},${sy} Q${(sx + t.x) / 2},${Math.min(sy, t.y) - 10} ${t.x - 10},${t.y + H / 2 + 2}`;
    el('path', { d, class: 'edge meta', 'marker-end': 'url(#arrM)', 'data-e': `meta-${k}` }, gE);
  }
  // type → type (петля) — лише Advanced
  const t = NODES.type;
  if (ADV()) {
  el('path', { d: `M${t.x + 22},${t.y - H / 2} C${t.x + 40},${t.y - 50} ${t.x + 85},${t.y - 30} ${t.x + w('type') / 2 + 1},${t.y - 4}`, class: 'edge meta', style: 'opacity:.9', 'marker-end': 'url(#arrM)' }, gE);
  el('text', { x: t.x - 30, y: t.y + 34, 'font-size': 11, fill: '#6741d9' }, gE).textContent = 'type(type) is type';
  el('text', { x: 840, y: 26, 'font-size': 11, fill: '#6741d9' }, gE).textContent = 'type(object) is type';
  el('text', { x: 850, y: 58, 'font-size': 11, fill: '#495057' }, gE).textContent = 'type успадковує object';
  }

  // екземпляр → клас
  for (const k in INST) {
    if (!instVisible(k)) continue;
    const o = INST[k], p = NODES[o.c];
    el('path', { d: `M${INST_POS[k]},${INST_Y - H / 2} L${p.x + (INST_POS[k] - p.x) * 0.1},${p.y + H / 2 + 2}`, class: 'edge', 'marker-end': 'url(#arr)', 'data-e': `inst-${k}` }, gE);
  }

  // bound method пам'ятає свій об'єкт: bark.__self__ → rex
  for (const k in INST) {
    const o = INST[k]; if (o.c !== 'method' || !instVisible(k)) continue;
    const to = varOf(o.self); if (!to) continue;
    const x1 = INST_POS[k], x2 = INST_POS[to], yb = INST_Y + H / 2 + 12;
    el('path', { d: `M${x1},${yb} Q${(x1 + x2) / 2},${yb + 48} ${x2},${yb + 2}`, class: 'edge', style: 'stroke:#e67700;stroke-dasharray:3 3', 'marker-end': 'url(#arrH)' }, gE);
    el('text', { x: (x1 + x2) / 2 - 22, y: yb + 40, 'font-size': 11, fill: '#e67700' }, gE).textContent = '__self__';
  }
  // вузли-класи
  for (const k in NODES) {
    if (!nodeVisible(k)) continue;
    const n = NODES[k], ww = w(k);
    const cls = CLASSES[k].kind === 'root' ? 'root' : CLASSES[k].kind === 'metan' ? 'metan' : CLASSES[k].kind === 'user' ? 'user' : 'cls';
    const g = el('g', { class: `node ${cls}`, 'data-n': k }, gN);
    el('rect', { x: n.x - ww / 2, y: n.y - H / 2, width: ww, height: H, rx: 7 }, g);
    const tx = el('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle', 'font-weight': 700 }, g); tx.textContent = k;
    clickable(g, `клас ${k}`, () => select({ type: 'cls', key: k }));
  }
  // вузли-екземпляри: назва змінної + коротке значення
  for (const k in INST) {
    if (!instVisible(k)) continue;
    const o = INST[k];
    let val = o.label || (o.dict && o.dict.name ? `${o.c}(${repr(o.dict.name)})` : repr(o));
    // довгий dict / set: перший елемент + «…», щоб дужки лишились видно
    if (val.length > 15 && (o.c === 'dict' || o.c === 'set') && o.v.length > 1) {
      const first = o.c === 'dict' ? `${repr(o.v[0][0])}: ${repr(o.v[0][1])}` : repr(o.v[0]);
      val = `{${first}, …}`;
    }
    if (val.length > 15) val = val.slice(0, 14) + '…';
    const ww = Math.max(64, 14 + 7.4 * Math.max(val.length, k.length));
    const g = el('g', { class: 'node inst', 'data-n': 'i-' + k }, gN);
    el('rect', { x: INST_POS[k] - ww / 2, y: INST_Y - H / 2, width: ww, height: H + 12, rx: 12 }, g);
    el('text', { x: INST_POS[k], y: INST_Y + 1, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13 }, g).textContent = k;
    el('text', { x: INST_POS[k], y: INST_Y + 18, 'text-anchor': 'middle', class: 'mono', 'font-size': 11.5 }, g).textContent = val;
    el('title', {}, g).textContent = `${k} = ${INST_SRC[k]}`;
    clickable(g, `об'єкт ${k}`, () => select({ type: 'inst', key: k }));
  }
  el('text', { x: 8, y: INST_Y + 44, 'font-size': 12, fill: '#868e96' }, gN).textContent = "екземпляри (об'єкти)";
  el('text', { x: 8, y: 106, 'font-size': 12, fill: '#868e96' }, gN).textContent = 'класи';
  markSelected();
}
// вузол схеми: мишка + клавіатура (Tab, Enter / Space) + текстова мітка для екранних читачів
function clickable(g, label, fn) {
  g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', label);
  g.addEventListener('click', fn);
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}
function nodeEl(k) { return svg.querySelector(`[data-n="${k}"]`); }
function clearHL() { svg.querySelectorAll('.node').forEach(n => n.classList.remove('hl', 'found', 'miss')); svg.querySelectorAll('.edge').forEach(e => e.classList.remove('hl')); }
function markSelected() {
  svg.querySelectorAll('.node').forEach(n => n.classList.remove('sel'));
  const k = selected.type === 'cls' ? selected.key : 'i-' + selected.key;
  const n = nodeEl(k); if (n) n.classList.add('sel');
}
function highlightChain(chain, foundIdx, instKey) {
  clearHL();
  chain.forEach((c, i) => {
    const n = nodeEl(c); if (!n) return;
    n.classList.add(i === foundIdx ? 'found' : (foundIdx === -1 || i < foundIdx) ? 'miss' : 'hl');
    if (i < chain.length - 1 && (foundIdx === -1 || i < foundIdx)) { const e = svg.querySelector(`[data-e="inh-${c}-${chain[i + 1]}"]`); if (e) e.classList.add('hl'); }
  });
  if (instKey) { const e = svg.querySelector(`[data-e="inst-${instKey}"]`); if (e) e.classList.add('hl'); }
}
function chainHtml(chain, foundIdx, first) {
  const parts = [];
  if (first) parts.push(`<span class="step miss">${esc(first)}</span>`);
  chain.forEach((c, i) => {
    const st = i === foundIdx ? 'found' : (foundIdx === -1 || i < foundIdx) ? 'miss' : '';
    parts.push(`<span class="step ${st}">${c}</span>`);
  });
  if (foundIdx === -1) parts.push('<span class="step" style="background:#ffe3e3;border-color:#fa5252">AttributeError</span>');
  return `<div class="mro">${parts.join('<span class="arrow">→</span>')}</div>`;
}

/* ===================== Панель «Клас / об'єкт» ===================== */
let showDunder = true;
function select(s) {
  if ((s.type === 'inst' && !instVisible(s.key)) || (s.type === 'cls' && !nodeVisible(s.key))) s = { type: 'inst', key: 'nums' };
  selected = s; markSelected(); clearHL();
  switchTab('details');
  if (s.type === 'cls') renderClass(s.key); else renderInstance(s.key);
}

function methodRows(list, cls, withRun, instKey) {
  return list.filter(({ m }) => showDunder || !m.n.startsWith('__')).map(({ m, where }) => {
    const ov = where === cls ? overrides(cls, m.n) : overrides(where, m.n);
    const canRun = withRun && m.run;
    return `<tr class="${ov ? 'overr' : ''}">
      <td><code>${m.n}</code><span class="muted mono">${esc(m.sig)}</span>${where !== cls ? `<div class="from">з <b>${where}</b></div>` : ''}${ov ? `<div class="from">перевизначає ${ov}.${m.n}</div>` : ''}</td>
      <td>${tag(m.kind)}</td>
      <td>${esc(m.d)}</td>
      ${withRun ? `<td>${canRun ? `<button class="run" data-call="${m.n}">▶ ${esc(callText(instKey, m))}</button>` : '<span class="muted" style="font-size:12px">при створенні</span>'}</td>` : ''}
    </tr>`;
  }).join('');
}
function callText(k, m) {
  const a = exOf(m, INST[k]).map(x => typeof x === 'string' ? (x === 'self' ? k : x) : repr(x));
  if (m.op) return m.op.replace('{s}', k).replace('{args}', a.join(', ')).replace('{a0}', a[0] ?? '').replace('{a1}', a[1] ?? '');
  return `${k}.${m.n}(${a.join(', ')})`;
}
function dunderToggle() {
  return `<label class="chk"><input type="checkbox" id="dunderChk" ${showDunder ? 'checked' : ''}> показувати дандер-методи <code>__...__</code></label>`;
}
function bindDunder(fn) { const c = document.getElementById('dunderChk'); if (c) c.onchange = () => { showDunder = c.checked; fn(); }; }

// Клас — теж об'єкт: картка з двома ланцюжками пошуку (для екземплярів і для самого класу)
function classAsObject(k) {
  const chain = mro(k), inst = Object.keys(INST).find(i => INST[i].c === k) || null;
  const iname = inst || 'obj';
  const ic = lookup(k, '__call__');
  const ownNames = CLASSES[k].methods.map(m => m.n).filter(n => n !== '__new__' && n !== '__call__');
  const sample = [...ownNames.filter(n => !n.startsWith('__')), ...ownNames.filter(n => n.startsWith('__'))].slice(0, 4);
  const typeMeth = CLASSES.type.methods.map(m => m.n).filter(n => n !== '__new__');
  const c = x => `<code>${esc(x)}</code>`;
  const row = (expr, where, res, ok) => `<tr><td>${c(expr)}</td><td>${where}</td><td class="${ok ? 'ok' : 'bad'}">${ok ? '✅' : '❌'} ${res}</td></tr>`;
  const rows = [
    row(`${k}(...)`, `${c(`type(${k})`)} = ${c('type')} → ${c('type.__call__')}`, `створює екземпляр`, true),
    inst ? (ic.m
      ? row(`${inst}(...)`, `${c(`type(${inst})`)} = ${c(k)} → ${c(`${ic.where}.__call__`)}`, 'виконується', true)
      : row(`${inst}()`, `${c(chain.join(' → '))} — ${c('__call__')} немає`, c(`TypeError: '${k}' object is not callable`), false)) : '',
    row(`${k}.mro()`, `у ${c(chain.join(' → '))} немає → ${c('type.mro')}`, c(`[${chain.join(', ')}]`), true),
    inst ? row(`${inst}.mro()`, `${c(chain.join(' → '))} — немає, у ${c('type')} не дивиться`, c('AttributeError'), false) : '',
    row(`${k}.__name__`, c('type'), c(`'${k}'`), true),
    inst ? row(`${inst}.__name__`, `${c(chain.join(' → '))} — немає`, c('AttributeError'), false) : '',
  ].join('');
  const tip = CLASSES[k].kind === 'user' && !ic.m
    ? `Додайте ${c('def __call__(self): ...')} у ${c(k)} — і ${c(`${iname}()`)} запрацює. А ${c(`${k}(...)`)} не зміниться: створення й далі йде через ${c('type.__call__')}.`
    : ic.m ? `Тут працюють обидва виклики: ${c(`${iname}(...)`)} — через ${c(`${ic.where}.__call__`)}, ${c(`${k}(...)`)} — через ${c('type.__call__')}. Це два РІЗНІ ${c('__call__')}.` : '';
  return `
  <div class="ocard">
    <div class="ocard-head">🪪 Картка: клас ${c(k)} — теж об'єкт <span>два ланцюжки пошуку</span></div>
    <div class="ocard-body">
      <table class="ocard-facts">
        <tr><th>Хто він?</th><td>клас — креслення для ${inst ? c(inst) : 'екземплярів'}; але й сам об'єкт у пам'яті</td></tr>
        <tr><th>Його клас<br>${c(`type(${k})`)}</th><td>${c('type')} — ✔ ${c(`isinstance(${k}, type)`)} → ${c('True')} <span class="muted">(суцільна стрілка на схемі)</span></td></tr>
        <tr><th>Його батьки<br>${c(`${k}.__bases__`)}</th><td>${c(`(${CLASSES[k].bases.map(x => x + ',').join(' ')})`)} — ✘ ${c('type')} серед батьків НЕМАЄ: ${c(`issubclass(${k}, type)`)} → ${c('False')}</td></tr>
        <tr><th>Звідки методи?</th><td>для будь-якого об'єкта Python шукає в <b>його класі</b>: для ${c(iname)} це ${c(k)}, для самого ${c(k)} — ${c('type')}</td></tr>
      </table>
      <div class="ocard-two">
        <div class="ocard-mini">
          <div class="mini-title">📦 Екземпляр ${c(iname)}</div>
          <div class="mini-q">шукає в ${c(`type(${iname}).__mro__`)}</div>
          ${chainHtml(chain, -2)}
          <div class="mini-q">знаходить: ${sample.map(c).join(', ')}${sample.length ? ', …' : ''}</div>
          <div class="mini-call ${ic.m ? 'ok' : 'bad'}">${c('__call__')} ${ic.m ? `✔ є в ${c(ic.where)} → ${c(`${iname}(...)`)} працює` : `✘ немає → ${c(`${iname}()`)} не працює`}</div>
        </div>
        <div class="ocard-mini meta">
          <div class="mini-title">🏭 Сам клас ${c(k)}</div>
          <div class="mini-q">шукає в ${c(`type(${k}).__mro__`)}</div>
          ${chainHtml(['type', 'object'], -2)}
          <div class="mini-q">знаходить: ${typeMeth.map(c).join(', ')}</div>
          <div class="mini-call ok">${c('__call__')} ✔ є в ${c('type')} → ${c(`${k}(...)`)} працює</div>
        </div>
      </div>
      <table class="ocard-calls"><tr><th>вираз</th><th>де Python шукає</th><th>результат</th></tr>${rows}</table>
      ${callRule(k, inst, chain, ic, tip)}
    </div>
  </div>`;
}
// Правило виклику X(...) — розгорнуте пояснення + порівняння «клас / екземпляр» + питання
function callRule(k, inst, chain, ic, tip) {
  const c = x => `<code>${esc(x)}</code>`;
  const iname = inst || 'obj';
  const yes = '✅', no = '❌';
  const cmp = [
    ['Що це?', 'клас', `екземпляр ${c(k)}`],
    ['type(...)', c('type'), c(k)],
    ['Де Python шукає __call__?', c('type → object'), c(chain.join(' → '))],
    ['Чи є там __call__?', `${yes} ${c('type.__call__')}`, ic.m ? `${yes} ${c(ic.where + '.__call__')}` : `${no} немає`],
    ['Можна викликати (...)?', `${yes} ${c(k + '(...)')}`, ic.m ? `${yes} ${c(iname + '(...)')}` : `${no} ${c(iname + '()')} → ${c('TypeError')}`],
    ['callable(...)', c('True'), c(ic.m ? 'True' : 'False')],
  ].map(([q, a1, a2]) => `<tr><th>${q.includes('__call__') || q.startsWith('type') || q.startsWith('callable') ? q.replace(/(__call__|type\(\.\.\.\)|callable\(\.\.\.\))/, m => c(m)) : q}</th><td>${a1}</td><td>${a2}</td></tr>`).join('');
  const opts = [
    { t: `Так, адже ${c(k)} — клас`, ok: false },
    { t: ic.m ? `Так, бо в ${c(ic.where)} є ${c('__call__')}` : `Ні, бо в ${c(chain.join(' → '))} немає ${c('__call__')}`, ok: true },
    { t: `Так, адже ${c(`type(${k})`)} — це ${c('type')}`, ok: false },
  ];
  const why = ic.m
    ? `Правильно: ${c(iname + '(...)')} → Python дивиться в ${c(`type(${iname})`)} = ${c(k)} і знаходить ${c(ic.where + '.__call__')}.`
    : `Правильно: ${c(iname + '()')} → Python дивиться в ${c(`type(${iname})`)} = ${c(k)} → ${c(chain.join(' → '))}. ${c('__call__')} немає → ${c(`TypeError: '${k}' object is not callable`)}.`;
  const wrong = `Ні. Це правда про виклик <b>класу</b> ${c(k + '(...)')}: його клас — ${c('type')}. Але викликаємо ${c(iname)}, а клас ${c(iname)} — ${c(k)}, тож Python дивиться в ${c(k)}, а не в ${c('type')}.`;
  return `
      <div class="ocard-rule">
        <div class="rule-title">📌 Правило виклику ${c('X(...)')}</div>
        <p>Python питає <b>не сам</b> ${c('X')}, а <b>його клас</b>: «Ти вмієш викликати такі об'єкти?» Тобто він шукає ${c('__call__')} у ${c('type(X)')}.</p>
        <ol class="rule-steps">
          <li>взяти клас об'єкта: ${c('type(X)')};</li>
          <li>шукати ${c('__call__')} по ${c('type(X).__mro__')} — у ${c('X.__dict__')} Python <b>не</b> дивиться;</li>
          <li>знайшов → ${c('type(X).__call__(X, ...)')}; не знайшов → ${c("TypeError: '...' object is not callable")}.</li>
        </ol>
        <table class="rule-cmp"><tr><th></th><th>${c(k)}</th><th>${c(iname)}</th></tr>${cmp}</table>
        <p class="muted" style="margin:6px 0 0">Не важливо, що таке ${c('X')} — клас, функція чи звичайний об'єкт. Важливо, чи вміє викликати <b>його клас</b>. ${c('callable(X)')} перевіряє це без виклику.</p>
        ${tip ? `<p style="margin:6px 0 0">${tip}</p>` : ''}
      </div>
      ${inst ? `<div class="quiz" data-why="${esc(why)}" data-wrong="${esc(wrong)}">
        <b>🤔 Перевір себе:</b> чи спрацює ${c(iname + (ic.m ? '(...)' : '()'))}?
        <div class="quiz-opts">${opts.map(o => `<button class="run" data-ok="${o.ok ? 1 : 0}">${o.t}</button>`).join('')}</div>
        <div class="quiz-out"></div>
      </div>` : ''}`;
}
function bindQuiz() {
  document.querySelectorAll('.quiz').forEach(q => q.querySelectorAll('button').forEach(b => b.onclick = () => {
    const ok = b.dataset.ok === '1';
    q.querySelectorAll('button').forEach(x => x.classList.remove('picked-ok', 'picked-bad'));
    b.classList.add(ok ? 'picked-ok' : 'picked-bad');
    q.querySelector('.quiz-out').innerHTML = (ok ? '✅ ' : '❌ ') + (ok ? q.dataset.why : q.dataset.wrong);
  }));
}
// підказка на Beginner: тут є глибший рівень
function advTeaser(question) {
  return `<div class="lvl-note">🔴 <b>Advanced:</b> ${question} <button class="run" data-go-adv>Показати на рівні Advanced →</button></div>`;
}
function bindAdv() { document.querySelectorAll('[data-go-adv]').forEach(b => b.onclick = () => setLevel('advanced')); }
function renderClass(k) {
  const C = CLASSES[k], chain = mro(k);
  highlightChain(chain, -2);
  const ownList = C.methods.map(m => ({ m, where: k }));
  const inh = allMethods(k).filter(x => x.where !== k);
  const groups = {}; inh.forEach(x => (groups[x.where] = groups[x.where] || []).push(x));
  const insts = Object.keys(INST).filter(i => mro(INST[i].c).includes(k));
  document.getElementById('details').innerHTML = `
    <h2>Клас <code>${k}</code></h2>
    <p>${esc(C.about)}</p>
    ${C.code ? `<pre class="console">${esc(C.code)}</pre>` : ''}
    ${C.kind === 'user' && ADV() ? `<p class="muted">Методи в <code>${k}.__dict__</code> — звичайні функції: <code>type(${k}.__dict__['${C.methods[C.methods.length - 1].n}'])</code> → <code>function</code>. Коли пишете <code>rex.${C.methods[C.methods.length - 1].n}</code>, Python викликає <code>function.__get__</code> і створює bound method — клікніть об'єкт <code>bark</code> на схемі.</p>` : ''}
    <table style="max-width:640px">
      <tr class="adv-only"><td><code>type(${k})</code></td><td><code>&lt;class 'type'&gt;</code> — клас теж є об'єктом, його створив метаклас <code>type</code></td></tr>
      <tr><td>батьки <code>${k}.__bases__</code></td><td><code>(${C.bases.map(b => b + ',').join(' ')})</code></td></tr>
      <tr><td>звідки беруться методи<br><code>${k}.__mro__</code></td><td>${chainHtml(chain, -2)}</td></tr>
      <tr><td>екземпляри на схемі</td><td>${insts.length ? insts.map(i => `<span class="chip">${i}</span>`).join('') + (k !== INST[insts[0]].c && insts.some(i => INST[i].c !== k) ? ' <span class="muted">(isinstance — True і для підкласів)</span>' : '') : '<span class="muted">— (це метаклас: його екземпляри — самі класи)</span>'}</td></tr>
    </table>
    ${k === 'type' ? '' : ADV() ? classAsObject(k) : advTeaser(`Чому <code>${k}(...)</code> можна викликати, а його екземпляр — ні? Чому <code>${k}.mro()</code> працює, а <code>obj.mro()</code> — ні?`)}
    <div class="row" style="margin-top:10px">${dunderToggle()}</div>
    <h3>Власні методи — лежать у <code>${k}.__dict__</code> (${C.methods.filter(m => showDunder || !m.n.startsWith('__')).length})</h3>
    <table><tr><th>метод</th><th>дія</th><th>що робить з об'єктом</th></tr>${methodRows(ownList, k, false)}</table>
    ${Object.keys(groups).map(g => `<h3>Успадковані від <code>${g}</code> (${groups[g].filter(x => showDunder || !x.m.n.startsWith('__')).length})</h3>
      <table><tr><th>метод</th><th>дія</th><th>що робить з об'єктом</th></tr>${methodRows(groups[g], k, false)}</table>`).join('')}
  `;
  bindDunder(() => renderClass(k));
  bindQuiz(); bindAdv();
}

let lastLog = '';
function renderInstance(k) {
  const o = INST[k], chain = mro(o.c);
  const list = allMethods(o.c);
  const counts = {}; list.forEach(x => counts[x.where] = (counts[x.where] || 0) + 1);
  const dictRow = o.dict
    ? `<code>${k}.__dict__</code></td><td><code>{${Object.entries(o.dict).map(([a, v]) => `'${a}': ${esc(repr(v))}`).join(', ')}}</code> — власні атрибути екземпляра`
    : `<code>${k}.__dict__</code></td><td><span class="muted">немає — у вбудованих типів атрибути екземпляра не зберігаються, лише значення${o.c === 'dict' ? `. Не плутайте: ${k} сам є словником (його пари — це дані), але <code>${k}.__dict__</code> — простір імен атрибутів, якого в dict немає` : ''}</span>`;
  document.getElementById('details').innerHTML = `
    <h2>Об'єкт <code>${esc(INST_HDR[k] || `${k} = ${INST_SRC[k]}`)}</code></h2>
    <div class="grid2">
      <div>
        <table>
          <tr><td>поточне значення</td><td><span class="objstate">${esc(repr(o))}</span></td></tr>
          <tr><td><code>type(${k})</code> / <code>${k}.__class__</code></td><td><code>${o.c}</code></td></tr>
          <tr class="adv-only"><td><code>id(${k})</code></td><td><code>${o.id}</code> <span class="muted">— умовний id у симуляції. У CPython id — це адреса об'єкта в пам'яті; тут важливо лише, змінюється він чи ні</span></td></tr>
          <tr><td>${dictRow}</td></tr>
          <tr><td>де шукати методи</td><td>${chainHtml(chain, -2, k + '.__dict__')}</td></tr>
          <tr><td>доступно методів</td><td>${Object.entries(counts).map(([c, n]) => `<span class="chip ${c === o.c ? 'own' : ''}">${c}: ${n}</span>`).join('')}</td></tr>
        </table>
      </div>
      <div>
        <b>Знайти будь-який атрибут або метод</b>
        <div class="row" style="margin:6px 0">
          <code>${k}.</code><input type="text" id="lookName" list="allNames" placeholder="append, upper, speak..." size="16">
          <button class="btn" id="lookBtn">Шукати</button>
        </div>
        <datalist id="allNames">${[...new Set(Object.values(CLASSES).flatMap(c => c.methods.map(m => m.n)))].map(n => `<option value="${n}">`).join('')}</datalist>
        <div class="muted" style="font-size:13px">Спробуйте <code>append</code> для <code>point</code> чи <code>tags</code>, або <code>speak</code> для <code>rex</code> і <code>cat</code>.</div>
        <div id="lookOut"></div>
        <div class="console" id="log">${lastLog || '<span class="c"># натисніть ▶ біля методу нижче — тут з\'явиться результат</span>'}</div>
      </div>
    </div>
    <div class="row" style="margin-top:10px">${dunderToggle()}</div>
    <h3>Вибрані методи об'єкта <code>${k}</code> <span class="muted" style="font-weight:400;font-size:13px">— не повний список; усі імена покаже <code>dir(${k})</code></span></h3>
    <table><tr><th>метод (де знайдено)</th><th>дія</th><th>що робить з об'єктом</th><th>спробувати</th></tr>${methodRows(list, o.c, true, k)}</table>
  `;
  bindDunder(() => renderInstance(k));
  bindAdv();
  document.querySelectorAll('[data-call]').forEach(b => b.onclick = () => runMethod(k, b.dataset.call));
  const doLook = () => lookName(k, document.getElementById('lookName').value.trim());
  document.getElementById('lookBtn').onclick = doLook;
  document.getElementById('lookName').onkeydown = e => { if (e.key === 'Enter') doLook(); };
}

function lookName(k, name) {
  if (!name) return;
  const o = INST[k];
  const inDict = !!o.dict && Object.hasOwn(o.dict, name);   // лише власні ключі: без JS-властивостей на кшталт toString
  const r = lookup(o.c, name);
  const out = document.getElementById('lookOut');
  const simpl = `<p class="adv-only adv-small">⚠️ Спрощено. Справжній порядок для <code>${k}.${esc(name)}</code>: 1) <b>дескриптори даних</b> у класі (наприклад <code>@property</code>) — вони перемагають навіть <code>${k}.__dict__</code>; 2) <code>${k}.__dict__</code>; 3) решта атрибутів класу за MRO. Дескриптори — урок 24.</p>`;
  if (inDict) {
    clearHL(); nodeEl('i-' + k).classList.add('found');
    out.innerHTML = `${chainHtml([], -2, '')}<p>✅ Знайдено одразу в <code>${k}.__dict__</code>: <code>${k}.${name} = ${esc(repr(o.dict[name]))}</code> — це атрибут екземпляра, у класи Python навіть не дивився (якщо в класі немає property з такою назвою).</p>${simpl}`;
    return;
  }
  highlightChain(r.chain, r.idx, k);
  const first = k + '.__dict__';
  if (!r.m) {
    out.innerHTML = `${chainHtml(r.chain, -1, first)}<p>❌ <code>AttributeError: '${o.c}' object has no attribute '${esc(name)}'</code><br>
      Python перевірив усі класи з MRO і не знайшов <code>${esc(name)}</code>.${own('type', name) ? `<br>💡 <code>${esc(name)}</code> є в <code>type</code> — це метод <b>класу як об'єкта</b>: <code>${o.c}.${esc(name)}</code> працює, бо <code>type(${o.c}) is type</code>. Але <code>${k}</code> — екземпляр <code>${o.c}</code>, а не <code>type</code>, тож шукає лише в <code>${mro(o.c).join(' → ')}</code>.${name === '__call__' ? ` Тому <code>${o.c}(...)</code> працює, а <code>${k}()</code> → <code>TypeError: '${o.c}' object is not callable</code>.` : ''}` : ''}${o.c === 'tuple' && ['append', 'sort', 'pop', 'remove', 'insert', 'extend', 'clear', 'reverse'].includes(name) ? ' Кортеж незмінний — методів, що змінюють його, просто немає.' : ''}${o.c === 'str' && ['append', 'sort'].includes(name) ? ' Рядок незмінний.' : ''}${o.c === 'set' && ['__getitem__', '__setitem__', 'append', 'index', 'sort', 'insert'].includes(name) ? ` Множина не має порядку й індексів: ${k}[0] → <code>TypeError: 'set' object is not subscriptable</code>. Додавати — <code>add</code>, перебирати — <code>for x in ${k}</code>.` : ''}${o.c === 'dict' && ['append', 'insert', 'extend', 'add', 'index', 'sort'].includes(name) ? ` У словнику немає позицій — є ключі. Додати пару: <code>${k}[key] = value</code> або <code>update</code>.` : ''}</p>${simpl}`;
    return;
  }
  out.innerHTML = `${chainHtml(r.chain, r.idx, first)}
    <p>✅ Знайдено в <code>${r.where}.__dict__</code> ${tag(r.m.kind)} ${r.where !== o.c ? `— метод <b>успадковано</b> від <code>${r.where}</code>` : '— власний метод класу'}.<br>${esc(r.m.d)}</p>
    ${r.m.run ? `<button class="run" id="lookRun">▶ ${esc(callText(k, r.m))}</button>` : ''}${simpl}`;
  const b = document.getElementById('lookRun'); if (b) b.onclick = () => runMethod(k, name);
}

function runMethod(k, name) {
  const o = INST[k];
  const r = lookup(o.c, name);
  const before = stateOf(o), idBefore = o.id;
  const ctx = { notes: [] };
  const lines = [];
  const code = callText(k, r.m);
  lines.push(`<span class="k">&gt;&gt;&gt; ${esc(code)}</span>`);
  lines.push(`<span class="c"># Python шукає ${name}: ${[k + '.__dict__', ...r.chain.slice(0, r.idx + 1)].join(' → ')}  ✔ знайдено в ${r.where}</span>`);
  lines.push(r.m.sig.startsWith(':')
    ? `<span class="c"># це атрибут: значення бере дескриптор ${r.where}.__dict__['${name}'] для об'єкта ${k}</span>`
    : `<span class="c"># фактично виконується: ${esc(`${r.where}.${name}(${[k, ...exOf(r.m, o).map(x => typeof x === 'string' ? (x === 'self' ? k : x) : repr(x))].join(', ')})`)}</span>`);
  try {
    const res = callMethod(o, name, exOf(r.m, o).map(x => typeof x === 'string' ? (x === 'self' ? x : INST[x]) : clone(x)), ctx);
    ctx.notes.forEach(nt => lines.push(`<span class="c"># ${esc(nt)}</span>`));
    if (res.ret.c !== 'NoneType' || r.m.kind !== 'mut') lines.push(`<span class="ok">${esc(repr(res.ret))}</span>${res.ret.c === 'NoneType' ? '' : `   <span class="c"># тип результату: ${res.ret.tn || res.ret.c}</span>`}`);
    else lines.push(`<span class="c"># повернуто None — тому консоль нічого не показує</span>`);
    const after = stateOf(o);
    if (after !== before) {
      lines.push(`<span class="w"># ${k} ЗМІНИВСЯ: ${esc(before)}  →  ${esc(after)}</span>`);
      lines.push(`<span class="w"># id(${k}) той самий (${idBefore}) — це той самий об'єкт, змінено його вміст</span>`);
    } else if (r.m.kind === 'new') {
      lines.push(`<span class="c"># ${k} не змінився: ${esc(after)} — результат є НОВИМ об'єктом</span>`);
    } else {
      lines.push(`<span class="c"># ${k} не змінився: ${esc(after)}</span>`);
    }
  } catch (e) {
    if (!(e instanceof PyError)) throw e;
    lines.push(`<span class="err">${e.kind}: ${esc(e.message)}</span>`);
  }
  lastLog = lines.join('\n');
  drawMap();
  renderInstance(k);
  highlightChain(r.chain, r.idx, k);
  document.getElementById('log').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ===================== Вкладка «Створення об'єкта» ===================== */
const PRESETS = [
  { code: "rex2 = Dog('Бобік')", cls: 'Dog', empty: true, afterNew: () => '<__main__.Dog object>  __dict__ = {}', afterInit: () => "__dict__ = {'name': 'Бобік'}",
    initNote: "Animal.__init__(rex2, 'Бобік') виконує self.name = 'Бобік'" },
  { code: "nums2 = list((540, 320))", cls: 'list', empty: true, afterNew: () => '[]', afterInit: () => '[540, 320]',
    newNote: 'list.__new__ створює ПОРОЖНІЙ список', initNote: 'list.__init__ заповнює список елементами з (540, 320)' },
  { code: "point2 = tuple([540, 320])", cls: 'tuple', afterNew: () => '(540, 320)', afterInit: () => '(540, 320)',
    newNote: 'tuple.__new__ створює кортеж ОДРАЗУ з елементами — потім змінити буде неможливо', initNote: 'object.__init__ нічого не робить: у tuple власного __init__ немає' },
  { code: "menu2 = dict([('кава', 45), ('чай', 30)])", cls: 'dict', empty: true, afterNew: () => '{}', afterInit: () => "{'кава': 45, 'чай': 30}",
    newNote: 'dict.__new__ створює ПОРОЖНІЙ словник', initNote: "dict.__init__ додає пари з [('кава', 45), ('чай', 30)]: перший елемент кожної пари — ключ, другий — значення" },
  { code: "tags2 = set(['кава', 'кава', 'чай'])", cls: 'set', empty: true, afterNew: () => 'set()', afterInit: () => "{'кава', 'чай'}",
    newNote: 'set.__new__ створює ПОРОЖНЮ множину set()', initNote: "set.__init__ додає елементи з ['кава', 'кава', 'чай']; другий 'кава' — дублікат, його відкинуто" },
  { code: "n2 = int('540')", cls: 'int', afterNew: () => '540', afterInit: () => '540',
    newNote: "int.__new__ перетворює рядок '540' на число 540", initNote: 'object.__init__ нічого не робить: число вже готове' },
  { code: "s2 = str(540)", cls: 'str', afterNew: () => "'540'", afterInit: () => "'540'",
    newNote: "str.__new__ викликає (540).__str__() і створює рядок", initNote: 'object.__init__ нічого не робить' },
  { code: "flag2 = bool(0)", cls: 'bool', afterNew: () => 'False', afterInit: () => 'False',
    newNote: 'bool.__new__ перевіряє істинність 0 і повертає готовий об\'єкт False', initNote: 'object.__init__ нічого не робить' },
];
/* ===================== Як створюються функції і методи =====================
   Кожен приклад має свої кроки для Beginner і Advanced. hl — вузли схеми, які підсвітити. */
const cc = x => `<code>${esc(x)}</code>`;
const pre = x => `<pre class="console">${esc(x)}</pre>`;
const FN_PRESETS = [
  {
    code: 'def apply_discount(bill, percent=10)', group: 'fn',
    beginner: [
      { t: '1. Рядок def', hl: ['function'], html: `${pre("def apply_discount(bill, percent=10):\n    \"\"\"Знижка на чек.\"\"\"\n    return round(bill * (1 - percent / 100), 2)")}
        <p>Коли Python доходить до ${cc('def')}, <b>тіло функції ще НЕ виконується</b>. Python лише створює <b>об'єкт-функцію</b> і вішає на нього ярлик ${cc('apply_discount')}.</p>
        <p>${cc('type(apply_discount)')} → ${cc("<class 'function'>")}: функція — такий самий об'єкт, як ${cc('540')} чи ${cc('[1, 2]')}.</p>` },
      { t: '2. Виклик', hl: ['function'], html: `${pre("apply_discount(540.0)   # 486.0")}
        <p>Тільки тепер виконується тіло. Python створює <b>нові локальні змінні</b> ${cc('bill = 540.0')}, ${cc('percent = 10')} (значення за замовчуванням), рахує результат і повертає його через ${cc('return')}. Після ${cc('return')} локальні змінні зникають.</p>` },
      { t: '3. Функція — об\'єкт', hl: ['function'], html: `${pre("d = apply_discount          # ще один ярлик на ту саму функцію\nrules = [apply_discount]    # функцію можна покласти в список\nprint(d(980.0))             # 882.0\nprint(d is apply_discount)  # True")}
        <p>Функцію можна присвоїти, покласти в список чи словник і передати в іншу функцію (урок 19). Дужки ${cc('()')} означають «виконати»; без дужок це просто об'єкт.</p>` },
    ],
    advanced: [
      { t: '1. Компіляція', hl: ['function'], html: `<p>Ще до виконання Python компілює тіло в <b>об'єкт коду</b> — байткод, імена змінних, константи. Він лежить у ${cc('apply_discount.__code__')}:</p>
        ${pre("apply_discount.__code__.co_varnames   # ('bill', 'percent')")}<p>Об'єкт коду — лише «рецепт». Він не знає ні значень за замовчуванням, ні глобальних змінних.</p>` },
      { t: '2. def = створення function', hl: ['function', 'object'], html: `<p>Виконання рядка ${cc('def')} — це створення об'єкта класу ${cc('function')} (через ${cc('function.__new__')}) з кількох частин:</p>
        <table style="max-width:700px">
          <tr><td>${cc('__code__')}</td><td>об'єкт коду з кроку 1</td></tr>
          <tr><td>${cc('__globals__')}</td><td>простір імен модуля — звідси функція бере глобальні імена</td></tr>
          <tr><td>${cc('__defaults__')}</td><td>${cc('(10,)')} — <b>обчислюється зараз, один раз</b>. Звідси пастка ${cc('def f(x, items=[])')}</td></tr>
          <tr><td>${cc('__name__')}, ${cc('__qualname__')}, ${cc('__doc__')}</td><td>${cc("'apply_discount'")}, ${cc("'Знижка на чек.'")}</td></tr>
          <tr><td>${cc('__dict__')}</td><td>${cc('{}')} — у функції є власні атрибути: ${cc('apply_discount.calls = 0')}</td></tr>
        </table>
        <p>Потім ім'я ${cc('apply_discount')} записується в глобальний простір імен модуля.</p>` },
      { t: '3. Виклик = __call__', hl: ['function'], html: `${pre("apply_discount(540.0)\n# ≈ type(apply_discount).__call__(apply_discount, 540.0)\n# = function.__call__(...)")}
        <p>Правило виклику: ${cc('__call__')} шукається в ${cc('type(apply_discount)')} = ${cc('function')}. Він створює <b>кадр виконання</b> (frame) з локальними змінними, бере ${cc('percent')} з ${cc('__defaults__')} і виконує ${cc('__code__')}.</p>` },
      { t: '4. Що лежить в об\'єкті', hl: ['function'], html: `${pre("print(apply_discount.__defaults__)    # (10,)\nprint(apply_discount.__globals__ is globals())  # True\napply_discount.calls = 0\nprint(apply_discount.__dict__)        # {'calls': 0}")}
        <p>Клікніть об'єкт ${cc('apply_discount')} на схемі, щоб викликати ці атрибути наживо.</p>` },
    ],
  },
  {
    code: 'half = lambda bill: bill * 0.9', group: 'fn',
    beginner: [
      { t: '1. Вираз lambda', hl: ['function'], html: `${pre("half = lambda bill: bill * 0.9\nprint(half(540))     # 486.0")}
        <p>${cc('lambda')} — короткий спосіб створити функцію <b>в одному виразі</b>. Результат — той самий об'єкт ${cc('function')}, що й від ${cc('def')}.</p>` },
      { t: '2. Чим відрізняється від def', hl: ['function'], html: `<table style="max-width:640px">
          <tr><th></th><th>${cc('def')}</th><th>${cc('lambda')}</th></tr>
          <tr><td>що це</td><td>оператор</td><td>вираз — можна писати прямо в аргументі</td></tr>
          <tr><td>тіло</td><td>скільки завгодно рядків</td><td>один вираз, без ${cc('return')}</td></tr>
          <tr><td>${cc('__name__')}</td><td>${cc("'apply_discount'")}</td><td>${cc("'<lambda>'")}</td></tr>
          <tr><td>${cc('type(...)')}</td><td colspan="2">${cc('function')} — однаковий</td></tr>
        </table>
        <p>Типове місце для lambda — аргумент: ${cc('sorted(orders, key=lambda o: o.bill)')}.</p>` },
    ],
    advanced: [
      { t: '1. Той самий механізм', hl: ['function'], html: `<p>${cc('lambda')} компілюється в об'єкт коду і створює ${cc('function')} так само, як ${cc('def')}: є ${cc('__code__')}, ${cc('__globals__')}, ${cc('__defaults__')}. Різниця лише в синтаксисі й імені ${cc("'<lambda>'")}.</p>
        ${pre("half = lambda bill, k=0.9: bill * k\nprint(type(half), half.__name__, half.__defaults__)\n# <class 'function'> <lambda> (0.9,)")}` },
      { t: '2. Пастка пізнього зв\'язування', hl: ['function'], html: `${pre("fs = [lambda: i for i in range(3)]\nprint([f() for f in fs])          # [2, 2, 2]\nfs = [lambda i=i: i for i in range(3)]\nprint([f() for f in fs])          # [0, 1, 2]")}
        <p>Тіло лямбди читає ${cc('i')} <b>у момент виклику</b>, коли цикл уже закінчився. ${cc('i=i')} фіксує значення в ${cc('__defaults__')} у момент створення.</p>` },
    ],
  },
  {
    code: 'next_id = make_counter()   # замикання', group: 'fn',
    beginner: [
      { t: '1. Фабрика', hl: ['function'], html: `${pre("def make_counter():\n    count = 0\n    def next_id():\n        nonlocal count\n        count += 1\n        return count\n    return next_id")}
        <p>${cc('def make_counter')} створює функцію-фабрику. Її тіло поки не виконувалось.</p>` },
      { t: '2. Виклик фабрики', hl: ['function'], html: `${pre("next_id = make_counter()")}
        <p>Тепер тіло виконується: ${cc('count = 0')}, потім ${cc('def next_id')} створює <b>нову функцію всередині</b>, і ${cc('return')} віддає її назовні. ${cc('make_counter')} завершилась, але ${cc('count')} не зник: його <b>пам'ятає</b> ${cc('next_id')}.</p>` },
      { t: '3. Своя пам\'ять у кожної', hl: ['function'], html: `${pre("a = make_counter()\nb = make_counter()\nprint(a(), a(), b())   # 1 2 1\nprint(a is b)          # False — дві різні функції")}
        <p>Кожен виклик ${cc('make_counter()')} створює <b>нову</b> функцію зі <b>своїм</b> ${cc('count')}. Так функція тримає стан — як об'єкт класу, тільки без класу (урок 19 → урок 20).</p>` },
    ],
    advanced: [
      { t: '1. Комірки (cells)', hl: ['function'], html: `<p>Компілятор бачить, що ${cc('count')} використовується у вкладеній функції, і робить його <b>вільною змінною</b>: ${cc("next_id.__code__.co_freevars == ('count',)")}. Значення живе в об'єкті-комірці (cell), а не в кадрі ${cc('make_counter')}.</p>` },
      { t: '2. Один код — різні замикання', hl: ['function'], html: `${pre("a, b = make_counter(), make_counter()\na(); a()\nprint(a is b)                          # False\nprint(a.__code__ is b.__code__)        # True — рецепт спільний\nprint(a.__closure__[0].cell_contents)  # 2\nprint(b.__closure__[0].cell_contents)  # 0\nprint(a.__qualname__)                  # make_counter.<locals>.next_id")}
        <p>Кожен ${cc('def next_id')} під час виклику створює новий ${cc('function')} з тим самим ${cc('__code__')}, але своїм ${cc('__closure__')}.</p>` },
      { t: '3. nonlocal', hl: ['function'], html: `<p>Без ${cc('nonlocal count')} рядок ${cc('count += 1')} зробив би ${cc('count')} <b>локальною</b> змінною ${cc('next_id')} → ${cc('UnboundLocalError')}. ${cc('nonlocal')} каже: пиши в комірку замикання.</p>
        <p>Клікніть ${cc('next_id')} на схемі й викличте його кілька разів: стан ${cc('замикання: count')} змінюється, а ${cc('id')} — ні.</p>` },
    ],
  },
  {
    code: "class Dog: def speak(self)   # метод у класі", group: 'method',
    beginner: [
      { t: '1. Тіло класу', hl: ['Dog'], html: `${pre("class Dog(Animal):\n    def speak(self):\n        return 'Гав!'")}
        <p>Тіло класу виконується <b>один раз</b>, коли Python читає ${cc('class')}. Рядок ${cc('def speak')} там працює як завжди: створює <b>звичайну функцію</b>.</p>` },
      { t: '2. Функція кладеться в клас', hl: ['Dog'], html: `${pre("print(type(Dog.__dict__['speak']))   # <class 'function'>\nprint(Dog.speak(rex))                # Гав! — self передали самі")}
        <p>Функція потрапляє в простір імен класу ${cc("Dog.__dict__['speak']")}. <b>Метод — це функція, що лежить у класі.</b> ${cc('self')} — звичайний перший параметр, і через клас його треба передати самому.</p>` },
      { t: '3. Виклик через об\'єкт', hl: ['Dog'], html: `${pre("rex = Dog('Рекс')\nrex.speak()     # Гав!\n# Python робить: Dog.speak(rex)")}
        <p>Через об'єкт ${cc('self')} підставляється <b>автоматично</b>: Python знаходить ${cc('speak')} у ${cc('Dog')} і передає ${cc('rex')} першим аргументом. Один метод на всіх собак — різні ${cc('self')}.</p>
        ${advTeaser(`Як саме ${cc('rex.speak')} «пам'ятає» ${cc('rex')}? Що таке bound method?`)}` },
    ],
    advanced: [
      { t: '1. Простір імен класу', hl: ['Dog', 'type'], html: `<p>Python виконує тіло класу в окремому словнику ${cc('ns')}. Кожен ${cc('def')} додає туди функцію. Потім клас створює метаклас:</p>
        ${pre("ns = {'speak': <function speak>}\nDog = type('Dog', (Animal,), ns)   # type.__new__ + type.__init__")}
        <p>Тобто ${cc('class Dog(Animal): ...')} ≈ виклик ${cc('type')}. Тому ${cc('type(Dog) is type')}.</p>` },
      { t: '2. Через клас — та сама функція', hl: ['Dog'], html: `${pre("print(Dog.speak is Dog.__dict__['speak'])   # True\nprint(Dog.speak)            # <function Dog.speak at 0x...>")}
        <p>Звернення через <b>клас</b> віддає саму функцію (у Python 3 «unbound method» не існує). ${cc('__qualname__')} = ${cc("'Dog.speak'")}.</p>` },
      { t: '3. Функція — дескриптор', hl: ['Dog', 'function'], html: `<p>У класу ${cc('function')} є метод ${cc('__get__')}, тобто функція — <b>дескриптор</b>. Саме тому через об'єкт вона перетворюється на метод. Далі — приклад «${cc('bark = rex.speak')}».</p>` },
    ],
  },
  {
    code: 'bark = rex.speak   # bound method', group: 'method', adv: true,
    beginner: [
      { t: '1. Метод без дужок', hl: ['Dog'], html: `${pre("bark = rex.speak   # дужок немає — метод ще НЕ викликано\nprint(bark())      # Гав!")}
        <p>${cc('rex.speak')} без дужок — це метод, <b>уже прив'язаний</b> до ${cc('rex')}. Його можна зберегти й викликати пізніше: ${cc('self')} він пам'ятає.</p>
        ${advTeaser('Детальний механізм — на рівні Advanced.')}` },
    ],
    advanced: [
      { t: '1. Пошук', hl: ['Dog'], html: `<p>${cc('rex.speak')}: у ${cc('rex.__dict__')} немає → знайдено ${cc("Dog.__dict__['speak']")} — звичайна функція.</p>` },
      { t: '2. __get__ прив\'язує', hl: ['Dog', 'function', 'method'], html: `${pre("f = Dog.__dict__['speak']\nbark = f.__get__(rex, Dog)   # саме це робить rex.speak\nprint(bark)                  # <bound method Dog.speak of <__main__.Dog object ...>>")}
        <p>Функція має ${cc('__get__')}, тому Python не повертає її як є, а викликає ${cc('function.__get__(rex, Dog)')}. Результат — новий об'єкт класу ${cc('method')}.</p>` },
      { t: '3. Що всередині method', hl: ['method'], html: `${pre("print(bark.__func__ is Dog.speak)  # True — яка функція\nprint(bark.__self__ is rex)        # True — до кого прив'язано\nbark()   # = bark.__func__(bark.__self__) = Dog.speak(rex)")}
        <p>Ось звідки ${cc('self')}: ${cc('method.__call__')} підставляє ${cc('__self__')} першим аргументом.</p>` },
      { t: '4. Щоразу новий', hl: ['method'], html: `${pre("print(rex.speak is rex.speak)   # False — кожне звернення створює новий method\nprint(rex.speak == rex.speak)   # True  — та сама функція + той самий об'єкт\nprint('speak' in rex.__dict__)  # False — в екземплярі методів немає")}
        <p>Клікніть ${cc('bark')} на схемі: видно стрілку ${cc('__self__ → rex')}, і можна викликати ${cc('__func__')}, ${cc('__self__')}, ${cc('__eq__')}.</p>` },
    ],
  },
  {
    code: '@classmethod / @staticmethod', group: 'method',
    beginner: [
      { t: '1. Три види методів', hl: [], html: `${pre("class Order:\n    def total(self): ...            # звичайний: отримує об'єкт (self)\n\n    @classmethod\n    def from_line(cls, line): ...   # отримує КЛАС (cls)\n\n    @staticmethod\n    def meal_type(hour): ...        # не отримує нічого")}
        <table style="max-width:640px">
          <tr><th>вид</th><th>перший аргумент</th><th>навіщо</th></tr>
          <tr><td>звичайний</td><td>${cc('self')} — об'єкт</td><td>працює з даними конкретного об'єкта</td></tr>
          <tr><td>${cc('@classmethod')}</td><td>${cc('cls')} — клас</td><td>альтернативний конструктор: ${cc("Order.from_line('7')")}</td></tr>
          <tr><td>${cc('@staticmethod')}</td><td>—</td><td>правило «на тему класу», без даних об'єкта</td></tr>
        </table>` },
      { t: '2. Виклик', hl: [], html: `${pre("order = Order.from_line('7')   # cls = Order підставлено автоматично\nprint(order.id)                # 7\nprint(Order.meal_type(12))     # обід — нічого не підставляється")}` },
    ],
    advanced: [
      { t: '1. Декоратор загортає функцію', hl: [], html: `${pre("print(type(Order.__dict__['from_line']))   # <class 'classmethod'>\nprint(type(Order.__dict__['meal_type']))   # <class 'staticmethod'>")}
        <p>${cc('@classmethod')} ≈ ${cc('from_line = classmethod(from_line)')}. У ${cc('__dict__')} класу лежить вже не функція, а об'єкт-обгортка — теж дескриптор зі своїм ${cc('__get__')}.</p>` },
      { t: '2. Різні __get__', hl: [], html: `${pre("print(Order.from_line)           # <bound method Order.from_line of <class 'Order'>>\nprint(Order.from_line.__self__)  # <class 'Order'> — прив'язано до КЛАСУ\nprint(order.from_line.__self__)  # <class 'Order'> — навіть через об'єкт\nprint(type(Order.meal_type))     # <class 'function'> — без прив'язки")}
        <table style="max-width:640px">
          <tr><th>що в класі</th><th>${cc('__get__(obj, cls)')} повертає</th></tr>
          <tr><td>${cc('function')}</td><td>${cc('method')} з ${cc('__self__ = obj')}</td></tr>
          <tr><td>${cc('classmethod')}</td><td>${cc('method')} з ${cc('__self__ = cls')}</td></tr>
          <tr><td>${cc('staticmethod')}</td><td>саму функцію</td></tr>
        </table>
        <p>Три види методів — це три дескриптори з різним ${cc('__get__')}. Повністю дескриптори розбираються в уроці 24.</p>` },
    ],
  },
];
const ALL_PRESETS = [...PRESETS.map(x => ({ ...x, group: 'class' })), ...FN_PRESETS];
const GROUP_TITLE = { class: "Об'єкт класу: Клас(...)", fn: 'Функції: def, lambda, замикання', method: 'Методи: у класі, bound, classmethod' };
let cp = 0, cs = 0;
const STEP_NAMES = ['1. Виклик класу', '2. __new__', '3. __init__', '4. Готовий об\'єкт', '5. Методи'];
const STEP_NAMES_B = ['1. Виклик класу', '2. Створити й заповнити', '3. Готовий об\'єкт'];
const IMMUTABLE = new Set(['int', 'bool', 'str', 'tuple']);

function renderFnCreate(p) {
  clearHL();
  const steps = p[ADV() ? 'advanced' : 'beginner'];
  if (cs >= steps.length) cs = steps.length - 1;
  const st = steps[cs];
  st.hl.forEach(k => { const n = nodeEl(k); if (n) n.classList.add('found'); });
  createShell(steps.map(x => x.t), st.html, p.group === 'fn' ? 'Як створюється функція' : 'Як створюється метод');
}
function createShell(stepNames, body, title) {
  document.getElementById('create').innerHTML = `
    <h2>${title}</h2>
    <div class="row">Приклад:
      <select id="preset">${Object.keys(GROUP_TITLE).map(g => `<optgroup label="${esc(GROUP_TITLE[g])}">${ALL_PRESETS.map((x, i) => x.group !== g ? '' : `<option value="${i}" ${i === cp ? 'selected' : ''}>${esc(x.code)}</option>`).join('')}</optgroup>`).join('')}</select>
    </div>
    <div class="steps">${stepNames.map((s, i) => `<span class="dot ${i === cs ? 'on' : i < cs ? 'done' : ''}">${esc(s)}</span>`).join('')}</div>
    <div class="stepbox">${body}</div>
    <div class="row">
      <button class="btn ghost" id="prevS" ${cs === 0 ? 'disabled' : ''}>← Назад</button>
      <button class="btn" id="nextS" ${cs === stepNames.length - 1 ? 'disabled' : ''}>Далі →</button>
    </div>`;
  document.getElementById('preset').onchange = e => { cp = +e.target.value; cs = 0; renderCreate(); };
  document.getElementById('prevS').onclick = () => { cs--; renderCreate(); };
  document.getElementById('nextS').onclick = () => { cs++; renderCreate(); };
  bindAdv();
}
function renderCreate() {
  if (ALL_PRESETS[cp].group !== 'class') { renderFnCreate(ALL_PRESETS[cp]); return; }
  const p = ALL_PRESETS[cp], chain = mro(p.cls), varName = p.code.split(' =')[0];
  const nw = lookup(p.cls, '__new__'), it = lookup(p.cls, '__init__');
  let body = '';
  clearHL();
  const steps = ADV() ? STEP_NAMES : STEP_NAMES_B;
  if (cs >= steps.length) cs = steps.length - 1;
  if (!ADV()) {
    if (cs === 0) {
      const n = nodeEl(p.cls); if (n) n.classList.add('hl');
      body = `<p>Ви пишете <code>${esc(p.code)}</code>.</p>
        <p>Виклик класу означає: <b>«зроби мені новий об'єкт цього класу»</b>. Клас <code>${p.cls}</code> — креслення, а результат — <b>екземпляр</b>, конкретний об'єкт у пам'яті.</p>`;
    } else if (cs === 1) {
      body = `<p>Python робить дві речі по черзі:</p>
        <ol>
          <li><code>__new__</code> <b>створює</b> об'єкт: <span class="objstate ${p.empty ? 'empty' : ''}">${esc(p.afterNew())}</span></li>
          <li><code>__init__</code> <b>заповнює</b> його: <span class="objstate">${esc(p.afterInit())}</span>${it.where !== p.cls && p.cls === 'Dog' ? ` — у <code>Dog</code> власного <code>__init__</code> немає, він <b>успадкований</b> від <code>Animal</code>` : ''}</li>
        </ol>
        ${IMMUTABLE.has(p.cls) ? `<p>💡 <code>${p.cls}</code> — <b>незмінний</b> тип: усю роботу робить <code>__new__</code>, бо змінити об'єкт після створення вже не можна. <code>__init__</code> нічого не додає.</p>` : ''}`;
    } else {
      const n = nodeEl(p.cls); if (n) n.classList.add('found');
      const meth = allMethods(p.cls).filter(x => !x.m.n.startsWith('__')).map(x => x.m.n);
      body = `<p>Готово: ярлик <code>${varName}</code> тепер вказує на новий об'єкт.</p>
        <table style="max-width:520px">
          <tr><td><code>type(${varName})</code></td><td><code>${p.cls}</code></td></tr>
          <tr><td><code>isinstance(${varName}, ${p.cls})</code></td><td><code>True</code></td></tr>
        </table>
        <p>Що він уміє — методи його класу: ${meth.map(x => `<span class="chip">${x}</span>`).join(' ')}</p>
        ${advTeaser(`Хто саме запускає <code>__new__</code> і <code>__init__</code>? Де Python їх шукає? Коли <code>__init__</code> не викликається?`)}`;
    }
  } else if (cs === 0) {
    const n = nodeEl(p.cls); if (n) n.classList.add('hl'); nodeEl('type').classList.add('found');
    body = `<p>Ви пишете <code>${esc(p.code)}</code>.</p>
      <p>Клас <code>${p.cls}</code> — теж об'єкт, і його клас — <code>type</code> (<code>type(${p.cls}) is type</code>).
      Тому «виклик класу» насправді означає: <code>type.__call__(${p.cls}, ${esc(p.code.slice(p.code.indexOf('(') + 1, -1))})</code>.</p>
      <p>Зверніть увагу: <code>__call__</code> шукається в <code>type(${p.cls}).__mro__</code> = <code>type → object</code>, а <b>не</b> в <code>${p.cls}.__mro__</code> = <code>${chain.join(' → ')}</code>. ${p.cls} не успадковує від type, він його <b>екземпляр</b>.</p>
      <p><code>type.__call__</code> робить дві речі по черзі: <b>створює</b> об'єкт (<code>__new__</code>) і <b>налаштовує</b> його (<code>__init__</code>).</p>`;
  } else if (cs === 1) {
    highlightChain(chain, nw.idx);
    body = `<p>Python шукає <code>__new__</code> за MRO класу <code>${p.cls}</code>:</p>${chainHtml(chain, nw.idx)}
      <p>Знайдено в <code>${nw.where}</code> → виконується <code>${nw.where}.__new__(${p.cls}, ...)</code>.
      ${p.newNote ? esc(p.newNote) + '.' : `${nw.where === 'object' ? "У Dog і Animal немає __new__, тому працює object.__new__: виділяє пам'ять під новий порожній об'єкт класу Dog." : ''}`}</p>
      <p>Стан після <code>__new__</code>: <span class="objstate ${p.empty ? 'empty' : ''}">${esc(p.afterNew())}</span></p>`;
  } else if (cs === 2) {
    highlightChain(chain, it.idx);
    body = `<p>Тепер Python шукає <code>__init__</code>:</p>${chainHtml(chain, it.idx)}
      <p>Знайдено в <code>${it.where}</code>${it.where !== p.cls ? ` — <b>успадковано</b>, бо в <code>${p.cls}</code> власного <code>__init__</code> немає` : ''}.</p>
      <p>${esc(p.initNote)}.</p>
      <p>Стан після <code>__init__</code>: <span class="objstate">${esc(p.afterInit())}</span></p>
      <p class="adv-small">⚠️ <code>type.__call__</code> викликає <code>__init__</code> лише тоді, коли <code>__new__</code> повернув екземпляр <code>${p.cls}</code> (<code>isinstance(obj, ${p.cls})</code>). Якщо <code>__new__</code> поверне щось інше — наприклад <code>42</code>, — <code>__init__</code> пропускається, і <code>${p.cls}(...)</code> дасть саме це «щось».</p>`;
  } else if (cs === 3) {
    const n = nodeEl(p.cls); if (n) n.classList.add('found');
    body = `<p><code>type.__call__</code> повертає готовий об'єкт, і на нього вішається ярлик <code>${varName}</code>.</p>
      <table style="max-width:560px">
        <tr><td><code>type(${varName})</code></td><td><code>${p.cls}</code></td></tr>
        <tr><td><code>${varName}.__class__</code></td><td><code>${p.cls}</code> — суцільна стрілка на схемі</td></tr>
        ${chain.map(c => `<tr><td><code>isinstance(${varName}, ${c})</code></td><td><code>True</code></td></tr>`).join('')}
        <tr><td><code>type(${varName}) is ${chain[1]}</code></td><td><code>False</code> — <code>type()</code> дає лише точний клас</td></tr>
      </table>`;
  } else {
    highlightChain(chain, -2);
    const list = allMethods(p.cls).filter(x => !x.m.n.startsWith('__') || ['__len__', '__add__', '__getitem__', '__repr__', '__init__', '__str__'].includes(x.m.n));
    const groups = {}; list.forEach(x => (groups[x.where] = groups[x.where] || []).push(x));
    body = `<p>Об'єкт <code>${varName}</code> сам методів не зберігає. Коли ви пишете <code>${varName}.метод()</code>, Python іде по стрілках вгору: клас → батько → ... → <code>object</code>.</p>
      ${Object.keys(groups).map(g => `<p><b>${g === p.cls ? 'Власні методи класу' : 'Успадковано від'} <code>${g}</code>:</b><br>${groups[g].map(x => `<span class="chip ${g === p.cls ? 'own' : ''}" title="${esc(x.m.d)}">${x.m.n}</span>${tag(x.m.kind)} `).join(' ')}</p>`).join('')}
      <p class="muted">Повний список з можливістю викликати методи — клікніть об'єкт відповідного типу на схемі.</p>`;
  }
  createShell(steps, body, "Від <code>Клас(...)</code> до готового об'єкта");
}

/* ===================== Вкладки та старт ===================== */
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  switchTab(b.dataset.tab);
  if (b.dataset.tab === 'create') renderCreate(); else select(selected);
});
document.getElementById('showMeta').onchange = () => drawMap();
document.getElementById('resetAll').onclick = () => { INST = makeAll(); lastLog = ''; drawMap(); select(selected); };

const LEVEL_HINT = {
  beginner: "Об'єкт → клас → метод. Створення через __new__ / __init__, змінні й незмінні типи, успадкування методів. Уроки 19–21.",
  advanced: 'Клас теж об\'єкт: метаклас type і правило виклику X(...), bound methods, MRO (C3), дескриптори, межі цієї симуляції. Уроки 21–24.',
};
function setLevel(l) {
  LEVEL = l;
  try { localStorage.setItem('cm-level', l); } catch (e) { /* ignore */ }
  document.body.classList.toggle('lvl-beginner', l === 'beginner');
  document.body.classList.toggle('lvl-advanced', l === 'advanced');
  document.querySelectorAll('[data-level]').forEach(b => { b.classList.toggle('on', b.dataset.level === l); b.setAttribute('aria-pressed', b.dataset.level === l); });
  document.getElementById('levelHint').textContent = LEVEL_HINT[l];
  showDunder = l === 'advanced';
  drawMap();
  if (document.getElementById('tab-create').classList.contains('on')) renderCreate(); else select(selected);
}
document.querySelectorAll('[data-level]').forEach(b => b.onclick = () => setLevel(b.dataset.level));
setLevel(LEVEL);
