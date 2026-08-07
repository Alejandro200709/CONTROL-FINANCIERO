
const STORAGE_KEY="finanzas_personales_pwa_v2";
const THEME_KEY="finanzas_theme_v2";

const categories={
  Ingreso:["Salario","Horas extra","Otros ingresos","Beneficio Gourmet"],
  Gasto:["Cuota auto","Seguro auto","GPS auto","Streaming","ChatGPT","Internet hogar","Plan celular","Aporte casa","Cuota Bristol","Combustible","Compras hogar","Supermercado","Comida fuera","Salud","Educación","Ocio","Mantenimiento auto","Imprevistos","Otros"],
  Ahorro:["Fondo de emergencia","Meta de ahorro"],
  Inversion:["Aporte a inversiones"]
};

const icons={
  "Cuota auto":"🚗","Seguro auto":"🛡️","GPS auto":"📍","Streaming":"🎬","ChatGPT":"🤖",
  "Internet hogar":"🌐","Plan celular":"📱","Aporte casa":"🏠","Cuota Bristol":"💳",
  "Combustible":"⛽","Compras hogar":"🛒","Supermercado":"🛍️","Comida fuera":"🍽️",
  "Salud":"❤️","Educación":"📚","Ocio":"🎮","Mantenimiento auto":"🔧","Imprevistos":"⚠️",
  "Salario":"💼","Horas extra":"⏱️","Otros ingresos":"💰","Beneficio Gourmet":"🥦",
  "Fondo de emergencia":"🧯","Meta de ahorro":"🎯","Aporte a inversiones":"📈","Otros":"•"
};

const seed={
  settings:{
    openingSavings:0,
    openingSavingsDate:"",
    saveRate:.10,
    investRate:.05,
    bufferRate:.10,
    emergencyMonths:6,
    setupComplete:false
  },
  debts:[],
  transactions:[]
};

let state=loadState();
let currentType="Gasto";
let selectedTxId=null;

const $=id=>document.getElementById(id);
const money=n=>"Gs. "+Math.round(Number(n||0)).toLocaleString("es-PY");
const pct=n=>(Number(n||0)*100).toFixed(1).replace(".",",")+"%";
const monthOf=d=>d.slice(0,7);
const todayISO=()=>new Date().toISOString().slice(0,10);
const sumTx=list=>list.reduce((s,t)=>s+Number(t.amount||0),0);

function loadState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw){localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));return structuredClone(seed);}
  try{return JSON.parse(raw)}catch{return structuredClone(seed);}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}

function fixedBase(){
  const tx=monthTx().filter(t=>t.type==="Gasto"&&t.nature==="Fijo"&&t.account!=="Gourmet");
  return sumTx(tx);
}
function affectsLiquidSavings(t){
  const cutoff=state.settings.openingSavingsDate||"";
  if(!cutoff || !t.date || t.date<=cutoff) return false;
  if(t.account==="Gourmet") return false;
  return t.type==="Ingreso" || t.type==="Gasto" || t.type==="Inversion";
}
function currentLiquidSavings(){
  let balance=Number(state.settings.openingSavings||0);
  state.transactions.filter(affectsLiquidSavings).forEach(t=>{
    const amount=Number(t.amount||0);
    if(t.type==="Ingreso") balance+=amount;
    if(t.type==="Gasto") balance-=amount;
    if(t.type==="Inversion") balance-=amount;
  });
  return balance;
}
function selectedMonth(){return $("monthPicker").value || todayISO().slice(0,7);}
function monthTx(){return state.transactions.filter(t=>monthOf(t.date)===selectedMonth());}
function getTx(id){return state.transactions.find(t=>t.id===id);}

