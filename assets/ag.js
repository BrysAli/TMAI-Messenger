/* TMAI agentic block: one engine for every phone storyboard on the site (World and Business).
   The phone stays pinned in the middle while the page scrolls; scroll only picks the story (tab),
   and the story plays itself on a loop, the same way the hero chat plays.
   Messages are the storyboard's own bubbles, cut out one by one: the list glides up by the height of the
   new message while it rises in at the bottom. A callout arrives the way a message does: a dot on the phone,
   the dashed line draws out to the card, the card rises in. The last tab can be a "final" one
   (Download / Request): the block turns purple and shows its closing copy instead of a chat. */
(function(){
const EASE='cubic-bezier(0.23, 1, 0.32, 1)', NS='http://www.w3.org/2000/svg';
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

window.TMAIBlock = function(sec, cfg){
const Y = cfg.stageY ?? 100;                         /* storyboard frames are 1440 x 1024, the stage starts at y=100 */
const FR = cfg.frames, META = cfg.meta, SRC = k => cfg.base + k.replace(/:/g,'-') + (cfg.ext||'.webp');
const TABS = cfg.tabs, SECS = TABS.map(t=>t.key), FIN = TABS.findIndex(t=>t.final), NONFIN = TABS.filter(t=>!t.final).length;
const CH = Object.assign({x:17.8, y:103.2, w:321, h:501.3}, cfg.chat||{});
const START = cfg.start||{}, OPS = cfg.ops||{}, HOLD = cfg.hold||{};

/* ---------- DOM ---------- */
sec.classList.add('ag');
const intro = sec.querySelector('.ag-intro');
const copies = [...intro.querySelectorAll('.ag-copy')];
const copyDef = intro.querySelector('.ag-copy.def');
const tcopy = intro.querySelector('.ag-tcopy');
const track = document.createElement('div'); track.className='ag-track';
track.innerHTML = `<div class="ag-pin"><div class="ag-bg"></div><div class="ag-stage">
  <img class="ag-grid" src="/images/ag/grid.svg" alt=""><img class="ag-grid ag-grid-white" src="/images/ag/grid-white.svg" alt=""><div class="ag-phone"></div>
  <svg class="ag-lines" viewBox="0 0 1440 900" aria-hidden="true"><defs></defs></svg><div class="ag-co-layer"></div>
  </div><p class="ag-sr" aria-live="polite"></p></div>`;
intro.after(track);
const pin = track.querySelector('.ag-pin'), stage = track.querySelector('.ag-stage'), phone = track.querySelector('.ag-phone');
const coLayer = track.querySelector('.ag-co-layer'), lines = track.querySelector('.ag-lines'), defs = lines.querySelector('defs'), sr = track.querySelector('.ag-sr');
/* stage extras: per-tab copy (data-tab) and the closing block (.ag-dl), authored in stage coordinates */
const extras = sec.querySelector('template.ag-stage-extra');
if(extras) stage.appendChild(extras.content.cloneNode(true));
const tabCopyOnStage = [...stage.querySelectorAll('.ag-tc')];

/* the phone: a fixed chrome picture per story (status bar, chat header, composer) with a live chat on top */
const chromes = {};
function chromeImg(k){ if(chromes[k]) return chromes[k]; const im=new Image(); im.className='ph'; im.alt=''; im.decoding='async'; im.src=SRC(k); phone.insertBefore(im, phone.firstChild); return chromes[k]=im; }
Object.values(cfg.chromes||{}).forEach(chromeImg); FR.forEach(f=>f.chrome && chromeImg(f.chrome));
const chat = document.createElement('div'); chat.className='ag-chat';
Object.assign(chat.style,{left:CH.x+'px', top:CH.y+'px', width:CH.w+'px', height:CH.h+'px'});
const stack = document.createElement('div'); stack.className='ag-stack'; chat.appendChild(stack); phone.appendChild(chat);
const ov = document.createElement('div'); ov.className='ag-ov'; phone.appendChild(ov);
const notifs = {};
function notifImg(n){ if(notifs[n[0]]) return notifs[n[0]]; const M=META[n[0]], im=new Image(); im.className='ag-notif'; im.alt=''; im.src=SRC(n[0]);
  /* n = [key, x, y] in frame coordinates; the overlay is the phone screen at 17.8, 15.1 inside the 542, 150 phone */
  Object.assign(im.style,{left:(n[1]-542-17.8-M.pad)+'px', top:(n[2]-150-15.1-M.pad)+'px', width:(M.w+2*M.pad)+'px', height:(M.h+2*M.pad)+'px'});
  ov.appendChild(im); return notifs[n[0]]=im; }

/* ---------- tabs (one set: floats at the bottom of the block on phones, sits under the phone on desktop) ---------- */
const mtabs = document.createElement('nav'); mtabs.className='ag-mtabs'; mtabs.setAttribute('aria-label', cfg.tabsLabel||'Choose a story');
const mBtns = {};
TABS.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('aria-pressed','false');
  b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.icon}</svg><span class="lb">${t.label}</span>`;
  b.addEventListener('click',()=>goSection(i)); mtabs.appendChild(b); mBtns[t.key]=b; });

/* ---------- phones: the block reads top to bottom (title, phone, hint card, tabs) ---------- */
const pbox = document.createElement('div'); pbox.className='ag-pbox'; stage.before(pbox); pbox.appendChild(stage);
const mfoot = document.createElement('div'); mfoot.className='ag-mfoot';
mfoot.innerHTML = `<div class="ag-cap" aria-hidden="true"><div class="ag-col" data-side="l"></div><div class="ag-col" data-side="r"></div></div>`;
const mfin = sec.querySelector('template.ag-mobile-final');
if(mfin){ const d=document.createElement('div'); d.className='ag-stores'; d.appendChild(mfin.content.cloneNode(true)); mfoot.appendChild(d); }
pbox.after(mfoot); mfoot.after(mtabs);
const capCols = {l:mfoot.querySelector('[data-side="l"]'), r:mfoot.querySelector('[data-side="r"]')};
let rqF=0; function floatCheck(){ rqF=0; if(!M){ mtabs.classList.remove('float'); return; }
  const natural=mfoot.getBoundingClientRect().bottom+32+mtabs.offsetHeight, edge=innerHeight-24;
  mtabs.classList.toggle('float', natural>edge+1 && mtabs.getBoundingClientRect().top<innerHeight); }
addEventListener('scroll',()=>{ if(!rqF) rqF=requestAnimationFrame(floatCheck); },{passive:true});
new ResizeObserver(()=>{ if(!rqF) rqF=requestAnimationFrame(floatCheck); }).observe(mfoot);

let M=false, TWO=false;
const capNow={l:null, r:null};
function cardIn(im){ if(rm){ im.animate([{opacity:0},{opacity:1}],{duration:200,fill:'both'}); return; }
  im.animate([{opacity:0,transform:'translateY(10px) scale(.98)'},{opacity:1,transform:'none'}],{duration:480,easing:EASE,fill:'both'}); }
function cardOut(im){ im.getAnimations().forEach(a=>a.cancel());
  im.animate([{opacity:1,transform:'none'},{opacity:0,transform:rm?'none':'translateY(6px) scale(.98)'}],{duration:220,easing:'cubic-bezier(0.4, 0, 1, 1)',fill:'forwards'}).onfinish=()=>im.remove(); }
/* a card keeps its storyboard size, but never gets wider than the content column: the column takes the card's width
   (or the column's, if that is narrower) and the picture is scaled to it */
function cardFit(side, id){ const M_=META[id], col=capCols[side];
  const side0=16, avail=TWO ? (mfoot.clientWidth-2*side0-16)/2 : mfoot.clientWidth-2*side0;   /* 16px page gutter on each side */
  const k=Math.min(1, avail/M_.w); col.style.width=(M_.w*k)+'px'; return k; }
function cardImg(id, k){ const M_=META[id], im=new Image(); im.className='ag-card'; im.alt=''; im.decoding='async'; im.src=SRC(id);
  /* the export carries a margin for the shadow: place the card box at 0,0 and let the margin hang out */
  Object.assign(im.style,{left:(-M_.pad*k)+'px', top:(-M_.pad*k)+'px', width:((M_.w+2*M_.pad)*k)+'px'}); return im; }
function capPut(side, c){
  const cur=capNow[side];
  if(c && cur && cur.title===c[5]){ /* same hint, newer picture */
    if(cur.id!==c[0]){ const k=cardFit(side,c[0]), im=cardImg(c[0],k); capCols[side].appendChild(im);
      im.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease',fill:'both'});
      const old=cur.img; old.animate([{opacity:1},{opacity:0}],{duration:260,easing:'ease',fill:'forwards'}).onfinish=()=>old.remove();
      cur.img=im; cur.id=c[0]; cur.h=META[c[0]].h*k; footFit(); }
    return; }
  if(cur){ cardOut(cur.img); capNow[side]=null; }
  if(!c) return;
  const k=cardFit(side,c[0]), im=cardImg(c[0],k); capCols[side].appendChild(im); cardIn(im);
  capNow[side]={title:c[5], id:c[0], img:im, h:META[c[0]].h*k}; footFit();
}
function capClear(){ capPut('l',null); capPut('r',null); }
let footH=154;
function footFit(){
  if(sec.classList.contains('is-dl')) footH=cfg.mobileFinalHeight||92;
  else { const h=Math.max(capNow.l?capNow.l.h:0, capNow.r?capNow.r.h:0); if(h) footH=h; }
  sec.style.setProperty('--foot-h', footH+'px'); }
function capOut(i){ if(!M) return; const cs=i<0?[]:FR[i].c;
  for(const s of ['l','r']){ const n=capNow[s]; if(!n) continue;
    const c=cs.find(c=>c[5]===n.title); if(!c || (TWO && (c[1]<700?'l':'r')!==s)) capPut(s,null); } }
function capIn(i, prev){ if(!M) return []; const f=FR[i];
  if(TWO){ capPut('l', f.c.find(c=>c[1]<700)||null); capPut('r', f.c.find(c=>c[1]>=700)||null); return []; }
  const fresh=f.c.filter(c=>!prev.has(c[5])), cur=capNow.l, still=cur && f.c.find(c=>c[5]===cur.title);
  if(fresh.length){ capPut('l', fresh[0]); return fresh.slice(1); }
  capPut('l', still || f.c[0] || null); return [];
}

/* ---------- chat items ---------- */
const isCenter = k => /(^|_)sys|today|chips|join|_\d\d_$/.test(k);
const isMe = k => /claire|_you/.test(k);
function pic(key){ const m=META[key], im=new Image(); im.alt=''; im.decoding='async'; im.src=SRC(key);
  Object.assign(im.style,{left:-m.pad+'px',top:-m.pad+'px',width:(m.w+2*m.pad)+'px',height:(m.h+2*m.pad)+'px'}); return im; }
function item(key){ const m=META[key], d=document.createElement('div');
  d.className='ag-m'+(isCenter(key)?' c':'')+(isMe(key)?' me':''); d.style.width=m.w+'px'; d.style.height=m.h+'px'; d.dataset.k=key; d.appendChild(pic(key)); return d; }
/* typing: the next speaker's avatar (cut from their bubble) and a white pill with three dots, laid out like the Message component */
function typingItem(next){ const m=META[next], d=document.createElement('div'); d.className='ag-m ag-typ'; d.style.width=m.w+'px'; d.style.height='23px'; d.dataset.k='typ';
  const av=document.createElement('i'); av.className='ag-tav';
  Object.assign(av.style,{backgroundImage:`url("${SRC(next)}")`, backgroundSize:`${m.w+2*m.pad}px ${m.h+2*m.pad}px`, backgroundPosition:`${-m.pad}px ${-(m.pad+m.h-19.8)}px`});
  const pill=document.createElement('b'); pill.className='ag-tpill'; d.append(av, pill);
  [40.25,48.25,56.75].forEach((x,i)=>{ const s=document.createElement('i'); s.className='ag-dotty'; s.style.left=x+'px'; s.style.top='11.5px'; s.style.animationDelay=(i*.15)+'s'; d.appendChild(s); });
  return d; }
const find=k=>stack.querySelector(`[data-k="${k}"]`);
let Q=false; /* quiet: build a state instantly */
function glide(dy){ if(Q||rm||!dy) return; stack.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:420,easing:EASE}); }
function rise(el){ if(Q) return; if(rm){ el.animate([{opacity:0},{opacity:1}],{duration:200}); return; }
  el.style.transformOrigin=el.classList.contains('me')?'100% 100%':el.classList.contains('c')?'50% 100%':'0 100%';
  el.animate([{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'none'}],{duration:380,easing:EASE}); }
function add(el){ const h0=stack.offsetHeight; stack.appendChild(el); glide(stack.offsetHeight-h0); rise(el); return el; }
function replace(old, el){ const h0=stack.offsetHeight; old.replaceWith(el); glide(stack.offsetHeight-h0);
  if(!Q) el.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out'}); return el; }
function remove(el){ const h0=stack.offsetHeight; if(Q||rm){ el.remove(); return; }
  const a=el.animate([{opacity:1,transform:'none'},{opacity:0,transform:'scale(.96)'}],{duration:160,easing:'ease-in',fill:'forwards'});
  return new Promise(r=>a.onfinish=()=>{ el.remove(); glide(stack.offsetHeight-h0); r(); }); }
function restate(el, key, fade){ /* same bubble, new state: the box keeps its place, the picture cross-fades and the list follows the new height */
  const m=META[key], h0=stack.offsetHeight, old=el.querySelector('img'), im=pic(key);
  el.style.width=m.w+'px'; el.style.height=m.h+'px'; el.dataset.k=key; el.appendChild(im);
  glide(stack.offsetHeight-h0);
  if(Q||!fade){ old.remove(); return; }
  im.animate([{opacity:0},{opacity:1}],{duration:fade,easing:'ease-out'}).onfinish=()=>old.remove(); }
async function tap(el, x, y, wait){ if(Q||rm) return; const t=document.createElement('i'); t.className='ag-tap'; t.style.left=x+'px'; t.style.top=y+'px'; el.appendChild(t);
  el.animate([{transform:'none'},{transform:'scale(.985)'},{transform:'none'}],{duration:260,easing:'ease-out'});
  t.animate([{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1)',offset:.4},{opacity:0,transform:'scale(1.5)'}],{duration:520,easing:'ease-out'}).onfinish=()=>t.remove();
  await wait(260); }
let notifOn=null;
function notifShow(n){ for(const k in notifs){ const im=notifs[k]; im.getAnimations().forEach(a=>a.cancel()); im.style.opacity=0; im.style.transform='translateY(-160%)'; }
  notifOn=null; if(!n) return; const im=notifImg(n); notifOn=im; im.style.opacity=1; im.style.transform='none';
  if(!Q&&!rm) im.animate([{opacity:0,transform:'translateY(-160%)'},{opacity:1,transform:'none'}],{duration:520,easing:'cubic-bezier(0.32, 0.72, 0, 1)'}); }
function notifHide(){ const im=notifOn; if(!im) return; notifOn=null; if(Q||rm){ im.style.opacity=0; return; }
  im.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-160%)'}],{duration:360,easing:'cubic-bezier(0.4, 0, 1, 1)',fill:'forwards'}).onfinish=()=>{ im.getAnimations().forEach(a=>a.cancel()); im.style.opacity=0; im.style.transform='translateY(-160%)'; }; }

async function run(fid, wait){
  const ops=OPS[fid]||[];
  for(let i=0;i<ops.length;i++){
    const [t,a,b,c]=ops[i];
    if(t==='wait') await wait(a);
    else if(t==='me'){ add(item(a)); await wait(700); }
    else if(t==='add'){ add(item(a)); await wait(400); }
    else if(t==='typing'){ const nx=META[a]?a:(ops.slice(i+1).find(o=>o[0]==='reply')||[])[1]; if(nx){ add(typingItem(nx)); await wait(300); } }
    else if(t==='reply'){ const ty=stack.querySelector('.ag-typ'); const el=item(a); ty?replace(ty,el):add(el); await wait(450); }
    else if(t==='tap'){ const el=find(a); if(el) await tap(el,b,c,wait); }
    else if(t==='remove'){ const el=find(a); if(el) await remove(el); }
    else if(t==='state'){ const el=find(a); if(el) restate(el,b,c); await wait(c+120); }
    else if(t==='notif'){ notifShow(a); await wait(500); }
    else if(t==='unnotif'){ notifHide(); await wait(320); }
    else if(t==='chrome'){ setPhone(a); await wait(300); }
  }
}
function reset(tab){ stack.getAnimations().forEach(a=>a.cancel()); chat.getAnimations().forEach(a=>a.cancel()); stack.innerHTML=''; Q=true; (START[tab]||[]).forEach(k=>stack.appendChild(item(k))); Q=false; notifShow(null); }

/* ---------- callouts ---------- */
let uid=0;
function curve(bx,by,ax,ay){ const mx=(ax+bx)/2; return `M ${bx} ${by} C ${mx} ${by} ${mx} ${ay} ${ax} ${ay}`; }
function coImg(c){ const [id,x,y]=c, m=META[id], img=new Image(); img.className='ag-co'; img.alt=c[5]||''; img.src=SRC(id);
  Object.assign(img.style,{left:(x-m.pad)+'px', top:(y-Y-m.pad)+'px', width:(m.w+2*m.pad)+'px'}); return img; }
function build(c, l){
  const [id,x]=c, left=x<700;
  const img=coImg(c); img.style.transformOrigin = left ? '100% 0' : '0 0';
  const g={key:c[5]+'|'+c[1]+'|'+c[2], id, img, els:[img]};
  if(l){
    const [,ax,ay,bx,by]=l, d=curve(bx,by-Y,ax,ay-Y), m='agm'+(++uid);
    const mask=document.createElementNS(NS,'mask'); mask.id=m; mask.setAttribute('maskUnits','userSpaceOnUse');
    const mp=document.createElementNS(NS,'path'); mp.setAttribute('d',d); mp.setAttribute('fill','none'); mp.setAttribute('stroke','#fff'); mp.setAttribute('stroke-width','6');
    mp.setAttribute('pathLength','1'); mp.style.strokeDasharray='1'; mp.style.strokeDashoffset='0'; mask.appendChild(mp); defs.appendChild(mask);
    const p=document.createElementNS(NS,'path'); p.setAttribute('class','ln'); p.setAttribute('d',d); p.setAttribute('mask',`url(#${m})`); lines.appendChild(p);
    const dB=document.createElement('i'); dB.className='ag-dot'; dB.style.left=bx+'px'; dB.style.top=(by-Y)+'px';
    const dA=document.createElement('i'); dA.className='ag-dot'; dA.style.left=ax+'px'; dA.style.top=(ay-Y)+'px';
    Object.assign(g,{mask,mp,p,dA,dB,A:[ax,ay-Y],B:[bx,by-Y]}); g.els.push(p,dA,dB);
    pinTo(g);
  }
  coLayer.append(img, ...(g.dA?[g.dB,g.dA]:[]));
  return g;
}
function srect(el){ const s=stage.getBoundingClientRect(), k=s.width/1440, r=el.getBoundingClientRect(); return [(r.left-s.left)/k,(r.top-s.top)/k,r.width/k,r.height/k]; }
function pinTo(g){ /* find the bubble under the phone end of the line */
  const [bx,by]=g.B;
  for(const el of [...stack.children, ...(notifOn?[notifOn]:[])]){ const [x,y,w,h]=srect(el); if(bx>=x-2&&bx<=x+w+2&&by>=y-2&&by<=y+h+2){ g.pin={el,ox:bx-x,oy:by-y}; return; } }
}
const CHAT=[542+CH.x, 50+CH.y, 50+CH.y+CH.h];
function follow(){ for(const g of live.values()){ if(!g.pin) continue;
    const {el,ox,oy}=g.pin; if(!el.isConnected){ g.pin=null; continue; }
    const [x,y]=srect(el), bx=x+ox, by=y+oy;
    const hide = !el.classList.contains('ag-notif') && (by<CHAT[1]+6 || by>CHAT[2]-6);
    g.dB.style.visibility=g.p.style.visibility=hide?'hidden':'';
    if(Math.abs(bx-g.B[0])<.2 && Math.abs(by-g.B[1])<.2) continue;
    g.B=[bx,by]; const d=curve(bx,by,g.A[0],g.A[1]); g.p.setAttribute('d',d); g.mp.setAttribute('d',d); g.dB.style.left=bx+'px'; g.dB.style.top=by+'px'; } }
let rafF=0; function loopF(){ follow(); rafF=requestAnimationFrame(loopF); }
function enter(g, d){
  const o={fill:'both', easing:EASE};
  if(rm){ g.els.forEach(e=>e.animate([{opacity:0},{opacity:1}],{...o,duration:200,delay:d})); return; }
  if(g.dB){
    g.dB.animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{...o,duration:300,delay:d});
    g.mp.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{...o,duration:520,delay:d+80});
    g.dA.animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'none'}],{...o,duration:300,delay:d+480});
  }
  g.img.animate([{opacity:0,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'none'}],{...o,duration:500,delay:d+(g.dB?480:0)});
}
function leave(g){ /* the callout goes back the way it came: card drops, line retracts into the phone, dots shrink */
  const o={duration:220,easing:'cubic-bezier(0.4, 0, 1, 1)',fill:'forwards'};
  g.els.forEach(e=>{ const op=getComputedStyle(e).opacity; e.getAnimations().forEach(a=>a.cancel()); e.style.opacity=op; });
  if(g.mp) g.mp.getAnimations().forEach(a=>a.cancel());
  if(rm){ g.els.forEach(e=>e.animate([{opacity:e.style.opacity},{opacity:0}],o)); }
  else{
    g.img.animate([{opacity:g.img.style.opacity},{opacity:0,transform:'translateY(6px) scale(.98)'}],o);
    if(g.dA){ [g.dA,g.dB].forEach(d=>d.animate([{opacity:d.style.opacity},{opacity:0,transform:'scale(.3)'}],o));
      g.mp.animate([{strokeDashoffset:0},{strokeDashoffset:1}],o); }
  }
  setTimeout(()=>{ g.els.forEach(e=>e.remove()); g.mask&&g.mask.remove(); },240);
}
function swapCo(g, c){ if(g.id===c[0]) return;
  const old=g.img, im=coImg(c); im.style.transformOrigin=old.style.transformOrigin;
  coLayer.insertBefore(im, old); im.animate([{opacity:0},{opacity:1}],{duration:240,easing:'ease',fill:'both'});
  old.animate([{opacity:1},{opacity:0}],{duration:240,easing:'ease',fill:'forwards'}).onfinish=()=>old.remove();
  g.els[0]=g.img=im; g.id=c[0]; }

