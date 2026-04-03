/* ═══════════════════════ ANIMATED BG ═══════════════════════ */
(function(){
  const c=document.getElementById('bg-canvas');
  const ctx=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
  function init(){
    pts=[];
    for(let i=0;i<55;i++){
      pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.5+.5});
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(0,200,150,.25)';ctx.fill();
    });
    pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<130){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(0,200,150,${.06*(1-d/130)})`;ctx.lineWidth=.7;ctx.stroke();}
    }));
    requestAnimationFrame(draw);
  }
  resize();init();draw();
  window.addEventListener('resize',()=>{resize();init();});
})();

/* ═══════════════════════ OOP BACKEND ═══════════════════════ */
let _pid=1001,_did=2001,_aid=3001,_bid=4001;
let patients=[],doctors=[],appointments=[],bills=[],accounts=[];
let me=null,payBillId=null,regRole='Admin';

class Patient{
  constructor(nm,ag,gn,bl,ph,ad,st,dg){
    this.id=_pid++;this.nm=nm;this.ag=parseInt(ag)||0;this.gn=gn;
    this.bl=bl;this.ph=ph;this.ad=ad;this.st=st;this.dg=dg||'';
    this.date=todayStr();
  }
}
class Doctor{
  constructor(nm,dp,ph,fe,av,ql){
    this.id=_did++;this.nm=nm;this.dp=dp;this.ph=ph;
    this.fe=parseInt(fe)||0;this.av=av||'Mon–Fri 09:00–17:00';this.ql=ql||'MBBS';
  }
}
class Appointment{
  constructor(pid,did,dt,tm,nt){
    this.id=_aid++;this.pid=pid;this.did=did;
    this.dt=dt;this.tm=tm;this.nt=nt||'';this.st='Scheduled';
  }
}
class Bill{
  constructor(pid){
    this.id=_bid++;this.pid=pid;this.items=[];
    this.total=0;this.paid=0;this.method='—';this.st='Unpaid';
    this.date=todayStr();
  }
  addItem(dc,am){this.items.push({dc,am:+am});this.total+=+am;}
  pay(am,mt){
    this.paid=Math.min(this.paid+(+am),this.total);
    this.method=mt;
    this.st=this.paid>=this.total?'Paid':this.paid>0?'Partial':'Unpaid';
  }
  get bal(){return+(this.total-this.paid).toFixed(2);}
}
class Account{
  constructor(fn,ln,em,ph,pw,rl){
    this.id='ACC'+Date.now();this.fn=fn;this.ln=ln;
    this.em=em;this.ph=ph;this.pw=pw;this.rl=rl;
  }
  get full(){return this.fn+' '+this.ln;}
}

/* Seed demo accounts only — NO patient/doctor/appointment/bill data */
(function seedAccounts(){
  accounts.push(new Account('Admin','User','admin@medicore.in','9000000000','Admin@123','Admin'));
  accounts.push(new Account('Dr. Priya','Nair','doctor@medicore.in','9000000001','Doctor@123','Doctor'));
  accounts.push(new Account('Pooja','Sharma','patient@medicore.in','9000000002','Patient@123','Patient'));
})();

/* ═══════════════════════ HELPERS ═══════════════════════ */
function todayStr(){return new Date().toISOString().split('T')[0];}
function fmt(n){return'₹'+parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});}
const GP=id=>patients.find(p=>p.id===id);
const GD=id=>doctors.find(d=>d.id===id);
const GB=id=>bills.find(b=>b.id===id);

function chipFor(s){
  const map={
    Admitted:'background:rgba(255,107,107,.12);color:#ff6b6b;border:1px solid rgba(255,107,107,.3)',
    Outpatient:'background:rgba(0,200,150,.12);color:#00c896;border:1px solid rgba(0,200,150,.3)',
    Scheduled:'background:rgba(77,166,255,.12);color:#4da6ff;border:1px solid rgba(77,166,255,.3)',
    Completed:'background:rgba(0,200,150,.12);color:#00c896;border:1px solid rgba(0,200,150,.3)',
    Cancelled:'background:rgba(100,116,139,.12);color:#8fabcb;border:1px solid rgba(100,116,139,.3)',
    Paid:'background:rgba(0,200,150,.12);color:#00c896;border:1px solid rgba(0,200,150,.3)',
    Unpaid:'background:rgba(255,107,107,.12);color:#ff6b6b;border:1px solid rgba(255,107,107,.3)',
    Partial:'background:rgba(255,179,71,.12);color:#ffb347;border:1px solid rgba(255,179,71,.3)'
  };
  return`<span class="chip" style="${map[s]||map.Cancelled}">${s}</span>`;
}
function bldBadge(b){return`<span class="badge" style="color:#4da6ff;border-color:rgba(77,166,255,.3);background:rgba(77,166,255,.1);padding:2px 8px;font-size:10px">${b}</span>`;}

function showToast(msg,type='ok'){
  const t=document.getElementById('toast');
  const ico={ok:'✅',err:'⚠️',warn:'ℹ️'};
  t.innerHTML=ico[type]+' '+msg;
  t.className='toast show'+(type==='err'?' err':type==='warn'?' warn':'');
  clearTimeout(t._t);t._t=setTimeout(()=>{t.className='toast';},3500);
}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function setErr(id,on){const el=document.getElementById(id);if(el)el.classList.toggle('has-err',on);}

/* ═══════════════════════ AUTH ═══════════════════════ */
function switchAuth(to){
  ['pg-login','pg-register'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display=id===to?'contents':'none';
  });
}
function fillDemo(em,pw){document.getElementById('l-em').value=em;document.getElementById('l-pw').value=pw;}
function togglePw(id,btn){const i=document.getElementById(id);i.type=i.type==='password'?'text':'password';btn.textContent=i.type==='password'?'👁':'🙈';}
function pickRole(el){document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('active'));el.classList.add('active');regRole=el.dataset.role;}
function pwStrength(pw){
  let sc=0;
  if(pw.length>=8)sc++;if(/[A-Z]/.test(pw))sc++;if(/[0-9]/.test(pw))sc++;if(/[^a-zA-Z0-9]/.test(pw))sc++;
  const cl=sc<=1?'w':sc<=2?'m':'s';
  ['ps1','ps2','ps3','ps4'].forEach((id,i)=>{document.getElementById(id).className='pw-seg'+(i<sc?' '+cl:'');});
  const lbl=['','Weak — add uppercase & numbers','Fair — add a special character','Good password','Strong password'][sc]||'';
  const lcol={w:'var(--coral)',m:'var(--amber)',s:'var(--emerald)'}[cl]||'var(--text-dim)';
  document.getElementById('pw-lbl').textContent=lbl;
  document.getElementById('pw-lbl').style.color=lcol;
}

function login(){
  const em=document.getElementById('l-em').value.trim();
  const pw=document.getElementById('l-pw').value;
  let ok=true;
  if(!/\S+@\S+\.\S+/.test(em)){setErr('lf-em',true);ok=false;}else setErr('lf-em',false);
  if(!pw){setErr('lf-pw',true);ok=false;}else setErr('lf-pw',false);
  if(!ok)return;
  const existingByEmail=accounts.find(a=>a.em===em);
  if(!existingByEmail||existingByEmail.pw!==pw){
    showToast('Invalid email or password','err');
    return;
  }
  const acc=existingByEmail;
  me=acc;
  document.getElementById('auth').style.display='none';
  const app=document.getElementById('app');
  app.style.display='flex';
  initApp();
}

function register(){
  const fn=document.getElementById('r-fn').value.trim();
  const ln=document.getElementById('r-ln').value.trim();
  const em=document.getElementById('r-em').value.trim();
  const ph=document.getElementById('r-ph').value.trim();
  const pw=document.getElementById('r-pw').value;
  const cp=document.getElementById('r-cp').value;
  const ag=document.getElementById('r-terms').checked;
  let ok=true;
  if(!fn){setErr('rf-fn',true);ok=false;}else setErr('rf-fn',false);
  if(!ln){setErr('rf-ln',true);ok=false;}else setErr('rf-ln',false);
  if(!/\S+@\S+\.\S+/.test(em)){document.getElementById('rf-em-err').textContent='⚠ Enter a valid email';setErr('rf-em',true);ok=false;}
  else if(accounts.find(a=>a.em===em)){document.getElementById('rf-em-err').textContent='⚠ Email already registered';setErr('rf-em',true);ok=false;}
  else setErr('rf-em',false);
  if(!/^\d{10}$/.test(ph)){setErr('rf-ph',true);ok=false;}else setErr('rf-ph',false);
  if(pw.length<8||!/[A-Z]/.test(pw)||!/[0-9]/.test(pw)){setErr('rf-pw',true);ok=false;}else setErr('rf-pw',false);
  if(pw!==cp){setErr('rf-cp',true);ok=false;}else setErr('rf-cp',false);
  if(!ok)return;
  if(!ag){showToast('Please accept the Terms of Service','warn');return;}
  const acc=new Account(fn,ln,em,ph,pw,regRole);
  accounts.push(acc);
  me=acc;
  document.getElementById('auth').style.display='none';
  document.getElementById('app').style.display='flex';
  initApp();
  showToast('Account created successfully','ok');
}

function logout(){
  me=null;
  document.getElementById('app').style.display='none';
  document.getElementById('auth').style.display='flex';
  switchAuth('pg-login');
  document.getElementById('l-em').value='';
  document.getElementById('l-pw').value='';
}

/* ═══════════════════════ APP INIT ═══════════════════════ */
function initApp(){
  const ini=(me.fn[0]+(me.ln[0]||'')).toUpperCase();
  document.getElementById('tb-av').textContent=ini;
  document.getElementById('tb-nm').textContent=me.full;
  document.getElementById('tb-rl').textContent=me.rl;
  // profile
  document.getElementById('prf-av').textContent=ini;
  document.getElementById('prf-nm').textContent=me.full;
  document.getElementById('prf-em').textContent=me.em;
  document.getElementById('prf-ph').textContent=me.ph;
  document.getElementById('prf-rl').textContent=me.rl;
  document.getElementById('pf-fn').value=me.fn;
  document.getElementById('pf-ln').value=me.ln;
  document.getElementById('pf-em').value=me.em;
  document.getElementById('pf-ph').value=me.ph;
  goPage('dashboard',document.querySelector('.nav-link.active'));
}

/* ═══════════════════════ NAVIGATION ═══════════════════════ */
function goPage(pg,el){
  const sidebar = document.querySelector('.sidebar');
  if(sidebar) sidebar.classList.remove('show-sidebar');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
  const pageEl=document.getElementById('page-'+pg);
  if(!pageEl){goPage('dashboard',document.querySelector('.nav-link'));return;}
  pageEl.classList.add('active');
  if(el)el.classList.add('active');
  const titles={dashboard:'Dashboard',patients:'Add Patient',doctors:'Add Doctor',
    appointments:'Appointments',billing:'Billing & Payments',reports:'Analytics',profile:'My Profile'};
  document.getElementById('tb-title').textContent=titles[pg]||pg;
  renderAll();
}

/* ═══════════════════════ RENDER ENGINE ═══════════════════════ */
function renderAll(){rDash();rPt();rDr();rAp();rBl();rRp();rSB();}
function renderPt(){rPt();}

function rDash(){
  const rev=bills.reduce((s,b)=>s+b.paid,0);
  document.getElementById('s-pt').textContent=patients.length;
  document.getElementById('s-dr').textContent=doctors.length;
  document.getElementById('s-ap').textContent=appointments.length;
  document.getElementById('s-rv').textContent=fmt(rev);
  // recent patients
  const rp=patients.slice(-5).reverse();
  document.getElementById('d-pts').innerHTML=rp.length
    ?rp.map(p=>`<tr><td class="td-id">${p.id}</td><td class="td-name">${p.nm}</td><td>${bldBadge(p.bl)}</td><td>${chipFor(p.st)}</td></tr>`).join('')
    :`<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">🧑‍⚕️</div><div class="empty-msg">No patients yet</div><div class="empty-sub">Register your first patient to get started</div></div></td></tr>`;
  // upcoming appts
  const ua=appointments.filter(a=>a.st==='Scheduled').slice(0,5);
  document.getElementById('d-aps').innerHTML=ua.length
    ?ua.map(a=>{const p=GP(a.pid),d=GD(a.did);return`<tr><td class="td-name">${p?p.nm:'?'}</td><td style="color:var(--text-mid)">${d?d.nm:'?'}</td><td style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">${a.dt} ${a.tm}</td></tr>`;}).join('')
    :`<tr><td colspan="3"><div class="empty-state"><div class="empty-icon">📅</div><div class="empty-msg">No upcoming appointments</div></div></td></tr>`;
}

