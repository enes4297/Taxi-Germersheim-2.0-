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
