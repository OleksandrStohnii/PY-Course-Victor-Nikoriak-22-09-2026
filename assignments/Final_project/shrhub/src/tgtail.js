// ---------- Telegram: вход, общий сервер и оплата звёздами ----------
const TG=window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData?window.Telegram.WebApp:null;
let API='';try{API=new URLSearchParams(location.search).get('api')||localStorage.getItem('shr_api')||'';if(API)localStorage.setItem('shr_api',API)}catch(e){}
let PAIDF=false;const t0=t;t=function(k,...a){return k==='nostars'&&PAIDF?'⭐':t0(k,...a)};

// Общая база: каждый запрос подписан данными Telegram, подделать нельзя
if(TG&&API){
  SRV={post:(path,data)=>fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({initData:TG.initData},data||{}))}).then(r=>r.json())};
  const u=TG.initDataUnsafe&&TG.initDataUnsafe.user;SRVID=u?u.id:0;
  srvPull();srvClans('');srvTop();
  // Кнопка «Ответить в SHRhub» в письме бота открывает приложение сразу в
  // нужной переписке: номер собеседника приходит в адресе.
  try{
    const who=Number(new URLSearchParams(location.search).get('pm')
      ||(TG.initDataUnsafe&&TG.initDataUnsafe.start_param)||0);
    if(who&&who!==SRVID)setTimeout(()=>openPm(who),300);
  }catch(e){}
}

function pay(product,ok,arg){
  if(!TG||!API){ok();return} // вне Telegram игра остаётся демо
  fetch(API+'/invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:TG.initData,product,arg:arg||''})})
    .then(r=>r.json()).then(j=>{if(!j.link)throw 0;TG.openInvoice(j.link,st=>{if(st==='paid'){
      PAIDF=true;try{ok()}finally{PAIDF=false}
      // покупку выдаёт сервер после подтверждения Telegram, поэтому перечитываем профиль
      setTimeout(srvPull,1500);setTimeout(srvPull,6000);
    }})})
    .catch(()=>toast('⭐ '+['Оплата сейчас недоступна','Оплата зараз недоступна','Payment is unavailable right now'][S.lang<3?S.lang:2]))}
{const w=(name,fn)=>{const o=window[name];window[name]=function(...a){return fn(o,...a)}};
  w('setTier',(o,i)=>i>0?pay('tier'+i,()=>o(i)):o(i));
  w('buyOne',(o,x)=>pay('coin',()=>o(x),x));
  w('buy',(o,id)=>{const it=ITEMS.find(x=>x.id===id),ok=it.ok?it.ok():true;if(ok!==true){toast(ok);return}id==='gift'?o(id):pay(id,()=>o(id))});
  w('buyItem',(o,x)=>pay(x,()=>o(x)));
  w('buyPass',o=>pay('pass',()=>o()));
  w('buyBanner',o=>{if(!S.clan){toast(t('need_clan'));return}pay('banner',()=>o())});
  w('buySkin',o=>pay('rbskin',()=>o()));
  w('buyFelt',o=>pay('felt',()=>o()));
  w('buyShovel',o=>pay('shovel',()=>o()));
  w('restore',(o,how)=>how==='pay'?pay('save',()=>o(how)):o(how));
  w('buySpot',(o,kind)=>{if(kind==='cspot'&&!S.clan){toast(t('need_clan'));return}
    pay(kind,()=>{toast('⭐');setTimeout(srvTop,1500);setTimeout(srvTop,6000)},kind==='cspot'?String((S.clan&&S.clan.id)||''):'')});
  w('buyVoice',()=>pay('chat',()=>{CHATOK=true;toast('🎙');render()}));
  // Загрузка ролика: шлём файл сырым телом, подпись Telegram — в заголовке.
  // XMLHttpRequest, а не fetch, ради процента отправки: человеку надо видеть, что идёт.
  w('vidUp',()=>{
    if(!TG||!API||!VFILE){toast(t('vd_demo'));return}
    const f=VFILE,ttl=(VTITLE||'').trim().slice(0,80);
    VUP=0;vidUpBar();
    const x=new XMLHttpRequest();
    x.open('POST',API+'/vup?title='+encodeURIComponent(ttl));
    x.setRequestHeader('x-init',encodeURIComponent(TG.initData));
    x.setRequestHeader('Content-Type','application/octet-stream');
    x.upload.onprogress=e=>{if(e.lengthComputable){VUP=Math.round(e.loaded/e.total*100);vidUpBar()}};
    x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch(e){}
      vidUpDone(x.status===200&&j.ok?'':(j.error||'fail'))};
    x.onerror=()=>vidUpDone('fail');
    x.ontimeout=()=>vidUpDone('fail');
    x.timeout=180000;
    x.send(f);
  });
  // Вложение в переписку: тот же путь, что у ролика в ленту
  w('pmFile',(o,f,kind)=>{
    if(!TG||!API||!f||!PMID){toast(t('vd_demo'));return}
    PMUP=0;renderPm();
    const cap=(($('pmtx')&&$('pmtx').value)||'').trim().slice(0,300);
    if($('pmtx'))$('pmtx').value='';
    const x=new XMLHttpRequest();
    x.open('POST',API+'/pmup?with='+PMID+'&kind='+kind+'&caption='+encodeURIComponent(cap));
    x.setRequestHeader('x-init',encodeURIComponent(TG.initData));
    x.setRequestHeader('Content-Type','application/octet-stream');
    x.upload.onprogress=e=>{if(e.lengthComputable){PMUP=Math.round(e.loaded/e.total*100);renderPm()}};
    x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch(e){}
      pmUpDone(x.status===200&&j.ok?'':(j.error||'fail'))};
    x.onerror=()=>pmUpDone('fail');
    x.ontimeout=()=>pmUpDone('fail');
    x.timeout=180000;
    x.send(f);
  });
  w('buyBoost',(o,id)=>pay('boost',()=>{toast(t('vd_bst_done'));setTimeout(vidsPull,1500);setTimeout(vidsPull,6000)},String(id)));
  w('toggleGm',o=>!S.gm&&S.gmFree<=0&&TG&&API?pay('gm',()=>{S.gmFree++;o()}):o());}