function rPt(){
  if(!document.getElementById('tbl-pts'))return;
  const q=(document.getElementById('srch-p').value||'').toLowerCase();
  const list=patients.filter(p=>p.nm.toLowerCase().includes(q)||String(p.id).includes(q));
  const confirmedCount=patients.filter(p=>appointments.some(a=>a.pid===p.id&&a.st==='Scheduled')).length;
  const invoiceCount=patients.filter(p=>bills.some(b=>b.pid===p.id)).length;
  const receiptReady=patients.filter(p=>bills.some(b=>b.pid===p.id&&b.paid>0)).length;
  document.getElementById('p-tot').textContent=patients.length;
  document.getElementById('p-cnf').textContent=confirmedCount;
  document.getElementById('p-inv').textContent=invoiceCount;
  document.getElementById('p-rcp').textContent=receiptReady;
  document.getElementById('tbl-pts').innerHTML=list.length
    ?list.map(p=>`<tr>
        <td class="td-id">${p.id}</td><td class="td-name">${p.nm}</td>
        <td style="font-size:12px;color:var(--text-mid)">${p.ph||'—'}</td>
        <td>${apptStatusForPatient(p.id)}</td>
        <td>${invoiceStatusForPatient(p.id)}</td>
        <td>${paymentStatusForPatient(p.id)}</td>
        <td>${receiptStatusForPatient(p.id)}</td>
        <td><div class="td-actions">
          <button class="btn btn-xs btn-outline" onclick="viewPDetail(${p.id})">Detail</button>
          <button class="btn btn-xs btn-outline" onclick="editP(${p.id})">Edit</button>
          <button class="btn btn-xs btn-primary" onclick="openBillForPatient(${p.id})">Invoice</button>
          <button class="btn btn-xs btn-danger" onclick="delP(${p.id})">✕</button>
        </div></td>
      </tr>`).join('')
    :`<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-msg">${patients.length?'No results found':'No patients registered'}</div><div class="empty-sub">${patients.length?'Try a different search term':'Click + Register New Patient to add your first patient'}</div></div></td></tr>`;
}

