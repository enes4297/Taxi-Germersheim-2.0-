/* Taxi Germersheim – script.js V2.9.2
   Only controls intro timing. Navigation is fixed at the end of index.html.
*/
(function(){
  function finishSplash(){
    document.body.classList.add("splash-finished", "app-started");
    const splash = document.getElementById("simpleSplash") || document.querySelector(".splash");
    if(splash){
      splash.style.display = "none";
      splash.style.visibility = "hidden";
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(finishSplash, 2850);
      setTimeout(finishSplash, 4200);
    });
  } else {
    setTimeout(finishSplash, 2850);
    setTimeout(finishSplash, 4200);
  }
})();


/* =========================================================
   V2.9.4 – Booking Hardfix
   Fahrttyp sauber, Bottombar stabil, keine Doppelicons
   ========================================================= */
(function(){
  "use strict";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  const TYPES = {
    taxi: {label:"Normale Taxifahrt", short:"Taxi", icon:"taxi"},
    medical: {label:"Krankenfahrt", short:"Krankenfahrt", icon:"medical"},
    wheelchair: {label:"Rollstuhlfahrt", short:"Rollstuhl", icon:"wheelchair"},
    airport: {label:"Flughafentransfer", short:"Flughafen", icon:"airport"}
  };

  function normalizeType(raw){
    raw = (raw || "").toLowerCase();
    if(raw.includes("medical") || raw.includes("kranken")) return "medical";
    if(raw.includes("wheel") || raw.includes("rollstuhl")) return "wheelchair";
    if(raw.includes("airport") || raw.includes("flug")) return "airport";
    if(raw.includes("taxi")) return "taxi";
    return null;
  }

  function typeFromText(text){
    text = (text || "").toLowerCase();
    if(text.includes("kranken")) return "medical";
    if(text.includes("rollstuhl")) return "wheelchair";
    if(text.includes("flug")) return "airport";
    if(text.includes("taxi")) return "taxi";
    return null;
  }

  function forceBottomNav(){
    const nav = $(".bottom-nav");
    if(!nav) return;
    nav.style.display = "grid";
    nav.style.visibility = "visible";
    nav.style.opacity = "1";
    nav.style.pointerEvents = "auto";
    nav.style.position = "fixed";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.bottom = "0";
    nav.style.width = "100%";
    nav.style.maxWidth = "100%";
    nav.style.margin = "0";
    nav.style.transform = "none";
    nav.style.zIndex = "99999";
  }

  function setType(type){
    type = normalizeType(type) || "taxi";
    const data = TYPES[type];
    document.body.dataset.rideType = type;
    try{ sessionStorage.setItem("tg_selected_ride_type", type); }catch(e){}

    const badge = $(".selected-ride-type-v293 strong, .selected-ride-type-v294 strong");
    if(badge) badge.textContent = data.label;

    // Older selected cards/headings
    $$(".selected-ride-type-v293, .selected-ride-type-v294, .booking-selected-type, .current-ride-type").forEach(card=>{
      card.dataset.rideType = type;
      const h = card.querySelector("h3,strong,b");
      if(h) h.textContent = data.label;
    });

    // Existing large selected label cards
    $$("#booking h1,#booking h2,#booking h3,#booking strong,#booking b").forEach(el=>{
      const t = el.textContent.trim();
      if(["Normale Taxifahrt","Krankenfahrt","Rollstuhlfahrt","Flughafentransfer","Taxi"].includes(t)){
        el.textContent = data.label;
      }
    });

    $$(".booking-type-grid button,.ride-type-grid button,.fahrt-type-grid button,[data-type],[data-ride-type]").forEach(btn=>{
      const raw = btn.dataset.type || btn.dataset.rideType || btn.dataset.go || "";
      const btnType = normalizeType(raw) || typeFromText(btn.textContent);
      btn.classList.toggle("active", btnType === type);
      btn.classList.toggle("is-active", btnType === type);
    });

    normalizeTypeButtons();
    normalizeDetailChips();
  }

  function makeIcon(kind){
    return `<span class="tg-clean-icon tg-clean-${kind}" aria-hidden="true"></span>`;
  }

  function normalizeTypeButtons(){
    $$(".booking-type-grid button,.ride-type-grid button,.fahrt-type-grid button,[data-type],[data-ride-type]").forEach(btn=>{
      const raw = btn.dataset.type || btn.dataset.rideType || btn.dataset.go || "";
      const type = normalizeType(raw) || typeFromText(btn.textContent);
      if(!type || !TYPES[type]) return;

      btn.classList.add("tg-type-clean-btn");
      btn.dataset.cleanType = type;
      btn.innerHTML = `${makeIcon(TYPES[type].icon)}<b>${TYPES[type].short}</b>`;
    });
  }

  function normalizeDetailChips(){
    const labels = [
      {match:/gepäck|koffer/i, text:"Gepäck", icon:"luggage"},
      {match:/kindersitz/i, text:"Kindersitz", icon:"child"},
      {match:/rollstuhl/i, text:"Rollstuhl", icon:"wheelchair"},
      {match:/haustier|tier/i, text:"Haustier", icon:"pet"},
      {match:/mehr als 4|fahrgäste|personen/i, text:"Mehr als 4 Fahrgäste", icon:"people"}
    ];

    $$(".ride-options button,.fahrt-details button,.detail-chips button,.booking-details button").forEach(btn=>{
      const original = btn.textContent || "";
      const item = labels.find(x=>x.match.test(original));
      if(!item) return;
      btn.classList.add("tg-detail-clean-btn");
      btn.innerHTML = `${makeIcon(item.icon)}<b>${item.text}</b>`;
    });
  }

  function unlockTypeChoice(){
    $$(".booking-type-grid,.ride-type-grid,.fahrt-type-grid").forEach(grid=>{
      grid.style.display = "grid";
      grid.style.visibility = "visible";
      grid.style.opacity = "1";
      grid.style.pointerEvents = "auto";
      grid.classList.remove("hidden","is-hidden","locked","is-locked");
    });
  }

  function scrollToTypes(){
    const target = $(".booking-type-grid,.ride-type-grid,.fahrt-type-grid,[data-booking-types]");
    if(target){
      target.scrollIntoView({behavior:"smooth", block:"center"});
    }
  }

  function interceptHomeServiceClicks(e){
    const card = e.target.closest(".service-card,[data-go]");
    if(!card) return;

    const go = card.dataset.go || "";
    const text = card.textContent || "";
    const type = normalizeType(go) || typeFromText(text);
    if(!type) return;

    setType(type);

    // If clicking a service card that points to selection pages, preserve app behavior,
    // but booking page will still know correct type.
  }

  function init(){
    forceBottomNav();
    unlockTypeChoice();

    let saved = "taxi";
    try{ saved = sessionStorage.getItem("tg_selected_ride_type") || saved; }catch(e){}
    setType(saved);

    document.addEventListener("click", function(e){
      forceBottomNav();

      if(e.target.closest("[data-reset-ride-type]")){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        unlockTypeChoice();
        scrollToTypes();
        return false;
      }

      const typeBtn = e.target.closest("[data-type],[data-ride-type]");
      if(typeBtn){
        const type = normalizeType(typeBtn.dataset.type || typeBtn.dataset.rideType || typeBtn.dataset.go) || typeFromText(typeBtn.textContent);
        if(type) setType(type);
      }

      const goBtn = e.target.closest("[data-go]");
      if(goBtn){
        const type = normalizeType(goBtn.dataset.go) || typeFromText(goBtn.textContent);
        if(type) setType(type);
      }

      interceptHomeServiceClicks(e);
    }, true);

    setTimeout(()=>{forceBottomNav(); normalizeTypeButtons(); normalizeDetailChips(); setType(document.body.dataset.rideType || saved);}, 300);
    setTimeout(()=>{forceBottomNav(); normalizeTypeButtons(); normalizeDetailChips(); setType(document.body.dataset.rideType || saved);}, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