function init(){
  $("monthPicker").value="2026-08";
  $("date").value=todayISO();
  buildCategoryOptions();
  buildFilterCategories();
  buildQuickButtons();
  bindEvents();
  applyTheme(localStorage.getItem(THEME_KEY)||"auto");
  renderAll();
  if(!state.settings.setupComplete) openSetup();
}
function bindEvents(){
  document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click",()=>navigate(el.dataset.nav)));
  $("quickAddBtn").onclick=()=>navigate("add");
  $("monthPicker").onchange=renderAll;
  $("movementForm").onsubmit=saveMovement;
  document.querySelectorAll("#typeSegment button").forEach(btn=>{
    btn.onclick=()=>setType(btn.dataset.type);
  });
  $("searchInput").oninput=renderMovements;
  $("filterType").onchange=renderMovements;
  $("filterCategory").onchange=renderMovements;
  $("themeBtn").onclick=cycleTheme;
  $("themeRow").onclick=cycleTheme;
  $("setupRow").onclick=openSetup;
  $("backupBtn").onclick=exportBackup;
  $("exportBtn").onclick=exportBackup;
  $("importInput").onchange=importBackup;
  document.querySelectorAll("[data-close-sheet]").forEach(el=>el.onclick=closeSheet);
  $("deleteTxBtn").onclick=deleteSelectedTx;
  $("setupForm").onsubmit=saveSetup;
}
function navigate(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("view-"+view).classList.add("active");
  document.querySelectorAll(".bottom-nav button[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===view));
  if(view==="add"){
    $("date").value=todayISO();
    setType("Gasto");
    setTimeout(()=>$("description").focus(),150);
  }
  if(view==="stats") renderStats();
  if(view==="movements") renderMovements();
  window.scrollTo({top:0,behavior:"smooth"});
}
function setType(type){
  currentType=type;
  document.querySelectorAll("#typeSegment button").forEach(b=>b.classList.toggle("active",b.dataset.type===type));
  buildCategoryOptions();
  if(type==="Ingreso" && $("account").value==="Gourmet") $("account").value="Banco";
}
function buildCategoryOptions(){
  $("category").innerHTML=categories[currentType].map(c=>`<option>${esc(c)}</option>`).join("");
}
function buildFilterCategories(){
  const all=[...new Set(Object.values(categories).flat())].sort((a,b)=>a.localeCompare(b));
  $("filterCategory").innerHTML='<option value="">Todas las categorías</option>'+all.map(c=>`<option>${esc(c)}</option>`).join("");
}
function buildQuickButtons(){
  const quick=[
    ["Supermercado","🛍️"],["Comida fuera","🍽️"],["Combustible","⛽"],
    ["Ocio","🎮"],["Salud","❤️"],["Otros","•"]
  ];
  $("quickButtons").innerHTML=quick.map(([name,ico])=>`<button type="button" data-quick="${esc(name)}">${ico}<br>${esc(name)}</button>`).join("");
  document.querySelectorAll("[data-quick]").forEach(btn=>btn.onclick=()=>{
    setType("Gasto");
    $("category").value=btn.dataset.quick;
    $("description").focus();
  });
}
function saveMovement(e){
  e.preventDefault();
  const tx={
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),
    date:$("date").value,
    type:currentType,
    category:$("category").value,
    description:$("description").value.trim(),
    detail:$("detail").value.trim(),
    amount:Number($("amount").value),
    account:$("account").value,
    priority:$("priority").value,
    nature:$("nature").value
  };
  if(!tx.date||!tx.description||!tx.amount)return;
  state.transactions.push(tx);
  saveState();
  $("monthPicker").value=tx.date.slice(0,7);
  $("movementForm").reset();
  $("date").value=todayISO();
  setType("Gasto");
  renderAll();
  toast("Movimiento guardado");
  navigate("home");
}
function renderAll(){
  renderHome();
  renderMovements();
  renderStats();
  renderDebts();
}
function renderHome(){
  const tx=monthTx();
  const income=sumTx(tx.filter(t=>t.type==="Ingreso"&&t.account!=="Gourmet"));
  const expenses=sumTx(tx.filter(t=>t.type==="Gasto"&&t.account!=="Gourmet"));
  const saving=sumTx(tx.filter(t=>t.type==="Ahorro"));
  const investing=sumTx(tx.filter(t=>t.type==="Inversion"));
  const gourmetIncome=sumTx(tx.filter(t=>t.type==="Ingreso"&&t.account==="Gourmet"));
  const gourmetExpense=sumTx(tx.filter(t=>t.type==="Gasto"&&t.account==="Gourmet"));
  const free=income-expenses-saving-investing;
  const accumulatedSavings=currentLiquidSavings();
  const rate=income?(saving+investing)/income:0;

  $("heroBalance").textContent=money(free);
  $("heroIncome").textContent=money(income);
  $("heroExpense").textContent=money(expenses);
  $("heroSaveInvest").textContent=money(saving+investing);
  $("gourmetCard").textContent=money(gourmetIncome-gourmetExpense);
  $("savingsCard").textContent=money(accumulatedSavings);
  $("savingsSubtitle").textContent=state.settings.openingSavingsDate?`Desde ${shortDate(state.settings.openingSavingsDate)} · ingresos suman, gastos restan`:"Se actualiza con ingresos y gastos";
  $("rateCard").textContent=pct(rate);

  $("heroStatus").textContent=free<0?"Déficit":free<income*.15?"Ajustado":"En control";
  $("heroStatus").style.background=free<0?"rgba(255,80,80,.22)":free<income*.15?"rgba(255,190,80,.20)":"rgba(255,255,255,.14)";

  const today=todayISO();
  const todayExp=sumTx(state.transactions.filter(t=>t.date===today&&t.type==="Gasto"));
  $("todayExpense").textContent=money(todayExp);
  $("todaySubtitle").textContent="Hoy";

  const goal=fixedBase()*state.settings.emergencyMonths;
  const er=goal?Math.min(accumulatedSavings/goal,1):0;
  $("emergencyPct").textContent=pct(er);
  $("emergencyBar").style.width=(er*100)+"%";
  $("emergencyCurrent").textContent=money(accumulatedSavings);
  $("emergencyGoal").textContent="Meta "+money(goal);

  const expensesOnly=tx.filter(t=>t.type==="Gasto");
  drawCategoryChart(expensesOnly);
  renderTopCategories(expensesOnly);
  renderRecent(tx);
}
function categoryTotals(txs){
  const map={};
  txs.forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount||0));
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}
function renderTopCategories(expenses){
  const top=categoryTotals(expenses).slice(0,4);
  $("topCategories").innerHTML=top.length?top.map(([c,v])=>`<div class="category-chip"><span>${esc(c)}</span><b>${money(v)}</b></div>`).join(""):'<p class="muted">Todavía no hay gastos en este mes.</p>';
}
function renderRecent(txs){
  const recent=[...txs].sort(sortTx).slice(0,6);
  $("recentTransactions").innerHTML=recent.length?recent.map(txHTML).join(""):'<p class="muted">Todavía no hay movimientos.</p>';
  bindTxClicks($("recentTransactions"));
}
function sortTx(a,b){return b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id));}
function txHTML(t){
  const cls=t.type==="Ingreso"?"pos":t.type==="Gasto"?"neg":"neutral";
  const sign=t.type==="Ingreso"?"+":t.type==="Gasto"?"−":"";
  return `<button class="transaction-item" data-tx="${esc(t.id)}" style="width:100%;border-left:0;border-right:0;border-top:0;background:transparent;color:inherit;text-align:left">
    <div class="tx-icon">${icons[t.category]||"•"}</div>
    <div class="tx-main">
      <div class="tx-title">${esc(t.description||t.category)}</div>
      <div class="tx-meta">${shortDate(t.date)} · ${esc(t.category)} · ${esc(t.account)}</div>
    </div>
    <div class="tx-amount ${cls}">${sign}${money(t.amount)}</div>
  </button>`;
}
function renderMovements(){
  const term=$("searchInput").value.trim().toLowerCase();
  const type=$("filterType").value;
  const cat=$("filterCategory").value;
  let tx=monthTx().filter(t=>{
    const hay=(t.description+" "+t.detail+" "+t.category).toLowerCase();
    return (!term||hay.includes(term))&&(!type||t.type===type)&&(!cat||t.category===cat);
  }).sort(sortTx);
  $("allTransactions").innerHTML=tx.length?tx.map(txHTML).join(""):'<p class="muted">No se encontraron movimientos.</p>';
  bindTxClicks($("allTransactions"));
  renderDailySummary(tx.filter(t=>t.type==="Gasto"));
}
function renderDailySummary(expenses){
  const map={};
  expenses.forEach(t=>map[t.date]=(map[t.date]||0)+Number(t.amount||0));
  const days=Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
  $("dailySummary").innerHTML=days.map(([d,v])=>`<div class="day-chip"><span>${shortDate(d)}</span><b>${money(v)}</b></div>`).join("");
}
function renderStats(){
  const tx=monthTx();
  const expenses=tx.filter(t=>t.type==="Gasto");
  drawDailyChart(expenses);
  const totals=categoryTotals(expenses);
  const total=totals.reduce((s,x)=>s+x[1],0);
  $("statsCategories").innerHTML=totals.length?totals.slice(0,8).map(([c,v])=>`
    <div class="stat-row">
      <div class="stat-info"><span>${esc(c)}</span><small>${total?pct(v/total):"0%"}</small><div class="stat-bar"><div style="width:${total?(v/total*100):0}%"></div></div></div>
      <b>${money(v)}</b>
    </div>`).join(""):'<p class="muted">Todavía no hay suficientes datos.</p>';
  $("necessaryTotal").textContent=money(sumTx(expenses.filter(t=>t.priority==="Necesario")));
  $("wantTotal").textContent=money(sumTx(expenses.filter(t=>t.priority==="Deseo")));
}
function renderDebts(){
  $("debtsList").innerHTML=state.debts.map(d=>{
    const rem=Math.max(d.total-d.paid,0);
    const progress=d.total?d.paid/d.total:0;
    return `<div class="debt-card">
      <div class="debt-head"><div><b>${esc(d.name)}</b><span>${d.paid}/${d.total} pagadas · ${rem} pendientes</span></div><b>${money(rem*d.monthly)}</b></div>
      <div class="progress"><div style="width:${Math.min(progress,1)*100}%"></div></div>
    </div>`;
  }).join("");
}
function bindTxClicks(container){
  container.querySelectorAll("[data-tx]").forEach(el=>el.onclick=()=>openTx(el.dataset.tx));
}
function openTx(id){
  const t=getTx(id);if(!t)return;
  selectedTxId=id;
  $("sheetContent").innerHTML=`<div class="sheet-detail">
    <p class="eyebrow">${esc(t.type.toUpperCase())}</p>
    <h3>${esc(t.description||t.category)}</h3>
    <div class="big ${t.type==="Gasto"?"neg":t.type==="Ingreso"?"pos":""}">${t.type==="Ingreso"?"+":t.type==="Gasto"?"−":""}${money(t.amount)}</div>
    ${t.detail?`<p style="color:var(--muted);font-size:12px;line-height:1.5">${esc(t.detail)}</p>`:""}
    <div class="detail-grid">
      <div><span>Fecha</span><b>${longDate(t.date)}</b></div>
      <div><span>Categoría</span><b>${esc(t.category)}</b></div>
      <div><span>Cuenta</span><b>${esc(t.account)}</b></div>
      <div><span>Necesidad</span><b>${esc(t.priority||"—")}</b></div>
      <div><span>Frecuencia</span><b>${esc(t.nature||"—")}</b></div>
      <div><span>Tipo</span><b>${esc(t.type)}</b></div>
    </div>
  </div>`;
  $("detailSheet").classList.remove("hidden");
}
function closeSheet(){$("detailSheet").classList.add("hidden");selectedTxId=null;}
function deleteSelectedTx(){
  if(!selectedTxId)return;
  const tx=getTx(selectedTxId);
  if(tx?.id?.startsWith("seed-") && !confirm("Este es un movimiento inicial. ¿Seguro que querés eliminarlo?"))return;
  if(!tx?.id?.startsWith("seed-") && !confirm("¿Eliminar este movimiento?"))return;
  state.transactions=state.transactions.filter(t=>t.id!==selectedTxId);
  saveState();closeSheet();renderAll();toast("Movimiento eliminado");
}
function drawCategoryChart(expenses){
  const canvas=$("categoryChart"),ctx=canvas.getContext("2d");
  setupCanvas(canvas,210);
  const data=categoryTotals(expenses).slice(0,6);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!data.length){drawEmpty(ctx,canvas,"Sin gastos registrados");return;}
  const max=Math.max(...data.map(x=>x[1]),1),left=12,right=12,top=18,bottom=30;
  const h=(canvas.height-top-bottom)/data.length;
  data.forEach(([name,val],i)=>{
    const y=top+i*h;
    ctx.fillStyle=css("--surface-2");ctx.fillRect(left,y,canvas.width-left-right,h*.52);
    ctx.fillStyle=css("--brand");ctx.fillRect(left,y,(canvas.width-left-right)*(val/max),h*.52);
    ctx.fillStyle=css("--muted");ctx.font="11px -apple-system, sans-serif";ctx.fillText(trim(name,18),left,y+h*.52+14);
    ctx.fillStyle=css("--text");ctx.font="700 11px -apple-system, sans-serif";ctx.textAlign="right";ctx.fillText(compactMoney(val),canvas.width-right,y+h*.52+14);ctx.textAlign="left";
  });
}
function drawDailyChart(expenses){
  const canvas=$("dailyChart"),ctx=canvas.getContext("2d");
  setupCanvas(canvas,250);ctx.clearRect(0,0,canvas.width,canvas.height);
  const [y,m]=selectedMonth().split("-").map(Number);
  const days=new Date(y,m,0).getDate();
  const vals=Array(days).fill(0);
  expenses.forEach(t=>vals[Number(t.date.slice(8,10))-1]+=Number(t.amount||0));
  const max=Math.max(...vals,1),pad={l:10,r:10,t:20,b:28},w=canvas.width-pad.l-pad.r,h=canvas.height-pad.t-pad.b;
  ctx.strokeStyle=css("--border");ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,pad.t+h);ctx.lineTo(pad.l+w,pad.t+h);ctx.stroke();
  const step=w/Math.max(days-1,1);
  ctx.beginPath();
  vals.forEach((v,i)=>{
    const x=pad.l+i*step,yv=pad.t+h-(v/max)*h*.88;
    if(i===0)ctx.moveTo(x,yv);else ctx.lineTo(x,yv);
  });
  ctx.strokeStyle=css("--brand");ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
  ctx.fillStyle=css("--muted");ctx.font="10px -apple-system, sans-serif";ctx.textAlign="center";
  [1,Math.ceil(days/2),days].forEach(d=>ctx.fillText(String(d),pad.l+(d-1)*step,canvas.height-8));
  ctx.textAlign="left";
}
function setupCanvas(canvas,cssHeight){
  const ratio=Math.max(window.devicePixelRatio||1,1);
  const width=canvas.parentElement.clientWidth;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(cssHeight*ratio);
  canvas.style.width=width+"px";canvas.style.height=cssHeight+"px";
  canvas.getContext("2d").setTransform(ratio,0,0,ratio,0,0);
  canvas.width=width*ratio;canvas.height=cssHeight*ratio;
  canvas.getContext("2d").scale(ratio,ratio);
  canvas._cssWidth=width;canvas._cssHeight=cssHeight;
}
function drawEmpty(ctx,canvas,msg){
  ctx.fillStyle=css("--muted");ctx.font="12px -apple-system, sans-serif";ctx.textAlign="center";
  ctx.fillText(msg,(canvas._cssWidth||canvas.width)/2,(canvas._cssHeight||canvas.height)/2);ctx.textAlign="left";
}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function trim(s,n){return s.length>n?s.slice(0,n-1)+"…":s;}
function compactMoney(v){
  if(v>=1000000)return (v/1000000).toFixed(v%1000000?1:0).replace(".",",")+" M";
  if(v>=1000)return Math.round(v/1000)+" mil";
  return String(v);
}
function shortDate(s){
  const d=new Date(s+"T12:00:00");
  return new Intl.DateTimeFormat("es-PY",{day:"2-digit",month:"short"}).format(d);
}
function longDate(s){
  const d=new Date(s+"T12:00:00");
  return new Intl.DateTimeFormat("es-PY",{day:"2-digit",month:"long",year:"numeric"}).format(d);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),1900);}