function apptStatusForPatient(pid){
  const hasConfirmed=appointments.some(a=>a.pid===pid&&a.st==='Scheduled');
  return hasConfirmed?chipFor('Scheduled'):`<span class="chip" style="background:rgba(255,107,107,.12);color:#ff6b6b;border:1px solid rgba(255,107,107,.3)">Not Confirmed</span>`;
}
function invoiceStatusForPatient(pid){
  const hasInvoice=bills.some(b=>b.pid===pid);
  return hasInvoice?`<span class="chip" style="background:rgba(77,166,255,.12);color:#4da6ff;border:1px solid rgba(77,166,255,.3)">Generated</span>`:`<span class="chip" style="background:rgba(100,116,139,.12);color:#8fabcb;border:1px solid rgba(100,116,139,.3)">Pending</span>`;
}
function paymentStatusForPatient(pid){
  const pb=bills.filter(b=>b.pid===pid);
  if(!pb.length)return `<span class="chip" style="background:rgba(100,116,139,.12);color:#8fabcb;border:1px solid rgba(100,116,139,.3)">No Payment</span>`;
  const total=pb.reduce((s,b)=>s+b.total,0);
  const paid=pb.reduce((s,b)=>s+b.paid,0);
  if(paid<=0)return chipFor('Unpaid');
  if(paid>=total)return chipFor('Paid');
  return chipFor('Partial');
}
function receiptStatusForPatient(pid){
  const hasReceipt=bills.some(b=>b.pid===pid&&b.paid>0);
  return hasReceipt?`<span class="chip" style="background:rgba(0,200,150,.12);color:#00c896;border:1px solid rgba(0,200,150,.3)">Available</span>`:`<span class="chip" style="background:rgba(100,116,139,.12);color:#8fabcb;border:1px solid rgba(100,116,139,.3)">Not Available</span>`;
}
function openBillForPatient(pid){
  if(!patients.length){showToast('Register at least one patient first','warn');return;}
  openBillModal();
  setTimeout(()=>{document.getElementById('b-pt').value=String(pid);},20);
}
function viewPDetail(pid){
  const p=GP(pid);if(!p)return;
  const pa=appointments.filter(a=>a.pid===pid);
  const pb=bills.filter(b=>b.pid===pid);
  const lastAppt=pa.length?[...pa].sort((a,b)=>`${b.dt}${b.tm}`.localeCompare(`${a.dt}${a.tm}`))[0]:null;
  const totalBilled=pb.reduce((s,b)=>s+b.total,0);
  const totalPaid=pb.reduce((s,b)=>s+b.paid,0);
  const balance=+(totalBilled-totalPaid).toFixed(2);
  document.getElementById('vp-body').innerHTML=`
    <div class="report-grid">
      <div class="card">
        <div class="card-title"><div class="card-title-bar"></div>Patient Profile</div>
        <div class="rpt-row"><span>Patient ID</span><span class="rpt-val">${p.id}</span></div>
        <div class="rpt-row"><span>Name</span><span class="rpt-val">${p.nm}</span></div>
        <div class="rpt-row"><span>Age / Gender</span><span class="rpt-val">${p.ag} / ${p.gn}</span></div>
        <div class="rpt-row"><span>Blood Group</span><span class="rpt-val">${p.bl}</span></div>
        <div class="rpt-row"><span>Phone</span><span class="rpt-val">${p.ph||'—'}</span></div>
        <div class="rpt-row"><span>Current Status</span><span>${chipFor(p.st)}</span></div>
      </div>
      <div class="card">
        <div class="card-title"><div class="card-title-bar"></div>Appointment & Billing</div>
        <div class="rpt-row"><span>Appointment Confirmed</span><span>${apptStatusForPatient(pid)}</span></div>
        <div class="rpt-row"><span>Last Appointment</span><span class="rpt-val">${lastAppt?`${lastAppt.dt} ${lastAppt.tm}`:'—'}</span></div>
        <div class="rpt-row"><span>Total Invoices</span><span class="rpt-val">${pb.length}</span></div>
        <div class="rpt-row"><span>Total Billed</span><span class="rpt-val">${fmt(totalBilled)}</span></div>
        <div class="rpt-row"><span>Total Paid</span><span class="rpt-val">${fmt(totalPaid)}</span></div>
        <div class="rpt-row"><span>Outstanding</span><span class="rpt-val" style="color:${balance>0?'var(--coral)':'var(--emerald)'}">${fmt(balance)}</span></div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-outline btn-sm" onclick="openBillForPatient(${pid})">Create Invoice</button>
      ${pb.length?`<button class="btn btn-primary btn-sm" onclick="viewInv(${pb[pb.length-1].id})">View Latest Receipt</button>`:''}
    </div>`;
  openModal('m-view-p');
}

