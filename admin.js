/**
 * Project : Bhetinchha Digital
 * File    : admin.js
 * Version : 0.6.0
 *
 * Maintainable source:
 * - Do not minify this master file.
 * - Keep functions separated by responsibility.
 * - Make future updates additive/minimal.
 */

const C=window.BHETINCHHA_CONFIG;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let session=JSON.parse(sessionStorage.getItem('bh_session')||'null');
let state={view:'dashboard',data:null};

async function api(action,payload={},timeoutMs=15000){
  if(!C.API_URL||C.DEMO_MODE)return demo(action,payload);
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(C.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:session?.token,...payload}),signal:controller.signal,cache:'no-store'});
    const t=await r.text();try{return JSON.parse(t)}catch(e){throw new Error('Invalid server response')}
  }finally{clearTimeout(timer)}
}
function demo(action,p){
  if(action==='login')return Promise.resolve({ok:true,token:'demo-token',user:{id:'SA1',name:'Demo Super Admin',role:'SUPER_ADMIN',permissions:['*']}});
  if(action==='requestPasswordReset')return Promise.resolve({ok:true,message:'Password reset request पठाइएको छ ।'});
  if(action==='adminDashboard')return Promise.resolve({ok:true,kpi:{businesses:128,pending:14,admins:4,activePlans:72},pending:[]});
  if(action==='adminModuleData'){
    if(p.module==='admins')return Promise.resolve({ok:true,items:[{id:'A01',name:'Supplier Admin',username:'supplier',role:'ADMIN',active:true,permissions:['BUSINESS_VIEW']}],resets:[],permissions:['BUSINESS_VIEW','BUSINESS_EDIT','BUSINESS_APPROVE','ADMIN_VIEW','ADMIN_MANAGE','AUDIT_VIEW']});
    return Promise.resolve({ok:true,items:[],plans:[],payments:[],renewals:[],businesses:[],updates:[]});
  }
  return Promise.resolve({ok:true});
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg,type='success'){
  let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
  el.className='toast '+type;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);
}
function busy(btn,on,label='काम हुँदैछ...'){if(!btn)return;if(on){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.innerHTML='⏳ '+label}else{btn.disabled=false;btn.innerHTML=btn.dataset.old||btn.innerHTML}}
function openModal(title,html,onReady){
  let m=$('#appModal');if(!m){m=document.createElement('div');m.id='appModal';m.className='modal-shell';document.body.appendChild(m)}
  m.innerHTML=`<div class="modal-card"><div class="modal-title"><h3>${esc(title)}</h3><button class="xbtn" data-modal-close>✕</button></div><div class="modal-content">${html}</div></div>`;
  m.classList.add('open');$('[data-modal-close]',m).onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')},{once:true});if(onReady)onReady(m);
}
function closeModal(){const m=$('#appModal');if(m)m.classList.remove('open')}

