



/* =========================================================
   V2.9.1 – Non-destructive Router Fix
   Bottom nav stays visible + Google Bewertungen back-loop fix
   ========================================================= */
(function(){
  "use strict";

  const TG_NAV = { stack: [], ready:false };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function allScreens(){
    return $$(".screen");
  }

  function activeScreen(){
    return $(".screen.active") || $(".screen.is-active-screen") || $("#home") || $("#start") || allScreens()[0];
  }

  function activeId(){
    const s = activeScreen();
    return s ? s.id : "home";
  }

  function scrollNow(){
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function screenExists(id){
    return !!document.getElementById(id);
  }

  function tabFor(id){
    const map = {home:"home",start:"home",booking:"booking",buchen:"booking",yumak:"yumak",rewards:"rewards",profile:"profile",profil:"profile"};
    return map[id] || null;
  }

  function updateBottomNav(id){
    const wanted = tabFor(id);
    $$(".bottom-nav a,.bottom-nav button,.tabbar a,.tabbar button,.nav-item,.bottom-tab,[data-tab],[data-go]").forEach(el => {
      const raw = (el.dataset.tab || el.dataset.go || el.getAttribute("href") || "").replace("#","");
      const active = wanted && (raw === wanted || raw === id || tabFor(raw) === wanted);
      el.classList.toggle("active", !!active);
      el.classList.toggle("is-active", !!active);
      if(active) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
    });
  }

  function hideSplashOnly(){
    document.body.classList.add("tg-ready");
    $$(".splash,#splash,.splash-screen,.intro,.intro-screen,.loader,.loading-screen,.loading").forEach(el => {
      el.style.opacity = "0";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      el.style.display = "none";
    });
  }

  function ensureBottomNav(){
    const nav = $(".bottom-nav") || $(".tabbar") || $(".bottom-tabs");
    if(nav){
      nav.style.display = "";
      nav.style.visibility = "visible";
      nav.style.opacity = "1";
      nav.style.pointerEvents = "auto";
      nav.style.position = nav.style.position || "fixed";
      nav.style.zIndex = "9999";
    }
  }

  function show(id, y){
    const target = document.getElementById(id);
    if(!target) return false;

    allScreens().forEach(s => {
      s.classList.remove("active","is-active-screen");
      s.style.display = "none";
    });

    target.classList.add("active","is-active-screen");
    target.style.display = "block";
    target.style.visibility = "visible";
    target.style.opacity = "1";

    document.body.dataset.screen = id;
    updateBottomNav(id);
    hideSplashOnly();
    ensureBottomNav();

    requestAnimationFrame(() => window.scrollTo({top: y || 0, behavior:"auto"}));
    return true;
  }

  function cleanStack(){
    // remove consecutive duplicates
    TG_NAV.stack = TG_NAV.stack.filter((item, i, arr) => i === 0 || item.id !== arr[i-1].id);

    // remove A-B-A loop
    for(let i = TG_NAV.stack.length - 3; i >= 0; i--){
      const a = TG_NAV.stack[i], b = TG_NAV.stack[i+1], c = TG_NAV.stack[i+2];
      if(a && b && c && a.id === c.id && a.id !== b.id){
        TG_NAV.stack.splice(i+1, 2);
      }
    }
  }

  function pushCurrent(nextId){
    const id = activeId();
    if(!id || id === nextId) return;

    const item = {id:id, y:scrollNow()};
    const last = TG_NAV.stack[TG_NAV.stack.length - 1];

    if(last && last.id === item.id) last.y = item.y;
    else TG_NAV.stack.push(item);

    cleanStack();
    if(TG_NAV.stack.length > 50) TG_NAV.stack = TG_NAV.stack.slice(-50);
  }

  function goTo(id){
    if(!id || !screenExists(id)) return false;
    pushCurrent(id);
    return show(id, 0);
  }

  function goBack(){
    const current = activeId();
    let prev = TG_NAV.stack.pop();

    while(prev && (!prev.id || prev.id === current || !screenExists(prev.id))){
      prev = TG_NAV.stack.pop();
    }

    if(prev) return show(prev.id, prev.y || 0);

    const fallback = $("#home") || $("#start") || allScreens()[0];
    if(fallback && fallback.id) return show(fallback.id, 0);
    return false;
  }

  // override old handlers
  window.showScreen = function(id){ return goTo(id); };
  window.tgGoTo = goTo;
  window.tgGoBack = goBack;

  function initRideDirections(){
    document.addEventListener("click", function(e){
      const btn = e.target.closest("[data-direction-choice]");
      if(!btn) return;

      const wrap = btn.closest(".ride-direction-v291,.ride-direction-v290,.ride-direction-v280");
      if(!wrap) return;

      wrap.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wrap.dataset.direction = btn.dataset.directionChoice;
    }, true);
  }

  function captureRouter(){
    document.addEventListener("click", function(e){
      const back = e.target.closest("[data-back],.js-back,.back-button");
      if(back){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        goBack();
        return false;
      }

      const go = e.target.closest("[data-go]");
      if(go){
        const id = go.dataset.go;
        if(id && screenExists(id)){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          goTo(id);
          return false;
        }
      }

      const href = e.target.closest('a[href^="#"]');
      if(href){
        const id = href.getAttribute("href").replace("#","");
        if(id && screenExists(id)){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          goTo(id);
          return false;
        }
      }
    }, true);
  }

  function boot(){
    if(TG_NAV.ready) return;
    TG_NAV.ready = true;

    hideSplashOnly();
    ensureBottomNav();

    const current = activeScreen();
    if(current && current.id) show(current.id, scrollNow());
    else {
      const home = $("#home") || $("#start") || allScreens()[0];
      if(home && home.id) show(home.id, 0);
    }

    captureRouter();
    initRideDirections();

    setTimeout(ensureBottomNav, 300);
    setTimeout(() => { hideSplashOnly(); ensureBottomNav(); updateBottomNav(activeId()); }, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