function rDr(){
  if(!document.getElementById('tbl-drs'))return;
  document.getElementById('tbl-drs').innerHTML=doctors.length
    ?doctors.map(d=>`<tr>
        <td class="td-id">${d.id}</td><td class="td-name">${d.nm}</td>
        <td><span class="badge" style="color:#4da6ff;border-color:rgba(77,166,255,.3);background:rgba(77,166,255,.08);font-size:11px">${d.dp}</span></td>
        <td style="color:var(--text-dim);font-size:12px">${d.ql}</td>
        <td style="color:var(--text-dim);font-size:12px">${d.av}</td>
        <td style="font-family:var(--mono);color:var(--emerald)">${fmt(d.fe)}</td>
        <td><button class="btn btn-xs btn-danger" onclick="delD(${d.id})">✕</button></td>
      </tr>`).join('')
    :`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👨‍⚕️</div><div class="empty-msg">No doctors registered</div><div class="empty-sub">Click + Add Doctor to add your first doctor</div></div></td></tr>`;
}

function rAp(){
  document.getElementById('tbl-aps').innerHTML=appointments.length
    ?[...appointments].reverse().map(a=>{
        const p=GP(a.pid),d=GD(a.did);
        return`<tr>
          <td class="td-id">${a.id}</td><td class="td-name">${p?p.nm:'?'}</td>
          <td style="color:var(--text-mid)">${d?d.nm:'?'}</td>
          <td style="font-family:var(--mono);font-size:12px">${a.dt}</td>
          <td style="font-family:var(--mono)">${a.tm}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);font-size:12px">${a.nt||'—'}</td>
          <td>${chipFor(a.st)}</td>
          <td><div class="td-actions">${a.st==='Scheduled'?`
            <button class="btn btn-xs btn-outline" onclick="compA(${a.id})">✓ Done</button>
            <button class="btn btn-xs btn-danger" onclick="cancA(${a.id})">Cancel</button>`:''}</div></td>
        </tr>`;
      }).join('')
    :`<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📅</div><div class="empty-msg">No appointments</div><div class="empty-sub">Book an appointment to get started</div></div></td></tr>`;
}

