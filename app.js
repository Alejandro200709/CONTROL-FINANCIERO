const STORAGE_KEY="finanzas_personales_pwa_v2";
const THEME_KEY="finanzas_theme_v4";

const CURRENCIES={
  PYG:{code:"PYG",name:"Guaraní paraguayo",symbol:"₲",decimals:0},
  USD:{code:"USD",name:"Dólar estadounidense",symbol:"US$",decimals:2},
  EUR:{code:"EUR",name:"Euro",symbol:"€",decimals:2},
  BRL:{code:"BRL",name:"Real brasileño",symbol:"R$",decimals:2},
  ARS:{code:"ARS",name:"Peso argentino",symbol:"AR$",decimals:2}
};
const TYPE_CATEGORIES={
  Gasto:["Alimentación","Hogar","Transporte","Deudas","Suscripciones","Salud","Educación","Ocio","Compras","Imprevistos","Otros"],
  Ingreso:["Salario","Horas extra","Bonificación","Venta","Reintegro","Otros ingresos"],
  Ahorro:["Fondo de emergencia","Meta de ahorro","Reserva"],
  Inversion:["Inversión","Aporte a cartera"]
};
const QUICK=[
  ["Alimentación","🍽️","Comida / súper"],["Transporte","🚗","Auto / movilidad"],["Hogar","🏠","Casa"],
  ["Suscripciones","💻","Servicios"],["Ocio","🎮","Entretenimiento"],["Otros","•","Otro gasto"]
];
const ICONS={"Alimentación":"🍽️","Hogar":"🏠","Transporte":"🚗","Deudas":"💳","Suscripciones":"💻","Salud":"❤️","Educación":"📚","Ocio":"🎮","Compras":"🛍️","Imprevistos":"⚠️","Otros":"•","Salario":"💼","Horas extra":"⏱️","Bonificación":"🎁","Venta":"🤝","Reintegro":"↩️","Otros ingresos":"💰","Fondo de emergencia":"🧯","Meta de ahorro":"🎯","Reserva":"🪙","Inversión":"📈","Aporte a cartera":"📊"};
const LEGACY_CATEGORY_MAP={"Cuota auto":"Deudas","Seguro auto":"Transporte","GPS auto":"Transporte","Streaming":"Suscripciones","ChatGPT":"Suscripciones","Internet hogar":"Hogar","Plan celular":"Suscripciones","Aporte casa":"Hogar","Cuota Bristol":"Deudas","Combustible":"Transporte","Compras hogar":"Hogar","Supermercado":"Alimentación","Comida fuera":"Alimentación","Mantenimiento auto":"Transporte","Beneficio Gourmet":"Bonificación"};
const EMPTY_STATE={settings:{baseCurrency:"PYG",openingSavings:0,openingSavingsDate:"",saveRate:.10,investRate:.05,emergencyMonths:6,setupComplete:false},debts:[],transactions:[]};

let state=loadState();
let currentType="Gasto";
let selectedTxId=null;

const $=id=>document.getElementById(id);
const todayISO=()=>new Date().toISOString().slice(0,10);
const monthOf=d=>String(d||"").slice(0,7);
const sum=(list,fn=x=>x)=>list.reduce((s,x)=>s+Number(fn(x)||0),0);
const clone=o=>JSON.parse(JSON.stringify(o));

function baseCurrency(){return state.settings.baseCurrency||"PYG"}
function currencyMeta(code){return CURRENCIES[code]||CURRENCIES.PYG}
function migrateTx(t,base="PYG"){
  const old=t.category||"Otros";
  return {...t,category:LEGACY_CATEGORY_MAP[old]||old,originalCategory:t.originalCategory||old,subcategory:t.subcategory||"",currency:t.currency||base,exchangeRate:Number(t.exchangeRate||1),priority:t.priority||"Necesario",nature:t.nature||"Variable"};
}
function loadState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)return clone(EMPTY_STATE);
  try{
    const s=JSON.parse(raw);s.settings={...EMPTY_STATE.settings,...(s.settings||{})};const base=s.settings.baseCurrency||"PYG";s.transactions=(s.transactions||[]).map(t=>migrateTx(t,base));s.debts=s.debts||[];return s;
  }catch{return clone(EMPTY_STATE)}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}