let live=new Map();
/* a callout keeps its identity by title and side, so a panel that only changes its picture (the process panel) cross-fades in place */
const keyOf=c=>(c[6]||c[5])+'|'+(c[1]<700?'l':'r');
const want=i=>{ const m=new Map(); (i<0?[]:FR[i].c).forEach(c=>m.set(keyOf(c), c)); return m; };
function coOut(i){ const w=want(i); for(const [k,g] of live) if(!w.has(k)){ leave(g); live.delete(k); } capOut(i); }
function coIn(i){ let d=0; const f=FR[i];
  for(const [k,c] of want(i)){ if(live.has(k)){ swapCo(live.get(k), c); continue; }
    const g=build(c, (f.l||[]).find(l=>l[0]===c[5])); live.set(k,g); enter(g, 60+d); d+=160; }
  sr.textContent = f.c.map(c=>c[5]).filter(Boolean).join('. ') || ''; }

/* ---------- which picture is in the phone ---------- */
let phoneNow=null;
function setPhone(k){ if(phoneNow===k) return; phoneNow=k; for(const kk in chromes) chromes[kk].classList.toggle('on', kk===k); }
function setChrome(tab){
  const fin = FIN>=0 && tab===SECS[FIN];
  setPhone((cfg.chromes||{})[tab] || (FR.find(f=>f.tab===tab)||{}).chrome);
  chat.classList.toggle('on', !!START[tab]); ov.classList.toggle('on', !!START[tab]);
  for(const k in mBtns) mBtns[k].setAttribute('aria-pressed', k===(tab==='intro'?SECS[0]:tab));
  tabCopyOnStage.forEach(el=>el.classList.toggle('on', el.dataset.tab===tab));
  if(tcopy) [...tcopy.children].forEach(el=>{ const on=el.dataset.tab===(tab==='intro'?SECS[0]:tab); el.classList.toggle('on', on); el.setAttribute('aria-hidden', !on); });
  copies.forEach(el=>{ if(el===copyDef) el.setAttribute('aria-hidden', M && fin); else el.setAttribute('aria-hidden', !(M && fin)); });
  sec.classList.toggle('is-dl', fin); if(cfg.purpleBody!==false) document.body.classList.toggle('ag-purple', fin && !M);
  footFit(); introFit(); }