function rBl(){
  document.getElementById('tbl-bls').innerHTML=bills.length
    ?[...bills].reverse().map(b=>{
        const p=GP(b.pid);
        return`<tr>
          <td class="td-id">${b.id}</td><td class="td-name">${p?p.nm:'?'}</td>
          <td style="font-family:var(--mono);font-size:12px">${b.date}</td>
          <td style="font-family:var(--mono)">${fmt(b.total)}</td>
          <td style="font-family:var(--mono);color:var(--emerald)">${fmt(b.paid)}</td>
          <td style="font-family:var(--mono);color:${b.bal>0?'var(--coral)':'var(--emerald)'}">${fmt(b.bal)}</td>
          <td style="font-size:12px;color:var(--text-dim)">${b.method}</td>
          <td>${chipFor(b.st)}</td>
          <td><div class="td-actions">
            <button class="btn btn-xs btn-outline" onclick="viewInv(${b.id})">View</button>
            ${b.st!=='Paid'?`<button class="btn btn-xs btn-primary" onclick="openPay(${b.id})">Pay</button>`:''}
          </div></td>
        </tr>`;
      }).join('')
    :`<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-msg">No bills generated</div><div class="empty-sub">Generate a bill for a patient to get started</div></div></td></tr>`;
}

function rRp(){
  const adm=patients.filter(p=>p.st==='Admitted').length;
  const out=patients.filter(p=>p.st==='Outpatient').length;
  const sc=appointments.filter(a=>a.st==='Scheduled').length;
  const co=appointments.filter(a=>a.st==='Completed').length;
  const ca=appointments.filter(a=>a.st==='Cancelled').length;
  const tot=bills.reduce((s,b)=>s+b.total,0);
  const coll=bills.reduce((s,b)=>s+b.paid,0);
  const pct=tot>0?Math.round(coll/tot*100):0;
  document.getElementById('rpt-pt').innerHTML=
    `<div class="rpt-row"><span>Total Registered</span><span class="rpt-val">${patients.length}</span></div>
     <div class="rpt-row"><span>Currently Admitted</span><span class="rpt-val">${adm}</span></div>
     <div class="rpt-row"><span>Outpatient</span><span class="rpt-val">${out}</span></div>
     <div class="rpt-row"><span>Doctors Available</span><span class="rpt-val">${doctors.length}</span></div>`;
  document.getElementById('rpt-ap').innerHTML=
    `<div class="rpt-row"><span>Total Appointments</span><span class="rpt-val">${appointments.length}</span></div>
     <div class="rpt-row"><span>Scheduled</span><span class="rpt-val">${sc}</span></div>
     <div class="rpt-row"><span>Completed</span><span class="rpt-val">${co}</span></div>
     <div class="rpt-row"><span>Cancelled</span><span class="rpt-val">${ca}</span></div>`;
  document.getElementById('rpt-fn').innerHTML=
    `<div class="rpt-row"><span>Total Billed</span><span class="rpt-val">${fmt(tot)}</span></div>
     <div class="rpt-row"><span>Collected</span><span class="rpt-val">${fmt(coll)}</span></div>
     <div class="rpt-row"><span>Outstanding</span><span class="rpt-val" style="color:var(--coral)">${fmt(tot-coll)}</span></div>
     <div style="margin-top:12px;font-size:12px;color:var(--text-dim)">Collection Rate: ${pct}%</div>
     <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>`;
  const dm={};doctors.forEach(d=>{dm[d.dp]=(dm[d.dp]||0)+1;});
  document.getElementById('rpt-dp').innerHTML=Object.entries(dm).length
    ?Object.entries(dm).map(([k,v])=>`<div class="rpt-row"><span>${k}</span><span class="rpt-val">${v} doctor${v>1?'s':''}</span></div>`).join('')
    :`<div class="empty-state"><div class="empty-icon">🏢</div><div class="empty-msg">No departments yet</div></div>`;
}