function formatNumber(value,code=baseCurrency()){
  const c=currencyMeta(code);return new Intl.NumberFormat("es-PY",{minimumFractionDigits:c.decimals,maximumFractionDigits:c.decimals}).format(Number(value||0));
}
function formatMoney(value,code=baseCurrency()){const c=currencyMeta(code);return `${c.symbol} ${formatNumber(value,code)}`}
function parseMoneyInput(raw,code){
  const c=currencyMeta(code);let s=String(raw||"").replace(/\s/g,"");
  if(c.decimals===0){s=s.replace(/[^\d]/g,"");return Number(s||0)}
  s=s.replace(/[^\d,]/g,"");const parts=s.split(",");const whole=(parts.shift()||"").replace(/\D/g,"");const dec=parts.join("").replace(/\D/g,"").slice(0,c.decimals);return Number((whole||"0")+"."+(dec||"0"));
}
function formatMoneyInput(raw,code){
  const c=currencyMeta(code);let s=String(raw||"");
  if(c.decimals===0){const digits=s.replace(/\D/g,"");return digits?new Intl.NumberFormat("es-PY",{maximumFractionDigits:0}).format(Number(digits)):""}
  s=s.replace(/[^\d,]/g,"");const had=s.includes(",");const [w,...rest]=s.split(",");const digits=(w||"").replace(/\D/g,"");const whole=digits?new Intl.NumberFormat("es-PY",{maximumFractionDigits:0}).format(Number(digits)):"";const dec=rest.join("").replace(/\D/g,"").slice(0,c.decimals);return whole+(had?","+dec:"");
}
function formatRateInput(raw){let s=String(raw||"").replace(/[^\d,]/g,"");const had=s.includes(",");const [w,...rest]=s.split(",");const digits=(w||"").replace(/\D/g,"");const whole=digits?new Intl.NumberFormat("es-PY",{maximumFractionDigits:0}).format(Number(digits)):"";const dec=rest.join("").replace(/\D/g,"").slice(0,4);return whole+(had?","+dec:"")}
function parseRate(raw){return Number(String(raw||"").replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,"")||0)}
function convertedAmount(t){if((t.currency||baseCurrency())===baseCurrency())return Number(t.amount||0);const r=Number(t.exchangeRate||0);return r>0?Number(t.amount||0)*r:0}
function isConvertible(t){return (t.currency||baseCurrency())===baseCurrency()||Number(t.exchangeRate||0)>0}
function selectedMonth(){return $("monthPicker").value||todayISO().slice(0,7)}
function monthTx(){return state.transactions.filter(t=>monthOf(t.date)===selectedMonth())}
function txById(id){return state.transactions.find(t=>t.id===id)}
function fixedMonthlyTotal(){return sum(monthTx().filter(t=>t.type==="Gasto"&&t.nature==="Fijo"&&t.account!=="Gourmet"&&isConvertible(t)),convertedAmount)}
function currentLiquidSavings(){
  const cutoff=state.settings.openingSavingsDate||"";let bal=Number(state.settings.openingSavings||0);
  state.transactions.forEach(t=>{if(!t.date||(cutoff&&t.date<=cutoff)||t.account==="Gourmet"||!isConvertible(t))return;const v=convertedAmount(t);if(t.type==="Ingreso")bal+=v;if(t.type==="Gasto")bal-=v;if(t.type==="Inversion")bal-=v});return bal;
}

