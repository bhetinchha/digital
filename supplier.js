/**
 * Project : Bhetinchha Digital
 * File    : supplier.js
 * Version : 0.6.0
 *
 * Maintainable source:
 * - Do not minify this master file.
 * - Keep functions separated by responsibility.
 * - Make future updates additive/minimal.
 */

const C=window.BHETINCHHA_CONFIG;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let session=JSON.parse(sessionStorage.getItem('bh_supplier')||'null');
let dash=null,state={view:'dashboard'};

async function api(action,payload={},timeoutMs=12000){
  if(!C.API_URL||C.DEMO_MODE)return demo(action,payload);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const r=await fetch(C.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:session?.token,...payload}),signal:controller.signal,cache:'no-store'});return await r.json()}finally{clearTimeout(timer)}
}
function demo(action,p){
  if(action==='supplierLogin')return Promise.resolve({ok:true,token:'demo',supplier:{name:'Demo Business'},profile:{name:'Demo Business',category:'Taxi',location:'Kathmandu',status:'ACTIVE',plan:'pro'},stats:{views:428,calls:76,whatsapp:51,leads:19,reviews:38,rating:4.8}});
  if(action==='requestPasswordReset')return Promise.resolve({ok:true,message:'Reset request पठाइयो ।'});
  if(action==='supplierDashboard')return Promise.resolve({ok:true,profile:{name:'Demo Business',category:'Taxi',location:'Kathmandu',status:'ACTIVE',plan:'pro'},stats:{views:428,calls:76,whatsapp:51,leads:19,reviews:38,rating:4.8},services:[{id:'S1',name:'Airport Taxi',description:'24/7',price:1200,unit:'trip',active:true}],gallery:[],leads:[],reviews:[],renewals:[],pendingUpdates:0});
  return Promise.resolve({ok:true,message:'Saved'});
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg,type='success'){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.className='toast '+type;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}
function busy(btn,on,label='काम हुँदैछ...'){if(!btn)return;if(on){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.innerHTML='⏳ '+label}else{btn.disabled=false;btn.innerHTML=btn.dataset.old||btn.innerHTML}}
function openModal(title,html,onReady){let m=$('#appModal');if(!m){m=document.createElement('div');m.id='appModal';m.className='modal-shell';document.body.appendChild(m)}m.innerHTML=`<div class="modal-card"><div class="modal-title"><h3>${esc(title)}</h3><button class="xbtn" data-modal-close>✕</button></div><div class="modal-content">${html}</div></div>`;m.classList.add('open');$('[data-modal-close]',m).onclick=()=>m.classList.remove('open');if(onReady)onReady(m)}
function closeModal(){const m=$('#appModal');if(m)m.classList.remove('open')}

