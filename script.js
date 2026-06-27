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






/* V3.3.0 Stable Inline Icons */
(function(){
  function $(s,r=document){return r.querySelector(s)}
  function $$(s,r=document){return Array.from(r.querySelectorAll(s))}
  const icons={
    taxi:'<svg viewBox="0 0 48 48"><path d="M11 31h26"/><path d="M9 31l2.5-12h25L39 31"/><path d="M16 19l3-7h10l3 7"/><path d="M16 31v4"/><path d="M32 31v4"/><circle cx="15" cy="31" r="2.2"/><circle cx="33" cy="31" r="2.2"/><path d="M20 10h8"/></svg>',
    medical:'<svg viewBox="0 0 48 48"><path d="M24 10v28"/><path d="M10 24h28"/></svg>',
    wheelchair:'<svg viewBox="0 0 48 48"><circle cx="18" cy="35" r="7"/><path d="M18 28V14"/><path d="M18 14h10"/><path d="M18 22h11"/><path d="M29 22l6 13h6"/><circle cx="18" cy="9" r="2"/></svg>',
    airport:'<svg viewBox="0 0 48 48"><path d="M20 42l4-17L7 16l3-4l17 5l4-13l4 2l-2 15l9 6l-2 4l-10-4l-6 15z"/></svg>',
    luggage:'<svg viewBox="0 0 48 48"><rect x="12" y="15" width="24" height="26" rx="4"/><path d="M18 15v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4"/><path d="M18 24h12"/><path d="M18 32h12"/></svg>',
    child:'<svg viewBox="0 0 48 48"><circle cx="24" cy="13" r="6"/><path d="M14 42v-7a10 10 0 0 1 20 0v7"/><path d="M18 34h12"/><path d="M17 42h14"/></svg>',
    pet:'<svg viewBox="0 0 48 48"><circle cx="10" cy="21" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="30" cy="12" r="4"/><circle cx="38" cy="21" r="4"/><path d="M16 36c0-7 4-11 8-11s8 4 8 11c0 4-4 6-8 6s-8-2-8-6z"/></svg>',
    passengers:'<svg viewBox="0 0 48 48"><circle cx="17" cy="16" r="6"/><path d="M7 42v-3a10 10 0 0 1 20 0v3"/><circle cx="33" cy="18" r="5"/><path d="M29 42v-2a8 8 0 0 1 13 0v2"/></svg>',
    home:'<svg viewBox="0 0 48 48"><path d="M7 22l17-15l17 15"/><path d="M11 20v21h26V20"/><path d="M19 41V29h10v12"/></svg>',
    booking:'<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M8 19h32"/><path d="M16 27h.1"/><path d="M24 27h.1"/><path d="M32 27h.1"/></svg>',
    yumak:'<svg viewBox="0 0 48 48"><path d="M10 18L8 8l9 6"/><path d="M38 18l2-10l-9 6"/><circle cx="24" cy="26" r="14"/><path d="M18 24h.1"/><path d="M30 24h.1"/><path d="M22 30h4"/><path d="M16 32l-8 2"/><path d="M32 32l8 2"/></svg>',
    rewards:'<svg viewBox="0 0 48 48"><path d="M40 24v16H8V24"/><path d="M5 14h38v10H5z"/><path d="M24 14v26"/><path d="M24 14h-7a5 5 0 1 1 5-5c0 3 2 5 2 5z"/><path d="M24 14h7a5 5 0 1 0-5-5c0 3-2 5-2 5z"/></svg>',
    profile:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>',
    right:'<svg viewBox="0 0 48 48"><path d="M10 24h28"/><path d="M27 13l11 11l-11 11"/></svg>',
    left:'<svg viewBox="0 0 48 48"><path d="M38 24H10"/><path d="M21 13L10 24l11 11"/></svg>',
    round:'<svg viewBox="0 0 48 48"><path d="M12 14h24"/><path d="M28 7l8 7l-8 7"/><path d="M36 34H12"/><path d="M20 27l-8 7l8 7"/></svg>',
    repeat:'<svg viewBox="0 0 48 48"><path d="M33 5l8 8l-8 8"/><path d="M7 23v-4a8 8 0 0 1 8-8h26"/><path d="M15 43l-8-8l8-8"/><path d="M41 25v4a8 8 0 0 1-8 8H7"/></svg>'
  };
  const types={
    taxi:['Taxi','Jetzt oder später','taxi','Normale Taxifahrt'],
    medical:['Krankenfahrt','Dialyse · Chemo · Arzt','medical','Krankenfahrt'],
    wheelchair:['Rollstuhl','Barrierefrei fahren','wheelchair','Rollstuhlfahrt'],
    airport:['Flughafen','FRA · FKB · STR','airport','Flughafentransfer']
  };
  function typeOf(v){v=(v||'').toLowerCase();if(v.includes('kranken')||v.includes('medical'))return'medical';if(v.includes('rollstuhl')||v.includes('wheel'))return'wheelchair';if(v.includes('flug')||v.includes('airport'))return'airport';if(v.includes('taxi'))return'taxi';return null}
  function ib(name){return '<span class="tg-v330-iconbox"><span class="tg-v330-icon">'+(icons[name]||'')+'</span></span>'}
  function buildTypes(){let g=$('#booking .booking-type-grid'); if(!g)return; g.classList.add('tg-v330-typegrid'); g.innerHTML=Object.keys(types).map(k=>'<button type="button" class="tg-v330-typecard" data-type="'+k+'">'+ib(types[k][2])+'<span class="tg-v330-copy"><b>'+types[k][0]+'</b><small>'+types[k][1]+'</small></span></button>').join('')}
  function setType(t){t=typeOf(t)||'taxi';document.body.dataset.rideType=t;try{sessionStorage.setItem('tg_ride_type_v330',t)}catch(e){}; $$('#booking .tg-v330-typecard').forEach(b=>b.classList.toggle('active',b.dataset.type===t)); let b=$('#booking .selected-type-v310 strong,#booking .selected-ride-type-v293 strong'); if(b)b.textContent=types[t][3]; let c=$('#booking .booking-service-context'); if(c)c.textContent=types[t][3]; $$('#booking .conditional-panel').forEach(p=>p.classList.remove('show')); if(t==='medical')$('#booking .medical-panel')?.classList.add('show'); if(t==='airport')$('#booking .airport-panel')?.classList.add('show'); if(t==='wheelchair')$('#booking .wheelchair-panel')?.classList.add('show'); try{window.updateBookingState&&window.updateBookingState()}catch(e){}}
  function buildChips(){let map=[[/gepäck|koffer/i,'Gepäck','luggage'],[/kindersitz/i,'Kindersitz','child'],[/rollstuhl/i,'Rollstuhl','wheelchair'],[/haustier|tier/i,'Haustier','pet'],[/mehr als 4|fahrgäste|personen/i,'Mehr als 4','passengers']]; $$('#booking .ride-options button,#booking .mini-options button,#booking .detail-chips button,#booking .fahrt-details button').forEach(btn=>{let m=map.find(x=>x[0].test(btn.textContent||'')); if(!m)return; btn.classList.add('tg-v330-chip'); btn.innerHTML='<span class="tg-v330-chipicon">'+icons[m[2]]+'</span><span>'+m[1]+'</span>'})}
  function buildTrips(){let map=[[/Hin-.*Rückfahrt/i,'Hin- & Rückfahrt','round'],[/Hinfahrt/i,'Hinfahrt','right'],[/Rückfahrt/i,'Rückfahrt','left'],[/Regelmäßig/i,'Regelmäßig','repeat']]; $$('#booking .trip-grid-v310 button,#booking .ride-direction-v280 button,#booking .ride-direction-v290 button,#booking .ride-direction-v291 button,#booking .direction-options button').forEach(btn=>{let m=map.find(x=>x[0].test(btn.textContent||'')); if(!m)return; btn.classList.add('tg-v330-trip'); btn.innerHTML='<span class="tg-v330-tripicon">'+icons[m[2]]+'</span><b>'+m[1]+'</b><span></span>'})}
  function buildNav(){let map={home:'home',booking:'booking',yumak:'yumak',rewards:'rewards',profile:'profile'}; $$('.bottom-nav button[data-go]').forEach(btn=>{let k=map[btn.dataset.go]; if(!k||btn.dataset.v330nav)return; btn.dataset.v330nav=1; let txt=(btn.textContent||'').trim()||({home:'Start',booking:'Buchen',yumak:'Yumak',rewards:'Rewards',profile:'Profil'}[btn.dataset.go]); btn.innerHTML='<span class="tg-v330-navicon">'+icons[k]+'</span><span>'+txt+'</span>'})}
  function boot(){document.documentElement.classList.add('tg-v330-nox');document.body.classList.add('tg-v330-nox');$('#booking')?.classList.add('tg-v330-booking');buildTypes();buildChips();buildTrips();buildNav();let saved='taxi';try{saved=sessionStorage.getItem('tg_ride_type_v330')||'taxi'}catch(e){}setType(saved);document.addEventListener('click',e=>{let tc=e.target.closest('#booking .tg-v330-typecard'); if(tc){e.preventDefault();setType(tc.dataset.type);return}let go=e.target.closest('[data-go]'); if(go){let t=typeOf(go.dataset.go+' '+go.textContent); if(t)setType(t)} setTimeout(buildNav,50)},true); setTimeout(()=>{buildChips();buildTrips();buildNav();setType(document.body.dataset.rideType||saved)},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
