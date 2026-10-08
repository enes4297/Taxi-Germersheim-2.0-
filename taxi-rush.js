/* ═══════════════════════════════════════════════════════════════════════
   Taxi Rush
   ═══════════════════════════════════════════════════════════════════════

   Spiellogik und Darstellung nach der freigegebenen Vorlage
   design-vorlagen/Taxi-Rush.html. Das Spielprinzip ist unveraendert
   uebernommen: zwei Fahrzeuge, 18 Haltepunkte, 75 Sekunden, drei Leben,
   +12 Sekunden je Fahrt, Boost, steigendes Tempo, Ton anfangs aus,
   oertlicher Bestwert.

   ── WAS FUER DIE EINBINDUNG GEAENDERT WURDE ──────────────────────────

   Die Vorlage ist eine eigenstaendige Seite. Hier laeuft sie in einer
   Spielewelt mit Navigation, Formularen und anderen Abschnitten. Daraus
   folgen vier Aenderungen - und nur diese vier:

   1. ALLES HAENGT AN EINER WURZEL. `$()` sucht nicht mehr im ganzen
      Dokument, sondern nur innerhalb von [data-taxi-rush]. Zwei Spiele
      auf einer Seite waeren damit moeglich; wichtiger ist, dass das
      Spiel nichts ausserhalb seiner selbst anfasst.

   2. DIE SCHLEIFE LAEUFT NUR, WENN DAS SPIEL OFFEN IST. Die Vorlage
      startet requestAnimationFrame beim Laden und laesst es laufen. Hier
      startet sie beim Oeffnen und wird beim Verlassen gestoppt.
      `schleifeLaeuft` verhindert, dass ein zweiter Aufruf eine zweite
      Schleife anwirft - das waere ein doppelt so schnelles Spiel, und
      man saehe es nicht sofort.

   3. DIE TASTATUR WIRD NUR ABGEFANGEN, WENN DAS SPIEL DRAN IST. Die
      Vorlage haengt an `window` und ruft `preventDefault()` fuer
      Pfeiltasten, Leertaste, P und Escape. Auf einer Seite mit
      Eingabefeldern und Navigation waere das ein Fehler: Man koennte
      nicht mehr scrollen und in keinem Feld mehr tippen. Hier greift die
      Tastatur nur, wenn das Spiel laeuft UND der Fokus im Spiel liegt.

   4. DAS MARKENZEICHEN KOMMT AUS EINER DATEI statt als eingebettete
      Daten - dieselbe Datei, die das Gluecksrad benutzt.

   ── WAS AUSDRUECKLICH NICHT UEBERNOMMEN WURDE ────────────────────────

   `window.taxiRushPreview` - die Entwicklungsdiagnostik der Vorlage.
   Sie legt den kompletten Spielzustand offen. Das gehoert nicht in eine
   ausgelieferte Seite.

   ── KEINE REWARDS ────────────────────────────────────────────────────

   Der Bestwert liegt ausschliesslich im Browser des Spielers. Es gibt
   hier keine Supabase-Anbindung, keine Punkte, keine Gutscheine und
   keine Anmeldung.
*/
(function () {
  'use strict';

  const wurzel = document.querySelector('[data-taxi-rush]');
  if (!wurzel) return;

  /** Sucht NUR im Spiel, nicht im ganzen Dokument. */
  const $ = (id) => wurzel.querySelector('[data-tr="' + id + '"]');

  const canvas = $('canvas');
  const c = canvas.getContext('2d', { alpha: false });

  // Dasselbe Markenzeichen wie am Gluecksrad - als Datei, nicht als
  // eingebettete Daten. Der relative Pfad gilt von spiele.html aus.
  const logo = new Image();
  logo.src = 'assets/brand/tg-bildzeichen.svg';
  $('brandLogo').src = logo.src;

  // Ortsnamen aus der Vorlage, dort belegt mit: bahnhof.de/germersheim,
  // /lingenfeld, /sondernheim; germersheim.eu (Bushaltestellen, KUMUNA);
  // bundeswehr.de (Suedpfalz-Kaserne). Die Strecke dazwischen ist frei
  // gestaltet - das steht auch in der Fusszeile des Spiels.
  let W=1000,H=760,DPR=1,road=350,cx=500,laneWidth=100,mode='menu',selected='sedan',score=0,time=75,lives=3,trips=0,best=0,lane=1,px=0,world=0,elapsed=0,charge=100,boosting=false,boostDown=false,invul=0,entities=[],spawn=0,passenger=false,tripDistance=0,toastTime=0,last=0,frame=0,audio=null,sound=false,combo=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const stops=[{"name": "Bahnhof Germersheim", "area": "Germersheim"}, {"name": "Bahnhof Lingenfeld", "area": "Lingenfeld"}, {"name": "Südpfalz-Kaserne", "area": "Germersheim"}, {"name": "Kirchstraße", "area": "Sondernheim"}, {"name": "Bahnhof Sondernheim", "area": "Sondernheim"}, {"name": "Germersheimer Straße", "area": "Sondernheim"}, {"name": "Rathaus Sondernheim", "area": "Sondernheim"}, {"name": "Bahnhofstraße", "area": "Germersheim"}, {"name": "Bahnhofstraße", "area": "Lingenfeld"}, {"name": "Königsplatz", "area": "Germersheim"}, {"name": "Ludwigstraße", "area": "Germersheim"}, {"name": "Hauptstraße", "area": "Germersheim"}, {"name": "Marktstraße", "area": "Germersheim"}, {"name": "Bellheimer Straße", "area": "Germersheim"}, {"name": "An Fronte Karl", "area": "Germersheim"}, {"name": "An der Hexenbrücke", "area": "Germersheim"}, {"name": "Germersheim Mitte/Rhein", "area": "Germersheim"}, {"name": "Rudolf-von-Habsburg-Straße", "area": "Germersheim"}];let stopBag=[],pickupStop=stops[0],destinationStop=stops[1],coinClock=1.7,lastCoinLane=-1;function nextStop(){if(!stopBag.length){stopBag=stops.slice();for(let i=stopBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[stopBag[i],stopBag[j]]=[stopBag[j],stopBag[i]]}}return stopBag.pop()}function nextRoute(){pickupStop=nextStop();destinationStop=nextStop();if(destinationStop===pickupStop){stopBag.unshift(destinationStop);destinationStop=nextStop()}}function baseSpeed(){return 165+250*(1-Math.exp(-elapsed/120))} 

  /* ── Der Bestwert ───────────────────────────────────────────────────

     EIGENER SCHLUESSEL, und das mit Absicht.

     Die vorige Fassung zaehlte anders: +75 je Abholung, +35 je Muenze,
     +200 und +500, dazu Zeit mal 16. Diese Fassung zaehlt +20, +100,
     +25, +400 und Tempo mal 0,018. Die Zahlen sind NICHT vergleichbar.

     Der alte Wert liegt unter tg_taxi_rush_best_score und wird WEDER
     uebernommen NOCH geloescht. Steht dort etwas, sagt die Seite einmal,
     warum der Rekord hier bei null anfaengt. Einen alten Wert
     stillschweigend als neuen Rekord auszugeben, waere eine Behauptung
     ueber eine Leistung, die so nie erbracht wurde.

     Jeder Speicherzugriff steht in try/catch: Ein gesperrter oder
     voller Speicher darf das Spiel nicht aufhalten.
  */
  try {
    best = Math.max(0, Number(localStorage.getItem('tg-rush-best-v1')) || 0);
  } catch { /* ohne Speicher faengt der Rekord bei null an */ }
  $('best').textContent = best;

  try {
    const alterWert = Number(localStorage.getItem('tg_taxi_rush_best_score')) || 0;
    const hinweis = $('oldBest');
    if (alterWert > 0 && hinweis) {
      hinweis.hidden = false;
      hinweis.textContent =
        'Ihr Bestwert aus der vorigen Fassung (' + alterWert.toLocaleString('de-DE') +
        ') wird nicht übernommen: Diese Version zählt die Punkte anders. ' +
        'Der alte Wert bleibt gespeichert.';
    }
  } catch { /* ohne Speicher gibt es auch keinen alten Wert */ }


  const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
  function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);c.setTransform(DPR,0,0,DPR,0,0);road=Math.min(W*.71,370);laneWidth=road/3;cx=W/2;px=laneX(lane)}
  // Der ResizeObserver der Vorlage stand hier und liess sich nicht
  // abmelden. Er wird jetzt unten angelegt und beim Verlassen getrennt.
  function laneX(n){return cx+(n-1)*laneWidth}function playerY(){return H*.76}function rr(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}function txt(t,x,y,size,color,align='center',weight='600'){c.fillStyle=color;c.font=`${weight} ${size}px Arial`;c.textAlign=align;c.fillText(t,x,y)}
  function beep(freq=500,len=.08){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len)}catch{}}
  const sprites={};function carSprite(color,van=false,taxi=false){const key=color+van+taxi;if(sprites[key])return sprites[key];const s=document.createElement('canvas');s.width=120;s.height=230;const a=s.getContext('2d');rr(a,17,16,93,201,25,'#0004');rr(a,15,53,13,37,3,'#05090c');rr(a,94,53,12,37,3,'#05090c');rr(a,15,157,13,37,3,'#05090c');rr(a,94,157,12,37,3,'#05090c');const g=a.createLinearGradient(20,0,100,0);g.addColorStop(0,'#484f51');g.addColorStop(.12,color);g.addColorStop(.45,color);g.addColorStop(.7,taxi?(van?'#4d5964':'#ffe38b'):'#b2c0c5');g.addColorStop(.88,color);g.addColorStop(1,'#444d50');rr(a,22,12,77,202,van?15:30,g);rr(a,29,20,63,38,van?7:15,g);rr(a,28,54,65,36,10,'#071b2b');const glass=a.createLinearGradient(30,55,90,89);glass.addColorStop(0,'#567482');glass.addColorStop(.4,'#1a3548');glass.addColorStop(1,'#122533');rr(a,31,55,59,30,8,glass);a.fillStyle='#78949c66';a.fillRect(35,60,4,22);rr(a,31,94,58,van?76:56,8,g);rr(a,29,van?175:158,63,28,8,glass);rr(a,26,24,18,5,2,'#f1f5df');rr(a,77,24,18,5,2,'#f1f5df');rr(a,25,199,17,6,2,'#df6753');rr(a,80,199,16,6,2,'#df6753');rr(a,47,204,27,5,1,'#ddd4a8');a.strokeStyle='#282f3c80';a.lineWidth=2;a.strokeRect(27,93,4,62);a.strokeRect(90,93,4,62);a.strokeStyle=taxi&&van?'#71808b66':'#ffffff44';a.lineWidth=1;a.beginPath();a.moveTo(36,35);a.lineTo(34,49);a.moveTo(84,35);a.lineTo(87,49);a.stroke();rr(a,45,17,31,3,1,'#1b2429');for(let k=0;k<6;k++)rr(a,47+k*5,17,1,3,0,'#829094');rr(a,14,85,12,7,3,color);rr(a,95,85,12,7,3,color);a.strokeStyle='#10171b88';a.beginPath();a.moveTo(30,119);a.lineTo(30,179);a.moveTo(91,119);a.lineTo(91,179);a.stroke();if(van){rr(a,35,97,3,68,1,'#72808a66');rr(a,83,97,3,68,1,'#72808a66');rr(a,33,162,7,2,1,'#929ba2')}if(taxi){rr(a,38,102,45,15,4,'#f3cc6c');a.fillStyle='#292115';a.font='bold 10px Arial';a.textAlign='center';a.fillText('TAXI',60,113);a.strokeStyle='#e3ba55';a.lineWidth=3;a.beginPath();a.moveTo(27,128);a.lineTo(27,181);a.moveTo(94,128);a.lineTo(94,181);a.stroke();if(logo.complete&&logo.naturalWidth)a.drawImage(logo,46,126,29,36)}sprites[key]=s;return s}
  logo.onload=()=>{for(const k in sprites)delete sprites[k]};
  function drawCar(x,y,width,color,van,taxi,angle=0){c.save();c.translate(x,y);c.rotate(angle);if(taxi){const glow=c.createLinearGradient(0,-width,0,-width*3.3);glow.addColorStop(0,'#fff6bc23');glow.addColorStop(1,'#fff6bc00');c.fillStyle=glow;c.beginPath();c.moveTo(-width*.4,-width*.75);c.lineTo(-width*.9,-width*3);c.lineTo(width*.9,-width*3);c.lineTo(width*.4,-width*.75);c.fill()}c.drawImage(carSprite(color,van,taxi),-width/2,-width*.95,width,width*1.92);c.restore()}
  function building(x,y,w,h,i){
  // Individual pitched roofs, illuminated facades and rooftop details.
  const count=Math.max(1,Math.floor(w/108)),gap=12,bw=(w-gap*(count-1))/count;
  for(let n=0;n<count;n++){const xx=x+n*(bw+gap),hh=h-((i+n)%3)*12,yy=y+((i+n)%2)*8;const base=['#875e4e','#6d7b78','#977964','#536c78','#a28b73'][(i+n)%5];rr(c,xx+13,yy+18,bw,hh,2,'#060c1666');rr(c,xx,yy,bw,hh,2,'#b3a18a');c.fillStyle='#536168';c.fillRect(xx+bw-8,yy+8,8,hh);c.fillStyle='#b7aa8b';c.fillRect(xx,yy+hh-12,bw-8,12);
  const roof=c.createLinearGradient(xx,0,xx+bw,0);roof.addColorStop(0,base);roof.addColorStop(.48,base);roof.addColorStop(.5,'#b8a092');roof.addColorStop(.53,'#493f3d');roof.addColorStop(1,base);rr(c,xx-3,yy-3,bw+4,hh-11,2,roof);c.strokeStyle='#10182433';c.lineWidth=1;for(let ty=yy+5;ty<yy+hh-15;ty+=8){c.beginPath();c.moveTo(xx,ty);c.lineTo(xx+bw,ty);c.stroke()}c.fillStyle='#c0b4a388';c.fillRect(xx+bw*.49,yy-3,2,hh-11);
  rr(c,xx+bw*.2,yy+23,13,21,1,'#302e2a');rr(c,xx+bw*.2-2,yy+20,15,7,1,'#90857b');rr(c,xx+bw*.65,yy+hh*.5,14,22,2,'#152b39');c.fillStyle='#74939a';c.fillRect(xx+bw*.65+2,yy+hh*.5+2,10,7);
  for(let wx=xx+9;wx<xx+bw-10;wx+=17){c.fillStyle=(n+i)%2?'#f9d78b':'#98aca3';c.fillRect(wx,yy+hh-10,8,6)}c.fillStyle='#293c42';c.fillRect(xx+8,yy+hh+3,bw-14,6);}
  }
  function tree(x,y,r,i){c.fillStyle='#0004';c.beginPath();c.ellipse(x+8,y+9,r,r*.8,0,0,7);c.fill();const palette=['#315b4f','#3b6654','#48775b'];for(let k=0;k<5;k++){let angle=k*1.256;c.fillStyle=palette[(i+k)%3];c.beginPath();c.arc(x+Math.cos(angle)*r*.35,y+Math.sin(angle)*r*.35,r*.68,0,7);c.fill()}c.fillStyle='#7b9d6944';c.beginPath();c.arc(x-r*.24,y-r*.24,r*.52,0,7);c.fill()}
  const asphalt=document.createElement('canvas');asphalt.width=96;asphalt.height=96;const ac=asphalt.getContext('2d');ac.fillStyle='#29353d';ac.fillRect(0,0,96,96);for(let i=0;i<380;i++){const x=(i*37)%96,y=(i*53+Math.floor(i/96)*11)%96;ac.fillStyle=i%2?'#c5d1d208':'#09131f18';ac.fillRect(x,y,1,1)}let asphaltPattern=null;
  function roadsideAd(x,y,w,compact){c.fillStyle='#253038';c.fillRect(x+5,y+43,3,17);c.fillRect(x+w-8,y+43,3,17);rr(c,x+3,y+5,w,compact?74:55,3,'#0005');rr(c,x,y,w,compact?72:53,3,'#18252b');c.strokeStyle='#bca56f88';c.lineWidth=1;c.strokeRect(x+2,y+2,w-4,compact?68:49);if(compact){if(logo.complete&&logo.naturalWidth)c.drawImage(logo,x+w/2-10,y+6,20,25);txt('TAXI',x+w/2,y+42,8,'#e2c585');txt('07274',x+w/2,y+54,8,'#c6c9bb');txt('3567',x+w/2,y+65,9,'#e2c585')}else{if(logo.complete&&logo.naturalWidth)c.drawImage(logo,x+10,y+8,26,33);txt('TAXI GERMERSHEIM',x+46,y+20,9,'#dec48d','left');txt('07274 · 3567',x+46,y+38,14,'#d5d4bc','left')}}
  function localScenery(left,right){const step=1650;const start=Math.max(0,Math.floor((world-H-130)/step));for(let k=start;k<Math.ceil((world+300)/step)+1;k++){const y=world-k*step-180;if(y< -100||y>H+100)continue;const available=left-18,compact=available<175;const w=compact?Math.max(30,Math.min(46,available)):175;const x=k%2===0?Math.max(4,left-w-10):right+10;roadsideAd(x,y,w,compact)}

  }
  function environment(){c.fillStyle='#18343c';c.fillRect(0,0,W,H);const left=cx-road/2,right=cx+road/2,offset=world%260; // stylized street blocks, not a geographic map
  for(let j=-1;j<H/260+1;j++){const y=j*260+offset,i=((Math.floor(world/260)-j)%9+9)%9;c.fillStyle='#244750';c.fillRect(0,y+180,W,52);c.fillStyle='#3b5159';c.fillRect(left-35,y-6,road+70,10);if(W>650){building(25,y+15,Math.max(65,left-106),132,i);building(right+55,y+12,Math.max(65,W-right-98),136,i+1);tree(left-70,y+179,23,i);tree(right+80,y+193,26,i+1);{for(let p=0;p<3;p++)drawCar(left-130-p*43,y+214,22,'#7e9795',false,false)}}else{building(-48,y+14,Math.max(70,left-17),127,i);building(right+26,y+20,85,137,i+2);}for(let t=0;t<3;t++){tree(left-24,y+30+t*65,12,i+t);tree(right+24,y+52+t*64,12,i+t+1)}}
  c.fillStyle='#43555c';c.fillRect(left-11,0,road+22,H);c.fillStyle='#929687';c.fillRect(left-3,0,road+6,H);c.fillStyle='#222e37';c.fillRect(left,0,road,H);asphaltPattern??=c.createPattern(asphalt,'repeat');c.save();c.translate(0,world%96);c.fillStyle=asphaltPattern;c.fillRect(left+5,-96,road-10,H+192);c.restore();const shine=c.createLinearGradient(left,0,right,0);shine.addColorStop(0,'#111c2477');shine.addColorStop(.45,'#50647711');shine.addColorStop(1,'#121b2677');c.fillStyle=shine;c.fillRect(left,0,road,H);
  for(let n=1;n<=2;n++){c.fillStyle='#8b998e80';for(let y=(world%92)-92;y<H;y+=92)c.fillRect(left+laneWidth*n-1,y,2,43)}for(let y=(world%260)-260;y<H;y+=260){c.fillStyle='#c4b78a55';c.fillRect(left+6,y,2,95);c.fillRect(right-8,y,2,95);c.fillStyle='#101d29';c.fillRect(left-12,y+9,5,8);c.fillRect(right+7,y+9,5,8);c.fillStyle='#f8d893';c.fillRect(left-13,y+8,7,3);c.fillRect(right+6,y+8,7,3)}
  for(let y=(world%260)-260;y<H;y+=260){const pool=c.createRadialGradient(left+2,y+14,0,left+2,y+14,90);pool.addColorStop(0,'#f5d18718');pool.addColorStop(1,'#f5d18700');c.fillStyle=pool;c.fillRect(left-88,y-76,180,180)}if(W>850){c.fillStyle='#0c293bcc';c.fillRect(W-42,0,42,H);for(let y=world*.3%60;y<H;y+=60){c.fillStyle='#76b6c41a';c.fillRect(W-35,y,23,1)}}}

  function token(e){const x=laneX(e.lane),y=e.y;if(e.type==='traffic'){drawCar(x,y,laneWidth*.53,e.color,e.van,false);return}if(e.type==='coin'){c.fillStyle='#f3ca6880';c.beginPath();c.arc(x,y,14,0,7);c.fill();c.fillStyle='#e8bd59';c.beginPath();c.arc(x,y,10,0,7);c.fill();txt('★',x,y+4,12,'#fff1b8');return}const color=e.type==='pickup'?'#f2c563':'#78d9b7';rr(c,x-laneWidth*.42,y-43,laneWidth*.84,86,10,e.type==='pickup'?'#dcae402d':'#59cba132');c.strokeStyle=color;c.lineWidth=2;c.setLineDash([8,6]);c.strokeRect(x-laneWidth*.42,y-43,laneWidth*.84,86);c.setLineDash([]);txt(e.type==='pickup'?'ABHOLEN':'ZIEL',x,y-22,9,color);if(e.type==='pickup'){c.fillStyle=color;c.beginPath();c.arc(x,y-4,7,0,7);c.fill();rr(c,x-8,y+6,16,20,5,color)}else{txt('✓',x,y+20,32,color)} }
  function draw(dt){environment();localScenery(cx-road/2,cx+road/2);for(let y=world%720-720;y<H;y+=720){c.strokeStyle='#101c2388';c.lineWidth=2;c.beginPath();c.ellipse(cx+road*.36,y,9,12,0,0,7);c.stroke();for(let n=-5;n<=5;n+=5){c.beginPath();c.moveTo(cx+road*.36-6,y+n);c.lineTo(cx+road*.36+6,y+n);c.stroke()}}entities.forEach(token);const preview=mode==='menu';if(preview){drawCar(laneX(0),H*.32,laneWidth*.52,'#8597a0',false,false);drawCar(laneX(2),H*.08,laneWidth*.55,'#7e7774',true,false);token({lane:1,y:H*.47,type:'coin'});}const carW=Math.min(65,laneWidth*.62);if(boosting&&!reduced){c.fillStyle='#e5ba632e';c.fillRect(px-carW*.3,playerY()+carW*.6,carW*.6,60)}if(invul<=0||Math.floor(invul*8)%2===0)drawCar(px,playerY(),carW,selected==='van'?'#151b23':'#e8b932',selected==='van',true,Math.max(-.09,Math.min(.09,(laneX(lane)-px)/350)));const vignette=c.createLinearGradient(0,0,0,H);vignette.addColorStop(0,'#06111e88');vignette.addColorStop(.25,'#06111e00');vignette.addColorStop(.8,'#06111e00');vignette.addColorStop(1,'#06111e77');c.fillStyle=vignette;c.fillRect(0,0,W,H)}
  function notify(msg){$('toast').textContent=msg;$('toast').classList.add('is-on');toastTime=2}
  function hud(){ $('score').textContent=Math.floor(score).toLocaleString('de-DE');$('time').textContent=Math.max(0,Math.ceil(time));$('time').classList.toggle('tr-low-time',time<15);$('health').textContent='● '.repeat(lives)+'○ '.repeat(3-lives);$('health').setAttribute('aria-label',lives+' Leben');$('boostFill').style.width=charge+'%';$('speed').textContent=(boosting?'BOOST · ':'')+'TEMPOSTUFE '+(1+Math.floor(elapsed/20));const stop=passenger?destinationStop:pickupStop;$('missionTag').textContent=(passenger?'ZIEL · ':'ABHOLUNG · ')+stop.area;$('missionText').textContent=stop.name;$('routeLine').textContent=passenger?'Fahrgast an Bord · grüne Zielzone treffen':'Danach: '+destinationStop.name+' · '+destinationStop.area;$('progress').style.width=(passenger?Math.min(100,tripDistance/1900*100):0)+'%'}
  function start(){mode='playing';score=0;time=75;lives=3;trips=0;lane=1;px=laneX(1);world=0;elapsed=0;charge=100;boostDown=false;boosting=false;invul=0;entities=[];spawn=1.3;passenger=false;tripDistance=0;stopBag=[];nextRoute();coinClock=1.7;lastCoinLane=-1;combo=0;entities.push({type:'pickup',lane:1,y:-80});$('overlay').hidden=true;$('hero').hidden=false;$('pauseHero').hidden=true;$('endHero').hidden=true;$('pause').disabled=false;notify('Goldene Zone: Fahrgast abholen');hud();canvas.setAttribute('tabindex','0');canvas.focus({preventScroll:true});beep(440)}
  function shift(dir){if(mode!=='playing')return;lane=Math.max(0,Math.min(2,lane+dir));beep(210,.025)}
  function pause(){if(mode!=='playing')return;mode='paused';boostDown=false;boosting=false;$('overlay').hidden=false;$('hero').hidden=true;$('endHero').hidden=true;$('pauseHero').hidden=false;$('resume').focus({preventScroll:true})}
  function resume(){if(mode!=='paused')return;mode='playing';$('overlay').hidden=true;last=performance.now();canvas.focus({preventScroll:true})}
  function end(){mode='ended';boostDown=false;boosting=false;score=Math.floor(score);const record=score>best;if(record){best=score;try{localStorage.setItem('tg-rush-best-v1',String(best))}catch{}}$('overlay').hidden=false;$('hero').hidden=true;$('pauseHero').hidden=true;$('endHero').hidden=false;$('endTag').textContent=record?'NEUER PERSÖNLICHER REKORD':'SCHICHT BEENDET';$('endTitle').textContent=lives?'Feierabend, Germersheim.':'Kurz in die Werkstatt.';$('endScore').textContent=score.toLocaleString('de-DE');$('endTrips').textContent=trips;$('endCopy').textContent=trips?'Sauber! Schaffst du in der nächsten Schicht eine Fahrt mehr?':'Tipp: Die goldene Abholzone treffen, danach die grüne Zielzone. Boost hilft auf freien Spuren.';$('best').textContent=best;$('again').focus({preventScroll:true});beep(240,.2)}
  function update(dt){if(mode!=='playing')return;elapsed+=dt;time-=dt;invul=Math.max(0,invul-dt);boosting=boostDown&&charge>1;charge=Math.max(0,Math.min(100,charge+(boosting?-35:12)*dt));const speed=baseSpeed()*(boosting?1.4:1);world+=speed*dt;score+=speed*dt*.018;px+=(laneX(lane)-px)*(1-Math.exp(-15*dt));spawn-=dt;if(passenger)tripDistance+=speed*dt;
  const hasMission=entities.some(e=>!e.done&&(e.type==='pickup'||e.type==='drop'));if(passenger&&!hasMission&&tripDistance>1400){entities.push({type:'drop',lane:Math.floor(rand(0,3)),y:-70});}
  if(!passenger&&!hasMission){entities.push({type:'pickup',lane:Math.floor(rand(0,3)),y:-90});}
  if(spawn<=0){spawn=rand(1.8,2.3)/Math.min(1.55,baseSpeed()/165);let blocked=new Set(entities.filter(e=>(e.y<180&&e.type==='traffic')||((e.type==='pickup'||e.type==='drop')&&e.y<playerY()+80)).map(e=>e.lane));let available=[0,1,2].filter(n=>!blocked.has(n));if(available.length){let l=pick(available);entities.push({type:'traffic',lane:l,y:-110,color:pick(['#7897a3','#d6d2b7','#a57269','#677d8b']),van:Math.random()<.25});}}
  coinClock-=dt;if(coinClock<=0){coinClock=rand(1.25,2.1);const free=[0,1,2].filter(n=>n!==lastCoinLane&&!entities.some(e=>e.lane===n&&e.y<110&&e.type!=='coin'));if(free.length){lastCoinLane=pick(free);entities.push({type:'coin',lane:lastCoinLane,y:-55})}}
  for(const e of entities){e.y+=speed*dt*(e.type==='traffic'?.73:1);const dy=Math.abs(e.y-playerY()),dx=Math.abs(laneX(e.lane)-px);if(e.type==='traffic'){if(!e.hit&&invul<=0&&dx<laneWidth*.42&&dy<58){e.hit=true;lives--;combo=0;invul=1.8;charge=Math.max(0,charge-20);$('flash').classList.remove('is-hit');void $('flash').offsetWidth;$('flash').classList.add('is-hit');notify('Blechschaden · eine Chance weniger');beep(110,.18)}if(!e.passed&&e.y>playerY()+65){e.passed=true;if(!e.hit){combo++;score+=20;if(combo%5===0){score+=100;notify('Saubere Serie! +100');beep(660)}}}}else if(!e.done&&dx<laneWidth*.42&&dy<45){e.done=true;if(e.type==='coin'){score+=25;charge=Math.min(100,charge+4);beep(780,.04)}else if(e.type==='pickup'&&!passenger){passenger=true;tripDistance=0;score+=100;notify('Fahrgast an Bord! +100');beep(660,.12)}else if(e.type==='drop'&&passenger){trips++;score+=400;time=Math.min(99,time+12);passenger=false;nextRoute();charge=Math.min(100,charge+25);notify('Fahrt geschafft! +400 · +12 Sekunden');beep(880,.2)}}
  if(!e.done&&e.y>H+110&&(e.type==='pickup'||e.type==='drop')){e.done=true;if(e.type==='drop')tripDistance=1500}}
  entities=entities.filter(e=>!e.done&&e.y<H+130);if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('is-on')}if(lives<=0||time<=0)end();if(frame%5===0)hud()}
  function loop(now){const dt=Math.min(.035,Math.max(0,(now-last)/1000));last=now;frame++;update(dt);if(mode==='menu'&&!reduced)world+=25*dt;draw(dt);
    // Nur weiterlaufen, solange die Schleife laufen SOLL. Ohne diese
    // Bedingung liefe sie nach dem Verlassen weiter - und ein zweites
    // Oeffnen haette zwei Schleifen nebeneinander.
    if (schleifeLaeuft) schleifenId = requestAnimationFrame(loop);
  }
  // Die Vorlage bindet hier ihre Knoepfe. Das steht weiter unten noch
  // einmal - mit Fokus ohne Springen und mit abmeldbaren Zuhoerern.
  // Die Zeile der Vorlage wuerde nur ueberschrieben und ist deshalb
  // hier entfallen; inhaltlich fehlt nichts.
  // ── Bedienung ────────────────────────────────────────────────────────
  //
  // Alle Zuhoerer werden gemerkt, damit sie beim Verlassen wieder weg
  // koennen. Ein Spiel, das nach dem Schliessen noch auf Tasten hoert,
  // ist ein Spiel, das die Seite kaputtmacht.
  const zuhoerer = [];
  function hoereAuf(ziel, art, fn, opt) {
    ziel.addEventListener(art, fn, opt);
    zuhoerer.push(() => ziel.removeEventListener(art, fn, opt));
  }

  /*
    Beim Start das Spiel aus dem Schatten des Seitenkopfes holen.

    Der Kopf der Seite klebt oben und liegt auf z-index 100. Steht der
    obere Rand des Spiels darunter, sind Punkte, Zeit, Tonknopf und
    Pausenknopf verdeckt - bedienen laesst sich dann nichts mehr. Der
    noetige Abstand steht als scroll-margin-top in taxi-rush.css; hier
    wird nur angesprungen, und auch das nur, wenn es wirklich klemmt.
  */
  function insBildRuecken() {
    const app = wurzel.querySelector('.tr-app');
    const k = app.getBoundingClientRect();
    // Beides zaehlt: der eigene Abstand am Abschnitt und das
    // scroll-padding der Seite. Der Browser addiert sie beim Anspringen.
    const abstand = (parseFloat(getComputedStyle(app).scrollMarginTop) || 0)
      + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    if (k.top < abstand - 4 || k.bottom > innerHeight) {
      app.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  const startUndAnzeigen = () => { insBildRuecken(); start(); };
  $('start').onclick = startUndAnzeigen;
  $('again').onclick = startUndAnzeigen;
  $('restartPause').onclick = startUndAnzeigen;
  $('pause').onclick = () => (mode === 'playing' ? pause() : mode === 'paused' ? resume() : null);
  $('resume').onclick = resume;
  $('garage').onclick = () => {
    mode = 'menu';
    entities = [];   // wie in der Vorlage: kein Verkehr hinter dem Menue
    $('overlay').hidden = false;
    $('hero').hidden = false;
    $('pauseHero').hidden = true;
    $('endHero').hidden = true;
    $('start').focus({ preventScroll: true });
  };
  $('left').onclick = () => shift(-1);
  $('right').onclick = () => shift(1);

  for (const b of wurzel.querySelectorAll('[data-car]')) {
    b.onclick = () => {
      selected = b.dataset.car;
      for (const o of wurzel.querySelectorAll('[data-car]')) {
        o.setAttribute('aria-pressed', String(o === b));
      }
      beep(520);
    };
  }

  hoereAuf($('boost'), 'pointerdown', (e) => {
    boostDown = true;
    try { $('boost').setPointerCapture(e.pointerId); } catch { /* egal */ }
  });
  for (const evt of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    hoereAuf($('boost'), evt, () => { boostDown = false; });
  }

  $('sound').onclick = () => {
    sound = !sound;
    $('sound').textContent = sound ? 'Ton an' : 'Ton aus';
    $('sound').setAttribute('aria-pressed', String(sound));
    $('sound').setAttribute('aria-label', sound ? 'Ton ausschalten' : 'Ton einschalten');
    if (sound) beep();
  };

  // ── Tastatur: nur wenn das Spiel dran ist ────────────────────────────
  //
  // Zwei Bedingungen muessen BEIDE erfuellt sein:
  //   - das Spiel laeuft oder pausiert (nicht im Menue, nicht beendet)
  //   - der Fokus liegt im Spiel
  //
  // Sonst bleibt die Seite bedienbar: scrollen mit den Pfeiltasten,
  // tippen in Feldern, Leertaste auf Knoepfen.
  function tastaturGiltJetzt(e) {
    if (mode !== 'playing' && mode !== 'paused') return false;
    const ziel = e.target;
    if (ziel instanceof HTMLInputElement || ziel instanceof HTMLTextAreaElement || ziel instanceof HTMLSelectElement) return false;
    if (ziel instanceof HTMLElement && ziel.isContentEditable) return false;
    return wurzel.contains(document.activeElement);
  }

  hoereAuf(window, 'keydown', (e) => {
    if (!tastaturGiltJetzt(e)) return;
    // Leertaste und Eingabetaste auf einem Knopf gehoeren dem Knopf.
    if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD', 'KeyP', 'Escape'].includes(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') shift(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') shift(1);
    if (e.code === 'Space' && mode === 'playing') boostDown = true;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (mode === 'playing') pause();
      else if (mode === 'paused') resume();
    }
  });

  hoereAuf(window, 'keyup', (e) => {
    if (e.code === 'Space') boostDown = false;
  });

  // ── Wischen ──────────────────────────────────────────────────────────
  //
  // Nur auf dem Spielfeld. Ausserhalb bleibt das Scrollen unberuehrt:
  // touch-action: none steht in der CSS ausschliesslich an .tr-canvas.
  let wischX = null;
  hoereAuf(canvas, 'pointerdown', (e) => {
    wischX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* egal */ }
  });
  hoereAuf(canvas, 'pointerup', (e) => {
    if (wischX !== null && Math.abs(e.clientX - wischX) > 22) shift(e.clientX > wischX ? 1 : -1);
    wischX = null;
  });
  hoereAuf(canvas, 'pointercancel', () => { wischX = null; });

  // ── Pausieren, wenn niemand hinsieht ─────────────────────────────────
  hoereAuf(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  hoereAuf(window, 'blur', () => { boostDown = false; pause(); });

  // ── Die Bildschleife ─────────────────────────────────────────────────
  //
  // `schleifeLaeuft` ist der Riegel gegen zwei Schleifen. Die Vorlage
  // brauchte ihn nicht, weil sie allein auf der Seite lag; hier kann das
  // Spiel mehrfach geoeffnet werden.
  let schleifenId = 0;
  let schleifeLaeuft = false;

  function schleifeStarten() {
    if (schleifeLaeuft) return;
    schleifeLaeuft = true;
    last = performance.now();
    schleifenId = requestAnimationFrame(loop);
  }

  function schleifeStoppen() {
    if (!schleifeLaeuft) return;
    schleifeLaeuft = false;
    cancelAnimationFrame(schleifenId);
    schleifenId = 0;
  }

  /** Das Spiel oeffnen: zeichnen und die Schleife anwerfen. */
  function oeffnen() {
    resize();
    schleifeStarten();
  }

  /**
   * Das Spiel verlassen: Schleife anhalten, Ton schliessen, Zuhoerer
   * abmelden. Danach verbraucht das Spiel nichts mehr.
   */
  function schliessen() {
    schleifeStoppen();
    mode = 'menu';
    boostDown = false;
    boosting = false;
    if (audio) {
      try { audio.close(); } catch { /* egal */ }
      audio = null;
    }
    for (const ab of zuhoerer.splice(0)) ab();
    beobachter.disconnect();
  }

  const beobachter = new ResizeObserver(resize);
  beobachter.observe(canvas);

  // ── Wenn das Spiel aus dem Bild scrollt ──────────────────────────────
  //
  // Das Spiel ist ein Abschnitt einer langen Seite, kein eigenes Fenster.
  // "Verlassen" heisst hier: wegscrollen. Solange nichts davon zu sehen
  // ist, braucht auch nichts gezeichnet zu werden - und ein laufendes
  // Spiel, das niemand sieht, verliert sonst still seine Zeit und seine
  // Leben.
  //
  // Erst unter 10 Prozent Sichtbarkeit, damit ein knapper Rand am
  // Bildschirmende das Spiel nicht staendig an- und abschaltet.
  const sicht = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (e.isIntersecting) { schleifeStarten(); } else { pause(); schleifeStoppen(); }
    }
  }, { threshold: 0.1 });
  sicht.observe(wurzel);

  // Beim Verlassen der Seite alles abraeumen. `pagehide` feuert auch dort,
  // wo `beforeunload` uebergangen wird (Handy, Zurueck-Taste).
  hoereAuf(window, 'pagehide', schliessen);

  /** Das Spiel wirklich beenden - Beobachter eingeschlossen. */
  function ganzSchliessen() {
    schliessen();
    sicht.disconnect();
  }

  // Nach aussen nur das Noetigste: oeffnen und schliessen. KEIN
  // Spielzustand - die Diagnostik der Vorlage ist nicht uebernommen.
  wurzel.taxiRush = { oeffnen, schliessen: ganzSchliessen };

  oeffnen();
})();
