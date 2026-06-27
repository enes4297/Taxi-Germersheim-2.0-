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
