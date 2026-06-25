const screens=[...document.querySelectorAll('.screen')];
const nav=[...document.querySelectorAll('.bottom-nav button')];
function go(id){
  screens.forEach(s=>s.classList.toggle('active',s.id===id));
  nav.forEach(b=>b.classList.toggle('active',b.dataset.go===id || (id==='booking'&&b.dataset.go==='home')));
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-go]'); if(t) go(t.dataset.go);});
setTimeout(()=>{ if(document.querySelector('#splash.active')) document.querySelector('.particle-field')?.classList.add('burst'); },700);
