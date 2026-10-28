/* Shared by every page: the header and its Personal / Business switch. */

/* header: shown at the very top of the page and after the cover; hidden while the cover is being scrolled */
function TMAINav(cover){
  const nav=document.querySelector('.nav'); if(!nav) return;
  if(!cover){ nav.classList.add('show'); return; }
  let gone=false, rq=0;
  const upd=()=>{ rq=0; nav.classList.toggle('show', gone || scrollY<8); };
  new IntersectionObserver(([e])=>{ gone=!e.isIntersecting; upd(); },{rootMargin:'-80px 0px 0px 0px'}).observe(cover);
  addEventListener('scroll',()=>{ if(!rq) rq=requestAnimationFrame(upd); },{passive:true}); upd();
}

/* Personal / Business: the same pill as the story tabs. Tapping the other side moves the accent there first,
   then the other page opens, so the switch reads as one control across both pages. */
document.addEventListener('click', e=>{
  const a=e.target.closest('.pswitch a'); if(!a || a.getAttribute('aria-current')==='page') return;
  if(e.metaKey || e.ctrlKey || e.shiftKey || e.button!==0) return;
  e.preventDefault();
  const sw=a.closest('.pswitch'); sw.querySelectorAll('a').forEach(x=>x.removeAttribute('aria-current')); a.setAttribute('aria-current','page');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(()=>{ location.href=a.href; }, reduce?0:220);
});
/* coming back with the browser's back button restores the page from cache with the switch as it was left: put it right */
addEventListener('pageshow', e=>{ if(!e.persisted) return;
  document.querySelectorAll('.pswitch a').forEach(a=>{ const here=a.dataset.page===document.body.dataset.page; here?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'); }); });