function openSetup(){
  $("setupSavings").value=state.settings.openingSavings||"";
  $("setupSavingsDate").value=state.settings.openingSavingsDate||todayISO();
  $("setupEmergencyMonths").value=String(state.settings.emergencyMonths||6);
  $("setupSheet").classList.remove("hidden");
}
function saveSetup(e){
  e.preventDefault();
  state.settings.openingSavings=Number($("setupSavings").value||0);
  state.settings.openingSavingsDate=$("setupSavingsDate").value||todayISO();
  state.settings.emergencyMonths=Number($("setupEmergencyMonths").value||6);
  state.settings.setupComplete=true;
  saveState();
  $("setupSheet").classList.add("hidden");
  renderAll();
  toast("Configuración guardada");
  navigate("add");
}

function exportBackup(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`respaldo-finanzas-${todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importBackup(e){
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data.transactions||!data.settings)throw new Error("invalid");
    state=data;saveState();renderAll();toast("Respaldo restaurado");
  }catch{alert("No se pudo importar el archivo.");}
  e.target.value="";
}

const themeOrder=["auto","light","dark"];
function cycleTheme(){
  const current=localStorage.getItem(THEME_KEY)||"auto";
  const next=themeOrder[(themeOrder.indexOf(current)+1)%themeOrder.length];
  localStorage.setItem(THEME_KEY,next);applyTheme(next);renderAll();
}
function applyTheme(mode){
  let actual=mode;
  if(mode==="auto")actual=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  document.documentElement.dataset.theme=actual;
  $("themeLabel").textContent=mode==="auto"?"Automático":mode==="light"?"Claro":"Oscuro";
  $("themeBtn").textContent=mode==="dark"?"☀︎":mode==="light"?"☾":"◐";
  const meta=document.querySelector('meta[name="theme-color"]');
  meta.setAttribute("content",actual==="dark"?"#0b1220":"#f4f7fa");
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if((localStorage.getItem(THEME_KEY)||"auto")==="auto"){applyTheme("auto");renderAll();}});
window.addEventListener("resize",()=>{clearTimeout(window.__rt);window.__rt=setTimeout(()=>{renderHome();renderStats()},120);});

if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}
init();
