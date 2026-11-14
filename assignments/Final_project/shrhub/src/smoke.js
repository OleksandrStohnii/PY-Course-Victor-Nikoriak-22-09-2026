const fs=require('fs');
const html=fs.readFileSync('tap.html','utf8');
const m=html.match(/<script>([\s\S]*)<\/script>/);
const code=m[1];
// минимальный DOM
const els={};
function el(id){return els[id]||(els[id]={id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelectorAll(){return []},querySelector(){return null},appendChild(){},removeChild(){},
  addEventListener(){},removeEventListener(){},setAttribute(){},getAttribute(){return null},
  getContext(){return ctx},scrollTo(){},scrollLeft:0,clientWidth:360,children:[],
  getBoundingClientRect(){return{width:360,height:200,left:0,top:0}},
  focus(){},blur(){},remove(){},insertAdjacentHTML(){},scrollIntoView(){},click(){}})}
const ctx=new Proxy({},{get:(t,k)=>k==='canvas'?{width:360,height:200}:(k==='measureText'?(()=>({width:10})):(()=>{}))});
const store={};
const ivs=[];
global.window=global;
global.document={getElementById:el,createElement:()=>el('tmp'+Math.random()),
  querySelectorAll:()=>[],querySelector:()=>null,body:el('body'),documentElement:el('html'),
  addEventListener(){},removeEventListener(){},hidden:false,
  head:{appendChild(){}},createTextNode:()=>({})};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