async function login(){
  const btn=$('#loginBtn'),msg=$('#loginMsg'),username=$('#username').value.trim(),password=$('#password').value;
  if(!username||!password){msg.textContent='Username र Password लेख्नुहोस् ।';return}
  busy(btn,true,'Login हुँदैछ...');
  try{
    const r=await api('login',{username,password},12000);
    if(!r.ok){msg.textContent=r.message||'Login failed';return}
    session={token:r.token,user:r.user};sessionStorage.setItem('bh_session',JSON.stringify(session));location.replace('admin.html');
  }catch(e){msg.textContent=e.name==='AbortError'?'Login response ढिलो भयो । फेरि प्रयास गर्नुहोस् ।':'Login गर्न सकिएन ।'}
  finally{busy(btn,false)}
}
async function forgotPassword(){
  const initial=$('#username')?.value?.trim()||'';
  openModal('Password Reset Request',`<div class="form-stack"><p class="modal-note">Admin Username लेख्नुहोस् । Reset request Super Admin panel मा जान्छ ।</p><label>Username<input id="forgotIdentifier" value="${esc(initial)}" placeholder="Admin username"></label><button class="btn btn-primary" id="forgotSubmit">Reset Request पठाउनुहोस्</button><div id="forgotMsg" class="inline-msg"></div></div>`,m=>{
    $('#forgotSubmit',m).onclick=async e=>{
      const id=$('#forgotIdentifier',m).value.trim();if(!id)return $('#forgotMsg',m).textContent='Username आवश्यक छ ।';
      busy(e.currentTarget,true,'पठाउँदै...');
      try{const r=await api('requestPasswordReset',{accountType:'ADMIN',identifier:id});$('#forgotMsg',m).textContent=r.message||'Request पठाइयो ।'}catch(err){$('#forgotMsg',m).textContent='Request पठाउन सकिएन ।'}finally{busy(e.currentTarget,false)}
    };
  });
}
function guard(){
  if(!session){location.replace('admin-login.html');return false}
  if($('#who'))$('#who').textContent=`${session.user.name} • ${session.user.role}`;
  if($('#adminIdentity'))$('#adminIdentity').textContent=session.user.name||'Admin';
  return true;
}
async function logout(){
  try{await api('logout',{},5000)}catch(e){}
  sessionStorage.removeItem('bh_session');location.replace('admin-login.html');
}
function setView(view){
  state.view=view;$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  document.body.classList.remove('sidebar-open');
  loadView(view);
}
function sectionLoading(title){$('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>${esc(title)}</h3><p>Data load हुँदैछ...</p></div></div><div class="loading-box">⏳ Loading...</div></section>`}

async function loadView(view){
  if(!guard())return;
  if(view==='dashboard')return renderDashboard();
  const titles={businesses:'Businesses',categories:'Categories',plans:'Plans & Payments',emergency:'Emergency Contacts',manpower:'Manpower Review',admins:'Admins & Permissions',audit:'Audit Log'};
  sectionLoading(titles[view]||view);
  try{
    const r=await api('adminModuleData',{module:view});
    if(!r.ok)throw new Error(r.message||'Data load failed');
    state.data=r;
    if(view==='businesses')renderBusinesses(r);
    else if(view==='categories')renderCategories(r);
    else if(view==='plans')renderPlans(r);
    else if(view==='emergency')renderEmergency(r);
    else if(view==='manpower')renderManpower(r);
    else if(view==='admins')renderAdmins(r);
    else if(view==='audit')renderAudit(r);
  }catch(e){$('#workspace').innerHTML=`<div class="errorbox">${esc(e.message)}</div>`}
}
async function renderDashboard(){
  sectionLoading('Dashboard');
  try{
    const r=await api('adminDashboard');
    if(!r.ok)throw new Error(r.message||'Access denied');
    const k=r.kpi||{};
    $('#workspace').innerHTML=`
      <section class="welcome"><div><h2>व्यवस्थापन केन्द्र</h2><p>Business approval, permissions, payments, emergency data र audit activity control गर्नुहोस् ।</p></div><span class="secure-chip">● Protected Session</span></section>
      <section class="kpis">
        ${[['🏪','Businesses',k.businesses||0,'businesses'],['⏳','Pending Approval',k.pending||0,'businesses'],['🛡️','Admins',k.admins||0,'admins'],['💳','Paid Active',k.activePlans||0,'plans']].map(x=>`<button class="kpi-card" data-go="${x[3]}"><span>${x[0]}</span><small>${x[1]}</small><strong>${x[2]}</strong></button>`).join('')}
      </section>
      <div class="dash-grid">
        <section class="panel"><div class="panel-head"><div><h3>Pending Business Approval</h3><p>पहिले verification review, त्यसपछि Trial/Paid activation ।</p></div><button class="btn" data-go="businesses">सबै हेर्नुहोस् →</button></div>
        <div class="tablewrap"><table><thead><tr><th>Business</th><th>Plan</th><th>Action</th></tr></thead><tbody>${(r.pending||[]).length?(r.pending||[]).map(b=>`<tr><td>${esc(b.name)}</td><td>${esc(b.plan||'-')}</td><td><button class="btn btn-primary" data-approve="${esc(b.id)}">Approve Trial</button></td></tr>`).join(''):'<tr><td colspan="3" class="empty">Pending business छैन ।</td></tr>'}</tbody></table></div></section>
        <section class="panel"><div class="panel-head"><div><h3>Quick Control</h3><p>Main modules</p></div></div><div class="quick-list">
          ${[['🗂️','Categories','categories'],['💳','Plans & Payments','plans'],['🚨','Emergency','emergency'],['✈️','Manpower Review','manpower'],['🛡️','Admins & Password Reset','admins'],['🧾','Audit Log','audit']].map(x=>`<button data-go="${x[2]}"><span>${x[0]}</span><b>${x[1]}</b><i>→</i></button>`).join('')}
        </div></section>
      </div>`;
    $$('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
    $$('[data-approve]').forEach(b=>b.onclick=()=>approveBusiness(b.dataset.approve,b));
  }catch(e){$('#workspace').innerHTML=`<div class="errorbox">${esc(e.message)}</div>`}
}
async function approveBusiness(id,btn){
  if(!confirm('Business verification review गरिसक्नुभएको छ? Trial activate गर्ने?'))return;
  busy(btn,true,'Approve...');
  try{const r=await api('approveBusiness',{id});if(!r.ok)throw new Error(r.message);toast(`Approved • Trial ${r.trialDays||''} days`);loadView(state.view)}catch(e){toast(e.message,'error')}finally{busy(btn,false)}
}
function renderBusinesses(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Businesses</h3><p>Approval, trial, paid activation र supplier profile update review</p></div><button class="btn" id="refreshBusinesses">↻ Refresh</button></div>
  <div class="toolbar"><input id="businessSearch" placeholder="Business, mobile, district search..."><select id="businessStatus"><option value="">All Status</option><option>PENDING_REVIEW</option><option>TRIAL_ACTIVE</option><option>ACTIVE</option><option>TRIAL_EXPIRED</option><option>EXPIRED</option></select></div>
  <div class="tablewrap"><table><thead><tr><th>Business</th><th>Location</th><th>Status</th><th>Plan</th><th>Payment</th><th>Action</th></tr></thead><tbody id="businessRows"></tbody></table></div></section>
  <section class="panel"><div class="panel-head"><div><h3>Supplier Profile Update Requests</h3><p>Supplier ले profile change गर्दा Admin approval</p></div></div><div class="tablewrap"><table><thead><tr><th>BusinessID</th><th>Requested</th><th>Changes</th><th>Action</th></tr></thead><tbody>${(r.updates||[]).length?r.updates.map(x=>`<tr><td>${esc(x.BusinessID)}</td><td>${esc(x.RequestedAt)}</td><td class="clip">${esc(x.ChangesJSON)}</td><td><button class="btn btn-success" data-upapprove="${esc(x.RequestID)}">Approve</button> <button class="btn btn-danger" data-upreject="${esc(x.RequestID)}">Reject</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">Pending profile update छैन ।</td></tr>'}</tbody></table></div></section>`;
  const paint=()=>{
    const q=$('#businessSearch').value.toLowerCase(),st=$('#businessStatus').value;
    const list=(r.businesses||[]).filter(x=>(!st||x.status===st)&&(!q||`${x.name} ${x.mobile} ${x.district} ${x.municipality}`.toLowerCase().includes(q)));
    $('#businessRows').innerHTML=list.length?list.map(x=>`<tr><td><b>${esc(x.name)}</b><small>${esc(x.mobile||'')}</small></td><td>${esc([x.municipality,x.district].filter(Boolean).join(', '))}</td><td><span class="status ${esc((x.status||'').toLowerCase())}">${esc(x.status||'-')}</span></td><td>${esc(x.plan||'-')}</td><td>${esc(x.payment||'-')}</td><td><button class="btn" data-viewbiz="${esc(x.id)}">View</button> ${x.status==='PENDING_REVIEW'?`<button class="btn btn-success" data-approve="${esc(x.id)}">Approve Trial</button>`:''}<button class="btn btn-primary" data-activate="${esc(x.id)}">Activate Paid</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Result छैन ।</td></tr>';
    $$('[data-viewbiz]').forEach(b=>b.onclick=()=>businessDetail(list.find(x=>x.id===b.dataset.viewbiz)));
    $$('[data-approve]').forEach(b=>b.onclick=()=>approveBusiness(b.dataset.approve,b));
    $$('[data-activate]').forEach(b=>b.onclick=()=>activateBusiness(b.dataset.activate));
  };
  paint();$('#businessSearch').oninput=paint;$('#businessStatus').onchange=paint;$('#refreshBusinesses').onclick=()=>loadView('businesses');
  $$('[data-upapprove]').forEach(b=>b.onclick=()=>reviewUpdate(b.dataset.upapprove,true,b));$$('[data-upreject]').forEach(b=>b.onclick=()=>reviewUpdate(b.dataset.upreject,false,b));
}
function businessDetail(x){
  if(!x)return;openModal('Business Detail',`<div class="detail-grid">${Object.entries(x).map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(v||'-')}</b></div>`).join('')}</div>`);
}
function activateBusiness(id){
  openModal('Paid Activation',`<div class="form-grid"><label>Plan ID<input id="actPlan" placeholder="basic / pro / premium"></label><label>Active Days<input id="actDays" type="number" value="30" min="1"></label></div><button class="btn btn-primary full" id="actSubmit">Activate Business</button>`,m=>{
    $('#actSubmit',m).onclick=async e=>{busy(e.currentTarget,true,'Activating...');try{const r=await api('activateBusiness',{id,planId:$('#actPlan',m).value.trim(),days:+$('#actDays',m).value||30});if(!r.ok)throw new Error(r.message);toast('Paid activation सफल भयो ।');closeModal();loadView('businesses')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}};
  });
}
async function reviewUpdate(id,approve,btn){busy(btn,true,'Saving...');try{const r=await api('adminReviewSupplierUpdate',{id,approve});if(!r.ok)throw new Error(r.message);toast(approve?'Update approved':'Update rejected');loadView('businesses')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}

function renderCategories(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Categories</h3><p>Search र registration को category database control</p></div><button class="btn btn-primary" id="addCategory">＋ Add Category</button></div><div class="toolbar"><input id="catSearch" placeholder="Category search..."></div><div class="tablewrap"><table><thead><tr><th>Category</th><th>Master</th><th>Listing Type</th><th>Status</th><th>Action</th></tr></thead><tbody id="catRows"></tbody></table></div></section>`;
  const paint=()=>{const q=$('#catSearch').value.toLowerCase(),list=(r.items||[]).filter(x=>!q||`${x.name} ${x.master}`.toLowerCase().includes(q));$('#catRows').innerHTML=list.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.master||'-')}</td><td>${esc(x.listingType||'GENERAL')}</td><td>${x.active?'<span class="status active">ACTIVE</span>':'<span class="status inactive">INACTIVE</span>'}</td><td><button class="btn" data-catedit="${esc(x.id)}">Edit</button> <button class="btn ${x.active?'btn-danger':'btn-success'}" data-cattoggle="${esc(x.id)}" data-active="${!x.active}">${x.active?'Inactive':'Activate'}</button></td></tr>`).join('');$$('[data-catedit]').forEach(b=>b.onclick=()=>categoryForm(list.find(x=>x.id===b.dataset.catedit)));$$('[data-cattoggle]').forEach(b=>b.onclick=()=>toggleCategory(b.dataset.cattoggle,b.dataset.active==='true',b))};
  paint();$('#catSearch').oninput=paint;$('#addCategory').onclick=()=>categoryForm(null);
}
function categoryForm(x){
  openModal(x?'Edit Category':'Add Category',`<div class="form-stack"><label>Category Name<input id="catName" value="${esc(x?.name||'')}"></label><label>Master Category<input id="catMaster" value="${esc(x?.master||'')}"></label><label>Listing Type<input id="catType" value="${esc(x?.listingType||'GENERAL')}"></label><label>Special Module<input id="catSpecial" value="${esc(x?.special||'')}"></label><label>Sort Order<input id="catSort" type="number" value="${esc(x?.sort||999)}"></label><button class="btn btn-primary" id="catSave">Save Category</button></div>`,m=>{$('#catSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const rr=await api('adminCategorySave',{item:{id:x?.id||'',name:$('#catName',m).value.trim(),master:$('#catMaster',m).value.trim(),listingType:$('#catType',m).value.trim(),special:$('#catSpecial',m).value.trim(),sort:+$('#catSort',m).value||999}});if(!rr.ok)throw new Error(rr.message);toast('Category saved');closeModal();loadView('categories')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}});
}
async function toggleCategory(id,active,btn){busy(btn,true,'Updating...');try{const r=await api('adminCategoryToggle',{id,active});if(!r.ok)throw new Error(r.message);toast('Category status updated');loadView('categories')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}

function renderPlans(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Plans</h3><p>Paid duration, price र visibility benefits</p></div><button class="btn btn-primary" id="addPlan">＋ Add Plan</button></div><div class="cards-grid">${(r.plans||[]).map(x=>`<article class="mini-card"><span class="status ${x.active?'active':'inactive'}">${x.active?'ACTIVE':'INACTIVE'}</span><h3>${esc(x.name)}</h3><strong>रु ${esc(x.price)}</strong><p>${esc(x.days)} days • Category limit ${esc(x.categoryLimit)}</p><button class="btn" data-planedit="${esc(x.id)}">Edit</button> <button class="btn ${x.active?'btn-danger':'btn-success'}" data-plantoggle="${esc(x.id)}" data-active="${!x.active}">${x.active?'Inactive':'Activate'}</button></article>`).join('')}</div></section>
  <section class="panel"><div class="panel-head"><div><h3>Renewal Requests</h3><p>Supplier renewal/payment request review</p></div></div><div class="tablewrap"><table><thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Requested</th><th>Action</th></tr></thead><tbody>${(r.renewals||[]).length?r.renewals.map(x=>`<tr><td>${esc(x.BusinessID)}</td><td>${esc(x.PlanID)}</td><td>${esc(x.Status)}</td><td>${esc(x.RequestedAt)}</td><td>${x.Status==='PENDING'?`<button class="btn btn-success" data-renewapprove="${esc(x.RequestID)}" data-plan="${esc(x.PlanID)}">Approve</button> <button class="btn btn-danger" data-renewreject="${esc(x.RequestID)}">Reject</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Renewal request छैन ।</td></tr>'}</tbody></table></div></section>`;
  $('#addPlan').onclick=()=>planForm(null);$$('[data-planedit]').forEach(b=>b.onclick=()=>planForm((r.plans||[]).find(x=>x.id===b.dataset.planedit)));$$('[data-plantoggle]').forEach(b=>b.onclick=()=>togglePlan(b.dataset.plantoggle,b.dataset.active==='true',b));
  $$('[data-renewapprove]').forEach(b=>b.onclick=()=>reviewRenewal(b.dataset.renewapprove,true,b.dataset.plan,b));$$('[data-renewreject]').forEach(b=>b.onclick=()=>reviewRenewal(b.dataset.renewreject,false,'',b));
}
function planForm(x){openModal(x?'Edit Plan':'Add Plan',`<div class="form-stack"><label>Plan Name<input id="pName" value="${esc(x?.name||'')}"></label><label>Price<input id="pPrice" type="number" value="${esc(x?.price||0)}"></label><label>Period Days<input id="pDays" type="number" value="${esc(x?.days||30)}"></label><label>Category Limit<input id="pLimit" type="number" value="${esc(x?.categoryLimit||1)}"></label><label class="check"><input id="pFeatured" type="checkbox" ${x?.featured?'checked':''}> Featured</label><label class="check"><input id="pAnalytics" type="checkbox" ${x?.analytics?'checked':''}> Analytics</label><button class="btn btn-primary" id="pSave">Save Plan</button></div>`,m=>{$('#pSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const rr=await api('adminPlanSave',{item:{id:x?.id||'',name:$('#pName',m).value.trim(),price:+$('#pPrice',m).value||0,days:+$('#pDays',m).value||30,categoryLimit:+$('#pLimit',m).value||1,featured:$('#pFeatured',m).checked,analytics:$('#pAnalytics',m).checked}});if(!rr.ok)throw new Error(rr.message);toast('Plan saved');closeModal();loadView('plans')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
async function togglePlan(id,active,btn){busy(btn,true,'Updating...');try{const r=await api('adminPlanToggle',{id,active});if(!r.ok)throw new Error(r.message);toast('Plan updated');loadView('plans')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}
async function reviewRenewal(id,approve,planId,btn){busy(btn,true,'Saving...');try{const r=await api('adminReviewRenewal',{id,approve,planId});if(!r.ok)throw new Error(r.message);toast(approve?'Renewal approved':'Renewal rejected');loadView('plans')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}

function renderEmergency(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Emergency Contacts</h3><p>Official source सहित emergency directory</p></div><button class="btn btn-primary" id="addEmergency">＋ Add Contact</button></div><div class="toolbar"><input id="emSearch" placeholder="Office, district, phone search..."></div><div class="tablewrap"><table><thead><tr><th>Type</th><th>Office</th><th>Location</th><th>Phone</th><th>Source</th><th>Status</th><th>Action</th></tr></thead><tbody id="emRows"></tbody></table></div></section>`;
  const paint=()=>{const q=$('#emSearch').value.toLowerCase(),list=(r.items||[]).filter(x=>!q||`${x.OfficeName} ${x.District} ${x.Phone}`.toLowerCase().includes(q));$('#emRows').innerHTML=list.map(x=>`<tr><td>${esc(x.Type)}</td><td><b>${esc(x.OfficeName)}</b></td><td>${esc([x.Municipality,x.District].filter(Boolean).join(', '))}</td><td><a href="tel:${esc(x.Phone)}">${esc(x.Phone)}</a></td><td>${x.SourceURL?`<a target="_blank" href="${esc(x.SourceURL)}">Source ↗</a>`:esc(x.SourceName||'-')}</td><td>${String(x.Active).toLowerCase()!=='false'?'<span class="status active">ACTIVE</span>':'<span class="status inactive">INACTIVE</span>'}</td><td><button class="btn" data-emedit="${esc(x.ContactID)}">Edit</button> <button class="btn" data-emtoggle="${esc(x.ContactID)}" data-active="${String(x.Active).toLowerCase()==='false'}">Toggle</button></td></tr>`).join('');$$('[data-emedit]').forEach(b=>b.onclick=()=>emergencyForm(list.find(x=>x.ContactID===b.dataset.emedit)));$$('[data-emtoggle]').forEach(b=>b.onclick=()=>toggleEmergency(b.dataset.emtoggle,b.dataset.active==='true',b))};
  paint();$('#emSearch').oninput=paint;$('#addEmergency').onclick=()=>emergencyForm(null);
}
function emergencyForm(x){openModal(x?'Edit Emergency Contact':'Add Emergency Contact',`<div class="form-grid"><label>Type<input id="eType" value="${esc(x?.Type||'')}"></label><label>Office Name<input id="eOffice" value="${esc(x?.OfficeName||'')}"></label><label>District<input id="eDistrict" value="${esc(x?.District||'')}"></label><label>Municipality<input id="eMunicipality" value="${esc(x?.Municipality||'')}"></label><label>Phone<input id="ePhone" value="${esc(x?.Phone||'')}"></label><label>Alternate Phone<input id="eAlt" value="${esc(x?.AlternatePhone||'')}"></label><label>Source Name<input id="eSource" value="${esc(x?.SourceName||'')}"></label><label>Source URL<input id="eUrl" value="${esc(x?.SourceURL||'')}"></label></div><button class="btn btn-primary full" id="eSave">Save Contact</button>`,m=>{$('#eSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const rr=await api('adminEmergencySave',{item:{id:x?.ContactID||'',type:$('#eType',m).value,officeName:$('#eOffice',m).value,district:$('#eDistrict',m).value,municipality:$('#eMunicipality',m).value,phone:$('#ePhone',m).value,alternatePhone:$('#eAlt',m).value,sourceName:$('#eSource',m).value,sourceUrl:$('#eUrl',m).value}});if(!rr.ok)throw new Error(rr.message);toast('Emergency contact saved');closeModal();loadView('emergency')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
async function toggleEmergency(id,active,btn){busy(btn,true,'Updating...');try{const r=await api('adminEmergencyToggle',{id,active});if(!r.ok)throw new Error(r.message);toast('Contact updated');loadView('emergency')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}

function renderManpower(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Manpower Demand Review</h3><p>Demand approval reference/document verify गरेर मात्र approve गर्नुहोस् ।</p></div><button class="btn" id="refreshManpower">↻ Refresh</button></div><div class="tablewrap"><table><thead><tr><th>Business</th><th>Country</th><th>Position</th><th>Demand</th><th>Status</th><th>Document</th><th>Action</th></tr></thead><tbody>${(r.items||[]).length?r.items.map(x=>`<tr><td>${esc(x.BusinessID)}</td><td>${esc(x.Country)}</td><td>${esc(x.Position)}</td><td>M ${esc(x.Male||0)} / F ${esc(x.Female||0)}</td><td><span class="status ${(x.Status||'').toLowerCase()}">${esc(x.Status||'PENDING')}</span></td><td>${x.ApprovalDocumentURL?`<a target="_blank" href="${esc(x.ApprovalDocumentURL)}">Open ↗</a>`:'-'}</td><td>${String(x.Status||'').toUpperCase()==='PENDING'?`<button class="btn btn-success" data-mapprove="${esc(x.DemandID)}">Approve</button> <button class="btn btn-danger" data-mreject="${esc(x.DemandID)}">Reject</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Manpower demand छैन ।</td></tr>'}</tbody></table></div></section>`;
  $('#refreshManpower').onclick=()=>loadView('manpower');$$('[data-mapprove]').forEach(b=>b.onclick=()=>reviewManpower(b.dataset.mapprove,true,b));$$('[data-mreject]').forEach(b=>b.onclick=()=>reviewManpower(b.dataset.mreject,false,b));
}
async function reviewManpower(id,approve,btn){if(!confirm(approve?'Demand approve गर्ने?':'Demand reject गर्ने?'))return;busy(btn,true,'Saving...');try{const r=await api('adminManpowerReview',{id,approve});if(!r.ok)throw new Error(r.message);toast(approve?'Demand approved':'Demand rejected');loadView('manpower')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}

function renderAdmins(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Admins & Permissions</h3><p>Super Admin controlled access</p></div><button class="btn btn-primary" id="addAdminBtn">＋ Add Admin</button></div><div class="tablewrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Permissions</th><th>Last Login</th><th>Action</th></tr></thead><tbody>${(r.items||[]).map(a=>`<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.username)}</td><td>${esc(a.role)}</td><td>${a.active?'<span class="status active">ACTIVE</span>':'<span class="status inactive">INACTIVE</span>'}</td><td class="clip">${esc((a.permissions||[]).join(', '))}</td><td>${esc(a.lastLogin||'-')}</td><td>${a.role==='SUPER_ADMIN'?'<span class="muted">Protected</span>':`<button class="btn" data-perms="${esc(a.id)}">Permissions</button> <button class="btn ${a.active?'btn-danger':'btn-success'}" data-adminstatus="${esc(a.id)}" data-active="${!a.active}">${a.active?'Inactive':'Activate'}</button>`}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel"><div class="panel-head"><div><h3>Password Reset Requests</h3><p>Admin/Supplier forgot password requests</p></div></div><div class="tablewrap"><table><thead><tr><th>Type</th><th>Identifier</th><th>Name</th><th>Requested</th><th>Action</th></tr></thead><tbody>${(r.resets||[]).length?r.resets.map(x=>`<tr><td>${esc(x.AccountType)}</td><td>${esc(x.Identifier)}</td><td>${esc(x.DisplayName||'-')}</td><td>${esc(x.RequestedAt)}</td><td><button class="btn btn-primary" data-reset="${esc(x.RequestID)}">Reset Password</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Pending reset request छैन ।</td></tr>'}</tbody></table></div></section>`;
  $('#addAdminBtn').onclick=()=>addAdminForm(r.permissions||[]);
  $$('[data-perms]').forEach(b=>b.onclick=()=>permissionsForm((r.items||[]).find(x=>x.id===b.dataset.perms),r.permissions||[]));
  $$('[data-adminstatus]').forEach(b=>b.onclick=()=>toggleAdmin(b.dataset.adminstatus,b.dataset.active==='true',b));
  $$('[data-reset]').forEach(b=>b.onclick=()=>resetPasswordForm(b.dataset.reset));
}
function addAdminForm(perms){openModal('Add Admin',`<div class="form-stack"><label>Name<input id="aName"></label><label>Username<input id="aUser"></label><label>Password<input id="aPass" type="password" placeholder="Minimum 10 characters"></label><div class="permission-grid">${perms.map(p=>`<label class="check"><input type="checkbox" value="${esc(p)}" class="newPerm"> ${esc(p)}</label>`).join('')}</div><button class="btn btn-primary" id="aSave">Create Admin</button></div>`,m=>{$('#aSave',m).onclick=async e=>{busy(e.currentTarget,true,'Creating...');try{const rr=await api('addAdmin',{admin:{name:$('#aName',m).value.trim(),username:$('#aUser',m).value.trim(),password:$('#aPass',m).value,permissions:$$('.newPerm:checked',m).map(x=>x.value)}});if(!rr.ok)throw new Error(rr.message);toast('Admin created');closeModal();loadView('admins')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
function permissionsForm(a,perms){openModal(`Permissions • ${a.name}`,`<div class="permission-grid">${perms.map(p=>`<label class="check"><input type="checkbox" class="editPerm" value="${esc(p)}" ${(a.permissions||[]).includes(p)?'checked':''}> ${esc(p)}</label>`).join('')}</div><button class="btn btn-primary full" id="permSave">Save Permissions</button>`,m=>{$('#permSave',m).onclick=async e=>{busy(e.currentTarget,true,'Saving...');try{const rr=await api('updateAdminPermissions',{id:a.id,permissions:$$('.editPerm:checked',m).map(x=>x.value)});if(!rr.ok)throw new Error(rr.message);toast('Permissions updated');closeModal();loadView('admins')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}}})}
async function toggleAdmin(id,active,btn){if(!confirm(`Admin ${active?'activate':'inactive'} गर्ने?`))return;busy(btn,true,'Updating...');try{const r=await api('setAdminActive',{id,active});if(!r.ok)throw new Error(r.message);toast('Admin status updated');loadView('admins')}catch(e){toast(e.message,'error')}finally{busy(btn,false)}}
function resetPasswordForm(requestId){openModal('Reset Password',`<div class="form-stack"><p class="modal-note">नयाँ temporary password तयार गर्नुहोस् र सम्बन्धित Admin/Supplier लाई सुरक्षित रूपमा दिनुहोस् ।</p><label>New Password<input id="resetPass" type="password" placeholder="Minimum 10 characters"></label><button class="btn" id="generatePass">Generate Strong Password</button><button class="btn btn-primary" id="resetSave">Reset Password</button><div id="generatedShow" class="inline-msg"></div></div>`,m=>{
  $('#generatePass',m).onclick=()=>{const p='Bh@'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36)+'#9X';$('#resetPass',m).value=p;$('#generatedShow',m).textContent='Generated: '+p};
  $('#resetSave',m).onclick=async e=>{const p=$('#resetPass',m).value;if(p.length<10)return toast('Password कम्तीमा 10 characters','error');busy(e.currentTarget,true,'Resetting...');try{const rr=await api('adminResetPassword',{requestId,password:p});if(!rr.ok)throw new Error(rr.message);toast('Password reset completed');closeModal();loadView('admins')}catch(err){toast(err.message,'error')}finally{busy(e.currentTarget,false)}};
})}

function renderAudit(r){
  $('#workspace').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Audit Log</h3><p>Who did what, when, and on which record</p></div><button class="btn" id="auditRefresh">↻ Refresh</button></div><div class="toolbar"><input id="auditSearch" placeholder="Actor, action, module, record search..."></div><div class="tablewrap"><table><thead><tr><th>Date/Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Module</th><th>Record</th><th>Status</th></tr></thead><tbody id="auditTableRows"></tbody></table></div></section>`;
  const paint=()=>{const q=$('#auditSearch').value.toLowerCase(),list=(r.items||[]).filter(x=>!q||`${x.ActorName} ${x.Action} ${x.Module} ${x.RecordID}`.toLowerCase().includes(q));$('#auditTableRows').innerHTML=list.map(x=>`<tr><td>${esc(x.DateTime)}</td><td>${esc(x.ActorName)}</td><td>${esc(x.Role)}</td><td>${esc(x.Action)}</td><td>${esc(x.Module)}</td><td>${esc(x.RecordID)}</td><td>${esc(x.Status)}</td></tr>`).join('')};paint();$('#auditSearch').oninput=paint;$('#auditRefresh').onclick=()=>loadView('audit');
}

document.addEventListener('DOMContentLoaded',()=>{
  if($('#loginBtn'))$('#loginBtn').onclick=login;
  if($('.forgot'))$('.forgot').onclick=e=>{e.preventDefault();forgotPassword()};
  if($('#logoutBtn'))$('#logoutBtn').onclick=logout;
  if($('#menuBtn'))$('#menuBtn').onclick=()=>document.body.classList.toggle('sidebar-open');
  $$('[data-view]').forEach(x=>x.onclick=e=>{e.preventDefault();setView(x.dataset.view)});
  if($('#workspace')){guard();setView('dashboard')}
});
