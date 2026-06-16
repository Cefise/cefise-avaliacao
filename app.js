// ============================================================
//  CEFISE ACADEMY — Sistema de Avaliação Clínica
//  Versão local — dados em memória do navegador
// ============================================================

// Banco de dados local
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

// ─── UTILITÁRIOS ───────────────────────────────────────────

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

// ─── INIT ─────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();
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

function doLogout() {
  // No logout needed in local mode
  toast('Modo local — sem necessidade de logout');
}

function updateProfSelects() {
  const db = getDB();
  const opts = db.profissionais.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
  const ap = document.getElementById('active-prof');
  if(ap) { ap.innerHTML = opts; ap.value = currentProfId; }
}

// ─── NAVEGAÇÃO ─────────────────────────────────────────────

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
}

function closeModal(id) { document.getElementById(id).style.display='none'; }

// ─── DASHBOARD ─────────────────────────────────────────────

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

// ─── PACIENTES ─────────────────────────────────────────────

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

// ─── AVALIAÇÃO ─────────────────────────────────────────────

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

function calcAvg(prefix) {
  ['d','e'].forEach(side=>{
    const vals=[1,2,3].map(i=>{const el=document.getElementById(`${prefix}${i}-${side}`);return el&&el.value?parseFloat(el.value):null;}).filter(v=>v!==null);
    const avgEl=document.getElementById(`${prefix}-avg-${side}`);
    if(avgEl) avgEl.textContent=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):'—';
  });
}

function getAvg(prefix,side) {
  const vals=[1,2,3].map(i=>gv(`${prefix}${i}-${side}`)).filter(v=>v>0);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}

function getRadio(name) { const el=document.querySelector(`input[name="${name}"]:checked`); return el?el.value:'nao'; }