function introFit(){
  if(!M){ sec.style.removeProperty('--intro-h'); return; }
  const pt=parseFloat(getComputedStyle(intro).paddingTop)||0;
  const fin=sec.classList.contains('is-dl'), alt=copies.find(c=>c!==copyDef);
  let h=((fin&&alt)?alt:copyDef).getBoundingClientRect().height;
  if(tcopy && !fin && tcopy.offsetParent) h+=tcopy.getBoundingClientRect().height + (parseFloat(getComputedStyle(tcopy).marginTop)||0);
  sec.style.setProperty('--intro-h', (pt+h)+'px'); }

/* ---------- playing ---------- */
const FRAMES=SECS.map(s=>FR.map((f,i)=>f.tab===s?i:-1).filter(i=>i>=0));
let cur=-2, runId=0, visible=true;
function stop(){ runId++; }
async function play(){
  const id=++runId, s=cur;
  if(s<0 || !visible || document.hidden) return;
  const wait=ms=>new Promise((res,rej)=>setTimeout(()=>id===runId?res():rej('stop'), rm?Math.min(ms,60):ms));
  const tab=SECS[s], list=FRAMES[s];
  try{
    if(!START[tab]){ if(list.length){ coOut(list[0]); coIn(list[0]); } return; }
    for(;;){
      reset(tab); setPhone(FR[list[0]].chrome || (cfg.chromes||{})[tab]);
      if(!rm) chat.animate([{opacity:0},{opacity:1}],{duration:250,easing:'ease-out'});
      await wait(500);
      let prev=new Set();
      for(const i of list){
        const fid=FR[i].id;
        coOut(i);
        await run(fid, wait);
        await wait(200); coIn(i);
        let hold=HOLD[fid] || 2600;
        for(const c of capIn(i, prev)){ await wait(Math.max(2000, hold*.6)); capPut('l', c); hold=Math.max(hold, 2600); }
        await wait(hold);
        prev=new Set(FR[i].c.map(c=>c[5]));
      }
      coOut(-1); notifShow(null);
      if(!rm) await new Promise(r=>chat.animate([{opacity:1},{opacity:0}],{duration:300,easing:'ease-in',fill:'forwards'}).onfinish=r);
      if(id!==runId) return;
      if(M){ setSection((s+1)%NONFIN); return; }  /* no scroll picks the story on phones, so the next one follows by itself */
    }
  }catch(e){}
}
function setSection(s){
  if(s===cur) return; cur=s; stop();
  coOut(-1);
  const tab=s<0?'intro':SECS[s];
  setChrome(tab); reset(START[tab]?tab:''); /* the story's first state is there at once, even before it starts playing */
  if(s<0){ sr.textContent=''; return; }
  play();
}

