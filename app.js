// ============================================================
//  CEFISE ACADEMY — Sistema de Avaliação Clínica
//  app.js — lógica principal
// ============================================================

let currentUser = null;
let currentProfile = null;
let relCharts = {};
let dashChart = null;

// ─── UTILITÁRIOS ───────────────────────────────────────────

function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function loading(show) {
  const el = document.getElementById('loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function gv(id) {
  const el = document.getElementById(id);
  return el ? (parseFloat(el.value) || 0) : 0;
}

function sv(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : '';
}

function calcIdade(nasc) {
  if (!nasc) return '?';
  const d = new Date(nasc), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ─── AUTENTICAÇÃO ──────────────────────────────────────────

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  showErr('login-error', '');
  if (!email || !pass) { showErr('login-error', 'Preencha e-mail e senha.'); return; }
  const btn = document.querySelector('.btn-full');
  if (btn) btn.disabled = true;
  try {
    const client = window._supabaseClient;
    if (!client) { showErr('login-error', 'Erro de conexão. Recarregue a página.'); return; }
    const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
    if (error) { showErr('login-error', 'E-mail ou senha incorretos.'); return; }
    currentUser = data.user;
    await loadProfile();
    enterApp();
  } catch(e) {
    showErr('login-error', 'Erro inesperado. Tente novamente.');
    console.error(e);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function doLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-login').style.display = 'flex';
}

async function loadProfile() {
  const { data } = await supabase
    .from('profissionais')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();
  currentProfile = data;
  document.getElementById('sidebar-name').textContent = data?.nome || currentUser.email;
  document.getElementById('sidebar-role').textContent = data?.role === 'admin' ? 'Administrador' : data?.especialidade || 'Profissional';
  document.getElementById('sidebar-avatar').textContent = initials(data?.nome || currentUser.email);
  if (data?.role === 'admin') {
    document.getElementById('admin-section').style.display = 'block';
    document.getElementById('admin-btn').style.display = 'flex';
  }
}

function enterApp() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-app').style.display = 'flex';
  showPage('dashboard');
}

// Check existing session on load
window.addEventListener('DOMContentLoaded', async () => {
  // Radio toggles
  setupRadioToggles();
  // Today's date
  document.getElementById('f-data').value = new Date().toISOString().split('T')[0];

  loading(true);
  const { data: { session } } = await supabase.auth.getSession();
  loading(false);
  if (session) {
    currentUser = session.user;
    await loadProfile();
    enterApp();
  }
});

function setupRadioToggles() {
  const pairs = [
    ['cirurgia', 'det-cirurgia'],
    ['hdp', 'det-hdp'],
    ['hda', 'det-hda'],
    ['dor', 'det-dor'],
  ];
  pairs.forEach(([name, detId]) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
      r.addEventListener('change', () => {
        const el = document.getElementById(detId);
        if (el) el.style.display = r.value === 'sim' ? 'block' : 'none';
      });
    });
  });
}

// ─── NAVEGAÇÃO ─────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if (btn) btn.classList.add('active');
  const titles = { dashboard: 'Dashboard', pacientes: 'Pacientes', avaliacao: 'Nova avaliação', relatorio: 'Gráficos & Relatório PDF', profissionais: 'Profissionais' };
  document.getElementById('page-title').textContent = titles[name] || name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'pacientes') renderPatients();
  if (name === 'relatorio') loadRelatorioSelect();
  if (name === 'profissionais') renderProfissionais();
}

