// ============================================================
// CEFISE ACADEMY — Sistema de Avaliação Clínica  v2.0
// ============================================================

// ─── BANCO LOCAL ────────────────────────────────────────────
function getDB() {
  try {
    return JSON.parse(localStorage.getItem('cefise_db') || '{"pacientes":[],"avaliacoes":[],"profissionais":[{"id":1,"nome":"Dr. Profissional 1","especialidade":"Fisioterapeuta","crf":"CRF-SC 12345"},{"id":2,"nome":"Dr. Profissional 2","especialidade":"Fisioterapeuta","crf":"CRF-SC 23456"},{"id":3,"nome":"Dr. Profissional 3","especialidade":"Fisioterapeuta","crf":"CRF-SC 34567"}]}');
  } catch(e) { return {pacientes:[],avaliacoes:[],profissionais:[{id:1,nome:'Administrador',especialidade:'Fisioterapeuta',crf:''}]}; }
}
function saveDB(db) { localStorage.setItem('cefise_db', JSON.stringify(db)); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1; }

let currentProfId = 1;
let relCharts = {};
let dashChart = null;

// ─── UTILITÁRIOS ────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}
function gv(id) { const el=document.getElementById(id); return el?(parseFloat(el.value)||0):0; }
function sv(id, val) { const el=document.getElementById(id); if(el) el.value=val!==undefined&&val!==null?val:''; }
function calcIdade(nasc) {
  if (!nasc) return '?';
  const d=new Date(nasc), now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate())) age--;
  return age;
}
function initials(nome) { return (nome||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function fmtDate(d) { if(!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }

// ─── INIT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();
  setupRTPCounter();
  document.getElementById('f-data').value = new Date().toISOString().split('T')[0];
  const db = getDB();
  currentProfId = db.profissionais[0]?.id || 1;
  updateProfSelects();
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-app').style.display = 'flex';
  updateSidebarUser();
  showPage('dashboard');
});

function updateSidebarUser() {
  const db = getDB();
  const p = db.profissionais.find(x=>x.id===currentProfId);
  document.getElementById('sidebar-name').textContent = p?.nome || 'Profissional';
  document.getElementById('sidebar-role').textContent = p?.especialidade || 'Fisioterapeuta';
  document.getElementById('sidebar-avatar').textContent = initials(p?.nome||'P');
}
function doLogout() { toast('Modo local — sem necessidade de logout'); }
function updateProfSelects() {
  const db = getDB();
  const opts = db.profissionais.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
  const ap = document.getElementById('active-prof');
  if(ap) { ap.innerHTML = opts; ap.value = currentProfId; }
}

// ─── NAVEGAÇÃO ───────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const page = document.getElementById('page-'+name);
  if(page) page.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if(btn) btn.classList.add('active');
  const titles={dashboard:'Dashboard',pacientes:'Pacientes',avaliacao:'Nova avaliação',relatorio:'Gráficos & Relatório PDF',profissionais:'Profissionais'};
  document.getElementById('page-title').textContent = titles[name]||name;
  if(name==='dashboard') renderDashboard();
  if(name==='pacientes') renderPatients();
  if(name==='relatorio') loadRelatorioSelect();
  if(name==='profissionais') renderProfissionais();
}

function showTab(idx) {
  document.querySelectorAll('.tab-pane').forEach((p,i)=>p.classList.toggle('active',i===idx));
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeModal(id) { document.getElementById(id).style.display='none'; }

// ─── DASHBOARD ───────────────────────────────────────────────
function renderDashboard() {
  const db = getDB();
  document.getElementById('st-pacientes').textContent = db.pacientes.length;
  document.getElementById('st-avals').textContent = db.avaliacoes.filter(a=>a.tipo==='avaliacao').length;
  document.getElementById('st-reavals').textContent = db.avaliacoes.filter(a=>a.tipo==='reavaliacao').length;
  document.getElementById('st-profs').textContent = db.profissionais.length;
  const recent = db.pacientes.slice(-5).reverse();
  const recEl = document.getElementById('dash-recent');
  recEl.innerHTML = recent.length ? recent.map(p=>`
    <div class="patient-item" onclick="openRelatorio(${p.id})">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info"><div class="pat-name">${p.nome}</div><div class="pat-meta">${calcIdade(p.nasc)} anos</div></div>
    </div>`).join('') : '<div class="empty-state" style="padding:20px"><i class="ti ti-users"></i><p>Nenhum paciente ainda</p></div>';
  if(dashChart) dashChart.destroy();
  const labels = db.profissionais.map(p=>p.nome.split(' ').slice(0,2).join(' '));
  const vals = db.profissionais.map(p=>db.avaliacoes.filter(a=>a.profissional_id===p.id).length);
  const colors=['#2d7d32','#00695c','#1565c0','#6a1b9a','#c62828','#e65100','#37474f'];
  const canvas = document.getElementById('chart-dash-prof');
  if(canvas && vals.some(v=>v>0)) {
    dashChart = new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:colors.slice(0,labels.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}}}});
  }
}

