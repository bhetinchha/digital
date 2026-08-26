const C=window.BHETINCHHA_CONFIG||{}, FALLBACK=window.BHETINCHHA_DATA||{};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const api=(action,payload={},timeoutMs=12000)=>{
  if(!C.API_URL||C.DEMO_MODE)return Promise.resolve({ok:true,demo:true});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(C.API_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action,...payload}),
    signal:controller.signal,
    cache:'no-store'
  }).then(async r=>{
    const text=await r.text();
    try{return JSON.parse(text)}catch(e){throw new Error('Invalid server response')}
  }).finally(()=>clearTimeout(timer));
};
let bootstrap={masters:[],categories:[],customFields:[],trialDays:3}, currentResults=[], currentRatingBusiness='', selectedRating=0, verifiedOnly=false, openOnly=false, coords=null, regStep=1, reg={};
const NEPAL_DISTRICTS=['Achham','Arghakhanchi','Baglung','Baitadi','Bajhang','Bajura','Banke','Bara','Bardiya','Bhaktapur','Bhojpur','Chitwan','Dadeldhura','Dailekh','Dang','Darchula','Dhading','Dhankuta','Dhanusha','Dolakha','Dolpa','Doti','Eastern Rukum','Gorkha','Gulmi','Humla','Ilam','Jajarkot','Jhapa','Jumla','Kailali','Kalikot','Kanchanpur','Kapilvastu','Kaski','Kathmandu','Kavrepalanchok','Khotang','Lalitpur','Lamjung','Mahottari','Makwanpur','Manang','Morang','Mugu','Mustang','Myagdi','Nawalpur','Nawalparasi West','Nuwakot','Okhaldhunga','Palpa','Panchthar','Parbat','Parsa','Pyuthan','Ramechhap','Rasuwa','Rautahat','Rolpa','Rupandehi','Salyan','Sankhuwasabha','Saptari','Sarlahi','Sindhuli','Sindhupalchok','Siraha','Solukhumbu','Sunsari','Surkhet','Syangja','Tanahun','Taplejung','Terhathum','Udayapur','Western Rukum'];
function fillDistrictSelects(){const options=NEPAL_DISTRICTS.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');const s=$('#city');if(s&&!s.dataset.ready){s.insertAdjacentHTML('beforeend',options);s.dataset.ready='1';}const r=$('#regDistrict');if(r&&!r.dataset.ready){r.insertAdjacentHTML('beforeend',options);r.dataset.ready='1';}}

const APP_VERSION='0.5.4';
const LOCATION_CACHE_KEY='bhetinchha_locations_v054';
let locationDirectory=null;
let locationPromise=null;

function normalizeLocationMap(raw){
  const out={};
  if(!raw||typeof raw!=='object')return out;
  Object.entries(raw).forEach(([district,items])=>{
    if(!Array.isArray(items))return;
    out[district]=items.map(x=>{
      if(Array.isArray(x))return {name:String(x[0]||''),wardCount:Number(x[1]||0)};
      return {name:String(x.name||''),wardCount:Number(x.wardCount||0)};
    }).filter(x=>x.name);
  });
  return out;
}

function getCachedLocations(){
  try{
    const c=JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)||'null');
    if(c&&c.data&&Date.now()-c.t<30*24*60*60*1000){
      return normalizeLocationMap(c.data);
    }
  }catch(e){}
  return null;
}

function saveLocations(data){
  try{localStorage.setItem(LOCATION_CACHE_KEY,JSON.stringify({t:Date.now(),data}))}catch(e){}
}

function loadLocationDirectory(){
  if(locationDirectory)return Promise.resolve(locationDirectory);
  const cached=getCachedLocations();
  if(cached){
    locationDirectory=cached;
    return Promise.resolve(locationDirectory);
  }
  if(locationPromise)return locationPromise;

  locationPromise=(async()=>{
    try{
      const r=await api('publicLocations',{},8000);
      if(r&&r.ok&&r.locations){
        locationDirectory=normalizeLocationMap(r.locations);
        saveLocations(locationDirectory);
        return locationDirectory;
      }
    }catch(e){
      console.warn('Location load failed:',e);
    }
    locationDirectory={};
    return locationDirectory;
  })();

  return locationPromise;
}