function clearForm() {
  ['f-nome','f-nasc','f-altura','f-peso','f-contato'].forEach(id=>sv(id,''));
  document.getElementById('f-tipo').value='avaliacao';
  document.getElementById('f-data').value=new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[name=cirurgia]')[0].checked=true;
  document.querySelectorAll('input[name=hdp]')[0].checked=true;
  document.querySelectorAll('input[name=hda]')[0].checked=true;
  document.querySelectorAll('input[name=dor]')[0].checked=true;
  ['det-cirurgia','det-hdp','det-hda','det-dor'].forEach(id=>{sv(id,'');const el=document.getElementById(id);if(el)el.style.display='none';});
  ['nordic','squat-d','squat-e','bridge-d','bridge-e','copenh-d','copenh-e','core-d','core-e',
   'step-vd-d','step-vd-e','step-qp-d','step-qp-e','gonio-ri-d','gonio-ri-e','gonio-re-d','gonio-re-e',
   'lunge-cm-d','lunge-cm-e','lunge-ang-d','lunge-ang-e',
   'faber-d','faber-e','fadir-d','fadir-e','lasegue-d','lasegue-e','slump-d','slump-e'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['sht','tht','cot'].forEach(p=>['d','e'].forEach(s=>{
    [1,2,3].forEach(i=>{const el=document.getElementById(`${p}${i}-${s}`);if(el)el.value='';});
    const avg=document.getElementById(`${p}-avg-${s}`);if(avg)avg.textContent='—';
  }));
  showTab(0);
}

function salvarAvaliacao() {
  const nome = document.getElementById('f-nome').value.trim();
  if(!nome) { toast('Informe o nome do paciente'); showTab(0); return; }
  const db = getDB();

  let pac = db.pacientes.find(p=>p.nome.toLowerCase()===nome.toLowerCase());
  if(!pac) {
    pac = {id:nextId(db.pacientes),nome,nasc:document.getElementById('f-nasc').value||null,altura:parseFloat(document.getElementById('f-altura').value)||null,peso:parseFloat(document.getElementById('f-peso').value)||null,contato:document.getElementById('f-contato').value||null,profissional_id:currentProfId,created_at:new Date().toISOString()};
    db.pacientes.push(pac);
  }

  const aval = {
    id:nextId(db.avaliacoes), paciente_id:pac.id, profissional_id:currentProfId,
    data:document.getElementById('f-data').value, tipo:document.getElementById('f-tipo').value,
    cirurgia:getRadio('cirurgia'), cirurgia_detalhe:document.getElementById('det-cirurgia').value,
    hdp:getRadio('hdp'), hdp_detalhe:document.getElementById('det-hdp').value,
    hda:getRadio('hda'), hda_detalhe:document.getElementById('det-hda').value,
    dor:getRadio('dor'), dor_detalhe:document.getElementById('det-dor').value,
    faber_d:document.getElementById('faber-d').value, faber_e:document.getElementById('faber-e').value,
    fadir_d:document.getElementById('fadir-d').value, fadir_e:document.getElementById('fadir-e').value,
    lasegue_d:document.getElementById('lasegue-d').value, lasegue_e:document.getElementById('lasegue-e').value,
    slump_d:document.getElementById('slump-d').value, slump_e:document.getElementById('slump-e').value,
    gonio_ri_d:gv('gonio-ri-d'), gonio_ri_e:gv('gonio-ri-e'),
    gonio_re_d:gv('gonio-re-d'), gonio_re_e:gv('gonio-re-e'),
    nordic:gv('nordic'), squat_d:gv('squat-d'), squat_e:gv('squat-e'),
    bridge_d:gv('bridge-d'), bridge_e:gv('bridge-e'),
    copenh_d:gv('copenh-d'), copenh_e:gv('copenh-e'),
    core_d:gv('core-d'), core_e:gv('core-e'),
    step_vd_d:gv('step-vd-d'), step_vd_e:gv('step-vd-e'),
    step_qp_d:gv('step-qp-d'), step_qp_e:gv('step-qp-e'),
    sht_avg_d:getAvg('sht','d'), sht_avg_e:getAvg('sht','e'),
    tht_avg_d:getAvg('tht','d'), tht_avg_e:getAvg('tht','e'),
    cot_avg_d:getAvg('cot','d'), cot_avg_e:getAvg('cot','e'),
    lunge_cm_d:gv('lunge-cm-d'), lunge_cm_e:gv('lunge-cm-e'),
    lunge_ang_d:gv('lunge-ang-d'), lunge_ang_e:gv('lunge-ang-e'),
    created_at:new Date().toISOString()
  };
  db.avaliacoes.push(aval);
  saveDB(db);
  toast('Avaliação salva!');
  clearForm();
  showPage('pacientes');
}

// ─── RELATÓRIO ─────────────────────────────────────────────

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

  el.innerHTML = `
  <div class="rel-header">
    <img src="public/logo.png" alt="Cefise">
    <div><h2>${pac.nome}</h2><p>${calcIdade(pac.nasc)} anos · ${pac.peso||'—'}kg · ${pac.altura||'—'}m · Prof: ${prof?.nome||'—'}</p></div>
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
        ${[['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Squat E',first.squat_e,last.squat_e],['Bridge D',first.bridge_d,last.bridge_d],['Bridge E',first.bridge_e,last.bridge_e],['Copenhagen D',first.copenh_d,last.copenh_d],['Core D',first.core_d,last.core_d]].map(([n,a,b])=>`<tr><td>${n}</td><td>${a||'—'}</td><td>${b||'—'}</td><td>${diff(a,b)}</td></tr>`).join('')}
      </table>
      <div class="chart-wrap" style="height:300px"><canvas id="rc-ev"></canvas></div>
    </div>
  </div>`:''}
  <div class="card">
    <div class="card-title"><i class="ti ti-table"></i> LSI — Índice de simetria</div>
    <table class="lsi-table">
      <tr><th>Teste</th><th>Direito</th><th>Esquerdo</th><th>LSI</th><th>Classificação</th></tr>
      ${[['Single Hop',last.sht_avg_d,last.sht_avg_e],['Triple Hop',last.tht_avg_d,last.tht_avg_e],['Crossover',last.cot_avg_d,last.cot_avg_e],['Squat',last.squat_d,last.squat_e],['Bridge',last.bridge_d,last.bridge_e],['Core',last.core_d,last.core_e]].map(([n,d,e])=>{
        const lv=e>0?d/e*100:0;
        return `<tr><td>${n}</td><td>${(d||0).toFixed?Number(d||0).toFixed(1):d||'—'}</td><td>${(e||0).toFixed?Number(e||0).toFixed(1):e||'—'}</td><td><b>${lv.toFixed(1)}%</b></td><td><span class="badge ${lsiClass(lv)}">${lsiLabel(lv)}</span></td></tr>`;
      }).join('')}
    </table>
  </div>`;
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
    const lsiOf=(d,e)=>e>0?parseFloat((d/e*100).toFixed(1)):0;
    relCharts.hop=new Chart(hCanvas,{type:'radar',data:{labels:['Single Hop','Triple Hop','Crossover'],datasets:hasReav?[{label:'Antes',data:[lsiOf(first.sht_avg_d,first.sht_avg_e),lsiOf(first.tht_avg_d,first.tht_avg_e),lsiOf(first.cot_avg_d,first.cot_avg_e)],borderColor:R,backgroundColor:R+'33',fill:true},{label:'Depois',data:[lsiOf(last.sht_avg_d,last.sht_avg_e),lsiOf(last.tht_avg_d,last.tht_avg_e),lsiOf(last.cot_avg_d,last.cot_avg_e)],borderColor:G,backgroundColor:G+'33',fill:true}]:[{label:'LSI',data:[lsiOf(last.sht_avg_d,last.sht_avg_e),lsiOf(last.tht_avg_d,last.tht_avg_e),lsiOf(last.cot_avg_d,last.cot_avg_e)],borderColor:G,backgroundColor:G+'33',fill:true}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:60,max:105}},plugins:{legend:{display:hasReav,labels:{font:{size:11},boxWidth:12}}}}});
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

// ─── PDF ───────────────────────────────────────────────────

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
  doc.text(`Profissional: ${prof?.nome||'—'} · Data: ${fmtDate(last.data)} · Tipo: ${last.tipo==='avaliacao'?'Avaliação inicial':'Reavaliação'}`,mg,y); y+=10;
  function section(title){doc.setFillColor(232,245,233);doc.rect(mg-2,y-5,W-mg*2+4,8,'F');doc.setTextColor(30,107,40);doc.setFontSize(11);doc.setFont(undefined,'bold');doc.text(title,mg,y);y+=9;doc.setTextColor(50,50,50);doc.setFontSize(10);doc.setFont(undefined,'normal');}
  section('Testes de Força');
  [['Nordic Hamstring (bilateral)',last.nordic],['One-sided Squat D',last.squat_d],['One-sided Squat E',last.squat_e],['Single Leg Bridge D',last.bridge_d],['Single Leg Bridge E',last.bridge_e],['Copenhagen D',last.copenh_d],['Copenhagen E',last.copenh_e],['Core D (s)',last.core_d],['Core E (s)',last.core_e]].forEach(([l,v])=>{doc.text(`${l}:`,mg,y);doc.text(String(v||0),145,y);y+=5.5;}); y+=4;
  section('Hop Tests (cm) — LSI');
  [['Single Hop',last.sht_avg_d,last.sht_avg_e],['Triple Hop',last.tht_avg_d,last.tht_avg_e],['Crossover',last.cot_avg_d,last.cot_avg_e]].forEach(([n,d,e])=>{const lsi=e>0?(d/e*100).toFixed(1):'—';doc.text(`${n}: D=${(d||0).toFixed(1)} / E=${(e||0).toFixed(1)} / LSI=${lsi}%`,mg,y);y+=5.5;}); y+=4;
  section('Lunge Test');
  doc.text(`Direito: ${last.lunge_cm_d||0}cm / ${last.lunge_ang_d||0}°   Esquerdo: ${last.lunge_cm_e||0}cm / ${last.lunge_ang_e||0}°`,mg,y); y+=10;
  if(hasReav&&y<220){section('Comparativo — Antes × Depois');[['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Bridge D',first.bridge_d,last.bridge_d],['Core D',first.core_d,last.core_d],['Single Hop D',first.sht_avg_d,last.sht_avg_d]].forEach(([n,a,b])=>{const pct=a?((b-a)/a*100).toFixed(1):0;doc.text(`${n}: ${a||0} → ${b||0}  (${pct>0?'+':''}${pct}%)`,mg,y);y+=5.5;});}
  doc.setFontSize(8);doc.setTextColor(160,160,150);doc.text('Cefise Academy — Sistema de Avaliação Clínica',mg,287);
  doc.save(`Avaliacao_${pac.nome.replace(/\s+/g,'_')}_${last.data}.pdf`);
  toast('PDF gerado!');
}

// ─── PROFISSIONAIS ─────────────────────────────────────────

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