// ─── PACIENTES ───────────────────────────────────────────────
function renderPatients(filter='') {
  const db = getDB();
  const list = filter ? db.pacientes.filter(p=>p.nome.toLowerCase().includes(filter.toLowerCase())) : db.pacientes;
  const el = document.getElementById('patient-list');
  el.innerHTML = list.length ? list.map(p=>{
    const avals = db.avaliacoes.filter(a=>a.paciente_id===p.id);
    const prof = db.profissionais.find(x=>x.id===p.profissional_id);
    const tags = avals.map(a=>`<span class="badge ${a.tipo==='avaliacao'?'badge-green':'badge-teal'}">${a.tipo==='avaliacao'?'Avaliação':'Reavaliação'} ${fmtDate(a.data)}</span>`).join('');
    return `<div class="patient-item">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome}</div>
        <div class="pat-meta">${calcIdade(p.nasc)} anos · ${p.peso||'—'}kg · ${p.altura||'—'}m · ${prof?.nome||'—'}</div>
        <div class="pat-tags">${tags}</div>
      </div>
      <div class="pat-actions">
        <button class="btn btn-outline btn-sm" onclick="openRelatorio(${p.id})"><i class="ti ti-chart-bar"></i></button>
        <button class="btn btn-outline btn-sm" onclick="iniciarReavaliacao(${p.id})"><i class="ti ti-plus"></i> Reavaliar</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><i class="ti ti-users"></i><p>Nenhum paciente encontrado</p></div>';
}
function filterPatients(v) { renderPatients(v); }

function iniciarReavaliacao(pacId) {
  const db = getDB();
  const p = db.pacientes.find(x=>x.id===pacId);
  if(!p) return;
  sv('f-nome',p.nome); sv('f-nasc',p.nasc); sv('f-altura',p.altura);
  sv('f-peso',p.peso); sv('f-contato',p.contato);
  document.getElementById('f-tipo').value='reavaliacao';
  document.getElementById('f-data').value=new Date().toISOString().split('T')[0];
  showPage('avaliacao'); showTab(0);
  toast('Modo reavaliação — '+p.nome.split(' ')[0]);
}

// ─── AVALIAÇÃO — SETUP ───────────────────────────────────────
function setupRadioToggles() {
  const pairs=[['cirurgia','det-cirurgia'],['hdp','det-hdp'],['hda','det-hda'],['dor','det-dor']];
  pairs.forEach(([name,detId])=>{
    document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
      r.addEventListener('change',()=>{
        const el=document.getElementById(detId);
        if(el) el.style.display=r.value==='sim'?'block':'none';
      });
    });
  });
}

function setupRTPCounter() {
  const ids=['rtp-lsi','rtp-forca','rtp-dor','rtp-edema','rtp-psico','rtp-tempo','rtp-agilidade','rtp-treino'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', updateRTPCounter);
  });
}

function updateRTPCounter() {
  const ids=['rtp-lsi','rtp-forca','rtp-dor','rtp-edema','rtp-psico','rtp-tempo','rtp-agilidade','rtp-treino'];
  const checked=ids.filter(id=>document.getElementById(id)?.checked).length;
  const el=document.getElementById('rtp-progresso');
  if(el){
    el.textContent=`${checked} / ${ids.length}`;
    el.style.color=checked===ids.length?'#1D9E75':checked>=6?'#BA7517':'#E24B4A';
  }
}

// ─── CÁLCULOS AUTOMÁTICOS ────────────────────────────────────
function calcAvg(prefix) {
  ['d','e'].forEach(side=>{
    const vals=[1,2,3].map(i=>{const el=document.getElementById(`${prefix}${i}-${side}`);return el&&el.value?parseFloat(el.value):null;}).filter(v=>v!==null);
    const avgEl=document.getElementById(`${prefix}-avg-${side}`);
    if(avgEl) avgEl.textContent=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):'—';
  });
  // LSI automático
  const vd=parseFloat(document.getElementById(`${prefix}-avg-d`)?.textContent);
  const ve=parseFloat(document.getElementById(`${prefix}-avg-e`)?.textContent);
  const lsiEl=document.getElementById(`${prefix}-lsi`);
  if(lsiEl){
    if(!isNaN(vd)&&!isNaN(ve)&&Math.max(vd,ve)>0){
      const lsi=(Math.min(vd,ve)/Math.max(vd,ve))*100;
      lsiEl.textContent=lsi.toFixed(1)+'%';
      lsiEl.style.color=lsi>=90?'#1D9E75':lsi>=80?'#BA7517':'#E24B4A';
    } else { lsiEl.textContent='—'; }
  }
}

function calcLSI(prefix) {
  const d=parseFloat(document.getElementById(`${prefix}-d`)?.value);
  const e=parseFloat(document.getElementById(`${prefix}-e`)?.value);
  const el=document.getElementById(`${prefix}-lsi`);
  if(!el) return;
  if(!isNaN(d)&&!isNaN(e)&&Math.max(d,e)>0){
    const lsi=(Math.min(d,e)/Math.max(d,e))*100;
    el.textContent=lsi.toFixed(1)+'%';
    el.style.color=lsi>=90?'#1D9E75':lsi>=80?'#BA7517':'#E24B4A';
  } else { el.textContent='—'; }
}

function calcBest(prefix) {
  const vals=[1,2,3].map(i=>parseFloat(document.getElementById(`${prefix}${i}`)?.value)).filter(v=>!isNaN(v));
  const el=document.getElementById(`${prefix}-best`);
  if(el) el.textContent=vals.length?Math.max(...vals).toFixed(1):'—';
}

function calcRSI() {
  const queda=parseFloat(document.getElementById('dj-queda')?.value);
  const salto=parseFloat(document.getElementById('dj-salto')?.value);
  const el=document.getElementById('dj-rsi');
  if(!el) return;
  if(!isNaN(queda)&&!isNaN(salto)&&queda>0){
    el.textContent=(salto/queda).toFixed(2);
  } else { el.textContent='—'; }
}

function calcFMS() {
  const v=(id)=>parseInt(document.getElementById(id)?.value)||0;
  const scores={
    dsquat:v('fms-dsquat'),
    hurdle:Math.min(v('fms-hurdle-d'),v('fms-hurdle-e')),
    lunge:Math.min(v('fms-lunge-d'),v('fms-lunge-e')),
    shoulder:Math.min(v('fms-shoulder-d'),v('fms-shoulder-e')),
    aslr:Math.min(v('fms-aslr-d'),v('fms-aslr-e')),
    trunk:v('fms-trunk'),
    rot:Math.min(v('fms-rot-d'),v('fms-rot-e')),
  };
  const labels={dsquat:'fms-dsquat-s',hurdle:'fms-hurdle-s',lunge:'fms-lunge-s',shoulder:'fms-shoulder-s',aslr:'fms-aslr-s',trunk:'fms-trunk-s',rot:'fms-rot-s'};
  let total=0;
  for(const [key,score] of Object.entries(scores)){
    total+=score;
    const el=document.getElementById(labels[key]);
    if(el) el.textContent=score;
  }
  const totalEl=document.getElementById('fms-total');
  if(totalEl){
    totalEl.textContent=total;
    totalEl.style.color=total>=14?'#1D9E75':total>=10?'#BA7517':'#E24B4A';
  }
}

function calcBestDors(side) {
  const vals=[1,2,3].map(i=>parseFloat(document.getElementById(`dors-${side}${i}`)?.value)).filter(v=>!isNaN(v));
  const bestEl=document.getElementById(`dors-best-${side}`);
  if(bestEl) bestEl.textContent=vals.length?Math.max(...vals).toFixed(1):'—';
  const d=parseFloat(document.getElementById('dors-best-d')?.textContent);
  const e=parseFloat(document.getElementById('dors-best-e')?.textContent);
  const lsiEl=document.getElementById('dors-lsi');
  if(lsiEl&&!isNaN(d)&&!isNaN(e)&&Math.max(d,e)>0){
    const lsi=(Math.min(d,e)/Math.max(d,e))*100;
    lsiEl.textContent=lsi.toFixed(1)+'%';
    lsiEl.style.color=lsi>=90?'#1D9E75':lsi>=80?'#BA7517':'#E24B4A';
  }
}

function classifyODI() {
  const val=parseFloat(document.getElementById('odi')?.value);
  const el=document.getElementById('odi-class');
  if(!el) return;
  if(isNaN(val)){el.textContent='—';return;}
  if(val<=20) el.textContent='Incapacidade mínima';
  else if(val<=40) el.textContent='Incapacidade moderada';
  else if(val<=60) el.textContent='Incapacidade severa';
  else if(val<=80) el.textContent='Muito severa';
  else el.textContent='Acamado / exagerado';
}

function classifyRSI() {
  const val=parseFloat(document.getElementById('aclrsi')?.value);
  const el=document.getElementById('aclrsi-class');
  if(!el) return;
  if(isNaN(val)){el.textContent='—';return;}
  if(val>=65) el.textContent='✅ Pronto psicologicamente (≥ 65)';
  else if(val>=35) el.textContent='⚠️ Prontidão moderada (35–64)';
  else el.textContent='❌ Não pronto psicologicamente (< 35)';
}

// ─── LEITURA DE CAMPOS ───────────────────────────────────────
function getRadio(name) { const el=document.querySelector(`input[name="${name}"]:checked`); return el?el.value:'nao'; }
function fv(id) { return document.getElementById(id)?.value||null; }
function fn(id) { const v=parseFloat(document.getElementById(id)?.value); return isNaN(v)?null:v; }
function fi(id) { const v=parseInt(document.getElementById(id)?.value); return isNaN(v)?null:v; }
function fb(id) { return document.getElementById(id)?.checked||false; }
function getAvg(prefix,side) { const vals=[1,2,3].map(i=>gv(`${prefix}${i}-${side}`)).filter(v=>v>0); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; }
function readDisplayNum(id) { const v=parseFloat(document.getElementById(id)?.textContent); return isNaN(v)?null:v; }

// ─── SALVAR AVALIAÇÃO ────────────────────────────────────────
function clearForm() {
  ['f-nome','f-nasc','f-altura','f-peso','f-contato','f-semana','f-esporte'].forEach(id=>sv(id,''));
  document.getElementById('f-tipo').value='avaliacao';
  document.getElementById('f-data').value=new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[name=cirurgia]')[0].checked=true;
  document.querySelectorAll('input[name=hdp]')[0].checked=true;
  document.querySelectorAll('input[name=hda]')[0].checked=true;
  document.querySelectorAll('input[name=dor]')[0].checked=true;
  ['det-cirurgia','det-hdp','det-hda','det-dor'].forEach(id=>{sv(id,'');const el=document.getElementById(id);if(el)el.style.display='none';});
  // EVA
  const eva=document.getElementById('eva-valor'); if(eva){eva.value=0;}
  const evad=document.getElementById('eva-display'); if(evad){evad.textContent='0';}
  // Inputs numéricos
  ['nordic','squat-d','squat-e','bridge-d','bridge-e','copenh-d','copenh-e','core-d','core-e',
   'step-vd-d','step-vd-e','step-qp-d','step-qp-e','gonio-ri-d','gonio-ri-e','gonio-re-d','gonio-re-e',
   'lunge-cm-d','lunge-cm-e','lunge-ang-d','lunge-ang-e','schober',
   'sidehop-d','sidehop-e','cmj1','cmj2','cmj3','dj-queda','dj-salto','tuckjump',
   'dors-d1','dors-d2','dors-d3','dors-e1','dors-e2','dors-e3',
   'ybal-ant-d','ybal-ant-e','ybal-pm-d','ybal-pm-e','ybal-pl-d','ybal-pl-e',
   'fms-dsquat','fms-hurdle-d','fms-hurdle-e','fms-lunge-d','fms-lunge-e',
   'fms-shoulder-d','fms-shoulder-e','fms-aslr-d','fms-aslr-e','fms-trunk','fms-rot-d','fms-rot-e',
   'koos-sint','koos-dor','koos-avd','koos-esporte','koos-qv','ikdc',
   'hoos-sint','hoos-dor','hoos-avd','hoos-esporte','hoos-qv','odi',
   'dash','quickdash','visap','visaa','faam-avd','faam-esp','aclrsi',
   'aho-obs','nota-anamnese','nota-testes','nota-forca','nota-mobilidade','nota-rtp',
   'link-video','link-foto'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Selects testes especiais
  ['faber-d','faber-e','fadir-d','fadir-e','lasegue-d','lasegue-e','slump-d','slump-e',
   'thomas-d','thomas-e','ober-d','ober-e','dial-30-d','dial-30-e','dial-90-d','dial-90-e',
   'pivot-d','pivot-e','hawkins-d','hawkins-e','neer-d','neer-e','appr-d','appr-e',
   'reloc-d','reloc-e','apley-d','apley-e','talar-d','talar-e','gaveta-d','gaveta-e',
   'rtp-decisao'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Checkboxes
  ['aho-joelho','aho-calcanhar','aho-tronco','aho-ombros','aho-pelve','aho-coluna',
   'rtp-lsi','rtp-forca','rtp-dor','rtp-edema','rtp-psico','rtp-tempo','rtp-agilidade','rtp-treino'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
  // Médias / displays
  ['sht','tht','cot'].forEach(p=>{
    ['d','e'].forEach(s=>{
      [1,2,3].forEach(i=>{const el=document.getElementById(`${p}${i}-${s}`);if(el)el.value='';});
      const avg=document.getElementById(`${p}-avg-${s}`);if(avg)avg.textContent='—';
    });
    const lsi=document.getElementById(`${p}-lsi`);if(lsi)lsi.textContent='—';
  });
  ['sidehop-lsi','cmj-best','dj-rsi','dors-best-d','dors-best-e','dors-lsi','fms-total',
   'fms-dsquat-s','fms-hurdle-s','fms-lunge-s','fms-shoulder-s','fms-aslr-s','fms-trunk-s','fms-rot-s',
   'odi-class','aclrsi-class','rtp-progresso'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=id==='rtp-progresso'?'0 / 8':'—';});
  showTab(0);
}

function salvarAvaliacao() {
  const nome = document.getElementById('f-nome').value.trim();
  if(!nome) { toast('Informe o nome do paciente'); showTab(0); return; }
  const db = getDB();
  let pac = db.pacientes.find(p=>p.nome.toLowerCase()===nome.toLowerCase());
  if(!pac) {
    pac = {
      id:nextId(db.pacientes), nome,
      nasc:document.getElementById('f-nasc').value||null,
      altura:parseFloat(document.getElementById('f-altura').value)||null,
      peso:parseFloat(document.getElementById('f-peso').value)||null,
      contato:document.getElementById('f-contato').value||null,
      profissional_id:currentProfId, created_at:new Date().toISOString()
    };
    db.pacientes.push(pac);
  }

  const aval = {
    id:nextId(db.avaliacoes), paciente_id:pac.id, profissional_id:currentProfId,
    data:document.getElementById('f-data').value, tipo:document.getElementById('f-tipo').value,

    // Identificação extra
    semana_lesao: fi('f-semana'), esporte: fv('f-esporte'),

    // Anamnese
    cirurgia:getRadio('cirurgia'), cirurgia_detalhe:fv('det-cirurgia'),
    hdp:getRadio('hdp'), hdp_detalhe:fv('det-hdp'),
    hda:getRadio('hda'), hda_detalhe:fv('det-hda'),
    dor:getRadio('dor'), dor_detalhe:fv('det-dor'),
    eva: fi('eva-valor'),

    // Testes especiais — quadril/coluna
    faber_d:fv('faber-d'), faber_e:fv('faber-e'),
    fadir_d:fv('fadir-d'), fadir_e:fv('fadir-e'),
    lasegue_d:fv('lasegue-d'), lasegue_e:fv('lasegue-e'),
    slump_d:fv('slump-d'), slump_e:fv('slump-e'),
    gonio_ri_d:gv('gonio-ri-d'), gonio_ri_e:gv('gonio-ri-e'),
    gonio_re_d:gv('gonio-re-d'), gonio_re_e:gv('gonio-re-e'),
    thomas_d:fv('thomas-d'), thomas_e:fv('thomas-e'), thomas_obs:fv('thomas-obs'),
    ober_d:fv('ober-d'), ober_e:fv('ober-e'),
    schober:fn('schober'),

    // Testes especiais — joelho
    dial_30_d:fv('dial-30-d'), dial_30_e:fv('dial-30-e'),
    dial_90_d:fv('dial-90-d'), dial_90_e:fv('dial-90-e'),
    pivot_d:fv('pivot-d'), pivot_e:fv('pivot-e'),

    // Testes especiais — ombro
    hawkins_d:fv('hawkins-d'), hawkins_e:fv('hawkins-e'),
    neer_d:fv('neer-d'), neer_e:fv('neer-e'),
    appr_d:fv('appr-d'), appr_e:fv('appr-e'),
    reloc_d:fv('reloc-d'), reloc_e:fv('reloc-e'),
    apley_d:fv('apley-d'), apley_e:fv('apley-e'),

    // Testes especiais — tornozelo
    talar_d:fv('talar-d'), talar_e:fv('talar-e'),
    gaveta_d:fv('gaveta-d'), gaveta_e:fv('gaveta-e'),

    // Força
    nordic:gv('nordic'), squat_d:gv('squat-d'), squat_e:gv('squat-e'),
    bridge_d:gv('bridge-d'), bridge_e:gv('bridge-e'),
    copenh_d:gv('copenh-d'), copenh_e:gv('copenh-e'),
    core_d:gv('core-d'), core_e:gv('core-e'),
    step_vd_d:gv('step-vd-d'), step_vd_e:gv('step-vd-e'),
    step_qp_d:gv('step-qp-d'), step_qp_e:gv('step-qp-e'),

    // Hop tests
    sht_avg_d:getAvg('sht','d'), sht_avg_e:getAvg('sht','e'),
    tht_avg_d:getAvg('tht','d'), tht_avg_e:getAvg('tht','e'),
    cot_avg_d:getAvg('cot','d'), cot_avg_e:getAvg('cot','e'),
    lunge_cm_d:gv('lunge-cm-d'), lunge_cm_e:gv('lunge-cm-e'),
    lunge_ang_d:gv('lunge-ang-d'), lunge_ang_e:gv('lunge-ang-e'),
    sidehop_d:fn('sidehop-d'), sidehop_e:fn('sidehop-e'),
    cmj_best: readDisplayNum('cmj-best'),
    dj_queda:fn('dj-queda'), dj_salto:fn('dj-salto'),
    dj_rsi: readDisplayNum('dj-rsi'),
    tuckjump:fi('tuckjump'),
    lsi_sht: readDisplayNum('sht-lsi'),
    lsi_tht: readDisplayNum('tht-lsi'),
    lsi_cot: readDisplayNum('cot-lsi'),
    lsi_sidehop: readDisplayNum('sidehop-lsi'),

    // Mobilidade — FMS
    fms_total: readDisplayNum('fms-total'),
    fms_deep_squat:fi('fms-dsquat'),
    fms_hurdle_d:fi('fms-hurdle-d'), fms_hurdle_e:fi('fms-hurdle-e'),
    fms_lunge_d:fi('fms-lunge-d'), fms_lunge_e:fi('fms-lunge-e'),
    fms_shoulder_d:fi('fms-shoulder-d'), fms_shoulder_e:fi('fms-shoulder-e'),
    fms_aslr_d:fi('fms-aslr-d'), fms_aslr_e:fi('fms-aslr-e'),
    fms_trunk:fi('fms-trunk'), fms_rot_d:fi('fms-rot-d'), fms_rot_e:fi('fms-rot-e'),

    // Dorsiflexão
    dors_best_d: readDisplayNum('dors-best-d'),
    dors_best_e: readDisplayNum('dors-best-e'),
    lsi_dors: readDisplayNum('dors-lsi'),

    // Y-Balance
    ybal_ant_d:fn('ybal-ant-d'), ybal_ant_e:fn('ybal-ant-e'),
    ybal_pm_d:fn('ybal-pm-d'), ybal_pm_e:fn('ybal-pm-e'),
    ybal_pl_d:fn('ybal-pl-d'), ybal_pl_e:fn('ybal-pl-e'),

    // Agachamento overhead
    aho_joelho:fb('aho-joelho'), aho_calcanhar:fb('aho-calcanhar'),
    aho_tronco:fb('aho-tronco'), aho_ombros:fb('aho-ombros'),
    aho_pelve:fb('aho-pelve'), aho_coluna:fb('aho-coluna'),
    aho_obs:fv('aho-obs'),

    // Escalas
    koos_sint:fn('koos-sint'), koos_dor:fn('koos-dor'),
    koos_avd:fn('koos-avd'), koos_esporte:fn('koos-esporte'), koos_qv:fn('koos-qv'),
    ikdc:fn('ikdc'),
    hoos_sint:fn('hoos-sint'), hoos_dor:fn('hoos-dor'),
    hoos_avd:fn('hoos-avd'), hoos_esporte:fn('hoos-esporte'), hoos_qv:fn('hoos-qv'),
    odi:fn('odi'), dash:fn('dash'), quickdash:fn('quickdash'),
    visap:fn('visap'), visaa:fn('visaa'),
    faam_avd:fn('faam-avd'), faam_esp:fn('faam-esp'),
    ndi:fn('ndi'),

    // RTP
    aclrsi:fn('aclrsi'),
    rtp_lsi:fb('rtp-lsi'), rtp_forca:fb('rtp-forca'), rtp_dor:fb('rtp-dor'),
    rtp_edema:fb('rtp-edema'), rtp_psico:fb('rtp-psico'), rtp_tempo:fb('rtp-tempo'),
    rtp_agilidade:fb('rtp-agilidade'), rtp_treino:fb('rtp-treino'),
    rtp_decisao:fv('rtp-decisao'), rtp_data:fv('rtp-data'),

    // Notas
    nota_anamnese:fv('nota-anamnese'), nota_testes:fv('nota-testes'),
    nota_forca:fv('nota-forca'), nota_mobilidade:fv('nota-mobilidade'),
    nota_rtp:fv('nota-rtp'), link_video:fv('link-video'), link_foto:fv('link-foto'),

    created_at:new Date().toISOString()
  };

  db.avaliacoes.push(aval);
  saveDB(db);
  toast('Avaliação salva!');
  clearForm();
  showPage('pacientes');
}

// ─── RELATÓRIO ───────────────────────────────────────────────
function loadRelatorioSelect() {
  const db = getDB();
  const sel = document.getElementById('rel-paciente');
  sel.innerHTML = '<option value="">Selecione um paciente...</option>'+db.pacientes.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
}

function openRelatorio(id) {
  showPage('relatorio');
  setTimeout(()=>{
    loadRelatorioSelect();
    document.getElementById('rel-paciente').value=id;
    loadRelatorio(id);
  },50);
}

function destroyRelCharts() { Object.values(relCharts).forEach(c=>{try{c.destroy()}catch(e){}}); relCharts={}; }

function loadRelatorio(pacId) {
  destroyRelCharts();
  const el = document.getElementById('relatorio-content');
  if(!pacId) { el.innerHTML='<div class="empty-state"><i class="ti ti-chart-bar"></i><p>Selecione um paciente</p></div>'; return; }
  const db = getDB();
  const pac = db.pacientes.find(p=>p.id===parseInt(pacId));
  const avals = db.avaliacoes.filter(a=>a.paciente_id===parseInt(pacId)).sort((a,b)=>a.data.localeCompare(b.data));
  if(!pac||!avals.length) { el.innerHTML='<div class="empty-state"><i class="ti ti-chart-bar"></i><p>Nenhuma avaliação encontrada</p></div>'; return; }

  const first=avals[0], last=avals[avals.length-1], hasReav=avals.length>1;
  const prof = db.profissionais.find(p=>p.id===last.profissional_id);

  function lsiClass(v){return v>=90?'badge-green':v>=75?'badge-amber':'badge-red';}
  function lsiLabel(v){return v>=90?'Boa simetria':v>=75?'Assimetria moderada':'Assimetria importante';}
  function diff(a,b){if(!a||!b)return '<span class="diff-neu">—</span>';const d=((b-a)/a*100);return `<span class="${d>0?'diff-pos':d<0?'diff-neg':'diff-neu'}">${d>0?'+':''}${d.toFixed(1)}%</span>`;}
  function n(v){return v?Number(v).toFixed(1):'—';}

  // Bloco de escalas (mostra só o que foi preenchido)
  const escalas=[];
  if(last.koos_dor) escalas.push(`KOOS dor: <b>${n(last.koos_dor)}</b> · AVD: <b>${n(last.koos_avd)}</b> · Esporte: <b>${n(last.koos_esporte)}</b>`);
  if(last.ikdc) escalas.push(`IKDC: <b>${n(last.ikdc)}/100</b>`);
  if(last.hoos_dor) escalas.push(`HOOS dor: <b>${n(last.hoos_dor)}</b> · Esporte: <b>${n(last.hoos_esporte)}</b>`);
  if(last.odi) escalas.push(`ODI: <b>${n(last.odi)}%</b>`);
  if(last.dash) escalas.push(`DASH: <b>${n(last.dash)}</b>`);
  if(last.visap) escalas.push(`VISA-P: <b>${n(last.visap)}</b>`);
  if(last.visaa) escalas.push(`VISA-A: <b>${n(last.visaa)}</b>`);
  if(last.faam_avd) escalas.push(`FAAM AVD: <b>${n(last.faam_avd)}</b> · Esporte: <b>${n(last.faam_esp)}</b>`);
  if(last.ndi) escalas.push(`NDI (cervical): <b>${n(last.ndi)}%</b>`);
  if(last.aclrsi) escalas.push(`ACL-RSI: <b>${n(last.aclrsi)}/100</b>`);

  const rtpCount=[last.rtp_lsi,last.rtp_forca,last.rtp_dor,last.rtp_edema,last.rtp_psico,last.rtp_tempo,last.rtp_agilidade,last.rtp_treino].filter(Boolean).length;
  const rtpDecisaoMap={liberado:'✅ Liberado',condicionado:'⚠️ Com restrições',nao_liberado:'❌ Não liberado',em_progresso:'🔄 Em progresso'};

  el.innerHTML = `
    <div class="rel-header">
      <img src="public/logo.png" alt="Cefise">
      <div><h2>${pac.nome}</h2><p>${calcIdade(pac.nasc)} anos · ${pac.peso||'—'}kg · ${pac.altura||'—'}m · Prof: ${prof?.nome||'—'}</p>
      ${last.esporte?`<p>Modalidade: <b>${last.esporte}</b>${last.semana_lesao?` · Semana pós-lesão/cirurgia: <b>${last.semana_lesao}</b>`:''}</p>`:''}
      </div>
    </div>
    ${hasReav?`<div class="reav-banner"><i class="ti ti-arrows-right-left"></i><div>Comparativo disponível — <b>${avals.length}</b> avaliações · ${fmtDate(first.data)} → ${fmtDate(last.data)}</div></div>`:''}

    <div class="grid-2" style="margin-bottom:16px">
      <div class="card"><div class="card-title"><i class="ti ti-barbell"></i> Força muscular</div><div class="chart-wrap" style="height:240px"><canvas id="rc-forca"></canvas></div></div>
      <div class="card"><div class="card-title"><i class="ti ti-run"></i> Hop Tests — LSI (%)</div><div class="chart-wrap" style="height:240px"><canvas id="rc-hop"></canvas></div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-arrows-left-right"></i> Simetria D × E</div>
      <div class="chart-wrap" style="height:260px"><canvas id="rc-sim"></canvas></div>
    </div>

    ${hasReav?`<div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-trending-up"></i> Evolução — antes × depois</div>
      <div class="grid-2">
        <table class="comp-table">
          <tr><th>Teste</th><th>Antes (${fmtDate(first.data)})</th><th>Depois (${fmtDate(last.data)})</th><th>Variação</th></tr>
          ${[['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Squat E',first.squat_e,last.squat_e],['Bridge D',first.bridge_d,last.bridge_d],['Bridge E',first.bridge_e,last.bridge_e],['Copenhagen D',first.copenh_d,last.copenh_d],['Core D',first.core_d,last.core_d],['CMJ',first.cmj_best,last.cmj_best],['FMS',first.fms_total,last.fms_total]].map(([n,a,b])=>`<tr><td>${n}</td><td>${a||'—'}</td><td>${b||'—'}</td><td>${diff(a,b)}</td></tr>`).join('')}
        </table>
        <div class="chart-wrap" style="height:300px"><canvas id="rc-ev"></canvas></div>
      </div>
    </div>`:''}

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-table"></i> LSI — Índice de simetria</div>
      <table class="lsi-table">
        <tr><th>Teste</th><th>Direito</th><th>Esquerdo</th><th>LSI</th><th>Classificação</th></tr>
        ${[['Single Hop',last.sht_avg_d,last.sht_avg_e],['Triple Hop',last.tht_avg_d,last.tht_avg_e],['Crossover',last.cot_avg_d,last.cot_avg_e],['Side Hop',last.sidehop_d,last.sidehop_e],['Squat',last.squat_d,last.squat_e],['Bridge',last.bridge_d,last.bridge_e],['Core',last.core_d,last.core_e],['Dorsiflexão',last.dors_best_d,last.dors_best_e]].map(([nm,d,e])=>{
          const lv=e>0?(Math.min(d,e)/Math.max(d,e)*100):0;
          return `<tr><td>${nm}</td><td>${n(d)}</td><td>${n(e)}</td><td><b>${lv.toFixed(1)}%</b></td><td><span class="badge ${lsiClass(lv)}">${lsiLabel(lv)}</span></td></tr>`;
        }).join('')}
      </table>
    </div>

    ${escalas.length?`<div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-activity"></i> Escalas funcionais</div>
      ${escalas.map(s=>`<div style="padding:6px 0;border-bottom:0.5px solid #eee;font-size:14px">${s}</div>`).join('')}
    </div>`:''}

    ${rtpCount>0||last.rtp_decisao?`<div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-trophy"></i> RTP — Retorno esportivo</div>
      <div style="font-size:14px;margin-bottom:8px">Critérios cumpridos: <b>${rtpCount} / 8</b></div>
      ${last.rtp_decisao?`<div style="font-size:15px;font-weight:600;margin-bottom:4px">${rtpDecisaoMap[last.rtp_decisao]||last.rtp_decisao}</div>`:''}
      ${last.rtp_data?`<div style="font-size:13px;color:#666">Data prevista: ${fmtDate(last.rtp_data)}</div>`:''}
      ${last.aclrsi?`<div style="font-size:13px;color:#666">ACL-RSI: ${n(last.aclrsi)}/100</div>`:''}
    </div>`:''}

    ${last.nota_rtp||last.nota_forca||last.nota_testes?`<div class="card">
      <div class="card-title"><i class="ti ti-notes"></i> Notas clínicas</div>
      ${last.nota_testes?`<p style="font-size:13px"><b>Testes:</b> ${last.nota_testes}</p>`:''}
      ${last.nota_forca?`<p style="font-size:13px"><b>Força/estabilidade:</b> ${last.nota_forca}</p>`:''}
      ${last.nota_mobilidade?`<p style="font-size:13px"><b>Mobilidade:</b> ${last.nota_mobilidade}</p>`:''}
      ${last.nota_rtp?`<p style="font-size:13px"><b>RTP/evolução:</b> ${last.nota_rtp}</p>`:''}
      ${last.link_video?`<p style="font-size:13px"><b>Vídeo:</b> <a href="${last.link_video}" target="_blank">Ver vídeo</a></p>`:''}
    </div>`:''}
  `;

  setTimeout(()=>buildRelCharts(first,last,hasReav),80);
}

function buildRelCharts(first,last,hasReav) {
  const G='#2d7d32',R='#c62828',T='#00695c';

  const fCanvas=document.getElementById('rc-forca');
  if(fCanvas){
    const labels=['Nordic','Squat D','Squat E','Bridge D','Bridge E','Copenh D'];
    const fFirst=[first.nordic,first.squat_d,first.squat_e,first.bridge_d,first.bridge_e,first.copenh_d];
    const fLast=[last.nordic,last.squat_d,last.squat_e,last.bridge_d,last.bridge_e,last.copenh_d];
    relCharts.forca=new Chart(fCanvas,{type:'bar',data:{labels,datasets:hasReav?[{label:'Antes',data:fFirst,backgroundColor:R+'bb',borderColor:R,borderWidth:1},{label:'Depois',data:fLast,backgroundColor:G+'bb',borderColor:G,borderWidth:1}]:[{label:'Resultado',data:fFirst,backgroundColor:G+'bb',borderColor:G,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:hasReav,labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true}}}});
  }

  const hCanvas=document.getElementById('rc-hop');
  if(hCanvas){
    const lsiOf=(d,e)=>d&&e&&Math.max(d,e)>0?parseFloat((Math.min(d,e)/Math.max(d,e)*100).toFixed(1)):0;
    relCharts.hop=new Chart(hCanvas,{type:'radar',data:{labels:['Single Hop','Triple Hop','Crossover','Side Hop'],datasets:hasReav?[{label:'Antes',data:[lsiOf(first.sht_avg_d,first.sht_avg_e),lsiOf(first.tht_avg_d,first.tht_avg_e),lsiOf(first.cot_avg_d,first.cot_avg_e),lsiOf(first.sidehop_d,first.sidehop_e)],borderColor:R,backgroundColor:R+'33',fill:true},{label:'Depois',data:[lsiOf(last.sht_avg_d,last.sht_avg_e),lsiOf(last.tht_avg_d,last.tht_avg_e),lsiOf(last.cot_avg_d,last.cot_avg_e),lsiOf(last.sidehop_d,last.sidehop_e)],borderColor:G,backgroundColor:G+'33',fill:true}]:[{label:'LSI',data:[lsiOf(last.sht_avg_d,last.sht_avg_e),lsiOf(last.tht_avg_d,last.tht_avg_e),lsiOf(last.cot_avg_d,last.cot_avg_e),lsiOf(last.sidehop_d,last.sidehop_e)],borderColor:G,backgroundColor:G+'33',fill:true}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:60,max:105}},plugins:{legend:{display:hasReav,labels:{font:{size:11},boxWidth:12}}}}});
  }

  const sCanvas=document.getElementById('rc-sim');
  if(sCanvas){
    relCharts.sim=new Chart(sCanvas,{type:'bar',data:{labels:['Single Hop','Triple Hop','Crossover','Squat','Bridge','Core'],datasets:[{label:'Direito',data:[last.sht_avg_d,last.tht_avg_d,last.cot_avg_d,last.squat_d,last.bridge_d,last.core_d],backgroundColor:G+'bb',borderColor:G,borderWidth:1},{label:'Esquerdo',data:[last.sht_avg_e,last.tht_avg_e,last.cot_avg_e,last.squat_e,last.bridge_e,last.core_e],backgroundColor:T+'bb',borderColor:T,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true}}}});
  }

  if(hasReav){
    const eCanvas=document.getElementById('rc-ev');
    if(eCanvas){
      relCharts.ev=new Chart(eCanvas,{type:'bar',data:{labels:['Nordic','Squat D','Squat E','Bridge D','Bridge E','Copenh D'],datasets:[{label:'Antes',data:[first.nordic,first.squat_d,first.squat_e,first.bridge_d,first.bridge_e,first.copenh_d],backgroundColor:R+'99',borderColor:R,borderWidth:1},{label:'Depois',data:[last.nordic,last.squat_d,last.squat_e,last.bridge_d,last.bridge_e,last.copenh_d],backgroundColor:G+'99',borderColor:G,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true}}}});
    }
  }
}

// ─── PDF ─────────────────────────────────────────────────────
function gerarPDF() {
  const pacId = document.getElementById('rel-paciente').value;
  if(!pacId) { toast('Selecione um paciente'); return; }
  const db = getDB();
  const pac = db.pacientes.find(p=>p.id===parseInt(pacId));
  const avals = db.avaliacoes.filter(a=>a.paciente_id===parseInt(pacId)).sort((a,b)=>a.data.localeCompare(b.data));
  if(!pac||!avals.length) { toast('Sem dados para gerar PDF'); return; }

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const last=avals[avals.length-1],first=avals[0],hasReav=avals.length>1;
  const W=210,mg=18; let y=0;
  const prof=db.profissionais.find(p=>p.id===last.profissional_id);

  doc.setFillColor(30,107,40); doc.rect(0,0,W,32,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont(undefined,'bold');
  doc.text('Cefise Academy',mg,13);
  doc.setFontSize(11); doc.setFont(undefined,'normal');
  doc.text('Sistema de Avaliação Clínica',mg,20);
  doc.setFontSize(9); doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,mg,27); y=40;

  doc.setTextColor(30,107,40); doc.setFontSize(13); doc.setFont(undefined,'bold');
  doc.text(pac.nome,mg,y); y+=7;
  doc.setTextColor(80,80,80); doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(`Nascimento: ${fmtDate(pac.nasc)} · Estatura: ${pac.altura||'—'}m · Peso: ${pac.peso||'—'}kg`,mg,y); y+=6;
  doc.text(`Profissional: ${prof?.nome||'—'} · Data: ${fmtDate(last.data)} · Tipo: ${last.tipo==='avaliacao'?'Avaliação inicial':'Reavaliação'}`,mg,y); y+=6;
  if(last.esporte) { doc.text(`Modalidade: ${last.esporte}${last.semana_lesao?' · Semana pós-lesão: '+last.semana_lesao:''}`,mg,y); y+=6; }
  y+=4;

  function section(title){
    if(y>265){doc.addPage();y=20;}
    doc.setFillColor(232,245,233);doc.rect(mg-2,y-5,W-mg*2+4,8,'F');
    doc.setTextColor(30,107,40);doc.setFontSize(11);doc.setFont(undefined,'bold');
    doc.text(title,mg,y);y+=9;doc.setTextColor(50,50,50);doc.setFontSize(10);doc.setFont(undefined,'normal');
  }
  function row(label,val){if(y>270){doc.addPage();y=20;}doc.text(`${label}:`,mg,y);doc.text(String(val||'—'),145,y);y+=5.5;}

  // EVA
  if(last.eva){section('Dor (EVA)');row('Escala Visual Analógica',`${last.eva}/10`);y+=2;}

  section('Testes de Força');
  [['Nordic Hamstring (bilateral)',last.nordic],['One-sided Squat D',last.squat_d],['One-sided Squat E',last.squat_e],['Single Leg Bridge D',last.bridge_d],['Single Leg Bridge E',last.bridge_e],['Copenhagen D',last.copenh_d],['Copenhagen E',last.copenh_e],['Core D (s)',last.core_d],['Core E (s)',last.core_e]].forEach(([l,v])=>row(l,v)); y+=4;

  section('Hop Tests (cm) — LSI');
  [['Single Hop',last.sht_avg_d,last.sht_avg_e],['Triple Hop',last.tht_avg_d,last.tht_avg_e],['Crossover',last.cot_avg_d,last.cot_avg_e],['Side Hop (reps)',last.sidehop_d,last.sidehop_e]].forEach(([nm,d,e])=>{
    const lsi=d&&e&&Math.max(d,e)>0?(Math.min(d,e)/Math.max(d,e)*100).toFixed(1):'—';
    row(nm,`D=${(d||0).toFixed?Number(d||0).toFixed(1):d||'—'} / E=${(e||0).toFixed?Number(e||0).toFixed(1):e||'—'} / LSI=${lsi}%`);
  }); y+=4;

  if(last.cmj_best){section('Saltos');row('CMJ — melhor tentativa (cm)',last.cmj_best);if(last.dj_rsi)row('Drop Jump RSI',last.dj_rsi);y+=4;}

  if(last.fms_total){section('FMS — Functional Movement Screen');row('Total',last.fms_total);y+=4;}

  if(last.dors_best_d||last.dors_best_e){section('Dorsiflexão weight-bearing (cm)');row('Direito',last.dors_best_d);row('Esquerdo',last.dors_best_e);y+=4;}

  // Escalas funcionais
  const escalasData=[];
  if(last.koos_dor) escalasData.push(['KOOS dor',last.koos_dor],['KOOS AVD',last.koos_avd],['KOOS Esporte',last.koos_esporte]);
  if(last.ikdc) escalasData.push(['IKDC',last.ikdc]);
  if(last.hoos_dor) escalasData.push(['HOOS dor',last.hoos_dor],['HOOS Esporte',last.hoos_esporte]);
  if(last.odi) escalasData.push(['ODI (%)',last.odi]);
  if(last.dash) escalasData.push(['DASH',last.dash]);
  if(last.visap) escalasData.push(['VISA-P',last.visap]);
  if(last.visaa) escalasData.push(['VISA-A',last.visaa]);
  if(last.faam_avd) escalasData.push(['FAAM AVD',last.faam_avd],['FAAM Esporte',last.faam_esp]);
  if(last.ndi) escalasData.push(['NDI (cervical) %',last.ndi]);
  if(escalasData.length){section('Escalas funcionais');escalasData.forEach(([l,v])=>row(l,v));y+=4;}

  // RTP
  if(last.aclrsi||last.rtp_decisao){
    section('RTP — Retorno Esportivo');
    if(last.aclrsi) row('ACL-RSI',`${last.aclrsi}/100`);
    const rtpCount=[last.rtp_lsi,last.rtp_forca,last.rtp_dor,last.rtp_edema,last.rtp_psico,last.rtp_tempo,last.rtp_agilidade,last.rtp_treino].filter(Boolean).length;
    row('Critérios cumpridos',`${rtpCount}/8`);
    if(last.rtp_decisao){const map={liberado:'Liberado',condicionado:'Com restrições',nao_liberado:'Não liberado',em_progresso:'Em progresso'};row('Decisão clínica',map[last.rtp_decisao]||last.rtp_decisao);}
    if(last.rtp_data) row('Data prevista de RTP',fmtDate(last.rtp_data));
    y+=4;
  }

  if(hasReav&&y<220){
    section('Comparativo — Antes × Depois');
    [['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Bridge D',first.bridge_d,last.bridge_d],['Core D',first.core_d,last.core_d],['Single Hop D',first.sht_avg_d,last.sht_avg_d],['CMJ',first.cmj_best,last.cmj_best],['FMS',first.fms_total,last.fms_total]].forEach(([nm,a,b])=>{
      const pct=a&&b?((b-a)/a*100).toFixed(1):null;
      row(nm,`${a||'—'} → ${b||'—'}${pct?(' ('+( pct>0?'+':'')+pct+'%)'):''}`);}
    );
  }

  // Notas
  if(last.nota_rtp||last.nota_forca||last.nota_testes||last.nota_mobilidade){
    section('Notas clínicas');
    [['Testes',last.nota_testes],['Força/Estabilidade',last.nota_forca],['Mobilidade',last.nota_mobilidade],['RTP/Evolução',last.nota_rtp]].forEach(([titulo,nota])=>{
      if(!nota) return;
      if(y>262){doc.addPage();y=20;}
      doc.setFont(undefined,'bold'); doc.text(`${titulo}:`,mg,y); doc.setFont(undefined,'normal'); y+=5;
      const lines=doc.splitTextToSize(nota, W-mg*2);
      lines.forEach(l=>{ if(y>270){doc.addPage();y=20;} doc.text(l,mg,y); y+=5; });
      y+=2;
    });
  }

  doc.setFontSize(8);doc.setTextColor(160,160,150);doc.text('Cefise Academy — Sistema de Avaliação Clínica v2.0',mg,287);
  doc.save(`Avaliacao_${pac.nome.replace(/\s+/g,'_')}_${last.data}.pdf`);
  toast('PDF gerado!');
}

// ─── PROFISSIONAIS ───────────────────────────────────────────
function renderProfissionais() {
  const db = getDB();
  document.getElementById('prof-list').innerHTML = db.profissionais.map(p=>`
    <div class="patient-item" style="cursor:default">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome}</div>
        <div class="pat-meta">${p.especialidade||'—'} · ${p.crf||'—'}</div>
        <div class="pat-meta">${db.avaliacoes.filter(a=>a.profissional_id===p.id).length} avaliação(ões)</div>
      </div>
      ${db.profissionais.length>1?`<button class="btn btn-danger btn-sm" onclick="removeProfissional(${p.id})"><i class="ti ti-trash"></i></button>`:''}
    </div>`).join('');
}

function showModalProf() { document.getElementById('modal-prof').style.display='flex'; showErr('modal-prof-error',''); }

function saveProfissional() {
  const nome=document.getElementById('np-nome').value.trim();
  const esp=document.getElementById('np-esp').value.trim()||'Fisioterapeuta';
  const crf=document.getElementById('np-crf').value.trim();
  if(!nome) { showErr('modal-prof-error','Informe o nome.'); return; }
  const db=getDB();
  if(db.profissionais.length>=10) { showErr('modal-prof-error','Máximo de 10 profissionais.'); return; }
  db.profissionais.push({id:nextId(db.profissionais),nome,especialidade:esp,crf});
  saveDB(db);
  closeModal('modal-prof');
  ['np-nome','np-esp','np-crf','np-email','np-senha'].forEach(id=>sv(id,''));
  updateProfSelects();
  renderProfissionais();
  toast('Profissional adicionado!');
}

function removeProfissional(id) {
  const db=getDB();
  if(db.avaliacoes.some(a=>a.profissional_id===id)) { toast('Profissional tem avaliações vinculadas'); return; }
  db.profissionais=db.profissionais.filter(p=>p.id!==id);
  saveDB(db);
  renderProfissionais();
}

// ─── ESCALAS INTERATIVAS ─────────────────────────────────────

// Inicializa botões de opção 1–5 do DASH
function initDASH() {
  const labels = ['Sem dificuldade','Pouca dificuldade','Dificuldade média','Muita dificuldade','Não conseguiu'];
  for (let q = 1; q <= 30; q++) {
    const container = document.querySelector(`[data-name="dash-q${q}"]`);
    if (!container) continue;
    container.innerHTML = '';
    for (let v = 1; v <= 5; v++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-opt-btn';
      btn.textContent = v;
      btn.title = labels[v-1];
      btn.dataset.val = v;
      btn.onclick = () => {
        container.querySelectorAll('.q-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        calcDASH();
      };
      container.appendChild(btn);
    }
  }
}

function calcDASH() {
  const vals = [];
  for (let q = 1; q <= 30; q++) {
    const sel = document.querySelector(`[data-name="dash-q${q}"] .q-opt-btn.selected`);
    if (sel) vals.push(parseInt(sel.dataset.val));
  }
  const n = vals.length;
  const el = document.getElementById('dash-resultado');
  const cls = document.getElementById('dash-class');
  const hidden = document.getElementById('dash');
  if (n < 27) {
    if (el) el.textContent = `Score: — (${n}/30 respondidas, mín. 27)`;
    if (cls) cls.textContent = '';
    if (hidden) hidden.value = '';
    return;
  }
  const score = ((vals.reduce((a,b)=>a+b,0)/n - 1) * 25);
  const rounded = Math.round(score * 10) / 10;
  if (el) el.textContent = `Score: ${rounded.toFixed(1)} / 100`;
  if (hidden) hidden.value = rounded;
  let classification = '';
  if (rounded < 20) classification = '< 20 — Excelente';
  else if (rounded < 40) classification = '20–39 — Bom';
  else if (rounded <= 60) classification = '40–60 — Regular';
  else classification = '> 60 — Incapacidade funcional grave';
  if (cls) cls.textContent = classification;
}

function calcODI() {
  const vals = [];
  for (let s = 1; s <= 10; s++) {
    const checked = document.querySelector(`input[name="odi-s${s}"]:checked`);
    if (checked) vals.push(parseInt(checked.value));
  }
  const el = document.getElementById('odi-resultado');
  const cls = document.getElementById('odi-class');
  const hidden = document.getElementById('odi');
  if (vals.length === 0) { if(el) el.textContent='Score: —'; return; }
  const maxPts = vals.length * 5;
  const score = Math.round((vals.reduce((a,b)=>a+b,0) / maxPts) * 100);
  if (el) el.textContent = `Score: ${score}%`;
  if (hidden) hidden.value = score;
  let classification = '';
  if (score <= 20) classification = '0–20% — Incapacidade mínima';
  else if (score <= 40) classification = '21–40% — Incapacidade moderada';
  else if (score <= 60) classification = '41–60% — Incapacidade intensa';
  else if (score <= 80) classification = '61–80% — Aleijado';
  else classification = '81–100% — Inválido';
  if (cls) cls.textContent = classification;
}

function calcNDI() {
  const vals = [];
  for (let s = 1; s <= 10; s++) {
    const checked = document.querySelector(`input[name="ndi-s${s}"]:checked`);
    if (checked) vals.push(parseInt(checked.value));
  }
  const el = document.getElementById('ndi-resultado');
  const cls = document.getElementById('ndi-class');
  const hidden = document.getElementById('ndi');
  if (vals.length === 0) { if(el) el.textContent='Score: —'; return; }
  const maxPts = vals.length * 5;
  const score = Math.round((vals.reduce((a,b)=>a+b,0) / maxPts) * 100);
  if (el) el.textContent = `Score: ${score}%`;
  if (hidden) hidden.value = score;
  let classification = '';
  if (score <= 8) classification = '0–8% — Sem incapacidade';
  else if (score <= 28) classification = '10–28% — Incapacidade leve';
  else if (score <= 48) classification = '30–48% — Incapacidade moderada';
  else if (score <= 64) classification = '50–64% — Incapacidade grave';
  else classification = '> 65% — Incapacidade completa';
  if (cls) cls.textContent = classification;
}

function calcVISAP() {
  const sliders = ['vp-q1','vp-q2','vp-q3','vp-q4','vp-q5','vp-q6'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(id+'-v');
    if (el && disp) disp.textContent = el.value;
  });
  const q1 = parseInt(document.getElementById('vp-q1')?.value || 0);
  const q2 = parseInt(document.getElementById('vp-q2')?.value || 0);
  const q3 = parseInt(document.getElementById('vp-q3')?.value || 0);
  const q4 = parseInt(document.getElementById('vp-q4')?.value || 0);
  const q5 = parseInt(document.getElementById('vp-q5')?.value || 0);
  const q6 = parseInt(document.getElementById('vp-q6')?.value || 0);
  const q7el = document.querySelector('input[name="vp-q7"]:checked');
  const q8el = document.querySelector('input[name="vp-q8"]:checked');
  const q7 = q7el ? parseInt(q7el.value) : null;
  const q8 = q8el ? parseInt(q8el.value) : null;
  if (q7 === null || q8 === null) return;
  const total = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8;
  const el = document.getElementById('visap-resultado');
  const hidden = document.getElementById('visap');
  if (el) el.textContent = `Score: ${total} / 100`;
  if (hidden) hidden.value = total;
}

function calcVISAA() {
  const sliders = ['va-q1','va-q2','va-q3','va-q4','va-q5','va-q6'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(id+'-v');
    if (el && disp) disp.textContent = el.value;
  });
  const q1 = parseInt(document.getElementById('va-q1')?.value || 0);
  const q2 = parseInt(document.getElementById('va-q2')?.value || 0);
  const q3 = parseInt(document.getElementById('va-q3')?.value || 0);
  const q4 = parseInt(document.getElementById('va-q4')?.value || 0);
  const q5 = parseInt(document.getElementById('va-q5')?.value || 0);
  const q6 = parseInt(document.getElementById('va-q6')?.value || 0);
  const q7el = document.querySelector('input[name="va-q7"]:checked');
  const q8el = document.querySelector('input[name="va-q8"]:checked');
  const q7 = q7el ? parseInt(q7el.value) : null;
  const q8 = q8el ? parseInt(q8el.value) : null;
  if (q7 === null || q8 === null) return;
  const total = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8;
  const el = document.getElementById('visaa-resultado');
  const hidden = document.getElementById('visaa');
  if (el) el.textContent = `Score: ${total} / 100`;
  if (hidden) hidden.value = total;
}

// Registrar listeners ODI e NDI + inicializar DASH ao carregar
document.addEventListener('DOMContentLoaded', () => {
  initDASH();
  for (let s = 1; s <= 10; s++) {
    document.querySelectorAll(`input[name="odi-s${s}"]`).forEach(r => r.addEventListener('change', calcODI));
    document.querySelectorAll(`input[name="ndi-s${s}"]`).forEach(r => r.addEventListener('change', calcNDI));
  }
});

// Atualizar clearForm para limpar escalas
const _clearFormOrig = clearForm;
clearForm = function() {
  _clearFormOrig();
  // Limpa DASH
  document.querySelectorAll('[data-name^="dash-"] .q-opt-btn').forEach(b => b.classList.remove('selected'));
  const dashRes = document.getElementById('dash-resultado'); if(dashRes) dashRes.textContent='Score: —';
  const dashCls = document.getElementById('dash-class'); if(dashCls) dashCls.textContent='';
  // Limpa ODI e NDI
  ['odi','ndi'].forEach(prefix => {
    for (let s = 1; s <= 10; s++) {
      document.querySelectorAll(`input[name="${prefix}-s${s}"]`).forEach(r => r.checked = false);
    }
    const res = document.getElementById(`${prefix}-resultado`); if(res) res.textContent='Score: —';
    const cls = document.getElementById(`${prefix}-class`); if(cls) cls.textContent='';
  });
  // Limpa VISA-P
  ['vp-q1','vp-q2','vp-q3','vp-q4','vp-q5','vp-q6'].forEach(id => {
    const el=document.getElementById(id); if(el){ el.value = id==='vp-q1'?0:10; const d=document.getElementById(id+'-v'); if(d) d.textContent=el.value; }
  });
  document.querySelectorAll('input[name="vp-q7"], input[name="vp-q8"]').forEach(r => r.checked=false);
  const vpRes = document.getElementById('visap-resultado'); if(vpRes) vpRes.textContent='Score: —';
  // Limpa VISA-A
  ['va-q1','va-q2','va-q3','va-q4','va-q5','va-q6'].forEach(id => {
    const el=document.getElementById(id); if(el){ el.value=10; const d=document.getElementById(id+'-v'); if(d) d.textContent='10'; }
  });
  document.querySelectorAll('input[name="va-q7"], input[name="va-q8"]').forEach(r => r.checked=false);
  const vaRes = document.getElementById('visaa-resultado'); if(vaRes) vaRes.textContent='Score: —';
  // Limpa NDI hidden
  ['ndi'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
};

// ─── KOOS / IKDC / FAAM — QUESTIONÁRIOS COMPLETOS ────────────

// Inicializa todos os botões de opção com data-name e data-labels
function initKOOS_IKDC_FAAM() {
  document.querySelectorAll('[data-labels]').forEach(container => {
    const labels = container.dataset.labels.split(',');
    const name   = container.dataset.name;
    const hasNA  = container.dataset.na === '1';
    const isReverse = container.dataset.reverse === '1';
    container.innerHTML = '';
    // valores: 0=pior → 4=melhor (padrão), reverse inverte display mas não valor
    labels.forEach((lbl, i) => {
      const val = isReverse ? i : i; // valor = posição (0..4), score = 4-val
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-opt-btn';
      btn.textContent = lbl.trim();
      btn.dataset.val = val;
      btn.onclick = () => {
        container.querySelectorAll('.q-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        recalcAll();
      };
      container.appendChild(btn);
    });
    if (hasNA) {
      const na = document.createElement('button');
      na.type = 'button'; na.className = 'q-opt-btn'; na.textContent = 'N/A'; na.dataset.val = 'na';
      na.onclick = () => {
        container.querySelectorAll('.q-opt-btn').forEach(b => b.classList.remove('selected'));
        na.classList.add('selected');
        recalcAll();
      };
      container.appendChild(na);
    }
  });
}

// Pontuação KOOS: score = (4 - valor_selecionado). S4,S5 são invertidas no display mas mesma lógica.
function calcKOOS() {
  const groups = {
    sint:   ['ks-s1','ks-s2','ks-s3','ks-s4','ks-s5','ks-s6','ks-s7'],
    dor:    ['ks-p1','ks-p2','ks-p3','ks-p4','ks-p5','ks-p6','ks-p7','ks-p8','ks-p9'],
    avd:    ['ks-a1','ks-a2','ks-a3','ks-a4','ks-a5','ks-a6','ks-a7','ks-a8','ks-a9','ks-a10','ks-a11','ks-a12','ks-a13','ks-a14','ks-a15','ks-a16','ks-a17'],
    esporte:['ks-sp1','ks-sp2','ks-sp3','ks-sp4','ks-sp5'],
    qv:     ['ks-q1','ks-q2','ks-q3','ks-q4'],
  };
  const ids  = { sint:'koos-sint', dor:'koos-dor', avd:'koos-avd', esporte:'koos-esporte', qv:'koos-qv' };
  const disp = { sint:'koos-sint-r', dor:'koos-dor-r', avd:'koos-avd-r', esporte:'koos-esporte-r', qv:'koos-qv-r' };
  const names = { sint:'Sintomas', dor:'Dor', avd:'AVD', esporte:'Esporte', qv:'QV' };

  for (const [key, names_arr] of Object.entries(groups)) {
    const vals = names_arr.map(n => {
      const sel = document.querySelector(`[data-name="${n}"] .q-opt-btn.selected`);
      return (sel && sel.dataset.val !== 'na') ? parseInt(sel.dataset.val) : null;
    }).filter(v => v !== null);
    const el   = document.getElementById(disp[key]);
    const hid  = document.getElementById(ids[key]);
    if (!vals.length) { if(el) el.textContent = `${names[key]}: —`; if(hid) hid.value=''; continue; }
    const score = ((4*vals.length - vals.reduce((a,b)=>a+b,0)) / (4*vals.length)) * 100;
    const r = Math.round(score * 10)/10;
    if(el)  el.textContent  = `${names[key]}: ${r.toFixed(0)}`;
    if(hid) hid.value = r;
  }
}

function calcIKDC() {
  // Q2 e Q3: slider já retorna 0-10 (Q2 e Q3 são reverse: Constant=0, Never=10)
  const q2v = parseInt(document.getElementById('ikdc-q2')?.value || 10);
  const q3v = parseInt(document.getElementById('ikdc-q3')?.value || 10);
  // Q10: slider 0-10
  const q10v = parseInt(document.getElementById('ikdc-q10')?.value || 10);

  const radioGroups = ['ikdc-q1','ikdc-q4','ikdc-q5','ikdc-q6','ikdc-q7','ikdc-q8',
                       'ikdc-q9a','ikdc-q9b','ikdc-q9c','ikdc-q9d','ikdc-q9e','ikdc-q9f','ikdc-q9g','ikdc-q9h','ikdc-q9i'];
  const maxMap = { 'ikdc-q1':4,'ikdc-q4':4,'ikdc-q5':4,'ikdc-q6':1,'ikdc-q7':4,'ikdc-q8':4,
                   'ikdc-q9a':4,'ikdc-q9b':4,'ikdc-q9c':4,'ikdc-q9d':4,'ikdc-q9e':4,'ikdc-q9f':4,'ikdc-q9g':4,'ikdc-q9h':4,'ikdc-q9i':4 };

  let sum = q2v + q3v + q10v;
  let maxPossible = 10 + 10 + 10;
  let allAnswered = true;

  for (const name of radioGroups) {
    const sel = document.querySelector(`input[name="${name}"]:checked`);
    if (!sel) { allAnswered = false; continue; }
    sum += parseInt(sel.value);
    maxPossible += maxMap[name];
  }

  const el  = document.getElementById('ikdc-resultado');
  const hid = document.getElementById('ikdc');
  if (!allAnswered) { if(el) el.textContent='Score: (responda todas as questões)'; return; }
  const score = Math.round((sum / maxPossible) * 1000) / 10;
  if(el)  el.textContent = `Score: ${score.toFixed(1)} / 100`;
  if(hid) hid.value = score;
}

function calcFAAM() {
  const avdNames = ['fa-avd1','fa-avd2','fa-avd3','fa-avd4','fa-avd5','fa-avd6','fa-avd7',
                    'fa-avd8','fa-avd9','fa-avd10','fa-avd11','fa-avd12','fa-avd13','fa-avd14',
                    'fa-avd15','fa-avd16','fa-avd17','fa-avd18','fa-avd19','fa-avd20','fa-avd21'];
  const espNames = ['fa-esp1','fa-esp2','fa-esp3','fa-esp4','fa-esp5','fa-esp6','fa-esp7','fa-esp8'];

  function calcSubescala(names, dispId, hidId) {
    let sum=0, max=0;
    names.forEach(n => {
      const sel = document.querySelector(`[data-name="${n}"] .q-opt-btn.selected`);
      if (!sel || sel.dataset.val === 'na') return;
      const v = parseInt(sel.dataset.val); // 0=incapaz, 1, 2, 3, 4=sem dif
      sum += v; max += 4;
    });
    const el  = document.getElementById(dispId);
    const hid = document.getElementById(hidId);
    if (!max) { if(el) el.textContent=dispId.includes('avd')?'AVD: —':'Esporte: —'; if(hid) hid.value=''; return; }
    const score = Math.round((sum/max)*1000)/10;
    if(el)  el.textContent = `${dispId.includes('avd')?'AVD':'Esporte'}: ${score.toFixed(0)}`;
    if(hid) hid.value = score;
  }

  calcSubescala(avdNames, 'faam-avd-r', 'faam-avd');
  calcSubescala(espNames, 'faam-esp-r', 'faam-esp');
}

function recalcAll() { calcKOOS(); calcIKDC(); calcFAAM(); }

// Inicia ao carregar — encadeia com initDASH existente
const _origDOMLoaded = window._domLoadedFired;
document.addEventListener('DOMContentLoaded', () => {
  initKOOS_IKDC_FAAM();
});

// ─── EVA COLORIDA ─────────────────────────────────────────────
function selectEVA(val) {
  document.querySelectorAll('.eva-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.eva-btn[data-val="${val}"]`);
  if (btn) btn.classList.add('selected');
  const hidden = document.getElementById('eva-valor');
  if (hidden) hidden.value = val;
}