async function login(){
  const btn=$('#supplierLogin'),msg=$('#msg'),mobile=$('#mobile').value.trim(),password=$('#password').value;
  if(!mobile||!password){msg.textContent='Mobile/Username र Password लेख्नुहोस् ।';return}
  busy(btn,true,'Login हुँदैछ...');
  try{
    const r=await api('supplierLogin',{mobile,password},12000);if(!r.ok){msg.textContent=r.message||'Login failed';return}
    session={token:r.token,supplier:r.supplier};sessionStorage.setItem('bh_supplier',JSON.stringify(session));
    dash={profile:r.profile,stats:r.stats,services:r.services||[],gallery:r.gallery||[],leads:r.leads||[],reviews:r.reviews||[],renewals:r.renewals||[],pendingUpdates:r.pendingUpdates||0};
    sessionStorage.setItem('bh_supplier_dash',JSON.stringify(dash));location.replace('supplier.html');
  }catch(e){msg.textContent=e.name==='AbortError'?'Login response ढिलो भयो । फेरि प्रयास गर्नुहोस् ।':'Login गर्न सकिएन ।'}finally{busy(btn,false)}
}
function forgotPassword(){
  const initial=$('#mobile')?.value?.trim()||'';
  openModal('Supplier Password Reset',`<div class="form-stack"><p class="modal-note">Supplier Mobile/Username लेख्नुहोस् । Reset request Super Admin मा जान्छ ।</p><label>Mobile / Username<input id="forgotIdentifier" value="${esc(initial)}"></label><button class="btn btn-primary" id="forgotSubmit">Reset Request पठाउनुहोस्</button><div id="forgotMsg" class="inline-msg"></div></div>`,m=>{$('#forgotSubmit',m).onclick=async e=>{const id=$('#forgotIdentifier',m).value.trim();if(!id)return $('#forgotMsg',m).textContent='Mobile/Username आवश्यक छ ।';busy(e.currentTarget,true,'पठाउँदै...');try{const r=await api('requestPasswordReset',{accountType:'SUPPLIER',identifier:id});$('#forgotMsg',m).textContent=r.message||'Request पठाइयो ।'}catch(err){$('#forgotMsg',m).textContent='Request पठाउन सकिएन ।'}finally{busy(e.currentTarget,false)}}});
}
async function logout(){try{await api('supplierLogout',{},4000)}catch(e){}sessionStorage.removeItem('bh_supplier');sessionStorage.removeItem('bh_supplier_dash');location.replace('supplier-login.html')}
async function loadDashboardData(background=false){
  if(!session){location.replace('supplier-login.html');return false}
  if(!background){try{dash=JSON.parse(sessionStorage.getItem('bh_supplier_dash')||'null')}catch(e){}}
  if(dash&&!background){syncHeader();renderView(state.view)}
  try{const r=await api('supplierDashboard',{},10000);if(!r.ok)throw new Error(r.message);dash=r;sessionStorage.setItem('bh_supplier_dash',JSON.stringify(r));syncHeader();renderView(state.view);return true}catch(e){if(!dash)toast(e.message||'Dashboard load failed','error');return false}
}
function syncHeader(){
  if(!dash?.profile)return;
  $('#supplierName')&&($('#supplierName').textContent=dash.profile.name||'Business');
  $('#supplierMeta')&&($('#supplierMeta').textContent=`${dash.profile.category||'Business'} • ${dash.profile.location||''} • ${dash.profile.plan||dash.profile.status||''}`);
  $('#sideBusinessName')&&($('#sideBusinessName').textContent=dash.profile.name||'Supplier Account');
}
function setView(v){state.view=v;$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));document.body.classList.remove('sidebar-open');renderView(v)}
function statusLabel(){const p=dash?.profile||{},st=p.status||'-';let extra='';if(st==='TRIAL_ACTIVE'&&p.trialEndAt)extra=' • Trial ends '+p.trialEndAt;if(st==='ACTIVE'&&p.activeUntil)extra=' • Expires '+p.activeUntil;return st+extra}

