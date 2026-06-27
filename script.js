
/* Taxi Germersheim App – V2.8.3 Emergency Visible Fix
   Makes app visible after splash and fixes back/navigation without killing existing app logic.
*/
(function(){
  "use strict";

  let stack = [];
  let booted = false;

  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function qs(sel, root=document){ return root.querySelector(sel); }
  function screens(){ return qsa(".screen"); }

  function firstRealScreen(){
    return document.getElementById("home")
      || document.getElementById("start")
      || screens().find(s => !/splash|loader|loading/i.test(s.id || s.className))
      || screens()[0]
      || null;
  }

  function activeScreen(){
    return qs(".screen.active") || qs(".screen.is-active-screen") || firstRealScreen();
  }

  function activeId(){
    const s = activeScreen();
    return s ? s.id : "home";
  }

  function y(){ return window.scrollY || document.documentElement.scrollTop || 0; }

  function tabFor(id){
    const map = {home:"home",start:"home",booking:"booking",buchen:"booking",yumak:"yumak",rewards:"rewards",profile:"profile",profil:"profile"};
    return map[id] || null;
  }

  function updateTabs(id){
    const wanted = tabFor(id);
    qsa(".bottom-nav a,.bottom-nav button,.tabbar a,.tabbar button,.nav-item,.bottom-tab,[data-tab],[data-go]").forEach(el => {
      const raw = (el.dataset.tab || el.dataset.go || el.getAttribute("href") || "").replace("#","");
      const on = wanted && (raw === wanted || raw === id || tabFor(raw) === wanted);
      el.classList.toggle("active", !!on);
      el.classList.toggle("is-active", !!on);
      if(on) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
    });
  }

  function hideSplash(){
    qsa(".splash,#splash,.splash-screen,.loader,.loading-screen").forEach(el => {
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
    document.body.classList.add("tg-ready");
  }

  function show(id, scrollY){
    const target = document.getElementById(id);
    if(!target) return false;

    screens().forEach(s => {
      s.classList.remove("active","is-active-screen");
      s.style.display = "none";
    });

    target.classList.add("active","is-active-screen");
    target.style.display = "block";
    target.style.visibility = "visible";
    target.style.opacity = "1";

    document.body.dataset.screen = id;
    updateTabs(id);
    hideSplash();

    requestAnimationFrame(() => window.scrollTo({top: scrollY || 0, behavior:"auto"}));
    return true;
  }

  function ensureVisible(){
    hideSplash();

    const active = activeScreen();
    if(active && active.id){
      show(active.id, y());
    } else {
      const first = firstRealScreen();
      if(first && first.id) show(first.id, 0);
    }
  }

  function pushCurrent(nextId){
    const id = activeId();
    if(!id || id === nextId) return;
    const item = {id:id, y:y()};
    const last = stack[stack.length - 1];
    if(last && last.id === item.id) last.y = item.y;
    else stack.push(item);

    // prevent A-B-A ping pong
    for(let i = stack.length - 3; i >= 0; i--){
      const a=stack[i], b=stack[i+1], c=stack[i+2];
      if(a && b && c && a.id === c.id && a.id !== b.id){
        stack.splice(i+1,2);
      }
    }
    if(stack.length > 40) stack = stack.slice(-40);
  }

  function goTo(id){
    if(!id || !document.getElementById(id)) return false;
    pushCurrent(id);
    return show(id,0);
  }

  function goBack(){
    const current = activeId();
    let prev = stack.pop();
    while(prev && (!prev.id || prev.id === current || !document.getElementById(prev.id))){
      prev = stack.pop();
    }
    if(prev) show(prev.id, prev.y || 0);
    else show((firstRealScreen() && firstRealScreen().id) || "home", 0);
  }

  window.tgGoTo = goTo;
  window.tgGoBack = goBack;
  window.showScreen = function(id){ return goTo(id); };

  function initRouter(){
    if(booted) return;
    booted = true;

    document.addEventListener("click", function(e){
      const back = e.target.closest("[data-back],.js-back,.back-button");
      if(back){
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        goBack(); return false;
      }

      const go = e.target.closest("[data-go]");
      if(go){
        const id = go.dataset.go;
        if(id && document.getElementById(id)){
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          goTo(id); return false;
        }
      }

      const link = e.target.closest('a[href^="#"]');
      if(link){
        const id = link.getAttribute("href").replace("#","");
        if(id && document.getElementById(id)){
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          goTo(id); return false;
        }
      }
    }, true);

    ensureVisible();
    setTimeout(ensureVisible, 700);
    setTimeout(ensureVisible, 1600);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initRouter);
  else initRouter();
})();