function rSB(){
  const adm=patients.filter(p=>p.st==='Admitted').length;
  const td=todayStr();
  const ta=appointments.filter(a=>a.dt===td&&a.st==='Scheduled').length;
  const ub=bills.filter(b=>b.st!=='Paid').length;
  document.getElementById('sb-adm').textContent=adm;
  document.getElementById('sb-tap').textContent=ta;
  document.getElementById('sb-unp').textContent=ub;
}

/* ═══════════════════════ PATIENT ACTIONS ═══════════════════════ */
function addPatient(){
  const nm=document.getElementById('m-p-nm').value.trim();
  if(!nm){setErr('mf-pnm',true);showToast('Patient name is required','err');return;}
  setErr('mf-pnm',false);
  patients.push(new Patient(
    nm,document.getElementById('m-p-ag').value,
    document.getElementById('m-p-gn').value,
    document.getElementById('m-p-bl').value,
    document.getElementById('m-p-ph').value.trim(),
    document.getElementById('m-p-ad').value.trim(),
    document.getElementById('m-p-st').value,
    document.getElementById('m-p-dg').value.trim()
  ));
  closeModal('m-patient');
  ['m-p-nm','m-p-ag','m-p-ph','m-p-ad','m-p-dg'].forEach(id=>document.getElementById(id).value='');
  renderAll();showToast('Patient registered successfully');
}
function editP(id){
  const p=GP(id);if(!p)return;
  document.getElementById('ep-id').value=id;
  document.getElementById('ep-nm').value=p.nm;
  document.getElementById('ep-ag').value=p.ag;
  document.getElementById('ep-ph').value=p.ph;
  document.getElementById('ep-ad').value=p.ad;
  document.getElementById('ep-dg').value=p.dg;
  document.getElementById('ep-st').value=p.st;
  openModal('m-edit-p');
}
function saveEditP(){
  const id=parseInt(document.getElementById('ep-id').value);
  const p=GP(id);if(!p)return;
  p.nm=document.getElementById('ep-nm').value.trim()||p.nm;
  p.ag=parseInt(document.getElementById('ep-ag').value)||p.ag;
  p.ph=document.getElementById('ep-ph').value.trim();
  p.ad=document.getElementById('ep-ad').value.trim();
  p.dg=document.getElementById('ep-dg').value.trim();
  p.st=document.getElementById('ep-st').value;
  closeModal('m-edit-p');renderAll();showToast('Patient record updated');
}
function dischargeP(id){const p=GP(id);if(p){p.st='Outpatient';renderAll();showToast(`${p.nm} discharged successfully`);}}
function delP(id){
  const p=GP(id);if(!p)return;
  if(!confirm(`Delete patient record for "${p.nm}"? This cannot be undone.`))return;
  patients=patients.filter(x=>x.id!==id);renderAll();showToast('Patient record deleted','warn');
}