function init(){
  $("monthPicker").value=todayISO().slice(0,7);$("date").value=todayISO();populateCurrencies();populateFilters();buildQuickButtons();bindEvents();setType("Gasto");applyTheme(localStorage.getItem(THEME_KEY)||"auto");renderAll();if(!state.settings.setupComplete)openInitialSheet();
}
function bindEvents(){
  document.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>navigate(el.dataset.nav));$("quickAddBtn").onclick=()=>navigate("add");$("monthPicker").onchange=renderAll;$("movementForm").onsubmit=saveMovement;
  $("typeSegment").querySelectorAll("button").forEach(b=>b.onclick=()=>setType(b.dataset.type));$("amountDisplay").oninput=e=>e.target.value=formatMoneyInput(e.target.value,$("currency").value);$("exchangeRate").oninput=e=>e.target.value=formatRateInput(e.target.value);$("currency").onchange=handleCurrencyChange;$("moreDetailsBtn").onclick=toggleMoreDetails;
  $("searchInput").oninput=renderMovements;$("filterType").onchange=renderMovements;$("filterCategory").onchange=renderMovements;$("filterCurrency").onchange=renderMovements;$("themeBtn").onclick=cycleTheme;$("themeRow").onclick=cycleTheme;$("backupBtn").onclick=exportBackup;$("exportBtn").onclick=exportBackup;$("importInput").onchange=importBackup;$("initialSettingsBtn").onclick=openInitialSheet;$("currencySettingsBtn").onclick=openCurrencySheet;$("initialForm").onsubmit=saveInitialSettings;$("initialSavingsDisplay").oninput=e=>e.target.value=formatMoneyInput(e.target.value,baseCurrency());$("deleteTxBtn").onclick=deleteSelectedTx;
  document.querySelectorAll("[data-close-sheet]").forEach(el=>el.onclick=closeDetailSheet);document.querySelectorAll("[data-close-currency]").forEach(el=>el.onclick=closeCurrencySheet);
}
function navigate(view){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("view-"+view).classList.add("active");document.querySelectorAll(".bottom-nav button[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===view));if(view==="add"){$("date").value=todayISO();setType("Gasto");setTimeout(()=>$("amountDisplay").focus(),120)}if(view==="stats")renderStats();if(view==="movements")renderMovements();if(view==="more")renderMore();window.scrollTo({top:0,behavior:"smooth"})}
function populateCurrencies(){const opts=Object.values(CURRENCIES).map(c=>`<option value="${c.code}">${c.code} · ${c.name}</option>`).join("");$("currency").innerHTML=opts;$("filterCurrency").innerHTML='<option value="">Todas las monedas</option>'+opts;$("currency").value=baseCurrency();updateCurrencyUI()}
function populateFilters(){const all=[...new Set(Object.values(TYPE_CATEGORIES).flat())].sort((a,b)=>a.localeCompare(b));$("filterCategory").innerHTML='<option value="">Todas las categorías</option>'+all.map(c=>`<option>${esc(c)}</option>`).join("")}
function buildQuickButtons(){$("quickButtons").innerHTML=QUICK.map(([cat,ico,label])=>`<button type="button" data-quick="${esc(cat)}">${ico}<br>${esc(label)}</button>`).join("");document.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>{setType("Gasto");$("category").value=b.dataset.quick;$("description").focus()})}
function setType(type){currentType=type;$("typeSegment").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.type===type));$("category").innerHTML=TYPE_CATEGORIES[type].map(c=>`<option>${esc(c)}</option>`).join("");if(type==="Ingreso"&&$("account").value==="Gourmet")$("account").value="Banco"}
function toggleMoreDetails(){const hidden=$("moreDetails").classList.toggle("hidden");$("moreDetailsBtn").textContent=hidden?"+ Más detalles":"− Menos detalles"}
function handleCurrencyChange(){$("amountDisplay").value=formatMoneyInput($("amountDisplay").value,$("currency").value);updateCurrencyUI()}
function updateCurrencyUI(){const code=$("currency").value||baseCurrency(),meta=currencyMeta(code),foreign=code!==baseCurrency();$("currencyPrefix").textContent=meta.symbol;$("exchangeBox").classList.toggle("hidden",!foreign);$("exchangeRate").required=foreign;$("foreignCode").textContent=code;$("baseSymbol").textContent=currencyMeta(baseCurrency()).symbol;$("exchangeLabel").textContent=`Tipo de cambio a ${baseCurrency()}`;$("initialCurrencyPrefix").textContent=currencyMeta(baseCurrency()).symbol}
function resetForm(){$("movementForm").reset();$("date").value=todayISO();$("currency").value=baseCurrency();$("moreDetails").classList.add("hidden");$("moreDetailsBtn").textContent="+ Más detalles";setType("Gasto");updateCurrencyUI()}
function saveMovement(e){
  e.preventDefault();const cur=$("currency").value,amount=parseMoneyInput($("amountDisplay").value,cur),foreign=cur!==baseCurrency(),rate=foreign?parseRate($("exchangeRate").value):1;
  if(!(amount>0)){toast("Ingresá un monto válido");return}if(foreign&&!(rate>0)){toast("Ingresá el tipo de cambio");return}
  const tx={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:$("date").value,type:currentType,category:$("category").value,subcategory:$("subcategory").value.trim(),description:$("description").value.trim(),detail:$("detail").value.trim(),amount,currency:cur,exchangeRate:rate,account:$("account").value,priority:$("priority").value,nature:$("nature").value};
  state.transactions.push(tx);saveState();$("monthPicker").value=monthOf(tx.date);resetForm();renderAll();toast("Movimiento guardado");navigate("home");
}

