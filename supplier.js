const C=window.BHETINCHHA_CONFIG;
const $=s=>document.querySelector(s);
let session=JSON.parse(sessionStorage.getItem('bh_supplier')||'null');

async function api(action,payload={},timeoutMs=12000){
  if(!C.API_URL||C.DEMO_MODE){
    if(action==='supplierLogin')return {ok:true,token:'demo-supplier',supplier:{name:'Kathmandu Taxi Service',plan:'Professional',status:'ACTIVE'},profile:{name:'Kathmandu Taxi Service',category:'Taxi Service',location:'Kathmandu',status:'ACTIVE',plan:'Professional'},stats:{views:428,calls:76,whatsapp:51,leads:19,reviews:38,rating:4.8}};
    if(action==='supplierDashboard')return {ok:true,stats:{views:428,calls:76,whatsapp:51,leads:19,reviews:38,rating:4.8},profile:{name:'Kathmandu Taxi Service',category:'Taxi Service',location:'Kathmandu',status:'ACTIVE',plan:'Professional'}};
    return {ok:true};
  }
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(C.API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,token:session?.token,...payload}),
      signal:controller.signal,
      cache:'no-store'
    });
    return await r.json();
  }finally{clearTimeout(timer)}
}

function paintDashboard(r){
  if(!r||!r.profile)return;
  $('#supplierName')&&($('#supplierName').textContent=r.profile.name||'Business');
  $('#supplierMeta')&&($('#supplierMeta').textContent=`${r.profile.category||'Business'} • ${r.profile.location||''} • ${r.profile.plan||r.profile.status||''}`);
  if($('#stats')&&r.stats){
    $('#stats').innerHTML=Object.entries(r.stats).map(([k,v])=>`<div class="card kpi"><span class="muted">${k}</span><strong>${v}</strong></div>`).join('');
  }
}

async function login(){
  const btn=$('#supplierLogin'),msg=$('#msg');
  const old=btn?.textContent||'Login';
  if(btn){btn.disabled=true;btn.textContent='Login हुँदैछ...';}
  if(msg)msg.textContent='';
  try{
    const r=await api('supplierLogin',{mobile:$('#mobile').value.trim(),password:$('#password').value},12000);
    if(!r.ok){if(msg)msg.textContent=r.message||'Login failed';return;}
    session={token:r.token,supplier:r.supplier};
    sessionStorage.setItem('bh_supplier',JSON.stringify(session));

    // Store dashboard payload returned by login so supplier.html opens instantly.
    if(r.profile&&r.stats){
      sessionStorage.setItem('bh_supplier_dash',JSON.stringify({t:Date.now(),profile:r.profile,stats:r.stats}));
    }
    location.replace('supplier.html');
  }catch(e){
    if(msg)msg.textContent=e.name==='AbortError'?'Login response धेरै ढिलो भयो । फेरि प्रयास गर्नुहोस् ।':'Login गर्न सकिएन ।';
  }finally{
    if(btn){btn.disabled=false;btn.textContent=old;}
  }
}

async function load(){
  if(!session){location.replace('supplier-login.html');return;}

  // Instant paint from login payload; no blank wait after redirect.
  try{
    const cached=JSON.parse(sessionStorage.getItem('bh_supplier_dash')||'null');
    if(cached&&cached.profile)paintDashboard(cached);
  }catch(e){}

  // Refresh in background.
  try{
    const r=await api('supplierDashboard',{},10000);
    if(!r.ok){
      if(String(r.message||'').toLowerCase().includes('session')){
        sessionStorage.removeItem('bh_supplier');
        location.replace('supplier-login.html');
      }
      return;
    }
    paintDashboard(r);
    sessionStorage.setItem('bh_supplier_dash',JSON.stringify({t:Date.now(),profile:r.profile,stats:r.stats}));
  }catch(e){console.warn('Supplier dashboard refresh:',e)}
}

function logout(){
  sessionStorage.removeItem('bh_supplier');
  sessionStorage.removeItem('bh_supplier_dash');
  location.replace('supplier-login.html');
}

document.addEventListener('DOMContentLoaded',()=>{
  if($('#supplierLogin'))$('#supplierLogin').onclick=login;
  if($('#stats'))load();
  if($('#logoutSupplier'))$('#logoutSupplier').onclick=logout;
});
