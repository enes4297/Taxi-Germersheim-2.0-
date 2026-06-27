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


/* V2.9.3 – Booking Cleanup Controller */
(function(){
  "use strict";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  const typeLabels = {
    taxi: "Normale Taxifahrt",
    medical: "Krankenfahrt",
    "medical-select": "Krankenfahrt",
    wheelchair: "Rollstuhlfahrt",
    "wheelchair-select": "Rollstuhlfahrt",
    airport: "Flughafentransfer",
    "airport-select": "Flughafentransfer"
  };

  function setBadge(label){
    const badge = $(".selected-ride-type-v293 strong");
    if(badge) badge.textContent = label || "Normale Taxifahrt";
  }

  function normalizeTypeButtons(){
    $$(".booking-type-grid button, .ride-type-grid button, [data-type], [data-ride-type]").forEach(btn=>{
      const raw = btn.dataset.type || btn.dataset.rideType || btn.dataset.go || "";
      if(/wheel/i.test(raw) || /rollstuhl/i.test(btn.textContent)){
        btn.classList.add("type-wheelchair-clean");
        btn.innerHTML = '<span class="tg-type-icon tg-type-wheelchair" aria-hidden="true"></span><b>Rollstuhl</b>';
      } else if(/medical|kranken/i.test(raw) || /Krankenfahrt/i.test(btn.textContent)){
        btn.classList.add("type-medical-clean");
        if(btn.textContent.trim().length < 30) btn.innerHTML = '<span class="tg-type-icon tg-type-medical" aria-hidden="true"></span><b>Krankenfahrt</b>';
      } else if(/airport|flughafen/i.test(raw) || /Flughafen/i.test(btn.textContent)){
        btn.classList.add("type-airport-clean");
        if(btn.textContent.trim().length < 30) btn.innerHTML = '<span class="tg-type-icon tg-type-airport" aria-hidden="true"></span><b>Flughafen</b>';
      } else if(/taxi/i.test(raw) || btn.textContent.trim()==="Taxi"){
        btn.classList.add("type-taxi-clean");
        if(btn.textContent.trim().length < 30) btn.innerHTML = '<span class="tg-type-icon tg-type-taxi" aria-hidden="true"></span><b>Taxi</b>';
      }
    });
  }

  function unlockTypeChoice(){
    const grids = $$(".booking-type-grid, .ride-type-grid, .fahrt-type-grid, .service-type-grid");
    grids.forEach(grid=>{
      grid.classList.remove("locked","is-locked","hidden","is-hidden");
      grid.style.display = "";
      grid.style.opacity = "";
      grid.style.pointerEvents = "";
    });

    const typeSection = $(".booking-type-section, .fahrt-type-section, #booking .type-section");
    if(typeSection){
      typeSection.classList.remove("hidden","is-hidden","locked");
      typeSection.style.display = "";
    }
  }

  function selectRideType(type){
    const label = typeLabels[type] || typeLabels[type?.replace("-select","")] || "Normale Taxifahrt";
    setBadge(label);
    document.body.dataset.rideType = type || "taxi";

    $$(".booking-type-grid button, .ride-type-grid button, [data-type], [data-ride-type]").forEach(btn=>{
      const raw = btn.dataset.type || btn.dataset.rideType || btn.dataset.go || "";
      const active = raw === type || raw === type?.replace("-select","");
      btn.classList.toggle("active", active);
      btn.classList.toggle("is-active", active);
    });

    unlockTypeChoice();
  }

  document.addEventListener("click", function(e){
    const reset = e.target.closest("[data-reset-ride-type]");
    if(reset){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      selectRideType("taxi");
      unlockTypeChoice();
      return false;
    }

    const typeBtn = e.target.closest("[data-type], [data-ride-type]");
    if(typeBtn){
      const type = typeBtn.dataset.type || typeBtn.dataset.rideType;
      if(type){
        selectRideType(type);
      }
    }

    const goBtn = e.target.closest("[data-go]");
    if(goBtn){
      const go = goBtn.dataset.go;
      if(typeLabels[go]){
        selectRideType(go);
      }
    }
  }, true);

  function boot(){
    normalizeTypeButtons();
    unlockTypeChoice();
    setBadge(typeLabels[document.body.dataset.rideType] || "Normale Taxifahrt");
    setTimeout(normalizeTypeButtons, 400);
    setTimeout(unlockTypeChoice, 600);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
