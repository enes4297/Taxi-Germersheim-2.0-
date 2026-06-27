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


/* =========================================================
   V3.3.1 – Home Inline Icon Fix
   Entfernt gelbe Kästchen auf Startseite dauerhaft.
   ========================================================= */
(function(){
  "use strict";

  function $(s,r=document){return r.querySelector(s)}
  function $$(s,r=document){return Array.from(r.querySelectorAll(s))}

  const icons = {
    taxi:'<svg viewBox="0 0 48 48"><path d="M11 31h26"/><path d="M9 31l2.5-12h25L39 31"/><path d="M16 19l3-7h10l3 7"/><path d="M16 31v4"/><path d="M32 31v4"/><circle cx="15" cy="31" r="2.2"/><circle cx="33" cy="31" r="2.2"/><path d="M20 10h8"/></svg>',
    medical:'<svg viewBox="0 0 48 48"><path d="M24 10v28"/><path d="M10 24h28"/></svg>',
    wheelchair:'<svg viewBox="0 0 48 48"><circle cx="18" cy="35" r="7"/><path d="M18 28V14"/><path d="M18 14h10"/><path d="M18 22h11"/><path d="M29 22l6 13h6"/><circle cx="18" cy="9" r="2"/></svg>',
    airport:'<svg viewBox="0 0 48 48"><path d="M20 42l4-17L7 16l3-4l17 5l4-13l4 2l-2 15l9 6l-2 4l-10-4l-6 15z"/></svg>',
    home:'<svg viewBox="0 0 48 48"><path d="M7 22l17-15l17 15"/><path d="M11 20v21h26V20"/><path d="M19 41V29h10v12"/></svg>',
    booking:'<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M8 19h32"/><path d="M16 27h.1"/><path d="M24 27h.1"/><path d="M32 27h.1"/></svg>',
    yumak:'<svg viewBox="0 0 48 48"><path d="M10 18L8 8l9 6"/><path d="M38 18l2-10l-9 6"/><circle cx="24" cy="26" r="14"/><path d="M18 24h.1"/><path d="M30 24h.1"/><path d="M22 30h4"/><path d="M16 32l-8 2"/><path d="M32 32l8 2"/></svg>',
    rewards:'<svg viewBox="0 0 48 48"><path d="M40 24v16H8V24"/><path d="M5 14h38v10H5z"/><path d="M24 14v26"/><path d="M24 14h-7a5 5 0 1 1 5-5c0 3 2 5 2 5z"/><path d="M24 14h7a5 5 0 1 0-5-5c0 3-2 5-2 5z"/></svg>',
    profile:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>',
    arrow:'<svg viewBox="0 0 48 48"><path d="M10 24h28"/><path d="M27 13l11 11l-11 11"/></svg>',
    star:'<svg viewBox="0 0 48 48"><path d="M24 6l5.5 11.2l12.3 1.8l-8.9 8.6l2.1 12.2L24 34l-11 5.8l2.1-12.2L6.2 19l12.3-1.8z"/></svg>',
    review:'<svg viewBox="0 0 48 48"><path d="M39 31a8 8 0 0 1-8 8H16L7 43V15a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8z"/><path d="M16 19h16"/><path d="M16 27h10"/></svg>',
    phone:'<svg viewBox="0 0 48 48"><path d="M40 31v6a4 4 0 0 1-4.4 4A39 39 0 0 1 19 35a38 38 0 0 1-12-12A39 39 0 0 1 1 6.4A4 4 0 0 1 5 2h6a4 4 0 0 1 4 3.4c.2 2 .7 4 1.4 5.8a4 4 0 0 1-.9 4.2L13 18a31 31 0 0 0 17 17l2.6-2.5a4 4 0 0 1 4.2-.9c1.8.7 3.8 1.2 5.8 1.4A4 4 0 0 1 40 31z"/></svg>',
    menu:'<svg viewBox="0 0 48 48"><path d="M10 15h28"/><path d="M10 24h28"/><path d="M10 33h28"/></svg>'
  };

  function icon(name, cls){
    return '<span class="'+(cls || 'tg331-iconbox')+'"><span class="tg331-icon">'+(icons[name] || icons.taxi)+'</span></span>';
  }

  function guessType(el){
    const raw = ((el.dataset.go || el.dataset.type || el.dataset.bookingType || "") + " " + (el.textContent || "")).toLowerCase();
    if(raw.includes("kranken") || raw.includes("dialyse") || raw.includes("arzt")) return "medical";
    if(raw.includes("rollstuhl") || raw.includes("wheel")) return "wheelchair";
    if(raw.includes("flug") || raw.includes("airport") || raw.includes("fra")) return "airport";
    if(raw.includes("taxi")) return "taxi";
    if(raw.includes("reward") || raw.includes("geschenk")) return "rewards";
    if(raw.includes("yumak")) return "yumak";
    if(raw.includes("profil")) return "profile";
    if(raw.includes("buchen")) return "booking";
    return null;
  }

  function cleanHomeCards(){
    const selectors = [
      "#home .service-card",
      "#home .home-service-card",
      "#home .quick-card",
      "#home [data-go='booking']",
      "#home [data-go='medical']",
      "#home [data-go='wheelchair']",
      "#home [data-go='airport']"
    ];

    $$(selectors.join(",")).forEach(card=>{
      if(card.dataset.tg331Home === "1") return;

      const type = guessType(card);
      if(!type) return;

      card.dataset.tg331Home = "1";
      card.classList.add("tg331-home-card");

      // Remove only visual icon placeholders, keep text and arrows.
      $$("img, svg, .icon, .card-icon, .service-icon, .tg-premium-icon-box, .tg-v330-iconbox, .tg-inline-icon-box", card).forEach(node=>{
        const isTextWrapper = node.matches && node.matches(".tg331-home-card-copy");
        if(!isTextWrapper) node.remove();
      });

      card.insertAdjacentHTML("afterbegin", icon(type, "tg331-home-iconbox"));
    });
  }

  function cleanFloatingButtons(){
    // Top left menu / top right phone yellow square placeholders
    $$("button, a").forEach(btn=>{
      const raw = ((btn.dataset.go || btn.getAttribute("aria-label") || btn.textContent || "")).toLowerCase();
      if(btn.dataset.tg331Float === "1") return;
      let key = null;
      if(raw.includes("menu") || raw.includes("menü")) key = "menu";
      if(raw.includes("phone") || raw.includes("telefon") || raw.includes("anrufen")) key = "phone";
      if(!key) return;

      btn.dataset.tg331Float = "1";
      btn.classList.add("tg331-round-icon-button");
      btn.innerHTML = '<span class="tg331-round-icon">'+icons[key]+'</span>';
    });
  }

  function cleanBottomNav(){
    const navMap = {home:"home",booking:"booking",yumak:"yumak",rewards:"rewards",profile:"profile"};

    $$(".bottom-nav button[data-go]").forEach(btn=>{
      const key = navMap[btn.dataset.go];
      if(!key) return;

      const label = {
        home:"Start",
        booking:"Buchen",
        yumak:"Yumak",
        rewards:"Rewards",
        profile:"Profil"
      }[btn.dataset.go];

      btn.classList.add("tg331-nav-button");
      btn.innerHTML = '<span class="tg331-nav-icon">'+icons[key]+'</span><span>'+label+'</span>';
    });
  }

  function cleanBookingCards(){
    // Booking screen visible card placeholders if old systems still injected
    $$("#booking .booking-type-grid button").forEach(card=>{
      if(card.classList.contains("tg-v330-typecard")) return;
      if(card.dataset.tg331Booking === "1") return;

      const type = guessType(card);
      if(!type) return;

      card.dataset.tg331Booking = "1";
      card.classList.add("tg331-booking-type-card");

      const label = {
        taxi:"Taxi",
        medical:"Krankenfahrt",
        wheelchair:"Rollstuhl",
        airport:"Flughafen"
      }[type];
      const sub = {
        taxi:"Jetzt oder später",
        medical:"Dialyse · Chemo · Arzt",
        wheelchair:"Barrierefrei fahren",
        airport:"FRA · FKB · STR"
      }[type];

      card.innerHTML = icon(type, "tg331-home-iconbox") + '<span class="tg331-booking-copy"><b>'+label+'</b><small>'+sub+'</small></span>';
    });
  }

  function removeSquares(){
    // Any old square placeholders still left
    $$(".tg-premium-icon-box, .tg-svg-icon, .type-card-v302 .tg-svg-icon, .booking-type-polish-icon").forEach(el=>{
      if(el.closest(".tg331-home-card,.tg331-booking-type-card,.tg-v330-typecard")) return;
      el.style.display = "none";
    });
  }

  function boot(){
    document.body.classList.add("tg331-ready");
    cleanHomeCards();
    cleanFloatingButtons();
    cleanBottomNav();
    cleanBookingCards();
    removeSquares();

    setTimeout(function(){
      cleanHomeCards();
      cleanFloatingButtons();
      cleanBottomNav();
      cleanBookingCards();
      removeSquares();
    }, 500);

    setTimeout(function(){
      cleanHomeCards();
      cleanBottomNav();
      cleanBookingCards();
      removeSquares();
    }, 1200);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  document.addEventListener("click", function(){
    setTimeout(function(){
      cleanHomeCards();
      cleanBottomNav();
      cleanBookingCards();
      removeSquares();
    }, 80);
  }, true);
})();


/* =========================================================
   V3.3.2 – Home Card Layout + Premium Yumak Nav Fix
   ========================================================= */
(function(){
  "use strict";

  function $(s,r=document){return r.querySelector(s)}
  function $$(s,r=document){return Array.from(r.querySelectorAll(s))}

  const icons = {
    taxi:'<svg viewBox="0 0 48 48"><path d="M11 31h26"/><path d="M9 31l2.5-12h25L39 31"/><path d="M16 19l3-7h10l3 7"/><path d="M16 31v4"/><path d="M32 31v4"/><circle cx="15" cy="31" r="2.2"/><circle cx="33" cy="31" r="2.2"/><path d="M20 10h8"/></svg>',
    medical:'<svg viewBox="0 0 48 48"><path d="M24 10v28"/><path d="M10 24h28"/></svg>',
    wheelchair:'<svg viewBox="0 0 48 48"><circle cx="18" cy="35" r="7"/><path d="M18 28V14"/><path d="M18 14h10"/><path d="M18 22h11"/><path d="M29 22l6 13h6"/><circle cx="18" cy="9" r="2"/></svg>',
    airport:'<svg viewBox="0 0 48 48"><path d="M20 42l4-17L7 16l3-4l17 5l4-13l4 2l-2 15l9 6l-2 4l-10-4l-6 15z"/></svg>',
    home:'<svg viewBox="0 0 48 48"><path d="M7 22l17-15l17 15"/><path d="M11 20v21h26V20"/><path d="M19 41V29h10v12"/></svg>',
    booking:'<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M8 19h32"/><path d="M16 27h.1"/><path d="M24 27h.1"/><path d="M32 27h.1"/></svg>',
    rewards:'<svg viewBox="0 0 48 48"><path d="M40 24v16H8V24"/><path d="M5 14h38v10H5z"/><path d="M24 14v26"/><path d="M24 14h-7a5 5 0 1 1 5-5c0 3 2 5 2 5z"/><path d="M24 14h7a5 5 0 1 0-5-5c0 3-2 5-2 5z"/></svg>',
    profile:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>',
    yumakPremium:'<svg viewBox="0 0 48 48"><path d="M12 18L9 8l9 6"/><path d="M36 18l3-10l-9 6"/><circle cx="24" cy="26" r="13"/><path d="M18.5 24.5h.1"/><path d="M29.5 24.5h.1"/><path d="M22 29.5c1.2 1 2.8 1 4 0"/><path d="M16 30.5l-7 1.5"/><path d="M32 30.5l7 1.5"/><path d="M20 36h8"/><circle cx="24" cy="26" r="18" opacity=".35"/></svg>'
  };

  function iconHtml(name, cls){
    return '<span class="'+cls+'"><span class="tg332-icon">'+(icons[name] || icons.taxi)+'</span></span>';
  }

  function getType(el){
    const raw = ((el.dataset.go || el.dataset.type || el.dataset.bookingType || "") + " " + (el.textContent || "")).toLowerCase();
    if(raw.includes("kranken") || raw.includes("dialyse") || raw.includes("arzt")) return "medical";
    if(raw.includes("rollstuhl") || raw.includes("wheel")) return "wheelchair";
    if(raw.includes("flug") || raw.includes("airport") || raw.includes("fra")) return "airport";
    if(raw.includes("taxi")) return "taxi";
    return null;
  }

  function cleanCardText(card){
    // Keep textual content readable, remove duplicate empty icon boxes from previous patches.
    $$(".tg331-home-iconbox,.tg-premium-icon-box,.tg-v330-iconbox,.tg-inline-icon-box,.tg-svg-icon,.type-card-v302,.booking-type-polish-icon,img,svg", card).forEach(node=>{
      if(node.classList && node.classList.contains("tg332-card-iconbox")) return;
      if(node.closest && node.closest(".tg332-card-iconbox")) return;
      node.remove();
    });

    // If previous grid left weird wrappers, normalize the card text.
    const type = getType(card);
    if(!type) return;

    const title = {
      taxi:"Taxi",
      medical:"Krankenfahrt",
      wheelchair:"Rollstuhl",
      airport:"Flughafen"
    }[type];

    const sub = {
      taxi:"Jetzt oder später",
      medical:"Arzt, Dialyse & mehr",
      wheelchair:"Privat & medizinisch",
      airport:"FRA · FKB · STR"
    }[type];

    const arrow = '<span class="tg332-card-arrow">›</span>';
    card.innerHTML = iconHtml(type, "tg332-card-iconbox") +
      '<span class="tg332-card-copy"><b>'+title+'</b><small>'+sub+'</small></span>' +
      arrow;
  }

  function fixHomeCards(){
    const selectors = [
      "#home .service-card",
      "#home .home-service-card",
      "#home .quick-card",
      "#home [data-go='booking']",
      "#home [data-go='medical']",
      "#home [data-go='wheelchair']",
      "#home [data-go='airport']"
    ];

    $$(selectors.join(",")).forEach(card=>{
      const type = getType(card);
      if(!type) return;
      card.classList.add("tg332-home-card");
      card.dataset.tg332Type = type;
      cleanCardText(card);
    });
  }

  function fixBottomNav(){
    const map = {
      home:["Start","home"],
      booking:["Buchen","booking"],
      yumak:["Yumak","yumakPremium"],
      rewards:["Rewards","rewards"],
      profile:["Profil","profile"]
    };

    $$(".bottom-nav button[data-go]").forEach(btn=>{
      const cfg = map[btn.dataset.go];
      if(!cfg) return;
      btn.classList.add("tg332-nav-btn");
      if(btn.dataset.go === "yumak") btn.classList.add("tg332-yumak-nav");
      btn.innerHTML = '<span class="tg332-nav-icon">'+icons[cfg[1]]+'</span><span>'+cfg[0]+'</span>';
    });
  }

  function fixBookingTripDuplicates(){
    // Remove extra blank circles on trip buttons caused by older icon systems.
    $$("#booking .trip-grid-v310 button, #booking .tg-v330-trip, #booking .tg331-booking-type-card").forEach(btn=>{
      $$("span", btn).forEach((sp, i)=>{
        if(i > 2 && !sp.textContent.trim()) sp.remove();
      });
    });
  }

  function boot(){
    document.body.classList.add("tg332-ready");
    fixHomeCards();
    fixBottomNav();
    fixBookingTripDuplicates();

    setTimeout(function(){
      fixHomeCards();
      fixBottomNav();
      fixBookingTripDuplicates();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  document.addEventListener("click", function(){
    setTimeout(function(){
      fixHomeCards();
      fixBottomNav();
      fixBookingTripDuplicates();
    }, 80);
  }, true);
})();


/* =========================================================
   V3.4.0 – Clean Home + Booking UI Rebuild
   Final owner for home cards, booking type cards, trip cards, nav.
   ========================================================= */
(function(){
  "use strict";

  function $(s,r=document){return r.querySelector(s)}
  function $$(s,r=document){return Array.from(r.querySelectorAll(s))}

  const icons = {
    taxi:'<svg viewBox="0 0 48 48"><path d="M11 31h26"/><path d="M9 31l2.5-12h25L39 31"/><path d="M16 19l3-7h10l3 7"/><path d="M16 31v4"/><path d="M32 31v4"/><circle cx="15" cy="31" r="2.2"/><circle cx="33" cy="31" r="2.2"/><path d="M20 10h8"/></svg>',
    medical:'<svg viewBox="0 0 48 48"><path d="M24 10v28"/><path d="M10 24h28"/></svg>',
    wheelchair:'<svg viewBox="0 0 48 48"><circle cx="18" cy="35" r="7"/><path d="M18 28V14"/><path d="M18 14h10"/><path d="M18 22h11"/><path d="M29 22l6 13h6"/><circle cx="18" cy="9" r="2"/></svg>',
    airport:'<svg viewBox="0 0 48 48"><path d="M20 42l4-17L7 16l3-4l17 5l4-13l4 2l-2 15l9 6l-2 4l-10-4l-6 15z"/></svg>',
    home:'<svg viewBox="0 0 48 48"><path d="M7 22l17-15l17 15"/><path d="M11 20v21h26V20"/><path d="M19 41V29h10v12"/></svg>',
    booking:'<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M8 19h32"/><path d="M16 27h.1"/><path d="M24 27h.1"/><path d="M32 27h.1"/></svg>',
    rewards:'<svg viewBox="0 0 48 48"><path d="M40 24v16H8V24"/><path d="M5 14h38v10H5z"/><path d="M24 14v26"/><path d="M24 14h-7a5 5 0 1 1 5-5c0 3 2 5 2 5z"/><path d="M24 14h7a5 5 0 1 0-5-5c0 3-2 5-2 5z"/></svg>',
    profile:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>',
    yumak:'<svg viewBox="0 0 48 48"><path d="M11 18L8 8l10 7"/><path d="M37 18l3-10l-10 7"/><circle cx="24" cy="26" r="13"/><circle cx="19" cy="24" r="1.4"/><circle cx="29" cy="24" r="1.4"/><path d="M22 30c1.3 1 2.7 1 4 0"/><path d="M16 31l-8 2"/><path d="M32 31l8 2"/><circle cx="24" cy="26" r="18" opacity=".28"/></svg>',
    right:'<svg viewBox="0 0 48 48"><path d="M10 24h28"/><path d="M27 13l11 11l-11 11"/></svg>',
    left:'<svg viewBox="0 0 48 48"><path d="M38 24H10"/><path d="M21 13L10 24l11 11"/></svg>',
    round:'<svg viewBox="0 0 48 48"><path d="M12 14h24"/><path d="M28 7l8 7l-8 7"/><path d="M36 34H12"/><path d="M20 27l-8 7l8 7"/></svg>',
    repeat:'<svg viewBox="0 0 48 48"><path d="M33 5l8 8l-8 8"/><path d="M7 23v-4a8 8 0 0 1 8-8h26"/><path d="M15 43l-8-8l8-8"/><path d="M41 25v4a8 8 0 0 1-8 8H7"/></svg>',
    luggage:'<svg viewBox="0 0 48 48"><rect x="12" y="15" width="24" height="26" rx="4"/><path d="M18 15v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4"/><path d="M18 24h12"/><path d="M18 32h12"/></svg>',
    child:'<svg viewBox="0 0 48 48"><circle cx="24" cy="13" r="6"/><path d="M14 42v-7a10 10 0 0 1 20 0v7"/><path d="M18 34h12"/><path d="M17 42h14"/></svg>',
    pet:'<svg viewBox="0 0 48 48"><circle cx="10" cy="21" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="30" cy="12" r="4"/><circle cx="38" cy="21" r="4"/><path d="M16 36c0-7 4-11 8-11s8 4 8 11c0 4-4 6-8 6s-8-2-8-6z"/></svg>',
    passengers:'<svg viewBox="0 0 48 48"><circle cx="17" cy="16" r="6"/><path d="M7 42v-3a10 10 0 0 1 20 0v3"/><circle cx="33" cy="18" r="5"/><path d="M29 42v-2a8 8 0 0 1 13 0v2"/></svg>'
  };

  const ride = {
    taxi:{title:"Taxi", sub:"Jetzt oder später", full:"Normale Taxifahrt", icon:"taxi"},
    medical:{title:"Krankenfahrt", sub:"Arzt, Dialyse & mehr", full:"Krankenfahrt", icon:"medical"},
    wheelchair:{title:"Rollstuhl", sub:"Privat & medizinisch", full:"Rollstuhlfahrt", icon:"wheelchair"},
    airport:{title:"Flughafen", sub:"FRA · FKB · STR", full:"Flughafentransfer", icon:"airport"}
  };

  const nav = {
    home:{label:"Start", icon:"home"},
    booking:{label:"Buchen", icon:"booking"},
    yumak:{label:"Yumak", icon:"yumak"},
    rewards:{label:"Rewards", icon:"rewards"},
    profile:{label:"Profil", icon:"profile"}
  };

  function icon(name, cls){
    return '<span class="'+cls+'"><span class="tg340-svg">'+(icons[name] || "")+'</span></span>';
  }

  function typeFromText(v){
    v = (v || "").toLowerCase();
    if(v.includes("kranken") || v.includes("dialyse") || v.includes("arzt") || v.includes("medical")) return "medical";
    if(v.includes("rollstuhl") || v.includes("wheel")) return "wheelchair";
    if(v.includes("flug") || v.includes("airport") || v.includes("fra")) return "airport";
    if(v.includes("taxi") || v.includes("booking")) return "taxi";
    return null;
  }

  function renderHomeCards(){
    const home = $("#home");
    if(!home) return;

    // Find existing four service cards by content/data and replace their inner content only.
    const candidates = $$("#home [data-go], #home .service-card, #home .home-service-card, #home .quick-card");
    const used = new Set();

    candidates.forEach(card=>{
      const t = typeFromText((card.dataset.go || "") + " " + (card.dataset.type || "") + " " + card.textContent);
      if(!t || used.has(card)) return;
      if(!["taxi","medical","wheelchair","airport"].includes(t)) return;
      used.add(card);

      card.classList.add("tg340-home-card");
      card.dataset.tg340Type = t;
      card.innerHTML =
        icon(ride[t].icon, "tg340-card-icon") +
        '<span class="tg340-card-copy"><b>'+ride[t].title+'</b><small>'+ride[t].sub+'</small></span>' +
        '<span class="tg340-chevron">›</span>';
    });
  }

  function renderBookingTypes(){
    const grid = $("#booking .booking-type-grid");
    if(!grid) return;

    grid.classList.add("tg340-type-grid");
    grid.innerHTML = Object.keys(ride).map(t=>{
      return '<button type="button" class="tg340-type-card" data-type="'+t+'">' +
        icon(ride[t].icon, "tg340-card-icon") +
        '<span class="tg340-card-copy"><b>'+ride[t].title+'</b><small>'+ride[t].sub+'</small></span>' +
      '</button>';
    }).join("");
  }

  function renderTripCards(){
    const labels = [
      {key:"oneway", title:"Hinfahrt", icon:"right"},
      {key:"returnonly", title:"Rückfahrt", icon:"left"},
      {key:"roundtrip", title:"Hin- & Rückfahrt", icon:"round"},
      {key:"repeat", title:"Regelmäßig", icon:"repeat"}
    ];

    let grid = $("#booking .trip-grid-v310, #booking .ride-direction-v280, #booking .ride-direction-v290, #booking .ride-direction-v291, #booking .direction-options");
    if(!grid) return;

    grid.className = "tg340-trip-grid";
    grid.innerHTML = labels.map((x,i)=>
      '<button type="button" class="tg340-trip-card '+(i===0?'active':'')+'" data-trip-mode="'+x.key+'">' +
      '<span class="tg340-trip-icon">'+icons[x.icon]+'</span><b>'+x.title+'</b></button>'
    ).join("");
  }

  function renderDetailChips(){
    const map = [
      {re:/gepäck|koffer/i, label:"Gepäck", icon:"luggage"},
      {re:/kindersitz/i, label:"Kindersitz", icon:"child"},
      {re:/rollstuhl/i, label:"Rollstuhl", icon:"wheelchair"},
      {re:/haustier|tier/i, label:"Haustier", icon:"pet"},
      {re:/mehr als 4|fahrgäste|personen/i, label:"Mehr als 4", icon:"passengers"}
    ];

    $$("#booking .ride-options button,#booking .mini-options button,#booking .detail-chips button,#booking .fahrt-details button").forEach(btn=>{
      const found = map.find(m=>m.re.test(btn.textContent || ""));
      if(!found) return;
      btn.classList.add("tg340-chip");
      btn.innerHTML = '<span class="tg340-chip-icon">'+icons[found.icon]+'</span><span>'+found.label+'</span>';
    });
  }

  function renderNav(){
    $$(".bottom-nav button[data-go]").forEach(btn=>{
      const cfg = nav[btn.dataset.go];
      if(!cfg) return;
      btn.classList.add("tg340-nav-btn");
      if(btn.dataset.go === "yumak") btn.classList.add("tg340-yumak-nav");
      btn.innerHTML = '<span class="tg340-nav-icon">'+icons[cfg.icon]+'</span><span>'+cfg.label+'</span>';
    });
  }

  function setRideType(t){
    t = typeFromText(t) || "taxi";
    document.body.dataset.rideType = t;

    $$("#booking .tg340-type-card").forEach(btn=>btn.classList.toggle("active", btn.dataset.type === t));

    const selected = $("#booking .selected-type-v310 strong,#booking .selected-ride-type-v293 strong");
    if(selected) selected.textContent = ride[t].full;

    const context = $("#booking .booking-service-context");
    if(context) context.textContent = ride[t].full;

    $$("#booking .conditional-panel").forEach(p=>p.classList.remove("show"));
    if(t === "medical") $("#booking .medical-panel")?.classList.add("show");
    if(t === "airport") $("#booking .airport-panel")?.classList.add("show");
    if(t === "wheelchair") $("#booking .wheelchair-panel")?.classList.add("show");

    try{sessionStorage.setItem("tg_ride_type_v340", t)}catch(e){}
    try{window.updateBookingState && window.updateBookingState()}catch(e){}
  }

  function setTripMode(mode){
    mode = mode || "oneway";
    $$("#booking .tg340-trip-card").forEach(btn=>btn.classList.toggle("active", btn.dataset.tripMode === mode));
    document.body.dataset.tripMode = mode;
    try{sessionStorage.setItem("tg_trip_mode_v340", mode)}catch(e){}
  }

  function boot(){
    document.body.classList.add("tg340-ready");
    document.documentElement.classList.add("tg340-no-x");

    renderHomeCards();
    renderBookingTypes();
    renderTripCards();
    renderDetailChips();
    renderNav();

    let saved = "taxi";
    let savedTrip = "oneway";
    try{
      saved = sessionStorage.getItem("tg_ride_type_v340") || sessionStorage.getItem("tg_ride_type_v330") || "taxi";
      savedTrip = sessionStorage.getItem("tg_trip_mode_v340") || "oneway";
    }catch(e){}

    setRideType(saved);
    setTripMode(savedTrip);

    document.addEventListener("click", function(e){
      const typeCard = e.target.closest("#booking .tg340-type-card");
      if(typeCard){
        e.preventDefault();
        e.stopPropagation();
        setRideType(typeCard.dataset.type);
        return;
      }

      const tripCard = e.target.closest("#booking .tg340-trip-card");
      if(tripCard){
        e.preventDefault();
        e.stopPropagation();
        setTripMode(tripCard.dataset.tripMode);
        return;
      }

      const homeCard = e.target.closest("#home .tg340-home-card");
      if(homeCard){
        const t = homeCard.dataset.tg340Type;
        if(t) setRideType(t);
      }

      const go = e.target.closest("[data-go]");
      if(go){
        const t = typeFromText(go.dataset.go + " " + go.textContent);
        if(t) setRideType(t);
      }
    }, true);

    setTimeout(function(){
      renderHomeCards();
      renderNav();
      renderDetailChips();
      setRideType(document.body.dataset.rideType || saved);
    }, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
