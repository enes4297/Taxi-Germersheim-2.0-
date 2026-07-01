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
  const searchData=[{name:'Germersheim Bahnhof',city:'Germersheim',category:'transport'},{name:'Germersheim Marktplatz',city:'Germersheim',category:'landmark'},{name:'Gemeinschaftspraxis Dr. König',city:'Germersheim',category:'medical'},{name:'Städtisches Krankenhaus Germersheim',city:'Germersheim',category:'hospital'},{name:'REWE Germersheim',city:'Germersheim',category:'shopping'},{name:'Frankfurt Flughafen',city:'Frankfurt am Main',category:'airport'},{name:'Heidelberg Hauptbahnhof',city:'Heidelberg',category:'transport'},{name:'Ludwigshafen Rathaus',city:'Ludwigshafen',category:'landmark'},{name:'Mannheim Schloss',city:'Mannheim',category:'landmark'},{name:'Speyer Dom',city:'Speyer',category:'landmark'}];
  let startMarker=null,endMarker=null,mapContainers={};
  function searchAddresses(query){if(!query||query.trim().length<2)return [];let q=query.trim().toLowerCase();return searchData.filter(a=>a.name.toLowerCase().includes(q)||a.city.toLowerCase().includes(q)).slice(0,5)}
  function initMapContainer(elementId){let container=$(elementId);if(container){container.innerHTML='<div class="map-placeholder">Karte wird geladen...</div>';mapContainers[elementId]=container;return container}return null}
  function setStartMarker(address,coords){startMarker={address,coords}}
  function setEndMarker(address,coords){endMarker={address,coords}}
  function getMarkers(){return {start:startMarker,end:endMarker}}
  function clearMarkers(){startMarker=null;endMarker=null}
  function inject(){ $$('[data-icon]').forEach(el=>{el.innerHTML=icons[el.dataset.icon]||''}) }
  function show(id){ if(!$('#'+id)) id='home'; $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); $$('.site-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id)); window.scrollTo(0,0) }
  function setService(s){ if(!services[s])s='taxi'; $('#selectedTitle').textContent=services[s][0]; $('#serviceLabel').textContent=services[s][1]; $$('.type-grid button').forEach(b=>b.classList.toggle('active',b.dataset.serviceSelect===s)); $('#medicalPanel').classList.toggle('hidden',s!=='medical') }
  function validate(){let ok=$('#startAddress').value.trim()&&$('#targetAddress').value.trim()&&$('#customerPhone').value.trim();$('#sendRequest').textContent=ok?'Fahrtanfrage senden':'Fahrtanfrage nicht möglich'}
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
    if(!root) return;
    const steps=$$('.assistant-step',root);
    const rideChoices=$$('.ride-choice',root);
    const stepMap=new Map(steps.map(s=>[Number(s.dataset.step),s]));
    const form={
      type:'',
      pickup:$('#assistPickup')?.value||'',
      destination:$('#assistDestination')?.value||'',
      date:$('#assistDate')?.value||'',
      time:$('#assistTime')?.value||'',
      name:$('#assistName')?.value||'',
      phone:$('#assistPhone')?.value||'',
      email:$('#assistEmail')?.value||'',
      insurance:$('#assistInsurance')?.value||'',
      notes:$('#assistNotes')?.value||''
    };
    const summaryIds={
      type:'#summaryType',pickup:'#summaryPickup',destination:'#summaryDestination',
      date:'#summaryDate',time:'#summaryTime',name:'#summaryName',phone:'#summaryPhone',
      email:'#summaryEmail',insurance:'#summaryInsurance',notes:'#summaryNotes'
    };
    const success=$('#assistSuccess');
    const setActive=n=>{
      steps.forEach(s=>s.classList.toggle('is-active',Number(s.dataset.step)===n));
    };
    const isComplete=n=>{
      if(n===1) return !!form.type;
      if(n===2) return !!form.pickup.trim();
      if(n===3) return !!form.destination.trim();
      if(n===4) return !!form.date;
      if(n===5) return !!form.time;
      if(n===6) return !!form.name.trim() && !!form.phone.trim();
      return false;
    };
    const updateSummary=()=>{
      Object.entries(summaryIds).forEach(([key,selector])=>{
        const el=$(selector); if(!el) return;
        const value=(form[key]||'').toString().trim();
        el.textContent=value||'-';
      });
    };
    const refresh=()=>{
      let unlocked=1;
      for(let n=1;n<=6;n++){
        if(isComplete(n)) unlocked=n+1; else break;
      }
      steps.forEach(step=>{
        const n=Number(step.dataset.step);
        step.classList.toggle('is-locked',n>unlocked);
        step.classList.toggle('is-complete',isComplete(n));
      });
      if(unlocked>=7) updateSummary();
      const active=$('.assistant-step.is-active',root);
      const activeNum=active?Number(active.dataset.step):1;
      if(activeNum>unlocked) setActive(unlocked);
    };

    root.addEventListener('click',e=>{
      const head=e.target.closest('.assistant-step-head');
      if(head){
        const step=head.closest('.assistant-step');
        if(step && !step.classList.contains('is-locked')) setActive(Number(step.dataset.step));
      }
      const choice=e.target.closest('.ride-choice');
      if(choice){
        form.type=choice.dataset.value||'';
        rideChoices.forEach(c=>c.classList.toggle('is-selected',c===choice));
        refresh();
        if(form.type) setActive(2);
      }
      const submit=e.target.closest('#assistSubmit');
      if(submit){
        refresh();
        if(!isComplete(6)) return;
        success.hidden=false;
      }
      const edit=e.target.closest('#assistEdit');
      if(edit){
        success.hidden=true;
        setActive(1);
        refresh();
      }
    });

    root.addEventListener('input',e=>{
      const id=e.target.id;
      if(id==='assistPickup') form.pickup=e.target.value;
      if(id==='assistDestination') form.destination=e.target.value;
      if(id==='assistDate') form.date=e.target.value;
      if(id==='assistTime') form.time=e.target.value;
      if(id==='assistName') form.name=e.target.value;
      if(id==='assistPhone') form.phone=e.target.value;
      if(id==='assistEmail') form.email=e.target.value;
      if(id==='assistInsurance') form.insurance=e.target.value;
      if(id==='assistNotes') form.notes=e.target.value;
      success.hidden=true;
      refresh();
    });

    root.addEventListener('change',e=>{
      const id=e.target.id;
      if(id==='assistDate') form.date=e.target.value;
      if(id==='assistTime') form.time=e.target.value;
      refresh();
    });

    refresh();
  }
  function boot(){inject();setService('taxi');validate();setTimeout(()=>$('#splash')?.classList.add('hide'),2000);initMapContainer('startMapContainer');initMapContainer('endMapContainer');
    initMedicalAssistant();
    const menuToggle=$('.menu-toggle');
    const siteNav=$('.site-nav');
    if(menuToggle){
      menuToggle.setAttribute('aria-expanded','false');
      menuToggle.addEventListener('click',()=>{
        const open = siteNav?.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.addEventListener('click',e=>{
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
        menuToggle?.setAttribute('aria-expanded','false');
      }
      if(siteNav?.classList.contains('open') && !e.target.closest('.site-nav') && !e.target.closest('.menu-toggle')){
        siteNav.classList.remove('open');
        menuToggle?.setAttribute('aria-expanded','false');
      }
      let ss=e.target.closest('[data-service-select]');if(ss)setService(ss.dataset.serviceSelect);
      let trip=e.target.closest('[data-trip]');if(trip){$$('.trip-grid button').forEach(b=>b.classList.remove('active'));trip.classList.add('active')}
      let t=e.target.closest('.toggle button');if(t){$$('.toggle button').forEach(b=>b.classList.remove('active'));t.classList.add('active')}
      let locBtn=e.target.closest('#locationBtn');if(locBtn){getLocation();return}
      let chip=e.target.closest('.details button,.chips button,.small-toggle button');if(chip){if(chip.dataset.address){$('#targetAddress').value=chip.dataset.address;if(chip.dataset.service)setService(chip.dataset.service);validate()}else{chip.classList.toggle('active')}}
    });
    document.addEventListener('input',validate,true)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();