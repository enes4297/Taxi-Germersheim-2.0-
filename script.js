
/* =========================================================
   V2.9.0 – Taxi Germersheim App Controller
   Single Source: visibility, navigation, back stack, active tab
   ========================================================= */
(function(){
  "use strict";

  const TG = {
    stack: [],
    booted: false
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function screens(){
    return $$(".screen");
  }

  function appScreens(){
    return screens().filter(s => !/splash|loader|loading|intro/i.test((s.id || "") + " " + (s.className || "")));
  }

  function firstScreen(){
    return document.getElementById("home")
      || document.getElementById("start")
      || appScreens()[0]
      || screens()[0]
      || null;
  }

  function activeScreen(){
    return $(".screen.active") || $(".screen.is-active-screen") || firstScreen();
  }

  function activeId(){
    const s = activeScreen();
    return s ? s.id : "home";
  }

  function currentY(){
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function hideSplash(){
    document.body.classList.add("tg-app-ready");
    $$(".splash,#splash,.splash-screen,.intro,.intro-screen,.loader,.loading,.loading-screen").forEach(el => {
      el.style.display = "none";
      el.style.visibility = "hidden";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
  }

  function tabFor(id){
    const map = {
      home: "home",
      start: "home",
      booking: "booking",
      buchen: "booking",
      yumak: "yumak",
      rewards: "rewards",
      profile: "profile",
      profil: "profile"
    };
    return map[id] || null;
  }

  function updateTabs(id){
    const wanted = tabFor(id);
    $$(".bottom-nav a,.bottom-nav button,.tabbar a,.tabbar button,.nav-item,.bottom-tab,[data-tab],[data-go]").forEach(el => {
      const raw = (el.dataset.tab || el.dataset.go || el.getAttribute("href") || "").replace("#","");
      const on = wanted && (raw === wanted || raw === id || tabFor(raw) === wanted);
      el.classList.toggle("active", !!on);
      el.classList.toggle("is-active", !!on);
      if(on) el.setAttribute("aria-current","page");
      else el.removeAttribute("aria-current");
    });
  }

  function show(id, y=0){
    const target = document.getElementById(id);
    if(!target) return false;

    appScreens().forEach(s => {
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

    requestAnimationFrame(() => {
      window.scrollTo({top: y || 0, behavior: "auto"});
    });

    return true;
  }

  function pushCurrent(nextId){
    const id = activeId();
    if(!id || id === nextId) return;

    const item = { id, y: currentY() };
    const last = TG.stack[TG.stack.length - 1];

    if(last && last.id === item.id){
      last.y = item.y;
    } else {
      TG.stack.push(item);
    }

    // remove direct duplicates
    TG.stack = TG.stack.filter((item, i, arr) => i === 0 || item.id !== arr[i-1].id);

    // remove ping-pong loops A>B>A
    for(let i = TG.stack.length - 3; i >= 0; i--){
      const a = TG.stack[i], b = TG.stack[i+1], c = TG.stack[i+2];
      if(a && b && c && a.id === c.id && a.id !== b.id){
        TG.stack.splice(i + 1, 2);
      }
    }

    if(TG.stack.length > 50) TG.stack = TG.stack.slice(-50);
  }

  function goTo(id){
    if(!id || !document.getElementById(id)) return false;
    pushCurrent(id);
    return show(id, 0);
  }

  function goBack(){
    const current = activeId();
    let prev = TG.stack.pop();

    while(prev && (!prev.id || prev.id === current || !document.getElementById(prev.id))){
      prev = TG.stack.pop();
    }

    if(prev){
      return show(prev.id, prev.y || 0);
    }

    const first = firstScreen();
    return first ? show(first.id, 0) : false;
  }

  function ensureVisible(){
    hideSplash();

    const active = activeScreen();
    if(active && active.id){
      show(active.id, currentY());
      return;
    }

    const first = firstScreen();
    if(first && first.id){
      show(first.id, 0);
    }
  }

  function initRideDirection(){
    document.addEventListener("click", function(e){
      const btn = e.target.closest("[data-direction-choice]");
      if(!btn) return;

      const wrap = btn.closest(".ride-direction-v290,.ride-direction-v280");
      if(!wrap) return;

      wrap.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wrap.dataset.direction = btn.dataset.directionChoice;

      const round = $(".roundtrip-toggle");
      const repeat = $(".repeat-toggle");
      if(round) round.classList.toggle("active", btn.dataset.directionChoice === "roundtrip");
      if(repeat) repeat.classList.toggle("active", btn.dataset.directionChoice === "repeat");
    }, true);
  }

  function initFieldStates(){
    function update(){
      $$(".booking-field input, .profile-form-v260 input").forEach(input => {
        const wrap = input.closest(".booking-field") || input.closest("label");
        if(wrap) wrap.classList.toggle("has-value", !!input.value.trim());
      });
    }
    document.addEventListener("input", update);
    update();
  }

  function initRouter(){
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
        if(id && document.getElementById(id)){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          goTo(id);
          return false;
        }
      }

      const link = e.target.closest('a[href^="#"]');
      if(link){
        const id = link.getAttribute("href").replace("#","");
        if(id && document.getElementById(id)){
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
    if(TG.booted) return;
    TG.booted = true;

    initRouter();
    initRideDirection();
    initFieldStates();

    ensureVisible();
    setTimeout(ensureVisible, 300);
    setTimeout(ensureVisible, 900);
    setTimeout(ensureVisible, 1800);
  }

  window.tgGoTo = goTo;
  window.tgGoBack = goBack;
  window.showScreen = function(id){ return goTo(id); };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