function renderAll(){renderHome();renderMovements();renderStats();renderMore();renderCurrencyLabels()}
function renderCurrencyLabels(){const c=currencyMeta(baseCurrency());$("baseCurrencyLabel").textContent=`${c.code} · ${c.name}`;$("initialCurrencyPrefix").textContent=c.symbol;$("baseSymbol").textContent=c.symbol}
function renderHome(){
  const tx=monthTx(),usable=tx.filter(isConvertible);const income=sum(usable.filter(t=>t.type==="Ingreso"&&t.account!=="Gourmet"),convertedAmount),expense=sum(usable.filter(t=>t.type==="Gasto"&&t.account!=="Gourmet"),convertedAmount),investment=sum(usable.filter(t=>t.type==="Inversion"),convertedAmount),reserved=sum(usable.filter(t=>t.type==="Ahorro"),convertedAmount),gourmetIn=sum(usable.filter(t=>t.type==="Ingreso"&&t.account==="Gourmet"),convertedAmount),gourmetOut=sum(usable.filter(t=>t.type==="Gasto"&&t.account==="Gourmet"),convertedAmount),free=income-expense-investment,liquid=currentLiquidSavings(),rate=income?(reserved+investment)/income:0;
  $("monthBalance").textContent=formatMoney(free);$("monthIncome").textContent=formatMoney(income);$("monthExpense").textContent=formatMoney(expense);$("monthInvestment").textContent=formatMoney(investment);$("liquidSavings").textContent=formatMoney(liquid);$("liquidSavingsSub").textContent=state.settings.openingSavingsDate?`Desde ${shortDate(state.settings.openingSavingsDate)} · saldo vivo`:"Saldo vivo";$("gourmetBalance").textContent=formatMoney(gourmetIn-gourmetOut);$("savingRate").textContent=pct(rate);
  const st=$("monthStatus");if(free<0){st.textContent="Déficit";st.style.background="rgba(180,35,24,.30)"}else if(income&&free<income*.12){st.textContent="Ajustado";st.style.background="rgba(181,71,8,.26)"}else{st.textContent="En control";st.style.background="rgba(255,255,255,.12)"}
  const today=todayISO(),todayTx=state.transactions.filter(t=>t.date===today&&t.type==="Gasto"&&isConvertible(t));$("todayExpense").textContent=formatMoney(sum(todayTx,convertedAmount));$("todayCount").textContent=`${todayTx.length} ${todayTx.length===1?"movimiento":"movimientos"}`;
  const fixed=fixedMonthlyTotal(),goal=fixed*Number(state.settings.emergencyMonths||6),progress=goal>0?Math.min(Math.max(liquid/goal,0),1):0;$("emergencyPct").textContent=pct(progress);$("emergencyBar").style.width=progress*100+"%";$("emergencyCurrent").textContent=formatMoney(liquid);$("emergencyGoal").textContent=goal>0?`Meta ${formatMoney(goal)}`:"Cargá gastos fijos para calcular la meta";
  renderCategoryBars($("homeCategoryBars"),usable.filter(t=>t.type==="Gasto"&&t.account!=="Gourmet"),4);renderRecent(tx);const bad=tx.filter(t=>!isConvertible(t));$("foreignWarning").classList.toggle("hidden",!bad.length);if(bad.length)$("foreignWarning").textContent=`Hay ${bad.length} movimiento(s) en otra moneda sin tipo de cambio; no se incluyen en los totales.`;
}
function renderRecent(tx){const list=[...tx].sort(sortTx).slice(0,6);$("recentTransactions").innerHTML=list.length?list.map(txHTML).join(""):'<p class="empty">Todavía no hay movimientos en este mes.</p>';bindTxClicks($("recentTransactions"))}
function categoryTotals(expenses){const map={};expenses.forEach(t=>{const c=t.category||"Otros";map[c]=(map[c]||0)+convertedAmount(t)});return Object.entries(map).sort((a,b)=>b[1]-a[1])}
function renderCategoryBars(container,expenses,limit=99){const totals=categoryTotals(expenses).slice(0,limit),total=sum(totals,x=>x[1]);if(!totals.length){container.innerHTML='<p class="empty">Todavía no hay gastos para analizar.</p>';return}container.innerHTML=totals.map(([cat,val])=>{const share=total?val/total:0;return `<div class="category-row"><div><div class="category-name">${ICONS[cat]||"•"} ${esc(cat)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(share*100,2)}%"></div></div><div class="category-meta">${pct(share)} del gasto</div></div><div class="category-value">${formatMoney(val)}</div></div>`}).join("")}
function renderMovements(){const term=$("searchInput").value.trim().toLowerCase(),type=$("filterType").value,cur=$("filterCurrency").value,cat=$("filterCategory").value;let tx=monthTx().filter(t=>{const hay=[t.description,t.detail,t.category,t.subcategory].join(" ").toLowerCase();return(!term||hay.includes(term))&&(!type||t.type===type)&&(!cur||t.currency===cur)&&(!cat||t.category===cat)}).sort(sortTx);$("allTransactions").innerHTML=tx.length?tx.map(txHTML).join(""):'<p class="empty">No se encontraron movimientos.</p>';bindTxClicks($("allTransactions"));renderDailySummary(tx.filter(t=>t.type==="Gasto"&&isConvertible(t)))}
function renderDailySummary(expenses){const map={};expenses.forEach(t=>map[t.date]=(map[t.date]||0)+convertedAmount(t));const days=Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);$("dailySummary").innerHTML=days.map(([d,v])=>`<div class="day-chip"><span>${shortDate(d)}</span><b>${formatMoney(v)}</b></div>`).join("")}
function txHTML(t){const cls=t.type==="Ingreso"?"pos":t.type==="Gasto"?"neg":t.type==="Inversion"?"investment":"",sign=t.type==="Ingreso"?"+":t.type==="Gasto"?"−":"",foreign=(t.currency||baseCurrency())!==baseCurrency(),baseLine=foreign&&isConvertible(t)?`<span class="tx-base">≈ ${formatMoney(convertedAmount(t))}</span>`:"";return `<button class="transaction-item" data-tx="${esc(t.id)}" style="width:100%;background:transparent;color:inherit;text-align:left"><div class="tx-icon">${ICONS[t.category]||"•"}</div><div class="tx-main"><div class="tx-title">${esc(t.description||t.category)}</div><div class="tx-meta">${shortDate(t.date)} · ${esc(t.category)}${t.subcategory?` / ${esc(t.subcategory)}`:""} · ${esc(t.account)}</div></div><div class="tx-amount ${cls}">${sign}${formatMoney(t.amount,t.currency||baseCurrency())}${baseLine}</div></button>`}
function bindTxClicks(container){container.querySelectorAll("[data-tx]").forEach(el=>el.onclick=()=>openTx(el.dataset.tx))}
function openTx(id){const t=txById(id);if(!t)return;selectedTxId=id;const foreign=(t.currency||baseCurrency())!==baseCurrency();$("sheetContent").innerHTML=`<div class="sheet-detail"><p class="eyebrow">${esc(t.type.toUpperCase())}</p><h3>${esc(t.description||t.category)}</h3><div class="big ${t.type==="Ingreso"?"pos":t.type==="Gasto"?"neg":t.type==="Inversion"?"investment":""}">${t.type==="Ingreso"?"+":t.type==="Gasto"?"−":""}${formatMoney(t.amount,t.currency||baseCurrency())}</div>${foreign&&isConvertible(t)?`<p class="category-meta">Equivalente: <b>${formatMoney(convertedAmount(t))}</b> · TC ${formatNumber(t.exchangeRate,baseCurrency())}</p>`:""}${t.detail?`<p style="color:var(--muted);font-size:10px;line-height:1.5">${esc(t.detail)}</p>`:""}<div class="detail-grid"><div><span>Fecha</span><b>${longDate(t.date)}</b></div><div><span>Categoría</span><b>${esc(t.category)}</b></div><div><span>Subcategoría</span><b>${esc(t.subcategory||"—")}</b></div><div><span>Cuenta</span><b>${esc(t.account)}</b></div><div><span>Moneda</span><b>${esc(t.currency||baseCurrency())}</b></div><div><span>Clasificación</span><b>${esc(t.priority||"—")}</b></div><div><span>Frecuencia</span><b>${esc(t.nature||"—")}</b></div><div><span>Tipo</span><b>${esc(t.type)}</b></div></div></div>`;$("detailSheet").classList.remove("hidden")}
function closeDetailSheet(){$("detailSheet").classList.add("hidden");selectedTxId=null}
function deleteSelectedTx(){if(!selectedTxId)return;if(!confirm("¿Eliminar este movimiento?"))return;state.transactions=state.transactions.filter(t=>t.id!==selectedTxId);saveState();closeDetailSheet();renderAll();toast("Movimiento eliminado")}