// ─── FILTRO POR REGIÕES ───────────────────────────────────────
const REGIAO_MAP = {
  // regiao → quais data-regioes nos cards devem aparecer
  joelho:    ['joelho'],
  quadril:   ['quadril'],
  tornozelo: ['tornozelo'],
  lombar:    ['lombar'],
  toracica:  ['toracica','lombar'],
  cervical:  ['cervical'],
  ombro:     ['ombro','ombro,cotovelo'],
  cotovelo:  ['cotovelo','ombro,cotovelo'],
  muscular:  ['muscular'],
  rtp:       ['rtp','joelho'],
};

function applyRegioes() {
  const regioes = ['joelho','quadril','tornozelo','lombar','toracica','cervical','ombro','cotovelo','muscular','rtp'];
  const selected = regioes.filter(r => document.getElementById('reg-'+r)?.checked);

  // Nenhuma selecionada = mostra tudo
  if (selected.length === 0) {
    document.querySelectorAll('.regiao-block').forEach(el => el.classList.remove('hidden-region'));
    return;
  }

  // Quais tags de data-regioes estão ativas
  const activeTags = new Set();
  selected.forEach(r => {
    (REGIAO_MAP[r] || [r]).forEach(tag => activeTags.add(tag));
    activeTags.add(r);
  });

  document.querySelectorAll('.regiao-block').forEach(el => {
    const tags = (el.dataset.regioes || '').split(',').map(t => t.trim());
    const visible = tags.some(t => activeTags.has(t));
    el.classList.toggle('hidden-region', !visible);
  });

  // Salvar regiões selecionadas para uso no PDF
  window._regioesSelecionadas = selected;
}