let STEP=600, lockTo=-1, lockUntil=0;
function goSection(s, jump){
  if(M){ setSection(s); if(jump) scrollTo({top: sec.getBoundingClientRect().top+scrollY, behavior: rm?'auto':'smooth'}); return; }
  lockTo=s; lockUntil=performance.now()+1500; setSection(s); scrollTo({top: track.getBoundingClientRect().top+scrollY+s*STEP+2, behavior: rm?'auto':'smooth'}); }
const navEl=document.querySelector('.nav');
function layout(){
  const vw=innerWidth, vh=innerHeight;
  const m = vw<900 || (vw<=1100 && vh>vw*1.15);   /* phones, and tablets held upright: the flowing layout */
  if(m!==M){ M=m; capClear(); cur=-2; }
  sec.classList.toggle('m', M);
  if(M){
    const two=vw>=600; if(two!==TWO){ TWO=two; capClear(); } mfoot.classList.toggle('two', TWO);
    const k = TWO ? Math.min(.95, Math.max(.6, (vh-140)/724)) : Math.min(.8, .72*vw/360);
    sec.style.setProperty('--k', k); stage.style.setProperty('--k', k);
    track.style.height=''; track.style.marginTop='';
    if(cur<0) setSection(0);
    introFit(); return;
  }
  introFit();
  const NAV=navEl ? navEl.offsetHeight : 84, avail=vh-NAV;
  const k=Math.min(vw/Math.min(1440, Math.max(1244, vw)), avail/900, 1.2);
  stage.style.setProperty('--k', k); sec.style.setProperty('--k', k);
  STEP=Math.round(vh*0.9);
  track.style.height=(SECS.length*STEP+vh)+'px';
  track.style.marginTop = (40 - (NAV + (avail-900*k)/2 + 50*k))+'px';   /* phone top sits 40px under the intro text */
  onScroll();
}
function onScroll(){
  if(M) return;
  const y=-track.getBoundingClientRect().top, s=y<0 ? -1 : Math.min(SECS.length-1, Math.floor(y/STEP));
  if(lockTo>=0 && performance.now()<lockUntil && s!==lockTo) return;
  lockTo=-1; setSection(s);
}
let raf=0;
addEventListener('scroll',()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; onScroll(); }); },{passive:true});
addEventListener('resize', layout);
new IntersectionObserver(([e])=>{ const v=e.isIntersecting; if(v===visible) return; visible=v; if(v){ play(); if(!rafF) loopF(); } else { stop(); cancelAnimationFrame(rafF); rafF=0; } },{threshold:0}).observe(track);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) play(); else stop(); });
loopF();
layout();
return { goFinal:(jump)=>{ if(FIN>=0) goSection(FIN, jump); }, goSection };
};
})();
