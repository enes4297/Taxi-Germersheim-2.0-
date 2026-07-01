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
    const streetSuggestions=[
      'Friedrich-Ebert-Straße','Bahnhofstraße','Hauptstraße','August-Keiler-Straße',
      'Rheinbrückenstraße','Josef-Probst-Straße','Waldstraße','Königstraße',
      'Marktstraße','Sondernheimer Straße','Lingenfelder Straße','Bellheimer Straße',
      'Wörther Straße','Speyerer Straße'
    ];

    const pickupInput=$('#assistPickup');
    const destinationInput=$('#assistDestination');
    const dateInput=$('#assistDate');
    const timeInput=$('#assistTime');
    const doctorTimeInput=$('#assistDoctorTime');
    const pickupSuggestions=$('#assistPickupSuggestions');
    const destinationSuggestions=$('#assistDestinationSuggestions');

    const dateTrigger=$('#assistDateTrigger');
    const dateOverlay=$('#assistDateOverlay');
    const dateMonthLabel=$('#assistDateMonthLabel');
    const dateCalendar=$('#assistDateCalendar');

    const timeOverlay=$('#assistTimeOverlay');
    const timeList=$('#assistTimeList');
    const timeTitle=$('#assistTimeTitle');
    const pickupTimeTrigger=$('#assistTimeTrigger');
    const doctorTimeTrigger=$('#assistDoctorTimeTrigger');

    const success=$('#assistSuccess');
    const errors={
      1:$('#assistError1'),
      2:$('#assistError2'),
      3:$('#assistError3'),
      4:$('#assistError4'),
      5:$('#assistError5'),
      6:$('#assistError6')
    };
    const summaryEls={
      type:$('#summaryType'),
      pickup:$('#summaryPickup'),
      destination:$('#summaryDestination'),
      date:$('#summaryDate'),
      time:$('#summaryTime'),
      doctorTime:$('#summaryDoctorTime'),
      name:$('#summaryName'),
      phone:$('#summaryPhone'),
      email:$('#summaryEmail'),
      insurance:$('#summaryInsurance'),
      notes:$('#summaryNotes')
    };

    const form={
      type:'',
      pickup:'',
      destination:'',
      date:'',
      time:'',
      doctorTime:'',
      name:'',
      phone:'',
      email:'',
      insurance:'',
      notes:''
    };

    let currentStep=1;
    let maxUnlocked=1;
    let activeTimeTarget='pickup';
    let calendarMonth=new Date();
    const completedSteps=new Set();

    Object.values(errors).forEach(el=>{if(el) el.textContent='Bitte füllen Sie die Pflichtangaben aus.'});

    function formatIsoDate(date){
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }

    function parseIsoDate(value){
      if(!value) return null;
      const [y,m,d]=value.split('-').map(Number);
      if(!y||!m||!d) return null;
      const parsed=new Date(y,m-1,d);
      return Number.isNaN(parsed.getTime())?null:parsed;
    }

    function formatDisplayDate(value){
      const parsed=parseIsoDate(value);
      if(!parsed) return 'Datum auswählen';
      return parsed.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
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

    function readForm(){
      form.pickup=pickupInput?.value||'';
      form.destination=destinationInput?.value||'';
      form.date=dateInput?.value||'';
      form.time=timeInput?.value||'';
      form.doctorTime=doctorTimeInput?.value||'';
      form.name=$('#assistName')?.value||'';
      form.phone=$('#assistPhone')?.value||'';
      form.email=$('#assistEmail')?.value||'';
      form.insurance=$('#assistInsurance')?.value||'';
      form.notes=$('#assistNotes')?.value||'';
    }

    function showError(stepNumber){ if(errors[stepNumber]) errors[stepNumber].hidden=false; }
    function hideError(stepNumber){ if(errors[stepNumber]) errors[stepNumber].hidden=true; }

    function clearCompletedFrom(stepNumber){
      for(let n=stepNumber;n<=6;n++) completedSteps.delete(n);
    }

    function updateSummary(){
      Object.entries(summaryEls).forEach(([key,el])=>{
        if(!el) return;
        const value=(form[key]||'').toString().trim();
        el.textContent=value||'-';
      });
    }

    function renderAddressSuggestions(inputEl,listEl){
      if(!inputEl||!listEl) return;
      const query=inputEl.value.trim().toLowerCase();
      if(query.length<2){
        listEl.hidden=true;
        listEl.innerHTML='';
        return;
      }
      const matches=streetSuggestions
        .filter(name=>name.toLowerCase().includes(query))
        .slice(0,6);
      if(!matches.length){
        listEl.hidden=true;
        listEl.innerHTML='';
        return;
      }
      listEl.innerHTML=matches
        .map(name=>`<button class="assist-suggestion" type="button" data-address-choice="${name}">${name}</button>`)
        .join('');
      listEl.hidden=false;
    }

    function hideAddressSuggestions(){
      if(pickupSuggestions){pickupSuggestions.hidden=true;pickupSuggestions.innerHTML='';}
      if(destinationSuggestions){destinationSuggestions.hidden=true;destinationSuggestions.innerHTML='';}
    }

    function openOverlay(overlay){
      if(!overlay) return;
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden','false');
    }

    function closeOverlay(overlay){
      if(!overlay) return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }

    function setDateTriggerLabel(){
      if(!dateTrigger) return;
      readForm();
      dateTrigger.textContent=formatDisplayDate(form.date);
      dateTrigger.classList.toggle('is-filled',!!form.date);
    }

    function setTimeTriggerLabels(){
      readForm();
      if(pickupTimeTrigger){
        pickupTimeTrigger.textContent=form.time||'Abholzeit auswählen';
        pickupTimeTrigger.classList.toggle('is-filled',!!form.time);
      }
      if(doctorTimeTrigger){
        doctorTimeTrigger.textContent=form.doctorTime||'Arzttermin auswählen';
        doctorTimeTrigger.classList.toggle('is-filled',!!form.doctorTime);
      }
    }

    function renderCalendar(){
      if(!dateCalendar||!dateMonthLabel) return;
      const firstDay=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
      const lastDay=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0);
      const monthDays=lastDay.getDate();
      const startOffset=(firstDay.getDay()+6)%7;
      const todayIso=formatIsoDate(new Date());
      const selectedIso=dateInput?.value||'';
      dateMonthLabel.textContent=firstDay.toLocaleDateString('de-DE',{month:'long',year:'numeric'});

      const cells=[];
      for(let i=0;i<startOffset;i++) cells.push('<span class="assistant-date-day is-empty"></span>');
      for(let day=1;day<=monthDays;day++){
        const dt=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day);
        const iso=formatIsoDate(dt);
        const classes=['assistant-date-day'];
        if(iso===todayIso) classes.push('is-today');
        if(iso===selectedIso) classes.push('is-selected');
        cells.push(`<button class="${classes.join(' ')}" type="button" data-date-value="${iso}">${day}</button>`);
      }
      dateCalendar.innerHTML=cells.join('');
    }

    function selectDate(value,autoAdvance){
      if(!dateInput) return;
      dateInput.value=value;
      form.date=value;
      hideError(4);
      setDateTriggerLabel();
      updateSummary();
      closeOverlay(dateOverlay);
      if(autoAdvance){
        success.hidden=true;
        clearCompletedFrom(4);
        goNext(4);
      }else{
        showStep(currentStep);
      }
    }

    function renderTimeList(){
      if(!timeList||!timeTitle) return;
      readForm();
      const selected=activeTimeTarget==='pickup'?form.time:form.doctorTime;
      timeTitle.textContent=activeTimeTarget==='pickup'?'Gewünschte Abholzeit':'Termin beim Arzt (optional)';
      timeList.innerHTML=buildTimeSlots().map(slot=>{
        const selectedClass=slot===selected?' is-selected':'';
        return `<button class="assistant-time-option${selectedClass}" type="button" data-time-value="${slot}">${slot}</button>`;
      }).join('');
    }

    function validateStep(stepNumber){
      readForm();
      if(stepNumber===1) return !!form.type;
      if(stepNumber===2) return !!form.pickup.trim();
      if(stepNumber===3) return !!form.destination.trim();
      if(stepNumber===4) return !!form.date;
      if(stepNumber===5) return !!form.time;
      if(stepNumber===6) return !!form.name.trim() && !!form.phone.trim();
      return true;
    }

    function showStep(stepNumber){
      currentStep=Math.max(1,Math.min(7,stepNumber));
      steps.forEach(step=>{
        const n=Number(step.dataset.step);
        step.classList.toggle('is-active',n===currentStep);
        step.classList.toggle('is-locked',n>maxUnlocked);
        step.classList.toggle('is-complete',completedSteps.has(n));
      });
      updateSummary();
    }

    function goNext(stepNumber){
      if(!validateStep(stepNumber)){
        showError(stepNumber);
        showStep(stepNumber);
        return;
      }
      hideError(stepNumber);
      completedSteps.add(stepNumber);
      if(stepNumber<7){
        maxUnlocked=Math.max(maxUnlocked,stepNumber+1);
        showStep(stepNumber+1);
      }
    }

    function goBack(stepNumber){
      showStep(Math.max(1,stepNumber-1));
    }

    root.addEventListener('click',e=>{
      const choice=e.target.closest('.ride-choice');
      if(choice){
        form.type=choice.dataset.value||'';
        rideChoices.forEach(c=>c.classList.toggle('is-selected',c===choice));
        hideError(1);
        success.hidden=true;
        return;
      }

      const suggestion=e.target.closest('[data-address-choice]');
      if(suggestion){
        const value=suggestion.dataset.addressChoice||'';
        if(pickupSuggestions && pickupSuggestions.contains(suggestion) && pickupInput){
          pickupInput.value=value;
          form.pickup=value;
          hideError(2);
        }
        if(destinationSuggestions && destinationSuggestions.contains(suggestion) && destinationInput){
          destinationInput.value=value;
          form.destination=value;
          hideError(3);
        }
        hideAddressSuggestions();
        updateSummary();
        showStep(currentStep);
        return;
      }

      const quickDateBtn=e.target.closest('[data-quick-date]');
      if(quickDateBtn){
        const mode=quickDateBtn.dataset.quickDate;
        const today=new Date();
        if(mode==='today'){
          calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
          renderCalendar();
          selectDate(formatIsoDate(today),true);
          return;
        }
        if(mode==='tomorrow'){
          const tomorrow=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
          calendarMonth=new Date(tomorrow.getFullYear(),tomorrow.getMonth(),1);
          renderCalendar();
          selectDate(formatIsoDate(tomorrow),true);
          return;
        }
        if(mode==='custom'){
          const selected=parseIsoDate(dateInput?.value||'')||new Date();
          calendarMonth=new Date(selected.getFullYear(),selected.getMonth(),1);
          renderCalendar();
          openOverlay(dateOverlay);
          return;
        }
      }

      if(e.target.closest('#assistDateTrigger')){
        const selected=parseIsoDate(dateInput?.value||'')||new Date();
        calendarMonth=new Date(selected.getFullYear(),selected.getMonth(),1);
        renderCalendar();
        openOverlay(dateOverlay);
        return;
      }

      const dateNav=e.target.closest('[data-date-nav]');
      if(dateNav){
        calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+(dateNav.dataset.dateNav==='next'?1:-1),1);
        renderCalendar();
        return;
      }

      const datePick=e.target.closest('[data-date-value]');
      if(datePick){
        selectDate(datePick.dataset.dateValue||'',true);
        return;
      }

      const timeTrigger=e.target.closest('[data-time-target]');
      if(timeTrigger){
        activeTimeTarget=timeTrigger.dataset.timeTarget||'pickup';
        renderTimeList();
        openOverlay(timeOverlay);
        return;
      }

      const timePick=e.target.closest('[data-time-value]');
      if(timePick){
        const value=timePick.dataset.timeValue||'';
        if(activeTimeTarget==='pickup' && timeInput){
          timeInput.value=value;
          form.time=value;
          hideError(5);
          setTimeTriggerLabels();
          updateSummary();
          closeOverlay(timeOverlay);
          success.hidden=true;
          clearCompletedFrom(5);
          goNext(5);
          return;
        }
        if(activeTimeTarget==='doctor' && doctorTimeInput){
          doctorTimeInput.value=value;
          form.doctorTime=value;
          setTimeTriggerLabels();
          updateSummary();
          closeOverlay(timeOverlay);
          success.hidden=true;
          showStep(currentStep);
          return;
        }
      }

      const closeOverlayBtn=e.target.closest('[data-close-overlay]');
      if(closeOverlayBtn){
        if(closeOverlayBtn.dataset.closeOverlay==='date') closeOverlay(dateOverlay);
        if(closeOverlayBtn.dataset.closeOverlay==='time') closeOverlay(timeOverlay);
        return;
      }

      const nextBtn=e.target.closest('[data-next],[data-assist-next]');
      if(nextBtn){
        const raw=nextBtn.dataset.next||nextBtn.dataset.assistNext||String(currentStep);
        const step=Number(raw)||currentStep;
        success.hidden=true;
        clearCompletedFrom(step);
        goNext(step);
        return;
      }

      const backBtn=e.target.closest('[data-back],[data-assist-back]');
      if(backBtn){
        const raw=backBtn.dataset.back||backBtn.dataset.assistBack||String(currentStep);
        const step=Number(raw)||currentStep;
        success.hidden=true;
        goBack(step);
        return;
      }

      const summaryBtn=e.target.closest('[data-summary]');
      if(summaryBtn){
        success.hidden=true;
        clearCompletedFrom(6);
        goNext(6);
        return;
      }

      const editBtn=e.target.closest('[data-edit],#assistEdit');
      if(editBtn){
        success.hidden=true;
        maxUnlocked=7;
        showStep(1);
        return;
      }

      const submitBtn=e.target.closest('#assistSubmit');
      if(submitBtn){
        readForm();
        updateSummary();
        success.hidden=false;
      }

      if(!e.target.closest('.assist-suggestions') && e.target!==pickupInput && e.target!==destinationInput){
        hideAddressSuggestions();
      }
    });

    root.addEventListener('input',e=>{
      const id=e.target.id;
      if(id==='assistPickup'){form.pickup=e.target.value;hideError(2);if(!form.pickup.trim()) clearCompletedFrom(2);renderAddressSuggestions(pickupInput,pickupSuggestions)}
      if(id==='assistDestination'){form.destination=e.target.value;hideError(3);if(!form.destination.trim()) clearCompletedFrom(3);renderAddressSuggestions(destinationInput,destinationSuggestions)}
      if(id==='assistDate'){form.date=e.target.value;hideError(4);if(!form.date) clearCompletedFrom(4);setDateTriggerLabel()}
      if(id==='assistTime'){form.time=e.target.value;hideError(5);if(!form.time) clearCompletedFrom(5);setTimeTriggerLabels()}
      if(id==='assistDoctorTime'){form.doctorTime=e.target.value;setTimeTriggerLabels()}
      if(id==='assistName'){form.name=e.target.value;hideError(6);if(!form.name.trim()||!form.phone.trim()) clearCompletedFrom(6)}
      if(id==='assistPhone'){form.phone=e.target.value;hideError(6);if(!form.name.trim()||!form.phone.trim()) clearCompletedFrom(6)}
      if(id==='assistEmail') form.email=e.target.value;
      if(id==='assistInsurance') form.insurance=e.target.value;
      if(id==='assistNotes') form.notes=e.target.value;
      success.hidden=true;
      updateSummary();
      showStep(currentStep);
    });

    root.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      if(e.target.tagName==='TEXTAREA') return;
      const activeStepEl=e.target.closest('.assistant-step');
      if(!activeStepEl) return;
      const step=Number(activeStepEl.dataset.step)||currentStep;
      if(step!==currentStep) return;
      if(step<1 || step>6) return;
      e.preventDefault();
      success.hidden=true;
      clearCompletedFrom(step);
      goNext(step);
    });

    document.addEventListener('click',e=>{
      if(!root.contains(e.target)){
        hideAddressSuggestions();
        closeOverlay(dateOverlay);
        closeOverlay(timeOverlay);
      }
    });

    setDateTriggerLabel();
    setTimeTriggerLabels();
    showStep(1);
  }
  function initMedicalBookingScroll(){
    const cta=$('#medicalHeroBookBtn');
    const target=$('#medicalBookingSection');
    if(!cta||!target) return;
    cta.addEventListener('click',()=>{
      target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  function boot(){inject();setService('taxi');validate();setTimeout(()=>$('#splash')?.classList.add('hide'),2000);initMapContainer('startMapContainer');initMapContainer('endMapContainer');
    initMedicalAssistant();
    initMedicalBookingScroll();
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