function districtKey(directory,district){
  if(!directory||!district)return '';
  if(directory[district])return district;
  const norm=s=>String(s).toLowerCase().replace(/[^a-z]/g,'');
  const wanted=norm(district);
  return Object.keys(directory).find(k=>norm(k)===wanted)||'';
}

function fillMunicipalitySelect(el,items,placeholder='पालिका छान्नुहोस्'){
  if(!el)return;
  el.innerHTML=`<option value="">${esc(placeholder)}</option>`+
    (items||[]).map(x=>`<option value="${esc(x.name)}" data-wards="${Number(x.wardCount||0)}">${esc(x.name)}</option>`).join('');
  el.disabled=!(items&&items.length);
}
function fillWardSelect(el,count,placeholder='वडा छान्नुहोस्'){
  if(!el)return;
  const n=Math.max(0,Number(count||0));
  el.innerHTML=`<option value="">${esc(placeholder)}</option>`+
    Array.from({length:n},(_,i)=>`<option value="${i+1}">वडा नं. ${i+1}</option>`).join('');
  el.disabled=n<1;
}

async function municipalitiesFor(district){
  const directory=locationDirectory||await loadLocationDirectory();
  const key=districtKey(directory,district);
  return key?(directory[key]||[]):[];
}

async function populateMunicipality(district,muni,ward,isRegistration=false){
  fillWardSelect(ward,0,isRegistration?'पालिका छानेपछि वडा आउँछ':'सबै वडा');
  if(!district){
    fillMunicipalitySelect(muni,[], 'जिल्ला छानेपछि पालिका आउँछ');
    return;
  }

  // Never leave this select hanging on "loading".
  muni.disabled=true;
  muni.innerHTML='<option value="">पालिका सूची तयार हुँदैछ...</option>';

  const items=await municipalitiesFor(district);

  if(items.length){
    fillMunicipalitySelect(muni,items,isRegistration?'पालिका छान्नुहोस्':'सबै पालिका');
  }else{
    // Give the user a clear, recoverable state instead of endless loading.
    muni.innerHTML='<option value="">पालिका सूची आउन सकेन — फेरि जिल्ला छान्नुहोस्</option>';
    muni.disabled=false;
  }
}

async function onSearchDistrictChange(){
  await populateMunicipality($('#city').value,$('#municipalitySelect'),$('#wardSelect'),false);
}
function onSearchMunicipalityChange(){
  const opt=$('#municipalitySelect')?.selectedOptions?.[0];
  fillWardSelect($('#wardSelect'),opt?opt.dataset.wards:0,'सबै वडा');
}
async function onRegDistrictChange(){
  await populateMunicipality($('#regDistrict').value,$('#regMunicipality'),$('#regWard'),true);
}
function onRegMunicipalityChange(){
  const opt=$('#regMunicipality')?.selectedOptions?.[0];
  fillWardSelect($('#regWard'),opt?opt.dataset.wards:0,'वडा छान्नुहोस्');
}