// Иконка мини-приложения на экране телефона: вход и покупки остаются телеграмовскими
let HS='';
function paintHome(){
  const e=document.getElementById('homeadd');if(!e)return;
  e.innerHTML=(HS==='missed'||HS==='unknown')
    ?`<div class="card"><div class="muted">${t('home_d')}</div><button class="btn g" onclick="askHome()">${t('home_add')}</button></div>`:'';
}
function askHome(){try{TG.addToHomeScreen()}catch(e){}}
if(TG&&typeof TG.checkHomeScreenStatus==='function'){
  try{
    TG.checkHomeScreenStatus(st=>{HS=st||'';paintHome()});
    ['homeScreenAdded','home_screen_added'].forEach(n=>TG.onEvent(n,()=>{HS='added';paintHome();toast(t('home_ok'))}));
    ['homeScreenChecked','home_screen_checked'].forEach(n=>TG.onEvent(n,e=>{if(e&&e.status){HS=e.status;paintHome()}}));
  }catch(e){}
  const r0=render;render=function(){r0.apply(this,arguments);paintHome()};
}
// Полный экран: Telegram убирает свою шапку, но тогда её место занимает наш
// заголовок — поэтому сверху добавляем отступ, который Telegram сам же и называет.
let FULL=false;
function fullOk(){try{return !!(TG&&TG.isVersionAtLeast&&TG.isVersionAtLeast('8.0')&&TG.requestFullscreen)}catch(e){return false}}
function fullPad(){
  try{
    const a=(TG&&TG.safeAreaInset)||{},b=(TG&&TG.contentSafeAreaInset)||{};
    const top=(a.top||0)+(b.top||0);
    document.documentElement.style.setProperty('--tgtop',(FULL?top:0)+'px');
  }catch(e){}
}
function toggleFull(){
  if(!fullOk()){toast(t('lead_demo'));return}
  try{FULL?TG.exitFullscreen():TG.requestFullscreen()}catch(e){}
}
if(fullOk()){
  try{
    FULL=!!TG.isFullscreen;
    ['fullscreenChanged','fullscreen_changed'].forEach(n=>TG.onEvent(n,()=>{FULL=!!TG.isFullscreen;fullPad();render()}));
    ['safeAreaChanged','contentSafeAreaChanged'].forEach(n=>TG.onEvent(n,fullPad));
    TG.onEvent('fullscreenFailed',()=>{FULL=false;fullPad();render()});
    fullPad();
  }catch(e){}
  // Кнопка живёт в шапке рядом с темой
  const paintFull=()=>{
    const h=document.querySelector('.chh');if(!h)return;
    let b=document.getElementById('fsb');
    if(!b){b=document.createElement('button');b.id='fsb';b.className='ib';b.onclick=toggleFull;
      const th=document.getElementById('thb');if(th&&th.parentNode)th.parentNode.insertBefore(b,th);else h.appendChild(b)}
    b.textContent=FULL?'⤡':'⤢';b.title=FULL?t('full_off'):t('full_on');
  };
  const r1=render;render=function(){r1.apply(this,arguments);paintFull()};
}
try{
  const u=TG&&TG.initDataUnsafe&&TG.initDataUnsafe.user;
  if(u&&u.photo_url&&!S.avImg&&!S.avOwn){S.avImg=u.photo_url;save()}
}catch(e){}
if(TG&&API)window.__support=txt=>{fetch(API+'/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:TG.initData,text:txt})}).catch(()=>{})};
if(TG){try{TG.ready();TG.expand();const u=TG.initDataUnsafe&&TG.initDataUnsafe.user;
  if(u){if(!S.nick&&u.first_name)S.nick=String(u.first_name).slice(0,16);
    if(!S.ok18){const i=LOC.indexOf(String(u.language_code||'').slice(0,2));if(i>=0)S.lang=i}}
  document.documentElement.lang=LOC[S.lang];save();render();if(!S.ok18)rules()}catch(e){}}
</script>
</body>
</html>