function renderStats(){const exp=monthTx().filter(t=>t.type==="Gasto"&&t.account!=="Gourmet"&&isConvertible(t));renderDailyChart(exp);renderCategoryBars($("statsCategoryBars"),exp,10);$("necessaryTotal").textContent=formatMoney(sum(exp.filter(t=>t.priority==="Necesario"),convertedAmount));$("wantTotal").textContent=formatMoney(sum(exp.filter(t=>t.priority==="Deseo"),convertedAmount));renderMonthlyChart()}
function renderDailyChart(expenses){const [y,m]=selectedMonth().split("-").map(Number),days=new Date(y,m,0).getDate(),vals=Array(days).fill(0);expenses.forEach(t=>{const d=Number(t.date.slice(8,10));if(d>=1&&d<=days)vals[d-1]+=convertedAmount(t)});const max=Math.max(...vals,1);$("dailyChart").innerHTML=vals.map((v,i)=>`<div class="day-bar ${v?"has-expense":""}" style="height:${v?Math.max(v/max*100,4):1}%" data-tip="${i+1}: ${formatMoney(v)}"></div>`).join("");$("midDayLabel").textContent=String(Math.ceil(days/2));$("lastDayLabel").textContent=String(days)}
function lastSixMonths(){const [y,m]=selectedMonth().split("-").map(Number),arr=[];for(let i=5;i>=0;i--){const d=new Date(y,m-1-i,1);arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}return arr}
function renderMonthlyChart(){const months=lastSixMonths(),income=[],expense=[];months.forEach(mon=>{const tx=state.transactions.filter(t=>monthOf(t.date)===mon&&isConvertible(t));income.push(sum(tx.filter(t=>t.type==="Ingreso"&&t.account!=="Gourmet"),convertedAmount));expense.push(sum(tx.filter(t=>t.type==="Gasto"&&t.account!=="Gourmet"),convertedAmount))});const max=Math.max(...income,...expense,1),W=360,H=190,pad=18,x=i=>pad+i*((W-pad*2)/(months.length-1)),y=v=>H-pad-(v/max)*(H-pad*2),points=arr=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(" "),grid=[.25,.5,.75].map(p=>`<line x1="${pad}" y1="${y(max*p)}" x2="${W-pad}" y2="${y(max*p)}" stroke="var(--border)" stroke-width="1"/>`).join("");$("monthlyChart").innerHTML=`${grid}<polyline points="${points(income)}" fill="none" stroke="var(--emerald)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points(expense)}" fill="none" stroke="var(--red)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${income.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--emerald)"/>`).join("")}${expense.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--red)"/>`).join("")}`;$("monthlyAxis").innerHTML=months.map(mon=>`<span>${monthLabel(mon)}</span>`).join("")}
function monthLabel(mon){const [y,m]=mon.split("-").map(Number);return new Intl.DateTimeFormat("es-PY",{month:"short"}).format(new Date(y,m-1,1)).replace(".","")}
function renderMore(){renderCurrencyLabels();const fixed=monthTx().filter(t=>t.type==="Gasto"&&t.nature==="Fijo"&&isConvertible(t)),totals=categoryTotals(fixed);$("fixedExpensesList").innerHTML=totals.length?totals.map(([cat,val])=>`<div class="fixed-item"><div><b>${esc(cat)}</b><span>Gasto fijo del mes seleccionado</span></div><b>${formatMoney(val)}</b></div>`).join(""):'<p class="empty">Marcá tus compromisos como “Fijo” al cargarlos y aparecerán acá.</p>'}