function showTab(idx) {
  document.querySelectorAll('.tab-pane').forEach((p, i) => p.classList.toggle('active', i === idx));
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ─── DASHBOARD ─────────────────────────────────────────────

async function renderDashboard() {
  const [{ count: nPac }, { count: nAval }, { count: nReav }, { count: nProf }, { data: recent }, { data: byProf }] = await Promise.all([
    supabase.from('pacientes').select('*', { count: 'exact', head: true }),
    supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('tipo', 'avaliacao'),
    supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('tipo', 'reavaliacao'),
    supabase.from('profissionais').select('*', { count: 'exact', head: true }),
    supabase.from('pacientes').select('id, nome, nasc, profissional_id').order('created_at', { ascending: false }).limit(5),
    supabase.from('profissionais').select('id, nome, avaliacoes(count)'),
  ]);
  document.getElementById('st-pacientes').textContent = nPac ?? 0;
  document.getElementById('st-avals').textContent = nAval ?? 0;
  document.getElementById('st-reavals').textContent = nReav ?? 0;
  document.getElementById('st-profs').textContent = nProf ?? 0;

  const recEl = document.getElementById('dash-recent');
  recEl.innerHTML = (recent || []).length ? (recent || []).map(p => `
    <div class="patient-item" onclick="openRelatorio(${p.id})">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome}</div>
        <div class="pat-meta">${calcIdade(p.nasc)} anos</div>
      </div>
    </div>`).join('') : '<div class="empty-state" style="padding:20px"><i class="ti ti-users"></i><p>Nenhum paciente ainda</p></div>';

  // Chart
  if (dashChart) dashChart.destroy();
  const labels = (byProf || []).map(p => p.nome.split(' ').slice(0, 2).join(' '));
  const vals = (byProf || []).map(p => p.avaliacoes?.[0]?.count || 0);
  const colors = ['#2d7d32', '#00695c', '#1565c0', '#6a1b9a', '#c62828', '#e65100', '#37474f'];
  const canvas = document.getElementById('chart-dash-prof');
  if (canvas) {
    dashChart = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } } }
    });
  }
}

// ─── PACIENTES ─────────────────────────────────────────────

let allPatients = [];