/* ═══════════════════════ DOCTOR ACTIONS ═══════════════════════ */
function addDoctor(){
  const nm=document.getElementById('m-d-nm').value.trim();
  if(!nm){setErr('mf-dnm',true);showToast('Doctor name is required','err');return;}
  setErr('mf-dnm',false);
  doctors.push(new Doctor(
    nm,document.getElementById('m-d-dp').value,
    document.getElementById('m-d-ph').value.trim(),
    document.getElementById('m-d-fe').value,
    document.getElementById('m-d-av').value.trim(),
    document.getElementById('m-d-ql').value.trim()||'MBBS'
  ));
  closeModal('m-doctor');
  ['m-d-nm','m-d-ph','m-d-fe','m-d-av','m-d-ql'].forEach(id=>document.getElementById(id).value='');
  renderAll();showToast('Doctor added successfully');
}
function delD(id){
  const d=GD(id);if(!d)return;
  if(!confirm(`Remove Dr. ${d.nm} from doctors list?`))return;
  doctors=doctors.filter(x=>x.id!==id);renderAll();showToast('Doctor removed','warn');
}

/* ═══════════════════════ APPOINTMENT ACTIONS ═══════════════════════ */
function openApptModal(){
  if(!patients.length){showToast('Register at least one patient first','warn');return;}
  if(!doctors.length){showToast('Add at least one doctor first','warn');return;}
  document.getElementById('a-pt').innerHTML=patients.map(p=>`<option value="${p.id}">${p.nm} (${p.id})</option>`).join('');
  document.getElementById('a-dr').innerHTML=doctors.map(d=>`<option value="${d.id}">${d.nm} — ${d.dp}</option>`).join('');
  document.getElementById('a-dt').value=todayStr();
  document.getElementById('a-nt').value='';
  updateFee();
  openModal('m-appt');
}
function updateFee(){
  const d=GD(parseInt(document.getElementById('a-dr').value));
  document.getElementById('fee-box').innerHTML=d
    ?`💰 Consultation fee for <strong>${d.nm}</strong> (${d.dp}): <strong style="color:var(--emerald)">${fmt(d.fe)}</strong>`
    :'💰 Select a doctor to see consultation fee';
}
function bookAppt(){
  const pid=parseInt(document.getElementById('a-pt').value);
  const did=parseInt(document.getElementById('a-dr').value);
  const dt=document.getElementById('a-dt').value;
  if(!dt){showToast('Please select an appointment date','err');return;}
  appointments.push(new Appointment(pid,did,dt,document.getElementById('a-tm').value,document.getElementById('a-nt').value.trim()));
  closeModal('m-appt');renderAll();
  const p=GP(pid),d=GD(did);
  showToast(`Appointment booked — ${p?p.nm:'Patient'} with ${d?d.nm:'Doctor'}`);
}
function compA(id){const a=appointments.find(x=>x.id===id);if(a){a.st='Completed';renderAll();showToast('Appointment marked as completed');}}
function cancA(id){const a=appointments.find(x=>x.id===id);if(a){a.st='Cancelled';renderAll();showToast('Appointment cancelled','warn');}}

