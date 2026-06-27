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


/* V2.9.5 Safe Booking Type Memory */
(function(){
  const labels = {
    taxi: "Normale Taxifahrt",
    medical: "Krankenfahrt",
    wheelchair: "Rollstuhlfahrt",
    airport: "Flughafentransfer"
  };

  function norm(v){
    v = (v || "").toLowerCase();
    if(v.includes("kranken") || v.includes("medical")) return "medical";
    if(v.includes("rollstuhl") || v.includes("wheel")) return "wheelchair";
    if(v.includes("flug") || v.includes("airport")) return "airport";
    if(v.includes("taxi")) return "taxi";
    return null;
  }

  function setType(type){
    type = norm(type) || "taxi";
    document.body.dataset.rideType = type;
    try{ sessionStorage.setItem("tg_selected_ride_type", type); }catch(e){}

    document.querySelectorAll(".selected-ride-type-v293 strong,.selected-ride-type-v294 strong").forEach(el=>{
      el.textContent = labels[type] || labels.taxi;
    });
  }

  document.addEventListener("click", function(e){
    const reset = e.target.closest("[data-reset-ride-type],.booking-change-type-v293 button");
    if(reset){
      e.preventDefault();
      setType("taxi");
      const grid = document.querySelector(".booking-type-grid,.ride-type-grid");
      if(grid) grid.scrollIntoView({behavior:"smooth", block:"center"});
      return;
    }

    const go = e.target.closest("[data-go]");
    if(go){
      const t = norm(go.dataset.go || go.textContent);
      if(t) setType(t);
    }

    const typeBtn = e.target.closest("[data-type],[data-ride-type]");
    if(typeBtn){
      const t = norm(typeBtn.dataset.type || typeBtn.dataset.rideType || typeBtn.textContent);
      if(t) setType(t);
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function(){
    let saved = "taxi";
    try{ saved = sessionStorage.getItem("tg_selected_ride_type") || "taxi"; }catch(e){}
    setType(saved);
  });
})();
