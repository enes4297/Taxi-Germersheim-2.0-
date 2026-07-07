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
    {title:'Nierenzentrum Germersheim',street:'Josef-Probst-Strasse 5',postalCode:'76726',city:'Germersheim',group:'Dialysezentren',type:'clinic',scope:'destination'},
    {title:'Dialysezentrum Speyer',street:'Iggelheimer Strasse 26',postalCode:'67346',city:'Speyer',group:'Dialysezentren',type:'clinic',scope:'destination'},
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
    {street:'Hauptstrasse 12',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Luitpoldplatz 3',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Kirchstrasse 8',postalCode:'76726',city:'Sondernheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Lingenfelder Strasse 4',postalCode:'67360',city:'Lingenfeld',group:'Adresse',type:'street',scope:'both'},
    {street:'Karlstrasse 17',postalCode:'76756',city:'Bellheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Schulstrasse 6',postalCode:'76771',city:'Hördt',group:'Adresse',type:'street',scope:'both'},
    {street:'Germersheimer Strasse 22',postalCode:'76761',city:'Rülzheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Rheinzaberner Strasse 14',postalCode:'76773',city:'Kuhardt',group:'Adresse',type:'street',scope:'both'},
    {street:'Hafenstrasse 9',postalCode:'76774',city:'Leimersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Lange Strasse 11',postalCode:'76777',city:'Neupotz',group:'Adresse',type:'street',scope:'both'},
    {street:'Jockgrimer Strasse 27',postalCode:'76764',city:'Rheinzabern',group:'Adresse',type:'street',scope:'both'},
    {street:'Bahnhofstrasse 19',postalCode:'76751',city:'Jockgrim',group:'Adresse',type:'street',scope:'both'},
    {street:'Mozartstrasse 5',postalCode:'76744',city:'Wörth am Rhein',group:'Adresse',type:'street',scope:'both'},
    {street:'Adenauerpark 2',postalCode:'67346',city:'Speyer',group:'Adresse',type:'street',scope:'both'},
    {street:'Queichheimer Hauptstrasse 18',postalCode:'76829',city:'Landau',group:'Adresse',type:'street',scope:'both'},
    {street:'Kaiserallee 31',postalCode:'76133',city:'Karlsruhe',group:'Adresse',type:'street',scope:'both'},
    {street:'Augustaanlage 42',postalCode:'68165',city:'Mannheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Bergheimer Strasse 55',postalCode:'69115',city:'Heidelberg',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrich-Ebert-Strasse 7',postalCode:'76726',city:'Germersheim',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrichstrasse 24',postalCode:'67346',city:'Speyer',group:'Adresse',type:'street',scope:'both'},
    {street:'Friedrich-Ebert-Anlage 16',postalCode:'69117',city:'Heidelberg',group:'Adresse',type:'street',scope:'both'}
  ];
  let addressConfigCache=null;
  let streetDirectoryCache=null;
  let mapContainers={};
  const CONSENT_STORAGE_KEY='taxiGermersheimCookieConsent';
  const CONSENT_ALL='all';
  const CONSENT_NECESSARY='necessary';
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
    const defaultQuery='Taxi Germersheim GmbH Friedrich-Ebert-Strasse 8 76726 Germersheim';
    if(elementId==='startMapContainer') return $('#startAddress')?.value?.trim() || defaultQuery;
    if(elementId==='endMapContainer') return $('#targetAddress')?.value?.trim() || defaultQuery;
    return defaultQuery;
  }
  function getMapEmbedUrl(elementId){
    const query=getMapQueryForContainer(elementId);
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
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
    box.innerHTML='<p>Google Maps wird erst geladen, wenn externe Dienste akzeptiert wurden.</p><button type="button" class="map-consent-btn" data-map-action="load">Google Maps laden</button>';
    container.appendChild(box);
  }
  function loadMapIntoContainer(container,elementId){
    if(!container) return;
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
        form.reset();
        syncFormState();
        setStatus('Ihre Anfrage wurde erfolgreich gesendet.',false);
      }catch(error){
        if(error?.message==='not_configured'){
          setStatus('Der Versanddienst ist noch nicht verbunden. Bitte rufen Sie uns an oder schreiben Sie per WhatsApp.',true);
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
      el.innerHTML=icons[el.dataset.icon]||'';
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
    selectedTitle.textContent=services[s][0];
    serviceLabel.textContent=services[s][1];
    $$('.type-grid button').forEach(b=>b.classList.toggle('active',b.dataset.serviceSelect===s));
    medicalPanel.classList.toggle('hidden',s!=='medical');
  }
  function validate(){
    const start=$('#startAddress');
    const target=$('#targetAddress');
    const phone=$('#customerPhone');
    const send=$('#sendRequest');
    if(!start || !target || !phone || !send) return;
    const ok=start.value.trim()&&target.value.trim()&&phone.value.trim();
    send.textContent=ok?'Fahrtanfrage senden':'Fahrtanfrage nicht möglich';
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

    const serviceSelect=e.target.closest('[data-service-select]');
    if(serviceSelect){
      setService(serviceSelect.dataset.serviceSelect);
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
      return;
    }

    const locationButton=e.target.closest('#locationBtn');
    if(locationButton){
      getLocation();
      return;
    }

    const chip=e.target.closest('.details button,.chips button,.small-toggle button');
    if(chip) handleChipClick(chip);
  }

  function handleGlobalInput(e){
    validate();
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
          {key:'no-win',icon:'❌',label:'Niete',desc:'Kein Gewinn',message:'Heute leider kein Gewinn. Morgen wartet die naechste Chance.',win:false,effect:'no-win'},
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
          document.dispatchEvent(new CustomEvent('rewards:wheelResult',{
            detail:{
              win:Boolean(selectedSegment.win),
              effect:selectedSegment.effect || (selectedSegment.win ? 'points' : 'no-win'),
              label:selectedSegment.label || '',
              message:selectedSegment.message || ''
            }
          }));

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

            svgBuild?.segmentPaths?.[finalIndex]?.classList.add('is-hit');
            svgBuild?.labelGroups?.[finalIndex]?.classList.add('is-hit');
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

    const fareInput=$('[data-credit-fare]',root);
    const availableInput=$('[data-credit-available]',root);
    const applyInput=$('[data-credit-apply]',root);
    const restField=$('[data-credit-rest]',root);
    const balanceField=$('[data-credit-balance-value]',root);

    if(!fareInput || !availableInput || !applyInput || !restField) return;

    // Demo-only calculation layer. This structure is ready for future backend values.
    function toEuroNumber(value){
      const parsed=Number(String(value).replace(',','.'));
      return Number.isFinite(parsed) ? Math.max(0,parsed) : 0;
    }

    function formatEuro(value){
      return `${value.toFixed(2).replace('.',',')} �`;
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

    ['input','change'].forEach(eventName=>{
      fareInput.addEventListener(eventName,recalc);
      availableInput.addEventListener(eventName,recalc);
      applyInput.addEventListener(eventName,recalc);
    });

    recalc();
  }
  function initRewardsCustomerDashboard(){
    const root=$('#rewards.rewards-v2 [data-rewards-customer-dashboard]');
    if(!root) return;

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
  }
  function initRewardsVipStatus(){
    const root=$('#rewards.rewards-v2 [data-rewards-vip-status]');
    if(!root) return;

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
  }
  function initRewardsMysteryBox(){
    const root=$('#rewards.rewards-v2 [data-rewards-mystery-box]');
    if(!root) return;

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

      setTimeout(()=>{
        root.classList.remove('is-opening');
        const reward=rewards[Math.floor(Math.random()*rewards.length)];

        resultIcon.textContent=reward.icon;
        resultTitle.textContent=reward.title;
        resultText.textContent=reward.text;
        resultCard.hidden=false;
        resultCard.classList.remove('is-visible');
        requestAnimationFrame(()=>resultCard.classList.add('is-visible'));
        createConfettiBurst(reward.win);

        writeState({lastOpenedDate:getTodayYmd(),lastRewardId:reward.id});
        applyAvailability();
      },520);
    });

    applyAvailability();
  }
  function initRewardsDailyStreak(){
    const root=$('#rewards.rewards-v2 [data-rewards-daily-streak]');
    if(!root) return;

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
      });
    }

    render();
  }
  function initRewardsDailyMissions(){
    const root=$('#rewards.rewards-v2 [data-rewards-daily-missions]');
    if(!root) return;

    const cards=$$('[data-daily-mission-id]',root);
    if(!cards.length) return;

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

    const missionCards=$$('[data-mission-id]',root);
    if(!missionCards.length) return;

    const statusLabelMap={
      active:'Aktiv',
      done:'Abgeschlossen',
      locked:'Gesperrt'
    };

    missionCards.forEach(card=>{
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
      if(progressText && !progressText.textContent.trim()){
        progressText.textContent=`${Math.min(current,target)} / ${target}`;
      }
    });
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
      'extra-spin':'Extra-Dreh! Wir legen direkt nach.',
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
        root.dataset.yumakMode=state.spinning ? 'watching' : 'idle';
      };
      const observer=new MutationObserver(updateSpinMode);
      observer.observe(spinWidget,{attributes:true,attributeFilter:['class']});
      updateSpinMode();
    }

    document.addEventListener('rewards:wheelResult',event=>{
      const detail=event && event.detail ? event.detail : {};
      const effect=String(detail.effect || (detail.win ? 'points' : 'no-win')).trim().toLowerCase();
      setReaction(effect);

      const reactionText=wheelReactions[effect] || (detail.win ? wheelReactions.points : wheelReactions['no-win']);
      showTipText(reactionText);

      if(effect==='extra-spin') sparkleBurst('extra-spin');
      else if(effect==='mystery') sparkleBurst('mystery');
      else if(effect==='voucher') sparkleBurst('voucher');
      else if(effect==='no-win') sparkleBurst('nowin');
      else sparkleBurst('win');

      queueAutoTip();
    });

    createAmbientParticles();
    queueAutoTip();
    scheduleBlink();
    scheduleEarTwitch();
    frameId=requestAnimationFrame(animate);
  }
  function initRewardsActivities(){
    const root=$('#rewards.rewards-v2 [data-rewards-activities]');
    if(!root) return;

    const filterButtons=$$('[data-activity-filter]',root);
    const items=$$('[data-activity-type]',root);
    if(!filterButtons.length || !items.length) return;

    function applyFilter(filter){
      items.forEach(item=>{
        const type=String(item.dataset.activityType || '').trim().toLowerCase();
        item.hidden=!(filter==='all' || type===filter);
      });

      filterButtons.forEach(button=>{
        const active=(button.dataset.activityFilter===filter);
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-selected',active ? 'true' : 'false');
      });
    }

    filterButtons.forEach(button=>{
      button.addEventListener('click',()=>{
        applyFilter(button.dataset.activityFilter || 'all');
      });
    });

    applyFilter('all');
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
    validate();
    initMapContainer('startMapContainer');
    initMapContainer('endMapContainer');
    setTimeout(hideSplash,1200);
    initMedicalAssistant();
    initMedicalBookingScroll();
    const nav=initPremiumNavigation();
    initFaqCenter();
    initCookieBanner();
    initContactRequestForm();
    initRewardsWheel();
    initRewardsVoucherBalance();
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

    const initialScreen=resolveInitialScreen();
    if(initialScreen) show(initialScreen);

    // Single delegation point keeps interaction logic centralized and avoids many per-node listeners.
    document.addEventListener('click',e=>handleGlobalClick(e,nav));
    document.addEventListener('input',handleGlobalInput,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
