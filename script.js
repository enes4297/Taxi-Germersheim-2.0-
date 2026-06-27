/* Taxi Germersheim – V2.9.8 Splash Only */
(function(){
  function finishSplash(){
    document.body.classList.add("app-started", "splash-finished");
    var splash = document.getElementById("simpleSplash") || document.querySelector(".splash");
    if(splash){
      splash.style.display = "none";
      splash.style.opacity = "0";
      splash.style.visibility = "hidden";
      splash.style.pointerEvents = "none";
    }
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(finishSplash, 3250);
    });
  } else {
    setTimeout(finishSplash, 3250);
  }
})();


/* =========================================================
   V3.1.0 – Booking Rebuild Controller
   Saubere Buchungsseite ohne Emoji-/Icon-Hacks
   ========================================================= */
(function(){
  "use strict";

  function qs(s,r=document){ return r.querySelector(s); }
  function qsa(s,r=document){ return Array.from(r.querySelectorAll(s)); }

  const rideTypes = {
    taxi: {title:"Normale Taxifahrt", short:"Taxi", sub:"Jetzt oder später", icon:"taxi"},
    medical: {title:"Krankenfahrt", short:"Krankenfahrt", sub:"Dialyse, Chemo, Arzt", icon:"medical"},
    wheelchair: {title:"Rollstuhlfahrt", short:"Rollstuhl", sub:"Privat & medizinisch", icon:"wheelchair"},
    airport: {title:"Flughafentransfer", short:"Flughafen", sub:"FRA · FKB · STR", icon:"airport"}
  };

  const tripModes = {
    oneway: "Hinfahrt",
    returnonly: "Rückfahrt",
    roundtrip: "Hin- & Rückfahrt",
    repeat: "Regelmäßig"
  };

  function normalizeType(v){
    v = (v || "").toLowerCase();
    if(v.includes("kranken") || v.includes("medical")) return "medical";
    if(v.includes("rollstuhl") || v.includes("wheel")) return "wheelchair";
    if(v.includes("flug") || v.includes("airport")) return "airport";
    if(v.includes("taxi")) return "taxi";
    return "taxi";
  }

  function ensureRebuild(){
    const booking = qs("#booking");
    if(!booking || booking.dataset.v310Ready === "1") return;
    booking.dataset.v310Ready = "1";

    // Mark the booking screen so CSS can safely target only it.
    booking.classList.add("booking-rebuild-v310");

    // Find existing booking type grid and replace content with clean cards.
    const typeGrid = qs(".booking-type-grid", booking);
    if(typeGrid){
      typeGrid.classList.add("booking-type-grid-v310");
      typeGrid.innerHTML = Object.keys(rideTypes).map(type => {
        const item = rideTypes[type];
        return `
          <button type="button" class="type-card-v310" data-type="${type}">
            <span class="v310-icon v310-${item.icon}" aria-hidden="true"></span>
            <span class="v310-copy">
              <b>${item.short}</b>
              <small>${item.sub}</small>
            </span>
          </button>
        `;
      }).join("");
    }

    // Replace ride direction if present. If not present, create it above Yumak strip / start address.
    let tripGrid = qs(".ride-direction-v280,.ride-direction-v290,.ride-direction-v291,.trip-type-grid,.direction-options", booking);
    if(!tripGrid){
      const anchor = qs(".booking-yumak-strip-v270,.booking-field,.start-address,.booking-type", booking);
      tripGrid = document.createElement("div");
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(tripGrid, anchor);
    }
    tripGrid.className = "trip-grid-v310";
    tripGrid.innerHTML = `
      <button type="button" class="active" data-trip-mode="oneway"><span>→</span><b>Hinfahrt</b></button>
      <button type="button" data-trip-mode="returnonly"><span>←</span><b>Rückfahrt</b></button>
      <button type="button" data-trip-mode="roundtrip"><span>⇄</span><b>Hin- & Rückfahrt</b></button>
      <button type="button" data-trip-mode="repeat"><span>↻</span><b>Regelmäßig</b></button>
    `;

    // Add clean selected badge if missing.
    if(!qs(".selected-type-v310", booking)){
      const badge = document.createElement("div");
      badge.className = "selected-type-v310";
      badge.innerHTML = `<span>Gewählter Fahrttyp</span><strong>Normale Taxifahrt</strong>`;
      const hero = qs(".booking-hero,.booking-intro,.booking-card", booking);
      if(hero && hero.parentNode) hero.parentNode.insertBefore(badge, hero.nextSibling);
      else booking.insertBefore(badge, booking.firstChild);
    }
  }

  function setRideType(type){
    type = normalizeType(type);
    const booking = qs("#booking");
    const item = rideTypes[type] || rideTypes.taxi;

    document.body.dataset.rideType = type;
    try{ sessionStorage.setItem("tg_ride_type_v310", type); }catch(e){}

    qsa(".type-card-v310").forEach(btn => btn.classList.toggle("active", btn.dataset.type === type));

    const badge = qs(".selected-type-v310 strong");
    if(badge) badge.textContent = item.title;

    const context = qs(".booking-service-context");
    if(context) context.textContent = item.title;

    qsa(".summary-type").forEach(el => el.textContent = item.title);

    // Keep existing panels working.
    qsa(".conditional-panel").forEach(panel => panel.classList.remove("show"));
    if(type === "medical") qs(".medical-panel")?.classList.add("show");
    if(type === "airport") qs(".airport-panel")?.classList.add("show");
    if(type === "wheelchair") qs(".wheelchair-panel")?.classList.add("show");

    if(typeof window.setRideMode === "function"){
      try{ window.setRideMode(type); }catch(e){}
    }
    if(typeof window.updateBookingState === "function"){
      try{ window.updateBookingState(); }catch(e){}
    }
  }

  function setTripMode(mode){
    mode = tripModes[mode] ? mode : "oneway";
    document.body.dataset.tripMode = mode;
    try{ sessionStorage.setItem("tg_trip_mode_v310", mode); }catch(e){}

    qsa(".trip-grid-v310 button").forEach(btn => btn.classList.toggle("active", btn.dataset.tripMode === mode));

    const round = qs(".roundtrip-toggle");
    const repeat = qs(".repeat-toggle");
    if(round) round.classList.toggle("active", mode === "roundtrip");
    if(repeat) repeat.classList.toggle("active", mode === "repeat");

    if(typeof window.updateBookingState === "function"){
      try{ window.updateBookingState(); }catch(e){}
    }
  }

  function boot(){
    ensureRebuild();

    let savedType = "taxi";
    let savedTrip = "oneway";
    try{
      savedType = sessionStorage.getItem("tg_ride_type_v310") || sessionStorage.getItem("tg_booking_type") || "taxi";
      savedTrip = sessionStorage.getItem("tg_trip_mode_v310") || "oneway";
    }catch(e){}

    setRideType(savedType);
    setTripMode(savedTrip);

    document.addEventListener("click", function(e){
      const typeCard = e.target.closest(".type-card-v310");
      if(typeCard){
        e.preventDefault();
        e.stopPropagation();
        setRideType(typeCard.dataset.type);
        return;
      }

      const tripCard = e.target.closest(".trip-grid-v310 button");
      if(tripCard){
        e.preventDefault();
        e.stopPropagation();
        setTripMode(tripCard.dataset.tripMode);
        return;
      }

      // Home service cards still set correct type before opening booking.
      const go = e.target.closest("[data-go]");
      if(go){
        const target = go.dataset.go || "";
        if(target.includes("medical")) setRideType("medical");
        if(target.includes("wheelchair")) setRideType("wheelchair");
        if(target.includes("airport")) setRideType("airport");
        if(target === "booking" || target.includes("taxi")) setRideType("taxi");
      }

      const serviceChoice = e.target.closest(".service-select-screen [data-booking-type]");
      if(serviceChoice){
        const type = normalizeType(serviceChoice.dataset.bookingType || serviceChoice.textContent);
        setRideType(type);
      }
    }, true);

    setTimeout(ensureRebuild, 400);
    setTimeout(function(){
      ensureRebuild();
      setRideType(document.body.dataset.rideType || savedType);
      setTripMode(document.body.dataset.tripMode || savedTrip);
    }, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
