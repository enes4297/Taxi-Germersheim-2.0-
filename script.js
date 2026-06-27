
/* Taxi Germersheim App – V2.8.2
   Single Navigation Source of Truth
   Fixes: Why Taxi -> Google Reviews -> Back loop
*/

(function(){
  "use strict";

  const TG = {
    stack: [],
    restoring: false,
    initialized: false
  };

  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function qs(sel, root=document){ return root.querySelector(sel); }

  function screens(){ return qsa(".screen"); }

  function activeScreen(){
    return qs(".screen.active") || document.getElementById("home") || screens()[0] || null;
  }

  function activeId(){
    const s = activeScreen();
    return s ? s.id : "home";
  }

  function scrollYNow(){
    return window.scrollY || document.documentElement.scrollTop || 0;
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
    const selector = ".bottom-nav a,.bottom-nav button,.tabbar a,.tabbar button,.nav-item,.bottom-tab,[data-tab],[data-go]";
    qsa(selector).forEach(el => {
      const raw = (el.dataset.tab || el.dataset.go || el.getAttribute("href") || "").replace("#","");
      const on = wanted && (raw === wanted || raw === id || tabFor(raw) === wanted);
      el.classList.toggle("active", !!on);
      el.classList.toggle("is-active", !!on);
      if(on) el.setAttribute("aria-current","page");
      else el.removeAttribute("aria-current");
    });
  }

  function showScreen(id, y=0){
    const target = document.getElementById(id);
    if(!target) return false;

    screens().forEach(s => s.classList.remove("active","is-active-screen"));
    target.classList.add("active","is-active-screen");

    document.body.dataset.screen = id;
    updateTabs(id);

    requestAnimationFrame(() => {
      window.scrollTo({ top: y || 0, behavior: "auto" });
    });

    return true;
  }

  function pushCurrent(nextId){
    const id = activeId();
    if(!id || id === nextId) return;

    const entry = { id, y: scrollYNow() };
    const last = TG.stack[TG.stack.length - 1];

    if(last && last.id === entry.id){
      last.y = entry.y;
    } else {
      TG.stack.push(entry);
    }

    // remove same screen duplicates in a row
    TG.stack = TG.stack.filter((item, i, arr) => i === 0 || item.id !== arr[i-1].id);

    // hard remove ping-pong patterns: A,B,A -> A
    for(let i = TG.stack.length - 3; i >= 0; i--){
      const a = TG.stack[i], b = TG.stack[i+1], c = TG.stack[i+2];
      if(a && b && c && a.id === c.id && a.id !== b.id){
        TG.stack.splice(i+1, 2);
      }
    }

    if(TG.stack.length > 50) TG.stack = TG.stack.slice(-50);
  }

  function goTo(id, options={}){
    if(!id || !document.getElementById(id)) return false;

    if(!TG.restoring && options.push !== false){
      pushCurrent(id);
    }

    return showScreen(id, 0);
  }

  function goBack(){
    const current = activeId();

    let prev = TG.stack.pop();

    while(prev && (!prev.id || prev.id === current || !document.getElementById(prev.id))){
      prev = TG.stack.pop();
    }

    TG.restoring = true;

    if(prev){
      showScreen(prev.id, prev.y || 0);
    } else {
      showScreen("home", 0);
    }

    setTimeout(() => { TG.restoring = false; }, 150);
  }

  // Global compatibility for existing inline/older code
  window.tgGoTo = goTo;
  window.tgGoBack = goBack;
  window.showScreen = function(id){ return goTo(id); };

  // Block old browser history behavior inside app
  window.addEventListener("popstate", function(e){
    e.preventDefault();
    goBack();
  });

  function initDirectionButtons(){
    document.addEventListener("click", function(e){
      const btn = e.target.closest("[data-direction-choice]");
      if(!btn) return;

      const wrap = btn.closest(".ride-direction-v280");
      if(!wrap) return;

      wrap.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wrap.dataset.direction = btn.dataset.directionChoice;

      const round = qs(".roundtrip-toggle");
      const repeat = qs(".repeat-toggle");
      if(round) round.classList.toggle("active", btn.dataset.directionChoice === "roundtrip");
      if(repeat) repeat.classList.toggle("active", btn.dataset.directionChoice === "repeat");
    });
  }

  function initBookingFieldStates(){
    function update(){
      qsa(".booking-field input, .profile-form-v260 input").forEach(input => {
        const wrap = input.closest(".booking-field") || input.closest("label");
        if(wrap) wrap.classList.toggle("has-value", !!input.value.trim());
      });
    }
    document.addEventListener("input", update);
    update();
  }

  function initYumakGreeting(){
    const target = qs(".yumak-dynamic-greeting");
    if(!target) return;
    const greetings = [
      "Willkommen zurück.",
      "Bereit für deine nächste Fahrt?",
      "Schön, dass du wieder da bist.",
      "Ich bin da, wenn du Hilfe brauchst."
    ];
    target.textContent = greetings[Math.floor(Date.now() / 1800000) % greetings.length];
  }

  function initClickRouter(){
    document.addEventListener("click", function(e){
      const back = e.target.closest("[data-back], .js-back, .back-button");
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

  function init(){
    if(TG.initialized) return;
    TG.initialized = true;

    initClickRouter();
    initDirectionButtons();
    initBookingFieldStates();
    initYumakGreeting();

    updateTabs(activeId());
    document.body.dataset.screen = activeId();

    // reset stack on fresh load to prevent old bad session loops
    TG.stack = [];
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