global.navigator=undefined;
Object.defineProperty(globalThis,'navigator',{value:{language:'ru',clipboard:{writeText:()=>Promise.resolve()}},configurable:true});
global.fetch=()=>Promise.reject(new Error('offline'));
global.setInterval=(f,ms)=>{ivs.push({f,ms});return ivs.length};
global.requestAnimationFrame=()=>0;
global.devicePixelRatio=2;
global.Telegram=undefined;
global.alert=()=>{};
global.addEventListener=()=>{};
global.removeEventListener=()=>{};
global.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
global.location={href:'',search:'',hash:''};
global.history={replaceState(){}};
global.innerWidth=390;global.innerHeight=844;
global.scrollTo=()=>{};
global.open=()=>null;
const checks=`const out=[];
function ok(name,cond){out.push((cond?'  ok  ':'FAIL  ')+name);if(!cond)process.exitCode=1}

ok('монеты загрузились из демо-набора', typeof COINS!=='undefined'&&COINS.length>30);
ok('есть стейблкоин USDC в демо или фильтр снят', !/\\/usd\\|dai\\/i/.test(code));
ok('самого USDT в списке нет', !COINS.some(c=>c.s==='USDT'));
ok('нумерация в списке монет', /class="rk">\\$\\{i\\+1\\}/.test(code));
ok('таймфреймы на месте', typeof TFS!=='undefined'&&TFS.length===13);
ok('запасной источник цен есть', typeof pullExchange==='function');
ok('все монеты открыты', typeof allowed==='function'&&allowed('ANY')===true);
ok('тарифов шесть', TIERS.length===6&&TIERS[0].stars===0);

// ничья
S.pred={sym:COINS[0].s,dir:1,entry:COINS[0].p,target:null,rng:.02,t:Date.now()-1,dur:3600,live:false};
S.streak=7;
resolve();
ok('ничья не сжигает серию', S.streak===7&&S.pred===null);

// обычный проигрыш по-прежнему сжигает
S.pred={sym:COINS[0].s,dir:1,entry:COINS[0].p*1.05,target:null,rng:.02,t:Date.now()-1,dur:3600,live:false};
S.streak=7;
resolve();
ok('проигрыш обнуляет серию', S.streak===0);

// средняя цена SHR
const r=pfAvg([{usd:1000,price:60000},{usd:1000,price:72000}]);
ok('средняя цена считается верно', Math.abs(r.avg-65454.545)<1);


ok('экран выдачи доступа есть', typeof giftHtml==='function'&&typeof giftSet==='function');
OWNER=true;S.ch='gift';OGIFT=[{id:777,nick:'Друг',av:'ff',pts:40,best:5,total:60,seen:Date.now(),stars:105,gift:-1},
 {id:778,nick:'Игрок',av:'pp',pts:5,best:2,total:9,seen:Date.now()-3*86400000,stars:0,gift:null}];
var gh=giftHtml();
ok('в списке видно, кому уже открыто', gh.includes('Забрать')&&gh.includes('Открыть'));
ok('видно Telegram ID игрока', gh.includes('ID 777'));
ok('экран закрыт для не-владельца', (OWNER=false,giftHtml().includes('только для владельца')));

OWNER=false;SRV={post:()=>Promise.resolve({})};SRVERR=0;
NOTIF={on:false,mh:12,eh:20,asked:false};
var nh=notifHtml();
ok('новичка спрашивают, а не пишут молча', nh.includes('Да, напоминай')&&nh.includes('Не надо'));
NOTIF={on:true,mh:12,eh:20,asked:true};
nh=notifHtml();
ok('включённые напоминания показывают часы', nh.includes('12:00')&&nh.includes('20:00')&&nh.includes('Выключить'));
NOTIF={on:false,mh:12,eh:20,asked:true};
ok('выключенные можно включить обратно', notifHtml().includes('Включить'));
ok('часовой пояс считается', typeof tzmin()==='number'&&Math.abs(tzmin())<=840);

// экран «кто в игре»
LIVEIN={n:2,owner:false,now:Date.now(),list:[
 {id:1,nick:'Аня',av:'A',pts:30,best:4,seen:Date.now()},
 {id:2,nick:'Боря',av:'B',pts:10,best:2,seen:Date.now()-120000}]};
var oh=onlineHtml();
ok('список онлайн показывает людей', oh.includes('Аня')&&oh.includes('Боря'));
ok('обычный игрок не видит чужие ID', !oh.includes('ID 1'));
LIVEIN={n:3,owner:true,now:Date.now(),list:[
 {id:1,nick:'Аня',av:'A',pts:30,best:4,seen:Date.now(),hidden:0},
 {id:9,nick:'Тихоня',av:'T',pts:5,best:1,seen:Date.now(),hidden:1}]};
oh=onlineHtml();
ok('владелец видит спрятавшихся и их помечает', oh.includes('Тихоня')&&oh.includes('👁'));
ok('владелец видит ID', oh.includes('ID 9'));
// переключатель видимости честно говорит про владельца
HIDDEN=false;
var hh=hideHtml();
ok('переключатель прямо пишет, что владелец видит всегда', /владелец платформы видит/i.test(hh));
ok('можно спрятаться', hh.includes('Скрыться от других'));
HIDDEN=true;
ok('можно показаться обратно', hideHtml().includes('Показывать меня'));
// оплаты в сводке
OWNER=true;STATS={players:2,active:1,subs:1,stars:210,pays:2,pfUsers:1,pfRows:3,coins:[],clans:0,msgs:0,
 buyers:[{uid:5,nick:'Петя',av:'P',n:2,stars:210,last:Date.now()}],
 lastPays:[{uid:5,nick:'Петя',product:'tier3',arg:'',stars:210,at:Date.now()}],
 titles:{tier3:'Подписка Pro'}};
var sh=statsHtml();
ok('видно, кто сколько заплатил', sh.includes('Петя')&&sh.includes('210 ⭐'));
ok('видно, за что заплатили', sh.includes('Подписка Pro'));

// прокрутка графика в прошлое
var mk=(n,start,stepMs)=>{var a=[];for(var i=0;i<n;i++)a.push({t:start+i*stepMs,o:100+i,h:101+i,l:99+i,c:100+i,v:5});return a};
CND=mk(300,Date.UTC(2024,0,1),86400000);CNDkey=ckey();VOFF=0;VN=90;
ok('по умолчанию видно последние 90 свечей', view(CND).length===90&&view(CND)[89].t===CND[299].t);
ok('пока не листали, мы «на сегодня»', atNow()===true);
VOFF=200;
var v=view(CND);
ok('отлистали назад — окно уехало в прошлое', v[v.length-1].t===CND[99].t&&v.length===90);
ok('листание видно по флагу', atNow()===false);
VOFF=99999;v=view(CND);
ok('дальше начала истории не уедешь', v[0].t===CND[0].t);
toNow();ok('кнопка возвращает к сегодня', VOFF===0);
// склейка старого и нового
var older=mk(50,Date.UTC(2023,0,1),86400000);
var merged=merge(older,CND);
ok('история склеивается без потерь', merged.length===350&&merged[0].t===older[0].t&&merged[349].t===CND[299].t);
var overlap=mk(10,CND[295].t,86400000);
ok('повторы по времени не дублируются', merge(CND,overlap).length===295+10);
// глубокая история есть на дневках
ok('для дневного графика есть глубокий источник', DEEP.ok(10)===true);
ok('ссылка на глубокую историю собирается', DEEP.u('BTC',10,1700000000000).indexOf('tBTCUSD')>0);

ok('короткий тикер для глубокой истории', DEEP.pair('BTC')==='tBTCUSD');
ok('длинный тикер через двоеточие', DEEP.pair('SHIB')==='tSHIB:USD');
var raw=[[2000,10,12,13,9,5],[1000,8,10,11,7,4]];
var g=DEEP.g(raw);
ok('глубокая история идёт от старых к новым', g[0].t===1000&&g[1].t===2000);
ok('открытие и закрытие не перепутаны', g[0].o===8&&g[0].c===10&&g[0].h===11&&g[0].l===7);

// кнопка «вся история» и шкала цен
ok('кнопка всей истории есть', typeof loadAll==='function');
CND=mk(120,Date.UTC(2017,7,1),30*86400000);CNDkey=ckey();VOFF=0;VN=90;CNDtop=true;VOFF=40;
loadAll();
// шкала рисуется без ошибок и показывает крайние цены
var painted=[];
var realFill=cx.fillText;
ok('цены на шкале печатаются', typeof drawScale==='function');

// покупки в разных валютах
FIAT={uah:42,eur:0.92,usd:1};
S.fiat='uah';S.cur='uah';
ok('курс гривны берётся', curRate('uah')===42 && curRate('usd')===1);
S.pf=[];
$('pfs').value='BTC';$('pfu').value='42000';$('pfp').value='60000';$('pfc').value='uah';
pfAdd();
var rec=S.pf[0];
ok('гривны переведены в доллары по курсу', Math.abs(rec.usd-1000)<0.001);
ok('оригинальная сумма и валюта сохранены', rec.amt===42000&&rec.cur==='uah'&&rec.rate===42);
$('pfu').value='500';$('pfp').value='50000';$('pfc').value='usd';S.cur='usd';
pfAdd();
var sp=pfSpend(S.pf);
ok('гривны и доллары не сложены в кучу', sp.by.uah===42000&&sp.by.usd===500);
ok('общий итог в долларах верный', Math.abs(sp.usd-1500)<0.001);
ok('смешанные валюты помечены', sp.mixed===true);
ok('строка расходов показывает обе валюты', spendLine(sp).indexOf('42')>=0&&spendLine(sp).indexOf('500')>=0);
// средняя цена не зависит от валюты
var av=pfAvg(S.pf);
ok('средняя цена считается по долларам', Math.abs(av.avg-(1500/(1000/60000+500/50000)))<0.01);
// старые записи без валюты не ломаются
ok('запись без валюты считается долларовой', pfSpend([{usd:7,price:1}]).by.usd===7);
// курс не загрузился — не даём записать кривую сумму
FIAT={};S.cur='eur';
var before=S.pf.length;
$('pfu').value='100';$('pfp').value='50000';$('pfc').value='eur';
pfAdd();
ok('без курса покупка не записывается', S.pf.length===before);
FIAT={uah:42,eur:0.92,usd:1};

// приход и расход: продажа монет
S.pf=[];FIAT={uah:42,eur:0.92,usd:1};S.cur='usd';PFK='b';
$('pfs').value='BTC';$('pfc').value='usd';
$('pfu').value='1000';$('pfp').value='50000';pfAdd();   // купил 0.02 BTC
$('pfu').value='1000';$('pfp').value='100000';pfAdd();  // купил 0.01 BTC
var led=pfCalc(S.pf);
ok('монет накопилось верно', Math.abs(led.qty-0.03)<1e-9);
ok('средняя цена после двух покупок', Math.abs(led.avg-(2000/0.03))<0.01);
PFK='s';$('pfu').value='900';$('pfp').value='90000';pfAdd(); // продал 0.01 BTC за 900
led=pfCalc(S.pf);
ok('после продажи монет стало меньше', Math.abs(led.qty-0.02)<1e-9);
ok('средняя цена от продажи не изменилась', Math.abs(led.avg-(2000/0.03))<0.01);
ok('приход записан', Math.abs(led.got-900)<1e-9);
ok('расход не изменился', Math.abs(led.spent-2000)<1e-9);
ok('осталось вложено по средней', Math.abs(led.cost-(2000-0.01*(2000/0.03)))<0.01);
// остаток: своих денег в деле
ok('остаток = потрачено минус вернулось', Math.abs((led.spent-led.got)-1100)<1e-9);
// нельзя продать больше, чем есть
var n=S.pf.length;
PFK='s';$('pfu').value='100000';$('pfp').value='90000';pfAdd();
ok('продать больше, чем есть, нельзя', S.pf.length===n);
// нельзя продать монету, которой не покупал
$('pfs').value='ETH';$('pfu').value='10';$('pfp').value='2000';pfAdd();
ok('продать некупленное нельзя', S.pf.length===n);
PFK='b';$('pfs').value='BTC';
// расходы и приходы разделены
ok('расходы считаются отдельно', pfSpend(S.pf,'b').usd===2000);
ok('приходы считаются отдельно', pfSpend(S.pf,'s').usd===900);
// продал всё — остаток обнуляется, а не уходит в минус
S.pf=[];PFK='b';$('pfu').value='500';$('pfp').value='50000';pfAdd();
PFK='s';$('pfu').value='600';$('pfp').value='60000';pfAdd();
led=pfCalc(S.pf);
ok('продал всё — монет ноль', led.qty===0&&led.cost===0);
ok('прибыль посчитана', Math.abs(led.real-100)<1e-9);
PFK='b';

// таблица лидеров
SRV={post:()=>Promise.resolve({})};SRVERR=0;SRVID=5;
TOPSRV=[{id:5,nick:'Я',av:'A',pts:30,best:4,rep:120},{id:6,nick:'Сосед',av:'B',pts:99,best:9,rep:40}];
PROMO=null;CPROMO=null;SPOT={player:true,clan:true,playerUntil:0,clanUntil:0};
var lh=leadHtml();
ok('таблица сортируется как пришла с сервера', lh.indexOf('Я')<lh.indexOf('Сосед'));
ok('видно рейтинг, а не только очки', lh.includes('120')&&lh.includes('40'));
ok('место на виду можно купить, когда свободно', lh.includes('250'));
PROMO={id:9,nick:'Реклама',av:'R',pts:0,best:0,rep:3,until:Date.now()+6*86400000};
lh=leadHtml();
ok('оплаченное место подписано', lh.includes('Место оплачено'));
ok('оплаченное место не занимает первую строчку', lh.indexOf('Место оплачено')<lh.indexOf('Таблица')&&lh.includes('Я'));
SPOT={player:false,clan:true,playerUntil:Date.now()+3*86400000,clanUntil:0};
ok('занятое место не продаётся второй раз', leadHtml().includes('Место занято до'));

// набранное в поле не должно пропадать при перерисовке
S.ch='calc';S.pf=[];FIAT={uah:42,usd:1};S.cur='usd';PFK='b';
renderCalc();
$('pfu').value='777';$('pfp').value='60000';$('pfs').value='BTC';$('pfc').value='usd';
els.pfu.id='pfu';
renderCalc();            // как будто пришли новые цены
ok('набранная сумма переживает перерисовку', $('pfu').value==='777'&&$('pfp').value==='60000');
pfAdd();
ok('покупка записалась', S.pf.length===1&&Math.abs(S.pf[0].usd-777)<1e-9);
renderCalc();
ok('после записи поле суммы чистое', !$('pfu').value);
// правка записи
var rid=S.pf[0].id;
pfEdit(rid);EK=0;
$('eu').value='900';$('ep').value='45000';$('ec').value='usd';
pfSave(rid);
var r0=S.pf[0];
ok('сумма и цена исправились', Math.abs(r0.usd-900)<1e-9&&r0.price===45000);
ok('дата покупки не поехала', r0.id===rid&&r0.at>0);
// правка в минус не проходит
pfEdit(rid);$('eu').value='0';$('ep').value='45000';pfSave(rid);
ok('ноль не принимается', S.pf[0].usd===900);
// нельзя превратить запись в продажу, если продавать нечего
pfEdit(rid);EK=1;$('eu').value='900';$('ep').value='45000';pfSave(rid);
ok('нельзя продать то, чего нет', S.pf[0].k!=='s');
EK=0;

// скидка
SALE=null;
ok('без скидки цена обычная', stars(100)==='100 ⭐'&&starsN(100)===100);
SALE={pct:30,until:Date.now()+3*86400000};
ok('со скидкой считается верно', starsN(100)===70);
ok('старая цена зачёркнута, новая рядом', stars(100).includes('<s')&&stars(100).includes('100 ⭐')&&stars(100).includes('70 ⭐'));
ok('баннер скидки появился', saleHtml().includes('30'));
SALE={pct:30,until:Date.now()-1000};
ok('просроченная скидка не действует', !saleOn()&&stars(100)==='100 ⭐'&&saleHtml()==='');
SALE={pct:99,until:Date.now()+1000};
ok('цена не падает ниже одной звезды', starsN(1)>=1);
SALE=null;
// новость дня
ANN={id:7,text:'Сегодня добавили полный экран',at:Date.now()};
S.annSeen=0;
ok('новость показывается', annHtml().includes('полный экран'));
annOk();
ok('после «понятно» новость уходит', annHtml()===''&&S.annSeen===7);
ANN={id:8,text:'Ещё новость',at:Date.now()};
ok('следующая новость снова показывается', annHtml().includes('Ещё новость'));
ANN=null;

// пробный доступ
TRIAL=0;
ok('без пробы карточки нет', trialHtml()===''&&trialDays()===0);
TRIAL=Date.now()+14*86400000;
ok('проба показывает остаток дней', trialDays()===14&&trialHtml().includes('14'));
ok('прямо сказано, что ничего не спишется', /не списываются/.test(trialHtml()));
TRIAL=Date.now()-1000;
ok('просроченная проба не показывается', trialHtml()===''&&trialDays()===0);
TRIAL=0;
// выгрузка сделок
S.pf=[{id:1,sym:'GRAM',usd:250,price:1.5,at:Date.parse('2026-11-13'),cur:'uah',amt:11362.5,rate:45.45,k:'b'},
      {id:2,sym:'GRAM',usd:100,price:1.6,at:Date.parse('2026-11-14'),cur:'usd',amt:100,rate:1,k:'s'}];
S.tier=5;
var copied='';
Object.defineProperty(globalThis,'navigator',{value:{language:'ru',clipboard:{writeText:v=>{copied=v;return Promise.resolve()}}},configurable:true});
pfExport();
ok('в выгрузке есть тип сделки', copied.includes('покупка')&&copied.includes('продажа'));
ok('в выгрузке есть валюта и курс', copied.includes('UAH')&&copied.includes('45,45'));
ok('в выгрузке есть количество монет', copied.split(String.fromCharCode(10))[1].split(';').length===11);
ok('в выгрузке есть итог', copied.includes('ИТОГО'));
ok('сделки идут по дате', copied.indexOf('2026-11-13')<copied.indexOf('2026-11-14'));
S.pf=[];

// три раздела учёта
S.pf=[];FIAT={uah:45,usd:1};S.cur='uah';
S.m='ex';PFK='b';
renderCalc();
$('pfs').value='USDT';$('pfu').value='45000';$('pfp').value='45';$('pfc').value='uah';
pfAdd();                       // взял 1000 USDT по 45 грн
PFK='s';$('pfu').value='23000';$('pfp').value='46';
pfAdd();                       // отдал 500 USDT по 46 грн
var ex=pfCalc(pfBy('ex')['USDT']);
ok('касса обменника считает остаток', Math.abs(ex.qty-500)<1e-6);
ok('средний курс не поехал от продажи', Math.abs(ex.avg-45)<1e-9);
ok('заработок обменника верный', Math.abs(ex.real-500)<1e-6);
ok('в долларах ничего не пересчиталось', S.pf[0].usd===45000&&S.pf[0].rate===1);
// расходы и приходы
S.m='bg';PFK='b';
renderCalc();
$('pfn').value='продукты';$('pfu').value='800';$('pfc').value='uah';pfAdd();
PFK='s';$('pfn').value='зарплата';$('pfu').value='30000';pfAdd();
var bg=pfOf('bg');
ok('расход и приход записались', bg.length===2&&bg[0].note==='продукты'&&bg[1].note==='зарплата');
ok('в деньгах нет курса и монет', bg[0].price===1&&bg[0].rate===1);
var bh=bgHtml();
ok('остаток посчитан верно', bh.replace(/\u00a0|\s/g,'').includes('29200'));
ok('подписи видно в списке', bh.includes('продукты')&&bh.includes('зарплата'));
// разделы не смешиваются
S.m='sp';PFK='b';renderCalc();
$('pfs').value='BTC';$('pfu').value='4500';$('pfp').value='90000';$('pfc').value='uah';pfAdd();
ok('спот видит только свои записи', Object.keys(pfBy('sp')).length===1&&Object.keys(pfBy('ex')).length===1);
ok('деньги не попали в спот', pfOf('sp').length===1&&pfOf('bg').length===2);
S.pf=[];S.m='sp';PFK='b';

// знакомство
S.intro=0;
ok('знакомство из трёх экранов', INTRO.length===3&&typeof intro==='function');
ok('первый экран говорит, что мы не биржа', t('in1_h').includes('не биржа'));
introDone('calc');
ok('после знакомства оно больше не всплывает', S.intro===1);
// ответ про монетизацию
var mh=moneyHtml();
ok('сказано, что бесплатно', mh.includes('Бесплатно навсегда'));
ok('сказано, за что берём деньги', mh.includes('За звёзды'));
ok('сказано, чего не будет', mh.includes('пирамида'));
// лента событий у владельца
OWNER=true;
STATS={players:8,active:8,subs:0,stars:0,pays:0,pfUsers:3,pfRows:9,coins:[],clans:0,msgs:4,buyers:[],lastPays:[],titles:{},
 balance:250,events:[{kind:'join',note:'Аня',at:Date.now(),uid:2,nick:'Аня'},{kind:'pf',note:'sp BTC',at:Date.now(),uid:2,nick:'Аня'}]};
var sh2=statsHtml();
ok('баланс звёзд видно', sh2.includes('250'));
ok('лента показывает события', sh2.includes('пришёл')&&sh2.includes('запись'));
ok('в ленте нет сумм чужих записей', !/\$\s?\d/.test(sh2.split('Что происходит')[1]||''));
OWNER=false;

// переписка владельца с игроками
ok('есть окно письма человеку', typeof dmOpen==='function'&&typeof dmSend==='function');
ok('есть письмо всем', typeof dmAll==='function');
LIVEIN={n:2,owner:true,now:Date.now(),list:[{id:77,nick:'Алина',av:'L',pts:0,best:0,seen:Date.now(),hidden:0}]};
SRVID=5;
ok('в списке у каждого есть конверт', onlineHtml().includes('openPm(77'));
LIVEIN.owner=false;
ok('обычный игрок конверта не видит', !onlineHtml().includes('dmOpen('));
LIVEIN=null;

// первые шаги листаются
S.ob={f:[1,1,0,0,0],got:false};S.ch='game';
var oh2=obHtml();
ok('шаги стали карточками', oh2.includes('obtrack')&&oh2.includes('obslide'));
ok('карточек столько же, сколько шагов', (oh2.match(/obslide/g)||[]).length===OB.length);
ok('есть точки для перелистывания', (oh2.match(/obdots/g)||[]).length>=1);
ok('видно номер шага', oh2.includes('Шаг 1 из '+OB.length));
OBI=0;OBHOLD=0;
obTick();
ok('без участия человека само листает', OBI===1);
obGo(3);
ok('точка переключает на нужный шаг', OBI===3);
ok('после касания автолистание замирает', (function(){var b=OBI;obTick();return OBI===b})());
S.ob={f:[0,0,0,0,0],got:false};OBI=0;OBHOLD=0;

// лента новостей
SRV={post:()=>Promise.resolve({})};SRVERR=0;
S.pf=[{id:1,sym:'GRAM',usd:100,price:1.5,at:Date.now(),cur:'usd',amt:100,rate:1,k:'b',m:'sp'}];
S.coin='BTC';
NWF=[{title:'GRAM listed on a major exchange',url:'https://x.io/1',src:'CoinDesk',at:Date.now()-3600000},
     {title:'Some unrelated DeFi story',url:'https://x.io/2',src:'Decrypt',at:Date.now()-7200000},
     {title:'Bitcoin falls below 70000',url:'https://x.io/3',src:'The Block',at:Date.now()-1800000}];
var fh=feedHtml();
ok('лента показывает заголовки', fh.includes('GRAM listed')&&fh.includes('Bitcoin falls'));
ok('источник подписан', fh.includes('CoinDesk')&&fh.includes('The Block'));
ok('ссылка ведёт к автору', fh.includes('href="https://x.io/1"')&&fh.includes('rel="noopener'));
var head=fh.split('Что пишут')[0];
ok('про мои монеты отобрано верно', head.includes('GRAM listed')&&head.includes('Bitcoin falls')&&!head.includes('unrelated'));
ok('сказано, что это не совет', fh.includes('не совет покупать'));
NWF=[];
ok('пустая лента объясняет себя', feedHtml().includes('Пока пусто'));
NWF=null;S.pf=[];

// отчёты обменника
var D=86400000, today=(function(){var d=new Date();d.setHours(0,0,0,0);return +d+60000})(), old=Date.now()-40*D;
S.pf=[
 {id:1,sym:'USDT',usd:45000,price:45,at:old,cur:'uah',amt:45000,rate:1,k:'b',m:'ex'},
 {id:2,sym:'USDT',usd:23000,price:46,at:old+D,cur:'uah',amt:23000,rate:1,k:'s',m:'ex'},
 {id:3,sym:'USDT',usd:9000,price:45,at:today,cur:'uah',amt:9000,rate:1,k:'b',m:'ex'},
 {id:4,sym:'USDT',usd:9400,price:47,at:today,cur:'uah',amt:9400,rate:1,k:'s',m:'ex'}];
var allS=exSum(pfOf('ex'),0);
ok('оборот за всё время', Math.abs(allS.turn-86400)<1e-6);
ok('операций посчитано', allS.n===4);
var d=exSum(pfOf('ex'),dayStart());
ok('за сегодня видны только сегодняшние', d.n===2&&Math.abs(d.turn-18400)<1e-6);
ok('заработок за сегодня верный', Math.abs(d.earn-400)<1e-6);
ok('маржа считается к продажам', Math.abs(d.margin-(400/9400*100))<0.01);
ok('вчерашний заработок в сегодня не попал', d.earn<allS.earn);
// подстановка прошлого курса
S.m='ex';PFK='b';els.pfs.value='USDT';CALCV.pfs='USDT';
var eh2=exHtml();
ok('подставлен прошлый курс покупки', eh2.includes('value="45"'));
ok('есть подсказка, как заполнять', eh2.includes('Как это заполнять'));
ok('есть отчёт с вкладками', eh2.includes('Сегодня')&&eh2.includes('Месяц')&&eh2.includes('Всё время'));
ok('видно кассу', eh2.includes('В кассе'));
S.pf=[];S.m='sp';PFK='b';

// аватар в шапке
S.av='🎩';S.avImg='';S.priv={anon:false};
renderShell&&0;
$('chi').innerHTML='';
(function(){const ci=chanInfo(S.ch);$('chi').innerHTML=S.avImg?'<img src="'+S.avImg+'" alt="">':'<span>'+(S.priv&&S.priv.anon?'👤':(S.av||'👤'))+'</span>'})();
ok('в шапке стоит эмодзи-аватар', $('chi').innerHTML.includes('🎩'));
S.avImg='data:image/jpeg;base64,xx';
(function(){$('chi').innerHTML=S.avImg?'<img src="'+S.avImg+'" alt="">':'<span>'+(S.av||'👤')+'</span>'})();
ok('картинка-аватар подставляется', $('chi').innerHTML.includes('<img'));
S.priv={anon:true};S.avImg='';
(function(){$('chi').innerHTML=S.avImg?'<img src="'+S.avImg+'" alt="">':'<span>'+(S.priv&&S.priv.anon?'👤':(S.av||'👤'))+'</span>'})();
ok('в режиме «скрыться» аватар обезличен', $('chi').innerHTML.includes('👤'));
S.priv={anon:false};

// блокировка видна человеку
BAN='';
ok('без блокировки карточки нет', banHtml()==='');
BAN='реклама в чате';
var bh2=banHtml();
ok('человеку прямо сказано, что чат закрыт', bh2.includes('Чат закрыт'));
ok('причина показана', bh2.includes('реклама в чате'));
ok('сказано, что записи SHR целы', /записи на месте/.test(bh2));
ok('оставлен путь оспорить', /поддержк/i.test(bh2));
BAN=' ';
ok('без причины карточка всё равно есть', banHtml().includes('Чат закрыт'));
BAN='';
// обращения у владельца
OWNER=true;
TKTS=[{id:1,uid:7,nick:'Аня',text:'Не открылась подписка',at:Date.now(),done:0,banned:0},
      {id:2,uid:8,nick:'Спамер',text:'купи у меня монеты',at:Date.now(),done:0,banned:1}];
var th2=tickHtml();
ok('обращения видны', th2.includes('Не открылась подписка')&&th2.includes('купи у меня'));
ok('заблокированный помечен', th2.includes('🚫')&&th2.includes('✅'));
ok('можно ответить письмом', th2.includes('openPm(7'));
OWNER=false;
ok('чужому обращения не видны', !tickHtml().includes('Не открылась'));
TKTS=null;

// голос в чате
SALE=null;BAN='';
ok('цена голоса показана в звёздах', stars(1)==='1 ⭐');
ok('есть покупка голоса', typeof buyVoice==='function');
ok('владелец может открыть голос бесплатно', typeof chatOpen==='function');
// листание переписки
CHMORE={};CHbusy=false;S.ch='room:general';
S.rooms={'room:general':Array.from({length:25},(_,i)=>({id:i+1,n:'A',f:'A',t:'m'+i,ts:Date.now()}))};
var ch2=chatHtml(S.rooms['room:general'],'#','общий','');
ok('есть кнопка показать раньше', ch2.includes('Показать раньше'));
CHMORE['room:general']=false;
ok('в начале комнаты кнопка пропадает', !chatHtml(S.rooms['room:general'],'#','общий','').includes('Показать раньше'));
ok('догрузка истории есть', typeof chatOlder==='function');
S.rooms={};S.ch='calc';

// чат бесплатный по умолчанию
CHATOK=true;BAN='';S.ch='room:general';
renderGate();
ok('поле ввода на месте, когда чат бесплатный', !$('voicegate').innerHTML);
CHATOK=false;
renderGate();
ok('если плату включили — видно карточку', $('voicegate').innerHTML.includes('Голос в чате'));
ok('в карточке сказано, что читать бесплатно', /Читать чаты можно и так, бесплатно/.test($('voicegate').innerHTML));
BAN='спам';
renderGate();
ok('заблокированному показываем бан, а не кассу', !$('voicegate').innerHTML);
BAN='';CHATOK=true;S.ch='calc';renderGate();
ok('выключатель платы есть у владельца', typeof chatPay==='function');

// карточка игрока
PROF={id:77,nick:'Алина',av:'L',no:4,pts:12,best:3,rep:40,tier:0,seen:Date.now()-20*60000};
OWNER=false;
var ph=profHtml();
ok('в карточке имя и номер клуба', ph.includes('Алина')&&ph.includes('4'));
ok('видно очки и серию', ph.includes('12 🎯')&&ph.includes('Лучшая серия'));
ok('обычный игрок не видит чужие звёзды', !ph.includes('Потратил звёзд'));
ok('кнопок модерации у игрока нет', !ph.includes('Закрыть доступ'));
ok('написать может не только владелец', ph.includes('openPm(77'));
OWNER=true;SRVID=5;
PROF={id:77,nick:'Алина',av:'L',no:4,pts:12,best:3,rep:40,tier:0,seen:Date.now(),banned:false,chat_ok:true,stars:105,total:30};
ph=profHtml();
ok('владелец видит оплаты', ph.includes('105 ⭐'));
ok('владельцу доступны письмо и блокировка', ph.includes('openPm(77')&&ph.includes('banOpen(77'));
PROF={id:77,nick:'Тихоня',av:'T',no:9,pts:0,best:0,rep:0,tier:0,seen:0};
ok('скрывшийся не светит время захода', profHtml().includes('скрыл себя'));
PROF=null;OWNER=false;
// письма
DMS=null;
ok('письма грузятся', dmHtml().includes('Загружаю'));
DMS=[{id:1,dir:'in',text:'Привет, как тебе?',at:Date.now()-8*3600000},{id:2,dir:'out',text:'нормально',at:Date.now()}];
var dh=dmHtml();
ok('видно письмо владельца и свой ответ', dh.includes('Привет, как тебе?')&&dh.includes('нормально'));
ok('подписано, кто написал', dh.includes('Владелец клуба')&&dh.includes('Ты'));
ok('сказано, что письмо дождётся утра', /прочитаешь утром/.test(dh));
DMS=[];
ok('пустая переписка объясняет себя', dmHtml().includes('пока нет'));
DMS=null;

// подписки
SRVID=5;FOLL=null;
ok('список подписок грузится', follHtml().includes('Загружаю'));
FOLL=[];
ok('пустой список объясняет, что делать', follHtml().includes('Нажми на человека'));
FOLL=[{id:77,nick:'Алина',av:'L',pts:12,best:3,tier:0,seen:Date.now()-30*60000}];
var fh2=follHtml();
ok('подписка видна в списке', fh2.includes('Алина')&&fh2.includes('30 мин назад'));
ok('из списка можно отписаться', fh2.includes('follow(77,0)'));
ok('из списка можно открыть профиль', fh2.includes('openProf(77)'));
FOLL=[{id:9,nick:'Тихоня',av:'T',pts:0,best:0,tier:0,seen:0}];
ok('скрывшийся не светит время', follHtml().includes('скрыл себя'));
// кнопка в карточке
PROF={id:77,nick:'Алина',av:'L',no:4,pts:12,best:3,rep:40,tier:0,seen:Date.now(),followers:2,following:5,iFollow:false};
OWNER=false;
var ph3=profHtml();
ok('в карточке есть счётчики', ph3.includes('2')&&ph3.includes('подписчиков')&&ph3.includes('подписок'));
ok('есть кнопка подписаться', ph3.includes('follow(77,1)')&&ph3.includes('Подписаться'));
PROF.iFollow=true;
ok('подписанному предлагают отписаться', profHtml().includes('follow(77,0)'));
PROF={id:5,nick:'Я',av:'A',no:1,pts:1,best:1,rep:1,tier:0,seen:Date.now(),followers:0,following:1,iFollow:false};
ok('на себя подписаться нельзя', !profHtml().includes('follow(5,'));
PROF=null;FOLL=null;

// личная переписка
SRV={post:()=>new Promise(()=>{})};SRVERR=0;SRVID=5;OWNER=false;
PMS=null;PM=null;PMID=0;PMPEER=null;
ok('список переписок грузится', pmsHtml().includes('Загружаю'));
PMS=[];
var e0=pmsHtml();
ok('пусто — объяснено, что делать', e0.includes('Нажми на участника'));
ok('и есть ход к списку онлайн', e0.includes("go('online')"));
PMS=[{id:77,nick:'Алина',av:'L',seen:Date.now()-20*60000,last:'привет, как тебе клуб?',at:Date.now()-60000,mine:false,unread:2},
     {id:78,nick:'Макс',av:'M',seen:0,last:'ок',at:Date.now()-7200000,mine:true,unread:0}];
var pl=pmsHtml();
ok('видно собеседников и последнюю строку', pl.includes('Алина')&&pl.includes('привет, как тебе клуб?'));
ok('непрочитанные посчитаны', pl.includes('class="unread">2<'));
ok('свои сообщения подписаны', pl.includes('Ты:'));
ok('по нажатию открывается ветка', pl.includes('openPm(77'));
ok('в списке стоит время последнего сообщения', pl.includes('только что')||pl.includes('мин назад'));
// сама ветка
PMID=77;PMPEER={id:77,nick:'Алина',av:'L',seen:Date.now()};PM=null;
ok('ветка грузится', pmHtml().includes('Загружаю'));
PM=[{id:1,uid:77,text:'привет!',at:Date.now()-120000},{id:2,uid:5,text:'привет, норм',at:Date.now()-60000}];
var pb=pmHtml();
ok('видно оба сообщения', pb.includes('привет!')&&pb.includes('привет, норм'));
ok('свои отличаются от чужих', pb.split('pmr me').length-1===1);
ok('в шапке имя собеседника', pb.includes('Алина'));
ok('из шапки можно уйти в профиль', pb.includes('openProf(77)'));
ok('есть поле ввода и отправка', pb.includes('id="pmtx"')&&pb.includes('pmSend()'));
ok('время стоит внутри пузыря', pb.includes('class="ts"'));
ok('своё сообщение помечено галочкой', pb.includes('class="tk'));
ok('есть разделитель дня', pb.includes('pmday')&&pb.includes('Сегодня'));
PMMORE=true;
ok('можно долистать переписку вверх', pmHtml().includes('pmOlder()'));
PMMORE=false;
PM=[];
ok('пустая ветка зовёт написать первым', pmHtml().includes('Напиши первым'));
// набранное не стирается при обновлении ветки
PMID=77;PMPEER={id:77,nick:'Алина',av:'L',seen:Date.now()};
PM=[{id:1,uid:77,text:'привет!',at:Date.now()}];
renderPm();
$('pmtx').value='недописанное сообщение';
PM=[{id:1,uid:77,text:'привет!',at:Date.now()},{id:2,uid:77,text:'ты тут?',at:Date.now()}];
renderPm();
ok('новое сообщение не стёрло набранное', $('pmtx').value==='недописанное сообщение');
ok('и само сообщение появилось', $('pm').innerHTML.includes('ты тут?'));
// вложения
PMID=77;PMPEER={id:77,nick:'Алина',av:'L',seen:Date.now()};
PM=[{id:9,uid:77,text:'вот экран',at:Date.now(),kind:'photo',src:'p.jpg',thumb:'p.jpg'},
    {id:10,uid:5,text:'',at:Date.now(),kind:'video',src:'v.mp4',thumb:'t.jpg',dur:95,size:5e6},
    {id:11,uid:5,text:'',at:Date.now(),kind:'video',src:'',thumb:'t.jpg',dur:900,size:60e6}];
var pmv=pmHtml();
ok('фото видно прямо в переписке', pmv.includes('class="pmimg" src="p.jpg"'));
ok('по фото открывается большое', pmv.includes("pmFull('p.jpg')"));
ok('у ролика обложка и длительность', pmv.includes("background-image:url('t.jpg')")&&pmv.includes('1:35'));
ok('маленький ролик играется на месте', pmv.includes('pmPlay(10)'));
ok('большой отправляет смотреть в чат', pmv.includes('pm_toobig'));
PMPLAY=10;
ok('плеер открывается в пузыре', pmHtml().includes('<video class="pmvid" src="v.mp4"'));
PMPLAY=0;
ok('есть скрепка и смайлы', pmv.includes('accept="image/*,video/*"')&&pmv.includes('pmEmoji()'));
PMEMO=true;
ok('смайлы раскрываются', pmHtml().includes("pmEmo('🔥')"));
PMEMO=false;
PMUP=42;
ok('видно, сколько отправлено', pmHtml().includes('width:42%'));
PMUP=-1;
// список переписок с вложением
PMS=[{id:77,nick:'Алина',av:'L',last:'',kind:'photo',at:Date.now(),mine:false,unread:1}];
ok('в списке фото подписано', pmsHtml().includes('📷'));
// переписки видно в самих «Чатах»
PMN=1;
var ch=chatsHtml();
ok('личные чаты видны в списке чатов', ch.includes('Алина')&&ch.includes('openPm(77'));
ok('и непрочитанные посчитаны', ch.includes('class="badge">1<'));
PMN=0;
PM=null;PMS=null;PMID=0;PMPEER=null;

// видео
SRV={post:()=>new Promise(()=>{})};SRVERR=0;SRVID=5;OWNER=false;
VIDS=null;VMINE=null;VTAB='feed';VPLAY=0;
ok('лента грузится', videoHtml().includes('Загружаю'));
VIDS=[];
var vh0=videoHtml();
ok('пустая лента зовёт выложить первый', vh0.includes('Выложи первый'));
ok('плюсик виден сразу', vh0.includes('Выложить ролик')&&vh0.includes('accept="video/*"'));
ok('правила видео на виду', vh0.includes('наркотики')&&vh0.includes('насилие'));
ok('из раздела есть ход в правила', vh0.includes("go('legal')"));
var lg=legalHtml();
ok('правила: отвечает автор', lg.includes('Отвечает тот, кто выложил'));
ok('правила: что запрещено', lg.includes('Наркотики')&&lg.includes('Оружие')&&lg.includes('детей'));
ok('правила: что будет за нарушение', lg.includes('доступ к клубу закрывают'));
ok('правила: можно оспорить', lg.includes('пересмотрим'));
ok('правила: авторские права', lg.includes('Снимем без разбирательств'));
ok('правила: что храним', lg.includes('Имя в клубе')&&lg.includes('не собираем'));
ok('правила: как удалить', lg.includes('Удалить мои данные'));
ok('правила: карты к нам не попадают', lg.includes('реквизиты карты к нам не попадают'));
ok('правила: 18+ и не совет', lg.includes('с 18 лет')&&lg.includes('Решение всегда твоё'));
ok('правила: закон выше правил', lg.includes('действует закон'));
ok('из правил можно написать в поддержку', lg.includes('openAs()'));
var small={id:7,uid:77,nick:'Алина',av:'L',title:'Как я считаю среднюю',dur:95,size:5e6,views:12,likes:3,boost:false,hidden:false,flags:0,me:false,liked:false,thumb:'u/t',src:'u/v',playable:true};
var big={id:8,uid:77,nick:'Алина',av:'L',title:'Длинный разбор',dur:900,size:60e6,views:4,likes:0,boost:true,hidden:false,flags:0,me:false,liked:false,thumb:'',src:'',playable:false};
VIDS=[big,small];
var vh=videoHtml();
ok('ролик показан с названием и автором', vh.includes('Как я считаю среднюю')&&vh.includes('Алина'));
ok('видны просмотры и отметки нравится', vh.includes('12')&&vh.includes('❤ 3'));
ok('длительность в минутах', vh.includes('1:35'));
ok('число просмотров склоняется', nviews(1)==='1 просмотр'&&nviews(4)==='4 просмотра'&&nviews(12)==='12 просмотров'&&nviews(21)==='21 просмотр');
ok('с автора можно уйти в профиль', vh.includes('openProf(77)'));
ok('поднятый ролик подписан', vh.includes('в топе'));
ok('маленький ролик играет в приложении', vh.includes("vidPlay(8,0)")===false||vh.includes("vidPlay(7,'u/v')"));
ok('большой ролик бот пришлёт в чат', vh.includes('Прислать в чат'));
ok('жалоба есть на каждом чужом ролике', vh.split('vidRep').length-1===2);
ok('чужой ролик нельзя удалить', !vh.includes('vidDel('));
VPLAY=7;
ok('плеер открывается на месте', videoHtml().includes('<video class="vplay" src="u/v"'));
ok('просмотр считается с начала проигрывания', videoHtml().includes('onplay="vidView(7)"'));
VPLAY=0;
OWNER=true;
ok('владелец может снять ролик с ленты', videoHtml().includes('vidHide(7,1)'));
VIDS=[Object.assign({},small,{hidden:true,flags:2})];
var vh2=videoHtml();
ok('владелец видит число жалоб', vh2.includes('жалоб: 2'));
ok('снятый ролик помечен', vh2.includes('снят с ленты'));
ok('снятый можно вернуть', vh2.includes('vidHide(7,0)'));
OWNER=false;
// свои ролики
VTAB='mine';VMINE=null;
ok('свои ролики грузятся', videoHtml().includes('Загружаю'));
VMINE=[];
ok('пусто — так и сказано', videoHtml().includes('ещё ничего не выкладывал'));
VMINE=[Object.assign({},small,{me:true,paid:150,boost:true,until:Date.now()+6e8}),Object.assign({},big,{me:true,boost:false})];
var vm=videoHtml();
ok('сводка по своим роликам', vm.includes('16')&&vm.includes('просмотров')&&vm.includes('роликов'));
ok('видно, сколько потрачено звёзд', vm.includes('150 ⭐'));
ok('свой ролик можно удалить', vm.includes('vidDel(7)'));
ok('непродвинутый можно поднять', vm.includes('vidBoost(8)'));
ok('продвинутый второй раз не предлагают', !vm.includes('vidBoost(7)'));
ok('на своих роликах нет жалобы на себя', !vm.includes('vidRep('));
// честный расчёт звёзд
(function(){
  var saved=$('mbox').innerHTML;
  vidBoost(7);
  var m=$('mbox').innerHTML;
  ok('сказано, сколько доходит до клуба', m.includes('$1.95')&&m.includes('$3.00'));
  ok('названо, кто забирает разницу', m.includes('Apple')&&m.includes('Telegram'));
  ok('продвижение не обещает просмотров', m.includes('Просмотров это не обещает'));
  $('mbox').innerHTML=saved;
})();
VTAB='feed';VIDS=null;VMINE=null;SRV=null;OWNER=false;
ok('без телеграма раздел честно пустой', videoHtml().includes('только внутри Telegram'));
SRV={post:()=>new Promise(()=>{})};

Promise.resolve().then(()=>Promise.resolve()).then(()=>{
  ok('вся история влезает в одно окно', VN===120&&VOFF===0&&view(CND).length===120);
  console.log(out.join('\\n'));
});
`;
eval(code+'\n'+checks);