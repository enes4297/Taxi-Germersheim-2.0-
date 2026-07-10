// Taxi Germersheim GmbH – V4.0 Clean Base
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const icons={
    menu:'<svg viewBox="0 0 48 48"><path d="M10 15h28"/><path d="M10 24h28"/><path d="M10 33h28"/></svg>',
    phone:'<svg viewBox="0 0 48 48"><path d="M40 31v6a4 4 0 0 1-4.4 4A39 39 0 0 1 19 35a38 38 0 0 1-12-12A39 39 0 0 1 1 6.4A4 4 0 0 1 5 2h6a4 4 0 0 1 4 3.4c.2 2 .7 4 1.4 5.8a4 4 0 0 1-.9 4.2L13 18a31 31 0 0 0 17 17l2.6-2.5a4 4 0 0 1 4.2-.9c1.8.7 3.8 1.2 5.8 1.4A4 4 0 0 1 40 31z"/></svg>',
    taxi:'<svg viewBox="0 0 48 48"><path d="M11 31h26"/><path d="M9 31l2.5-12h25L39 31"/><path d="M16 19l3-7h10l3 7"/><path d="M16 31v4"/><path d="M32 31v4"/><circle cx="15" cy="31" r="2.2"/><circle cx="33" cy="31" r="2.2"/><path d="M20 10h8"/></svg>',
    medical:'<svg viewBox="0 0 48 48"><path d="M24 10v28"/><path d="M10 24h28"/></svg>',
    wheelchair:'<svg viewBox="0 0 48 48"><circle cx="18" cy="35" r="7"/><path d="M18 28V14"/><path d="M18 14h10"/><path d="M18 22h11"/><path d="M29 22l6 13h6"/><circle cx="18" cy="9" r="2"/></svg>',
    airport:'<svg viewBox="0 0 48 48"><path d="M20 42l4-17L7 16l3-4l17 5l4-13l4 2l-2 15l9 6l-2 4l-10-4l-6 15z"/></svg>',
    rewards:'<svg viewBox="0 0 48 48"><path d="M40 24v16H8V24"/><path d="M5 14h38v10H5z"/><path d="M24 14v26"/><path d="M24 14h-7a5 5 0 1 1 5-5c0 3 2 5 2 5z"/><path d="M24 14h7a5 5 0 1 0-5-5c0 3-2 5-2 5z"/></svg>',
    yumak:'<svg viewBox="0 0 48 48"><path d="M11 18L8 8l10 7"/><path d="M37 18l3-10l-10 7"/><circle cx="24" cy="26" r="13"/><circle cx="19" cy="24" r="1.4"/><circle cx="29" cy="24" r="1.4"/><path d="M22 30c1.3 1 2.7 1 4 0"/><path d="M16 31l-8 2"/><path d="M32 31l8 2"/><circle cx="24" cy="26" r="18" opacity=".28"/></svg>',
    home:'<svg viewBox="0 0 48 48"><path d="M7 22l17-15l17 15"/><path d="M11 20v21h26V20"/><path d="M19 41V29h10v12"/></svg>',
    booking:'<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M8 19h32"/><path d="M16 27h.1"/><path d="M24 27h.1"/><path d="M32 27h.1"/></svg>',
    profile:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>',
    right:'<svg viewBox="0 0 48 48"><path d="M10 24h28"/><path d="M27 13l11 11l-11 11"/></svg>',
    left:'<svg viewBox="0 0 48 48"><path d="M38 24H10"/><path d="M21 13L10 24l11 11"/></svg>',
    round:'<svg viewBox="0 0 48 48"><path d="M12 14h24"/><path d="M28 7l8 7l-8 7"/><path d="M36 34H12"/><path d="M20 27l-8 7l8 7"/></svg>',
    repeat:'<svg viewBox="0 0 48 48"><path d="M33 5l8 8l-8 8"/><path d="M7 23v-4a8 8 0 0 1 8-8h26"/><path d="M15 43l-8-8l8-8"/><path d="M41 25v4a8 8 0 0 1-8 8H7"/></svg>',
    pin:'<svg viewBox="0 0 48 48"><path d="M24 44s14-10.5 14-24a14 14 0 1 0-28 0c0 13.5 14 24 14 24z"/><circle cx="24" cy="20" r="5"/></svg>',
    location:'<svg viewBox="0 0 48 48"><path d="M24 5v8"/><path d="M24 35v8"/><path d="M5 24h8"/><path d="M35 24h8"/><circle cx="24" cy="24" r="8"/></svg>',
    flag:'<svg viewBox="0 0 48 48"><path d="M12 7v34"/><path d="M12 8h23l-4 9l4 9H12"/></svg>',
    luggage:'<svg viewBox="0 0 48 48"><rect x="12" y="15" width="24" height="26" rx="4"/><path d="M18 15v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4"/><path d="M18 24h12"/><path d="M18 32h12"/></svg>',
    child:'<svg viewBox="0 0 48 48"><circle cx="24" cy="13" r="6"/><path d="M14 42v-7a10 10 0 0 1 20 0v7"/><path d="M18 34h12"/><path d="M17 42h14"/></svg>',
    pet:'<svg viewBox="0 0 48 48"><circle cx="10" cy="21" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="30" cy="12" r="4"/><circle cx="38" cy="21" r="4"/><path d="M16 36c0-7 4-11 8-11s8 4 8 11c0 4-4 6-8 6s-8-2-8-6z"/></svg>',
    passengers:'<svg viewBox="0 0 48 48"><circle cx="17" cy="16" r="6"/><path d="M7 42v-3a10 10 0 0 1 20 0v3"/><circle cx="33" cy="18" r="5"/><path d="M29 42v-2a8 8 0 0 1 13 0v2"/></svg>',
    user:'<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 42a15 15 0 0 1 30 0"/></svg>'
  };
  const officialIcons={
    home:'assets/icons/Home.svg',
    taxi:'assets/icons/Taxi.svg',
    van:'assets/icons/Van.svg',
    wheelchair:'assets/icons/Wheelchair Vehicle.svg',
    profile:'assets/icons/Profile.svg',
    user:'assets/icons/Profile.svg',
    location:'assets/icons/Location.svg',
    pin:'assets/icons/Location.svg',
    destination:'assets/icons/Destination.svg',
    flag:'assets/icons/Destination.svg',
    route:'assets/icons/Route.svg',
    booking:'assets/icons/Calendar.svg',
    calendar:'assets/icons/Calendar.svg',
    clock:'assets/icons/Clock.svg',
    phone:'assets/icons/Phone.svg',
    whatsapp:'assets/icons/WhatsApp.svg',
    yumak:'assets/icons/WhatsApp.svg',
    rewards:'assets/icons/Rewards.svg',
    voucher:'assets/icons/Gift Voucher.svg',
    luggage:'assets/icons/Gift Voucher.svg',
    check:'assets/icons/Check Mark.svg',
    confirm:'assets/icons/Check Mark.svg'
  };

  function buildOfficialIconMarkup(key){
    const filePath=officialIcons[key];
    if(!filePath) return '';
    const url=encodeURI(filePath).replace(/'/g,'%27');
    return `<span class="tg-icon-mask" style="--tg-icon-mask:url('${url}')" aria-hidden="true"></span>`;
  }
  const services={taxi:['Normale Taxifahrt','NORMALE TAXIFAHRT'],medical:['Krankenfahrt','KRANKENFAHRT'],wheelchair:['Rollstuhlfahrt','ROLLSTUHLFAHRT'],airport:['Flughafentransfer','FLUGHAFENTRANSFER']};
  const defaultAddressConfig={
    allowedCities:[
      'Germersheim','Sondernheim','Lingenfeld','Bellheim','Hördt','Rülzheim','Kuhardt','Leimersheim','Neupotz','Rheinzabern','Jockgrim','Wörth am Rhein','Speyer','Landau','Karlsruhe','Mannheim','Heidelberg'
    ],
    popularPlaces:['Krankenhäuser','Dialysezentren','Flughäfen','Bahnhöfe','wichtige Kliniken']
  };
  const fallbackAddressDataset=[
    {title:'Asklepios Südpfalzklinik Germersheim',street:'An Fronte Karl 2',postalCode:'76726',city:'Germersheim',group:'Krankenhäuser',type:'clinic',scope:'destination'},
    {title:'Klinikum Landau-Südliche Weinstraße',street:'Bodelschwinghstraße 11',postalCode:'76829',city:'Landau',group:'wichtige Kliniken',type:'clinic',scope:'destination'},
    {title:'Universitätsklinikum Mannheim',street:'Theodor-Kutzer-Ufer 1-3',postalCode:'68167',city:'Mannheim',group:'wichtige Kliniken',type:'clinic',scope:'destination'},
    {title:'Städtisches Klinikum Karlsruhe',street:'Moltkestraße 90',postalCode:'76133',city:'Karlsruhe',group:'Krankenhäuser',type:'clinic',scope:'destination'},
    {title:'Nierenzentrum Germersheim',street:'Josef-Probst-Straße 5',postalCode:'76726',city:'Germersheim',group:'Dialysezentren',type:'clinic',scope:'destination'},
    {title:'Dialysezentrum Speyer',street:'Iggelheimer Straße 26',postalCode:'67346',city:'Speyer',group:'Dialysezentren',type:'clinic',scope:'destination'},
    {title:'Bahnhof Germersheim',street:'Bahnhofstrasse 23',postalCode:'76726',city:'Germersheim',group:'Bahnhöfe',type:'station',scope:'both'},
    {title:'Hauptbahnhof Speyer',street:'Bahnhofstrasse 1',postalCode:'67346',city:'Speyer',group:'Bahnhöfe',type:'station',scope:'both'},
    {title:'Mannheim Hauptbahnhof',street:'Willy-Brandt-Platz 17',postalCode:'68161',city:'Mannheim',group:'Bahnhöfe',type:'station',scope:'both'},
    {title:'Flughafen Frankfurt Terminal 1',street:'Hugo-Eckener-Ring',postalCode:'60549',city:'Frankfurt am Main',group:'Flughäfen',type:'airport',scope:'destination'},
    {title:'Flughafen Karlsruhe/Baden-Baden',street:'Victoria Boulevard B101',postalCode:'77836',city:'Rheinmünster',group:'Flughäfen',type:'airport',scope:'destination'},
    {title:'Germersheim',postalCode:'76726',city:'Germersheim',group:'Ort',type:'city',scope:'both'},
    {title:'Sondernheim',postalCode:'76726',city:'Sondernheim',group:'Ort',type:'city',scope:'both'},
    {title:'Lingenfeld',postalCode:'67360',city:'Lingenfeld',group:'Ort',type:'city',scope:'both'},
    {title:'Speyer',postalCode:'67346',city:'Speyer',group:'Ort',type:'city',scope:'both'},
    {title:'Heidelberg',postalCode:'69115',city:'Heidelberg',group:'Ort',type:'city',scope:'both'},
    {street:'Hauptstraße 12',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Luitpoldplatz 3',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Kirchstraße 8',postalCode:'76726',city:'Sondernheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Lingenfelder Straße 4',postalCode:'67360',city:'Lingenfeld',group:'Adresse',type:'street',scope:'both'},
    {street:'Karlstraße 17',postalCode:'76756',city:'Bellheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Schulstraße 6',postalCode:'76771',city:'Hördt',group:'Adresse',type:'street',scope:'both'},
    {street:'Germersheimer Straße 22',postalCode:'76761',city:'Rülzheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Rheinzaberner Straße 14',postalCode:'76773',city:'Kuhardt',group:'Adresse',type:'street',scope:'both'},
    {street:'Hafenstraße 9',postalCode:'76774',city:'Leimersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Lange Straße 11',postalCode:'76777',city:'Neupotz',group:'Adresse',type:'street',scope:'both'},
    {street:'Jockgrimer Straße 27',postalCode:'76764',city:'Rheinzabern',group:'Adresse',type:'street',scope:'both'},
    {street:'Bahnhofstraße 19',postalCode:'76751',city:'Jockgrim',group:'Adresse',type:'street',scope:'both'},
    {street:'Mozartstraße 5',postalCode:'76744',city:'Wörth am Rhein',group:'Adresse',type:'street',scope:'both'},
    {street:'Adenauerpark 2',postalCode:'67346',city:'Speyer',group:'Adresse',type:'street',scope:'both'},
    {street:'Queichheimer Hauptstraße 18',postalCode:'76829',city:'Landau',group:'Adresse',type:'street',scope:'both'},
    {street:'Kaiserallee 31',postalCode:'76133',city:'Karlsruhe',group:'Adresse',type:'street',scope:'both'},
    {street:'Augustaanlage 42',postalCode:'68165',city:'Mannheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Bergheimer Straße 55',postalCode:'69115',city:'Heidelberg',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrich-Ebert-Straße 7',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrichstraße 24',postalCode:'67346',city:'Speyer',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrich-Ebert-Anlage 16',postalCode:'69117',city:'Heidelberg',group:'Adresse',type:'street',scope:'both'}
  ];
  let addressConfigCache=null;
  let streetDirectoryCache=null;
  let mapContainers={};
  const bookingRouteState={
    distanceText:'-',
    durationText:'-',
    distanceKm:null,
    durationMin:null,
    source:'demo'
  };
  const CONSENT_STORAGE_KEY='taxiGermersheimCookieConsent';
  const CONSENT_ALL='all';
  const CONSENT_NECESSARY='necessary';
  const GOOGLE_MAPS_API_KEY='YOUR_GOOGLE_MAPS_API_KEY';
  const BOOKING_MAP_THEME_PRESET='dark-prepared';
  const BOOKING_MARKER_PRESET={
    start:'marker-start-prepared',
    target:'marker-target-prepared'
  };
  const BOOKING_REBOOK_STORAGE_KEY='taxiBookingRebookState';
  const RIDE_TRACKING_STORAGE_KEY='taxiCurrentRideTrackingState';
  const RIDE_TRACKING_STEPS=[
    {label:'Anfrage eingegangen',detail:'Ihre Buchung wurde erfasst und im System vorbereitet.'},
    {label:'Disposition prüft',detail:'Unser Team prüft Fahrzeug, Route und Verfügbarkeit.'},
    {label:'Fahrer zugewiesen',detail:'Ein Fahrer wurde Ihrer Fahrt fest zugeordnet.'},
    {label:'Fahrer unterwegs',detail:'Ihr Fahrer ist auf dem Weg zum Abholort.'},
    {label:'Fahrer angekommen',detail:'Der Fahrer wartet am angegebenen Treffpunkt.'},
    {label:'Fahrt läuft',detail:'Die Fahrt ist gestartet und wird live als Demo verfolgt.'},
    {label:'Fahrt abgeschlossen',detail:'Die Fahrt wurde abgeschlossen und kann bewertet werden.'}
  ];
  const RIDE_TRACKING_STAGE_TIMINGS=[0,18000,36000,56000,76000,96000,118000];
  const CONTACT_SERVICE_CONFIG={
    // Set provider to 'formspree' or 'emailjs' when real transport is connected.
    provider:null,
    formspreeEndpoint:'',
    emailjs:{
      serviceId:'',
      templateId:'',
      publicKey:''
    }
  };

  function saveBookingBridgeState(partial){
    try{
      const key='taxiBookingRewardsBridgeState';
      const baseRaw=localStorage.getItem(key);
      const base=baseRaw ? JSON.parse(baseRaw) : {};
      const next={
        customer:String(partial?.customer || base?.customer || '').trim(),
        rideType:String(partial?.rideType || base?.rideType || '').trim().toLowerCase(),
        pickup:String(partial?.pickup || base?.pickup || '').trim(),
        destination:String(partial?.destination || base?.destination || '').trim(),
        updatedAt:Date.now()
      };
      localStorage.setItem(key,JSON.stringify(next));
    }catch(_err){
      // localStorage optional in demo mode.
    }
  }

  function writeBookingRebookState(partial){
    try{
      const next={
        pickup:String(partial?.pickup || '').trim(),
        destination:String(partial?.destination || '').trim(),
        rideType:String(partial?.rideType || '').trim().toLowerCase(),
        createdAt:Date.now()
      };
      localStorage.setItem(BOOKING_REBOOK_STORAGE_KEY,JSON.stringify(next));
    }catch(_err){
      // localStorage optional in demo mode.
    }
  }

  function consumeBookingRebookState(maxAgeMs=30*60*1000){
    try{
      const raw=localStorage.getItem(BOOKING_REBOOK_STORAGE_KEY);
      if(!raw) return null;
      localStorage.removeItem(BOOKING_REBOOK_STORAGE_KEY);
      const parsed=JSON.parse(raw);
      if(!parsed || typeof parsed!=='object') return null;

      const pickup=String(parsed.pickup || '').trim();
      const destination=String(parsed.destination || '').trim();
      const rideType=String(parsed.rideType || '').trim().toLowerCase();
      const createdAt=Number(parsed.createdAt || 0);
      if(!pickup || !destination) return null;
      if(createdAt && Date.now()-createdAt>maxAgeMs) return null;
      return {pickup,destination,rideType};
    }catch(_err){
      return null;
    }
  }

  function getRideDriverPreset(rideType){
    const key=String(rideType || 'taxi').trim().toLowerCase();
    if(key==='medical') return {driverName:'Sabine Hoffmann',vehicleType:'Mercedes V-Klasse',licensePlate:'GER-MH 612',phone:'07274 3567',baseEtaMinutes:11};
    if(key==='airport') return {driverName:'Michael Becker',vehicleType:'Mercedes E-Klasse',licensePlate:'GER-TG 247',phone:'07274 3567',baseEtaMinutes:14};
    if(key==='wheelchair') return {driverName:'Ali Demir',vehicleType:'Rollstuhlfahrzeug',licensePlate:'GER-RF 118',phone:'07274 3567',baseEtaMinutes:13};
    return {driverName:'Julia Schneider',vehicleType:'Taxi Limousine',licensePlate:'GER-TX 401',phone:'07274 3567',baseEtaMinutes:9};
  }

  function buildRideTrackingState(partial){
    const driverPreset=getRideDriverPreset(partial?.rideType);
    return {
      id:String(partial?.id || `ride-track-${Date.now()}`),
      customerName:String(partial?.customerName || 'Max Mustermann').trim() || 'Max Mustermann',
      pickup:String(partial?.pickup || 'Germersheim Zentrum').trim() || 'Germersheim Zentrum',
      destination:String(partial?.destination || 'Speyer').trim() || 'Speyer',
      rideType:String(partial?.rideType || 'taxi').trim().toLowerCase() || 'taxi',
      createdAt:Number(partial?.createdAt || Date.now()),
      statusIndex:Math.max(0,Math.min(RIDE_TRACKING_STEPS.length-1,Number(partial?.statusIndex ?? 0) || 0)),
      simulationEnabled:partial?.simulationEnabled!==false,
      ratingSubmitted:Boolean(partial?.ratingSubmitted),
      driverName:String(partial?.driverName || driverPreset.driverName).trim() || driverPreset.driverName,
      vehicleType:String(partial?.vehicleType || driverPreset.vehicleType).trim() || driverPreset.vehicleType,
      licensePlate:String(partial?.licensePlate || driverPreset.licensePlate).trim() || driverPreset.licensePlate,
      phone:String(partial?.phone || driverPreset.phone).trim() || driverPreset.phone,
      baseEtaMinutes:Math.max(1,Math.round(Number(partial?.baseEtaMinutes || driverPreset.baseEtaMinutes) || driverPreset.baseEtaMinutes))
    };
  }

  function getDefaultRideTrackingState(){
    return buildRideTrackingState({
      customerName:'Max Mustermann',
      pickup:'Germersheim Zentrum',
      destination:'Speyer Zentrum',
      rideType:'taxi',
      createdAt:Date.now()-42000,
      statusIndex:2,
      simulationEnabled:true
    });
  }

  function writeRideTrackingState(next){
    try{
      localStorage.setItem(RIDE_TRACKING_STORAGE_KEY,JSON.stringify(buildRideTrackingState(next)));
      document.dispatchEvent(new CustomEvent('ride-tracking:update'));
    }catch(_err){
      // localStorage optional in demo mode.
    }
  }

  function readRideTrackingState(seedIfMissing=false){
    try{
      const raw=localStorage.getItem(RIDE_TRACKING_STORAGE_KEY);
      if(!raw){
        if(!seedIfMissing) return null;
        const seeded=getDefaultRideTrackingState();
        writeRideTrackingState(seeded);
        return seeded;
      }
      const parsed=JSON.parse(raw);
      return buildRideTrackingState(parsed);
    }catch(_err){
      if(!seedIfMissing) return null;
      const seeded=getDefaultRideTrackingState();
      writeRideTrackingState(seeded);
      return seeded;
    }
  }

  function resolveRideTrackingSnapshot(seedIfMissing=false){
    const base=readRideTrackingState(seedIfMissing);
    if(!base) return null;
    let activeIndex=Math.max(0,Math.min(RIDE_TRACKING_STEPS.length-1,Number(base.statusIndex || 0)));

    if(base.simulationEnabled){
      const elapsed=Math.max(0,Date.now()-Math.max(0,Number(base.createdAt || Date.now())));
      for(let i=RIDE_TRACKING_STAGE_TIMINGS.length-1;i>=0;i--){
        if(elapsed>=RIDE_TRACKING_STAGE_TIMINGS[i]){
          activeIndex=i;
          break;
        }
      }
    }

    const statusMeta=RIDE_TRACKING_STEPS[activeIndex] || RIDE_TRACKING_STEPS[0];
    const arrivalText=activeIndex<4 ? `${Math.max(1,base.baseEtaMinutes-activeIndex*2)} Min.` : activeIndex===4 ? 'Jetzt angekommen' : activeIndex===5 ? 'Fahrt läuft' : 'Abgeschlossen';
    return {
      ...base,
      activeIndex,
      isCompleted:activeIndex>=RIDE_TRACKING_STEPS.length-1,
      statusLabel:statusMeta.label,
      statusDetail:statusMeta.detail,
      route:`${base.pickup} → ${base.destination}`,
      arrivalText,
      steps:RIDE_TRACKING_STEPS.map((step,index)=>({
        ...step,
        index,
        isComplete:index<activeIndex,
        isActive:index===activeIndex
      }))
    };
  }

  function createRideTrackingStateFromBooking(payload){
    const next=buildRideTrackingState({
      customerName:String(payload?.name || 'Max Mustermann').trim() || 'Max Mustermann',
      pickup:String(payload?.pickup || '').trim(),
      destination:String(payload?.destination || '').trim(),
      rideType:String(payload?.rideType || 'taxi').trim().toLowerCase() || 'taxi',
      createdAt:Date.now(),
      statusIndex:0,
      simulationEnabled:true,
      ratingSubmitted:false
    });
    writeRideTrackingState(next);
    return next;
  }

  function handleRewardEvent(type,payload){
    const eventType=String(type || '').trim();
    if(!eventType) return;
    try{
      if(window.rewardsEngine && typeof window.rewardsEngine.processEvent==='function'){
        window.rewardsEngine.processEvent(eventType,payload || {});
      }
    }catch(_err){
      // Keep legacy dispatch even if engine processing fails.
    }
    const detail={
      type:eventType,
      payload:payload && typeof payload==='object' ? payload : {},
      timestamp:Date.now()
    };
    document.dispatchEvent(new CustomEvent('rewards:rewardEvent',{detail}));
  }
  try{
    if(!window.handleRewardEvent) window.handleRewardEvent=handleRewardEvent;
  }catch(_err){
    // Ignore if global assignment is blocked.
  }

  function createRewardsEngine(){
    const STORAGE_KEY='taxiRewardsEngineState';
    const RewardsUtils={
      todayYmd(){
        const now=new Date();
        const y=now.getFullYear();
        const m=String(now.getMonth()+1).padStart(2,'0');
        const d=String(now.getDate()).padStart(2,'0');
        return `${y}-${m}-${d}`;
      },
      toNumber(value){
        const match=String(value || '').replace(/\./g,'').replace(',', '.').match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : 0;
      },
      clamp(value,min,max){
        return Math.max(min,Math.min(max,value));
      },
      levelByPoints(points){
        const p=Math.max(0,Math.round(Number(points) || 0));
        if(p>=600) return {key:'legend',label:'Legend',nextTarget:900};
        if(p>=350) return {key:'platin',label:'Platin',nextTarget:600};
        if(p>=180) return {key:'gold',label:'Gold',nextTarget:350};
        if(p>=80) return {key:'silber',label:'Silber',nextTarget:180};
        return {key:'bronze',label:'Bronze',nextTarget:80};
      },
      nextLevel(levelKey){
        const order=['bronze','silber','gold','platin','legend'];
        const labels={bronze:'Bronze',silber:'Silber',gold:'Gold',platin:'Platin',legend:'Legend'};
        const index=order.indexOf(levelKey);
        const next=order[Math.min(order.length-1,Math.max(0,index)+1)] || 'legend';
        return {key:next,label:labels[next] || 'Legend'};
      },
      parsePointsFromText(value){
        const n=this.toNumber(value);
        return Number.isFinite(n) ? Math.max(0,Math.round(n)) : 0;
      }
    };

    const RewardStorage={
      read(){
        try{
          const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
          return parsed && typeof parsed==='object' ? parsed : null;
        }catch(_err){
          return null;
        }
      },
      write(state){
        try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(_err){}
      }
    };

    function createEventBus(){
      const listeners=new Map();
      function on(name,handler){
        const key=String(name || '');
        if(!key || typeof handler!=='function') return ()=>{};
        const list=listeners.get(key) || [];
        list.push(handler);
        listeners.set(key,list);
        return ()=>off(key,handler);
      }
      function off(name,handler){
        const key=String(name || '');
        const list=listeners.get(key) || [];
        listeners.set(key,list.filter(fn=>fn!==handler));
      }
      function emit(name,payload){
        const key=String(name || '');
        if(!key) return;
        (listeners.get(key) || []).slice().forEach(fn=>{ try{ fn(payload); }catch(_err){} });
        try{ document.dispatchEvent(new CustomEvent(key,{detail:payload})); }catch(_err){}
      }
      return {on,off,emit};
    }

    const RewardEvents=createEventBus();

    const defaults={
      points:230,
      level:{key:'gold',label:'Gold'},
      voucherBalance:12.5,
      voucherHistory:[
        {amount:5,title:'5 EUR Gutschein durch Gluecksrad erhalten',source:'wheel',timestamp:Date.now()-86400000},
        {amount:10,title:'10 EUR Gutschein durch Aktion erhalten',source:'campaign',timestamp:Date.now()-172800000}
      ],
      freeSpins:0,
      wheel:{lastSpinDate:'',lastResult:null},
      mystery:{lastOpenedDate:'',lastRewardId:''},
      login:{claimed:[],lastCheckin:'',currentDay:1,streakCount:0},
      missions:{},
      achievements:{unlocked:['first-ride','five-rides','airport-pro','regular']},
      rides:{
        totalCount:0,
        totalFare:0,
        totalVoucherUsed:0,
        totalPointsEarned:0,
        history:[]
      },
      activities:[],
      vip:{current:'gold',next:'platin',remaining:120},
      updatedAt:Date.now()
    };

    function hydrateFromLegacy(){
      const seed={...defaults};
      try{
        const vip=JSON.parse(localStorage.getItem('taxiRewardsVipStatusState') || '');
        if(vip && typeof vip==='object'){
          seed.points=Number.isFinite(Number(vip.currentPoints)) ? Number(vip.currentPoints) : seed.points;
        }
      }catch(_err){}
      try{
        const customer=JSON.parse(localStorage.getItem('taxiRewardsCustomerDashboardState') || '');
        if(customer && customer.profile){
          const p=Number(customer.profile.points);
          if(Number.isFinite(p)) seed.points=p;
        }
      }catch(_err){}
      try{ seed.wheel.lastSpinDate=String(localStorage.getItem('taxiRewardsLastSpinDate') || ''); }catch(_err){}
      try{
        const mystery=JSON.parse(localStorage.getItem('taxiRewardsMysteryBoxState') || '');
        if(mystery && typeof mystery==='object'){
          seed.mystery.lastOpenedDate=String(mystery.lastOpenedDate || '');
          seed.mystery.lastRewardId=String(mystery.lastRewardId || '');
        }
      }catch(_err){}
      try{
        const streak=JSON.parse(localStorage.getItem('taxiRewardsDailyStreakState') || '');
        if(streak && typeof streak==='object'){
          const claimed=Array.isArray(streak.claimed) ? streak.claimed.map(n=>Number(n)).filter(Number.isInteger) : [];
          seed.login.claimed=Array.from(new Set(claimed)).sort((a,b)=>a-b);
          seed.login.lastCheckin=String(streak.lastCheckin || '');
          seed.login.currentDay=Number.isFinite(Number(streak.currentDay)) ? Number(streak.currentDay) : seed.login.currentDay;
          seed.login.streakCount=seed.login.claimed.length;
        }
      }catch(_err){}
      try{
        const ach=JSON.parse(localStorage.getItem('taxiRewardsAchievementsState') || '');
        if(ach && Array.isArray(ach.unlocked)) seed.achievements.unlocked=ach.unlocked.map(v=>String(v).trim()).filter(Boolean);
      }catch(_err){}
      const level=RewardsUtils.levelByPoints(seed.points);
      const next=RewardsUtils.nextLevel(level.key);
      seed.level={key:level.key,label:level.label};
      seed.vip={current:level.key,next:next.key,remaining:Math.max(0,level.nextTarget-seed.points)};
      return seed;
    }

    let state=(()=>{
      const stored=RewardStorage.read();
      if(stored) return {...defaults,...stored};
      return hydrateFromLegacy();
    })();

    function syncLegacyKeys(nextState){
      try{ localStorage.setItem('taxiRewardsLastSpinDate',String(nextState.wheel.lastSpinDate || '')); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsMysteryBoxState',JSON.stringify({lastOpenedDate:nextState.mystery.lastOpenedDate,lastRewardId:nextState.mystery.lastRewardId})); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsDailyStreakState',JSON.stringify({claimed:nextState.login.claimed,lastCheckin:nextState.login.lastCheckin,currentDay:nextState.login.currentDay})); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsAchievementsState',JSON.stringify({unlocked:nextState.achievements.unlocked})); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsVipStatusState',JSON.stringify({currentLevel:nextState.vip.current,currentPoints:nextState.points,nextLevel:nextState.vip.next,nextLevelTargetPoints:RewardsUtils.levelByPoints(nextState.points).nextTarget})); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsCustomerDashboardState',JSON.stringify({profile:{points:nextState.points,level:nextState.level.label},nextLevel:{currentPoints:nextState.points,targetPoints:RewardsUtils.levelByPoints(nextState.points).nextTarget,levelName:RewardsUtils.nextLevel(nextState.level.key).label}})); }catch(_err){}
      try{ localStorage.setItem('taxiRewardsRideHistoryState',JSON.stringify({rides:nextState.rides})); }catch(_err){}
    }

    function commit(mutator){
      const prev=state;
      const draft=JSON.parse(JSON.stringify(state));
      mutator(draft);
      const level=RewardsUtils.levelByPoints(draft.points);
      const next=RewardsUtils.nextLevel(level.key);
      const prevLevel=String(prev.level?.key || '');
      draft.level={key:level.key,label:level.label};
      draft.vip={current:level.key,next:next.key,remaining:Math.max(0,level.nextTarget-draft.points)};
      draft.updatedAt=Date.now();
      state=draft;
      RewardStorage.write(state);
      syncLegacyKeys(state);
      RewardEvents.emit('reward.store',{state});
      if(prevLevel!==draft.level.key) RewardEvents.emit('reward.levelup',{previous:prevLevel,current:draft.level.key,points:draft.points});
    }

    function addActivity(entry){
      commit(draft=>{
        draft.activities=Array.isArray(draft.activities) ? draft.activities : [];
        draft.activities.unshift({
          type:String(entry.type || 'points'),
          title:String(entry.title || 'Rewards Ereignis'),
          text:String(entry.text || ''),
          icon:String(entry.icon || '⭐'),
          timestamp:Date.now()
        });
        draft.activities=draft.activities.slice(0,20);
      });
      RewardEvents.emit('reward.activity',entry);
    }

    function addPoints(amount,meta){
      const value=Math.max(0,Math.round(Number(amount) || 0));
      if(!value) return;
      commit(draft=>{ draft.points=Math.max(0,Math.round(Number(draft.points) || 0) + value); });
      RewardEvents.emit('reward.points',{amount:value,points:state.points,meta:meta || {}});
    }

    function addVoucher(amount,meta){
      const value=Math.max(0,Number(amount) || 0);
      if(!value) return;
      commit(draft=>{
        draft.voucherBalance=Number((Math.max(0,Number(draft.voucherBalance) || 0) + value).toFixed(2));
        draft.voucherHistory=Array.isArray(draft.voucherHistory) ? draft.voucherHistory : [];
        draft.voucherHistory.unshift({
          amount:value,
          title:String(meta?.title || `${value.toFixed(2).replace('.',',')} EUR Gutschein erhalten`),
          source:String(meta?.source || 'reward'),
          timestamp:Date.now()
        });
        draft.voucherHistory=draft.voucherHistory.slice(0,20);
      });
      RewardEvents.emit('reward.voucher',{amount:value,balance:state.voucherBalance,meta:meta || {}});
    }

    function consumeVoucher(amount,meta){
      const value=Math.max(0,Number(amount) || 0);
      if(!value) return 0;
      let consumed=0;
      commit(draft=>{
        const balance=Math.max(0,Number(draft.voucherBalance) || 0);
        consumed=Math.min(balance,value);
        draft.voucherBalance=Number((balance-consumed).toFixed(2));
        draft.voucherHistory=Array.isArray(draft.voucherHistory) ? draft.voucherHistory : [];
        if(consumed>0){
          draft.voucherHistory.unshift({
            amount:-consumed,
            title:String(meta?.title || `${consumed.toFixed(2).replace('.',',')} EUR bei Fahrt angerechnet`),
            source:String(meta?.source || 'ride'),
            timestamp:Date.now()
          });
          draft.voucherHistory=draft.voucherHistory.slice(0,20);
        }
      });
      if(consumed>0) RewardEvents.emit('reward.voucher',{amount:-consumed,balance:state.voucherBalance,meta:meta || {}});
      return consumed;
    }

    function completeRide(payload){
      const customer=String(payload?.customer || 'Kunde').trim() || 'Kunde';
      const rideType=String(payload?.rideType || 'taxi').trim().toLowerCase();
      const fare=Math.max(0,Number(payload?.fare) || 0);
      const requestedVoucher=Math.max(0,Number(payload?.voucherApplied) || 0);
      const points=Math.max(0,Math.round(Number(payload?.points) || 0));

      let usedVoucher=0;
      if(requestedVoucher>0){
        usedVoucher=consumeVoucher(requestedVoucher,{
          source:'ride',
          title:`${Math.min(requestedVoucher,fare).toFixed(2).replace('.',',')} EUR bei Fahrt angerechnet`
        });
      }

      const netAmount=Math.max(0,fare-usedVoucher);
      const rideEntry={
        customer,
        rideType,
        fare:Number(fare.toFixed(2)),
        voucherUsed:Number(usedVoucher.toFixed(2)),
        points,
        netAmount:Number(netAmount.toFixed(2)),
        timestamp:Date.now()
      };

      commit(draft=>{
        draft.rides=draft.rides && typeof draft.rides==='object' ? draft.rides : {totalCount:0,totalFare:0,totalVoucherUsed:0,totalPointsEarned:0,history:[]};
        draft.rides.history=Array.isArray(draft.rides.history) ? draft.rides.history : [];
        draft.rides.history.unshift(rideEntry);
        draft.rides.history=draft.rides.history.slice(0,40);
        draft.rides.totalCount=Math.max(0,Math.round(Number(draft.rides.totalCount) || 0)+1);
        draft.rides.totalFare=Number((Math.max(0,Number(draft.rides.totalFare) || 0) + fare).toFixed(2));
        draft.rides.totalVoucherUsed=Number((Math.max(0,Number(draft.rides.totalVoucherUsed) || 0) + usedVoucher).toFixed(2));
        draft.rides.totalPointsEarned=Math.max(0,Math.round(Number(draft.rides.totalPointsEarned) || 0)+points);

        const rideCount=draft.rides.totalCount;
        draft.missions=draft.missions && typeof draft.missions==='object' ? draft.missions : {};
        draft.missions['daily-first-ride']={status:'done',completedAt:Date.now(),title:'Erste Fahrt heute',reward:'+10 Punkte'};
        draft.missions['first-ride']={status:'done',completedAt:Date.now(),title:'Erste Fahrt abschließen',reward:'+50 Punkte'};
        draft.missions['five-rides']={status:rideCount>=5 ? 'done' : 'active',current:Math.min(5,rideCount),target:5,title:'5 Fahrten sammeln',reward:'Abzeichen Stammkunde'};
        if(rideType==='medical') draft.missions['medical-booking']={status:'done',completedAt:Date.now(),title:'Krankenfahrt buchen',reward:'+30 Punkte'};
        if(rideType==='airport') draft.missions['airport-first']={status:'done',completedAt:Date.now(),title:'Erster Flughafentransfer',reward:'+100 Punkte'};

        const unlocked=Array.isArray(draft.achievements?.unlocked) ? draft.achievements.unlocked : [];
        if(!unlocked.includes('first-ride')) unlocked.push('first-ride');
        if(rideCount>=5 && !unlocked.includes('five-rides')) unlocked.push('five-rides');
        if(rideType==='medical' && !unlocked.includes('medical-hero')) unlocked.push('medical-hero');
        if(rideType==='airport' && !unlocked.includes('airport-pro')) unlocked.push('airport-pro');
        draft.achievements={...draft.achievements,unlocked};
      });

      if(points>0) addPoints(points,{source:'ride'});
      addActivity({
        type:'mission',
        icon:'🚖',
        title:`Fahrt abgeschlossen: ${rideType==='medical' ? 'Krankenfahrt' : rideType==='airport' ? 'Flughafentransfer' : rideType==='wheelchair' ? 'Rollstuhlfahrt' : 'Taxifahrt'}`,
        text:`${fare.toFixed(2).replace('.',',')} EUR, Gutschein ${usedVoucher.toFixed(2).replace('.',',')} EUR, +${points} Punkte`
      });
      RewardEvents.emit('reward.ride',{entry:rideEntry,balance:state.voucherBalance});
      return {entry:rideEntry,usedVoucher,netAmount,points,balance:state.voucherBalance};
    }

    function addFreeSpin(count){
      const value=Math.round(Number(count) || 0);
      if(!value) return;
      commit(draft=>{ draft.freeSpins=Math.max(0,Math.round(Number(draft.freeSpins) || 0) + value); });
    }

    function processEvent(type,payload){
      const name=String(type || '').trim().toLowerCase();
      const data=payload && typeof payload==='object' ? payload : {};
      if(!name) return;

      if(name==='wheel:result'){
        commit(draft=>{
          draft.wheel.lastSpinDate=RewardsUtils.todayYmd();
          draft.wheel.lastResult={win:Boolean(data.win),effect:String(data.effect || ''),label:String(data.label || '')};
        });
        const effect=String(data.effect || '').trim().toLowerCase();
        if(effect==='voucher') addVoucher(5,{source:'wheel'});
        else if(effect==='extra-spin') addFreeSpin(1);
        else if(data.win) addPoints(RewardsUtils.parsePointsFromText(data.label || 25),{source:'wheel'});
        addActivity({
          type:(effect==='voucher' ? 'voucher' : 'points'),
          icon:data.win ? '🎯' : '🌙',
          title:data.win ? `${String(data.label || '+25 Punkte')} durch Glücksrad` : 'Glücksrad ohne Gewinn',
          text:data.win ? 'Das Ergebnis wurde in der Rewards Engine verbucht.' : 'Heute keine Belohnung - morgen neue Chance.'
        });
        RewardEvents.emit('reward.spin',{effect,win:Boolean(data.win),label:String(data.label || '')});
        return;
      }

      if(name==='mystery:result'){
        const rewardType=String(data.rewardType || '').trim().toLowerCase();
        commit(draft=>{
          draft.mystery.lastOpenedDate=RewardsUtils.todayYmd();
          draft.mystery.lastRewardId=String(data.rewardId || rewardType || 'mystery');
        });
        if(rewardType==='voucher') addVoucher(5,{source:'mystery'});
        else if(rewardType==='points') addPoints(RewardsUtils.parsePointsFromText(data.title || 25),{source:'mystery'});
        else if(rewardType==='extra-spin') addFreeSpin(1);
        else if(rewardType==='badge'){
          commit(draft=>{
            const unlocked=Array.isArray(draft.achievements.unlocked) ? draft.achievements.unlocked : [];
            if(!unlocked.includes('mystery-badge')) unlocked.push('mystery-badge');
            draft.achievements.unlocked=unlocked;
          });
          RewardEvents.emit('reward.badge',{id:'mystery-badge',source:'mystery'});
        }
        addActivity({type:(rewardType==='voucher' ? 'voucher' : (rewardType==='badge' ? 'badge' : 'points')),icon:String(data.icon || '📦'),title:String(data.title || 'Mystery Box geöffnet'),text:String(data.text || 'Belohnung übernommen.')});
        RewardEvents.emit('reward.box',{rewardType,rewardId:String(data.rewardId || '')});
        return;
      }

      if(name==='mission:completed'){
        const missionId=String(data.missionId || '').trim();
        const rewardText=String(data.reward || '');
        commit(draft=>{
          draft.missions=draft.missions && typeof draft.missions==='object' ? draft.missions : {};
          draft.missions[missionId]={status:'done',completedAt:Date.now(),title:String(data.title || missionId),reward:rewardText};
        });
        addPoints(RewardsUtils.parsePointsFromText(rewardText),{source:'mission'});
        addActivity({type:'mission',icon:'✅',title:`Mission abgeschlossen: ${String(data.title || 'Mission')}`,text:rewardText ? `Belohnung: ${rewardText}` : 'Mission wurde abgeschlossen.'});
        RewardEvents.emit('reward.mission',{missionId,title:String(data.title || missionId),reward:rewardText});
        return;
      }

      if(name==='daily:checkin'){
        const today=RewardsUtils.todayYmd();
        const points=Math.max(0,Math.round(Number(data.points) || 10));
        commit(draft=>{
          const claimed=Array.isArray(draft.login.claimed) ? draft.login.claimed : [];
          const day=Number(data.day || draft.login.currentDay || 1);
          if(!claimed.includes(day)) claimed.push(day);
          draft.login.claimed=Array.from(new Set(claimed)).sort((a,b)=>a-b);
          draft.login.lastCheckin=today;
          draft.login.streakCount=draft.login.claimed.length;
        });
        addPoints(points,{source:'daily'});
        addActivity({type:'points',icon:'📅',title:'Daily Check-in bestätigt',text:`+${points} Punkte und Serie aktualisiert.`});
        RewardEvents.emit('reward.login',{points,streak:state.login.streakCount});
        return;
      }

      if(name==='booking:completed'){
        completeRide(data);
      }
    }

    const RewardAnimations={
      playPointsFlow(payload){
        const root=$('#rewards.rewards-v2');
        if(!root) return;
        const target=$('[data-cd-points]',root) || $('[data-smart-points]',root);
        if(!target) return;
        const bubble=document.createElement('span');
        bubble.textContent=`+${Math.max(0,Math.round(Number(payload?.amount) || 0))}`;
        bubble.style.position='fixed';
        bubble.style.zIndex='90';
        bubble.style.color='#ffe9b4';
        bubble.style.fontWeight='900';
        bubble.style.pointerEvents='none';
        bubble.style.transition='transform .65s ease, opacity .65s ease';
        const rect=target.getBoundingClientRect();
        bubble.style.left=`${Math.round(rect.left + rect.width/2)}px`;
        bubble.style.top=`${Math.round(rect.top + rect.height + 12)}px`;
        bubble.style.opacity='0';
        document.body.append(bubble);
        requestAnimationFrame(()=>{
          bubble.style.opacity='1';
          bubble.style.transform='translateY(-34px)';
        });
        window.setTimeout(()=>{
          bubble.style.opacity='0';
          window.setTimeout(()=>bubble.remove(),220);
        },560);
      }
    };

    RewardEvents.on('reward.points',payload=>RewardAnimations.playPointsFlow(payload));

    return {
      Utils:RewardsUtils,
      Storage:RewardStorage,
      Events:RewardEvents,
      Animations:RewardAnimations,
      Store:{
        getState(){ return JSON.parse(JSON.stringify(state)); },
        addPoints,
        addVoucher,
        consumeVoucher,
        addFreeSpin,
        addActivity,
        completeRide,
        processEvent
      },
      processEvent
    };
  }

  function initRewardsEngine(){
    const rewardsRoot=$('#rewards.rewards-v2');
    if(!rewardsRoot) return null;
    try{
      if(window.rewardsEngine) return window.rewardsEngine;
      const engine=createRewardsEngine();
      window.rewardsEngine=engine;
      return engine;
    }catch(_err){
      return null;
    }
  }

  function getFocusableElements(container){
    if(!container) return [];
    return Array.from(container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(el=>!el.hasAttribute('hidden') && el.getAttribute('aria-hidden')!=='true');
  }

  function focusFirstInteractive(container){
    const focusables=getFocusableElements(container);
    focusables[0]?.focus();
  }

  function trapFocus(event,container){
    if(event.key!=='Tab') return;
    const focusables=getFocusableElements(container);
    if(!focusables.length){
      event.preventDefault();
      return;
    }
    const first=focusables[0];
    const last=focusables[focusables.length-1];
    if(event.shiftKey && document.activeElement===first){
      event.preventDefault();
      last.focus();
      return;
    }
    if(!event.shiftKey && document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  }

    function parseStreetQuery(query){
    const safeQuery=String(query||'').trim();
    if(!safeQuery) return {houseNumber:'',textQuery:''};

    const houseNumberMatch=safeQuery.match(/\b\d+[a-zA-Z]?\b$/);
    const houseNumberToken=houseNumberMatch ? houseNumberMatch[0] : '';
    const queryWithoutHouseNumber=houseNumberToken
      ? safeQuery.slice(0,safeQuery.length-houseNumberToken.length).trim()
      : safeQuery;

    return {
      houseNumber:houseNumberToken,
      textQuery:queryWithoutHouseNumber
    };
  }

  function buildStreetDirectoryCandidates(streetRows,query){
    const parsed=parseStreetQuery(query);
    const normalizedQuery=normalizeText(parsed.textQuery || query);
    if(normalizedQuery.length<2) return [];

    return streetRows
      .filter(row=>row && row.type==='street')
      .map(row=>{
        const searchable=[row.street,row.city,row.postalCode,row.district].filter(Boolean).map(normalizeText).join(' ');
        if(!searchable.includes(normalizedQuery)) return null;

        const availableNumbers=Array.isArray(row.houseNumbers)?row.houseNumbers:[];
        const selectedHouseNumber=parsed.houseNumber && availableNumbers.includes(parsed.houseNumber)
          ? parsed.houseNumber
          : '';

        return {
          street:row.street,
          city:row.city,
          postalCode:row.postalCode,
          district:row.district||'',
          houseNumber:selectedHouseNumber,
          group:'Adresse',
          type:'street',
          scope:'both',
          source:'directory'
        };
      })
      .filter(Boolean);
  }

  function rankAddressSuggestion(entry,query,searchType,config){
    const q=normalizeText(query);
    if(q.length<2) return null;

    if(entry.scope && entry.scope!=='both' && entry.scope!==searchType) return null;

    const allowedCities=(config.allowedCities||[]).map(normalizeText);
    const allowedCitySet=new Set(allowedCities);
    const germersheim=normalizeText('Germersheim');

    const city=normalizeText(entry.city);
    const primary=normalizeText(entry.title||'');
    const street=normalizeText(entry.street||'');
    const postal=normalizeText(entry.postalCode||'');
    const district=normalizeText(entry.district||'');
    const houseNumber=normalizeText(entry.houseNumber||'');
    const type=entry.type||'poi';

    const searchable=[primary,street,postal,city,district,houseNumber].filter(Boolean).join(' ');
    if(!searchable.includes(q)) return null;

    let score=0;
    const exact=(primary===q || street===q || city===q || postal===q || district===q);
    if(exact) score+=220;

    if(street.startsWith(q)) score+=120;
    if(primary.startsWith(q)) score+=110;
    if(city.startsWith(q)) score+=95;
    if(postal.startsWith(q)) score+=80;

    if(street.includes(q)) score+=45;
    if(primary.includes(q)) score+=40;
    if(city.includes(q)) score+=30;
    if(postal.includes(q)) score+=24;
    if(district.startsWith(q)) score+=40;
    if(district.includes(q)) score+=16;
    if(houseNumber===q) score+=28;

    const isGermersheimCity=city===germersheim;
    const isAllowedCity=allowedCitySet.has(city);

    if(searchType==='pickup'){
      if(type==='street' && isGermersheimCity) score+=200;
      else if(type==='street' && isAllowedCity) score+=150;
      else if(type==='city' && isAllowedCity) score+=120;
      else if(type==='clinic') score+=70;
      else if(type==='station') score+=45;
      else if(type==='poi') score+=30;
      else if(type==='airport') score-=220;

      if(q.length<=2 && type==='airport') score-=120;
      if(entry.source==='directory' && type==='street') score+=90;
    }else{
      if(type==='clinic') score+=170;
      else if(type==='airport') score+=155;
      else if(type==='station') score+=110;
      else if(type==='street') score+=85;
      else if(type==='city') score+=80;
      else if(type==='poi') score+=75;

      if(exact) score+=80;
    }

    if(type==='street' && q.length<=2 && street.startsWith(q)) score+=40;
    if(type==='street' && houseNumber) score+=26;
    if(type==='airport' && q.length<=2 && !primary.startsWith(q)) score-=60;

    return score;
  }

  async function searchAddress(query,type){
    // TODO: Replace fallback search with backend geocoding service / Photon / Maps API.
    const [config,streetRows]=await Promise.all([loadAddressConfig(),loadStreetDirectory()]);
    const streetCandidates=buildStreetDirectoryCandidates(streetRows,query);
    const scored=[...streetCandidates,...fallbackAddressDataset]
      .map(entry=>({entry,score:rankAddressSuggestion(entry,query,type,config)}))
      .filter(item=>item.score!==null)
      .sort((a,b)=>{
        if(b.score!==a.score) return b.score-a.score;
        const aLabel=normalizeText(buildAddressLabel(a.entry));
        const bLabel=normalizeText(buildAddressLabel(b.entry));
        return aLabel.localeCompare(bLabel,'de');
      })
      .filter((item,index,array)=>{
        const label=normalizeText(buildAddressLabel(item.entry));
        return array.findIndex(other=>normalizeText(buildAddressLabel(other.entry))===label)===index;
      })
      .slice(0,8)
      .map(item=>createAddressView(item.entry));

    return scored;
  }
  function getMapQueryForContainer(elementId){
    const defaultQuery='Taxi Germersheim GmbH Friedrich-Ebert-Straße 8 76726 Germersheim';
    if(elementId==='startMapContainer') return $('#startAddress')?.value?.trim() || defaultQuery;
    if(elementId==='endMapContainer') return $('#targetAddress')?.value?.trim() || defaultQuery;
    if(elementId==='bookingRouteMapContainer'){
      const start=$('#startAddress')?.value?.trim() || defaultQuery;
      const target=$('#targetAddress')?.value?.trim() || defaultQuery;
      return `${start} -> ${target}`;
    }
    return defaultQuery;
  }

  function hasGoogleMapsApiKey(){
    const key=String(GOOGLE_MAPS_API_KEY || '').trim();
    return !!key && key!=='YOUR_GOOGLE_MAPS_API_KEY';
  }

  let googleMapsScriptPromise=null;
  function loadGoogleMapsApiOnce(){
    if(!hasGoogleMapsApiKey()) return Promise.resolve(false);
    if(window.google?.maps) return Promise.resolve(true);
    if(googleMapsScriptPromise) return googleMapsScriptPromise;

    googleMapsScriptPromise=new Promise(resolve=>{
      const script=document.createElement('script');
      script.async=true;
      script.defer=true;
      script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
      script.onload=()=>resolve(true);
      script.onerror=()=>resolve(false);
      document.head.appendChild(script);
    });
    return googleMapsScriptPromise;
  }

  async function initBookingPlacesAutocomplete(){
    const pickupInput=$('#startAddress');
    const targetInput=$('#targetAddress');
    if(!pickupInput || !targetInput) return false;
    if(pickupInput.dataset.autocompletePrepared==='true' && targetInput.dataset.autocompletePrepared==='true') return true;

    const loaded=await loadGoogleMapsApiOnce();
    const mode=loaded ? 'google-places-ready' : 'demo';
    [pickupInput,targetInput].forEach(input=>{
      input.dataset.autocompleteMode=mode;
      input.dataset.autocompletePrepared='true';
    });

    $$('[data-autocomplete-list]').forEach(list=>{
      list.dataset.autocompleteMode=mode;
      list.hidden=true;
    });

    return true;
  }

  async function requestDirectionsRoute(_origin,_destination){
    // Vorbereitung fuer spaetere Directions API Anbindung.
    const travelMode=(window.google?.maps?.TravelMode?.DRIVING) || 'DRIVING';
    return {
      travelMode,
      routingPreference:'DRIVING'
    };
  }

  async function requestDistanceMatrix(_origin,_destination){
    // Vorbereitung fuer spaetere Distance Matrix API Anbindung.
    const travelMode=(window.google?.maps?.TravelMode?.DRIVING) || 'DRIVING';
    return {
      travelMode,
      unitSystem:'METRIC'
    };
  }

  function getGoogleMapsEmbedRouteUrl(origin,destination){
    const start=origin || 'Germersheim';
    const target=destination || 'Germersheim';
    if(hasGoogleMapsApiKey()){
      return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(target)}&mode=driving`;
    }
    return `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(start)}&daddr=${encodeURIComponent(target)}&dirflg=d&travelmode=driving`;
  }

  function getMapEmbedUrl(elementId){
    if(elementId==='bookingRouteMapContainer'){
      const start=$('#startAddress')?.value?.trim() || 'Germersheim';
      const target=$('#targetAddress')?.value?.trim() || 'Germersheim';
      return getGoogleMapsEmbedRouteUrl(start,target);
    }
    const query=getMapQueryForContainer(elementId);
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  function lookupDemoCoordinate(address){
    const value=String(address || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/ß/g,'ss')
      .replace(/[^a-z0-9\s-]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
    const hints=[
      {keys:['germersheim','bahnhof germersheim','friedrich-ebert'],lat:49.2238,lon:8.3668},
      {keys:['sondernheim'],lat:49.1992,lon:8.3396},
      {keys:['speyer'],lat:49.3173,lon:8.4311},
      {keys:['landau'],lat:49.1982,lon:8.1166},
      {keys:['karlsruhe'],lat:49.0069,lon:8.4037},
      {keys:['mannheim'],lat:49.4875,lon:8.4660},
      {keys:['heidelberg'],lat:49.3988,lon:8.6724},
      {keys:['flughafen frankfurt','frankfurt terminal'],lat:50.0379,lon:8.5622},
      {keys:['flughafen','rheinmuenster','baden-baden'],lat:48.7794,lon:8.0805},
      {keys:['krankenhaus'],lat:49.2143,lon:8.3624}
    ];

    const matched=hints.find(entry=>entry.keys.some(key=>value.includes(key)));
    if(matched) return {lat:matched.lat,lon:matched.lon};

    const baseLat=49.2238;
    const baseLon=8.3668;
    let hash=0;
    for(let i=0;i<value.length;i+=1) hash=(hash*31 + value.charCodeAt(i)) % 100000;
    return {
      lat:baseLat + ((hash % 700) / 10000),
      lon:baseLon + (((Math.floor(hash / 7) % 700) - 350) / 10000)
    };
  }

  function calculateDistanceKm(a,b){
    const toRad=value=>(value*Math.PI)/180;
    const radius=6371;
    const dLat=toRad(b.lat-a.lat);
    const dLon=toRad(b.lon-a.lon);
    const lat1=toRad(a.lat);
    const lat2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*radius*Math.asin(Math.sqrt(h));
  }

  function estimateRouteMetrics(origin,destination){
    if(!origin || !destination) return null;
    const from=lookupDemoCoordinate(origin);
    const to=lookupDemoCoordinate(destination);
    const distance=Math.max(1,calculateDistanceKm(from,to));
    const avgSpeedKmH=42;
    const minutes=Math.max(4,Math.round((distance/avgSpeedKmH)*60));
    return {
      distanceKm:distance,
      durationMin:minutes,
      source:'demo'
    };
  }

  function formatDistanceText(distanceKm){
    if(!Number.isFinite(distanceKm)) return '-';
    return `${distanceKm.toFixed(1).replace('.',',')} km`;
  }

  function formatDurationText(durationMin){
    if(!Number.isFinite(durationMin)) return '-';
    return `${Math.round(durationMin)} min`;
  }

  function getEstimatedRewardPoints(){
    return bookingStepState.service==='medical' ? 20 : bookingStepState.service==='airport' ? 18 : bookingStepState.service==='wheelchair' ? 17 : 15;
  }

  function formatPriceText(value){
    if(!Number.isFinite(value)) return 'Bitte Fahrzeug wählen';
    return `${value.toFixed(2).replace('.',',')} EUR`;
  }

  function calculateVehicleEstimate(distanceKm,vehicleKey){
    const vehicle=bookingVehicleCatalog[vehicleKey];
    if(!vehicle || !Number.isFinite(distanceKm)) return null;
    const serviceFactor=bookingStepState.service==='airport' ? 1.12 : bookingStepState.service==='medical' ? 1.08 : bookingStepState.service==='wheelchair' ? 1.15 : 1;
    const price=Math.max(vehicle.minimum,vehicle.baseFare + (distanceKm * vehicle.perKm * serviceFactor));
    return Number(price.toFixed(2));
  }

  function getFallbackFareEstimate(distanceKm){
    const estimates=Object.keys(bookingVehicleCatalog)
      .map(key=>calculateVehicleEstimate(distanceKm,key))
      .filter(value=>Number.isFinite(value));
    if(!estimates.length) return null;
    return Math.min(...estimates);
  }

  function getFarePreviewText(distanceKm){
    if(bookingStepState.selectedVehicle){
      return formatPriceText(calculateVehicleEstimate(distanceKm,bookingStepState.selectedVehicle));
    }
    const fallback=getFallbackFareEstimate(distanceKm);
    return Number.isFinite(fallback) ? `ab ${formatPriceText(fallback)}` : 'Bitte Fahrzeug wählen';
  }

  function syncVehiclePriceCards(distanceKm){
    Object.keys(bookingVehicleCatalog).forEach(key=>{
      const node=$(`[data-vehicle-price="${key}"]`);
      if(!node) return;
      const price=calculateVehicleEstimate(distanceKm,key);
      node.textContent=`Geschätzter Preis: ab ${formatPriceText(price)}`;
    });
  }

  // Keep exactly one Wunschfahrzeug active and mirror that state into buttons, badges and the live summary.
  function syncVehicleSelectionSummary(){
    const vehicleNode=$('[data-booking-summary-vehicle]');
    const statusNode=$('[data-booking-summary-vehicle-status]');
    const priceNode=$('[data-booking-summary-price]');
    const vehicle=bookingVehicleCatalog[bookingStepState.selectedVehicle] || null;
    const priceText=getFarePreviewText(bookingRouteState.distanceKm);

    if(vehicleNode) vehicleNode.textContent=vehicle ? vehicle.label : 'Kein Wunsch gespeichert';
    if(statusNode) statusNode.textContent=vehicle ? vehicle.status : 'Bitte Wunsch wählen';
    if(priceNode) priceNode.textContent=priceText;

    $$('[data-vehicle-card]').forEach(card=>{
      const selected=card.dataset.vehicleCard===bookingStepState.selectedVehicle;
      card.classList.toggle('is-selected',selected);
    });

    $$('[data-vehicle-select]').forEach(button=>{
      const selected=button.dataset.vehicleSelect===bookingStepState.selectedVehicle;
      button.textContent=selected ? '✓ Wunsch gespeichert' : 'Als Wunschfahrzeug auswählen';
      button.setAttribute('aria-pressed',selected ? 'true' : 'false');
    });

    $$('[data-vehicle-saved]').forEach(node=>{
      node.hidden=node.dataset.vehicleSaved!==bookingStepState.selectedVehicle;
    });
  }

  function setSelectedVehicle(vehicleKey){
    if(!bookingVehicleCatalog[vehicleKey]) return;
    bookingStepState.selectedVehicle=vehicleKey;
    syncBookingSummary();
  }

  function applyRouteMapPresentationState(container){
    if(!container) return;
    container.dataset.mapTheme=BOOKING_MAP_THEME_PRESET;
    container.dataset.mapStartMarker=BOOKING_MARKER_PRESET.start;
    container.dataset.mapTargetMarker=BOOKING_MARKER_PRESET.target;
  }

  function syncBookingRouteMetrics(){
    const start=$('#startAddress')?.value?.trim() || '';
    const target=$('#targetAddress')?.value?.trim() || '';
    const startPreview=$('#bookingStartPreview');
    const distanceNode=$('[data-booking-distance]');
    const durationNode=$('[data-booking-duration]');
    const serviceNode=$('[data-booking-route-service]');
    const routeModeNode=$('[data-booking-route-mode]');
    const pointsNode=$('[data-booking-route-points]');
    const yumakHintNode=$('[data-booking-yumak-hint]');
    const summaryDistanceNode=$('[data-booking-summary-distance]');
    const summaryDurationNode=$('[data-booking-summary-duration]');
    const summaryRouteModeNode=$('[data-booking-summary-route-mode]');
    const summaryPointsNode=$('[data-booking-summary-points]');
    const vehiclePanel=$('[data-booking-vehicle-panel]');
    const fareOverview=$('[data-booking-fare-overview]');
    const fareDistanceNode=$('[data-fare-distance]');
    const fareDurationNode=$('[data-fare-duration]');
    const fareServiceNode=$('[data-fare-service]');
    const farePassengersNode=$('[data-fare-passengers]');
    const fareVehicleNode=$('[data-fare-vehicle]');
    const farePointsNode=$('[data-fare-points]');
    const farePriceNode=$('[data-fare-price]');
    const fareRewardsNote=$('[data-fare-rewards-note]');
    const fareVoucherNote=$('[data-fare-voucher-note]');
    const points=getEstimatedRewardPoints();
    const routeService=services[bookingStepState.service]?.[0] || 'Normale Taxifahrt';
    const passengersText=String($('#bookingPassengers')?.value || '1');

    if(startPreview) startPreview.value=start || '-';
    if(serviceNode) serviceNode.textContent=routeService;
    if(routeModeNode) routeModeNode.textContent='Autofahrt';
    if(pointsNode) pointsNode.textContent=`ca. ${points}`;
    if(summaryRouteModeNode) summaryRouteModeNode.textContent='Autofahrt';
    if(summaryPointsNode) summaryPointsNode.textContent=`ca. ${points}`;
    if(fareServiceNode) fareServiceNode.textContent=routeService;
    if(farePassengersNode) farePassengersNode.textContent=passengersText;
    if(farePointsNode) farePointsNode.textContent=`ca. ${points}`;

    if(!start || !target){
      bookingRouteState.distanceText='-';
      bookingRouteState.durationText='-';
      bookingRouteState.distanceKm=null;
      bookingRouteState.durationMin=null;
      bookingStepState.selectedVehicle='';
      if(distanceNode) distanceNode.textContent='-';
      if(durationNode) durationNode.textContent='-';
      if(summaryDistanceNode) summaryDistanceNode.textContent='-';
      if(summaryDurationNode) summaryDurationNode.textContent='-';
      if(vehiclePanel) vehiclePanel.hidden=true;
      if(fareOverview) fareOverview.hidden=true;
      syncVehiclePriceCards(null);
      syncVehicleSelectionSummary();
      if(fareDistanceNode) fareDistanceNode.textContent='-';
      if(fareDurationNode) fareDurationNode.textContent='-';
      if(fareVehicleNode) fareVehicleNode.textContent='Kein Wunsch gespeichert';
      if(farePriceNode) farePriceNode.textContent='Bitte Fahrzeug wählen';
      if(fareRewardsNote) fareRewardsNote.textContent=`Mit dieser Fahrt erhältst du voraussichtlich ca. ${points} Punkte.`;
      if(fareVoucherNote) fareVoucherNote.hidden=true;
      if(yumakHintNode) yumakHintNode.textContent='Perfekt! Das sind ungefähr 7,5 km und 11 Minuten.';
      return;
    }

    const metrics=estimateRouteMetrics(start,target);
    const distanceText=formatDistanceText(metrics?.distanceKm);
    const durationText=formatDurationText(metrics?.durationMin);

    bookingRouteState.distanceText=distanceText;
    bookingRouteState.durationText=durationText;
    bookingRouteState.distanceKm=metrics?.distanceKm || null;
    bookingRouteState.durationMin=metrics?.durationMin || null;
    bookingRouteState.source=metrics?.source || 'demo';

    if(distanceNode) distanceNode.textContent=distanceText;
    if(durationNode) durationNode.textContent=durationText;
    if(summaryDistanceNode) summaryDistanceNode.textContent=distanceText;
    if(summaryDurationNode) summaryDurationNode.textContent=durationText;
    if(vehiclePanel) vehiclePanel.hidden=false;
    if(fareOverview) fareOverview.hidden=false;
    syncVehiclePriceCards(metrics?.distanceKm);
    syncVehicleSelectionSummary();
    if(fareDistanceNode) fareDistanceNode.textContent=distanceText;
    if(fareDurationNode) fareDurationNode.textContent=durationText;
    if(fareVehicleNode) fareVehicleNode.textContent=bookingVehicleCatalog[bookingStepState.selectedVehicle]?.label || 'Kein Wunsch gespeichert';
    if(farePriceNode) farePriceNode.textContent=getFarePreviewText(metrics?.distanceKm);
    if(fareRewardsNote) fareRewardsNote.textContent=`Mit dieser Fahrt erhältst du voraussichtlich ca. ${points} Punkte.`;
    if(fareVoucherNote){
      let hasVoucher=false;
      try{
        const raw=localStorage.getItem('taxiRewardsEngineState');
        if(raw) hasVoucher=Number(JSON.parse(raw)?.voucherBalance || 0)>0;
      }catch(_err){
        hasVoucher=false;
      }
      fareVoucherNote.hidden=!hasVoucher;
    }
    if(yumakHintNode){
      if(bookingStepState.service==='medical') yumakHintNode.textContent='Für Krankenfahrten helfen wir dir gerne bei Fragen zur Kostenübernahme.';
      else if(bookingStepState.service==='airport') yumakHintNode.textContent='Plane bitte genug Zeit für Check-in und Gepäck ein.';
      else yumakHintNode.textContent=`Perfekt! Das sind ungefähr ${distanceText} und ${durationText}.`;
    }
  }
  function getStoredCookieConsent(){
    try{
      const value=localStorage.getItem(CONSENT_STORAGE_KEY);
      if(value===CONSENT_ALL || value===CONSENT_NECESSARY) return value;
      if(value!==null) localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }catch(_err){
      return null;
    }
  }
  function persistCookieConsent(value){
    try{
      localStorage.setItem(CONSENT_STORAGE_KEY,value);
    }catch(_err){
      // Keep UI functional even if storage is unavailable.
    }
  }
  function showCookieBanner(){
    const banner=document.getElementById('cookieBanner');
    if(!banner) return;
    banner.hidden=false;
    banner.removeAttribute('hidden');
    banner.style.display='flex';
    banner.style.visibility='visible';
    banner.style.opacity='1';
    banner.setAttribute('aria-hidden','false');
  }
  function hideCookieBanner(){
    const banner=document.getElementById('cookieBanner');
    if(!banner) return;
    banner.hidden=true;
    banner.setAttribute('hidden','');
    banner.style.display='none';
    banner.setAttribute('aria-hidden','true');
  }
  function hasExternalConsent(){
    return getStoredCookieConsent()===CONSENT_ALL;
  }
  function renderMapPlaceholder(container){
    if(!container) return;
    container.innerHTML='';
    const box=document.createElement('div');
    box.className='map-consent-placeholder';
    box.innerHTML='<p>Google Maps wird erst nach Ihrer Zustimmung geladen.</p><button type="button" class="map-consent-btn" data-map-action="load">Google Maps laden</button>';
    container.appendChild(box);
  }
  function loadMapIntoContainer(container,elementId){
    if(!container) return;
    if(elementId==='bookingRouteMapContainer') applyRouteMapPresentationState(container);
    const iframe=document.createElement('iframe');
    iframe.className='map-embed-frame';
    iframe.loading='lazy';
    iframe.referrerPolicy='no-referrer-when-downgrade';
    iframe.allowFullscreen=true;
    iframe.title='Google Maps';
    iframe.src=getMapEmbedUrl(elementId);
    container.innerHTML='';
    container.appendChild(iframe);
  }
  function refreshMapContainers(){
    Object.entries(mapContainers).forEach(([id,container])=>{
      if(hasExternalConsent()) loadMapIntoContainer(container,id);
      else renderMapPlaceholder(container);
    });
  }
  function initMapContainer(elementId){
    const container=$('#'+elementId);
    if(!container) return null;
    mapContainers[elementId]=container;
    refreshMapContainers();
    return container;
  }
  function loadMapFromPlaceholder(button){
    const container=button?.closest('.map-container');
    if(!container) return;
    const elementId=container.id;
    if(!elementId) return;
    loadMapIntoContainer(container,elementId);
    if(elementId==='bookingRouteMapContainer') syncBookingRouteMetrics();
  }
  function initCookieBanner(){
    const banner=$('#cookieBanner');
    const acceptAll=$('#cookieAcceptAll');
    const necessary=$('#cookieNecessary');
    const settings=$('#cookieSettings');
    if(!banner) return;

    hideCookieBanner();

    if(getStoredCookieConsent()){
      refreshMapContainers();
      return;
    }

    setTimeout(()=>{
      if(!getStoredCookieConsent()) showCookieBanner();
    },1500);

    acceptAll?.addEventListener('click',()=>{
      persistCookieConsent(CONSENT_ALL);
      hideCookieBanner();
      refreshMapContainers();
    });

    necessary?.addEventListener('click',()=>{
      persistCookieConsent(CONSENT_NECESSARY);
      hideCookieBanner();
      refreshMapContainers();
    });

    settings?.addEventListener('click',()=>{
      alert('Cookie-Einstellungen werden in einer nächsten Version erweitert. Aktuell können Sie alle oder nur notwendige Cookies wählen.');
    });

    refreshMapContainers();
  }
  function initContactRequestForm(){
    const form=$('#contactRequestForm');
    if(!form) return;

    const privacy=$('#requestPrivacy');
    const submit=$('#requestSubmit');
    const status=$('#requestStatus');
    const requiredFields=$$('[required]',form);

    function setStatus(message,isError){
      if(!status) return;
      status.textContent=message;
      status.dataset.state=isError?'error':'success';
    }

    function clearStatus(){
      if(!status) return;
      status.textContent='';
      delete status.dataset.state;
    }

    function getPayload(){
      const data=new FormData(form);
      return {
        name:(data.get('name')||'').toString().trim(),
        phone:(data.get('phone')||'').toString().trim(),
        email:(data.get('email')||'').toString().trim(),
        pickup:(data.get('pickup')||'').toString().trim(),
        destination:(data.get('destination')||'').toString().trim(),
        date:(data.get('date')||'').toString().trim(),
        time:(data.get('time')||'').toString().trim(),
        passengers:(data.get('passengers')||'').toString().trim(),
        message:(data.get('message')||'').toString().trim(),
        privacyAccepted:!!privacy?.checked
      };
    }

    function validateRequiredFields(){
      requiredFields.forEach(field=>field.removeAttribute('aria-invalid'));

      const invalidFields=requiredFields.filter(field=>{
        if(field.type==='checkbox') return !field.checked;
        if(field.type==='email') return !field.value.trim() || !field.checkValidity();
        return !field.value.trim() || !field.checkValidity();
      });

      invalidFields.forEach(field=>field.setAttribute('aria-invalid','true'));
      return invalidFields;
    }

    async function sendContactRequest(payload){
      if(CONTACT_SERVICE_CONFIG.provider==='formspree'){
        if(!CONTACT_SERVICE_CONFIG.formspreeEndpoint) throw new Error('not_configured');
        const response=await fetch(CONTACT_SERVICE_CONFIG.formspreeEndpoint,{
          method:'POST',
          headers:{
            'Accept':'application/json',
            'Content-Type':'application/json'
          },
          body:JSON.stringify(payload)
        });
        if(!response.ok) throw new Error('send_failed');
        return;
      }

      if(CONTACT_SERVICE_CONFIG.provider==='emailjs'){
        const {serviceId,templateId,publicKey}=CONTACT_SERVICE_CONFIG.emailjs;
        if(!serviceId || !templateId || !publicKey) throw new Error('not_configured');

        const response=await fetch('https://api.emailjs.com/api/v1.0/email/send',{
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            service_id:serviceId,
            template_id:templateId,
            user_id:publicKey,
            template_params:payload
          })
        });
        if(!response.ok) throw new Error('send_failed');
        return;
      }

      throw new Error('not_configured');
    }

    function syncFormState(){
      const allowSubmit=!!privacy?.checked;
      if(submit) submit.disabled=!allowSubmit;
    }

    privacy?.addEventListener('change',()=>{
      syncFormState();
      clearStatus();
      privacy.removeAttribute('aria-invalid');
    });

    form.addEventListener('input',e=>{
      clearStatus();
      if(e.target?.hasAttribute?.('aria-invalid')) e.target.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const invalidFields=validateRequiredFields();
      if(invalidFields.length){
        setStatus('Bitte füllen Sie alle Pflichtfelder korrekt aus und bestätigen Sie den Datenschutz.',true);
        invalidFields[0].focus();
        return;
      }

      const payload=getPayload();
      if(submit) submit.disabled=true;

      try{
        await sendContactRequest(payload);
        saveBookingBridgeState({
          customer:payload.name,
          rideType:bookingStepState.service,
          pickup:payload.pickup,
          destination:payload.destination
        });
        createRideTrackingStateFromBooking({...payload,rideType:bookingStepState.service});
        form.reset();
        syncFormState();
        setStatus('Ihre Anfrage wurde erfolgreich gesendet. Ihre aktuelle Fahrt wird jetzt vorbereitet.',false);
        show('ride-status');
      }catch(error){
        if(error?.message==='not_configured'){
          saveBookingBridgeState({
            customer:payload.name,
            rideType:bookingStepState.service,
            pickup:payload.pickup,
            destination:payload.destination
          });
          createRideTrackingStateFromBooking({...payload,rideType:bookingStepState.service});
          form.reset();
          syncFormState();
          setStatus('Demo-Anfrage vorbereitet. Ihre aktuelle Fahrt wird jetzt angezeigt.',false);
          show('ride-status');
        }else{
          setStatus('Der Versand konnte nicht abgeschlossen werden. Bitte rufen Sie uns an oder schreiben Sie per WhatsApp.',true);
        }
      }finally{
        syncFormState();
      }
    });

    syncFormState();
  }
  function resolveInitialScreen(){
    const params=new URLSearchParams(window.location.search);
    const page=params.get('page');
    if(page && $('#'+page)) return page;
    return null;
  }
  function inject(){
    $$('[data-icon]').forEach(el=>{
      const key=String(el.dataset.icon||'').trim();
      el.innerHTML=buildOfficialIconMarkup(key)||icons[key]||'';
    });
  }
  function show(id){
    if(!$('#'+id)) id='home';
    $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
    $$('.site-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
    window.scrollTo(0,0);
  }
  function setService(s){
    const selectedTitle=$('#selectedTitle');
    const serviceLabel=$('#serviceLabel');
    const medicalPanel=$('#medicalPanel');
    if(!selectedTitle || !serviceLabel || !medicalPanel) return;
    if(!services[s]) s='taxi';
    bookingStepState.service=s;
    selectedTitle.textContent=services[s][0];
    serviceLabel.textContent=services[s][1];
    $$('.type-grid button').forEach(b=>b.classList.toggle('active',b.dataset.serviceSelect===s));
    medicalPanel.classList.toggle('hidden',s!=='medical');
    syncBookingSummary();
  }

  const bookingStepState={
    current:1,
    total:7,
    service:'taxi',
    selectedVehicle:''
  };

  // Premium vehicle wish cards use static availability today and keep demo pricing for later backend integration.
  const bookingVehicleCatalog={
    limousine:{label:'Limousine',baseFare:4.8,perKm:2.2,minimum:12.5,status:'Wunsch gespeichert'},
    van:{label:'Großraumtaxi',baseFare:7.4,perKm:2.85,minimum:18.5,status:'Wunsch gespeichert'},
    wheelchair:{label:'Rollstuhlfahrzeug',baseFare:8.4,perKm:3.1,minimum:21.5,status:'Wunsch gespeichert'}
  };

  function getBookingRoot(){
    return $('#booking.booking-premium');
  }

  function getBookingStepPanel(step){
    return $(`[data-booking-step="${step}"]`);
  }

  function formatBookingDate(dateValue){
    if(!dateValue) return '-';
    const date=new Date(`${dateValue}T00:00:00`);
    if(Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('de-DE');
  }

  function getActiveBookingStep(){
    return $('[data-booking-step].is-active');
  }

  function setBookingStepFeedback(step,message){
    const panel=getBookingStepPanel(step);
    const feedback=$('[data-booking-step-feedback]',panel);
    if(!feedback) return;
    feedback.textContent=message;
    feedback.hidden=!message;
  }

  function clearBookingStepFeedback(step){
    const panel=typeof step==='number' ? getBookingStepPanel(step) : step;
    const feedback=$('[data-booking-step-feedback]',panel || document);
    if(!feedback) return;
    feedback.textContent='';
    feedback.hidden=true;
  }

  function isLaterPlanSelected(){
    const buttons=$$('.toggle button');
    return !!buttons[1]?.classList.contains('active');
  }

  function updateBookingScheduleVisibility(){
    const timeFields=$('[data-booking-time-fields]');
    if(!timeFields) return;
    timeFields.hidden=!isLaterPlanSelected();
  }

  function getBookingTimeSummaryText(timeValue){
    if(!isLaterPlanSelected()) return 'So schnell wie möglich';
    return timeValue || '-';
  }

  function collectBookingOptions(){
    return $$('.pb-option-grid button.active').map(button=>button.textContent.trim()).filter(Boolean);
  }

  function syncBookingRequestForm(){
    const start=$('#startAddress')?.value?.trim() || '';
    const target=$('#targetAddress')?.value?.trim() || '';
    const date=$('#bookingDate')?.value || '';
    const time=$('#bookingTime')?.value || '';
    const passengers=$('#bookingPassengers')?.value || '1';
    const note=$('#bookingNote')?.value?.trim() || '';
    const name=$('#customerName')?.value?.trim() || '';
    const phone=$('#customerPhone')?.value?.trim() || '';

    const pickupField=$('#requestPickup');
    const destinationField=$('#requestDestination');
    const dateField=$('#requestDate');
    const timeField=$('#requestTime');
    const passengersField=$('#requestPassengers');
    const messageField=$('#requestMessage');
    const nameField=$('#requestName');
    const phoneField=$('#requestPhone');

    if(pickupField) pickupField.value=start;
    if(destinationField) destinationField.value=target;
    if(dateField) dateField.value=date;
    if(timeField) timeField.value=time;
    if(passengersField) passengersField.value=passengers;
    if(messageField) messageField.value=note;
    if(nameField && !nameField.value.trim()) nameField.value=name;
    if(phoneField && !phoneField.value.trim()) phoneField.value=phone;
  }

  function syncBookingSummary(){
    const start=$('#startAddress')?.value?.trim() || '-';
    const target=$('#targetAddress')?.value?.trim() || '-';
    const date=$('#bookingDate')?.value || '';
    const time=$('#bookingTime')?.value || '';
    const options=collectBookingOptions();
    const serviceName=services[bookingStepState.service]?.[0] || 'Normale Taxifahrt';

    const startNode=$('[data-booking-summary-start]');
    const targetNode=$('[data-booking-summary-target]');
    const dateNode=$('[data-booking-summary-date]');
    const timeNode=$('[data-booking-summary-time]');
    const serviceNode=$('[data-booking-summary-service]');
    const optionsNode=$('[data-booking-summary-options]');
    const rewardsHint=$('[data-booking-rewards-hint]');
    const voucherHint=$('[data-booking-voucher-hint]');

    if(startNode) startNode.textContent=start;
    if(targetNode) targetNode.textContent=target;
    if(dateNode) dateNode.textContent=formatBookingDate(date);
    if(timeNode) timeNode.textContent=getBookingTimeSummaryText(time);
    if(serviceNode) serviceNode.textContent=serviceName;
    if(optionsNode) optionsNode.textContent=options.length ? options.join(', ') : 'Keine';

    if(rewardsHint){
      const showRewards=start!=='-' && target!=='-';
      rewardsHint.hidden=!showRewards;
      if(showRewards){
        const points=getEstimatedRewardPoints();
        rewardsHint.textContent=`Mit dieser Fahrt erhältst du ca. ${points} Punkte.`;
      }
    }

    if(voucherHint){
      let hasVoucher=false;
      try{
        const raw=localStorage.getItem('taxiRewardsEngineState');
        if(raw){
          const parsed=JSON.parse(raw);
          hasVoucher=Number(parsed?.voucherBalance || 0)>0;
        }
      }catch(_err){
        hasVoucher=false;
      }
      voucherHint.hidden=!hasVoucher;
      if(hasVoucher) voucherHint.textContent='Gutschein-Guthaben verfügbar.';
    }

    syncBookingRouteMetrics();
    syncBookingRequestForm();
  }

  function updateBookingProgress(){
    const text=$('[data-booking-progress-text]');
    const percentNode=$('[data-booking-progress-percent]');
    const fill=$('[data-booking-progress-fill]');
    const steps=$$('[data-booking-step-goto]');
    const progress=Math.round((bookingStepState.current/bookingStepState.total)*100);

    if(text) text.textContent=`Schritt ${bookingStepState.current} von ${bookingStepState.total}`;
    if(percentNode) percentNode.textContent=`${progress}%`;
    if(fill) fill.style.width=`${progress}%`;

    steps.forEach(button=>{
      const step=Number(button.dataset.bookingStepGoto || 1);
      button.classList.toggle('active',step===bookingStepState.current);
    });
  }

  function showBookingStep(step){
    const normalized=Math.max(1,Math.min(bookingStepState.total,step));
    bookingStepState.current=normalized;
    $$('[data-booking-step]').forEach(panel=>{
      const panelStep=Number(panel.dataset.bookingStep || 0);
      const active=panelStep===normalized;
      panel.classList.toggle('is-active',active);
      panel.hidden=!active;
      clearBookingStepFeedback(panel);
    });
    updateBookingProgress();
    syncBookingSummary();
  }

  function isBookingStepValid(step){
    const start=$('#startAddress')?.value?.trim() || '';
    const target=$('#targetAddress')?.value?.trim() || '';
    const date=$('#bookingDate')?.value || '';
    const time=$('#bookingTime')?.value || '';
    const phone=$('#customerPhone')?.value?.trim() || '';
    const passengers=Number($('#bookingPassengers')?.value || 1);
    if(step===1) return !!start;
    if(step===2) return !!target;
    if(step===4 && isLaterPlanSelected()) return !!date && !!time;
    if(step===5) return passengers>=1;
    if(step===6) return !!phone;
    return true;
  }

  function handleBookingStepAction(action){
    if(action==='next'){
      if(!isBookingStepValid(bookingStepState.current)){
        const message=bookingStepState.current===1 ? 'Bitte geben Sie einen gültigen Abholort ein.' : bookingStepState.current===2 ? 'Bitte geben Sie ein gültiges Ziel ein.' : bookingStepState.current===4 ? 'Bitte wählen Sie Datum und Uhrzeit für die geplante Fahrt.' : 'Bitte fuellen Sie die erforderlichen Felder in diesem Schritt aus.';
        setBookingStepFeedback(bookingStepState.current,message);
        return true;
      }
      clearBookingStepFeedback(bookingStepState.current);
      showBookingStep(bookingStepState.current+1);
      return true;
    }

    if(action==='back'){
      showBookingStep(bookingStepState.current-1);
      return true;
    }

    return false;
  }

  function initPremiumBookingFlow(){
    const root=getBookingRoot();
    if(!root) return;

    const dateField=$('#bookingDate');
    const timeField=$('#bookingTime');
    if(dateField && !dateField.value) dateField.valueAsDate=new Date();
    if(timeField && !timeField.value) timeField.value='12:00';
    applyRouteMapPresentationState($('#bookingRouteMapContainer'));
    initBookingPlacesAutocomplete();
    renderBookingFavoriteAddresses();
    updateBookingScheduleVisibility();

    const pendingRebook=consumeBookingRebookState();
    if(pendingRebook){
      const startField=$('#startAddress');
      const targetField=$('#targetAddress');
      if(startField) startField.value=pendingRebook.pickup;
      if(targetField) targetField.value=pendingRebook.destination;
      if(pendingRebook.rideType && services[pendingRebook.rideType]) setService(pendingRebook.rideType);
      saveBookingBridgeState({
        pickup:pendingRebook.pickup,
        destination:pendingRebook.destination,
        rideType:pendingRebook.rideType || bookingStepState.service
      });
    }

    showBookingStep(pendingRebook ? 2 : 1);
    syncBookingSummary();
  }

  const CUSTOMER_ACCOUNT_STORAGE_KEY='taxiCustomerAccountDemoState';

  function getDefaultFavoriteAddresses(){
    return [
      {id:'addr-home',label:'Zuhause',value:'Germersheim Zentrum'},
      {id:'addr-work',label:'Arbeit',value:'Industriegebiet Sued'},
      {id:'addr-station',label:'Bahnhof Germersheim',value:'Bahnhofstrasse 23, 76726 Germersheim'},
      {id:'addr-hospital',label:'Krankenhaus',value:'Asklepios Suedpfalzklinik Germersheim'},
      {id:'addr-airport',label:'Flughafen Frankfurt',value:'Flughafen Frankfurt Terminal 1'}
    ];
  }

  function normalizeFavoriteAddresses(list){
    if(!Array.isArray(list) || !list.length) return getDefaultFavoriteAddresses();
    return list
      .map((item,index)=>({
        id:String(item?.id || `addr-custom-${index+1}`),
        label:String(item?.label || 'Adresse').trim(),
        value:String(item?.value || '').trim()
      }))
      .filter(item=>item.value.length>0);
  }

  function readCustomerAccountDemoState(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CUSTOMER_ACCOUNT_STORAGE_KEY) || '');
      return parsed && typeof parsed==='object' ? parsed : null;
    }catch(_err){
      return null;
    }
  }

  function readCustomerFavoriteAddresses(){
    const state=readCustomerAccountDemoState();
    return normalizeFavoriteAddresses(state?.favoriteAddresses);
  }

  function writeCustomerFavoriteAddresses(addresses){
    const safeAddresses=normalizeFavoriteAddresses(addresses);
    const state=readCustomerAccountDemoState() || {};
    try{
      localStorage.setItem(CUSTOMER_ACCOUNT_STORAGE_KEY,JSON.stringify({...state,favoriteAddresses:safeAddresses}));
    }catch(_err){
      // Keep demo mode resilient when storage is unavailable.
    }
  }

  function renderBookingFavoriteAddresses(){
    const lists=$$('[data-booking-favorites-list]');
    if(!lists.length) return;
    const favorites=readCustomerFavoriteAddresses();
    lists.forEach(list=>{
      const targetRole=String(list.dataset.bookingFavoritesList || '').trim().toLowerCase();
      list.innerHTML='';
      favorites.forEach(item=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='button secondary pb-favorite-button';
        button.dataset.bookingFavoriteSelect='true';
        button.dataset.favoriteTarget=targetRole || 'destination';
        button.dataset.favoriteValue=item.value;
        button.dataset.favoriteLabel=item.label;

        const label=document.createElement('span');
        label.className='pb-favorite-label';
        label.textContent=item.label;

        const value=document.createElement('small');
        value.className='pb-favorite-value';
        value.textContent=item.value;

        button.append(label,value);
        list.append(button);
      });
    });
  }

  function handleBookingEnterSubmit(target){
    if(target?.id==='startAddress'){
      if(!$('#startAddress')?.value?.trim()){
        setBookingStepFeedback(1,'Bitte geben Sie einen gültigen Abholort ein.');
        return true;
      }
      clearBookingStepFeedback(1);
      showBookingStep(2);
      return true;
    }

    if(target?.id==='targetAddress'){
      const hasStart=!!$('#startAddress')?.value?.trim();
      const hasTarget=!!$('#targetAddress')?.value?.trim();
      if(!hasStart || !hasTarget){
        setBookingStepFeedback(2,'Bitte geben Sie Abholort und Ziel vollständig ein.');
        return true;
      }
      clearBookingStepFeedback(2);
      syncBookingSummary();
      if(hasExternalConsent()) refreshMapContainers();
      showBookingStep(3);
      return true;
    }

    return false;
  }

  function handleGlobalKeydown(e){
    if(e.key!=='Enter') return;
    if(e.target instanceof HTMLTextAreaElement) return;
    if(handleBookingEnterSubmit(e.target)) e.preventDefault();
  }

  function validate(){
    const start=$('#startAddress');
    const target=$('#targetAddress');
    const phone=$('#customerPhone');
    const send=$('#sendRequest');
    if(!start || !target || !phone || !send) return;
    const ok=start.value.trim()&&target.value.trim()&&phone.value.trim();
    send.textContent=ok?'Fahrtanfrage senden':'Fahrtanfrage nicht möglich';
    syncBookingSummary();
  }

  function setSingleActive(selector,activeElement){
    $$(selector).forEach(button=>button.classList.toggle('active',button===activeElement));
  }

  function getNavigationElements(){
    const servicesItem=$('.nav-item-services');
    return {
      topbar:$('.topbar'),
      menuToggle:$('.menu-toggle'),
      siteNav:$('.site-nav'),
      backdrop:$('.site-nav-backdrop'),
      servicesItem,
      servicesTrigger:servicesItem?.querySelector('.nav-trigger') || null,
      bookBtn:$('#headerBookBtn')
    };
  }

  function closeNavigationState(nav){
    nav.siteNav?.classList.remove('open');
    document.body.classList.remove('nav-open');
    nav.menuToggle?.setAttribute('aria-expanded','false');
    nav.servicesItem?.classList.remove('is-open');
    nav.servicesTrigger?.setAttribute('aria-expanded','false');
  }

  function handleGoAction(event,go,nav){
    event.preventDefault();
    if(go.dataset.service) setService(go.dataset.service);

    if(go.dataset.go==='kontakt'){
      show('home');
      setTimeout(()=>{
        const anchor=document.getElementById(go.dataset.go);
        anchor?.scrollIntoView({behavior:'smooth',block:'start'});
      },100);
    }else{
      show(go.dataset.go);
    }

    closeNavigationState(nav);
  }

  function handleChipClick(chip){
    if(chip.dataset.address){
      $('#targetAddress').value=chip.dataset.address;
      if(chip.dataset.service) setService(chip.dataset.service);
      validate();
      if(hasExternalConsent()) refreshMapContainers();
      return;
    }
    chip.classList.toggle('active');
  }

  function handleGlobalClick(e,nav){
    const mapLoad=e.target.closest('[data-map-action="load"]');
    if(mapLoad){
      e.preventDefault();
      loadMapFromPlaceholder(mapLoad);
      return;
    }

    const go=e.target.closest('[data-go]');
    if(go){
      handleGoAction(e,go,nav);
      return;
    }

    const nextButton=e.target.closest('[data-booking-next]');
    if(nextButton){
      handleBookingStepAction('next');
      return;
    }

    const favoriteBookingButton=e.target.closest('[data-booking-favorite-select]');
    if(favoriteBookingButton){
      const targetRole=String(favoriteBookingButton.dataset.favoriteTarget || 'destination').trim().toLowerCase();
      const value=String(favoriteBookingButton.dataset.favoriteValue || '').trim();
      if(!value) return;

      const startField=$('#startAddress');
      const targetField=$('#targetAddress');
      if(targetRole==='pickup' && startField) startField.value=value;
      if(targetRole==='destination' && targetField) targetField.value=value;

      saveBookingBridgeState({
        pickup:startField?.value?.trim() || '',
        destination:targetField?.value?.trim() || ''
      });

      validate();
      syncBookingSummary();
      if((startField?.value?.trim() || '') && (targetField?.value?.trim() || '')) syncBookingRouteMetrics();
      if(hasExternalConsent()) refreshMapContainers();
      return;
    }

    const backButton=e.target.closest('[data-booking-back]');
    if(backButton){
      handleBookingStepAction('back');
      return;
    }

    const gotoButton=e.target.closest('[data-booking-step-goto]');
    if(gotoButton){
      const targetStep=Number(gotoButton.dataset.bookingStepGoto || 1);
      if(targetStep<=bookingStepState.current || isBookingStepValid(bookingStepState.current)){
        showBookingStep(targetStep);
      }else{
        alert('Bitte schliessen Sie zuerst den aktuellen Schritt ab.');
      }
      return;
    }

    const serviceSelect=e.target.closest('[data-service-select]');
    if(serviceSelect){
      setService(serviceSelect.dataset.serviceSelect);
      return;
    }

    const vehicleSelect=e.target.closest('[data-vehicle-select]');
    if(vehicleSelect){
      setSelectedVehicle(vehicleSelect.dataset.vehicleSelect);
      return;
    }

    const trip=e.target.closest('[data-trip]');
    if(trip){
      setSingleActive('.trip-grid button',trip);
      return;
    }

    const toggleButton=e.target.closest('.toggle button');
    if(toggleButton){
      setSingleActive('.toggle button',toggleButton);
      updateBookingScheduleVisibility();
      clearBookingStepFeedback(4);
      syncBookingSummary();
      return;
    }

    const locationButton=e.target.closest('#locationBtn');
    if(locationButton){
      getLocation();
      return;
    }

    const chip=e.target.closest('.details button,.chips button,.small-toggle button');
    if(chip){
      handleChipClick(chip);
      syncBookingSummary();
    }
  }

  function handleGlobalInput(e){
    if(e.target.id==='startAddress') clearBookingStepFeedback(1);
    if(e.target.id==='targetAddress') clearBookingStepFeedback(2);
    if(e.target.id==='bookingDate' || e.target.id==='bookingTime') clearBookingStepFeedback(4);
    validate();
    syncBookingSummary();
    if(!hasExternalConsent()) return;
    if(e.target.id==='startAddress' || e.target.id==='targetAddress') refreshMapContainers();
  }

  let userLocation=null;
  function getLocation(){
    if('geolocation' in navigator){
      navigator.geolocation.getCurrentPosition(pos=>{
        userLocation={lat:pos.coords.latitude,lon:pos.coords.longitude};
        $('#startAddress').value='Aktueller Standort';
        validate();
      },err=>{
        alert('Standortzugriff verweigert. Bitte in Browser-Einstellungen aktivieren.');
      });
    }else{
      alert('Geolocation nicht verfügbar');
    }
  }
  function initMedicalAssistant(){
    const root=$('#medicalAssistant');
    if(!root || !root.classList.contains('nova-assistant')) return;

    const steps=$$('.nova-step',root);
    const progressText=$('#novaProgressText');
    const progressFill=$('#novaProgressFill');
    const hint=$('#novaHint');
    const success=$('#novaSuccess');

    const dateOverlay=$('#novaDateOverlay');
    const dateDialog=$('.nova-overlay-panel',dateOverlay);
    const monthLabel=$('#novaMonthLabel');
    const calendarGrid=$('#novaCalendarGrid');
    const timeList=$('#novaTimeList');
    let dateOverlayOpener=null;

    const state={
      activeStep:1,
      completed:new Set(),
      values:{
        rideType:'',
        pickup:'',
        destination:'',
        date:'',
        time:'',
        name:'',
        phone:'',
        email:'',
        insurance:'',
        notes:''
      },
      calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),
      selectedHour:null,
      selectedMinute:null,
      hintTimer:null,
      hintIndex:0
    };

    const addressUi={
      pickup:{
        key:'pickup',
        type:'pickup',
        step:2,
        input:$('#novaPickup'),
        list:$('#novaPickupSuggestions'),
        manualHint:$('#novaPickupManualHint'),
        results:[],
        activeIndex:-1,
        requestId:0
      },
      destination:{
        key:'destination',
        type:'destination',
        step:3,
        input:$('#novaDestination'),
        list:$('#novaDestinationSuggestions'),
        manualHint:$('#novaDestinationManualHint'),
        results:[],
        activeIndex:-1,
        requestId:0
      }
    };

    const hintLines=['Perfekt.','Alles klar.','Fast geschafft.'];

    function toIso(date){
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }

    function fromIso(value){
      if(!value) return null;
      const [y,m,d]=value.split('-').map(Number);
      if(!y||!m||!d) return null;
      const date=new Date(y,m-1,d);
      return Number.isNaN(date.getTime())?null:date;
    }

    function displayDate(value){
      const date=fromIso(value);
      if(!date) return 'Datum auswählen';
      return date.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    }

    function showHint(){
      if(!hint) return;
      if(state.hintTimer) clearTimeout(state.hintTimer);
      hint.textContent=hintLines[state.hintIndex%hintLines.length];
      state.hintIndex+=1;
      hint.hidden=false;
      hint.classList.add('is-visible');
      state.hintTimer=setTimeout(()=>{
        hint.classList.remove('is-visible');
        setTimeout(()=>{hint.hidden=true;},220);
      },1000);
    }

    function updateProgress(){
      if(progressText) progressText.textContent=`Schritt ${state.activeStep} von 7`;
      if(progressFill) progressFill.style.width=`${(state.activeStep/7)*100}%`;
    }

    function refreshSummary(){
      const map={
        novaSummaryType:state.values.rideType,
        novaSummaryPickup:state.values.pickup,
        novaSummaryDestination:state.values.destination,
        novaSummaryDate:state.values.date?displayDate(state.values.date):'',
        novaSummaryTime:state.values.time,
        novaSummaryName:state.values.name,
        novaSummaryPhone:state.values.phone,
        novaSummaryEmail:state.values.email,
        novaSummaryInsurance:state.values.insurance,
        novaSummaryNotes:state.values.notes
      };
      Object.entries(map).forEach(([id,value])=>{
        const el=$('#'+id);
        if(el) el.textContent=(value||'').trim()||'-';
      });
    }

    function hideManualHint(ctx){
      if(ctx?.manualHint) ctx.manualHint.hidden=true;
    }

    function showManualHint(ctx){
      if(ctx?.manualHint) ctx.manualHint.hidden=false;
    }

    function closeAddressDropdown(ctx){
      if(!ctx) return;
      ctx.activeIndex=-1;
      ctx.results=[];
      if(ctx.list){
        ctx.list.innerHTML='';
        ctx.list.hidden=true;
      }
    }

    function closeAllAddressDropdowns(){
      closeAddressDropdown(addressUi.pickup);
      closeAddressDropdown(addressUi.destination);
      hideManualHint(addressUi.pickup);
      hideManualHint(addressUi.destination);
    }

    function renderAddressDropdown(ctx){
      if(!ctx?.list) return;
      if(!ctx.results.length){
        ctx.list.innerHTML='';
        ctx.list.hidden=true;
        return;
      }

      ctx.list.innerHTML=ctx.results.map((item,index)=>{
        const isActive=index===ctx.activeIndex?' is-active':'';
        return `<button type="button" class="nova-address-option${isActive}" data-address-select="${ctx.key}" data-address-index="${index}"><span class="nova-address-main">${item.primary}</span><span class="nova-address-sub">${item.secondary}</span></button>`;
      }).join('');
      ctx.list.hidden=false;
    }

    function applyAddressSelection(ctx,item){
      if(!ctx?.input || !item) return;
      ctx.input.value=item.label;
      state.values[ctx.key]=item.label;
      hideError(ctx.step);
      hideManualHint(ctx);
      closeAddressDropdown(ctx);
      refreshSummary();
      completeStep(ctx.step);
    }

    async function updateAddressSuggestions(ctx,query){
      if(!ctx?.input) return;
      const value=(query||'').trim();
      state.values[ctx.key]=value;
      if(value.length<2){
        hideManualHint(ctx);
        closeAddressDropdown(ctx);
        refreshSummary();
        return;
      }

      const requestId=ctx.requestId+1;
      ctx.requestId=requestId;
      const results=await searchAddress(value,ctx.type);
      if(requestId!==ctx.requestId) return;

      ctx.results=results;
      ctx.activeIndex=results.length?0:-1;
      renderAddressDropdown(ctx);
      if(results.length===0) showManualHint(ctx);
      else hideManualHint(ctx);
      refreshSummary();
    }

    function moveAddressSelection(ctx,direction){
      if(!ctx?.results.length) return;
      const max=ctx.results.length-1;
      if(ctx.activeIndex<0) ctx.activeIndex=0;
      else ctx.activeIndex=Math.max(0,Math.min(max,ctx.activeIndex+direction));
      renderAddressDropdown(ctx);
    }

    function setupAddressAutocomplete(ctx){
      if(!ctx?.input) return;

      ctx.input.setAttribute('autocomplete','off');
      ctx.input.addEventListener('input',e=>{
        hideError(ctx.step);
        updateAddressSuggestions(ctx,e.target.value);
      });

      ctx.input.addEventListener('keydown',e=>{
        if(e.key==='ArrowDown'){
          e.preventDefault();
          e.stopPropagation();
          moveAddressSelection(ctx,1);
          return;
        }
        if(e.key==='ArrowUp'){
          e.preventDefault();
          e.stopPropagation();
          moveAddressSelection(ctx,-1);
          return;
        }
        if(e.key==='Escape'){
          e.preventDefault();
          e.stopPropagation();
          closeAddressDropdown(ctx);
          return;
        }
        if(e.key==='Enter'){
          if(!ctx.results.length) return;
          e.preventDefault();
          e.stopPropagation();
          const item=ctx.results[Math.max(0,ctx.activeIndex)]||ctx.results[0];
          applyAddressSelection(ctx,item);
        }
      });
    }

    function setStep(step){
      state.activeStep=Math.max(1,Math.min(7,step));
      closeAllAddressDropdowns();
      steps.forEach(el=>{
        const n=Number(el.dataset.step);
        el.classList.toggle('is-open',n===state.activeStep);
        el.classList.toggle('is-closed',n!==state.activeStep);
        el.classList.toggle('is-complete',state.completed.has(n));
      });
      updateProgress();
      refreshSummary();
      renderTimeOptions();
      const active=$(`.nova-step[data-step="${state.activeStep}"]`);
      const focusEl=active?.querySelector('input:not([type="hidden"]), textarea, button.nova-confirm, button.nova-picker-trigger, button.nova-choice');
      focusEl?.focus();
    }

    function showError(step,message){
      const el=$(`.nova-error[data-error="${step}"]`,root);
      if(!el) return;
      if(message) el.textContent=message;
      el.hidden=false;
    }

    function hideError(step){
      const el=$(`.nova-error[data-error="${step}"]`,root);
      if(el) el.hidden=true;
    }

    function validateStep(step){
      if(step===1) return !!state.values.rideType;
      if(step===2) return !!state.values.pickup.trim();
      if(step===3) return !!state.values.destination.trim();
      if(step===4) return !!state.values.date;
      if(step===5) return !!state.values.time;
      if(step===6) return !!state.values.name.trim() && !!state.values.phone.trim();
      return true;
    }

    function completeStep(step){
      if(!validateStep(step)){
        if(step===6) showError(step,'Bitte Name und Telefonnummer ausfüllen.');
        else showError(step);
        return;
      }
      hideError(step);
      state.completed.add(step);
      showHint();
      if(step<7){
        setStep(step+1);
      }
    }

    function renderCalendar(){
      if(!calendarGrid || !monthLabel) return;
      const monthStart=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth(),1);
      const monthEnd=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth()+1,0);
      const startOffset=(monthStart.getDay()+6)%7;
      const today=new Date();
      today.setHours(0,0,0,0);
      const selected=state.values.date;
      monthLabel.textContent=monthStart.toLocaleDateString('de-DE',{month:'long',year:'numeric'});

      const cells=[];
      for(let i=0;i<startOffset;i++) cells.push('<span class="nova-calendar-day is-empty"></span>');
      for(let day=1;day<=monthEnd.getDate();day++){
        const date=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth(),day);
        date.setHours(0,0,0,0);
        const iso=toIso(date);
        const cls=['nova-calendar-day'];
        if(iso===toIso(today)) cls.push('is-today');
        if(iso===selected) cls.push('is-selected');
        if(date<today) cls.push('is-disabled');
        const disabled=date<today?' disabled':'';
        cells.push(`<button type="button" class="${cls.join(' ')}" data-date="${iso}"${disabled}>${day}</button>`);
      }
      calendarGrid.innerHTML=cells.join('');
    }

    function buildTimeSlots(){
      const slots=[];
      for(let h=6;h<=22;h++){
        for(let m=0;m<60;m+=10){
          if(h===22 && m>50) break;
          slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
        }
      }
      return slots;
    }

    const timeSlots=buildTimeSlots();

    function renderTimeOptions(){
      if(!timeList) return;
      timeList.innerHTML=timeSlots.map(slot=>{
        const active=state.values.time===slot?' is-selected':'';
        return `<button type="button" class="nova-time-option${active}" data-time-value="${slot}">${slot}</button>`;
      }).join('');
    }

    function openOverlay(kind){
      if(kind==='date' && dateOverlay){
        dateOverlayOpener=document.activeElement;
        dateOverlay.hidden=false;
        renderCalendar();
        requestAnimationFrame(()=>focusFirstInteractive(dateDialog||dateOverlay));
      }
    }

    function closeOverlay(kind){
      if(kind==='date' && dateOverlay){
        const wasOpen=!dateOverlay.hidden;
        dateOverlay.hidden=true;
        if(wasOpen && dateOverlayOpener && typeof dateOverlayOpener.focus==='function') dateOverlayOpener.focus();
      }
    }

    function applyDate(iso){
      state.values.date=iso;
      const trigger=$('#novaDateOpen');
      if(trigger) trigger.textContent=displayDate(iso);
      hideError(4);
      closeOverlay('date');
      completeStep(4);
    }

    function applyTime(value){
      state.values.time=value;
      hideError(5);
      renderTimeOptions();
      completeStep(5);
    }

    root.addEventListener('click',e=>{
      const addressSelect=e.target.closest('[data-address-select]');
      if(addressSelect){
        const key=addressSelect.dataset.addressSelect;
        const index=Number(addressSelect.dataset.addressIndex);
        const ctx=addressUi[key];
        const item=ctx?.results?.[index];
        applyAddressSelection(ctx,item);
        return;
      }

      const choice=e.target.closest('[data-ride]');
      if(choice){
        state.values.rideType=choice.dataset.ride||'';
        $$('.nova-choice',root).forEach(btn=>btn.classList.toggle('is-selected',btn===choice));
        hideError(1);
        completeStep(1);
        return;
      }

      const confirmBtn=e.target.closest('[data-confirm-step]');
      if(confirmBtn){
        const step=Number(confirmBtn.dataset.confirmStep);
        if(step===2) state.values.pickup=$('#novaPickup')?.value||'';
        if(step===3) state.values.destination=$('#novaDestination')?.value||'';
        if(step===6){
          state.values.name=$('#novaName')?.value||'';
          state.values.phone=$('#novaPhone')?.value||'';
          state.values.email=$('#novaEmail')?.value||'';
          state.values.insurance=$('#novaInsurance')?.value||'';
          state.values.notes=$('#novaNotes')?.value||'';
        }
        completeStep(step);
        return;
      }

      if(e.target.closest('#novaDateOpen')){ openOverlay('date'); return; }

      const monthNav=e.target.closest('[data-month-nav]');
      if(monthNav){
        const dir=monthNav.dataset.monthNav==='next'?1:-1;
        state.calendarMonth=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth()+dir,1);
        renderCalendar();
        return;
      }

      const dateBtn=e.target.closest('[data-date]');
      if(dateBtn){ applyDate(dateBtn.dataset.date||''); return; }

      const timeBtn=e.target.closest('[data-time-value]');
      if(timeBtn){
        applyTime(timeBtn.dataset.timeValue||'');
        return;
      }

      const closeBtn=e.target.closest('[data-close-overlay]');
      if(closeBtn){ closeOverlay(closeBtn.dataset.closeOverlay); return; }

      const editBtn=e.target.closest('#novaEdit');
      if(editBtn){
        success.hidden=true;
        setStep(1);
        return;
      }

      const submitBtn=e.target.closest('#novaSubmit');
      if(submitBtn){
        refreshSummary();
        saveBookingBridgeState({
          customer:state.values.name,
          rideType:state.values.rideType,
          pickup:state.values.pickup,
          destination:state.values.destination
        });
        success.hidden=false;
      }
    });

    root.addEventListener('input',e=>{
      const id=e.target.id;
      if(id==='novaPickup'){ state.values.pickup=e.target.value; hideError(2); }
      if(id==='novaDestination'){ state.values.destination=e.target.value; hideError(3); }
      if(id==='novaName'){ state.values.name=e.target.value; hideError(6); }
      if(id==='novaPhone'){ state.values.phone=e.target.value; hideError(6); }
      if(id==='novaEmail') state.values.email=e.target.value;
      if(id==='novaInsurance') state.values.insurance=e.target.value;
      if(id==='novaNotes') state.values.notes=e.target.value;
      refreshSummary();
    });

    root.addEventListener('keydown',e=>{
      if(e.defaultPrevented) return;
      if(e.key!=='Enter') return;
      const openStep=e.target.closest('.nova-step.is-open');
      if(!openStep) return;
      const step=Number(openStep.dataset.step);

      if(step===2 || step===3 || step===6){
        e.preventDefault();
        if(step===2) state.values.pickup=$('#novaPickup')?.value||'';
        if(step===3) state.values.destination=$('#novaDestination')?.value||'';
        if(step===6){
          state.values.name=$('#novaName')?.value||'';
          state.values.phone=$('#novaPhone')?.value||'';
          state.values.email=$('#novaEmail')?.value||'';
          state.values.insurance=$('#novaInsurance')?.value||'';
          state.values.notes=$('#novaNotes')?.value||'';
        }
        completeStep(step);
      }
    });

    document.addEventListener('click',e=>{
      if(!root.contains(e.target) && !dateOverlay?.contains(e.target)) closeOverlay('date');
      if(!root.contains(e.target)) closeAllAddressDropdowns();
    });

    dateOverlay?.addEventListener('keydown',e=>{
      if(dateOverlay.hidden) return;
      if(e.key==='Escape'){
        e.preventDefault();
        closeOverlay('date');
        return;
      }
      trapFocus(e,dateDialog||dateOverlay);
    });

    setupAddressAutocomplete(addressUi.pickup);
    setupAddressAutocomplete(addressUi.destination);

    updateProgress();
    refreshSummary();
    renderTimeOptions();
    setStep(1);
  }
  function initMedicalBookingScroll(){
    const cta=$('#medicalHeroBookBtn');
    const target=$('#medicalBookingSection');
    if(!cta||!target) return;
    cta.addEventListener('click',()=>{
      target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  function initPremiumNavigation(){
    const nav=getNavigationElements();

    if(nav.menuToggle){
      nav.menuToggle.setAttribute('aria-expanded','false');
      nav.menuToggle.addEventListener('click',()=>{
        const open=nav.siteNav?.classList.toggle('open');
        document.body.classList.toggle('nav-open',!!open);
        nav.menuToggle.setAttribute('aria-expanded',open?'true':'false');
      });
    }

    nav.backdrop?.addEventListener('click',()=>closeNavigationState(nav));

    nav.servicesTrigger?.addEventListener('click',e=>{
      e.preventDefault();
      const open=nav.servicesItem.classList.toggle('is-open');
      nav.servicesTrigger.setAttribute('aria-expanded',open?'true':'false');
    });

    document.addEventListener('click',e=>{
      if(nav.servicesItem && !nav.servicesItem.contains(e.target)){
        nav.servicesItem.classList.remove('is-open');
        nav.servicesTrigger?.setAttribute('aria-expanded','false');
      }
      if(nav.siteNav?.classList.contains('open') && !e.target.closest('.site-nav') && !e.target.closest('.menu-toggle')){
        closeNavigationState(nav);
      }
    });

    nav.bookBtn?.addEventListener('click',e=>{
      e.preventDefault();
      const activeScreen=$('.screen.active');
      const bookingTarget=activeScreen?.querySelector('#medicalBookingSection');
      if(bookingTarget){
        bookingTarget.scrollIntoView({behavior:'smooth',block:'start'});
      }else{
        const contactTarget=$('#kontakt');
        contactTarget?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      closeNavigationState(nav);
    });

    const onScroll=()=>{
      const scrolled=window.scrollY>14;
      nav.topbar?.classList.toggle('is-scrolled',scrolled);
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();

    return nav;
  }
  function initFaqCenter(){
    const root=$('#faq');
    if(!root) return;

    const searchInput=$('#faqSearchInput',root);
    const categoryButtons=$$('.faq-category',root);
    const items=$$('.faq-item',root);
    const emptyState=$('#faqEmptyState',root);
    let activeCategory='all';
    let openItem=null;

    const norm=v=>(v||'').toLowerCase().trim();
    const splitCats=item=>(item.dataset.category||'').split(',').map(v=>v.trim()).filter(Boolean);

    function closeItem(item){
      if(!item) return;
      item.classList.remove('is-open');
      const q=$('.faq-question',item);
      const a=$('.faq-answer',item);
      if(q) q.setAttribute('aria-expanded','false');
      if(a) a.style.maxHeight='0px';
      if(openItem===item) openItem=null;
    }

    function openFaqItem(item){
      if(!item) return;
      if(openItem && openItem!==item) closeItem(openItem);
      item.classList.add('is-open');
      const q=$('.faq-question',item);
      const a=$('.faq-answer',item);
      if(q) q.setAttribute('aria-expanded','true');
      if(a) a.style.maxHeight=a.scrollHeight+'px';
      openItem=item;
    }

    function isVisibleByFilter(item,query){
      const categories=splitCats(item);
      const inCategory=activeCategory==='all' || categories.includes(activeCategory);
      if(!inCategory) return false;
      if(!query) return true;
      const questionText=norm($('.faq-question span',item)?.textContent);
      const answerText=norm($('.faq-answer-inner',item)?.textContent);
      return (questionText+' '+answerText+' '+categories.join(' ')).includes(query);
    }

    function applyFilters(){
      const query=norm(searchInput?.value||'');
      let visibleCount=0;
      items.forEach(item=>{
        const visible=isVisibleByFilter(item,query);
        item.hidden=!visible;
        if(!visible) closeItem(item);
        if(visible) visibleCount++;
      });

      if(emptyState) emptyState.hidden=visibleCount!==0;

      if(openItem && openItem.hidden) openItem=null;
      if(openItem){
        const a=$('.faq-answer',openItem);
        if(a) a.style.maxHeight=a.scrollHeight+'px';
      }
    }

    categoryButtons.forEach(btn=>{
      btn.addEventListener('click',()=>{
        categoryButtons.forEach(b=>b.classList.toggle('active',b===btn));
        activeCategory=btn.dataset.category||'all';
        applyFilters();
      });
    });

    items.forEach(item=>{
      const trigger=$('.faq-question',item);
      trigger?.addEventListener('click',()=>{
        if(item.hidden) return;
        if(item.classList.contains('is-open')) closeItem(item);
        else openFaqItem(item);
      });
    });

    searchInput?.addEventListener('input',applyFilters);
    window.addEventListener('resize',()=>{
      if(!openItem) return;
      const a=$('.faq-answer',openItem);
      if(a) a.style.maxHeight=a.scrollHeight+'px';
    });

    applyFilters();
  }
  function initRewardsWheel(){
    const widgets=$$('[data-rewards-wheel]');
    if(!widgets.length) return;
    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    // Prepared architecture for future wheel variants (VIP/event/seasonal/etc.).
    const wheelVariants={
      standard:{
        id:'standard',
        segments:[
          {key:'points-10',icon:'⭐',label:'10 Punkte',desc:'Bonus',message:'Du hast 10 Punkte gewonnen.',win:true,effect:'points'},
          {key:'points-25',icon:'⭐',label:'25 Punkte',desc:'Bonus',message:'Du hast 25 Punkte gewonnen.',win:true,effect:'points'},
          {key:'points-50',icon:'⭐',label:'50 Punkte',desc:'Bonus',message:'Du hast 50 Punkte gewonnen.',win:true,effect:'points'},
          {key:'voucher',icon:'🎁',label:'5 €',desc:'Gutschein',message:'Du hast einen 5 EUR Gutschein gewonnen.',win:true,effect:'voucher'},
          {key:'free-ride',icon:'🚕',label:'Freifahrt',desc:'Los',message:'Du hast ein Freifahrt-Los gewonnen.',win:true,effect:'free-ride'},
          {key:'no-win',icon:'❌',label:'Niete',desc:'Kein Gewinn',message:'Heute leider kein Gewinn. Morgen wartet die nächste Chance.',win:false,effect:'no-win'},
          {key:'extra-spin',icon:'🔄',label:'Extra Dreh',desc:'Chance',message:'Du hast einen Extra-Dreh gewonnen.',win:true,effect:'extra-spin'},
          {key:'mystery',icon:'🎁',label:'Geheim',desc:'Preis',message:'Du hast einen Geheimpreis gewonnen.',win:true,effect:'mystery'}
        ]
      }
      // Future-ready slots:
      // vip, seasonal, golden-special, event
    };
    const activeWheel=wheelVariants.standard;
    const segments=activeWheel.segments;
    const segmentAngle=360/segments.length;
    // Top pointer at 12 o'clock. In our SVG wheel, segment geometry starts at -90 deg.
    const pointerAngle=270;
    const segmentStartAngle=-90;
    const spinStorageKey='taxiRewardsLastSpinDate';

    // Keep angle math in one place so future wheel variants can safely reuse it.
    function normalizeDegrees(angle){
      return ((angle%360)+360)%360;
    }

    // Determine which segment is directly under the fixed top pointer after rotation.
    // Steps:
    // 1) normalize final rotation to 0..359
    // 2) compute dynamic segment size from segment count
    // 3) map fixed pointer angle into wheel-local coordinates
    // 4) derive segment index by floor(localAngle / segmentSize)
    function getSegmentIndexAtPointer(rotationDeg,totalSegments,pointerDeg,startDeg){
      const safeSegments=Math.max(1,totalSegments|0);
      const normalizedRotation=normalizeDegrees(rotationDeg);
      const segmentSize=360/safeSegments;
      const localPointerAngle=normalizeDegrees(pointerDeg - normalizedRotation - startDeg);
      return Math.floor(localPointerAngle/segmentSize)%safeSegments;
    }

    function getTodayYmd(){
      const now=new Date();
      const year=now.getFullYear();
      const month=String(now.getMonth()+1).padStart(2,'0');
      const day=String(now.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }

    function getStoredSpinDate(){
      try{
        return localStorage.getItem(spinStorageKey) || '';
      }catch(_err){
        return '';
      }
    }

    function setStoredSpinDate(value){
      try{
        localStorage.setItem(spinStorageKey,value);
      }catch(_err){
        // Ignore storage errors in demo mode.
      }
    }

    // Optional audio hook layer (no assets yet).
    const audioHooks={
      enabled:false,
      assets:{spinLoop:null,tick:null,win:null,jackpot:null},
      play(name,{loop=false}={}){
        if(!this.enabled) return;
        const audio=this.assets[name];
        if(!audio) return;
        audio.loop=loop;
        audio.currentTime=0;
        audio.play().catch(()=>{});
      },
      stop(name){
        if(!this.enabled) return;
        const audio=this.assets[name];
        if(!audio) return;
        audio.pause();
        audio.currentTime=0;
      }
    };

    function initRewardsPresentation(){
      const root=$('#rewards.rewards-v2');
      if(!root) return;

      const progressText=$('.rv2-progress-head span',root);
      const nextGoal=$('.rv2-next-goal',root);
      const nextLevel=$('[data-rewards-level-next]',root)?.textContent?.trim() || 'Platin';
      if(progressText && nextGoal){
        const nums=progressText.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if(nums){
          const current=Number(nums[1]);
          const target=Number(nums[2]);
          const remaining=Math.max(0,target-current);
          nextGoal.innerHTML=`Nur noch <strong>${remaining} Punkte</strong> bis ${nextLevel}.`;
        }
      }
    }

    function polarToCartesian(cx,cy,r,deg){
      const rad=(deg*Math.PI)/180;
      return {x:cx + r*Math.cos(rad),y:cy + r*Math.sin(rad)};
    }

    function describeWedgePath(cx,cy,outerR,innerR,startDeg,endDeg){
      const p1=polarToCartesian(cx,cy,outerR,startDeg);
      const p2=polarToCartesian(cx,cy,outerR,endDeg);
      const p3=polarToCartesian(cx,cy,innerR,endDeg);

      const p4=polarToCartesian(cx,cy,innerR,startDeg);
      const largeArc=endDeg-startDeg<=180 ? 0 : 1;
      return [
        `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
        `L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)}`,
        'Z'
      ].join(' ');
    }

    function ensureSvgDefs(svg){
      const defs=svg.querySelector('defs');
      if(!defs || defs.dataset.ready==='true') return;
      defs.insertAdjacentHTML('beforeend',[
        `<linearGradient id="rv2SvgMetalOuter" x1="0%" y1="0%" x2="100%" y2="100%">`,
        '<stop offset="0%" stop-color="#fff1be"/>',
        '<stop offset="28%" stop-color="#e0b356"/>',
        '<stop offset="58%" stop-color="#9a6a24"/>',
        '<stop offset="100%" stop-color="#f5cd78"/>',
        '</linearGradient>',
        `<linearGradient id="rv2SvgMetalInner" x1="0%" y1="100%" x2="100%" y2="0%">`,
        '<stop offset="0%" stop-color="#7d531d"/>',
        '<stop offset="45%" stop-color="#f0c66c"/>',
        '<stop offset="100%" stop-color="#8c5b20"/>',
        '</linearGradient>',
        `<linearGradient id="rv2SvgSegmentDark" x1="0%" y1="0%" x2="100%" y2="100%">`,
        '<stop offset="0%" stop-color="#2b2118"/>',
        '<stop offset="100%" stop-color="#433120"/>',
        '</linearGradient>',
        `<linearGradient id="rv2SvgSegmentGold" x1="0%" y1="0%" x2="100%" y2="100%">`,
        '<stop offset="0%" stop-color="#5a4329"/>',
        '<stop offset="100%" stop-color="#795833"/>',
        '</linearGradient>',
        `<linearGradient id="rv2SvgSegmentHit" x1="0%" y1="0%" x2="100%" y2="100%">`,
        '<stop offset="0%" stop-color="#d9a94a"/>',
        '<stop offset="100%" stop-color="#f8dd95"/>',
        '</linearGradient>',
        `<radialGradient id="rv2SvgHubCore" cx="36%" cy="30%" r="72%">`,
        '<stop offset="0%" stop-color="#fff4cc"/>',
        '<stop offset="28%" stop-color="#f6cd76"/>',
        '<stop offset="65%" stop-color="#b57a26"/>',
        '<stop offset="100%" stop-color="#6d4517"/>',
        '</radialGradient>',
        `<filter id="rv2SvgSegDepth" x="-20%" y="-20%" width="140%" height="140%">`,
        '<feDropShadow dx="0" dy="1.2" stdDeviation="1.8" flood-color="#000" flood-opacity=".28"/>',
        '<feDropShadow dx="0" dy="-0.2" stdDeviation=".8" flood-color="#fff" flood-opacity=".05"/>',
        '</filter>'
      ].join(''));
      defs.dataset.ready='true';
    }

    function getSecondsUntilTomorrow(){
      const now=new Date();
      const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,0,0);
      return Math.max(0,Math.floor((nextMidnight.getTime()-now.getTime())/1000));
    }

    function formatHms(totalSeconds){
      const sec=Math.max(0,totalSeconds|0);
      const h=Math.floor(sec/3600);
      const m=Math.floor((sec%3600)/60);
      const s=sec%60;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    function updateSvgLabelsRotation(svgBuild,rotationDeg){
      if(!svgBuild?.labelGroups?.length) return;
      svgBuild.labelGroups.forEach((group,index)=>{
        const point=svgBuild.labelPoints[index];
        group.setAttribute('transform',`translate(${point.x.toFixed(3)} ${point.y.toFixed(3)}) rotate(${(-rotationDeg).toFixed(3)})`);
      });
    }

    function buildSvgWheel(widget,segmentData){
      const svg=$('.rv2-wheel-svg',widget);
      if(!svg) return null;
      if(svg.dataset.built==='true'){
        return {
          segmentPaths:$$('.rv2-svg-segment',svg),
          labelGroups:$$('.rv2-svg-label-group',svg),
          labelPoints:segmentData.map((_,index)=>{
            const midDeg=-90 + index*segmentAngle + segmentAngle/2;
            return polarToCartesian(280,280,180,midDeg);
          })
        };
      }

      ensureSvgDefs(svg);
      const ledsGroup=$('.rv2-svg-leds',svg);
      const segmentsGroup=$('.rv2-svg-segments',svg);
      const labelsGroup=$('.rv2-svg-labels',svg);
      if(!ledsGroup || !segmentsGroup || !labelsGroup) return null;

      const cx=280;
      const cy=280;
      const outerR=214;
      const innerR=116;
      const labelR=180;
      ledsGroup.innerHTML='';
      for(let i=0;i<80;i++){
        const angle=-90 + i*(360/80);
        const pos=polarToCartesian(cx,cy,226,angle);
        const led=document.createElementNS('http://www.w3.org/2000/svg','circle');
        led.setAttribute('cx',pos.x.toFixed(3));
        led.setAttribute('cy',pos.y.toFixed(3));
        led.setAttribute('r',i%2===0 ? '1.9' : '1.5');
        led.setAttribute('class','rv2-svg-led');
        ledsGroup.append(led);
      }

      segmentsGroup.innerHTML='';
      labelsGroup.innerHTML='';

      segmentData.forEach((segment,index)=>{
        const startDeg=-90 + index*segmentAngle;
        const endDeg=startDeg + segmentAngle;
        const midDeg=startDeg + segmentAngle/2;
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',describeWedgePath(cx,cy,outerR,innerR,startDeg,endDeg));
        path.setAttribute('class',`rv2-svg-segment ${index%2===0 ? 'is-even' : 'is-odd'}`);
        path.dataset.segmentIndex=String(index);
        segmentsGroup.append(path);

        const labelPoint=polarToCartesian(cx,cy,labelR,midDeg);
        const labelGroup=document.createElementNS('http://www.w3.org/2000/svg','g');
        labelGroup.setAttribute('class','rv2-svg-label-group');
        labelGroup.dataset.segmentIndex=String(index);
        labelGroup.setAttribute('transform',`translate(${labelPoint.x.toFixed(3)} ${labelPoint.y.toFixed(3)})`);

        const icon=document.createElementNS('http://www.w3.org/2000/svg','text');
        icon.setAttribute('class','rv2-svg-label-icon');
        icon.setAttribute('x','0');
        icon.setAttribute('y','-14');
        icon.textContent=segment.icon || '⭐';

        const title=document.createElementNS('http://www.w3.org/2000/svg','text');
        title.setAttribute('class','rv2-svg-label-title');
        title.setAttribute('x','0');
        title.setAttribute('y','3');
        title.textContent=segment.label || '';

        const desc=document.createElementNS('http://www.w3.org/2000/svg','text');
        desc.setAttribute('class','rv2-svg-label-desc');
        desc.setAttribute('x','0');
        desc.setAttribute('y','16');
        desc.textContent=segment.desc || '';

        labelGroup.append(icon,title,desc);
        labelsGroup.append(labelGroup);
      });

      svg.dataset.built='true';
      return {
        segmentPaths:$$('.rv2-svg-segment',svg),
        labelGroups:$$('.rv2-svg-label-group',svg),
        labelPoints:segmentData.map((_,index)=>{
          const midDeg=-90 + index*segmentAngle + segmentAngle/2;
          return polarToCartesian(cx,cy,labelR,midDeg);
        })
      };
    }

    // Three-phase profile: acceleration, cruise, deceleration.
    const spinEase=t=>{
      const accelTime=.2;
      const cruiseTime=.48;
      const accelDist=.22;
      const cruiseDist=.46;
      const decelDist=.32;

      if(t<=accelTime){
        const a=t/accelTime;
        return accelDist*a*a;
      }

      if(t<=accelTime+cruiseTime){
        const c=(t-accelTime)/cruiseTime;
        return accelDist + cruiseDist*c;
      }

      const d=(t-accelTime-cruiseTime)/(1-accelTime-cruiseTime);
      return accelDist + cruiseDist + decelDist*(1-Math.pow(1-d,3.4));
    };

    // Lightweight confetti burst without external dependencies.
    function triggerConfetti(host){
      if(!host) return;
      const colors=['#ffd96a','#d2a33a','#74e79f','#ffefb8','#ffffff'];
      host.innerHTML='';
      const burstCount=34;
      const width=Math.max(host.clientWidth,220);

      for(let i=0;i<burstCount;i++){
        const piece=document.createElement('span');
        piece.className='rv2-confetti-piece';
        const x=(Math.random()*width)-width/2;
        piece.style.setProperty('--x',`${Math.round(x)}px`);
        piece.style.setProperty('--drift',`${Math.round((Math.random()-.5)*120)}px`);
        piece.style.setProperty('--rot',`${Math.round(320+Math.random()*420)}deg`);
        piece.style.setProperty('--dur',`${Math.round(900+Math.random()*900)}ms`);
        piece.style.background=colors[Math.floor(Math.random()*colors.length)];
        host.append(piece);
      }

      setTimeout(()=>{
        host.innerHTML='';
      },1900);
    }

    initRewardsPresentation();

    widgets.forEach(widget=>{
      const disc=$('.rv2-wheel-rotator',widget) || $('.rewards-wheel-disc',widget);
      const spinBtn=$('.rv2-spin-btn',widget) || $('.rewards-spin-btn',widget);
      const result=$('.rv2-spin-result',widget) || $('.rewards-spin-result',widget);
      const note=$('.rv2-spin-note',widget) || $('.rewards-spin-note',widget);
      const countdownLabel=$('.rv2-spin-countdown-label',widget);
      const countdownValue=$('.rv2-spin-countdown',widget);
      const wheelShell=$('.rv2-wheel-shell',widget);
      const pointer=$('.rv2-wheel-pointer',widget);
      const winCard=$('.rv2-win-card',widget);
      const winMessage=$('[data-rewards-win-message]',widget);
      const confettiHost=$('.rv2-confetti',widget);
      const svgBuild=buildSvgWheel(widget,segments);
      if(!disc || !spinBtn || !result) return;

      let spun=false;
      let spinning=false;
      let rotation=0;
      let frameId=0;
      let lastPointerBucket=-1;
      let hoverBucket=-1;
      let countdownTimer=0;
      const defaultSpinBtnText='Rad drehen';
      const defaultNoteText=(note?.textContent || '').trim();

      function hasTodayCooldown(){
        if(engine){
          const snapshot=engine.Store.getState();
          const lastDate=String(snapshot.wheel?.lastSpinDate || '');
          const freeSpins=Math.max(0,Math.round(Number(snapshot.freeSpins) || 0));
          return lastDate===getTodayYmd() && freeSpins<=0;
        }
        return getStoredSpinDate()===getTodayYmd();
      }

      function stopCountdownTicker(){
        if(!countdownTimer) return;
        clearInterval(countdownTimer);
        countdownTimer=0;
      }

      function updateCountdownUi(){
        if(!countdownValue) return;
        countdownValue.textContent=formatHms(getSecondsUntilTomorrow());
      }

      function startCountdownTicker(){
        if(!countdownValue) return;
        stopCountdownTicker();
        updateCountdownUi();
        countdownTimer=window.setInterval(()=>{
          if(!hasTodayCooldown()){
            stopCountdownTicker();
            applyCooldownUi(false);
            return;
          }
          updateCountdownUi();
        },1000);
      }

      function applyCooldownUi(locked){
        spun=locked;
        if(locked){
          spinBtn.disabled=true;
          spinBtn.setAttribute('aria-busy','false');
          spinBtn.textContent='Heute bereits gedreht';
          if(note) note.textContent='Morgen wieder verfügbar';
          if(countdownLabel) countdownLabel.hidden=false;
          if(countdownValue) countdownValue.hidden=false;
          startCountdownTicker();
          return;
        }

        if(spinning) return;
        stopCountdownTicker();
        spinBtn.disabled=false;
        spinBtn.removeAttribute('aria-busy');
        spinBtn.textContent=defaultSpinBtnText;
        if(note && defaultNoteText) note.textContent=defaultNoteText;
        if(countdownLabel) countdownLabel.hidden=true;
        if(countdownValue) countdownValue.hidden=true;
      }

      function setWheelRotation(value){
        disc.style.transform=`rotate(${value}deg)`;
        updateSvgLabelsRotation(svgBuild,value);
      }

      function pulsePointer(){
        if(!pointer) return;
        pointer.classList.remove('is-tick');
        requestAnimationFrame(()=>pointer.classList.add('is-tick'));
      }

      // rAF animation keeps spin smooth and independent from CSS transition timing.
      function animateSpin(from,to,duration,onComplete){
        let startTime=0;

        const tick=(time)=>{
          if(!startTime) startTime=time;
          const elapsed=time-startTime;
          const progress=Math.min(elapsed/duration,1);
          const eased=spinEase(progress);
          const current=from+(to-from)*eased;
          setWheelRotation(current);

          const pointerBucket=getSegmentIndexAtPointer(current,segments.length,pointerAngle,segmentStartAngle);
          if(pointerBucket!==lastPointerBucket){
            lastPointerBucket=pointerBucket;
            pulsePointer();
            audioHooks.play('tick');
          }
          if(pointerBucket!==hoverBucket){
            if(hoverBucket>=0) svgBuild?.segmentPaths?.[hoverBucket]?.classList.remove('is-under-pointer');
            svgBuild?.segmentPaths?.[pointerBucket]?.classList.add('is-under-pointer');
            hoverBucket=pointerBucket;
          }

          if(progress<1){
            frameId=requestAnimationFrame(tick);
            return;
          }

          frameId=0;
          onComplete(current);
        };

        frameId=requestAnimationFrame(tick);
      }

      spinBtn.addEventListener('click',()=>{
        if(spinning) return;
        if(hasTodayCooldown()){
          applyCooldownUi(true);
          return;
        }
        if(spun) return;
        if(engine){
          const snapshot=engine.Store.getState();
          const freeSpins=Math.max(0,Math.round(Number(snapshot.freeSpins) || 0));
          if(freeSpins>0) engine.Store.addFreeSpin(-1);
        }

        spinning=true;
        spun=true;
        spinBtn.disabled=true;
        spinBtn.setAttribute('aria-busy','true');
        spinBtn.textContent='Dreht...';
        result.textContent='Das Rad dreht...';
        result.classList.remove('is-win','is-lose');
        svgBuild?.segmentPaths?.forEach(path=>path.classList.remove('is-hit','is-under-pointer'));
        svgBuild?.labelGroups?.forEach(group=>group.classList.remove('is-hit'));
        widget.classList.add('is-spinning');
        if(wheelShell) wheelShell.classList.add('is-spinning');
        audioHooks.play('spinLoop',{loop:true});
        lastPointerBucket=-1;
        hoverBucket=-1;

        if(winCard){
          winCard.hidden=true;
          winCard.classList.remove('is-visible');
          winCard.removeAttribute('data-effect');
        }

        // Target angle maps the chosen segment center to the fixed top pointer.
        const selectedIndex=Math.floor(Math.random()*segments.length);
        const centerAngle=selectedIndex*segmentAngle + segmentAngle/2;
        const extraTurns=5 + Math.floor(Math.random()*3);
        const jitter=(Math.random()-0.5)*(segmentAngle*0.26);
        const durationMs=4400 + Math.floor(Math.random()*700);
        const startRotation=rotation;
        const targetRotation=startRotation + extraTurns*360 + (pointerAngle-centerAngle) + jitter;

        if(frameId) cancelAnimationFrame(frameId);
        animateSpin(startRotation,targetRotation,durationMs,finalRotation=>{
          rotation=normalizeDegrees(finalRotation);
          spinning=false;
          widget.classList.remove('is-spinning');
          if(wheelShell) wheelShell.classList.remove('is-spinning');
          audioHooks.stop('spinLoop');
          if(hoverBucket>=0) svgBuild?.segmentPaths?.[hoverBucket]?.classList.remove('is-under-pointer');

          // Always read the final winner from the actual stopped wheel angle,
          // never from the initially targeted/random animation hint.
          const finalIndex=getSegmentIndexAtPointer(rotation,segments.length,pointerAngle,segmentStartAngle);
          const selectedSegment=segments[finalIndex];
          svgBuild?.segmentPaths?.[finalIndex]?.classList.add('is-hit');
          svgBuild?.labelGroups?.[finalIndex]?.classList.add('is-hit');
          document.dispatchEvent(new CustomEvent('rewards:wheelResult',{
            detail:{
              win:Boolean(selectedSegment.win),
              effect:selectedSegment.effect || (selectedSegment.win ? 'points' : 'no-win'),
              label:selectedSegment.label || '',
              message:selectedSegment.message || ''
            }
          }));
          handleRewardEvent('wheel:result',{
            win:Boolean(selectedSegment.win),
            effect:selectedSegment.effect || (selectedSegment.win ? 'points' : 'no-win'),
            label:selectedSegment.label || '',
            message:selectedSegment.message || ''
          });

          if(selectedSegment.win){
            result.textContent=`Gewinn: ${selectedSegment.label}`;
            result.classList.add('is-win');
            triggerConfetti(confettiHost);
            audioHooks.play('win');

            if(winCard && winMessage){
              winMessage.textContent=selectedSegment.message;
              winCard.setAttribute('data-effect',selectedSegment.effect||'points');
              winCard.hidden=false;
              requestAnimationFrame(()=>winCard.classList.add('is-visible'));
            }
            widget.classList.add('is-win-flash');
            setTimeout(()=>widget.classList.remove('is-win-flash'),360);

            if(selectedSegment.effect==='mystery') audioHooks.play('jackpot');
          }else{
            result.textContent='Dieses Mal leider kein Gewinn.';
            result.classList.add('is-lose');
            if(winCard && winMessage){
              winMessage.textContent=selectedSegment.message;
              winCard.setAttribute('data-effect','no-win');
              winCard.hidden=false;
              requestAnimationFrame(()=>winCard.classList.add('is-visible'));
            }
          }

          setStoredSpinDate(getTodayYmd());
          applyCooldownUi(true);
        });
      });

      setWheelRotation(rotation);
      applyCooldownUi(hasTodayCooldown());
      const onResize=()=>{
        setWheelRotation(rotation);
      };
      window.addEventListener('resize',onResize,{passive:true});
    });
  }
  function initRewardsVoucherBalance(){
    const root=$('#rewards.rewards-v2 [data-voucher-balance]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const fareInput=$('[data-credit-fare]',root);
    const availableInput=$('[data-credit-available]',root);
    const applyInput=$('[data-credit-apply]',root);
    const restField=$('[data-credit-rest]',root);
    const balanceField=$('[data-credit-balance-value]',root);

    if(!fareInput || !availableInput || !applyInput || !restField) return;

    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    // Demo-only calculation layer. This structure is ready for future backend values.
    function toEuroNumber(value){
      const parsed=Number(String(value).replace(',','.'));
      return Number.isFinite(parsed) ? Math.max(0,parsed) : 0;
    }

    function formatEuro(value){
      return `${value.toFixed(2).replace('.',',')} EUR`;
    }

    function renderVoucherHistory(snapshot){
      const list=$('.rv2-credit-history ul',root);
      if(!list) return;
      const rows=Array.isArray(snapshot?.voucherHistory) ? snapshot.voucherHistory.slice(0,6) : [];
      if(!rows.length) return;
      list.innerHTML='';
      rows.forEach(row=>{
        const li=document.createElement('li');
        const span=document.createElement('span');
        const b=document.createElement('b');
        const amount=Number(row?.amount || 0);
        span.textContent=String(row?.title || 'Voucher-Eintrag');
        b.textContent=`${amount>=0?'+':'-'}${Math.abs(amount).toFixed(2).replace('.',',')} EUR`;
        li.append(span,b);
        list.append(li);
      });
    }

    function recalc(){
      const fare=toEuroNumber(fareInput.value);
      const available=toEuroNumber(availableInput.value);
      const requested=toEuroNumber(applyInput.value);
      const maxApplicable=Math.min(fare,available);
      const applied=Math.min(requested,maxApplicable);
      const rest=Math.max(0,fare-applied);

      applyInput.value=String(applied.toFixed(2));
      restField.value=formatEuro(rest);
      if(balanceField) balanceField.textContent=formatEuro(available);
    }

    function syncFromStore(){
      if(!engine) return;
      const snapshot=engine.Store.getState();
      const balance=Math.max(0,Number(snapshot.voucherBalance) || 0);
      availableInput.value=String(balance.toFixed(2));
      renderVoucherHistory(snapshot);
      recalc();
    }

    ['input','change'].forEach(eventName=>{
      fareInput.addEventListener(eventName,recalc);
      availableInput.addEventListener(eventName,recalc);
      applyInput.addEventListener(eventName,recalc);
    });

    if(engine) engine.Events.on('reward.voucher',syncFromStore);
    if(engine) engine.Events.on('reward.store',syncFromStore);
    syncFromStore();
    recalc();
  }
  function initRewardsRideBookingDemo(){
    const root=$('#rewards.rewards-v2 [data-rewards-booking-demo]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;
    const form=$('[data-ride-demo-form]',root);
    const customerInput=$('[data-ride-customer]',root);
    const rideTypeSelect=$('[data-ride-type]',root);
    const fareInput=$('[data-ride-fare]',root);
    const voucherInput=$('[data-ride-voucher-apply]',root);
    const pointsInput=$('[data-ride-points]',root);
    const availableNode=$('[data-ride-voucher-available]',root);
    const maxNode=$('[data-ride-voucher-max]',root);
    const restNode=$('[data-ride-rest]',root);
    const historyList=$('[data-ride-history]',root);
    const statusNode=$('[data-ride-status]',root);
    if(!form || !customerInput || !rideTypeSelect || !fareInput || !voucherInput || !pointsInput || !historyList || !restNode) return;

    const recommendedPoints={taxi:10,medical:20,wheelchair:15,airport:18};

    function toEuro(value){
      const n=Number(String(value || '').replace(',','.'));
      return Number.isFinite(n) ? Math.max(0,n) : 0;
    }

    function euro(value){
      return `${Number(value || 0).toFixed(2).replace('.',',')} EUR`;
    }

    function readBridge(){
      try{
        const parsed=JSON.parse(localStorage.getItem('taxiBookingRewardsBridgeState') || '');
        return parsed && typeof parsed==='object' ? parsed : null;
      }catch(_err){
        return null;
      }
    }

    function getBalance(){
      if(engine) return Math.max(0,Number(engine.Store.getState().voucherBalance) || 0);
      return 0;
    }

    function recalc(){
      const fare=toEuro(fareInput.value);
      const balance=getBalance();
      const asked=toEuro(voucherInput.value);
      const capped=Math.min(asked,fare,balance);
      voucherInput.value=String(capped.toFixed(2));
      const rest=Math.max(0,fare-capped);
      restNode.textContent=euro(rest);
      if(availableNode) availableNode.textContent=euro(balance);
      if(maxNode) maxNode.textContent=euro(Math.min(fare,balance));
      return {fare,voucherApplied:capped,rest,balance};
    }

    function getRideLabel(type){
      if(type==='medical') return 'Krankenfahrt';
      if(type==='airport') return 'Flughafentransfer';
      if(type==='wheelchair') return 'Rollstuhlfahrt';
      return 'Taxifahrt';
    }

    function renderHistoryFromStore(){
      if(!engine) return;
      const snapshot=engine.Store.getState();
      const rows=Array.isArray(snapshot.rides?.history) ? snapshot.rides.history.slice(0,8) : [];
      if(!rows.length) return;
      historyList.innerHTML='';
      rows.forEach(entry=>{
        const li=document.createElement('li');
        const date=new Date(Number(entry.timestamp) || Date.now());
        const left=document.createElement('span');
        left.textContent=`${date.toLocaleDateString('de-DE')} - ${getRideLabel(String(entry.rideType || 'taxi'))}`;
        const right=document.createElement('b');
        right.textContent=`${euro(entry.fare)} | Gutschein ${euro(entry.voucherUsed)} | +${Math.max(0,Math.round(Number(entry.points)||0))} Punkte`;
        li.append(left,right);
        historyList.append(li);
      });
    }

    function applyBridgeDefaults(){
      const bridge=readBridge();
      if(bridge?.customer && !customerInput.value.trim()) customerInput.value=String(bridge.customer).trim();
      if(bridge?.rideType && rideTypeSelect.querySelector(`option[value="${String(bridge.rideType).trim().toLowerCase()}"]`)){
        rideTypeSelect.value=String(bridge.rideType).trim().toLowerCase();
      }
      if(!pointsInput.value.trim()) pointsInput.value=String(recommendedPoints[String(rideTypeSelect.value || 'taxi').toLowerCase()] || 10);
    }

    function submitRide(event){
      event.preventDefault();
      if(!engine) return;
      const calc=recalc();
      const customer=customerInput.value.trim() || 'Kunde';
      const rideType=String(rideTypeSelect.value || 'taxi').trim().toLowerCase();
      const points=Math.max(0,Math.round(Number(pointsInput.value) || (recommendedPoints[rideType] || 10)));

      handleRewardEvent('booking:completed',{
        customer,
        rideType,
        fare:calc.fare,
        voucherApplied:calc.voucherApplied,
        points
      });

      const rest=Math.max(0,calc.fare-calc.voucherApplied);
      if(statusNode){
        statusNode.textContent=`Fahrt gespeichert: ${euro(calc.fare)}, +${points} Punkte, Gutschein ${euro(calc.voucherApplied)}, Rest ${euro(rest)}.`;
      }

      const bridge=readBridge() || {};
      saveBookingBridgeState({
        customer,
        rideType,
        pickup:bridge.pickup,
        destination:bridge.destination
      });

      renderHistoryFromStore();
      recalc();
    }

    ['input','change'].forEach(eventName=>{
      fareInput.addEventListener(eventName,recalc);
      voucherInput.addEventListener(eventName,recalc);
    });

    rideTypeSelect.addEventListener('change',()=>{
      pointsInput.value=String(recommendedPoints[String(rideTypeSelect.value || 'taxi').toLowerCase()] || 10);
    });
    form.addEventListener('submit',submitRide);

    applyBridgeDefaults();
    if(engine){
      engine.Events.on('reward.store',()=>{
        recalc();
        renderHistoryFromStore();
      });
    }
    renderHistoryFromStore();
    recalc();
  }
  function initRewardsAdminSettlement(){
    const root=$('#rewards.rewards-v2 [data-rewards-admin-settlement]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;
    const storageKey='taxiRewardsAdminSettlementState';

    const form=$('[data-admin-settlement-form]',root);
    const customerSelect=$('[data-admin-customer]',root);
    const rideTypeSelect=$('[data-admin-ride-type]',root);
    const customerIdInput=$('[data-admin-customer-id]',root);
    const balanceOutput=$('[data-admin-balance]',root);
    const fareInput=$('[data-admin-fare]',root);
    const applyInput=$('[data-admin-apply]',root);
    const restOutput=$('[data-admin-rest]',root);
    const pointsInput=$('[data-admin-points]',root);
    const statusNode=$('[data-admin-status]',root);
    const historyList=$('[data-admin-history]',root);
    if(!form || !customerSelect || !rideTypeSelect || !customerIdInput || !balanceOutput || !fareInput || !applyInput || !restOutput || !pointsInput || !historyList) return;

    const summaryNodes={
      fare:$('[data-admin-summary-fare]',root),
      voucher:$('[data-admin-summary-voucher]',root),
      rest:$('[data-admin-summary-rest]',root),
      points:$('[data-admin-summary-points]',root),
      balance:$('[data-admin-summary-balance]',root)
    };

    const pointsByRide={taxi:10,medical:20,wheelchair:15,airport:18};
    const rideLabelByKey={taxi:'Taxifahrt',medical:'Krankenfahrt',wheelchair:'Rollstuhlfahrt',airport:'Flughafentransfer'};

    function toMoney(value){
      const n=Number(String(value || '').replace(',','.'));
      return Number.isFinite(n) ? Math.max(0,n) : 0;
    }

    function euro(value){
      return `${Number(value || 0).toFixed(2).replace('.',',')} EUR`;
    }

    function defaultState(){
      return {
        customers:{
          'cust-max':{name:'Max Mustermann',customerId:'CUST-0001',voucherBalance:25,pointsTotal:0},
          'cust-enes':{name:'Enes Y.',customerId:'CUST-0002',voucherBalance:18,pointsTotal:0},
          'cust-selin':{name:'Selin K.',customerId:'CUST-0003',voucherBalance:12,pointsTotal:0},
          'cust-ali':{name:'Ali B.',customerId:'CUST-0004',voucherBalance:7.5,pointsTotal:0}
        },
        settlements:[]
      };
    }

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultState();
        const fallback=defaultState();
        return {
          customers:{...fallback.customers,...(parsed.customers && typeof parsed.customers==='object' ? parsed.customers : {})},
          settlements:Array.isArray(parsed.settlements) ? parsed.settlements : []
        };
      }catch(_err){
        return defaultState();
      }
    }

    function writeState(state){
      try{ localStorage.setItem(storageKey,JSON.stringify(state)); }catch(_err){}
    }

    function getSelectedCustomer(state){
      const key=String(customerSelect.value || '').trim();
      const customer=state.customers[key] && typeof state.customers[key]==='object' ? state.customers[key] : null;
      return {key,customer};
    }

    function recalc(state){
      const selected=getSelectedCustomer(state);
      const balance=Math.max(0,Number(selected.customer?.voucherBalance) || 0);
      const fare=toMoney(fareInput.value);
      const requested=toMoney(applyInput.value);
      const applied=Math.min(fare,balance,requested);
      const rest=Math.max(0,fare-applied);

      applyInput.value=String(applied.toFixed(2));
      balanceOutput.textContent=euro(balance);
      restOutput.textContent=euro(rest);
      return {selected,fare,applied,rest,balance};
    }

    function renderSummary({fare,applied,rest,points,newBalance}){
      if(summaryNodes.fare) summaryNodes.fare.textContent=euro(fare);
      if(summaryNodes.voucher) summaryNodes.voucher.textContent=euro(applied);
      if(summaryNodes.rest) summaryNodes.rest.textContent=euro(rest);
      if(summaryNodes.points) summaryNodes.points.textContent=`+${Math.max(0,Math.round(Number(points) || 0))}`;
      if(summaryNodes.balance) summaryNodes.balance.textContent=euro(newBalance);
    }

    function renderHistory(state){
      const rows=Array.isArray(state.settlements) ? state.settlements.slice(0,12) : [];
      if(!rows.length) return;
      historyList.innerHTML='';
      rows.forEach(entry=>{
        const li=document.createElement('li');
        const left=document.createElement('span');
        const right=document.createElement('b');
        const d=new Date(Number(entry.timestamp) || Date.now());
        left.textContent=`${d.toLocaleDateString('de-DE')} | ${String(entry.customerName || 'Kunde')} | ${rideLabelByKey[String(entry.rideType || 'taxi')] || 'Taxifahrt'}`;
        right.textContent=`${euro(entry.fare)} | Gutschein ${euro(entry.voucherUsed)} | Rest ${euro(entry.restPaid)} | +${Math.max(0,Math.round(Number(entry.points)||0))}`;
        li.append(left,right);
        historyList.append(li);
      });
    }

    function syncCustomerFields(state){
      const selected=getSelectedCustomer(state);
      if(selected.customer){
        customerIdInput.value=String(selected.customer.customerId || 'CUST-DEMO');
      }
    }

    function submitSettlement(event){
      event.preventDefault();
      const state=readState();
      const calc=recalc(state);
      const selected=calc.selected;
      if(!selected.customer) return;

      const rideType=String(rideTypeSelect.value || 'taxi').trim().toLowerCase();
      const points=Math.max(0,Math.round(Number(pointsInput.value) || pointsByRide[rideType] || 10));
      const customerId=String(customerIdInput.value || selected.customer.customerId || 'CUST-DEMO').trim() || 'CUST-DEMO';
      const newBalance=Number((Math.max(0,calc.balance-calc.applied)).toFixed(2));
      const now=Date.now();

      selected.customer.voucherBalance=newBalance;
      selected.customer.customerId=customerId;
      selected.customer.pointsTotal=Math.max(0,Math.round(Number(selected.customer.pointsTotal) || 0) + points);

      const settlement={
        timestamp:now,
        dateIso:new Date(now).toISOString(),
        customerKey:selected.key,
        customerId,
        customerName:String(selected.customer.name || 'Kunde'),
        rideType,
        fare:Number(calc.fare.toFixed(2)),
        voucherUsed:Number(calc.applied.toFixed(2)),
        restPaid:Number(calc.rest.toFixed(2)),
        points,
        voucherBalanceAfter:newBalance,
        driverReport:{driverId:'DRV-DEMO',shiftId:'SHIFT-DEMO',reportRef:`REP-${now}`},
        db:{status:'pending-demo',syncRef:`SYNC-${now}`,source:'localStorage'}
      };

      state.settlements=Array.isArray(state.settlements) ? state.settlements : [];
      state.settlements.unshift(settlement);
      state.settlements=state.settlements.slice(0,60);
      writeState(state);

      if(engine){
        handleRewardEvent('booking:completed',{
          customer:settlement.customerName,
          rideType:settlement.rideType,
          fare:settlement.fare,
          voucherApplied:settlement.voucherUsed,
          points:settlement.points
        });
      }

      renderSummary({fare:settlement.fare,applied:settlement.voucherUsed,rest:settlement.restPaid,points:settlement.points,newBalance:settlement.voucherBalanceAfter});
      renderHistory(state);
      recalc(state);

      if(statusNode){
        statusNode.textContent=`Abrechnung gespeichert: ${settlement.customerName}, Fahrpreis ${euro(settlement.fare)}, Gutschein ${euro(settlement.voucherUsed)}, Rest ${euro(settlement.restPaid)}, +${settlement.points} Punkte.`;
      }
    }

    ['input','change'].forEach(eventName=>{
      fareInput.addEventListener(eventName,()=>recalc(readState()));
      applyInput.addEventListener(eventName,()=>recalc(readState()));
    });

    customerSelect.addEventListener('change',()=>{
      const state=readState();
      syncCustomerFields(state);
      recalc(state);
    });

    rideTypeSelect.addEventListener('change',()=>{
      const key=String(rideTypeSelect.value || 'taxi').trim().toLowerCase();
      pointsInput.value=String(pointsByRide[key] || 10);
    });

    form.addEventListener('submit',submitSettlement);

    const start=readState();
    syncCustomerFields(start);
    renderHistory(start);
    const calc=recalc(start);
    renderSummary({fare:calc.fare,applied:calc.applied,rest:calc.rest,points:Math.max(0,Math.round(Number(pointsInput.value) || 0)),newBalance:calc.balance});
  }
  function initRewardsCustomerDashboard(){
    const root=$('#rewards.rewards-v2 [data-rewards-customer-dashboard]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    const storageKey='taxiRewardsCustomerDashboardState';
    const defaultData={
      profile:{
        name:'Max Mustermann',
        memberSince:'01.01.2026',
        level:'Gold',
        status:'Premium Mitglied',
        points:230
      },
      nextLevel:{
        currentPoints:230,
        targetPoints:350,
        levelName:'Platin'
      },
      stats:{
        rides:184,
        points:230,
        spins:12,
        vouchers:6,
        badges:4,
        streak:2
      },
      benefits:[
        'Gold-Rabatte aktiv',
        'Exklusive Gutscheine',
        'Schnellere Level-Belohnungen',
        'Event-Zugang'
      ],
      activities:[
        {day:'Heute',text:'+5 Punkte · Glücksrad'},
        {day:'Gestern',text:'+10 Punkte · Fahrt'},
        {day:'Vor 3 Tagen',text:'Badge erhalten'}
      ]
    };

    function readData(){
      if(engine){
        const snapshot=engine.Store.getState();
        const points=Math.max(0,Math.round(Number(snapshot.points) || 0));
        const level=String(snapshot.level?.label || 'Gold');
        const levelInfo=engine.Utils.levelByPoints(points);
        const next=engine.Utils.nextLevel(levelInfo.key);
        const rideCount=Math.max(0,Number(snapshot.rides?.totalCount) || 0);
        const ridePoints=Math.max(0,Number(snapshot.rides?.totalPointsEarned) || 0);
        const voucherBalance=Math.max(0,Number(snapshot.voucherBalance) || 0);
        const activities=(Array.isArray(snapshot.activities) ? snapshot.activities : []).slice(0,3).map(entry=>({
          day:'Heute',
          text:String(entry.title || 'Aktivitaet')
        }));
        return {
          profile:{...defaultData.profile,level,status:'Premium Mitglied',points},
          nextLevel:{currentPoints:points,targetPoints:levelInfo.nextTarget,levelName:next.label},
          stats:{
            ...defaultData.stats,
            rides:Math.max(defaultData.stats.rides,rideCount),
            points:Math.max(points,ridePoints),
            spins:Math.max(0,(defaultData.stats.spins||0)+Math.max(0,Number(snapshot.freeSpins)||0)),
            vouchers:Math.round(voucherBalance),
            streak:Math.max(0,Number(snapshot.login?.streakCount)||0)
          },
          benefits:defaultData.benefits,
          activities:activities.length ? activities : defaultData.activities
        };
      }
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultData;
        return {
          profile:{...defaultData.profile,...(parsed.profile||{})},
          nextLevel:{...defaultData.nextLevel,...(parsed.nextLevel||{})},
          stats:{...defaultData.stats,...(parsed.stats||{})},
          benefits:Array.isArray(parsed.benefits) && parsed.benefits.length ? parsed.benefits : defaultData.benefits,
          activities:Array.isArray(parsed.activities) && parsed.activities.length ? parsed.activities : defaultData.activities
        };
      }catch(_err){
        return defaultData;
      }
    }

    function writeSeedIfMissing(data){
      try{
        if(!localStorage.getItem(storageKey)) localStorage.setItem(storageKey,JSON.stringify(data));
      }catch(_err){
        // localStorage optional in demo mode.
      }
    }

    function text(selector,value){
      const node=$(selector,root);
      if(node) node.textContent=String(value);
    }

    const data=readData();
    writeSeedIfMissing(data);

    text('[data-cd-name]',data.profile.name);
    text('[data-cd-member-since]',data.profile.memberSince);
    text('[data-cd-level]',data.profile.level);
    text('[data-cd-status]',data.profile.status);
    text('[data-cd-points]',data.profile.points);
    text('[data-cd-current-points]',data.nextLevel.currentPoints);
    text('[data-cd-target-points]',data.nextLevel.targetPoints);

    const current=Math.max(0,Number(data.nextLevel.currentPoints||0));
    const target=Math.max(1,Number(data.nextLevel.targetPoints||1));
    const remaining=Math.max(0,target-current);
    const progress=Math.max(0,Math.min(100,(current/target)*100));

    const progressWrap=$('.rv2-customer-next-bar',root);
    const progressBar=$('[data-cd-progress-bar]',root);
    if(progressWrap){
      progressWrap.setAttribute('aria-valuemin','0');
      progressWrap.setAttribute('aria-valuemax',String(target));
      progressWrap.setAttribute('aria-valuenow',String(Math.min(current,target)));
    }
    if(progressBar) progressBar.style.width=`${progress.toFixed(2)}%`;
    if(progressWrap) progressWrap.style.setProperty('--customer-progress',`${progress.toFixed(2)}%`);
    text('[data-cd-remaining-text]',`Noch ${remaining} Punkte bis ${data.nextLevel.levelName}`);

    const statNodes=$$('[data-cd-stat]',root);
    statNodes.forEach(node=>{
      const key=node.dataset.cdStat;
      if(!key) return;
      const val=(key in data.stats) ? data.stats[key] : 0;
      node.textContent=String(val);
    });

    const benefitsList=$('[data-cd-benefits]',root);
    if(benefitsList){
      benefitsList.innerHTML='';
      data.benefits.forEach(item=>{
        const li=document.createElement('li');
        li.textContent=`✓ ${String(item)}`;
        benefitsList.append(li);
      });
    }

    const activityList=$('[data-cd-activities]',root);
    if(activityList){
      activityList.innerHTML='';
      data.activities.forEach(item=>{
        const li=document.createElement('li');
        const day=document.createElement('b');
        const textNode=document.createElement('span');
        day.textContent=String(item.day || 'Heute');
        textNode.textContent=String(item.text || 'Aktivität');
        li.append(day,textNode);
        activityList.append(li);
      });
    }

    if(engine) engine.Events.on('reward.store',()=>{
      const fresh=readData();
      text('[data-cd-level]',fresh.profile.level);
      text('[data-cd-points]',fresh.profile.points);
      text('[data-cd-current-points]',fresh.nextLevel.currentPoints);
      text('[data-cd-target-points]',fresh.nextLevel.targetPoints);
      const current=Math.max(0,Number(fresh.nextLevel.currentPoints||0));
      const target=Math.max(1,Number(fresh.nextLevel.targetPoints||1));
      const progress=Math.max(0,Math.min(100,(current/target)*100));
      const progressWrap=$('.rv2-customer-next-bar',root);
      const progressBar=$('[data-cd-progress-bar]',root);
      if(progressBar) progressBar.style.width=`${progress.toFixed(2)}%`;
      if(progressWrap) progressWrap.style.setProperty('--customer-progress',`${progress.toFixed(2)}%`);
      text('[data-cd-remaining-text]',`Noch ${Math.max(0,target-current)} Punkte bis ${fresh.nextLevel.levelName}`);

      const statNodes=$$('[data-cd-stat]',root);
      statNodes.forEach(node=>{
        const key=node.dataset.cdStat;
        if(!key) return;
        node.textContent=String((key in fresh.stats) ? fresh.stats[key] : 0);
      });

      const activityList=$('[data-cd-activities]',root);
      if(activityList){
        activityList.innerHTML='';
        fresh.activities.forEach(item=>{
          const li=document.createElement('li');
          const day=document.createElement('b');
          const textNode=document.createElement('span');
          day.textContent=String(item.day || 'Heute');
          textNode.textContent=String(item.text || 'Aktivitaet');
          li.append(day,textNode);
          activityList.append(li);
        });
      }
    });
  }
  function initRewardsVipStatus(){
    const root=$('#rewards.rewards-v2 [data-rewards-vip-status]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    const storageKey='taxiRewardsVipStatusState';
    const levelOrder=['bronze','silber','gold','platin','legend'];
    const levelLabel={
      bronze:'Bronze',
      silber:'Silber',
      gold:'Gold',
      platin:'Platin',
      legend:'Legend'
    };
    const defaultData={
      currentLevel:'gold',
      currentPoints:230,
      nextLevel:'platin',
      nextLevelTargetPoints:350
    };

    function readData(){
      if(engine){
        const snapshot=engine.Store.getState();
        const points=Math.max(0,Math.round(Number(snapshot.points) || 0));
        const lvl=engine.Utils.levelByPoints(points);
        const next=engine.Utils.nextLevel(lvl.key);
        return {
          currentLevel:lvl.key,
          currentPoints:points,
          nextLevel:next.key,
          nextLevelTargetPoints:lvl.nextTarget
        };
      }
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultData;
        return {
          currentLevel:typeof parsed.currentLevel==='string' ? parsed.currentLevel.toLowerCase() : defaultData.currentLevel,
          currentPoints:Number.isFinite(Number(parsed.currentPoints)) ? Number(parsed.currentPoints) : defaultData.currentPoints,
          nextLevel:typeof parsed.nextLevel==='string' ? parsed.nextLevel.toLowerCase() : defaultData.nextLevel,
          nextLevelTargetPoints:Number.isFinite(Number(parsed.nextLevelTargetPoints)) ? Number(parsed.nextLevelTargetPoints) : defaultData.nextLevelTargetPoints
        };
      }catch(_err){
        return defaultData;
      }
    }

    function writeSeedIfMissing(data){
      try{
        if(!localStorage.getItem(storageKey)) localStorage.setItem(storageKey,JSON.stringify(data));
      }catch(_err){
        // localStorage optional in demo mode.
      }
    }

    function text(selector,value){
      const node=$(selector,root);
      if(node) node.textContent=String(value);
    }

    const rawData=readData();
    writeSeedIfMissing(rawData);

    const currentLevel=levelOrder.includes(rawData.currentLevel) ? rawData.currentLevel : defaultData.currentLevel;
    const currentIndex=Math.max(0,levelOrder.indexOf(currentLevel));
    const fallbackNext=levelOrder[Math.min(levelOrder.length-1,currentIndex+1)];
    const nextLevel=levelOrder.includes(rawData.nextLevel) ? rawData.nextLevel : fallbackNext;
    const currentPoints=Math.max(0,Math.round(Number(rawData.currentPoints) || 0));
    const nextTarget=Math.max(currentPoints,Math.round(Number(rawData.nextLevelTargetPoints) || 0));
    const remaining=Math.max(0,nextTarget-currentPoints);
    const progress=nextTarget>0 ? Math.max(0,Math.min(100,(currentPoints/nextTarget)*100)) : 0;

    text('[data-vip-current]',levelLabel[currentLevel] || 'Gold');
    text('[data-vip-next]',levelLabel[nextLevel] || 'Platin');
    text('[data-vip-remaining]',`Noch ${remaining} Punkte bis ${levelLabel[nextLevel] || 'Platin'}`);

    const progressBar=$('.rv2-vip-progress-bar',root);
    const progressFill=$('[data-vip-progress-fill]',root);
    if(progressBar){
      progressBar.setAttribute('aria-valuemin','0');
      progressBar.setAttribute('aria-valuemax',String(nextTarget));
      progressBar.setAttribute('aria-valuenow',String(Math.min(currentPoints,nextTarget)));
      progressBar.style.setProperty('--vip-progress',`${progress.toFixed(2)}%`);
      progressBar.setAttribute('aria-label',`VIP Fortschritt bis ${levelLabel[nextLevel] || 'Platin'}`);
    }
    if(progressFill) progressFill.style.width=`${progress.toFixed(2)}%`;

    const levelNodes=$$('[data-vip-level]',root);
    levelNodes.forEach(node=>{
      const level=node.dataset.vipLevel;
      const index=levelOrder.indexOf(level || '');
      if(index<0){
        node.removeAttribute('data-vip-state');
        return;
      }
      if(index<currentIndex) node.dataset.vipState='passed';
      else if(index===currentIndex) node.dataset.vipState='current';
      else node.dataset.vipState='upcoming';
    });

    const nextIndex=levelOrder.indexOf(nextLevel);
    const benefitCards=$$('[data-vip-tier]',root);
    benefitCards.forEach(card=>{
      const tier=card.dataset.vipTier;
      const index=levelOrder.indexOf(tier || '');
      if(index<0){
        card.removeAttribute('data-vip-state');
        return;
      }
      if(index===currentIndex) card.dataset.vipState='current';
      else if(index===nextIndex && nextIndex!==currentIndex) card.dataset.vipState='next';
      else if(index<currentIndex) card.dataset.vipState='passed';
      else card.dataset.vipState='locked';
    });

    if(engine) engine.Events.on('reward.store',()=>{
      const fresh=readData();
      const currentLevel=levelOrder.includes(fresh.currentLevel) ? fresh.currentLevel : defaultData.currentLevel;
      const currentIndex=Math.max(0,levelOrder.indexOf(currentLevel));
      const fallbackNext=levelOrder[Math.min(levelOrder.length-1,currentIndex+1)];
      const nextLevel=levelOrder.includes(fresh.nextLevel) ? fresh.nextLevel : fallbackNext;
      const currentPoints=Math.max(0,Math.round(Number(fresh.currentPoints) || 0));
      const nextTarget=Math.max(currentPoints,Math.round(Number(fresh.nextLevelTargetPoints) || 0));
      const remaining=Math.max(0,nextTarget-currentPoints);
      const progress=nextTarget>0 ? Math.max(0,Math.min(100,(currentPoints/nextTarget)*100)) : 0;

      text('[data-vip-current]',levelLabel[currentLevel] || 'Gold');
      text('[data-vip-next]',levelLabel[nextLevel] || 'Platin');
      text('[data-vip-remaining]',`Noch ${remaining} Punkte bis ${levelLabel[nextLevel] || 'Platin'}`);

      const progressBar=$('.rv2-vip-progress-bar',root);
      const progressFill=$('[data-vip-progress-fill]',root);
      if(progressBar){
        progressBar.style.setProperty('--vip-progress',`${progress.toFixed(2)}%`);
        progressBar.setAttribute('aria-valuenow',String(Math.min(currentPoints,nextTarget)));
      }
      if(progressFill) progressFill.style.width=`${progress.toFixed(2)}%`;
    });
  }
  function initRewardsUnifiedDashboard(){
    const root=$('#rewards.rewards-v2');
    if(!root) return;

    const smartRoot=$('[data-rewards-smart-dashboard]',root);
    const quickRoot=$('[data-rewards-quick-actions]',root);
    const todayRoot=$('[data-rewards-today-overview]',root);
    const toastStack=$('[data-rewards-toast-stack]',root);
    if(!smartRoot || !quickRoot || !todayRoot || !toastStack) return;

    const storageKey='taxiRewardsDashboardSignalsState';
    const soundStorageKey='taxiRewardsSoundState';
    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;
    const vipOrder=['bronze','silber','gold','platin','legend'];
    const quickActionTargets={
      wheel:'[data-rewards-wheel]',
      missions:'[data-rewards-missions]',
      voucher:'[data-voucher-balance]',
      achievements:'[data-rewards-achievements]',
      mystery:'[data-rewards-mystery-box]'
    };

    function getTodayYmd(){
      const now=new Date();
      const year=now.getFullYear();
      const month=String(now.getMonth()+1).padStart(2,'0');
      const day=String(now.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }

    function toNumber(text){
      const match=String(text || '').replace(/\./g,'').replace(',', '.').match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : 0;
    }

    function readSignals(){
      const defaults={seenMissionDone:0,seenAchievements:0,lastMysteryToastDate:'',seenVipIndex:-1};
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaults;
        return {
          seenMissionDone:Number.isFinite(Number(parsed.seenMissionDone)) ? Number(parsed.seenMissionDone) : defaults.seenMissionDone,
          seenAchievements:Number.isFinite(Number(parsed.seenAchievements)) ? Number(parsed.seenAchievements) : defaults.seenAchievements,
          lastMysteryToastDate:String(parsed.lastMysteryToastDate || ''),
          seenVipIndex:Number.isFinite(Number(parsed.seenVipIndex)) ? Number(parsed.seenVipIndex) : defaults.seenVipIndex
        };
      }catch(_err){
        return defaults;
      }
    }

    function writeSignals(state){
      try{
        localStorage.setItem(storageKey,JSON.stringify(state));
      }catch(_err){
        // Demo mode: ignore localStorage errors.
      }
    }

    function createSoundBus(){
      let enabled=false;
      try{
        enabled=JSON.parse(localStorage.getItem(soundStorageKey) || 'false')===true;
      }catch(_err){
        enabled=false;
      }

      const sounds={
        tick:null,
        win:null,
        voucher:null,
        levelUp:null,
        lose:null
      };

      function setEnabled(next){
        enabled=Boolean(next);
        try{ localStorage.setItem(soundStorageKey,JSON.stringify(enabled)); }catch(_err){}
      }

      function play(name){
        const key=String(name || '').trim();
        if(!(key in sounds)) return;
        if(!enabled) return;
        const audio=sounds[key];
        if(!audio) return;
        audio.currentTime=0;
        audio.play().catch(()=>{});
      }

      return {
        sounds,
        get enabled(){ return enabled; },
        setEnabled,
        play
      };
    }

    const rewardsSound=createSoundBus();
    try{
      if(!window.taxiRewardsSound) window.taxiRewardsSound=rewardsSound;
    }catch(_err){
      // Ignore if window binding is restricted.
    }

    function showToast({title,text,icon='✨',sound=''}){
      const toast=document.createElement('article');
      toast.className='rv2-toast';
      const iconNode=document.createElement('i');
      iconNode.setAttribute('aria-hidden','true');
      iconNode.textContent=icon;
      const copy=document.createElement('div');
      const strong=document.createElement('strong');
      const p=document.createElement('p');
      strong.textContent=String(title || 'Info');
      p.textContent=String(text || 'Neue Rewards-Aktualisierung verfügbar.');
      copy.append(strong,p);
      toast.append(iconNode,copy);
      toastStack.append(toast);
      rewardsSound.play(sound);

      window.setTimeout(()=>{
        toast.classList.add('is-leaving');
        window.setTimeout(()=>toast.remove(),300);
      },3800);
    }

    function markScrollTarget(target){
      if(!target) return;
      target.classList.add('rv2-highlight-target');
      window.setTimeout(()=>target.classList.remove('rv2-highlight-target'),950);
    }

    function readSnapshot(){
      if(engine){
        const s=engine.Store.getState();
        const today=getTodayYmd();
        const missionDoneCount=Object.values(s.missions || {}).filter(entry=>String(entry?.status || '').toLowerCase()==='done').length;
        const achievementsUnlocked=(s.achievements && Array.isArray(s.achievements.unlocked)) ? s.achievements.unlocked.length : 0;
        const wheelAvailable=String(s.wheel?.lastSpinDate || '')!==today || Math.max(0,Number(s.freeSpins)||0)>0;
        const mysteryAvailable=String(s.mystery?.lastOpenedDate || '')!==today;
        const vipText=String(s.level?.label || 'Gold').trim().toLowerCase();
        return {
          today,
          points:Math.max(0,Math.round(Number(s.points) || 0)),
          level:String(s.level?.label || 'Gold').trim(),
          voucher:`${Number(Math.max(0,Number(s.voucherBalance)||0)).toFixed(2).replace('.',',')} €`,
          streakCount:Math.max(0,Number(s.login?.streakCount)||0),
          streakTodayDone:String(s.login?.lastCheckin || '')===today,
          wheelAvailable,
          mysteryAvailable,
          dailyFirstRideDone:Boolean(s.missions?.['daily-first-ride'] && String(s.missions['daily-first-ride'].status || '').toLowerCase()==='done'),
          missionDoneCount,
          achievementsUnlocked,
          vipIndex:vipOrder.indexOf(vipText)
        };
      }
      const today=getTodayYmd();

      const pointsNode=$('[data-cd-points]',root) || $('[data-rewards-points]',root);
      const levelNode=$('[data-vip-current]',root) || $('[data-cd-level]',root);
      const voucherNode=$('[data-credit-balance-value]',root);

      let streakCount=0;
      let streakTodayDone=false;
      try{
        const streak=JSON.parse(localStorage.getItem('taxiRewardsDailyStreakState') || '');
        if(streak && typeof streak==='object'){
          const claimed=Array.isArray(streak.claimed)
            ? streak.claimed.map(v=>Number(v)).filter(v=>Number.isInteger(v) && v>=1 && v<=7)
            : [];
          const currentDay=((new Date().getDay()+6)%7)+1;
          streakTodayDone=String(streak.lastCheckin || '')===today || claimed.includes(currentDay);
          streakCount=claimed.length;
        }
      }catch(_err){
        streakCount=0;
      }

      const lastSpinDate=(()=>{
        try{return localStorage.getItem('taxiRewardsLastSpinDate') || '';}catch(_err){return '';}
      })();
      const wheelAvailable=lastSpinDate!==today;

      const mysteryRoot=$('[data-rewards-mystery-box]',root);
      let mysteryAvailable=true;
      try{
        const state=JSON.parse(localStorage.getItem('taxiRewardsMysteryBoxState') || '');
        const openedDate=state && typeof state==='object' ? String(state.lastOpenedDate || '') : '';
        mysteryAvailable=openedDate!==today;
      }catch(_err){
        mysteryAvailable=true;
      }
      if(mysteryRoot && mysteryRoot.dataset.mysteryState==='locked') mysteryAvailable=false;

      const dailyFirstRideDone=$('[data-daily-mission-id="daily-first-ride"]',root)?.dataset.dailyStatus==='done';
      const missionDoneCount=$$('[data-rewards-missions] [data-mission-id][data-mission-status="done"]',root).length;
      const achievementsUnlocked=$$('[data-rewards-achievements] [data-achievement-id][data-ach-status="unlocked"]',root).length;

      const vipText=String(levelNode?.textContent || '').trim().toLowerCase();
      const vipIndex=vipOrder.indexOf(vipText);

      return {
        today,
        points:Math.max(0,Math.round(toNumber(pointsNode?.textContent))),
        level:String(levelNode?.textContent || 'Gold').trim(),
        voucher:String(voucherNode?.textContent || '0 €').trim(),
        streakCount,
        streakTodayDone,
        wheelAvailable,
        mysteryAvailable,
        dailyFirstRideDone,
        missionDoneCount,
        achievementsUnlocked,
        vipIndex
      };
    }

    function renderSmart(snapshot){
      const text=(selector,value)=>{
        const node=$(selector,smartRoot);
        if(node) node.textContent=String(value);
      };

      text('[data-smart-points]',snapshot.points);
      text('[data-smart-level]',snapshot.level);
      text('[data-smart-voucher]',snapshot.voucher);
      text('[data-smart-streak]',`${snapshot.streakCount} Tage`);
      text('[data-smart-streak-state]',snapshot.streakTodayDone ? 'Heute erledigt' : 'Heute offen');
      text('[data-smart-wheel]',snapshot.wheelAvailable ? 'Ja' : 'Nein');
      text('[data-smart-wheel-state]',snapshot.wheelAvailable ? 'Jetzt drehen' : 'Morgen wieder');
      text('[data-smart-mystery]',snapshot.mysteryAvailable ? 'Ja' : 'Nein');
      text('[data-smart-mystery-state]',snapshot.mysteryAvailable ? 'Jetzt öffnen' : 'Morgen wieder');

      const wheelCard=$('[data-smart-card="wheel"]',smartRoot);
      const mysteryCard=$('[data-smart-card="mystery"]',smartRoot);
      if(wheelCard){
        if(snapshot.wheelAvailable) wheelCard.dataset.priority='wheel-ready';
        else wheelCard.removeAttribute('data-priority');
      }
      if(mysteryCard){
        if(snapshot.mysteryAvailable) mysteryCard.dataset.priority='mystery-ready';
        else mysteryCard.removeAttribute('data-priority');
      }
    }

    function renderToday(snapshot){
      const tasks={
        wheel:!snapshot.wheelAvailable,
        mystery:!snapshot.mysteryAvailable,
        'first-ride':snapshot.dailyFirstRideDone,
        'three-missions':snapshot.missionDoneCount>=3
      };

      const items=$$('[data-today-item]',todayRoot);
      let doneCount=0;
      items.forEach(item=>{
        const key=item.dataset.todayItem;
        const done=Boolean(tasks[key]);
        if(done) doneCount+=1;
        item.dataset.todayState=done ? 'done' : 'open';
      });

      const progress=Math.max(0,Math.min(100,(doneCount/4)*100));
      const bar=$('.rv2-today-progress',todayRoot);
      const fill=$('[data-today-progress-fill]',todayRoot);
      const textNode=$('[data-today-progress-text]',todayRoot);

      if(bar){
        bar.setAttribute('aria-valuemin','0');
        bar.setAttribute('aria-valuemax','4');
        bar.setAttribute('aria-valuenow',String(doneCount));
        bar.style.setProperty('--today-progress',`${progress.toFixed(2)}%`);
      }
      if(fill) fill.style.width=`${progress.toFixed(2)}%`;
      if(textNode) textNode.textContent=`${doneCount} von 4 Aufgaben erledigt`;
    }

    function renderQuickBadges(snapshot,signals){
      const missionsBadge=$('[data-quick-badge="missions"]',quickRoot);
      const achievementsBadge=$('[data-quick-badge="achievements"]',quickRoot);
      const hasMissionUpdate=snapshot.missionDoneCount>signals.seenMissionDone;
      const hasAchievementUpdate=snapshot.achievementsUnlocked>signals.seenAchievements;

      if(missionsBadge) missionsBadge.hidden=!hasMissionUpdate;
      if(achievementsBadge) achievementsBadge.hidden=!hasAchievementUpdate;
    }

    function bindQuickActions(){
      if(quickRoot.dataset.bound==='true') return;
      quickRoot.dataset.bound='true';

      quickRoot.addEventListener('click',event=>{
        const button=event.target.closest('[data-dashboard-action]');
        if(!button) return;
        const action=button.dataset.dashboardAction;
        const selector=quickActionTargets[action || ''];
        if(!selector) return;
        const target=$(selector,root);
        if(!target) return;
        rewardsSound.play('tick');
        target.scrollIntoView({behavior:'smooth',block:'start'});
        markScrollTarget(target);
      });
    }

    function bindRewardEvents(){
      if(root.dataset.rewardEventsBound==='true') return;
      root.dataset.rewardEventsBound='true';

      document.addEventListener('rewards:rewardEvent',event=>{
        const detail=event && event.detail ? event.detail : {};
        const type=String(detail.type || '').trim().toLowerCase();
        const payload=detail.payload && typeof detail.payload==='object' ? detail.payload : {};
        if(!type) return;

        if(type==='wheel:result'){
          const effect=String(payload.effect || '').trim().toLowerCase();
          if(payload.win && effect==='voucher'){
            showToast({title:'Belohnung',text:'Gutschein-Guthaben freigeschaltet',icon:'🎁',sound:'voucher'});
          }else if(payload.win && effect==='extra-spin'){
            showToast({title:'Extra-Dreh',text:'Extra-Dreh aktiviert',icon:'🔄',sound:'win'});
          }else if(payload.win){
            showToast({title:'Belohnung',text:`${String(payload.label || '+25 Punkte')} erhalten`,icon:'⭐',sound:'win'});
          }else{
            showToast({title:'Glücksrad',text:'Heute kein Gewinn, morgen neue Chance',icon:'🌙',sound:'lose'});
          }
          window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
          return;
        }

        if(type==='mystery:result'){
          const rewardType=String(payload.rewardType || '').trim().toLowerCase();
          if(rewardType==='voucher') showToast({title:'Mystery Box',text:'Gutschein-Guthaben aus Mystery Box erhalten',icon:'🎁',sound:'voucher'});
          else if(rewardType==='badge') showToast({title:'Mystery Box',text:'Neues Abzeichen freigeschaltet',icon:'🏅',sound:'win'});
          else if(rewardType==='points') showToast({title:'Mystery Box',text:'Bonuspunkte gutgeschrieben',icon:'⭐',sound:'win'});
          else if(rewardType==='extra-spin') showToast({title:'Mystery Box',text:'Extra-Dreh erhalten',icon:'🔄',sound:'win'});
          else showToast({title:'Mystery Box',text:'Heute nur ein Trostpreis',icon:'🫶',sound:'lose'});
          window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
          return;
        }

        if(type==='mission:completed'){
          showToast({title:'Mission',text:'Mission abgeschlossen',icon:'✅',sound:'tick'});
          window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
          return;
        }

        if(type==='daily:checkin'){
          const points=Math.max(0,Math.round(Number(payload.points) || 0));
          showToast({title:'Daily Login',text:`Check-in erhalten: +${points} Punkte`,icon:'📅',sound:'win'});
          window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
          return;
        }

        if(type==='booking:completed'){
          const fare=Math.max(0,Number(payload.fare) || 0);
          const points=Math.max(0,Math.round(Number(payload.points) || 0));
          showToast({title:'Fahrt abgeschlossen',text:`${fare.toFixed(2).replace('.',',')} EUR abgeschlossen, +${points} Punkte`,icon:'🚖',sound:'win'});
          window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
        }
      });
    }

    function syncDashboard({emitToasts}){
      const snapshot=readSnapshot();
      const signals=readSignals();

      renderSmart(snapshot);
      renderToday(snapshot);
      renderQuickBadges(snapshot,signals);

      if(emitToasts){
        if(snapshot.missionDoneCount>signals.seenMissionDone){
          showToast({title:'Missionen',text:'Neue Mission abgeschlossen',icon:'✅',sound:'tick'});
        }
        if(snapshot.achievementsUnlocked>signals.seenAchievements){
          showToast({title:'Achievement',text:'Neues Abzeichen erhalten',icon:'🏅',sound:'win'});
        }
        if(snapshot.mysteryAvailable && signals.lastMysteryToastDate!==snapshot.today){
          showToast({title:'Mystery Box',text:'Mystery Box verfügbar',icon:'📦',sound:'tick'});
          signals.lastMysteryToastDate=snapshot.today;
        }
        if(snapshot.vipIndex>signals.seenVipIndex && snapshot.vipIndex>=0){
          showToast({title:'VIP-Status',text:'Level erhöht',icon:'👑',sound:'levelUp'});
        }
      }

      signals.seenMissionDone=snapshot.missionDoneCount;
      signals.seenAchievements=snapshot.achievementsUnlocked;
      signals.seenVipIndex=Math.max(signals.seenVipIndex,snapshot.vipIndex);
      writeSignals(signals);
    }

    bindQuickActions();
    bindRewardEvents();
    syncDashboard({emitToasts:true});

    document.addEventListener('rewards:wheelResult',event=>{
      const detail=event && event.detail ? event.detail : null;
      if(detail){
        window.setTimeout(()=>syncDashboard({emitToasts:false}),40);
      }
    });

    // Some modules update their state after short animations/timers.
    window.setTimeout(()=>syncDashboard({emitToasts:false}),650);
    if(engine) engine.Events.on('reward.store',()=>syncDashboard({emitToasts:false}));
    requestAnimationFrame(()=>root.classList.add('is-rewards-live'));
  }
  function initRewardsMysteryBox(){
    const root=$('#rewards.rewards-v2 [data-rewards-mystery-box]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const statusNode=$('[data-mystery-status]',root);
    const noteNode=$('[data-mystery-note]',root);
    const openButton=$('[data-mystery-open]',root);
    const countdownNode=$('[data-mystery-countdown]',root);
    const resultCard=$('[data-mystery-result]',root);
    const resultIcon=$('[data-mystery-result-icon]',root);
    const resultTitle=$('[data-mystery-result-title]',root);
    const resultText=$('[data-mystery-result-text]',root);
    const confettiHost=$('[data-mystery-confetti]',root);
    if(!openButton || !statusNode || !noteNode || !countdownNode || !resultCard || !resultIcon || !resultTitle || !resultText) return;

    const storageKey='taxiRewardsMysteryBoxState';
    let countdownTimer=0;

    const rewards=[
      {id:'points-25',icon:'⭐',title:'+25 Punkte',text:'Du hast 25 Punkte für dein Rewards-Konto erhalten.',win:true},
      {id:'points-50',icon:'🌟',title:'+50 Punkte',text:'Starker Treffer: 50 Bonuspunkte sind vorgemerkt.',win:true},
      {id:'voucher-5',icon:'🎟️',title:'5 € Gutschein-Guthaben',text:'5 € Gutschein-Guthaben wurde als Demo-Belohnung freigeschaltet.',win:true},
      {id:'extra-spin',icon:'🔄',title:'Extra-Dreh',text:'Du hast einen Extra-Dreh als Mystery-Bonus erhalten.',win:true},
      {id:'secret-badge',icon:'🏆',title:'Geheimes Abzeichen',text:'Ein geheimes Abzeichen wurde im Demo-System markiert.',win:true},
      {id:'no-win',icon:'🫶',title:'Trostpreis',text:'Heute kein Hauptgewinn - morgen wartet die nächste Box.',win:false}
    ];

    function getTodayYmd(){
      const now=new Date();
      const year=now.getFullYear();
      const month=String(now.getMonth()+1).padStart(2,'0');
      const day=String(now.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }

    function getSecondsUntilTomorrow(){
      const now=new Date();
      const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,0,0);
      return Math.max(0,Math.floor((nextMidnight.getTime()-now.getTime())/1000));
    }

    function formatHms(totalSeconds){
      const sec=Math.max(0,totalSeconds|0);
      const h=Math.floor(sec/3600);
      const m=Math.floor((sec%3600)/60);
      const s=sec%60;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return {lastOpenedDate:'',lastRewardId:''};
        return {
          lastOpenedDate:String(parsed.lastOpenedDate || ''),
          lastRewardId:String(parsed.lastRewardId || '')
        };
      }catch(_err){
        return {lastOpenedDate:'',lastRewardId:''};
      }
    }

    function writeState(state){
      try{
        localStorage.setItem(storageKey,JSON.stringify(state));
      }catch(_err){
        // Demo mode: ignore storage errors.
      }
    }

    function stopCountdown(){
      if(!countdownTimer) return;
      clearInterval(countdownTimer);
      countdownTimer=0;
    }

    function updateCountdown(){
      countdownNode.textContent=`Morgen wieder verfügbar in ${formatHms(getSecondsUntilTomorrow())}`;
    }

    function showResultById(rewardId){
      const reward=rewards.find(entry=>entry.id===rewardId);
      if(!reward) return;

      resultIcon.textContent=reward.icon;
      resultTitle.textContent=reward.title;
      resultText.textContent=reward.text;
      resultCard.hidden=false;
      resultCard.classList.remove('is-visible');
      requestAnimationFrame(()=>resultCard.classList.add('is-visible'));
    }

    function createConfettiBurst(isWin){
      if(!confettiHost || !isWin) return;
      confettiHost.innerHTML='';
      const colors=['#ffd96a','#fff1c7','#ffffff','#c4ffda'];
      const pieces=16;

      for(let i=0;i<pieces;i++){
        const node=document.createElement('span');
        node.className='rv2-mystery-piece';
        node.style.background=colors[Math.floor(Math.random()*colors.length)];
        node.style.setProperty('--x',`${Math.round((Math.random()-.5)*180)}px`);
        node.style.setProperty('--y',`${Math.round(70+Math.random()*90)}px`);
        node.style.setProperty('--rot',`${Math.round(180+Math.random()*260)}deg`);
        node.style.setProperty('--dur',`${Math.round(900+Math.random()*650)}ms`);
        confettiHost.append(node);
        setTimeout(()=>node.remove(),1700);
      }
    }

    function applyAvailability(){
      const today=getTodayYmd();
      const state=readState();
      const openedToday=state.lastOpenedDate===today;
      const hardLocked=root.dataset.mysteryState==='locked';

      if(hardLocked){
        root.dataset.mysteryState='locked';
        statusNode.textContent='Gesperrt';
        noteNode.textContent='Diese Mystery Box wird bald freigeschaltet.';
        openButton.disabled=true;
        countdownNode.hidden=true;
        stopCountdown();
        return;
      }

      if(openedToday){
        root.dataset.mysteryState='opened';
        statusNode.textContent='Bereits geöffnet';
        noteNode.textContent='Morgen wieder verfügbar';
        openButton.disabled=true;
        countdownNode.hidden=false;
        updateCountdown();
        if(!countdownTimer){
          countdownTimer=window.setInterval(()=>{
            if(readState().lastOpenedDate!==getTodayYmd()){
              stopCountdown();
              applyAvailability();
              return;
            }
            updateCountdown();
          },1000);
        }
        if(state.lastRewardId) showResultById(state.lastRewardId);
        return;
      }

      stopCountdown();
      root.dataset.mysteryState='available';
      statusNode.textContent='Verfügbar';
      noteNode.textContent='Öffne deine Box und entdecke eine Überraschung.';
      openButton.disabled=false;
      countdownNode.hidden=true;
    }

    openButton.addEventListener('click',()=>{
      if(openButton.disabled) return;

      root.classList.add('is-opening');
      openButton.disabled=true;
      handleRewardEvent('mystery:opening',{source:'mystery-box'});

      setTimeout(()=>{
        root.classList.remove('is-opening');
        const reward=rewards[Math.floor(Math.random()*rewards.length)];
        let rewardType='other';
        if(reward.id.includes('voucher')) rewardType='voucher';
        else if(reward.id.includes('points')) rewardType='points';
        else if(reward.id.includes('badge')) rewardType='badge';
        else if(reward.id==='extra-spin') rewardType='extra-spin';
        else if(reward.id==='no-win') rewardType='no-win';

        resultIcon.textContent=reward.icon;
        resultTitle.textContent=reward.title;
        resultText.textContent=reward.text;
        resultCard.hidden=false;
        resultCard.classList.remove('is-visible');
        requestAnimationFrame(()=>resultCard.classList.add('is-visible'));
        createConfettiBurst(reward.win);

        writeState({lastOpenedDate:getTodayYmd(),lastRewardId:reward.id});
        handleRewardEvent('mystery:result',{
          rewardId:reward.id,
          rewardType,
          title:reward.title,
          text:reward.text,
          icon:reward.icon,
          win:Boolean(reward.win)
        });
        applyAvailability();
      },520);
    });

    applyAvailability();
  }
  function initRewardsDailyStreak(){
    const root=$('#rewards.rewards-v2 [data-rewards-daily-streak]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const dayCards=$$('[data-streak-day]',root);
    const statusNode=$('[data-streak-status]',root);
    const claimButton=$('[data-streak-claim]',root);
    if(!dayCards.length) return;

    const storageKey='taxiRewardsDailyStreakState';

    function getTodayYmd(){
      const now=new Date();
      const year=now.getFullYear();
      const month=String(now.getMonth()+1).padStart(2,'0');
      const day=String(now.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }

    function getCurrentSeriesDay(){
      const jsDay=new Date().getDay();
      return ((jsDay+6)%7)+1;
    }

    function defaultState(){
      const currentDay=getCurrentSeriesDay();
      const claimed=[];
      for(let day=1;day<currentDay;day++) claimed.push(day);
      return {claimed,lastCheckin:'',currentDay};
    }

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultState();
        const currentDay=getCurrentSeriesDay();
        const claimed=Array.isArray(parsed.claimed)
          ? parsed.claimed.map(n=>Number(n)).filter(n=>Number.isInteger(n) && n>=1 && n<=7)
          : [];
        return {
          claimed:Array.from(new Set(claimed)).sort((a,b)=>a-b),
          lastCheckin:String(parsed.lastCheckin || ''),
          currentDay
        };
      }catch(_err){
        return defaultState();
      }
    }

    function writeState(state){
      try{
        localStorage.setItem(storageKey,JSON.stringify(state));
      }catch(_err){
        // Demo mode: storage can fail silently.
      }
    }

    function render(){
      const today=getTodayYmd();
      const state=readState();
      const claimedSet=new Set(state.claimed);

      dayCards.forEach(card=>{
        const day=Number(card.dataset.streakDay || 0);
        const mark=$('[data-streak-mark]',card);
        let viewState='locked';
        const isClaimed=claimedSet.has(day);

        if(day===state.currentDay) viewState='current';
        else if(isClaimed) viewState='done';
        else if(day<state.currentDay) viewState='done';

        card.dataset.streakState=viewState;
        card.dataset.streakComplete=(isClaimed || day<state.currentDay) ? 'true' : 'false';
        if(mark){
          if(viewState==='current' && isClaimed) mark.textContent='✔';
          else mark.textContent=viewState==='done' ? '✔' : (viewState==='current' ? '★' : '🔒');
        }
      });

      const doneCount=dayCards.filter(card=>card.dataset.streakState==='done').length;
      const todayDone=claimedSet.has(state.currentDay) || state.lastCheckin===today;

      if(statusNode){
        if(todayDone) statusNode.textContent=`Tägliche Serie aktiv: ${doneCount}/7 Tage erledigt.`;
        else statusNode.textContent=`Tag ${state.currentDay} ist heute aktiv. Jetzt Bonus sichern.`;
      }

      if(claimButton){
        claimButton.disabled=todayDone;
        claimButton.textContent=todayDone ? 'Heute erledigt' : 'Heute einchecken';
      }
    }

    if(claimButton){
      claimButton.addEventListener('click',()=>{
        const today=getTodayYmd();
        const state=readState();
        if(state.lastCheckin===today) return;

        if(!state.claimed.includes(state.currentDay)){
          state.claimed.push(state.currentDay);
          state.claimed=Array.from(new Set(state.claimed)).sort((a,b)=>a-b);
        }
        state.lastCheckin=today;
        writeState(state);
        render();

        const streakLength=state.claimed.length;
        if(statusNode) statusNode.textContent=`Check-in bestätigt: +10 Punkte. Serie ${streakLength}/7 aktiv.`;
        handleRewardEvent('daily:checkin',{points:10,streak:streakLength});
      });
    }

    render();
  }
  function initRewardsDailyMissions(){
    const root=$('#rewards.rewards-v2 [data-rewards-daily-missions]');
    if(!root) return;

    const cards=$$('[data-daily-mission-id]',root);
    if(!cards.length) return;
    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    const statusLabelMap={
      active:'Aktiv',
      done:'Abgeschlossen',
      locked:'Gesperrt'
    };

    cards.forEach(card=>{
      const current=Math.max(0,Number(card.dataset.dailyCurrent || 0));
      const target=Math.max(1,Number(card.dataset.dailyTarget || 1));
      const progress=Math.max(0,Math.min(100,(current/target)*100));
      const rawStatus=String(card.dataset.dailyStatus || 'active').trim().toLowerCase();
      const status=(rawStatus in statusLabelMap) ? rawStatus : 'active';

      card.dataset.dailyStatus=status;

      const statusNode=$('.rv2-daily-mission-status',card);
      if(statusNode) statusNode.textContent=statusLabelMap[status];

      const circle=$('.rv2-daily-progress-circle',card);
      if(circle){
        circle.style.setProperty('--daily-progress',progress.toFixed(2));
        circle.setAttribute('aria-valuemin','0');
        circle.setAttribute('aria-valuemax',String(target));
        circle.setAttribute('aria-valuenow',String(Math.min(current,target)));
      }

      const textNode=$('[data-daily-progress-text]',card);
      if(textNode) textNode.textContent=`${Math.round(progress)}%`;
    });

    function syncFromStore(){
      if(!engine) return;
      const s=engine.Store.getState();
      const done=String(s.missions?.['daily-first-ride']?.status || '').toLowerCase()==='done';
      const card=$('[data-daily-mission-id="daily-first-ride"]',root);
      if(!card) return;
      card.dataset.dailyCurrent=done ? '1' : '0';
      card.dataset.dailyStatus=done ? 'done' : 'active';
      const circle=$('.rv2-daily-progress-circle',card);
      if(circle){
        circle.style.setProperty('--daily-progress',done ? '100' : '0');
        circle.setAttribute('aria-valuenow',done ? '1' : '0');
      }
      const textNode=$('[data-daily-progress-text]',card);
      if(textNode) textNode.textContent=done ? '100%' : '0%';
      const statusNode=$('.rv2-daily-mission-status',card);
      if(statusNode) statusNode.textContent=done ? 'Abgeschlossen' : 'Aktiv';
    }

    if(engine){
      engine.Events.on('reward.store',syncFromStore);
      syncFromStore();
    }
  }
  function initRewardsWeeklyMissions(){
    const root=$('#rewards.rewards-v2 [data-rewards-weekly-missions]');
    if(!root) return;

    const cards=$$('[data-weekly-target]',root);
    if(!cards.length) return;

    const statusLabelMap={
      active:'Aktiv',
      done:'Abgeschlossen',
      locked:'Gesperrt'
    };

    cards.forEach(card=>{
      const current=Math.max(0,Number(card.dataset.weeklyCurrent || 0));
      const target=Math.max(1,Number(card.dataset.weeklyTarget || 1));
      const progress=Math.max(0,Math.min(100,(current/target)*100));
      const rawStatus=String(card.dataset.weeklyStatus || 'active').trim().toLowerCase();
      const status=(rawStatus in statusLabelMap) ? rawStatus : 'active';

      card.dataset.weeklyStatus=status;

      const statusNode=$('.rv2-weekly-status',card);
      if(statusNode) statusNode.textContent=statusLabelMap[status];

      const bar=$('.rv2-weekly-progress',card);
      if(bar){
        bar.style.setProperty('--weekly-progress',`${progress.toFixed(2)}%`);
        bar.setAttribute('aria-valuemin','0');
        bar.setAttribute('aria-valuemax',String(target));
        bar.setAttribute('aria-valuenow',String(Math.min(current,target)));
      }

      const textNode=$('.rv2-weekly-progress-text',card);
      if(textNode) textNode.textContent=`${Math.min(current,target)} / ${target}`;
    });
  }
  function initRewardsSpecialMissions(){
    const root=$('#rewards.rewards-v2 [data-rewards-special-missions]');
    if(!root) return;

    // Demo-only placeholder section. Cards are structured so future DB data can replace content.
    const cards=$$('.rv2-special-card',root);
    cards.forEach(card=>{
      const statusNode=$('b',card);
      if(statusNode && !statusNode.textContent.trim()) statusNode.textContent='Bald verfügbar';
    });
  }
  function initRewardsAchievements(){
    const root=$('#rewards.rewards-v2 [data-rewards-achievements]');
    if(!root) return;

    const cards=$$('[data-achievement-id]',root);
    if(!cards.length) return;

    const storageKey='taxiRewardsAchievementsState';
    const defaultState={
      unlocked:['first-ride','five-rides','airport-pro','regular']
    };

    const statusLabelMap={
      unlocked:'Freigeschaltet',
      locked:'Gesperrt',
      secret:'Geheim'
    };

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultState;
        const unlocked=Array.isArray(parsed.unlocked)
          ? parsed.unlocked.map(v=>String(v).trim()).filter(Boolean)
          : defaultState.unlocked;
        return {unlocked:Array.from(new Set(unlocked))};
      }catch(_err){
        return defaultState;
      }
    }

    function seedState(state){
      try{
        if(!localStorage.getItem(storageKey)) localStorage.setItem(storageKey,JSON.stringify(state));
      }catch(_err){
        // Demo mode only.
      }
    }

    const state=readState();
    seedState(state);
    const unlockedSet=new Set(state.unlocked);

    cards.forEach(card=>{
      const id=String(card.dataset.achievementId || '').trim();
      let status=String(card.dataset.achStatus || 'locked').trim().toLowerCase();
      if(status!=='secret' && unlockedSet.has(id)) status='unlocked';
      if(!(status in statusLabelMap)) status='locked';
      card.dataset.achStatus=status;

      const statusNode=$('.rv2-achievement-status',card);
      if(statusNode) statusNode.textContent=statusLabelMap[status];

      const current=Math.max(0,Number(card.dataset.achCurrent || 0));
      const target=Math.max(1,Number(card.dataset.achTarget || 1));
      const progress=Math.max(0,Math.min(100,(current/target)*100));

      const bar=$('.rv2-achievement-progress',card);
      if(bar){
        bar.style.setProperty('--achievement-progress',`${progress.toFixed(2)}%`);
        bar.setAttribute('aria-valuemin','0');
        bar.setAttribute('aria-valuemax',String(target));
        bar.setAttribute('aria-valuenow',String(Math.min(current,target)));
      }

      const textNode=$('.rv2-achievement-progress-text',card);
      if(textNode && !textNode.textContent.trim()){
        textNode.textContent=status==='secret' ? '???' : `${Math.min(current,target)} / ${target}`;
      }
    });
  }
  function initRewardsCollection(){
    const root=$('#rewards.rewards-v2 [data-rewards-collection]');
    if(!root) return;

    const cards=$$('[data-collection-kind]',root);
    if(!cards.length) return;

    const storageKey='taxiRewardsCollectionState';
    const defaultState={
      badges:4,
      vouchers:6,
      missions:9,
      events:2,
      rare:1
    };

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(storageKey) || '');
        if(!parsed || typeof parsed!=='object') return defaultState;
        return {
          badges:Number.isFinite(Number(parsed.badges)) ? Number(parsed.badges) : defaultState.badges,
          vouchers:Number.isFinite(Number(parsed.vouchers)) ? Number(parsed.vouchers) : defaultState.vouchers,
          missions:Number.isFinite(Number(parsed.missions)) ? Number(parsed.missions) : defaultState.missions,
          events:Number.isFinite(Number(parsed.events)) ? Number(parsed.events) : defaultState.events,
          rare:Number.isFinite(Number(parsed.rare)) ? Number(parsed.rare) : defaultState.rare
        };
      }catch(_err){
        return defaultState;
      }
    }

    function seedState(state){
      try{
        if(!localStorage.getItem(storageKey)) localStorage.setItem(storageKey,JSON.stringify(state));
      }catch(_err){
        // Demo mode only.
      }
    }

    const state=readState();
    seedState(state);

    const copyByKind={
      badges:count=>`${count} freigeschaltet`,
      vouchers:count=>`${count} gesammelt`,
      missions:count=>`${count} erledigt`,
      events:count=>`${count} gesichert`,
      rare:count=>`${count} legendär`
    };

    cards.forEach(card=>{
      const kind=String(card.dataset.collectionKind || '').trim().toLowerCase();
      if(!(kind in copyByKind)) return;
      const count=Number(state[kind] || 0);
      const textNode=$('p',card);
      if(textNode) textNode.textContent=copyByKind[kind](count);
    });
  }
  function initRewardsMissions(){
    const root=$('#rewards.rewards-v2 [data-rewards-missions]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';

    const missionCards=$$('[data-mission-id]',root);
    if(!missionCards.length) return;
    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    const statusLabelMap={
      active:'Aktiv',
      done:'Abgeschlossen',
      locked:'Gesperrt'
    };

    function renderCard(card){
      const rawStatus=String(card.dataset.missionStatus || 'locked').trim().toLowerCase();
      const status=(rawStatus in statusLabelMap) ? rawStatus : 'locked';
      const current=Math.max(0,Number(card.dataset.missionCurrent || 0));
      const target=Math.max(1,Number(card.dataset.missionTarget || 1));
      const progress=Math.max(0,Math.min(100,(current/target)*100));

      card.dataset.missionStatus=status;

      const statusNode=$('.rv2-mission-status',card);
      if(statusNode) statusNode.textContent=statusLabelMap[status];

      const progressBar=$('.rv2-mission-progress',card);
      if(progressBar){
        progressBar.style.setProperty('--mission-progress',`${progress.toFixed(2)}%`);
        progressBar.setAttribute('aria-valuemin','0');
        progressBar.setAttribute('aria-valuemax',String(target));
        progressBar.setAttribute('aria-valuenow',String(Math.min(current,target)));
      }

      const progressText=$('.rv2-mission-progress-text',card);
      if(progressText) progressText.textContent=`${Math.min(current,target)} / ${target}`;
    }

    missionCards.forEach(card=>{
      renderCard(card);
      card.addEventListener('click',()=>{
        const status=String(card.dataset.missionStatus || 'locked').trim().toLowerCase();
        if(status!=='active') return;

        const target=Math.max(1,Number(card.dataset.missionTarget || 1));
        const current=Math.max(0,Number(card.dataset.missionCurrent || 0));
        const next=Math.min(target,current+1);
        card.dataset.missionCurrent=String(next);

        if(next>=target){
          card.dataset.missionStatus='done';
          const statusNode=$('.rv2-mission-status',card);
          statusNode?.classList.remove('is-pop');
          requestAnimationFrame(()=>statusNode?.classList.add('is-pop'));
          window.setTimeout(()=>statusNode?.classList.remove('is-pop'),760);

          const title=$('.rv2-mission-copy h4',card)?.textContent?.trim() || 'Mission';
          const reward=String(card.dataset.missionReward || '').trim();
          handleRewardEvent('mission:completed',{
            missionId:String(card.dataset.missionId || '').trim(),
            title,
            reward
          });
        }

        renderCard(card);
      });
    });

    function syncFromStore(){
      if(!engine) return;
      const s=engine.Store.getState();
      missionCards.forEach(card=>{
        const id=String(card.dataset.missionId || '').trim();
        const entry=s.missions && typeof s.missions==='object' ? s.missions[id] : null;
        if(!entry || typeof entry!=='object') return;
        const status=String(entry.status || '').toLowerCase();
        if(status==='done'){
          card.dataset.missionStatus='done';
          const target=Math.max(1,Number(card.dataset.missionTarget || entry.target || 1));
          card.dataset.missionCurrent=String(target);
        }else if(status==='active'){
          const current=Math.max(0,Number(entry.current || 0));
          if(Number.isFinite(current)) card.dataset.missionCurrent=String(current);
          card.dataset.missionStatus='active';
        }
        renderCard(card);
      });
    }

    if(engine){
      engine.Events.on('reward.store',syncFromStore);
      syncFromStore();
    }
  }
  function initRewardsSeasonalEvents(){
    const root=$('#rewards.rewards-v2 [data-rewards-seasonal-events]');
    if(!root) return;

    const eventCards=$$('[data-event-id]',root);
    if(!eventCards.length) return;

    const statusLabelMap={
      active:'Aktiv',
      upcoming:'Bald verfügbar',
      ended:'Beendet'
    };

    let featuredSet=false;
    eventCards.forEach(card=>{
      const rawStatus=String(card.dataset.eventStatus || 'upcoming').trim().toLowerCase();
      const status=(rawStatus in statusLabelMap) ? rawStatus : 'upcoming';
      card.dataset.eventStatus=status;

      const statusNode=$('.rv2-seasonal-status',card);
      if(statusNode) statusNode.textContent=statusLabelMap[status];

      // Keep this demo future-ready: one current event can be highlighted by status/data flag.
      const shouldFeature=(card.dataset.eventFeatured==='true') || (!featuredSet && status==='active');
      if(shouldFeature){
        card.dataset.eventFeatured='true';
        card.classList.add('is-featured');
        featuredSet=true;
      }
    });
  }
  function initRewardsYumakAssistant(){
    const root=$('#rewards.rewards-v2 [data-rewards-yumak]');
    if(!root) return;

    const tipNode=$('[data-yumak-tip]',root);
    const nextButton=$('[data-yumak-next-tip]',root);
    const missionButton=$('[data-yumak-open-mission]',root);
    const wheelButton=$('[data-yumak-open-wheel]',root);
    const stage=$('[data-yumak-character]',root);
    const sparkHost=$('[data-yumak-hover-spark]',root);
    const particleHost=$('[data-yumak-particles]',root);
    const celebrateHost=$('[data-yumak-celebrate]',root);
    const spinWidget=$('#rewards.rewards-v2 [data-rewards-wheel]');
    const wheelDisc=spinWidget ? ($('.rv2-wheel-rotator',spinWidget) || $('.rewards-wheel-disc',spinWidget)) : null;
    const wheelSpinButton=spinWidget ? $('.rv2-spin-btn',spinWidget) : null;
    const mysteryOpenButton=$('#rewards.rewards-v2 [data-rewards-mystery-box] [data-mystery-open]');
    const listItems=$$('li',$('.rv2-yumak-tip-list',root));
    const tips=listItems.map(item=>item.textContent.trim()).filter(Boolean);

    if(!tipNode || !nextButton || tips.length<2) return;

    let index=Math.max(0,Number(root.dataset.yumakTipIndex || 0));
    let tipTimer=0;
    let blinkTimer=0;
    let twitchTimer=0;
    let reactionTimer=0;
    let noWinResetTimer=0;
    let frameId=0;
    let pointerBurstTime=0;
    let modeTimer=0;

    const state={
      hover:false,
      spinning:false,
      lookX:0,
      lookY:0,
      targetLookX:0,
      targetLookY:0,
      tailAngle:0,
      headTilt:0,
      earTilt:0,
      bodyScale:1,
      idleLift:0
    };

    const wheelReactions={
      points:'Starker Gewinn! Das war ein sauberer Treffer.',
      voucher:'Gutschein gewonnen. Sehr stark, das zahlt sich aus.',
      'free-ride':'Freifahrt gesichert. Das ist Premium-Level.',
      mystery:'Geheimpreis! Das war eine besondere Landung.',
      surprised:'Extra-Dreh! Überraschung, wir legen direkt nach.',
      'no-win':'Heute ohne Gewinn, aber wir bleiben dran.'
    };

    function clearTimer(id){
      if(!id) return 0;
      clearTimeout(id);
      return 0;
    }

    function randomRange(min,max){
      return min + Math.random()*(max-min);
    }

    function showTip(newIndex){
      index=((newIndex%tips.length)+tips.length)%tips.length;
      root.dataset.yumakTipIndex=String(index);
      tipNode.classList.remove('is-swapping');
      requestAnimationFrame(()=>{
        tipNode.textContent=tips[index];
        tipNode.classList.add('is-swapping');
      });
    }

    function showTipText(text){
      if(!text) return;
      tipNode.classList.remove('is-swapping');
      requestAnimationFrame(()=>{
        tipNode.textContent=text;
        tipNode.classList.add('is-swapping');
      });
    }

    function queueAutoTip(){
      tipTimer=clearTimer(tipTimer);
      tipTimer=setTimeout(()=>{
        showTip(index+1);
        queueAutoTip();
      },Math.round(randomRange(6000,10000)));
    }

    function scheduleBlink(){
      blinkTimer=clearTimer(blinkTimer);
      blinkTimer=setTimeout(()=>{
        root.classList.add('is-blinking');
        setTimeout(()=>root.classList.remove('is-blinking'),150);
        scheduleBlink();
      },Math.round(randomRange(2600,6200)));
    }

    function scheduleEarTwitch(){
      twitchTimer=clearTimer(twitchTimer);
      twitchTimer=setTimeout(()=>{
        root.classList.add('is-ear-twitch');
        setTimeout(()=>root.classList.remove('is-ear-twitch'),240);
        scheduleEarTwitch();
      },Math.round(randomRange(3200,7600)));
    }

    function createAmbientParticles(){
      if(!particleHost) return;
      particleHost.innerHTML='';
      const count=12;
      for(let i=0;i<count;i++){
        const dot=document.createElement('span');
        dot.className='rv2-yumak-particle';
        dot.style.left=`${Math.round(randomRange(8,92))}%`;
        dot.style.top=`${Math.round(randomRange(16,92))}%`;
        dot.style.setProperty('--dur',`${Math.round(randomRange(3200,6200))}ms`);
        dot.style.setProperty('--delay',`${Math.round(randomRange(-2000,1500))}ms`);
        dot.style.setProperty('--travel',`${Math.round(randomRange(-16,-48))}px`);
        particleHost.append(dot);
      }
    }

    function sparkleBurst(kind){
      if(!celebrateHost) return;
      const paletteByKind={
        win:['#ffd96a','#fff0bf','#c4ffda','#ffffff'],
        voucher:['#ffd96a','#ffefc8','#ffde94','#fff7da'],
        'extra-spin':['#ffd96a','#f4d382','#ffffff','#ffe7a6'],
        mystery:['#d8b6ff','#ffe28a','#fff5d5','#c6e6ff'],
        nowin:['#d7dae2','#b9c2d2','#f0f2f6','#e6dcc2']
      };
      const colors=paletteByKind[kind] || paletteByKind.win;
      const pieces=kind==='mystery' ? 22 : 14;

      for(let i=0;i<pieces;i++){
        const node=document.createElement('span');
        node.className='rv2-yumak-burst-piece';
        node.style.left='50%';
        node.style.top='52%';
        node.style.setProperty('--tx',`${Math.round(randomRange(-90,90))}px`);
        node.style.setProperty('--ty',`${Math.round(randomRange(-80,70))}px`);
        node.style.setProperty('--dur',`${Math.round(randomRange(720,1400))}ms`);
        node.style.setProperty('--piece-color',colors[Math.floor(Math.random()*colors.length)]);
        celebrateHost.append(node);
        setTimeout(()=>node.remove(),1450);
      }
    }

    function spawnHoverSpark(x,y){
      if(!sparkHost) return;
      const now=performance.now();
      if(now-pointerBurstTime<260) return;
      pointerBurstTime=now;
      const icon=Math.random()>.5 ? 'star' : 'heart';
      const node=document.createElement('span');
      node.className='rv2-yumak-spark';
      node.dataset.spark=icon;
      node.style.left=`${Math.round(x)}px`;
      node.style.top=`${Math.round(y)}px`;
      sparkHost.append(node);
      setTimeout(()=>node.remove(),700);
    }

    function setReaction(effect){
      const normalized=String(effect || 'idle').trim().toLowerCase();
      root.dataset.yumakReaction=normalized;
      reactionTimer=clearTimer(reactionTimer);
      if(normalized!=='no-win'){
        reactionTimer=setTimeout(()=>{
          root.dataset.yumakReaction='idle';
        },2200);
      }
      if(normalized==='no-win'){
        noWinResetTimer=clearTimer(noWinResetTimer);
        noWinResetTimer=setTimeout(()=>{
          root.dataset.yumakReaction='idle';
        },2000);
      }
    }

    function updateCharacterCss(){
      root.style.setProperty('--yumak-look-x',`${state.lookX.toFixed(2)}px`);
      root.style.setProperty('--yumak-look-y',`${state.lookY.toFixed(2)}px`);
      root.style.setProperty('--yumak-idle-y',`${state.idleLift.toFixed(2)}px`);
      root.style.setProperty('--yumak-body-scale',state.bodyScale.toFixed(3));
      root.style.setProperty('--yumak-head-tilt',`${state.headTilt.toFixed(2)}deg`);
      root.style.setProperty('--yumak-tail-angle',`${state.tailAngle.toFixed(2)}deg`);
      root.style.setProperty('--yumak-ear-left',`${(-8 + state.earTilt).toFixed(2)}deg`);
      root.style.setProperty('--yumak-ear-right',`${(8 - state.earTilt).toFixed(2)}deg`);
      root.style.setProperty('--yumak-breath',state.bodyScale.toFixed(3));
    }

    function parseWheelRotation(){
      if(!wheelDisc) return 0;
      const transform=wheelDisc.style.transform || '';
      const match=/rotate\((-?[\d.]+)deg\)/.exec(transform);
      if(!match) return 0;
      const value=Number(match[1]);
      return Number.isFinite(value) ? value : 0;
    }

    function isCooldownMode(){
      const wheelLocked=Boolean(wheelSpinButton && wheelSpinButton.disabled);
      const mysteryLocked=Boolean(mysteryOpenButton && mysteryOpenButton.disabled);
      return wheelLocked && mysteryLocked;
    }

    function updateMode(){
      if(state.spinning){
        root.dataset.yumakMode='watching';
        return;
      }
      root.dataset.yumakMode=isCooldownMode() ? 'sleepy' : 'idle';
    }

    function animate(now){
      const t=now || performance.now();
      const idleWave=Math.sin(t*0.0021);
      const floatWave=Math.sin(t*0.0015 + .5);
      state.idleLift=idleWave*1.4 + floatWave*1.8;

      const reaction=root.dataset.yumakReaction || 'idle';
      let tailBase=Math.sin(t*0.0024)*10;
      let bodyBase=1 + Math.sin(t*0.0044)*0.014;
      let headBase=Math.sin(t*0.0018)*1.9;
      let earsBase=Math.sin(t*0.0026)*1.6;

      if(state.hover){
        tailBase=Math.sin(t*0.0053)*16;
        earsBase=3 + Math.sin(t*0.008)*1.8;
      }
      if(state.spinning){
        tailBase=Math.sin(t*0.0072)*19;
        headBase+=3;
        state.targetLookY=-1.8;
      }
      if(root.dataset.yumakMode==='sleepy'){
        tailBase=-10;
        headBase=-5;
        earsBase-=7;
        bodyBase=.985;
        state.targetLookX=0;
        state.targetLookY=2.2;
      }

      if(root.classList.contains('is-ear-twitch')) earsBase+=5;
      if(reaction==='no-win'){
        earsBase-=8;
        tailBase=-13;
        bodyBase=.986;
        headBase=-7;
      }
      if(reaction==='mystery'){
        state.targetLookX=0;
        state.targetLookY=-3;
      }

      const lookLerp=.08;
      state.lookX += (state.targetLookX - state.lookX)*lookLerp;
      state.lookY += (state.targetLookY - state.lookY)*lookLerp;
      state.tailAngle += (tailBase - state.tailAngle)*.13;
      state.headTilt += (headBase - state.headTilt)*.09;
      state.earTilt += (earsBase - state.earTilt)*.1;
      state.bodyScale += (bodyBase - state.bodyScale)*.09;

      if(state.spinning){
        const wheelDeg=parseWheelRotation();
        state.targetLookX=Math.max(-4,Math.min(6,Math.sin((wheelDeg+40)*Math.PI/180)*5 + 1));
      }

      updateCharacterCss();
      frameId=requestAnimationFrame(animate);
    }

    tipNode.addEventListener('animationend',()=>{
      tipNode.classList.remove('is-swapping');
    });

    nextButton.addEventListener('click',()=>{
      showTip(index+1);
      queueAutoTip();
    });

    if(missionButton){
      missionButton.addEventListener('click',()=>{
        const missions=$('#rewards.rewards-v2 [data-rewards-missions]');
        if(missions) missions.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }

    if(wheelButton){
      wheelButton.addEventListener('click',()=>{
        const wheel=$('#rewards.rewards-v2 [data-rewards-wheel]');
        if(wheel) wheel.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }

    if(stage){
      stage.addEventListener('pointerenter',()=>{
        state.hover=true;
        root.classList.add('is-hovering');
      });
      stage.addEventListener('pointerleave',()=>{
        state.hover=false;
        root.classList.remove('is-hovering');
        state.targetLookX=0;
        state.targetLookY=0;
      });
      stage.addEventListener('pointermove',event=>{
        const bounds=stage.getBoundingClientRect();
        const relX=(event.clientX-bounds.left)/Math.max(bounds.width,1);
        const relY=(event.clientY-bounds.top)/Math.max(bounds.height,1);
        state.targetLookX=(relX-.5)*7;
        state.targetLookY=(relY-.45)*4;
        spawnHoverSpark(event.clientX-bounds.left,event.clientY-bounds.top);
      });
    }

    if(spinWidget){
      const updateSpinMode=()=>{
        state.spinning=spinWidget.classList.contains('is-spinning');
        updateMode();
      };
      const observer=new MutationObserver(updateSpinMode);
      observer.observe(spinWidget,{attributes:true,attributeFilter:['class']});
      updateSpinMode();
    }

    modeTimer=window.setInterval(updateMode,1000);

    document.addEventListener('rewards:wheelResult',event=>{
      const detail=event && event.detail ? event.detail : {};
      const effect=String(detail.effect || (detail.win ? 'points' : 'no-win')).trim().toLowerCase();
      const moodByEffect={
        points:'points',
        voucher:'voucher',
        'free-ride':'free-ride',
        'extra-spin':'surprised',
        mystery:'mystery',
        'no-win':'no-win'
      };
      const mood=moodByEffect[effect] || (detail.win ? 'points' : 'no-win');
      setReaction(mood);

      const reactionText=wheelReactions[mood] || (detail.win ? wheelReactions.points : wheelReactions['no-win']);
      showTipText(reactionText);

      if(mood==='surprised') sparkleBurst('extra-spin');
      else if(effect==='mystery') sparkleBurst('mystery');
      else if(effect==='voucher') sparkleBurst('voucher');
      else if(effect==='no-win') sparkleBurst('nowin');
      else sparkleBurst('win');

      queueAutoTip();
    });

    document.addEventListener('reward.mission',()=>{
      setReaction('points');
      showTipText('Mission erledigt. Starkes Tempo!');
      queueAutoTip();
    });
    document.addEventListener('reward.login',()=>{
      setReaction('points');
      showTipText('Daily Check-in sitzt. Serie läuft!');
      queueAutoTip();
    });
    document.addEventListener('reward.badge',()=>{
      setReaction('mystery');
      showTipText('Neues Abzeichen! Das war premium.');
      queueAutoTip();
    });
    document.addEventListener('reward.levelup',()=>{
      setReaction('voucher');
      showTipText('Level-Up! Ich feiere mit dir.');
      queueAutoTip();
    });
    document.addEventListener('reward.ride',()=>{
      setReaction('surprised');
      showTipText('Starke Fahrt. Punkte und Missionen sind live aktualisiert.');
      queueAutoTip();
    });

    createAmbientParticles();
    queueAutoTip();
    scheduleBlink();
    scheduleEarTwitch();
    updateMode();
    frameId=requestAnimationFrame(animate);
  }
  function initRewardsActivities(){
    const root=$('#rewards.rewards-v2 [data-rewards-activities]');
    if(!root) return;
    if(root.dataset.bound==='true') return;
    root.dataset.bound='true';
    const engine=(window.rewardsEngine && window.rewardsEngine.Store) ? window.rewardsEngine : null;

    const filterButtons=$$('[data-activity-filter]',root);
    const timeline=$('.rv2-activity-timeline',root);
    if(!filterButtons.length || !timeline) return;
    let currentFilter='all';

    function applyFilter(filter){
      const items=$$('[data-activity-type]',timeline);
      items.forEach(item=>{
        const type=String(item.dataset.activityType || '').trim().toLowerCase();
        item.hidden=!(filter==='all' || type===filter);
      });

      filterButtons.forEach(button=>{
        const active=(button.dataset.activityFilter===filter);
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-selected',active ? 'true' : 'false');
      });
      currentFilter=filter;
    }

    function nowLabel(){
      const d=new Date();
      return `Heute, ${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`;
    }

    function prependActivity({type='points',icon='⭐',title='Neue Rewards-Aktualisierung',text='Ereignis gespeichert.',append=false}){
      const li=document.createElement('li');
      li.className='rv2-activity-item';
      li.dataset.activityType=type;

      const iconNode=document.createElement('i');
      iconNode.className='rv2-activity-icon';
      iconNode.setAttribute('aria-hidden','true');
      iconNode.textContent=icon;

      const copy=document.createElement('div');
      copy.className='rv2-activity-copy';
      const h4=document.createElement('h4');
      h4.textContent=title;
      const p=document.createElement('p');
      p.textContent=text;
      const small=document.createElement('small');
      small.textContent=nowLabel();
      copy.append(h4,p,small);

      const status=document.createElement('b');
      status.className='rv2-activity-status';
      const statusMap={points:'Punkte',voucher:'Gutschein',badge:'Abzeichen',mission:'Mission'};
      status.textContent=statusMap[type] || 'Info';

      li.append(iconNode,copy,status);
      if(append) timeline.append(li);
      else timeline.prepend(li);

      while(timeline.children.length>12) timeline.lastElementChild?.remove();
      applyFilter(currentFilter);
    }

    function renderStoreActivities(){
      if(!engine) return;
      const snapshot=engine.Store.getState();
      const entries=Array.isArray(snapshot.activities) ? snapshot.activities.slice(0,12) : [];
      if(!entries.length) return;
      timeline.innerHTML='';
      entries.forEach(entry=>{
        prependActivity({
          type:String(entry.type || 'points'),
          icon:String(entry.icon || '⭐'),
          title:String(entry.title || 'Rewards Ereignis'),
          text:String(entry.text || ''),
          append:true
        });
      });
      applyFilter(currentFilter);
    }

    filterButtons.forEach(button=>{
      button.addEventListener('click',()=>{
        applyFilter(button.dataset.activityFilter || 'all');
      });
    });

    if(engine){
      engine.Events.on('reward.store',renderStoreActivities);
      renderStoreActivities();
    }

    document.addEventListener('rewards:rewardEvent',event=>{
      if(engine) return;
      const detail=event && event.detail ? event.detail : {};
      const type=String(detail.type || '').trim().toLowerCase();
      const payload=detail.payload && typeof detail.payload==='object' ? detail.payload : {};
      if(!type) return;

      if(type==='wheel:result'){
        const effect=String(payload.effect || '').trim().toLowerCase();
        if(payload.win && effect==='voucher') prependActivity({type:'voucher',icon:'🎁',title:'Gutschein-Guthaben durch Glücksrad',text:'Das Rad hat neues Gutschein-Guthaben geliefert.'});
        else if(payload.win) prependActivity({type:'points',icon:'🎯',title:`${String(payload.label || '+25 Punkte')} durch Glücksrad`,text:'Der Gewinn wurde als Demo-Ereignis verbucht.'});
        else prependActivity({type:'mission',icon:'🌙',title:'Glücksrad ohne Gewinn',text:'Heute keine Belohnung - morgen neue Chance.'});
        return;
      }

      if(type==='mystery:result'){
        const rewardType=String(payload.rewardType || '').trim().toLowerCase();
        if(rewardType==='voucher') prependActivity({type:'voucher',icon:'🎁',title:'Mystery Box: Gutschein erhalten',text:'Dein Gutschein-Guthaben wurde erweitert.'});
        else if(rewardType==='badge') prependActivity({type:'badge',icon:'🏅',title:'Mystery Box: Abzeichen erhalten',text:'Ein neues Abzeichen wurde freigeschaltet.'});
        else prependActivity({type:'points',icon:'📦',title:'Mystery Box geöffnet',text:String(payload.title || 'Belohnung wurde verbucht.')});
        return;
      }

      if(type==='mission:completed'){
        prependActivity({type:'mission',icon:'✅',title:`Mission abgeschlossen: ${String(payload.title || 'Mission')}`,text:String(payload.reward ? `Belohnung: ${payload.reward}` : 'Mission wurde erfolgreich abgeschlossen.')});
        return;
      }

      if(type==='daily:checkin'){
        prependActivity({type:'points',icon:'📅',title:'Daily Check-in bestätigt',text:`+${Math.max(0,Math.round(Number(payload.points)||0))} Punkte und Serie aktualisiert.`});
      }
    });

    applyFilter('all');
  }
  function initCustomerAccountRewardsBridge(){
    const root=$('#account.account-page');
    if(!root) return;

    const STORAGE_KEY='taxiCustomerAccountDemoState';
    const DEFAULT_STATE={
      profile:{
        name:'Max Mustermann',
        memberSince:'Januar 2026',
        customerStatus:'Premium Kunde',
        points:230,
        voucherBalance:15
      },
      rideHistory:[
        {id:'ride-2026-06-18-airport',date:'18.06.2026',rideType:'Flughafentransfer',rideTypeKey:'airport',start:'Germersheim Zentrum',destination:'Frankfurt Flughafen Terminal 1',price:126.5,pointsEarned:18,voucherUsed:true},
        {id:'ride-2026-06-12-medical',date:'12.06.2026',rideType:'Krankenfahrt',rideTypeKey:'medical',start:'Germersheim Nord',destination:'Dialysezentrum Speyer',price:48,pointsEarned:12,voucherUsed:false},
        {id:'ride-2026-06-04-taxi',date:'04.06.2026',rideType:'Taxifahrt',rideTypeKey:'taxi',start:'Bahnhof Germersheim',destination:'Innenstadt Germersheim',price:14.8,pointsEarned:10,voucherUsed:false}
      ],
      favoriteAddresses:getDefaultFavoriteAddresses(),
      invoices:[
        {id:'RG-2026-0184',date:'18.06.2026',route:'Germersheim Zentrum -> Frankfurt Flughafen Terminal 1',amount:126.5,status:'bezahlt'},
        {id:'RG-2026-0171',date:'12.06.2026',route:'Germersheim Nord -> Dialysezentrum Speyer',amount:48,status:'offen'},
        {id:'RG-2026-0163',date:'04.06.2026',route:'Bahnhof Germersheim -> Innenstadt Germersheim',amount:14.8,status:'angefragt'}
      ],
      notifications:[
        {title:'Neue Punkte erhalten',text:'+18 Punkte wurden Ihrer letzten Fahrt gutgeschrieben.'},
        {title:'Gutschein verfügbar',text:'Ein neuer 5 EUR Gutschein steht für die nächste Fahrt bereit.'},
        {title:'Fahrt bestätigt',text:'Ihre geplante Fahrt am 20.06.2026 wurde bestätigt.'},
        {title:'Neues Abzeichen',text:'Abzeichen "Flughafen-Profi" wurde freigeschaltet.'}
      ],
      settings:{
        displayName:'Max Mustermann',
        phone:'07274 3567',
        email:'demo@taxi-germersheim.de',
        language:'de',
        notifications:{
          rideUpdates:true,
          rewardsUpdates:true,
          vouchers:true,
          emailNotifications:true
        }
      }
    };

    function toEuro(value){
      return `${Number(Math.max(0,Number(value) || 0)).toFixed(2).replace('.',',')} EUR`;
    }

    function mergeDefaults(base){
      const data=base && typeof base==='object' ? base : {};

      function resolveRideTypeKey(raw){
        const value=String(raw || '').trim().toLowerCase();
        if(!value) return 'taxi';
        if(value==='taxi' || value.includes('taxi')) return 'taxi';
        if(value==='medical' || value.includes('kranken')) return 'medical';
        if(value==='wheelchair' || value.includes('rollstuhl')) return 'wheelchair';
        if(value==='airport' || value.includes('flughafen')) return 'airport';
        return 'taxi';
      }

      function normalizeRideHistory(list){
        if(!Array.isArray(list) || !list.length) return DEFAULT_STATE.rideHistory.slice();
        return list.map((item,index)=>{
          const rideTypeLabel=String(item?.rideType || '').trim() || 'Taxifahrt';
          const rideTypeKey=resolveRideTypeKey(item?.rideTypeKey || rideTypeLabel);
          return {
            id:String(item?.id || `ride-${index+1}`),
            date:String(item?.date || '-').trim() || '-',
            start:String(item?.start || '-').trim() || '-',
            destination:String(item?.destination || '-').trim() || '-',
            rideType:rideTypeLabel,
            rideTypeKey,
            price:Number.isFinite(Number(item?.price)) ? Number(item.price) : 0,
            pointsEarned:Math.max(0,Math.round(Number(item?.pointsEarned) || 0)),
            voucherUsed:Boolean(item?.voucherUsed)
          };
        });
      }

      function sanitizeSettingText(value,maxLength){
        return String(value || '').trim().slice(0,maxLength);
      }

      function normalizeLanguage(value){
        const lang=String(value || '').trim().toLowerCase();
        return lang==='en' || lang==='tr' ? lang : 'de';
      }

      function normalizeSettings(raw){
        const source=raw && typeof raw==='object' ? raw : {};
        const sourceNotifications=source.notifications && typeof source.notifications==='object' ? source.notifications : {};
        return {
          displayName:sanitizeSettingText(source.displayName || DEFAULT_STATE.settings.displayName,80) || DEFAULT_STATE.settings.displayName,
          phone:sanitizeSettingText(source.phone || DEFAULT_STATE.settings.phone,40) || DEFAULT_STATE.settings.phone,
          email:sanitizeSettingText(source.email || DEFAULT_STATE.settings.email,120) || DEFAULT_STATE.settings.email,
          language:normalizeLanguage(source.language || DEFAULT_STATE.settings.language),
          notifications:{
            rideUpdates:sourceNotifications.rideUpdates===undefined ? DEFAULT_STATE.settings.notifications.rideUpdates : Boolean(sourceNotifications.rideUpdates),
            rewardsUpdates:sourceNotifications.rewardsUpdates===undefined ? DEFAULT_STATE.settings.notifications.rewardsUpdates : Boolean(sourceNotifications.rewardsUpdates),
            vouchers:sourceNotifications.vouchers===undefined ? DEFAULT_STATE.settings.notifications.vouchers : Boolean(sourceNotifications.vouchers),
            emailNotifications:sourceNotifications.emailNotifications===undefined ? DEFAULT_STATE.settings.notifications.emailNotifications : Boolean(sourceNotifications.emailNotifications)
          }
        };
      }

      function normalizeInvoices(list){
        if(!Array.isArray(list) || !list.length) return DEFAULT_STATE.invoices.slice();
        return list.map((item,index)=>{
          const statusRaw=String(item?.status || 'offen').trim().toLowerCase();
          const status=statusRaw==='bezahlt' || statusRaw==='angefragt' ? statusRaw : 'offen';
          return {
            id:String(item?.id || `RG-DEMO-${index+1}`).trim(),
            date:String(item?.date || '-').trim() || '-',
            route:String(item?.route || '-').trim() || '-',
            amount:Number.isFinite(Number(item?.amount)) ? Number(item.amount) : 0,
            status
          };
        });
      }

      return {
        profile:{...DEFAULT_STATE.profile,...(data.profile && typeof data.profile==='object' ? data.profile : {})},
        rideHistory:normalizeRideHistory(data.rideHistory),
        favoriteAddresses:normalizeFavoriteAddresses(data.favoriteAddresses),
        invoices:normalizeInvoices(data.invoices),
        notifications:Array.isArray(data.notifications) && data.notifications.length ? data.notifications : DEFAULT_STATE.notifications.slice(),
        settings:normalizeSettings(data.settings)
      };
    }

    function readState(){
      try{
        const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
        return mergeDefaults(parsed);
      }catch(_err){
        return mergeDefaults(null);
      }
    }

    function writeState(next){
      try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); }catch(_err){}
    }

    function resolveRewardsSnapshot(){
      let points=Math.max(0,Math.round(Number(DEFAULT_STATE.profile.points) || 0));
      let voucherBalance=Math.max(0,Number(DEFAULT_STATE.profile.voucherBalance) || 0);

      try{
        const snapshot=JSON.parse(localStorage.getItem('taxiRewardsEngineState') || '');
        points=Math.max(0,Math.round(Number(snapshot?.points) || points));
        voucherBalance=Math.max(0,Number(snapshot?.voucherBalance) || voucherBalance);
      }catch(_err){
        // Keep account defaults when rewards state is unavailable.
      }

      try{
        const adminState=JSON.parse(localStorage.getItem('taxiRewardsAdminSettlementState') || '');
        const customers=adminState && typeof adminState==='object' && adminState.customers && typeof adminState.customers==='object' ? adminState.customers : null;
        const maxCustomer=customers ? customers['cust-max'] : null;
        const balance=Number(maxCustomer?.voucherBalance);
        if(Number.isFinite(balance)) voucherBalance=Math.max(0,balance);
      }catch(_err){
        // Keep current voucher balance if admin snapshot cannot be parsed.
      }

      return {points,voucherBalance};
    }

    function createHistoryCell(label,value){
      const span=document.createElement('span');
      const tag=document.createElement('b');
      tag.textContent=label;
      span.append(tag,document.createTextNode(String(value || '-')));
      return span;
    }

    function render(state){
      const rewards=resolveRewardsSnapshot();
      state.profile.points=rewards.points;
      state.profile.voucherBalance=rewards.voucherBalance;

      const profileName=$('[data-account-field="name"]',root);
      const memberSince=$('[data-account-field="memberSince"]',root);
      const statusBadge=$('[data-account-field="statusBadge"]',root);
      const customerStatus=$('[data-account-field="customerStatus"]',root);
      const pointsNode=$('[data-account-field="points"]',root);
      const voucherNode=$('[data-account-field="voucherBalance"]',root);
      if(profileName) profileName.textContent=String(state.profile.name || DEFAULT_STATE.profile.name);
      if(memberSince) memberSince.textContent=`Mitglied seit: ${String(state.profile.memberSince || DEFAULT_STATE.profile.memberSince)}`;
      if(statusBadge) statusBadge.textContent=`Status: ${String(state.profile.customerStatus || DEFAULT_STATE.profile.customerStatus)}`;
      if(customerStatus) customerStatus.textContent=String(state.profile.customerStatus || DEFAULT_STATE.profile.customerStatus);
      if(pointsNode) pointsNode.textContent=String(Math.max(0,Math.round(Number(state.profile.points) || 0)));
      if(voucherNode) voucherNode.textContent=toEuro(state.profile.voucherBalance);

      const rideSnapshot=resolveRideTrackingSnapshot(true);
      const currentRideBadge=$('[data-account-field="currentRideBadge"]',root);
      const currentRideRoute=$('[data-account-field="currentRideRoute"]',root);
      const currentRideEta=$('[data-account-field="currentRideEta"]',root);
      const currentRideDriver=$('[data-account-field="currentRideDriver"]',root);
      const currentRideVehicle=$('[data-account-field="currentRideVehicle"]',root);
      const currentRidePlate=$('[data-account-field="currentRidePlate"]',root);
      const currentRideStep=$('[data-account-field="currentRideStep"]',root);
      const currentRidePhoneButton=$('[data-account-field="currentRidePhoneButton"]',root);
      const currentRideNote=$('[data-account-field="currentRideNote"]',root);
      if(rideSnapshot){
        if(currentRideBadge) currentRideBadge.textContent=`Status: ${rideSnapshot.statusLabel}`;
        if(currentRideRoute) currentRideRoute.textContent=rideSnapshot.route;
        if(currentRideEta) currentRideEta.textContent=`Voraussichtliche Ankunft: ${rideSnapshot.arrivalText}`;
        if(currentRideDriver) currentRideDriver.textContent=rideSnapshot.driverName;
        if(currentRideVehicle) currentRideVehicle.textContent=rideSnapshot.vehicleType;
        if(currentRidePlate) currentRidePlate.textContent=rideSnapshot.licensePlate;
        if(currentRideStep) currentRideStep.textContent=rideSnapshot.statusLabel;
        if(currentRidePhoneButton){
          currentRidePhoneButton.setAttribute('href',`tel:${rideSnapshot.phone}`);
          currentRidePhoneButton.textContent='Fahrer anrufen';
        }
        if(currentRideNote) currentRideNote.textContent=rideSnapshot.isCompleted ? 'Fahrt abgeschlossen. Tracking öffnen, Bewertung senden oder erneut buchen.' : 'Status wird als Demo automatisch über lokalen Speicher simuliert.';
      }

      const historyList=$('[data-account-field="rideHistory"]',root);
      if(historyList){
        historyList.innerHTML='';
        state.rideHistory.forEach(entry=>{
          const li=document.createElement('li');
          const rebookWrap=document.createElement('div');
          rebookWrap.className='account-history-action';

          const rebookButton=document.createElement('button');
          rebookButton.type='button';
          rebookButton.className='button secondary account-history-rebook';
          rebookButton.dataset.accountRideAction='rebook';
          rebookButton.dataset.rideId=String(entry?.id || '');
          rebookButton.textContent='Erneut buchen';
          rebookWrap.append(rebookButton);

          li.append(
            createHistoryCell('Datum',entry?.date || '-'),
            createHistoryCell('Abholort',entry?.start || '-'),
            createHistoryCell('Ziel',entry?.destination || '-'),
            createHistoryCell('Fahrtart',entry?.rideType || '-'),
            createHistoryCell('Preis',toEuro(entry?.price)),
            createHistoryCell('Punkte',`+${Math.max(0,Math.round(Number(entry?.pointsEarned) || 0))}`),
            rebookWrap
          );
          historyList.append(li);
        });
      }

      const addressList=$('[data-account-field="favoriteAddresses"]',root);
      if(addressList){
        addressList.innerHTML='';
        state.favoriteAddresses.forEach(item=>{
          const li=document.createElement('li');
          li.className='account-favorite-item';

          const top=document.createElement('div');
          top.className='account-favorite-top';
          const left=document.createElement('span');
          const right=document.createElement('b');
          left.textContent=String(item?.label || 'Adresse');
          right.textContent=String(item?.value || '-');
          top.append(left,right);

          const actions=document.createElement('div');
          actions.className='account-favorite-actions';

          const editButton=document.createElement('button');
          editButton.type='button';
          editButton.className='button secondary';
          editButton.dataset.accountAddressAction='edit';
          editButton.dataset.addressId=String(item?.id || '');
          editButton.textContent='Bearbeiten';

          const removeButton=document.createElement('button');
          removeButton.type='button';
          removeButton.className='button secondary';
          removeButton.dataset.accountAddressAction='delete';
          removeButton.dataset.addressId=String(item?.id || '');
          removeButton.textContent='Löschen';

          const pickupButton=document.createElement('button');
          pickupButton.type='button';
          pickupButton.className='button';
          pickupButton.dataset.accountAddressAction='pickup';
          pickupButton.dataset.addressId=String(item?.id || '');
          pickupButton.textContent='Als Abholort verwenden';

          const destinationButton=document.createElement('button');
          destinationButton.type='button';
          destinationButton.className='button';
          destinationButton.dataset.accountAddressAction='destination';
          destinationButton.dataset.addressId=String(item?.id || '');
          destinationButton.textContent='Als Ziel verwenden';

          actions.append(editButton,removeButton,pickupButton,destinationButton);
          li.append(top,actions);
          addressList.append(li);
        });
      }

      const invoiceList=$('[data-account-field="invoices"]',root);
      if(invoiceList){
        invoiceList.innerHTML='';
        state.invoices.forEach(item=>{
          const li=document.createElement('li');
          const top=document.createElement('div');
          top.className='account-invoice-top';

          const title=document.createElement('strong');
          title.textContent=String(item?.id || 'RG-0000');

          const status=document.createElement('span');
          const statusRaw=String(item?.status || 'offen').toLowerCase();
          const statusLabel=statusRaw==='bezahlt' ? 'Bezahlt' : statusRaw==='angefragt' ? 'Angefragt' : 'Offen';
          const statusClass=statusRaw==='bezahlt' ? 'is-paid' : statusRaw==='angefragt' ? 'is-requested' : 'is-open';
          status.className=`account-invoice-status ${statusClass}`;
          status.textContent=statusLabel;
          top.append(title,status);

          const meta=document.createElement('p');
          meta.className='account-invoice-meta';
          meta.textContent=`${String(item?.date || '-')} • ${toEuro(item?.amount)}`;

          const route=document.createElement('p');
          route.className='account-invoice-route';
          route.append(Object.assign(document.createElement('b'),{textContent:'Fahrtstrecke'}),document.createTextNode(String(item?.route || '-')));

          const actions=document.createElement('div');
          actions.className='account-invoice-actions';

          const viewButton=document.createElement('button');
          viewButton.type='button';
          viewButton.className='button secondary';
          viewButton.dataset.accountInvoiceAction='view';
          viewButton.dataset.invoiceId=String(item?.id || '');
          viewButton.textContent='Anzeigen';

          const pdfButton=document.createElement('button');
          pdfButton.type='button';
          pdfButton.className='button secondary';
          pdfButton.dataset.accountInvoiceAction='pdf';
          pdfButton.dataset.invoiceId=String(item?.id || '');
          pdfButton.textContent='PDF vorbereiten';

          const emailButton=document.createElement('button');
          emailButton.type='button';
          emailButton.className='button secondary';
          emailButton.dataset.accountInvoiceAction='email';
          emailButton.dataset.invoiceId=String(item?.id || '');
          emailButton.textContent='Per E-Mail anfragen';

          actions.append(viewButton,pdfButton,emailButton);

          li.append(top,meta,route,actions);
          invoiceList.append(li);
        });
      }

      const notificationList=$('[data-account-field="notifications"]',root);
      if(notificationList){
        notificationList.innerHTML='';
        state.notifications.forEach(item=>{
          const li=document.createElement('li');
          const dot=document.createElement('span');
          dot.className='account-notification-dot';

          const copy=document.createElement('div');
          copy.className='account-notification-copy';
          const title=document.createElement('strong');
          const text=document.createElement('p');
          title.textContent=String(item?.title || 'Hinweis');
          text.textContent=String(item?.text || 'Keine Details verfügbar.');
          copy.append(title,text);

          li.append(dot,copy);
          notificationList.append(li);
        });
      }

      const displayNameInput=$('[data-account-setting="displayName"]',root);
      const phoneInput=$('[data-account-setting="phone"]',root);
      const emailInput=$('[data-account-setting="email"]',root);
      const languageInput=$('[data-account-setting="language"]',root);
      const notifyRideInput=$('[data-account-setting="notifyRideUpdates"]',root);
      const notifyRewardsInput=$('[data-account-setting="notifyRewardsUpdates"]',root);
      const notifyVouchersInput=$('[data-account-setting="notifyVouchers"]',root);
      const notifyEmailInput=$('[data-account-setting="notifyEmail"]',root);
      if(displayNameInput) displayNameInput.value=String(state.settings.displayName || DEFAULT_STATE.settings.displayName);
      if(phoneInput) phoneInput.value=String(state.settings.phone || '');
      if(emailInput) emailInput.value=String(state.settings.email || '');
      if(languageInput) languageInput.value=String(state.settings.language || 'de');
      if(notifyRideInput) notifyRideInput.checked=Boolean(state.settings.notifications?.rideUpdates);
      if(notifyRewardsInput) notifyRewardsInput.checked=Boolean(state.settings.notifications?.rewardsUpdates);
      if(notifyVouchersInput) notifyVouchersInput.checked=Boolean(state.settings.notifications?.vouchers);
      if(notifyEmailInput) notifyEmailInput.checked=Boolean(state.settings.notifications?.emailNotifications);
    }

    let editingAddressId='';

    function setFavoriteStatus(message){
      const node=$('[data-account-field="favoritesStatus"]',root);
      if(node) node.textContent=message;
    }

    function setInvoiceStatus(message){
      const node=$('[data-account-field="invoiceStatus"]',root);
      if(node) node.textContent=message;
    }

    function applyAddressToBooking(role,address){
      const text=String(address || '').trim();
      if(!text) return;
      if(role==='pickup') saveBookingBridgeState({pickup:text});
      if(role==='destination') saveBookingBridgeState({destination:text});

      const startField=$('#startAddress');
      const targetField=$('#targetAddress');
      if(role==='pickup' && startField) startField.value=text;
      if(role==='destination' && targetField) targetField.value=text;

      if(startField || targetField){
        validate();
        syncBookingSummary();
        if((startField?.value?.trim() || '') && (targetField?.value?.trim() || '')) syncBookingRouteMetrics();
        if(hasExternalConsent()) refreshMapContainers();
      }
    }

    function resolveRideTypeKey(raw){
      const value=String(raw || '').trim().toLowerCase();
      if(!value) return 'taxi';
      if(value==='taxi' || value.includes('taxi')) return 'taxi';
      if(value==='medical' || value.includes('kranken')) return 'medical';
      if(value==='wheelchair' || value.includes('rollstuhl')) return 'wheelchair';
      if(value==='airport' || value.includes('flughafen')) return 'airport';
      return 'taxi';
    }

    function rebookRide(entry){
      const pickup=String(entry?.start || '').trim();
      const destination=String(entry?.destination || '').trim();
      if(!pickup || !destination || pickup==='-' || destination==='-'){
        setFavoriteStatus('Rebooking nicht möglich: Abholort oder Ziel fehlt.');
        return;
      }

      const rideType=resolveRideTypeKey(entry?.rideTypeKey || entry?.rideType);
      writeBookingRebookState({pickup,destination,rideType});
      saveBookingBridgeState({pickup,destination,rideType});
      window.location.href='index.html?page=booking';
    }

    function rebookCurrentRide(snapshot){
      if(!snapshot) return;
      writeBookingRebookState({pickup:snapshot.pickup,destination:snapshot.destination,rideType:snapshot.rideType});
      saveBookingBridgeState({pickup:snapshot.pickup,destination:snapshot.destination,rideType:snapshot.rideType});
      window.location.href='index.html?page=booking';
    }

    const state=readState();
    writeState(state);
    render(state);

    const addAddressForm=$('[data-account-action="add-address"]',root);
    const customAddressInput=$('#accountCustomAddress',root);
    if(addAddressForm && customAddressInput){
      addAddressForm.addEventListener('submit',event=>{
        event.preventDefault();
        const value=String(customAddressInput.value || '').trim();
        if(value.length<4) return;
        const next=readState();
        const submitButton=$('[data-account-field="addressSubmitButton"]',root);

        if(editingAddressId){
          next.favoriteAddresses=next.favoriteAddresses.map(item=>{
            if(String(item?.id || '')!==editingAddressId) return item;
            return {...item,value};
          });
          setFavoriteStatus('Adresse aktualisiert.');
        }else{
          const customCount=next.favoriteAddresses.filter(item=>String(item?.label || '').toLowerCase().startsWith('eigene adresse')).length;
          next.favoriteAddresses.unshift({
            id:`addr-custom-${Date.now()}`,
            label:customCount>0 ? `Eigene Adresse ${customCount+1}` : 'Eigene Adresse',
            value
          });
          setFavoriteStatus('Adresse gespeichert.');
        }

        next.favoriteAddresses=next.favoriteAddresses.slice(0,8);
        writeState(next);
        writeCustomerFavoriteAddresses(next.favoriteAddresses);
        customAddressInput.value='';
        editingAddressId='';
        if(submitButton) submitButton.textContent='Adresse speichern';
        render(next);
        renderBookingFavoriteAddresses();
      });
    }

    const favoritesList=$('[data-account-field="favoriteAddresses"]',root);
    if(favoritesList){
      favoritesList.addEventListener('click',event=>{
        const button=event.target.closest('[data-account-address-action]');
        if(!button) return;
        const action=String(button.dataset.accountAddressAction || '').trim().toLowerCase();
        const addressId=String(button.dataset.addressId || '').trim();
        if(!action || !addressId) return;

        const next=readState();
        const entry=next.favoriteAddresses.find(item=>String(item?.id || '')===addressId);
        if(!entry) return;

        if(action==='edit'){
          const submitButton=$('[data-account-field="addressSubmitButton"]',root);
          if(customAddressInput) customAddressInput.value=String(entry.value || '');
          editingAddressId=addressId;
          if(submitButton) submitButton.textContent='Adresse aktualisieren';
          customAddressInput?.focus();
          setFavoriteStatus(`Bearbeiten aktiv: ${String(entry.label || 'Adresse')}`);
          return;
        }

        if(action==='delete'){
          next.favoriteAddresses=next.favoriteAddresses.filter(item=>String(item?.id || '')!==addressId);
          if(!next.favoriteAddresses.length) next.favoriteAddresses=getDefaultFavoriteAddresses();
          writeState(next);
          writeCustomerFavoriteAddresses(next.favoriteAddresses);
          render(next);
          renderBookingFavoriteAddresses();
          setFavoriteStatus('Adresse gelöscht.');
          return;
        }

        if(action==='pickup' || action==='destination'){
          applyAddressToBooking(action,String(entry.value || ''));
          setFavoriteStatus(action==='pickup' ? 'Adresse als Abholort gespeichert.' : 'Adresse als Ziel gespeichert.');
        }
      });
    }

    const invoiceList=$('[data-account-field="invoices"]',root);
    if(invoiceList){
      invoiceList.addEventListener('click',event=>{
        const button=event.target.closest('[data-account-invoice-action]');
        if(!button) return;

        const action=String(button.dataset.accountInvoiceAction || '').trim().toLowerCase();
        const invoiceId=String(button.dataset.invoiceId || '').trim();
        if(!action || !invoiceId) return;

        const next=readState();
        const entry=next.invoices.find(item=>String(item?.id || '')===invoiceId);
        if(!entry) return;

        if(action==='view'){
          setInvoiceStatus(`Demo-Ansicht vorbereitet: ${entry.id} | ${entry.date} | ${entry.route} | ${toEuro(entry.amount)}.`);
          return;
        }

        if(action==='pdf'){
          setInvoiceStatus(`PDF-Vorbereitung als Demo markiert für ${entry.id}. Es wird keine echte PDF erstellt.`);
          return;
        }

        if(action==='email'){
          if(entry.status!=='angefragt') entry.status='angefragt';
          writeState(next);
          render(next);
          setInvoiceStatus(`E-Mail-Anfrage als Demo gespeichert für ${entry.id}. Es wird keine echte E-Mail gesendet.`);
        }
      });
    }

    const historyList=$('[data-account-field="rideHistory"]',root);
    if(historyList){
      historyList.addEventListener('click',event=>{
        const button=event.target.closest('[data-account-ride-action="rebook"]');
        if(!button) return;

        const rideId=String(button.dataset.rideId || '').trim();
        if(!rideId) return;

        const next=readState();
        const entry=next.rideHistory.find(item=>String(item?.id || '')===rideId);
        if(!entry) return;
        rebookRide(entry);
      });
    }

    const settingsForm=$('[data-account-action="save-settings"]',root);
    const settingsStatus=$('[data-account-field="settingsStatus"]',root);
    const settingsResetButton=$('[data-account-action="reset-settings"]',root);
    const settingsExportButton=$('[data-account-action="export-data"]',root);
    const settingsDeleteButton=$('[data-account-action="delete-account"]',root);

    function setSettingsStatus(message){
      if(settingsStatus) settingsStatus.textContent=message;
    }

    function sanitizeSettingText(value,maxLength){
      return String(value || '').trim().slice(0,maxLength);
    }

    function normalizeLanguage(value){
      const lang=String(value || '').trim().toLowerCase();
      return lang==='en' || lang==='tr' ? lang : 'de';
    }

    function buildSettingsFromInputs(){
      const displayNameInput=$('[data-account-setting="displayName"]',root);
      const phoneInput=$('[data-account-setting="phone"]',root);
      const emailInput=$('[data-account-setting="email"]',root);
      const languageInput=$('[data-account-setting="language"]',root);
      const notifyRideInput=$('[data-account-setting="notifyRideUpdates"]',root);
      const notifyRewardsInput=$('[data-account-setting="notifyRewardsUpdates"]',root);
      const notifyVouchersInput=$('[data-account-setting="notifyVouchers"]',root);
      const notifyEmailInput=$('[data-account-setting="notifyEmail"]',root);

      return {
        displayName:sanitizeSettingText(displayNameInput?.value || DEFAULT_STATE.settings.displayName,80) || DEFAULT_STATE.settings.displayName,
        phone:sanitizeSettingText(phoneInput?.value || DEFAULT_STATE.settings.phone,40) || DEFAULT_STATE.settings.phone,
        email:sanitizeSettingText(emailInput?.value || DEFAULT_STATE.settings.email,120) || DEFAULT_STATE.settings.email,
        language:normalizeLanguage(languageInput?.value || DEFAULT_STATE.settings.language),
        notifications:{
          rideUpdates:Boolean(notifyRideInput?.checked),
          rewardsUpdates:Boolean(notifyRewardsInput?.checked),
          vouchers:Boolean(notifyVouchersInput?.checked),
          emailNotifications:Boolean(notifyEmailInput?.checked)
        }
      };
    }

    if(settingsForm){
      settingsForm.addEventListener('submit',event=>{
        event.preventDefault();
        const next=readState();
        next.settings=buildSettingsFromInputs();
        next.profile.name=next.settings.displayName || DEFAULT_STATE.profile.name;

        writeState(next);
        render(next);
        setSettingsStatus(`Einstellungen lokal gespeichert (${new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}).`);
      });
    }

    if(settingsResetButton){
      settingsResetButton.addEventListener('click',()=>{
        const next=readState();
        next.settings=JSON.parse(JSON.stringify(DEFAULT_STATE.settings));
        next.profile.name=DEFAULT_STATE.profile.name;
        writeState(next);
        render(next);
        setSettingsStatus('Einstellungen auf Demo-Standard zurückgesetzt.');
      });
    }

    if(settingsExportButton){
      settingsExportButton.addEventListener('click',()=>{
        const current=readState();
        const exportPayload={
          exportType:'taxi-customer-account-demo',
          exportedAt:new Date().toISOString(),
          profile:{
            name:String(current.profile?.name || DEFAULT_STATE.profile.name),
            memberSince:String(current.profile?.memberSince || DEFAULT_STATE.profile.memberSince),
            customerStatus:String(current.profile?.customerStatus || DEFAULT_STATE.profile.customerStatus)
          },
          settings:current.settings,
          rideHistory:current.rideHistory
        };

        const blob=new Blob([JSON.stringify(exportPayload,null,2)],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=`taxi-account-demo-export-${Date.now()}.json`;
        document.body.append(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setSettingsStatus('Demo-Datenexport wurde lokal erstellt.');
      });
    }

    if(settingsDeleteButton){
      settingsDeleteButton.addEventListener('click',()=>{
        const next=mergeDefaults(null);
        writeState(next);
        render(next);
        setSettingsStatus('Demo-Konto wurde lokal zurückgesetzt (keine echte Löschung).');
      });
    }

  }

  function initRideStatusTracking(){
    const root=$('#ride-status.ride-status-page');
    if(!root) return;

    const timeline=$('[data-ride-track-timeline]',root);
    const badge=$('[data-ride-track-badge]',root);
    const summary=$('[data-ride-track-summary]',root);
    const routeNode=$('[data-ride-track-route]',root);
    const driverNameNode=$('[data-ride-track-driver-name]',root);
    const vehicleNode=$('[data-ride-track-vehicle]',root);
    const plateNode=$('[data-ride-track-plate]',root);
    const etaNode=$('[data-ride-track-eta]',root);
    const phoneNode=$('[data-ride-track-phone]',root);
    const completeNode=$('[data-ride-track-complete]',root);
    const feedbackNode=$('[data-ride-track-feedback]',root);
    let timerId=0;

    function setFeedback(message){
      if(!feedbackNode) return;
      feedbackNode.textContent=message;
      feedbackNode.hidden=!message;
    }

    function renderRideStatus(){
      const snapshot=resolveRideTrackingSnapshot(true);
      if(!snapshot || !timeline) return;

      if(badge) badge.textContent=snapshot.statusLabel;
      if(summary) summary.textContent=`${snapshot.customerName}, Ihre Fahrt von ${snapshot.pickup} nach ${snapshot.destination} befindet sich aktuell im Status „${snapshot.statusLabel}“.`;
      if(routeNode) routeNode.textContent=snapshot.route;
      if(driverNameNode) driverNameNode.textContent=snapshot.driverName;
      if(vehicleNode) vehicleNode.textContent=snapshot.vehicleType;
      if(plateNode) plateNode.textContent=snapshot.licensePlate;
      if(etaNode) etaNode.textContent=snapshot.arrivalText;
      if(phoneNode) phoneNode.setAttribute('href',`tel:${snapshot.phone}`);
      if(completeNode) completeNode.hidden=!snapshot.isCompleted;

      timeline.innerHTML='';
      snapshot.steps.forEach(step=>{
        const li=document.createElement('li');
        if(step.isComplete) li.classList.add('is-complete');
        if(step.isActive) li.classList.add('is-active');

        const dot=document.createElement('span');
        dot.className='ride-track-dot';
        dot.setAttribute('aria-hidden','true');

        const copy=document.createElement('div');
        copy.className='ride-track-step';
        const title=document.createElement('strong');
        title.textContent=step.label;
        const detail=document.createElement('small');
        detail.textContent=step.detail;
        copy.append(title,detail);

        li.append(dot,copy);
        timeline.append(li);
      });
    }

    renderRideStatus();
    document.addEventListener('ride-tracking:update',renderRideStatus);
    timerId=window.setInterval(renderRideStatus,10000);

    root.addEventListener('click',event=>{
      const actionButton=event.target.closest('[data-current-ride-action]');
      if(!actionButton) return;

      const action=String(actionButton.dataset.currentRideAction || '').trim().toLowerCase();
      const snapshot=resolveRideTrackingSnapshot(true);
      if(!snapshot) return;

      if(action==='rate'){
        writeRideTrackingState({...snapshot,ratingSubmitted:true});
        setFeedback('Danke. Ihre Bewertung ist als Demo vorgemerkt und wird später mit dem Kundenkonto verbunden.');
        renderRideStatus();
        return;
      }

      if(action==='rebook'){
        writeBookingRebookState({pickup:snapshot.pickup,destination:snapshot.destination,rideType:snapshot.rideType});
        saveBookingBridgeState({pickup:snapshot.pickup,destination:snapshot.destination,rideType:snapshot.rideType});
        window.location.href='index.html?page=booking';
        return;
      }
    });

    window.addEventListener('beforeunload',()=>{
      if(timerId) clearInterval(timerId);
    },{once:true});
  }
  function hideSplash(){
    const splash=document.getElementById('splash');
    if(!splash) return;
    splash.classList.add('splash-hide');
    setTimeout(()=>{
      splash.remove();
    },700);
  }
  function boot(){
    inject();
    setService('taxi');
    initPremiumBookingFlow();
    validate();
    initMapContainer('startMapContainer');
    initMapContainer('bookingRouteMapContainer');
    setTimeout(hideSplash,1200);
    initMedicalAssistant();
    initMedicalBookingScroll();
    const nav=initPremiumNavigation();
    initFaqCenter();
    initCookieBanner();
    initContactRequestForm();
    initRideStatusTracking();
    initCustomerAccountRewardsBridge();
    initRewardsEngine();
    initRewardsWheel();
    initRewardsVoucherBalance();
    initRewardsRideBookingDemo();
    initRewardsAdminSettlement();
    initRewardsCustomerDashboard();
    initRewardsVipStatus();
    initRewardsMysteryBox();
    initRewardsDailyStreak();
    initRewardsDailyMissions();
    initRewardsWeeklyMissions();
    initRewardsSpecialMissions();
    initRewardsAchievements();
    initRewardsCollection();
    initRewardsMissions();
    initRewardsSeasonalEvents();
    initRewardsYumakAssistant();
    initRewardsActivities();
    initRewardsUnifiedDashboard();

    const initialScreen=resolveInitialScreen();
    if(initialScreen) show(initialScreen);

    // Single delegation point keeps interaction logic centralized and avoids many per-node listeners.
    document.addEventListener('click',e=>handleGlobalClick(e,nav));
    document.addEventListener('input',handleGlobalInput,true);
    document.addEventListener('keydown',handleGlobalKeydown,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