async function renderPatients(filter = '') {
  if (!allPatients.length || !filter) {
    const { data } = await supabase.from('pacientes').select('*, profissional:profissional_id(nome), avaliacoes(id, tipo, data)').order('nome');
    allPatients = data || [];
  }
  const list = filter ? allPatients.filter(p => p.nome.toLowerCase().includes(filter.toLowerCase())) : allPatients;
  const el = document.getElementById('patient-list');
  el.innerHTML = list.length ? list.map(p => {
    const tags = (p.avaliacoes || []).map(a =>
      `<span class="badge ${a.tipo === 'avaliacao' ? 'badge-green' : 'badge-teal'}">${a.tipo === 'avaliacao' ? 'Avaliação' : 'Reavaliação'} ${fmtDate(a.data)}</span>`
    ).join('');
    return `<div class="patient-item">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome}</div>
        <div class="pat-meta">${calcIdade(p.nasc)} anos · ${p.peso || '—'}kg · ${p.altura || '—'}m · ${p.profissional?.nome || '—'}</div>
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

async function iniciarReavaliacao(pacId) {
  const { data: p } = await supabase.from('pacientes').select('*').eq('id', pacId).single();
  if (!p) return;
  sv('f-nome', p.nome); sv('f-nasc', p.nasc); sv('f-altura', p.altura);
  sv('f-peso', p.peso); sv('f-contato', p.contato);
  document.getElementById('f-tipo').value = 'reavaliacao';
  document.getElementById('f-data').value = new Date().toISOString().split('T')[0];
  showPage('avaliacao'); showTab(0);
  toast('Modo reavaliação — ' + p.nome.split(' ')[0]);
}

// ─── AVALIAÇÃO ─────────────────────────────────────────────

function calcAvg(prefix) {
  ['d', 'e'].forEach(side => {
    const vals = [1, 2, 3].map(i => {
      const el = document.getElementById(`${prefix}${i}-${side}`);
      return el && el.value ? parseFloat(el.value) : null;
    }).filter(v => v !== null);
    const avgEl = document.getElementById(`${prefix}-avg-${side}`);
    if (avgEl) avgEl.textContent = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  });
}

function getAvg(prefix, side) {
  const vals = [1, 2, 3].map(i => gv(`${prefix}${i}-${side}`)).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : 'nao';
}

function clearForm() {
  ['f-nome', 'f-nasc', 'f-altura', 'f-peso', 'f-contato'].forEach(id => sv(id, ''));
  document.getElementById('f-tipo').value = 'avaliacao';
  document.getElementById('f-data').value = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[name=cirurgia]')[0].checked = true;
  document.querySelectorAll('input[name=hdp]')[0].checked = true;
  document.querySelectorAll('input[name=hda]')[0].checked = true;
  document.querySelectorAll('input[name=dor]')[0].checked = true;
  ['det-cirurgia', 'det-hdp', 'det-hda', 'det-dor'].forEach(id => { sv(id, ''); document.getElementById(id).style.display = 'none'; });
  ['nordic', 'squat-d', 'squat-e', 'bridge-d', 'bridge-e', 'copenh-d', 'copenh-e',
   'core-d', 'core-e', 'step-vd-d', 'step-vd-e', 'step-qp-d', 'step-qp-e',
   'gonio-ri-d', 'gonio-ri-e', 'gonio-re-d', 'gonio-re-e',
   'lunge-cm-d', 'lunge-cm-e', 'lunge-ang-d', 'lunge-ang-e',
   'faber-d', 'faber-e', 'fadir-d', 'fadir-e', 'lasegue-d', 'lasegue-e', 'slump-d', 'slump-e'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['sht', 'tht', 'cot'].forEach(p => ['d', 'e'].forEach(s => {
    [1, 2, 3].forEach(i => { const el = document.getElementById(`${p}${i}-${s}`); if (el) el.value = ''; });
    const avg = document.getElementById(`${p}-avg-${s}`); if (avg) avg.textContent = '—';
  }));
  showTab(0);
}

async function salvarAvaliacao() {
  const nome = document.getElementById('f-nome').value.trim();
  if (!nome) { toast('Informe o nome do paciente'); showTab(0); return; }

  loading(true);
  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;

  try {
    // Upsert paciente
    let { data: pac } = await supabase.from('pacientes').select('id').ilike('nome', nome).single();
    if (!pac) {
      const { data: newPac, error: ePac } = await supabase.from('pacientes').insert({
        nome,
        nasc: document.getElementById('f-nasc').value || null,
        altura: parseFloat(document.getElementById('f-altura').value) || null,
        peso: parseFloat(document.getElementById('f-peso').value) || null,
        contato: document.getElementById('f-contato').value || null,
        profissional_id: currentProfile?.id || null,
      }).select('id').single();
      if (ePac) throw ePac;
      pac = newPac;
    }

    // Avaliação
    const aval = {
      paciente_id: pac.id,
      profissional_id: currentProfile?.id || null,
      data: document.getElementById('f-data').value,
      tipo: document.getElementById('f-tipo').value,
      // Anamnese
      cirurgia: getRadio('cirurgia'), cirurgia_detalhe: document.getElementById('det-cirurgia').value,
      hdp: getRadio('hdp'), hdp_detalhe: document.getElementById('det-hdp').value,
      hda: getRadio('hda'), hda_detalhe: document.getElementById('det-hda').value,
      dor: getRadio('dor'), dor_detalhe: document.getElementById('det-dor').value,
      // Testes especiais
      faber_d: document.getElementById('faber-d').value, faber_e: document.getElementById('faber-e').value,
      fadir_d: document.getElementById('fadir-d').value, fadir_e: document.getElementById('fadir-e').value,
      lasegue_d: document.getElementById('lasegue-d').value, lasegue_e: document.getElementById('lasegue-e').value,
      slump_d: document.getElementById('slump-d').value, slump_e: document.getElementById('slump-e').value,
      gonio_ri_d: gv('gonio-ri-d'), gonio_ri_e: gv('gonio-ri-e'),
      gonio_re_d: gv('gonio-re-d'), gonio_re_e: gv('gonio-re-e'),
      // Força
      nordic: gv('nordic'),
      squat_d: gv('squat-d'), squat_e: gv('squat-e'),
      bridge_d: gv('bridge-d'), bridge_e: gv('bridge-e'),
      copenh_d: gv('copenh-d'), copenh_e: gv('copenh-e'),
      core_d: gv('core-d'), core_e: gv('core-e'),
      step_vd_d: gv('step-vd-d'), step_vd_e: gv('step-vd-e'),
      step_qp_d: gv('step-qp-d'), step_qp_e: gv('step-qp-e'),
      // Estabilidade
      sht_avg_d: getAvg('sht', 'd'), sht_avg_e: getAvg('sht', 'e'),
      tht_avg_d: getAvg('tht', 'd'), tht_avg_e: getAvg('tht', 'e'),
      cot_avg_d: getAvg('cot', 'd'), cot_avg_e: getAvg('cot', 'e'),
      lunge_cm_d: gv('lunge-cm-d'), lunge_cm_e: gv('lunge-cm-e'),
      lunge_ang_d: gv('lunge-ang-d'), lunge_ang_e: gv('lunge-ang-e'),
    };

    const { error: eAval } = await supabase.from('avaliacoes').insert(aval);
    if (eAval) throw eAval;

    allPatients = [];
    toast('Avaliação salva com sucesso!');
    clearForm();
    showPage('pacientes');
  } catch (err) {
    console.error(err);
    toast('Erro ao salvar. Tente novamente.');
  } finally {
    loading(false);
    btn.disabled = false;
  }
}

// ─── RELATÓRIO ─────────────────────────────────────────────

async function loadRelatorioSelect() {
  const { data } = await supabase.from('pacientes').select('id, nome').order('nome');
  const sel = document.getElementById('rel-paciente');
  sel.innerHTML = '<option value="">Selecione um paciente...</option>' +
    (data || []).map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

function openRelatorio(id) {
  showPage('relatorio');
  setTimeout(async () => {
    await loadRelatorioSelect();
    document.getElementById('rel-paciente').value = id;
    loadRelatorio(id);
  }, 50);
}

function destroyRelCharts() {
  Object.values(relCharts).forEach(c => { try { c.destroy(); } catch (e) {} });
  relCharts = {};
}

async function loadRelatorio(pacId) {
  destroyRelCharts();
  const el = document.getElementById('relatorio-content');
  if (!pacId) { el.innerHTML = '<div class="empty-state"><i class="ti ti-chart-bar"></i><p>Selecione um paciente</p></div>'; return; }

  loading(true);
  const [{ data: pac }, { data: avals }] = await Promise.all([
    supabase.from('pacientes').select('*, profissional:profissional_id(nome)').eq('id', pacId).single(),
    supabase.from('avaliacoes').select('*, profissional:profissional_id(nome)').eq('paciente_id', pacId).order('data'),
  ]);
  loading(false);

  if (!pac || !avals?.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-chart-bar"></i><p>Nenhuma avaliação encontrada</p></div>'; return; }

  const first = avals[0], last = avals[avals.length - 1];
  const hasReav = avals.length > 1;

  function lsiVal(d, e) { return e > 0 ? (d / e * 100) : 0; }
  function lsiClass(v) { return v >= 90 ? 'badge-green' : v >= 75 ? 'badge-amber' : 'badge-red'; }
  function lsiLabel(v) { return v >= 90 ? 'Boa simetria' : v >= 75 ? 'Assimetria moderada' : 'Assimetria importante'; }
  function diff(a, b) {
    if (!a || !b) return '<span class="diff-neu">—</span>';
    const d = ((b - a) / a * 100);
    return `<span class="${d > 0 ? 'diff-pos' : d < 0 ? 'diff-neg' : 'diff-neu'}">${d > 0 ? '+' : ''}${d.toFixed(1)}%</span>`;
  }

  const html = `
  <div class="rel-header">
    <img src="public/logo.png" alt="Cefise Academy">
    <div>
      <h2>${pac.nome}</h2>
      <p>${calcIdade(pac.nasc)} anos · ${pac.peso || '—'}kg · ${pac.altura || '—'}m · Prof: ${pac.profissional?.nome || '—'}</p>
    </div>
  </div>
  ${hasReav ? `<div class="reav-banner"><i class="ti ti-arrows-right-left"></i><div>Comparativo disponível — <b>${avals.length}</b> avaliações · ${fmtDate(first.data)} → ${fmtDate(last.data)}</div></div>` : ''}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ti ti-barbell"></i> Força muscular</div>
      <div class="chart-wrap" style="height:240px"><canvas id="rc-forca" role="img" aria-label="Força muscular"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-run"></i> Hop Tests — LSI (%)</div>
      <div class="chart-wrap" style="height:240px"><canvas id="rc-hop" role="img" aria-label="Hop Tests LSI"></canvas></div>
    </div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="card-title"><i class="ti ti-arrows-left-right"></i> Simetria D × E — última avaliação</div>
    <div class="chart-wrap" style="height:260px"><canvas id="rc-sim" role="img" aria-label="Simetria membros"></canvas></div>
  </div>
  ${hasReav ? `
  <div class="card" style="margin-bottom:16px">
    <div class="card-title"><i class="ti ti-trending-up"></i> Evolução — antes × depois</div>
    <div class="grid-2">
      <table class="comp-table">
        <tr><th>Teste</th><th>Antes (${fmtDate(first.data)})</th><th>Depois (${fmtDate(last.data)})</th><th>Variação</th></tr>
        ${[['Nordic Hamstring', first.nordic, last.nordic],
           ['Squat D', first.squat_d, last.squat_d],
           ['Squat E', first.squat_e, last.squat_e],
           ['Bridge D', first.bridge_d, last.bridge_d],
           ['Bridge E', first.bridge_e, last.bridge_e],
           ['Copenhagen D', first.copenh_d, last.copenh_d],
           ['Core D', first.core_d, last.core_d],
           ['Single Hop D', first.sht_avg_d?.toFixed(1), last.sht_avg_d?.toFixed(1)],
           ['Triple Hop D', first.tht_avg_d?.toFixed(1), last.tht_avg_d?.toFixed(1)],
        ].map(([n,a,b]) => `<tr><td>${n}</td><td>${a||'—'}</td><td>${b||'—'}</td><td>${diff(a,b)}</td></tr>`).join('')}
      </table>
      <div class="chart-wrap" style="height:300px"><canvas id="rc-ev" role="img" aria-label="Evolução"></canvas></div>
    </div>
  </div>` : ''}
  <div class="card">
    <div class="card-title"><i class="ti ti-table"></i> LSI — Índice de simetria de membros</div>
    <table class="lsi-table">
      <tr><th>Teste</th><th>Direito</th><th>Esquerdo</th><th>LSI</th><th>Classificação</th></tr>
      ${[
        ['Single Hop', last.sht_avg_d, last.sht_avg_e],
        ['Triple Hop', last.tht_avg_d, last.tht_avg_e],
        ['Crossover Hop', last.cot_avg_d, last.cot_avg_e],
        ['Squat', last.squat_d, last.squat_e],
        ['Bridge', last.bridge_d, last.bridge_e],
        ['Core', last.core_d, last.core_e],
      ].map(([n, d, e]) => {
        const lv = lsiVal(d || 0, e || 0);
        return `<tr><td>${n}</td><td>${(d || 0).toFixed ? (d||0).toFixed(1) : d||'—'}</td><td>${(e || 0).toFixed ? (e||0).toFixed(1) : e||'—'}</td><td><b>${lv.toFixed(1)}%</b></td><td><span class="badge ${lsiClass(lv)}">${lsiLabel(lv)}</span></td></tr>`;
      }).join('')}
    </table>
  </div>`;

  el.innerHTML = html;
  setTimeout(() => buildRelCharts(first, last, avals, hasReav), 80);
}

function buildRelCharts(first, last, avals, hasReav) {
  const G = '#2d7d32', R = '#c62828', T = '#00695c', A = '#f57f17';

  // Força
  const fCanvas = document.getElementById('rc-forca');
  if (fCanvas) {
    const labels = ['Nordic', 'Squat D', 'Squat E', 'Bridge D', 'Bridge E', 'Copenh D'];
    const fFirst = [first.nordic, first.squat_d, first.squat_e, first.bridge_d, first.bridge_e, first.copenh_d];
    const fLast  = [last.nordic,  last.squat_d,  last.squat_e,  last.bridge_d,  last.bridge_e,  last.copenh_d];
    relCharts.forca = new Chart(fCanvas, {
      type: 'bar',
      data: { labels, datasets: hasReav
        ? [{ label: 'Antes', data: fFirst, backgroundColor: R + 'bb', borderColor: R, borderWidth: 1 },
           { label: 'Depois', data: fLast, backgroundColor: G + 'bb', borderColor: G, borderWidth: 1 }]
        : [{ label: 'Resultado', data: fFirst, backgroundColor: G + 'bb', borderColor: G, borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: hasReav, labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // Hop LSI
  const hCanvas = document.getElementById('rc-hop');
  if (hCanvas) {
    const hopLabels = ['Single Hop', 'Triple Hop', 'Crossover'];
    const lsiOf = (d, e) => e > 0 ? parseFloat((d / e * 100).toFixed(1)) : 0;
    relCharts.hop = new Chart(hCanvas, {
      type: 'radar',
      data: { labels: hopLabels, datasets: hasReav
        ? [{ label: 'Antes', data: [lsiOf(first.sht_avg_d, first.sht_avg_e), lsiOf(first.tht_avg_d, first.tht_avg_e), lsiOf(first.cot_avg_d, first.cot_avg_e)], borderColor: R, backgroundColor: R + '33', fill: true, tension: .3 },
           { label: 'Depois', data: [lsiOf(last.sht_avg_d, last.sht_avg_e), lsiOf(last.tht_avg_d, last.tht_avg_e), lsiOf(last.cot_avg_d, last.cot_avg_e)], borderColor: G, backgroundColor: G + '33', fill: true, tension: .3 }]
        : [{ label: 'LSI', data: [lsiOf(first.sht_avg_d, first.sht_avg_e), lsiOf(first.tht_avg_d, first.tht_avg_e), lsiOf(first.cot_avg_d, first.cot_avg_e)], borderColor: G, backgroundColor: G + '33', fill: true, tension: .3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 60, max: 105, ticks: { stepSize: 10, font: { size: 10 } } } }, plugins: { legend: { display: hasReav, labels: { font: { size: 11 }, boxWidth: 12 } } } }
    });
  }

  // Simetria
  const sCanvas = document.getElementById('rc-sim');
  if (sCanvas) {
    relCharts.sim = new Chart(sCanvas, {
      type: 'bar',
      data: {
        labels: ['Single Hop', 'Triple Hop', 'Crossover', 'Squat', 'Bridge', 'Core'],
        datasets: [
          { label: 'Direito', data: [last.sht_avg_d, last.tht_avg_d, last.cot_avg_d, last.squat_d, last.bridge_d, last.core_d], backgroundColor: G + 'bb', borderColor: G, borderWidth: 1 },
          { label: 'Esquerdo', data: [last.sht_avg_e, last.tht_avg_e, last.cot_avg_e, last.squat_e, last.bridge_e, last.core_e], backgroundColor: T + 'bb', borderColor: T, borderWidth: 1 },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // Evolução
  if (hasReav) {
    const eCanvas = document.getElementById('rc-ev');
    if (eCanvas) {
      relCharts.ev = new Chart(eCanvas, {
        type: 'bar',
        data: {
          labels: ['Nordic', 'Squat D', 'Squat E', 'Bridge D', 'Bridge E', 'Copenh D'],
          datasets: [
            { label: 'Antes', data: [first.nordic, first.squat_d, first.squat_e, first.bridge_d, first.bridge_e, first.copenh_d], backgroundColor: R + '99', borderColor: R, borderWidth: 1 },
            { label: 'Depois', data: [last.nordic, last.squat_d, last.squat_e, last.bridge_d, last.bridge_e, last.copenh_d], backgroundColor: G + '99', borderColor: G, borderWidth: 1 },
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: true } } }
      });
    }
  }
}

// ─── GERAR PDF ─────────────────────────────────────────────

async function gerarPDF() {
  const pacId = document.getElementById('rel-paciente').value;
  if (!pacId) { toast('Selecione um paciente'); return; }
  loading(true);
  const [{ data: pac }, { data: avals }] = await Promise.all([
    supabase.from('pacientes').select('*, profissional:profissional_id(nome)').eq('id', pacId).single(),
    supabase.from('avaliacoes').select('*').eq('paciente_id', pacId).order('data'),
  ]);
  loading(false);
  if (!pac || !avals?.length) { toast('Sem dados para gerar PDF'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const last = avals[avals.length - 1], first = avals[0], hasReav = avals.length > 1;
  const W = 210, mg = 18;
  let y = 0;

  // Header verde
  doc.setFillColor(30, 107, 40);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text('Cefise Academy', mg, 13);
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.text('Sistema de Avaliação Clínica', mg, 20);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, mg, 27);
  y = 40;

  doc.setTextColor(30, 107, 40);
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text(pac.nome, mg, y); y += 7;
  doc.setTextColor(80, 80, 80); doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text(`Nascimento: ${fmtDate(pac.nasc)} · Estatura: ${pac.altura || '—'}m · Peso: ${pac.peso || '—'}kg`, mg, y); y += 6;
  doc.text(`Profissional: ${pac.profissional?.nome || '—'} · Data: ${fmtDate(last.data)} · Tipo: ${last.tipo === 'avaliacao' ? 'Avaliação inicial' : 'Reavaliação'}`, mg, y); y += 10;

  function section(title, color = [30, 107, 40]) {
    doc.setFillColor(...color, 0.1);
    doc.setFillColor(232, 245, 233);
    doc.rect(mg - 2, y - 5, W - mg * 2 + 4, 8, 'F');
    doc.setTextColor(...color);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(title, mg, y); y += 9;
    doc.setTextColor(50, 50, 50); doc.setFontSize(10); doc.setFont(undefined, 'normal');
  }

  section('Testes de Força');
  const forceRows = [
    ['Nordic Hamstring (bilateral)', last.nordic],
    ['One-sided Squat — Direito', last.squat_d], ['One-sided Squat — Esquerdo', last.squat_e],
    ['Single Leg Bridge — Direito', last.bridge_d], ['Single Leg Bridge — Esquerdo', last.bridge_e],
    ['Copenhagen — Direito', last.copenh_d], ['Copenhagen — Esquerdo', last.copenh_e],
    ['Core — Direito (s)', last.core_d], ['Core — Esquerdo (s)', last.core_e],
  ];
  forceRows.forEach(([lbl, val]) => { doc.text(`${lbl}:`, mg, y); doc.text(String(val || 0), 145, y); y += 5.5; });
  y += 4;

  section('Hop Tests — LSI');
  [['Single Hop', last.sht_avg_d, last.sht_avg_e], ['Triple Hop', last.tht_avg_d, last.tht_avg_e], ['Crossover Hop', last.cot_avg_d, last.cot_avg_e]].forEach(([n, d, e]) => {
    const lsi = e > 0 ? (d / e * 100).toFixed(1) : '—';
    doc.text(`${n}: D=${(d || 0).toFixed(1)}cm / E=${(e || 0).toFixed(1)}cm / LSI=${lsi}%`, mg, y); y += 5.5;
  }); y += 4;

  section('Lunge Test');
  doc.text(`Direito: ${last.lunge_cm_d || 0}cm / ${last.lunge_ang_d || 0}°   Esquerdo: ${last.lunge_cm_e || 0}cm / ${last.lunge_ang_e || 0}°`, mg, y); y += 10;

  if (hasReav) {
    if (y > 220) { doc.addPage(); y = 20; }
    section('Comparativo — Antes × Depois', [30, 107, 40]);
    const rows = [['Nordic', first.nordic, last.nordic], ['Squat D', first.squat_d, last.squat_d], ['Squat E', first.squat_e, last.squat_e], ['Bridge D', first.bridge_d, last.bridge_d], ['Bridge E', first.bridge_e, last.bridge_e], ['Core D', first.core_d, last.core_d], ['Single Hop D', first.sht_avg_d?.toFixed(1), last.sht_avg_d?.toFixed(1)]];
    rows.forEach(([n, a, b]) => {
      const pct = a ? (((b - a) / a) * 100).toFixed(1) : 0;
      const sign = pct > 0 ? '+' : '';
      doc.text(`${n}: ${a || 0} → ${b || 0}  (${sign}${pct}%)`, mg, y); y += 5.5;
    });
  }

  doc.setFontSize(8); doc.setTextColor(160, 160, 150);
  doc.text('Cefise Academy — Sistema de Avaliação Clínica · Documento gerado automaticamente', mg, 287);

  doc.save(`Avaliacao_${pac.nome.replace(/\s+/g, '_')}_${last.data}.pdf`);
  toast('PDF gerado!');
}

// ─── PROFISSIONAIS (admin) ─────────────────────────────────

async function renderProfissionais() {
  const { data } = await supabase.from('profissionais').select('*, avaliacoes(count)').order('nome');
  const el = document.getElementById('prof-list');
  el.innerHTML = (data || []).map(p => `
    <div class="patient-item" style="cursor:default">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome} ${p.role === 'admin' ? '<span class="badge badge-amber" style="margin-left:6px">Admin</span>' : ''}</div>
        <div class="pat-meta">${p.especialidade || '—'} · ${p.crf || '—'}</div>
        <div class="pat-meta">${p.avaliacoes?.[0]?.count || 0} avaliação(ões)</div>
      </div>
    </div>`).join('');
}

function showModalProf() {
  document.getElementById('modal-prof').style.display = 'flex';
  showErr('modal-prof-error', '');
}

async function saveProfissional() {
  const nome  = document.getElementById('np-nome').value.trim();
  const esp   = document.getElementById('np-esp').value.trim() || 'Fisioterapeuta';
  const crf   = document.getElementById('np-crf').value.trim();
  const email = document.getElementById('np-email').value.trim();
  const senha = document.getElementById('np-senha').value;
  const role  = document.getElementById('np-role').value;
  if (!nome || !email || !senha) { showErr('modal-prof-error', 'Preencha nome, e-mail e senha.'); return; }
  if (senha.length < 6) { showErr('modal-prof-error', 'Senha deve ter ao menos 6 caracteres.'); return; }

  loading(true);
  // Criar usuário via Supabase Auth Admin (requer service_role — feito via Edge Function ou diretamente aqui via signUp)
  // Para simplicidade: usamos signUp e depois inserimos o perfil
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password: senha });
  if (authErr) { loading(false); showErr('modal-prof-error', authErr.message); return; }

  const { error: profErr } = await supabase.from('profissionais').insert({
    user_id: authData.user.id, nome, especialidade: esp, crf, role,
  });
  loading(false);
  if (profErr) { showErr('modal-prof-error', profErr.message); return; }

  closeModal('modal-prof');
  ['np-nome', 'np-esp', 'np-crf', 'np-email', 'np-senha'].forEach(id => sv(id, ''));
  toast('Profissional criado!');
  renderProfissionais();
}