/* ═══════════════════════ BILLING ACTIONS ═══════════════════════ */
function openBillModal(){
  if(!patients.length){showToast('Register at least one patient first','warn');return;}
  document.getElementById('b-pt').innerHTML=patients.map(p=>`<option value="${p.id}">${p.nm} (${p.id})</option>`).join('');
  document.getElementById('bill-rows').innerHTML='';
  document.getElementById('bill-total').textContent='₹0.00';
  addBillRow();addBillRow();addBillRow();
  openModal('m-bill');
}
function addBillRow(){
  const c=document.getElementById('bill-rows');
  const r=document.createElement('div');
  r.className='bill-item-row';
  r.innerHTML=`
    <input class="bill-item-input" placeholder="Description (e.g. Consultation, ECG, X-Ray…)" oninput="calcBillTotal()"/>
    <input type="number" class="bill-item-input" placeholder="₹ Amount" min="0" step="0.01" oninput="calcBillTotal()"/>
    <button class="bill-del-btn" onclick="this.parentElement.remove();calcBillTotal()">✕</button>`;
  c.appendChild(r);
}
function calcBillTotal(){
  let t=0;
  document.querySelectorAll('#bill-rows input[type=number]').forEach(i=>t+=parseFloat(i.value)||0);
  document.getElementById('bill-total').textContent=fmt(t);
}
function genBill(){
  const pid=parseInt(document.getElementById('b-pt').value);
  const b=new Bill(pid);
  document.querySelectorAll('#bill-rows .bill-item-row').forEach(r=>{
    const [dc,am]=r.querySelectorAll('input');
    if(dc.value.trim()&&parseFloat(am.value)>0)b.addItem(dc.value.trim(),am.value);
  });
  if(b.items.length===0){showToast('Add at least one bill item','err');return;}
  bills.push(b);closeModal('m-bill');renderAll();
  showToast(`Invoice #${b.id} generated — ${fmt(b.total)} for ${GP(pid)?GP(pid).nm:'patient'}`);
}
function openPay(id){
  const b=GB(id);if(!b)return;
  payBillId=id;
  document.getElementById('pay-info').textContent=`Balance due: ${fmt(b.bal)}`;
  document.getElementById('pay-am').value=b.bal.toFixed(2);
  openModal('m-pay');
}
function confirmPay(){
  const b=GB(payBillId);if(!b)return;
  const am=parseFloat(document.getElementById('pay-am').value);
  const mt=document.getElementById('pay-mt').value;
  if(!am||am<=0){showToast('Enter a valid payment amount','err');return;}
  if(am>b.bal){showToast(`Amount exceeds balance (${fmt(b.bal)})`, 'warn');return;}
  b.pay(am,mt);closeModal('m-pay');renderAll();
  showToast(`Payment of ${fmt(am)} via ${mt} recorded for Invoice #${b.id}`);
}
function viewInv(id){
  const b=GB(id);if(!b)return;
  const p=GP(b.pid);
  document.getElementById('inv-body').innerHTML=`
    <div class="invoice-box">
      <div class="inv-head">
        <h2>🏥 MediCore Hospital</h2>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-family:var(--mono)">TAX INVOICE</div>
        <div style="font-size:12px;color:var(--text-mid);margin-top:10px">Invoice #${b.id} &nbsp;·&nbsp; Date: ${b.date}</div>
        <div style="font-size:14px;color:var(--text);font-weight:600;margin-top:4px">${p?p.nm:'Unknown Patient'} &nbsp;<span style="font-size:11px;color:var(--text-dim)">(ID: ${b.pid})</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);letter-spacing:1.5px;text-transform:uppercase;padding-bottom:6px">
        <span>Description</span><span>Amount</span>
      </div>
      ${b.items.map(i=>`<div class="inv-row"><span>${i.dc}</span><span>${fmt(i.am)}</span></div>`).join('')}
      <div style="border-top:1px solid var(--rim2);margin:10px 0"></div>
      <div class="inv-row" style="color:var(--text)"><span>Subtotal</span><span>${fmt(b.total)}</span></div>
      <div class="inv-row" style="color:var(--emerald)"><span>Amount Paid <span style="font-size:10px;opacity:.7">(${b.method})</span></span><span>${fmt(b.paid)}</span></div>
      <div class="inv-total"><span>Balance Due</span><span style="color:${b.bal>0?'var(--coral)':'var(--emerald)'}">${fmt(b.bal)}</span></div>
      <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px dashed var(--rim2)">
        ${chipFor(b.st)}
        <div style="font-size:11px;color:var(--text-dim);margin-top:10px;font-family:var(--mono)">Thank you for choosing MediCore Hospital</div>
      </div>
    </div>`;
  openModal('m-inv');
}

/* ═══════════════════════ PROFILE ═══════════════════════ */
function saveProfile(){
  if(!me)return;
  me.fn=document.getElementById('pf-fn').value.trim()||me.fn;
  me.ln=document.getElementById('pf-ln').value.trim()||me.ln;
  me.em=document.getElementById('pf-em').value.trim()||me.em;
  me.ph=document.getElementById('pf-ph').value.trim()||me.ph;
  initApp();showToast('Profile updated successfully');
}
function changePassword(){
  const np=prompt('Enter new password\n(min 8 chars, 1 uppercase, 1 number):');
  if(!np)return;
  if(np.length<8||!/[A-Z]/.test(np)||!/[0-9]/.test(np)){showToast('Password does not meet requirements','err');return;}
  me.pw=np;showToast('Password changed successfully');
}

/* ═══════════════════════ CLOCK ═══════════════════════ */
function tick(){
  document.getElementById('clock').textContent=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
tick();setInterval(tick,30000);

/* Close modals on backdrop click */
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

/* Sidebar Toggle */
function toggleSidebar(){
  const s = document.querySelector('.sidebar');
  if(s) s.classList.toggle('show-sidebar');
}