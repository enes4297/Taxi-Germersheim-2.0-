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