// ─── PDF COM GRÁFICOS E INTERPRETAÇÃO ─────────────────────────
async function gerarPDF() {
  const pacId = document.getElementById('rel-paciente')?.value;
  if (!pacId) { toast('Selecione um paciente'); return; }
  const db = getDB();
  const pac = db.pacientes.find(p => p.id === parseInt(pacId));
  const avals = db.avaliacoes.filter(a => a.paciente_id === parseInt(pacId)).sort((a,b)=>a.data.localeCompare(b.data));
  if (!pac || !avals.length) { toast('Sem dados para gerar PDF'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const last = avals[avals.length-1], first = avals[0], hasReav = avals.length > 1;
  const W = 210, mg = 16; let y = 0;
  const prof = db.profissionais.find(p => p.id === last.profissional_id);
  const G = [29,158,117], R = [226,75,74], A = [186,117,23];

  // ── Cabeçalho ──
  doc.setFillColor(30,107,40); doc.rect(0,0,W,30,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(17); doc.setFont(undefined,'bold');
  doc.text('Cefise Academy',mg,12);
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text('Relatório de Avaliação Clínica',mg,19);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,mg,25); y = 38;

  doc.setTextColor(30,107,40); doc.setFontSize(14); doc.setFont(undefined,'bold');
  doc.text(pac.nome, mg, y); y+=7;
  doc.setTextColor(60,60,60); doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(`Nasc: ${fmtDate(pac.nasc)} · ${pac.altura||'—'}m · ${pac.peso||'—'}kg · Prof: ${prof?.nome||'—'}`, mg, y); y+=6;
  if (last.esporte) { doc.text(`Modalidade: ${last.esporte}${last.semana_lesao?` · Semana pós-lesão: ${last.semana_lesao}`:''}`, mg, y); y+=6; }
  doc.text(`Data: ${fmtDate(last.data)} · Tipo: ${last.tipo==='avaliacao'?'Avaliação inicial':'Reavaliação'}`, mg, y); y+=10;
  if (last.eva) { doc.text(`EVA — Dor: ${last.eva}/10`, mg, y); y+=8; }

  // ── Função auxiliar ──
  const n = v => v ? Number(v).toFixed(1) : '—';
  function section(title, color=[30,107,40]) {
    if (y > 260) { doc.addPage(); y = 16; }
    doc.setFillColor(...color, 30);
    doc.setFillColor(232,245,233);
    doc.rect(mg-2, y-5, W-mg*2+4, 8, 'F');
    doc.setTextColor(...color); doc.setFontSize(11); doc.setFont(undefined,'bold');
    doc.text(title, mg, y); y+=9;
    doc.setTextColor(50,50,50); doc.setFont(undefined,'normal'); doc.setFontSize(10);
  }
  function row(label, val, color=null) {
    if (y > 270) { doc.addPage(); y = 16; }
    doc.text(`${label}:`, mg, y);
    if (color) doc.setTextColor(...color);
    doc.text(String(val||'—'), 145, y);
    doc.setTextColor(50,50,50);
    y += 5.5;
  }
  function lsiColor(lsi) {
    if (!lsi || isNaN(lsi)) return null;
    const v = parseFloat(lsi);
    return v >= 90 ? G : v >= 80 ? A : R;
  }
  function interp(label, val, unit, okMin, okMax, higherBetter=true) {
    if (!val) return;
    const v = parseFloat(val);
    let color, txt;
    if (higherBetter) {
      if (v >= okMin) { color=G; txt='Dentro do esperado'; }
      else if (v >= okMin*0.8) { color=A; txt='Abaixo do ideal — atenção'; }
      else { color=R; txt='Déficit significativo'; }
    } else {
      if (v <= okMax) { color=G; txt='Dentro do esperado'; }
      else { color=R; txt='Acima do limite — déficit'; }
    }
    row(`  ${label}`, `${n(val)}${unit} — ${txt}`, color);
  }

  // ── Força ──
  section('Força muscular');
  interp('Nordic Hamstring', last.nordic, ' reps', 10, null);
  interp('One-sided Squat D', last.squat_d, ' reps', 20, null);
  interp('One-sided Squat E', last.squat_e, ' reps', 20, null);
  const sqLSI = last.squat_d&&last.squat_e ? (Math.min(last.squat_d,last.squat_e)/Math.max(last.squat_d,last.squat_e)*100).toFixed(1) : null;
  if (sqLSI) row('  LSI Squat', sqLSI+'%', lsiColor(sqLSI));
  interp('Single Leg Bridge D', last.bridge_d, ' reps', 25, null);
  interp('Single Leg Bridge E', last.bridge_e, ' reps', 25, null);
  interp('Copenhagen D', last.copenh_d, ' reps', 15, null);
  interp('Core D', last.core_d, ' s', 60, null);
  y += 4;

  // ── Gráfico de barras D×E (força) ──
  if (last.squat_d || last.squat_e || last.bridge_d || last.bridge_e) {
    if (y > 200) { doc.addPage(); y = 16; }
    doc.setFontSize(10); doc.setFont(undefined,'bold'); doc.setTextColor(30,107,40);
    doc.text('Gráfico — Força D × E', mg, y); y += 6;
    const forceItems = [
      ['Squat D', last.squat_d, 'D'], ['Squat E', last.squat_e, 'E'],
      ['Bridge D', last.bridge_d, 'D'], ['Bridge E', last.bridge_e, 'E'],
      ['Copenh D', last.copenh_d, 'D'], ['Copenh E', last.copenh_e, 'E'],
    ].filter(i => i[1]);
    const maxVal = Math.max(...forceItems.map(i => parseFloat(i[1])||0), 1);
    const barW = (W - mg*2 - 40) / forceItems.length;
    const chartH = 30;
    forceItems.forEach((item, idx) => {
      const v = parseFloat(item[1]) || 0;
      const bh = (v / maxVal) * chartH;
      const x = mg + 20 + idx * barW;
      const isD = item[2] === 'D';
      isD ? doc.setFillColor(...G) : doc.setFillColor(0,105,92);
      doc.rect(x, y + chartH - bh, barW*0.7, bh, 'F');
      doc.setFontSize(7); doc.setTextColor(60,60,60);
      doc.text(item[0], x, y + chartH + 4, {maxWidth: barW});
      doc.text(String(Math.round(v)), x, y + chartH - bh - 1);
    });
    y += chartH + 12;
  }

  // ── Hop Tests / LSI ──
  section('Hop Tests — LSI');
  const hopTests = [
    ['Single Hop', last.sht_avg_d, last.sht_avg_e, last.lsi_sht],
    ['Triple Hop', last.tht_avg_d, last.tht_avg_e, last.lsi_tht],
    ['Crossover', last.cot_avg_d, last.cot_avg_e, last.lsi_cot],
    ['Side Hop', last.sidehop_d, last.sidehop_e, last.lsi_sidehop],
  ].filter(h => h[1] || h[2]);

  hopTests.forEach(([nm, d, e, lsi]) => {
    const lv = lsi ? parseFloat(lsi) : (d&&e ? (Math.min(d,e)/Math.max(d,e)*100) : null);
    const c = lsiColor(lv);
    row(`  ${nm}`, `D=${n(d)} / E=${n(e)} / LSI=${lv?lv.toFixed(1)+'%':'—'}`, c);
  });

  // Gráfico radar LSI
  if (hopTests.length >= 2 && y < 230) {
    if (y > 200) { doc.addPage(); y = 16; }
    doc.setFontSize(10); doc.setFont(undefined,'bold'); doc.setTextColor(30,107,40);
    doc.text('Radar — LSI Hop Tests (%)', mg, y); y += 6;
    // Desenhar radar simples em canvas via HTML2Canvas não está disponível — usar barras horizontais como alternativa
    hopTests.forEach(([nm, d, e, lsi]) => {
      const lv = lsi ? parseFloat(lsi) : (d&&e ? (Math.min(d,e)/Math.max(d,e)*100) : null);
      if (!lv) return;
      const barMaxW = W - mg*2 - 50;
      const filled = (Math.min(lv, 100) / 100) * barMaxW;
      const c = lsiColor(lv);
      doc.setFillColor(220,220,220); doc.rect(mg+45, y-3, barMaxW, 5, 'F');
      doc.setFillColor(...c); doc.rect(mg+45, y-3, filled, 5, 'F');
      doc.setFontSize(9); doc.setTextColor(60,60,60);
      doc.text(nm, mg, y);
      doc.setTextColor(...c); doc.setFont(undefined,'bold');
      doc.text(`${lv.toFixed(1)}%`, mg+45+filled+2, y);
      doc.setFont(undefined,'normal'); doc.setTextColor(60,60,60);
      // Linha de referência 90%
      const ref90 = (90/100)*barMaxW;
      doc.setDrawColor(200,0,0); doc.setLineWidth(0.3);
      doc.line(mg+45+ref90, y-4, mg+45+ref90, y+2);
      y += 8;
    });
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('Linha vermelha = 90% (limiar RTP)', mg, y); y += 8;
  }

  // ── Saltos ──
  if (last.cmj_best || last.dj_rsi) {
    section('Saltos');
    interp('CMJ — melhor tentativa', last.cmj_best, ' cm', 35, null);
    if (last.dj_rsi) row('Drop Jump RSI', n(last.dj_rsi), parseFloat(last.dj_rsi)>=1.5?G:R);
    y += 4;
  }

  // ── FMS ──
  if (last.fms_total) {
    section('FMS — Functional Movement Screen');
    const fv = parseInt(last.fms_total);
    row('  Total FMS', `${fv}/21`, fv>=14?G:fv>=10?A:R);
    const fmsInterp = fv>=14?'Padrões de movimento adequados':'Risco aumentado de lesão — trabalhar padrões deficientes';
    row('  Interpretação', fmsInterp, fv>=14?G:R); y+=4;
  }

  // ── Escalas ──
  const escalas = [];
  if (last.koos_dor) escalas.push(['KOOS dor', last.koos_dor, '%', 80, null, true]);
  if (last.koos_esporte) escalas.push(['KOOS Esporte', last.koos_esporte, '%', 70, null, true]);
  if (last.ikdc) escalas.push(['IKDC', last.ikdc, '/100', 75, null, true]);
  if (last.hoos_dor) escalas.push(['HOOS dor', last.hoos_dor, '%', 80, null, true]);
  if (last.odi) escalas.push(['ODI', last.odi, '%', null, 20, false]);
  if (last.ndi) escalas.push(['NDI', last.ndi, '%', null, 8, false]);
  if (last.dash) escalas.push(['DASH', last.dash, '/100', null, 20, false]);
  if (last.visap) escalas.push(['VISA-P', last.visap, '/100', 80, null, true]);
  if (last.visaa) escalas.push(['VISA-A', last.visaa, '/100', 80, null, true]);
  if (escalas.length) {
    section('Escalas funcionais');
    escalas.forEach(([lbl, val, unit, okMin, okMax, higher]) => {
      interp(lbl, val, unit, okMin, okMax, higher);
    });
    y += 4;
  }

  // ── RTP ──
  if (last.aclrsi || last.rtp_decisao) {
    section('Retorno Esportivo (RTP)');
    const rtpCount = [last.rtp_lsi,last.rtp_forca,last.rtp_dor,last.rtp_edema,last.rtp_psico,last.rtp_tempo,last.rtp_agilidade,last.rtp_treino].filter(Boolean).length;
    row('  Critérios cumpridos', `${rtpCount}/8`, rtpCount>=7?G:rtpCount>=5?A:R);
    if (last.aclrsi) row('  ACL-RSI', `${n(last.aclrsi)}/100`, parseFloat(last.aclrsi)>=65?G:parseFloat(last.aclrsi)>=35?A:R);
    const map={liberado:'✅ Liberado',condicionado:'⚠️ Com restrições',nao_liberado:'❌ Não liberado',em_progresso:'🔄 Em progresso'};
    if (last.rtp_decisao) row('  Decisão', map[last.rtp_decisao]||last.rtp_decisao);
    if (last.rtp_data) row('  Data prevista', fmtDate(last.rtp_data));
    y += 4;
  }

  // ── Notas ──
  if (last.nota_rtp||last.nota_forca||last.nota_testes||last.nota_mobilidade) {
    section('Notas clínicas');
    [['Testes',last.nota_testes],['Força',last.nota_forca],['Mobilidade',last.nota_mobilidade],['RTP',last.nota_rtp]].forEach(([t,n])=>{
      if (!n) return;
      if (y>262){doc.addPage();y=16;}
      doc.setFont(undefined,'bold'); doc.text(`${t}:`,mg,y); doc.setFont(undefined,'normal'); y+=5;
      const lines=doc.splitTextToSize(n,W-mg*2);
      lines.forEach(l=>{if(y>270){doc.addPage();y=16;}doc.text(l,mg,y);y+=5;});
      y+=2;
    });
  }

  // ── Rodapé ──
  const pages = doc.internal.getNumberOfPages();
  for (let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(180,180,170);
    doc.text(`Cefise Academy — Página ${i}/${pages}`, mg, 290);
    doc.text(new Date().toLocaleDateString('pt-BR'), W-mg, 290, {align:'right'});
  }

  doc.save(`Avaliacao_${pac.nome.replace(/\s+/g,'_')}_${last.data}.pdf`);
  toast('PDF gerado com sucesso!');
}

// ─── LIMPAR EVA no clearForm ──────────────────────────────────
const _clearFormWithEVA = clearForm;
clearForm = function() {
  _clearFormWithEVA();
  document.querySelectorAll('.eva-btn').forEach(b => b.classList.remove('selected'));
  const h = document.getElementById('eva-valor'); if(h) h.value='0';
  // Limpar regiões
  ['joelho','quadril','tornozelo','lombar','toracica','cervical','ombro','cotovelo','muscular','rtp']
    .forEach(r => { const el=document.getElementById('reg-'+r); if(el) el.checked=false; });
  applyRegioes();
};

// ─── ACL-RSI COMPLETO ─────────────────────────────────────────
function calcACLRSI() {
  let sum = 0;
  for (let i = 1; i <= 12; i++) {
    const el = document.getElementById(`aclrsi-q${i}`);
    const vEl = document.getElementById(`aclrsi-q${i}v`);
    if (!el) continue;
    const v = parseInt(el.value);
    if (vEl) vEl.textContent = v;
    sum += v;
  }
  const score = Math.round(sum / 12);
  const hidden = document.getElementById('aclrsi');
  const res = document.getElementById('aclrsi-resultado');
  const cls = document.getElementById('aclrsi-class');
  if (hidden) hidden.value = score;
  if (res) {
    res.textContent = `Score: ${score} / 100`;
    res.style.background = score > 75 ? '#E1F5EE' : score >= 66 ? '#E1F5EE' : score >= 50 ? '#FEF3C7' : '#FEE2E2';
    res.style.color = score > 75 ? '#0F6E56' : score >= 66 ? '#1D9E75' : score >= 50 ? '#92400E' : '#991B1B';
  }
  if (cls) {
    if (score > 75) cls.textContent = '✅ Alta prontidão para retorno ao esporte (> 75)';
    else if (score >= 66) cls.textContent = '🟢 Boa prontidão (66–75)';
    else if (score >= 50) cls.textContent = '⚠️ Prontidão moderada (50–65)';
    else cls.textContent = '❌ Baixa prontidão psicológica (< 50)';
  }
}

// Inicializar sliders ACL-RSI ao carregar
document.addEventListener('DOMContentLoaded', () => {
  // Sincronizar displays iniciais
  for (let i = 1; i <= 12; i++) {
    const el = document.getElementById(`aclrsi-q${i}`);
    const vEl = document.getElementById(`aclrsi-q${i}v`);
    if (el && vEl) vEl.textContent = el.value;
  }
});

// ─── ACCORDION ────────────────────────────────────────────────
function toggleAcc(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  // Fechar todos no mesmo acc-list
  const list = btn.closest('.acc-list');
  if (list) {
    list.querySelectorAll('.acc-header.open').forEach(h => {
      h.classList.remove('open');
      h.nextElementSibling.style.display = 'none';
    });
  }
  if (!isOpen) {
    btn.classList.add('open');
    body.style.display = 'block';
  }
}

// ─── CRONÔMETRO ───────────────────────────────────────────────
const _cronos = {};

function cronoToggle(id) {
  if (!_cronos[id]) _cronos[id] = { running: false, elapsed: 0, start: null, interval: null };
  const c = _cronos[id];
  const displayId = id.startsWith('core') ? 'crono-core-display' : id.startsWith('dj') ? 'crono-dj-display' : 'crono-sls-display';
  if (c.running) {
    clearInterval(c.interval);
    c.elapsed += Date.now() - c.start;
    c.running = false;
  } else {
    c.start = Date.now();
    c.running = true;
    c.interval = setInterval(() => {
      const total = c.elapsed + (Date.now() - c.start);
      const secs = Math.floor(total / 1000);
      const ms = Math.floor((total % 1000) / 10);
      const disp = document.getElementById(displayId);
      if (disp) disp.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    }, 50);
  }
}

function cronoSet(fieldId) {
  // Determinar qual crono está ativo
  const prefix = fieldId.startsWith('core') ? fieldId : fieldId.startsWith('sls') ? fieldId : 'dj-t';
  const c = _cronos[prefix] || _cronos[fieldId];
  if (!c) return;
  if (c.running) { clearInterval(c.interval); c.elapsed += Date.now() - c.start; c.running = false; }
  const secs = Math.floor(c.elapsed / 1000);
  const el = document.getElementById(fieldId);
  if (el) el.value = secs;
  toast(`Salvo: ${secs}s`);
}

function cronoReset(prefix) {
  ['d','e','t'].forEach(s => {
    const id = prefix + '-' + s;
    if (_cronos[id]) { clearInterval(_cronos[id].interval); _cronos[id] = null; }
  });
  const displayId = prefix === 'core' ? 'crono-core-display' : prefix === 'dj' ? 'crono-dj-display' : 'crono-sls-display';
  const disp = document.getElementById(displayId);
  if (disp) disp.textContent = '00:00';
}

// ─── RTP MULTI-REGIÃO ─────────────────────────────────────────
function updateRTPRegioes() {
  const regioes = ['joelho','ombro','lombar','quadril','tornozelo','muscular'];
  regioes.forEach(r => {
    const block = document.getElementById('rtp-' + r);
    if (!block) return;
    const checked = document.getElementById('reg-' + r)?.checked ||
                    document.getElementById('reg-' + (r==='lombar'?'toracica':r))?.checked;
    block.style.display = (document.getElementById('reg-' + r)?.checked) ? 'block' : 'none';
  });
  // lombar também para torácica
  const lomBlock = document.getElementById('rtp-lombar');
  if (lomBlock) {
    if (document.getElementById('reg-lombar')?.checked || document.getElementById('reg-toracica')?.checked) {
      lomBlock.style.display = 'block';
    }
  }
  updateRTPCounter();
}

// Override updateRTPCounter para contar todos os checkboxes visíveis
function updateRTPCounter() {
  const allIds = [
    'rtp-dor','rtp-edema','rtp-psico','rtp-treino','rtp-agilidade',
    'rtp-lsi','rtp-forca','rtp-tempo','rtp-joelho-adm',
    'rtp-ombro-adm','rtp-ombro-forca','rtp-ombro-estab',
    'rtp-coluna-adm','rtp-coluna-core','rtp-coluna-odi',
    'rtp-quadril-adm','rtp-quadril-forca','rtp-quadril-hoos',
    'rtp-tornozelo-estab','rtp-tornozelo-dors','rtp-tornozelo-faam',
    'rtp-musc-dor','rtp-musc-forca','rtp-musc-agilidade'
  ];
  let total = 0, checked = 0;
  allIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const parent = el.closest('.rtp-regiao');
    if (parent && parent.style.display === 'none') return;
    total++;
    if (el.checked) checked++;
  });
  const el = document.getElementById('rtp-progresso');
  if (el) {
    el.textContent = `${checked} / ${total}`;
    el.style.color = checked === total ? '#1D9E75' : checked >= total*0.75 ? '#BA7517' : '#E24B4A';
  }
}

// Atualizar applyRegioes para também atualizar RTP
const _origApplyRegioes = typeof applyRegioes === 'function' ? applyRegioes : null;
applyRegioes = function() {
  if (_origApplyRegioes) _origApplyRegioes();
  updateRTPRegioes();
};

// Inicializar acc-items com classe acc-open
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.acc-item.acc-open').forEach(item => {
    const header = item.querySelector('.acc-header');
    const body = item.querySelector('.acc-body');
    if (header) header.classList.add('open');
    if (body) body.style.display = 'block';
  });
});