function openInitialSheet(){$("initialSavingsDisplay").value=state.settings.openingSavings?formatNumber(state.settings.openingSavings,baseCurrency()):"";$("initialSavingsDate").value=state.settings.openingSavingsDate||todayISO();$("emergencyMonths").value=String(state.settings.emergencyMonths||6);updateCurrencyUI();$("initialSheet").classList.remove("hidden")}
function saveInitialSettings(e){e.preventDefault();state.settings.openingSavings=parseMoneyInput($("initialSavingsDisplay").value,baseCurrency());state.settings.openingSavingsDate=$("initialSavingsDate").value||todayISO();state.settings.emergencyMonths=Number($("emergencyMonths").value||6);state.settings.setupComplete=true;saveState();$("initialSheet").classList.add("hidden");renderAll();toast("Datos iniciales guardados")}
function openCurrencySheet(){$("currencyChoices").innerHTML=Object.values(CURRENCIES).map(c=>`<button class="currency-choice ${c.code===baseCurrency()?"active":""}" data-currency-choice="${c.code}"><span><b>${c.symbol} ${c.name}</b><small>${c.code} · ${c.decimals===0?"sin decimales":"2 decimales"}</small></span><span class="currency-code">${c.code===baseCurrency()?"ACTIVA":c.code}</span></button>`).join("");$("currencyChoices").querySelectorAll("[data-currency-choice]").forEach(b=>b.onclick=()=>changeBaseCurrency(b.dataset.currencyChoice));$("currencySheet").classList.remove("hidden")}
function closeCurrencySheet(){$("currencySheet").classList.add("hidden")}
function changeBaseCurrency(code){const old=baseCurrency();if(code===old){closeCurrencySheet();return}if(state.transactions.length&&!confirm(`Cambiar la moneda principal de ${old} a ${code} puede requerir revisar tipos de cambio de movimientos anteriores. ¿Continuar?`))return;state.settings.baseCurrency=code;state.transactions=state.transactions.map(t=>({...t,currency:t.currency||old}));saveState();closeCurrencySheet();populateCurrencies();renderAll();toast(`Moneda principal: ${code}`)}
function renderCurrencyLabels(){const c=currencyMeta(baseCurrency());$("baseCurrencyLabel").textContent=`${c.code} · ${c.name}`;$("initialCurrencyPrefix").textContent=c.symbol;$("baseSymbol").textContent=c.symbol}

