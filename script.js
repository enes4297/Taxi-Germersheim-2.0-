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


/* V3.0.1 Booking UI Polish – safe icon/text cleanup */
(function(){
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s));}

  function cleanBookingTypeUI(){
    qsa(".booking-type-grid button").forEach(function(btn){
      const raw = ((btn.dataset.type || "") + " " + btn.textContent).toLowerCase();

      btn.classList.add("booking-type-polished");

      if(raw.includes("rollstuhl") || raw.includes("wheel")){
        btn.classList.add("booking-type-wheelchair-polished");
        btn.innerHTML = '<span class="booking-type-polish-icon" aria-hidden="true">♿</span><span class="booking-type-polish-label">Rollstuhl</span>';
      }

      if(raw.includes("taxi") && !raw.includes("kranken")){
        btn.classList.add("booking-type-taxi-polished");
      }

      if(raw.includes("kranken") || raw.includes("medical")){
        btn.classList.add("booking-type-medical-polished");
      }

      if(raw.includes("flug") || raw.includes("airport")){
        btn.classList.add("booking-type-airport-polished");
      }
    });
  }

  function polishDirectionButtons(){
    qsa(".ride-direction-v280 button,.ride-direction-v290 button,.ride-direction-v291 button,.direction-options button,.trip-type-grid button").forEach(function(btn){
      const text = btn.textContent || "";
      if(/Hinfahrt|Rückfahrt|Regelmäßig/.test(text)){
        btn.classList.add("trip-choice-polished");
      }
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      cleanBookingTypeUI();
      polishDirectionButtons();
      setTimeout(cleanBookingTypeUI, 400);
    });
  } else {
    cleanBookingTypeUI();
    polishDirectionButtons();
    setTimeout(cleanBookingTypeUI, 400);
  }
})();


/* V3.0.2 Booking Icon Precision – no logic changes */
(function(){
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s));}

  const icons = {
    taxi: '<span class="tg-svg-icon tg-svg-taxi" aria-hidden="true"></span>',
    medical: '<span class="tg-svg-icon tg-svg-medical" aria-hidden="true"></span>',
    wheelchair: '<span class="tg-svg-icon tg-svg-wheelchair" aria-hidden="true"></span>',
    airport: '<span class="tg-svg-icon tg-svg-airport" aria-hidden="true"></span>'
  };

  const labels = {
    taxi: "Taxi",
    medical: "Krankenfahrt",
    wheelchair: "Rollstuhl",
    airport: "Flughafen"
  };

  function norm(btn){
    const raw = ((btn.dataset.type || btn.dataset.rideType || btn.dataset.go || "") + " " + btn.textContent).toLowerCase();
    if(raw.includes("kranken") || raw.includes("medical")) return "medical";
    if(raw.includes("rollstuhl") || raw.includes("wheel")) return "wheelchair";
    if(raw.includes("flug") || raw.includes("airport")) return "airport";
    if(raw.includes("taxi")) return "taxi";
    return null;
  }

  function polish(){
    qsa(".booking-type-grid button").forEach(function(btn){
      const type = norm(btn);
      if(!type) return;
      if(btn.dataset.v302Polished === "1") return;

      btn.dataset.v302Polished = "1";
      btn.classList.add("type-card-v302", "type-card-" + type + "-v302");
      btn.innerHTML = icons[type] + '<span class="type-label-v302">' + labels[type] + '</span>';
    });

    qsa(".ride-direction-v280 button,.ride-direction-v290 button,.ride-direction-v291 button,.direction-options button,.trip-type-grid button").forEach(function(btn){
      btn.classList.add("trip-card-v302");
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      polish();
      setTimeout(polish, 300);
      setTimeout(polish, 900);
    });
  } else {
    polish();
    setTimeout(polish, 300);
    setTimeout(polish, 900);
  }
})();