function openModal(id){$('#'+id)?.classList.add('open');document.body.style.overflow='hidden'}function closeModal(id){$('#'+id)?.classList.remove('open');document.body.style.overflow=''}
function fallbackBootstrap(){const masters=(FALLBACK.masterCategories||[]).map((m,i)=>({id:m.id||('M'+i),name:m.name,icon:m.icon||'▦',subs:m.subs||[]}));const categories=masters.flatMap(m=>m.subs.map((x,i)=>({id:m.id+'-'+i,name:x,masterId:m.id,masterName:m.name,icon:m.icon||'▦'})));return {masters,categories,customFields:[],trialDays:3};}
async function loadBootstrap(){
  const key='bhetinchha_bootstrap_v051', ttl=6*60*60*1000;
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<ttl&&c.data){bootstrap={...bootstrap,...c.data};renderCategorySelect();renderCategories();buildRegisterCategories();}}catch(e){}
  try{const r=await api('publicBootstrap');if(r.ok&&!r.demo&&Array.isArray(r.categories)){bootstrap={...bootstrap,...r};try{localStorage.setItem(key,JSON.stringify({t:Date.now(),data:r}))}catch(e){}}}
  catch(e){}
  renderCategorySelect();renderCategories();buildRegisterCategories();
}
function renderCategorySelect(){const s=$('#categorySelect');s.innerHTML='<option value="">सबै क्याटेगोरी</option>'+bootstrap.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');}
function renderCategories(showAll=false){const el=$('#categories');let ms=bootstrap.masters.length?bootstrap.masters:fallbackBootstrap().masters;const list=showAll?ms:ms.slice(0,10);el.innerHTML=list.map(m=>`<button class="cat-card" data-master="${esc(m.id)}"><span class="cat-icon">${m.icon||'▦'}</span><span><h3>${esc(m.name)}</h3><small>${m.count||m.subs?.length||''} सेवा / व्यवसाय</small></span></button>`).join('');$$('[data-master]').forEach(b=>b.onclick=()=>{const m=ms.find(x=>String(x.id)===b.dataset.master);const first=bootstrap.categories.find(c=>String(c.masterId)===String(m?.id));if(first){$('#categorySelect').value=first.id;$('#q').value=m.name;}doSearch();});}
function stars(v){const n=Math.max(0,Math.min(5,Number(v)||0));return `<span class="star">★</span> ${n.toFixed(1)}`}
function businessCard(b){const status=String(b.listingStatus||b.status||'').toUpperCase();const trial=status.includes('TRIAL');return `<article class="business-card"><div class="business-head"><div><button class="business-name" data-profile="${esc(b.id)}">${esc(b.name)} ${b.verified?'<span class="verified-mark">✓</span>':''}</button><div class="business-location">⌖ ${esc(b.address||b.location||'नेपाल')}</div></div><div class="rating">${stars(b.ratingAvg)} <small>(${Number(b.reviewCount||0)})</small></div></div><div class="status-line">${b.openNow===false?'<span>Closed</span>':'<span class="open-pill">Open now</span>'}${trial?'<span class="trial-pill">Trial</span>':''}<span>${b.category?esc(b.category):''}</span></div><p class="business-desc">${esc(b.desc||'')}</p><div class="business-actions"><button class="btn btn-outline" data-profile="${esc(b.id)}">View details</button>${b.phone?`<a class="btn btn-primary" href="tel:${esc(b.phone)}">📞 Call</a>`:''}${b.whatsapp?`<a class="btn btn-outline" target="_blank" rel="noopener" href="https://wa.me/977${esc(String(b.whatsapp).replace(/\D/g,'').slice(-10))}">WhatsApp</a>`:''}<button class="rate-btn" data-rate="${esc(b.id)}" data-name="${esc(b.name)}">☆ Rate</button></div></article>`}
function bindCards(){$$('[data-profile]').forEach(x=>x.onclick=()=>showProfile(x.dataset.profile));$$('[data-rate]').forEach(x=>x.onclick=()=>openRating(x.dataset.rate,x.dataset.name));}
function renderResults(){let list=[...currentResults];const local=($('#resultFilter')?.value||'').trim().toLowerCase();if(local)list=list.filter(b=>(b.name+' '+b.location+' '+b.address+' '+b.category).toLowerCase().includes(local));if(verifiedOnly)list=list.filter(b=>b.verified);if(openOnly)list=list.filter(b=>b.openNow!==false);const sort=$('#sortResults')?.value||'relevance';if(sort==='rating')list.sort((a,b)=>(+b.ratingAvg||0)-(+a.ratingAvg||0));if(sort==='verified')list.sort((a,b)=>Number(!!b.verified)-Number(!!a.verified));if(sort==='name')list.sort((a,b)=>String(a.name).localeCompare(String(b.name)));$('#results').innerHTML=list.length?list.map(businessCard).join(''):'<div class="empty-state"><b>नतिजा भेटिएन ।</b><br>अर्को category, शहर वा area बाट खोज्नुहोस् ।</div>';bindCards();}
async function doSearch(){
  const btn=$('#searchBtn');
  if(!btn)return;

  const original=btn.innerHTML;
  const val=id=>$(id)?.value?.trim?.()||'';
  const radius=Number($('#distanceRange')?.value||5);

  const p={
    categoryId:val('#categorySelect'),
    q:val('#q'),
    city:val('#city'),
    municipality:val('#municipalitySelect'),
    ward:val('#wardSelect'),
    radiusKm:radius
  };
  if(coords){p.latitude=coords.latitude;p.longitude=coords.longitude;}

  btn.disabled=true;
  btn.innerHTML='⏳ खोज्दै...';
  if($('#resultSummary'))$('#resultSummary').textContent='खोजी हुँदैछ...';

  try{
    const r=await api('publicSearch',p,12000);
    let list=[];
    if(r.ok&&!r.demo&&Array.isArray(r.items))list=r.items;
    else if(r.demo)list=FALLBACK.demoBusinesses||[];
    else throw new Error(r.message||'Search failed');

    currentResults=list;
    if($('#resultSummary'))$('#resultSummary').textContent=
      `${list.length} वटा नतिजा${p.q?' • '+p.q:''}${p.city?' • '+p.city:''}${p.municipality?' • '+p.municipality:''}${p.ward?' • वडा '+p.ward:''}`;
    renderResults();
    $('#search-results')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    console.warn('Search error:',e);
    currentResults=[];
    if($('#resultSummary'))$('#resultSummary').textContent='Search response आएन । Internet/API जाँचेर फेरि प्रयास गर्नुहोस् ।';
    if($('#results'))$('#results').innerHTML='<div class="empty-state"><b>Search response आएन ।</b><br>कृपया केही सेकेन्डपछि फेरि Search गर्नुहोस् ।</div>';
  }finally{
    btn.disabled=false;
    btn.innerHTML=original;
  }
}
async function showProfile(id){let b=currentResults.find(x=>String(x.id)===String(id));try{const r=await api('publicBusinessDetail',{id});if(r.ok&&!r.demo)b=r.item;}catch(e){}if(!b)return;$('#profileContent').innerHTML=`<div class="profile-hero"><div>${b.verified?'✓ Verified Business':''}${String(b.listingStatus||'').includes('TRIAL')?' • Trial Listing':''}</div><h2>${esc(b.name)}</h2><div class="profile-rating">${stars(b.ratingAvg)} <small>(${Number(b.reviewCount||0)} reviews)</small></div><div>⌖ ${esc(b.address||b.location||'नेपाल')}</div></div><div class="profile-body"><p>${esc(b.desc||'विवरण उपलब्ध छैन ।')}</p><p><b>Category:</b> ${esc(b.category||'')}</p><div class="business-actions">${b.phone?`<a class="btn btn-primary" href="tel:${esc(b.phone)}">📞 ${esc(b.phone)}</a>`:''}${b.whatsapp?`<a class="btn btn-outline" target="_blank" href="https://wa.me/977${esc(String(b.whatsapp).replace(/\D/g,'').slice(-10))}">WhatsApp</a>`:''}<button class="btn btn-outline" onclick="document.querySelector('[data-close=profileModal]').click();setTimeout(()=>document.querySelector('[data-rate=\'${esc(b.id)}\']')?.click(),100)">☆ Rating दिनुहोस्</button></div></div>`;openModal('profileModal');}
function nearMe(){if(!navigator.geolocation)return alert('यो browser मा location उपलब्ध छैन ।');$('#nearAddress').value='स्थान पत्ता लगाउँदै...';navigator.geolocation.getCurrentPosition(pos=>{coords={latitude:pos.coords.latitude,longitude:pos.coords.longitude};$('#nearAddress').value='Current location';$('#city').value='';fillMunicipalitySelect($('#municipalitySelect'),[],'पहिले जिल्ला छान्नुहोस्');fillWardSelect($('#wardSelect'),0);doSearch();},()=>{$('#nearAddress').value='';alert('Location permission दिनुहोस् वा ठेगाना आफैं लेख्नुहोस् ।')},{enableHighAccuracy:true,timeout:9000,maximumAge:60000});}
function useAddress(){const a=$('#nearAddress').value.trim();if(!a)return alert('ठेगाना / area लेख्नुहोस् ।');coords=null;$('#q').value=($('#q').value.trim()+' '+a).trim();doSearch();}
function openRating(id,name){currentRatingBusiness=id;selectedRating=0;$('#reviewBusinessName').textContent=name;$$('#ratingPicker button').forEach(x=>x.classList.remove('active'));openModal('reviewModal');}
function paintStars(n){selectedRating=n;$$('#ratingPicker button').forEach(x=>x.classList.toggle('active',+x.dataset.star<=n));}
async function submitReview(){const mobile=$('#reviewMobile').value.trim();if(!selectedRating)return alert('1 देखि 5 star छान्नुहोस् ।');if(mobile.replace(/\D/g,'').length<10)return alert('सही mobile number आवश्यक छ ।');const r=await api('submitReview',{businessId:currentRatingBusiness,rating:selectedRating,name:$('#reviewName').value.trim(),mobile,reviewText:$('#reviewText').value.trim()});alert(r.ok?'धन्यवाद । तपाईंको rating review पछि प्रकाशित हुनेछ ।':(r.message||'Rating submit भएन ।'));if(r.ok)closeModal('reviewModal');}
function buildRegisterCategories(){const el=$('#categoryPicks');el.innerHTML=bootstrap.categories.map(c=>`<label><input type="radio" name="categoryPick" value="${esc(c.id)}" data-name="${esc(c.name)}"> ${esc(c.name)}</label>`).join('');$$('input[name=categoryPick]').forEach(x=>x.onchange=()=>buildDynamicFields(x.value));}
function buildDynamicFields(categoryId){
  const fields=(bootstrap.customFields||[]).filter(f=>String(f.categoryId)===String(categoryId)||String(f.appliesTo)==='*');
  const defaults=fields.length?fields:[
    {key:'serviceArea',label:'Service Area',type:'text',required:false},
    {key:'priceFrom',label:'Starting Price / Rate',type:'number',required:false},
    {key:'availability',label:'Availability / Opening Note',type:'text',required:false}
  ];
  $('#dynamicFields').innerHTML=defaults.map(f=>{
    const label=`<label>${esc(f.label||f.labelNepali||f.key)}${f.required?' *':''}</label>`;
    let control='';
    if(f.type==='select'){
      const options=String(f.options||'').split('|').filter(Boolean).map(o=>`<option>${esc(o)}</option>`).join('');
      control=`<select data-custom="${esc(f.key)}">${options}</select>`;
    }else{
      control=`<input data-custom="${esc(f.key)}" type="${f.type==='number'?'number':'text'}" ${f.required?'required':''}>`;
    }
    return `<div class="field ${f.full?'full':''}">${label}${control}</div>`;
  }).join('');
}
function setStep(n){regStep=n;$$('.reg-step').forEach((x,i)=>x.hidden=i!==n-1);$$('.step').forEach((x,i)=>x.classList.toggle('active',i===n-1));$('#regBack').hidden=n===1;$('#regNext').textContent=n===4?'Trial Registration Submit':'अर्को';}
function collectReg(){reg={};$$('#businessForm [name]').forEach(e=>{if(e.name!=='categoryPick')reg[e.name]=e.value});const c=$('input[name=categoryPick]:checked');reg.categoryId=c?.value||'';reg.categoryName=c?.dataset.name||'';reg.customValues={};$$('[data-custom]').forEach(e=>reg.customValues[e.dataset.custom]=e.value);}
async function nextReg(){collectReg();if(regStep===1&&(!reg.name||!reg.mobile||!reg.district||!reg.municipality||!reg.ward))return alert('Business Name, Mobile, District, पालिका र Ward आवश्यक छ ।');if(regStep===2&&!reg.categoryId)return alert('एउटा मुख्य Category छान्नुहोस् ।');if(regStep<4){setStep(regStep+1);return}if(!$('#regConsent').checked)return alert('दिएको विवरण सही भएको सहमति आवश्यक छ ।');const r=await api('registerBusiness',{business:reg});alert(r.ok?`Registration received. Verification पछि ${r.trialDays||bootstrap.trialDays||3} दिन Trial listing सुरु हुनेछ ।`:(r.message||'Registration submit भएन ।'));if(r.ok){closeModal('businessModal');$('#businessForm').reset();reg={};setStep(1);}}
function initEvents(){
  const safe=(sel,event,fn)=>{const el=$(sel);if(el)el.addEventListener(event,fn);};

  safe('#searchBtn','click',e=>{e.preventDefault();doSearch();});
  safe('#q','keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSearch();}});

  // Location dropdowns only prepare local choices. They DO NOT call search.
  safe('#city','change',onSearchDistrictChange);
  safe('#municipalitySelect','change',onSearchMunicipalityChange);
  safe('#regDistrict','change',onRegDistrictChange);
  safe('#regMunicipality','change',onRegMunicipalityChange);

  $$('[data-search]').forEach(x=>x.onclick=()=>{$('#q').value=x.dataset.search;doSearch();});
  if($('#showAllCategories'))$('#showAllCategories').onclick=()=>renderCategories(true);
  if($('#nearMeBtn'))$('#nearMeBtn').onclick=nearMe;
  if($('#useAddress'))$('#useAddress').onclick=useAddress;
  if($('#distanceRange'))$('#distanceRange').oninput=e=>$('#distanceLabel').textContent=e.target.value+' km';
  if($('#resultFilter'))$('#resultFilter').oninput=renderResults;
  if($('#filterVerified'))$('#filterVerified').onclick=()=>{verifiedOnly=!verifiedOnly;$('#filterVerified').classList.toggle('active',verifiedOnly);renderResults();};
  if($('#filterOpen'))$('#filterOpen').onclick=()=>{openOnly=!openOnly;$('#filterOpen').classList.toggle('active',openOnly);renderResults();};
  if($('#sortResults'))$('#sortResults').onchange=renderResults;
  $$('[data-open-register]').forEach(x=>x.onclick=()=>openModal('businessModal'));
  $$('[data-close]').forEach(x=>x.onclick=()=>closeModal(x.dataset.close));
  if($('#regNext'))$('#regNext').onclick=nextReg;
  if($('#regBack'))$('#regBack').onclick=()=>setStep(Math.max(1,regStep-1));
  $$('#ratingPicker button').forEach(x=>x.onclick=()=>paintStars(+x.dataset.star));
  if($('#submitReview'))$('#submitReview').onclick=submitReview;
  if($('#policeBtn'))$('#policeBtn').onclick=()=>window.open(C.OFFICIAL_POLICE_URL||'https://www.nepalpolice.gov.np/stations/emergency-contacts/police-category/','_blank','noopener');
  if($('#openPoliceDirectory'))$('#openPoliceDirectory').onclick=$('#policeBtn')?.onclick;
  if($('#sosBtn'))$('#sosBtn').onclick=()=>openModal('sosModal');
  if($('#mobileSOS'))$('#mobileSOS').onclick=()=>openModal('sosModal');
}
async function init(){
  const year=$('#year'); if(year)year.textContent=new Date().getFullYear();

  fillDistrictSelects();
  bootstrap=fallbackBootstrap();

  // Paint usable UI and bind clicks BEFORE any network work.
  renderCategorySelect();
  renderCategories();
  buildRegisterCategories();
  initEvents();
  setStep(1);

  if($('#resultSummary'))$('#resultSummary').textContent='Category, जिल्ला वा keyword छानेर खोज्नुहोस् ।';
  if($('#results'))$('#results').innerHTML='<div class="empty-state"><b>खोज्न तयार छ ।</b><br>माथिको search प्रयोग गर्नुहोस् ।</div>';

  // All remote work is background-only.
  loadBootstrap();
  loadLocationDirectory();
}
document.addEventListener('DOMContentLoaded',init);
