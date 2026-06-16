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