function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`respaldo-finanzas-${todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importBackup(e){const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.transactions||!data.settings)throw new Error();state=data;state.settings={...EMPTY_STATE.settings,...state.settings};const b=state.settings.baseCurrency||"PYG";state.transactions=(state.transactions||[]).map(t=>migrateTx(t,b));saveState();populateCurrencies();renderAll();toast("Respaldo restaurado")}catch{alert("No se pudo importar el respaldo.")}e.target.value=""}

const themeOrder=["auto","light","dark"];
function cycleTheme(){const cur=localStorage.getItem(THEME_KEY)||"auto",next=themeOrder[(themeOrder.indexOf(cur)+1)%themeOrder.length];localStorage.setItem(THEME_KEY,next);applyTheme(next);renderAll()}
function applyTheme(mode){let actual=mode;if(mode==="auto")actual=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=actual;$("themeLabel").textContent=mode==="auto"?"Automático":mode==="light"?"Claro":"Oscuro";$("themeBtn").textContent=mode==="dark"?"☀︎":mode==="light"?"☾":"◐";document.querySelector('meta[name="theme-color"]').setAttribute("content",actual==="dark"?"#0B1220":"#F8FAFC")}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if((localStorage.getItem(THEME_KEY)||"auto")==="auto"){applyTheme("auto");renderAll()}});

function sortTx(a,b){return String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id))}
function shortDate(s){const d=new Date(s+"T12:00:00");return new Intl.DateTimeFormat("es-PY",{day:"2-digit",month:"short"}).format(d)}
function longDate(s){const d=new Date(s+"T12:00:00");return new Intl.DateTimeFormat("es-PY",{day:"2-digit",month:"long",year:"numeric"}).format(d)}
function pct(n){return (Number(n||0)*100).toFixed(1).replace(".",",")+"%"}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),1900)}

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
init();
