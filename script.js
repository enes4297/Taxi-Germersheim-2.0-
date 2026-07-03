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
  let startMarker=null,endMarker=null,mapContainers={};
  const CONSENT_KEY='tg_consent_v1';
  const defaultConsent={necessary:true,external:false,updatedAt:0};
  let consentState={...defaultConsent};

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
    const active=document.activeElement;

    if(event.shiftKey && active===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey && active===last){
      event.preventDefault();
      first.focus();
    }
  }

  function normalizeText(value){
    return (value||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').trim();
  }

  function buildAddressLabel(item){
    const streetLine=[item.street,item.houseNumber].filter(Boolean).join(' ').trim();
    const cityLine=[item.postalCode,item.city].filter(Boolean).join(' ').trim();
    const district=item.district||'';
    const locality=[cityLine,district].filter(Boolean).join(' ');
    return [item.title,streetLine,locality].filter(Boolean).join(', ');
  }

  function createAddressView(item){
    const streetLine=[item.street,item.houseNumber].filter(Boolean).join(' ').trim();
    const cityLine=[item.postalCode,item.city].filter(Boolean).join(' ');
    const district=item.district||'';
    const locality=[cityLine,district].filter(Boolean).join(' ');
    const primary=item.title || streetLine || 'Adresse';
    const secondary=item.title ? [streetLine,locality].filter(Boolean).join(' - ') : locality;
    return {
      primary,
      secondary,
      label:buildAddressLabel(item),
      group:item.group||'Adresse'
    };
  }

  async function loadAddressConfig(){
    if(addressConfigCache) return addressConfigCache;
    try{
      const configUrl=new URL('assets/data/address-config.json',document.baseURI).toString();
      const response=await fetch(configUrl,{cache:'no-store'});
      if(!response.ok) throw new Error('config-not-found');
      const raw=await response.json();
      addressConfigCache={
        allowedCities:Array.isArray(raw.allowedCities)?raw.allowedCities:defaultAddressConfig.allowedCities,
        popularPlaces:Array.isArray(raw.popularPlaces)?raw.popularPlaces:defaultAddressConfig.popularPlaces
      };
    }catch(_err){
      addressConfigCache=defaultAddressConfig;
    }
    return addressConfigCache;
  }

  function createStreetDirectoryFallback(){
    return fallbackAddressDataset
      .filter(item=>item.type==='street')
      .map(item=>({
        street:item.street||'',
        city:item.city||'',
        postalCode:item.postalCode||'',
        district:item.district||'',
        houseNumbers:['1','2','3','4','5','6','7','8'],
        type:'street'
      }));
  }

  async function loadStreetDirectory(){
    if(streetDirectoryCache) return streetDirectoryCache;
    try{
      const streetsUrl=new URL('assets/data/streets-germersheim.json',document.baseURI).toString();
      const response=await fetch(streetsUrl,{cache:'no-store'});
      if(!response.ok) throw new Error('street-directory-not-found');
      const raw=await response.json();
      streetDirectoryCache=Array.isArray(raw)?raw:createStreetDirectoryFallback();
    }catch(_err){
      streetDirectoryCache=createStreetDirectoryFallback();
    }
    return streetDirectoryCache;
  }

  function parseStreetQuery(query){
    const compact=(query||'').replace(/\s+/g,' ').trim();
    const numberMatches=compact.match(/\b(\d{1,4}[a-zA-Z]?)\b/g)||[];
    const houseNumberToken=numberMatches.find(token=>token.length<=5) || '';
    const queryWithoutHouseNumber=houseNumberToken
      ? compact.replace(new RegExp(`\\b${houseNumberToken}\\b`,'i'),' ').replace(/\s+/g,' ').trim()
      : compact;
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
  function hasExternalConsent(){
    return !!consentState.external;
  }
  function renderMapPlaceholder(container){
    if(!container) return;
    container.innerHTML='';
    const box=document.createElement('div');
    box.className='map-consent-placeholder';
    box.innerHTML='<p>Google Maps wird erst geladen, wenn Sie externe Dienste akzeptieren.</p><button type="button" class="map-consent-btn" data-map-consent="accept">Google Maps akzeptieren und laden</button>';
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
    const container=$(elementId);
    if(!container) return null;
    mapContainers[elementId]=container;
    refreshMapContainers();
    return container;
  }
  function parseStoredConsent(){
    try{
      const raw=localStorage.getItem(CONSENT_KEY);
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      return {
        necessary:true,
        external:!!parsed.external,
        updatedAt:Number(parsed.updatedAt)||Date.now()
      };
    }catch(_err){
      return null;
    }
  }
  function saveConsent(next){
    consentState={
      necessary:true,
      external:!!next.external,
      updatedAt:Date.now()
    };
    localStorage.setItem(CONSENT_KEY,JSON.stringify(consentState));
    refreshMapContainers();
  }
  function enableExternalServices(){
    saveConsent({external:true});
    const banner=$('#consentBanner');
    const backdrop=$('#consentBackdrop');
    const settings=$('#consentSettings');
    if(banner) banner.hidden=true;
    if(backdrop) backdrop.hidden=true;
    if(settings) settings.hidden=true;
  }
  function setStartMarker(address,coords){startMarker={address,coords}}
  function setEndMarker(address,coords){endMarker={address,coords}}
  function getMarkers(){return {start:startMarker,end:endMarker}}
  function clearMarkers(){startMarker=null;endMarker=null}
  function initConsentManager(){
    const banner=$('#consentBanner');
    const backdrop=$('#consentBackdrop');
    const settings=$('#consentSettings');
    const acceptAll=$('#consentAcceptAll');
    const onlyNecessary=$('#consentNecessaryOnly');
    const openSettings=$('#consentOpenSettings');
    const closeSettings=$('#consentCloseSettings');
    const saveSettings=$('#consentSaveSettings');
    const externalToggle=$('#consentExternalToggle');
    let settingsOpener=null;

    const stored=parseStoredConsent();
    if(stored) consentState=stored;

    function showBanner(){
      if(banner) banner.hidden=false;
      if(backdrop) backdrop.hidden=false;
    }
    function hideBanner(){
      if(banner) banner.hidden=true;
      if(backdrop) backdrop.hidden=true;
    }
    function openSettingsDialog(){
      if(!settings) return;
      settingsOpener=document.activeElement;
      if(externalToggle) externalToggle.checked=!!consentState.external;
      settings.hidden=false;
      if(backdrop) backdrop.hidden=false;
      requestAnimationFrame(()=>focusFirstInteractive(settings));
    }
    function closeSettingsDialog(){
      const wasOpen=!!settings && !settings.hidden;
      if(settings) settings.hidden=true;
      if(!banner || banner.hidden) {
        if(backdrop) backdrop.hidden=true;
      }
      if(wasOpen && settingsOpener && typeof settingsOpener.focus==='function') settingsOpener.focus();
    }

    if(!stored) showBanner();

    acceptAll?.addEventListener('click',()=>{
      saveConsent({external:true});
      hideBanner();
      closeSettingsDialog();
    });

    onlyNecessary?.addEventListener('click',()=>{
      saveConsent({external:false});
      hideBanner();
      closeSettingsDialog();
    });

    openSettings?.addEventListener('click',openSettingsDialog);
    closeSettings?.addEventListener('click',closeSettingsDialog);
    backdrop?.addEventListener('click',()=>{
      if(settings && !settings.hidden) closeSettingsDialog();
    });

    settings?.addEventListener('keydown',e=>{
      if(settings.hidden) return;
      if(e.key==='Escape'){
        e.preventDefault();
        closeSettingsDialog();
        return;
      }
      trapFocus(e,settings);
    });

    saveSettings?.addEventListener('click',()=>{
      saveConsent({external:!!externalToggle?.checked});
      hideBanner();
      closeSettingsDialog();
    });

    refreshMapContainers();
  }
  function initContactRequestForm(){
    const form=$('#contactRequestForm');
    if(!form) return;

    const privacy=$('#requestPrivacy');
    const submit=$('#requestSubmit');
    const status=$('#requestStatus');

    function syncFormState(){
      const allowSubmit=!!privacy?.checked;
      if(submit) submit.disabled=!allowSubmit;
    }

    privacy?.addEventListener('change',syncFormState);

    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!privacy?.checked){
        if(status) status.textContent='Bitte Datenschutz-Einwilligung aktivieren.';
        return;
      }
      if(!form.reportValidity()) return;

      // TODO: Hier spaeter Formspree, Netlify Forms, EmailJS oder eigenen API-Endpoint anbinden.
      if(status) status.textContent='Formular ist vorbereitet. Versand wird spaeter an einen Dienst angebunden.';
    });

    syncFormState();
  }
  function resolveInitialScreen(){
    const params=new URLSearchParams(window.location.search);
    const page=params.get('page');
    if(page && $('#'+page)) return page;
    return null;
  }
  function inject(){ $$('[data-icon]').forEach(el=>{el.innerHTML=icons[el.dataset.icon]||''}) }
  function show(id){ if(!$('#'+id)) id='home'; $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); $$('.site-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id)); window.scrollTo(0,0) }
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
    const topbar=$('.topbar');
    const menuToggle=$('.menu-toggle');
    const siteNav=$('.site-nav');
    const backdrop=$('.site-nav-backdrop');
    const servicesItem=$('.nav-item-services');
    const servicesTrigger=servicesItem?.querySelector('.nav-trigger');
    const bookBtn=$('#headerBookBtn');

    function closeMobileMenu(){
      siteNav?.classList.remove('open');
      document.body.classList.remove('nav-open');
      if(menuToggle) menuToggle.setAttribute('aria-expanded','false');
    }

    if(menuToggle){
      menuToggle.setAttribute('aria-expanded','false');
      menuToggle.addEventListener('click',()=>{
        const open=siteNav?.classList.toggle('open');
        document.body.classList.toggle('nav-open',!!open);
        menuToggle.setAttribute('aria-expanded',open?'true':'false');
      });
    }

    backdrop?.addEventListener('click',()=>closeMobileMenu());

    servicesTrigger?.addEventListener('click',e=>{
      e.preventDefault();
      const open=servicesItem.classList.toggle('is-open');
      servicesTrigger.setAttribute('aria-expanded',open?'true':'false');
    });

    document.addEventListener('click',e=>{
      if(servicesItem && !servicesItem.contains(e.target)){
        servicesItem.classList.remove('is-open');
        servicesTrigger?.setAttribute('aria-expanded','false');
      }
      if(siteNav?.classList.contains('open') && !e.target.closest('.site-nav') && !e.target.closest('.menu-toggle')){
        closeMobileMenu();
      }
    });

    bookBtn?.addEventListener('click',e=>{
      e.preventDefault();
      const activeScreen=$('.screen.active');
      const bookingTarget=activeScreen?.querySelector('#medicalBookingSection');
      if(bookingTarget){
        bookingTarget.scrollIntoView({behavior:'smooth',block:'start'});
      }else{
        const contactTarget=$('#kontakt');
        contactTarget?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      closeMobileMenu();
    });

    const onScroll=()=>{
      const scrolled=window.scrollY>14;
      topbar?.classList.toggle('is-scrolled',scrolled);
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
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
  function boot(){inject();setService('taxi');validate();setTimeout(()=>$('#splash')?.classList.add('hide'),2000);initMapContainer('startMapContainer');initMapContainer('endMapContainer');
    initMedicalAssistant();
    initMedicalBookingScroll();
    initPremiumNavigation();
    initFaqCenter();
    initConsentManager();
    initContactRequestForm();
    const initialScreen=resolveInitialScreen();
    if(initialScreen) show(initialScreen);
    const menuToggle=$('.menu-toggle');
    const siteNav=$('.site-nav');
    document.addEventListener('click',e=>{
      let mapConsent=e.target.closest('[data-map-consent="accept"]');
      if(mapConsent){
        e.preventDefault();
        enableExternalServices();
        return;
      }
      let go=e.target.closest('[data-go]');
      if(go){
        e.preventDefault();
        if(go.dataset.service)setService(go.dataset.service);
        if(go.dataset.go==='kontakt'){
          show('home');
          setTimeout(()=>{const anchor=document.getElementById(go.dataset.go);anchor?.scrollIntoView({behavior:'smooth',block:'start'})},100);
        } else {
          show(go.dataset.go);
        }
        siteNav?.classList.remove('open');
        document.body.classList.remove('nav-open');
        $('.nav-item-services')?.classList.remove('is-open');
        $('.nav-item-services .nav-trigger')?.setAttribute('aria-expanded','false');
        menuToggle?.setAttribute('aria-expanded','false');
      }
      let ss=e.target.closest('[data-service-select]');if(ss)setService(ss.dataset.serviceSelect);
      let trip=e.target.closest('[data-trip]');if(trip){$$('.trip-grid button').forEach(b=>b.classList.remove('active'));trip.classList.add('active')}
      let t=e.target.closest('.toggle button');if(t){$$('.toggle button').forEach(b=>b.classList.remove('active'));t.classList.add('active')}
      let locBtn=e.target.closest('#locationBtn');if(locBtn){getLocation();return}
      let chip=e.target.closest('.details button,.chips button,.small-toggle button');if(chip){if(chip.dataset.address){$('#targetAddress').value=chip.dataset.address;if(chip.dataset.service)setService(chip.dataset.service);validate()}else{chip.classList.toggle('active')}}
    });
    document.addEventListener('input',e=>{
      validate();
      if(hasExternalConsent()){
        if(e.target.id==='startAddress' || e.target.id==='targetAddress') refreshMapContainers();
      }
    },true)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();