function renderView(v){
  if(!$('#supplierWorkspace')||!dash)return;
  if(v==='dashboard')return renderHome();
  if(v==='profile')return renderProfile();
  if(v==='services')return renderServices();
  if(v==='leads')return renderLeads();
  if(v==='reviews')return renderReviews();
  if(v==='gallery')return renderGallery();
  if(v==='subscription')return renderSubscription();
  if(v==='analytics')return renderAnalytics();
  if(v==='support')return renderSupport();
}
function renderHome(){
  const s=dash.stats||{},p=dash.profile||{};
  $('#supplierWorkspace').innerHTML=`<section class="hero"><div><h2>${esc(p.name||'Business Dashboard')}</h2><p>${esc(p.category||'Business')} • ${esc(p.location||'')}</p></div><span class="verified">✓ ${esc(p.verification||'Business Account')}</span></section>
  <section class="subscription"><div><b>Listing Status: ${esc(statusLabel())}</b><small>Plan: ${esc(p.plan||'-')} • Pending profile updates: ${esc(dash.pendingUpdates||0)}</small></div><button class="btn btn-primary" data-viewgo="subscription">Manage Subscription</button></section>
  <section class="kpis">${Object.entries(s).map(([k,val])=>`<button class="kpi-card" data-viewgo="${k==='reviews'||k==='rating'?'reviews':'analytics'}"><small>${esc(k)}</small><strong>${esc(val)}</strong></button>`).join('')}</section>
  <div class="dash-grid"><section class="panel"><div class="panel-head"><div><h3>Business Management</h3><p>मुख्य supplier tools</p></div></div><div class="action-grid">
    ${[['✏️','Edit Profile','profile'],['🧰','Products / Services','services'],['💬','Requests / Leads','leads'],['⭐','Ratings & Reviews','reviews'],['🖼️','Gallery','gallery'],['💳','Subscription','subscription']].map(x=>`<button data-viewgo="${x[2]}"><span>${x[0]}</span><b>${x[1]}</b><i>→</i></button>`).join('')}
  </div></section><section class="panel"><div class="panel-head"><div><h3>Profile Completion</h3><p>Complete details increase customer trust</p></div></div><div class="panel-body"><div class="progress"><i style="width:${Math.min(100,55+(dash.services?.length?15:0)+(dash.gallery?.length?15:0)+(p.location?15:0))}%"></i></div><p class="muted">Services, photos, exact location र description update गर्नुहोस् ।</p></div></section></div>`;
  $$('[data-viewgo]').forEach(x=>x.onclick=()=>setView(x.dataset.viewgo));
}
function renderProfile(){
  const p=dash.profile||{};
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Business Profile Update</h3><p>Changes direct publish हुँदैन; Admin review पछि public profile मा लागू हुन्छ ।</p></div></div><div class="panel-body"><div class="form-grid">
  <label>Business Name<input id="spName" value="${esc(p.name||'')}"></label><label>Contact Person<input id="spContact"></label><label>Mobile<input id="spMobile"></label><label>WhatsApp<input id="spWhatsapp"></label><label>Email<input id="spEmail"></label><label>District<input id="spDistrict" value="${esc((p.location||'').split(',').pop()?.trim()||'')}"></label><label>Municipality<input id="spMunicipality" value="${esc((p.location||'').split(',')[0]?.trim()||'')}"></label><label>Ward<input id="spWard"></label><label class="span2">Address<input id="spAddress"></label><label class="span2">Description<textarea id="spDescription" rows="4"></textarea></label></div><button class="btn btn-primary" id="profileSubmit">Submit Update Request</button></div></section>`;
  $('#profileSubmit').onclick=async e=>{busy(e.currentTarget,true,'Submitting...');try{const r=await api('supplierProfileUpdateRequest',{changes:{Name:$('#spName').value,ContactPerson:$('#spContact').value,Mobile:$('#spMobile').value,WhatsApp:$('#spWhatsapp').value,Email:$('#spEmail').value,District:$('#spDistrict').value,Municipality:$('#spMunicipality').value,Ward:$('#spWard').value,Address:$('#spAddress').value,Description:$('#spDescription').value}});if(!r.ok)throw new Error(r.message);toast(r.message);await loadDashboardData(true)}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}};
}
function renderServices(){
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Products / Services</h3><p>तपाईंले उपलब्ध गराउने services/products manage गर्नुहोस् ।</p></div><button class="btn btn-primary" id="addService">＋ Add Service</button></div><div class="cards-grid">${(dash.services||[]).length?(dash.services||[]).map(x=>`<article class="mini-card"><span class="status ${x.active?'active':'inactive'}">${x.active?'ACTIVE':'INACTIVE'}</span><h3>${esc(x.name)}</h3><p>${esc(x.description||'')}</p><strong>${x.price?'रु '+esc(x.price)+' / '+esc(x.unit||'unit'):'Price on request'}</strong><div><button class="btn" data-svedit="${esc(x.id)}">Edit</button> <button class="btn ${x.active?'btn-danger':'btn-success'}" data-svtoggle="${esc(x.id)}" data-active="${!x.active}">${x.active?'Inactive':'Activate'}</button></div></article>`).join(''):'<div class="empty-card">Service थपिएको छैन ।</div>'}</div></section>`;
  $('#addService').onclick=()=>serviceForm(null);$$('[data-svedit]').forEach(b=>b.onclick=()=>serviceForm((dash.services||[]).find(x=>x.id===b.dataset.svedit)));$$('[data-svtoggle]').forEach(b=>b.onclick=()=>serviceToggle(b.dataset.svtoggle,b.dataset.active==='true',b));
}
function serviceForm(x){openModal(x?'Edit Service':'Add Service',`<div class="form-stack"><label>Service/Product Name<input id="svName" value="${esc(x?.name||'')}"></label><label>Description<textarea id="svDesc" rows="3">${esc(x?.description||'')}</textarea></label><label>Price<input id="svPrice" type="number" value="${esc(x?.price||'')}"></label><label>Unit<input id="svUnit" value="${esc(x?.unit||'')}" placeholder="trip / hour / piece"></label><button class="btn btn-primary" id="svSave">Save</button></div>`,m=>{$('#svSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const r=await api('supplierServiceSave',{item:{id:x?.id||'',name:$('#svName',m).value.trim(),description:$('#svDesc',m).value,price:$('#svPrice',m).value,unit:$('#svUnit',m).value}});if(!r.ok)throw new Error(r.message);toast('Service saved');closeModal();await loadDashboardData(true)}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
async function serviceToggle(id,active,btn){busy(btn,true,'Updating...');try{const r=await api('supplierServiceToggle',{id,active});if(!r.ok)throw new Error(r.message);toast('Service updated');await loadDashboardData(true)}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}
function renderLeads(){
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Requests / Leads</h3><p>Customer enquiries को follow-up status manage गर्नुहोस् ।</p></div></div><div class="tablewrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Message</th><th>Source</th><th>Status</th><th>Action</th></tr></thead><tbody>${(dash.leads||[]).length?(dash.leads||[]).map(x=>`<tr><td>${esc(x.CustomerName||'-')}</td><td><a href="tel:${esc(x.Mobile||'')}">${esc(x.Mobile||'-')}</a></td><td>${esc(x.Message||'')}</td><td>${esc(x.Source||'-')}</td><td>${esc(x.Status||'NEW')}</td><td><button class="btn" data-lead="${esc(x.LeadID)}" data-status="CONTACTED">Contacted</button> <button class="btn btn-success" data-lead="${esc(x.LeadID)}" data-status="CLOSED">Close</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Lead छैन ।</td></tr>'}</tbody></table></div></section>`;
  $$('[data-lead]').forEach(b=>b.onclick=()=>leadUpdate(b.dataset.lead,b.dataset.status,b));
}
async function leadUpdate(id,status,btn){busy(btn,true,'Saving...');try{const r=await api('supplierLeadUpdate',{id,status});if(!r.ok)throw new Error(r.message);toast('Lead status updated');await loadDashboardData(true)}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}
function renderReviews(){
  const s=dash.stats||{};
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Ratings & Reviews</h3><p>Average Rating: <b>${esc(s.rating||0)} ★</b> • ${esc(s.reviews||0)} reviews</p></div></div><div class="review-list">${(dash.reviews||[]).length?(dash.reviews||[]).map(x=>`<article><div><b>${'★'.repeat(+x.Rating||0)}${'☆'.repeat(5-(+x.Rating||0))}</b><small>${esc(x.CreatedAt||'')}</small></div><p>${esc(x.ReviewText||'')}</p><small>${esc(x.ReviewerName||'Customer')}</small></article>`).join(''):'<div class="empty-card">Approved review छैन ।</div>'}</div></section>`;
}
function renderGallery(){
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Photos / Gallery</h3><p>Business photo URL add गर्नुहोस् ।</p></div><button class="btn btn-primary" id="addGallery">＋ Add Photo</button></div><div class="gallery-grid">${(dash.gallery||[]).filter(x=>x.active).length?(dash.gallery||[]).filter(x=>x.active).map(x=>`<figure><img src="${esc(x.url)}" alt=""><figcaption>${esc(x.caption||'')}</figcaption><button class="btn btn-danger" data-imgdel="${esc(x.id)}">Remove</button></figure>`).join(''):'<div class="empty-card">Photo थपिएको छैन ।</div>'}</div></section>`;
  $('#addGallery').onclick=()=>galleryForm();$$('[data-imgdel]').forEach(b=>b.onclick=()=>galleryDelete(b.dataset.imgdel,b));
}
function galleryForm(){openModal('Add Gallery Photo',`<div class="form-stack"><label>Image URL<input id="gUrl" placeholder="https://..."></label><label>Caption<input id="gCaption"></label><button class="btn btn-primary" id="gSave">Add Photo</button></div>`,m=>{$('#gSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const r=await api('supplierGallerySave',{item:{url:$('#gUrl',m).value.trim(),caption:$('#gCaption',m).value.trim()}});if(!r.ok)throw new Error(r.message);toast('Photo added');closeModal();await loadDashboardData(true)}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
async function galleryDelete(id,btn){if(!confirm('Photo remove गर्ने?'))return;busy(btn,true,'Removing...');try{const r=await api('supplierGalleryDelete',{id});if(!r.ok)throw new Error(r.message);toast('Photo removed');await loadDashboardData(true)}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}
function renderSubscription(){
  const p=dash.profile||{};
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Subscription & Payment</h3><p>Current listing status र renewal request</p></div></div><div class="panel-body"><div class="detail-grid"><div><small>Status</small><b>${esc(statusLabel())}</b></div><div><small>Plan</small><b>${esc(p.plan||'-')}</b></div><div><small>Verification</small><b>${esc(p.verification||'-')}</b></div></div><button class="btn btn-primary" id="renewBtn">Request Renewal / Plan</button></div></section><section class="panel"><div class="panel-head"><div><h3>Recent Renewal Requests</h3></div></div><div class="tablewrap"><table><thead><tr><th>Plan</th><th>Status</th><th>Requested</th></tr></thead><tbody>${(dash.renewals||[]).length?(dash.renewals||[]).map(x=>`<tr><td>${esc(x.PlanID)}</td><td>${esc(x.Status)}</td><td>${esc(x.RequestedAt)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Request history छैन ।</td></tr>'}</tbody></table></div></section>`;
  $('#renewBtn').onclick=()=>renewForm();
}
function renewForm(){openModal('Renewal Request',`<div class="form-stack"><label>Plan ID<select id="rPlan"><option value="basic">Basic</option><option value="pro">Professional</option><option value="premium">Premium</option></select></label><label>Note<textarea id="rNote" rows="3" placeholder="Payment/renewal note"></textarea></label><button class="btn btn-primary" id="rSave">Send Request</button></div>`,m=>{$('#rSave',m).onclick=async e=>{busy(e.currentTarget,true,'Sending...');try{const r=await api('supplierRenewalRequest',{planId:$('#rPlan',m).value,note:$('#rNote',m).value});if(!r.ok)throw new Error(r.message);toast(r.message);closeModal();await loadDashboardData(true)}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
function renderAnalytics(){const s=dash.stats||{};$('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Analytics</h3><p>Business performance overview</p></div></div><section class="kpis">${Object.entries(s).map(([k,v])=>`<article class="kpi-card"><small>${esc(k)}</small><strong>${esc(v)}</strong></article>`).join('')}</section></section>`}
function renderSupport(){
  $('#supplierWorkspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Support</h3><p>Technical वा account assistance request पठाउनुहोस् ।</p></div></div><div class="panel-body"><div class="form-stack"><label>Subject<input id="supSubject"></label><label>Message<textarea id="supMessage" rows="5"></textarea></label><button class="btn btn-primary" id="supportSubmit">Send Support Ticket</button><a class="btn" href="tel:9851113811">📞 Technical Contact</a></div></div></section>`;
  $('#supportSubmit').onclick=async e=>{busy(e.currentTarget,true,'Sending...');try{const r=await api('supplierSupportRequest',{subject:$('#supSubject').value.trim(),message:$('#supMessage').value.trim()});if(!r.ok)throw new Error(r.message);toast(r.message);$('#supSubject').value='';$('#supMessage').value=''}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}};
}
document.addEventListener('DOMContentLoaded',()=>{
  if($('#supplierLogin'))$('#supplierLogin').onclick=login;
  if($('.forgot'))$('.forgot').onclick=e=>{e.preventDefault();forgotPassword()};
  if($('#logoutSupplier'))$('#logoutSupplier').onclick=logout;
  if($('#menuBtn'))$('#menuBtn').onclick=()=>document.body.classList.toggle('sidebar-open');
  $$('[data-view]').forEach(x=>x.onclick=e=>{e.preventDefault();setView(x.dataset.view)});
  if($('#supplierWorkspace'))loadDashboardData(false);
});
