// ============================================================
//  CEFISE ACADEMY — Sistema de Avaliação Clínica
//  Versão com regiões corporais e questionários integrados
// ============================================================

function getDB() {
  try {
    const def = {
      pacientes: [],
      avaliacoes: [],
      profissionais: [
        {id:1,nome:'Dr. Profissional 1',especialidade:'Fisioterapeuta',crf:'CRF-SC 12345'},
        {id:2,nome:'Dr. Profissional 2',especialidade:'Fisioterapeuta',crf:'CRF-SC 23456'},
        {id:3,nome:'Dr. Profissional 3',especialidade:'Fisioterapeuta',crf:'CRF-SC 34567'}
      ]
    };
    return JSON.parse(localStorage.getItem('cefise_db') || JSON.stringify(def));
  } catch(e) {
    return {pacientes:[],avaliacoes:[],profissionais:[{id:1,nome:'Administrador',especialidade:'Fisioterapeuta',crf:''}]};
  }
}
function saveDB(db) { try { localStorage.setItem('cefise_db', JSON.stringify(db)); } catch(e) {} }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1; }

let currentProfId = 1;
let relCharts = {};
let dashChart = null;
let currentRegioes = []; // suporte a múltiplas regiões

// ─── REGIÕES CORPORAIS ─────────────────────────────────────

const REGIOES = {
  joelho: {
    label:'Joelho', icon:'ti-run', color:'#185FA5',
    questionarios:['koos','ikdc','acl_rsi'],
    testes_especiais:['lachman','pivot_shift','mcmurray','apley','valgus_stress','varus_stress']
  },
  quadril: {
    label:'Quadril', icon:'ti-man', color:'#2d7d32',
    questionarios:['hoos'],
    testes_especiais:['faber','fadir','trendelenburg','thomas','ober']
  },
  coluna: {
    label:'Coluna', icon:'ti-activity', color:'#6a1b9a',
    questionarios:['odi','ndi'],
    testes_especiais:['lasegue','slump','bragard','schober','adams']
  },
  ombro: {
    label:'Ombro', icon:'ti-angle', color:'#e65100',
    questionarios:['dash','wosi'],
    testes_especiais:['neer','hawkins','jobe','apprehension','obriens','speeds']
  },
  tornozelo: {
    label:'Tornozelo', icon:'ti-flip-vertical', color:'#00695c',
    questionarios:['faam','visa_a'],
    testes_especiais:['anterior_drawer','talar_tilt','thompson','squeeze']
  },
  cotovelo: {
    label:'Cotovelo', icon:'ti-arrows-right-left', color:'#c62828',
    questionarios:['dash'],
    testes_especiais:['cozen','mills','valgus_cot','tinel_cot']
  },
  punho: {
    label:'Punho / Mão', icon:'ti-hand-stop', color:'#854F0B',
    questionarios:['dash'],
    testes_especiais:['phalen','tinel_punho','finkelstein','watson']
  },
  muscular: {
    label:'Lesões Musculares', icon:'ti-barbell', color:'#37474f',
    questionarios:[],
    testes_especiais:['palpacao','bamic','extensibilidade','thomas_muscular']
  }
};

const TESTE_NOMES = {
  lachman:'Lachman', pivot_shift:'Pivot Shift', mcmurray:'McMurray', apley:'Apley',
  valgus_stress:'Estresse em Valgo', varus_stress:'Estresse em Varo',
  faber:'FABER', fadir:'FADIR', trendelenburg:'Trendelenburg', thomas:'Thomas', ober:'Ober',
  lasegue:'Lasègue', slump:'Slump', bragard:'Bragard', schober:'Schober', adams:'Adams',
  neer:'Neer', hawkins:'Hawkins-Kennedy', jobe:'Jobe (arco doloroso)',
  apprehension:'Apreensão', obriens:"O'Brien", speeds:"Speed's",
  anterior_drawer:'Gaveta anterior', talar_tilt:'Inclinação talar', thompson:'Thompson', squeeze:'Squeeze',
  cozen:'Cozen', mills:'Mills', valgus_cot:'Estresse em Valgo (cotovelo)', tinel_cot:'Tinel (cotovelo)',
  phalen:'Phalen', tinel_punho:'Tinel (punho)', finkelstein:'Finkelstein', watson:'Watson',
  palpacao:'Palpação muscular', bamic:'Classificação BAMIC', extensibilidade:'Extensibilidade', thomas_muscular:'Thomas (muscular)'
};

// ─── QUESTIONÁRIOS ─────────────────────────────────────────

const QUESTIONARIOS = {
  koos: {
    nome:'KOOS — Knee injury and Osteoarthritis Outcome Score', abrev:'KOOS',
    escala:['Nunca/Nenhuma','Raramente/Pouca','Às vezes/Moderada','Frequentemente/Intensa','Sempre/Extrema'],
    grupos:[
      {grupo:'Sintomas',perguntas:['Inchaço no joelho','Rangido ou estalos','Travamento ao movimentar','Esticar completamente o joelho','Dobrar completamente o joelho']},
      {grupo:'Rigidez',perguntas:['Rigidez ao acordar','Rigidez após repouso']},
      {grupo:'Dor',perguntas:['Frequência de dor','Dor ao girar/torcer','Dor ao esticar','Dor ao dobrar','Dor ao caminhar','Dor ao subir/descer escadas','Dor à noite','Dor ao ficar sentado','Dor ao ficar em pé']},
      {grupo:'Função diária',perguntas:['Descer escadas','Subir escadas','Levantar da cadeira','Ficar em pé','Dobrar para pegar objeto']},
      {grupo:'Qualidade de vida',perguntas:['Frequência de pensamento no joelho','Modificação do estilo de vida','Falta de confiança no joelho','Dificuldade geral com o joelho']}
    ]
  },
  ikdc: {
    nome:'IKDC — International Knee Documentation Committee', abrev:'IKDC',
    escala:['Sem limitação','Limitação leve','Limitação moderada','Limitação grave','Incapaz'],
    grupos:[
      {grupo:'Sintomas',perguntas:['Nível de atividade sem dor significativa','Frequência de dor','Intensidade da dor','Rigidez do joelho','Frequência de inchaço','Travamento no último mês','Nível de atividade sem fraqueza','Nível de atividade sem limitação']},
      {grupo:'Esporte',perguntas:['Nível mais alto de atividade regular','Frequência de participação em esportes']},
      {grupo:'Função',perguntas:['Avaliação da função atual do joelho','Avaliação da função normal antes da lesão']}
    ]
  },
  acl_rsi: {
    nome:'ACL-RSI — Return to Sport after ACL Reconstruction', abrev:'ACL-RSI',
    escala:['Concordo totalmente','Concordo muito','Concordo','Discordo','Discordo totalmente'],
    grupos:[
      {grupo:'Emoções',perguntas:['Medo de machucar novamente','Frustração com cautela no esporte','Dificuldade de controlar ansiedade','Nervosismo para voltar ao esporte','Confiança para praticar esporte']},
      {grupo:'Confiança',perguntas:['Risco de machucar ao retornar','Medo de se machucar ao retornar','Joelho aguenta o esporte']},
      {grupo:'Retorno',perguntas:['Bom desempenho ao retornar','Comprometimento com o retorno','Concentração no retorno','Metas estabelecidas para retorno']}
    ]
  },
  hoos: {
    nome:'HOOS — Hip disability and Osteoarthritis Outcome Score', abrev:'HOOS',
    escala:['Nunca/Nenhuma','Raramente/Pouca','Às vezes/Moderada','Frequentemente/Intensa','Sempre/Extrema'],
    grupos:[
      {grupo:'Sintomas',perguntas:['Frequência de dor no quadril','Travamento no quadril','Esticar completamente','Dobrar completamente']},
      {grupo:'Rigidez',perguntas:['Rigidez ao acordar','Rigidez após repouso']},
      {grupo:'Dor',perguntas:['Dor ao torcer/girar','Dor ao esticar','Dor ao caminhar','Dor ao subir/descer escadas','Dor à noite','Dor ao ficar sentado','Dor ao ficar em pé']},
      {grupo:'Qualidade de vida',perguntas:['Frequência de pensamento no quadril','Modificação do estilo de vida','Falta de confiança no quadril']}
    ]
  },
  odi: {
    nome:'ODI — Oswestry Disability Index', abrev:'ODI',
    escala:['Sem dificuldade','Dificuldade leve','Dificuldade moderada','Dificuldade grave','Incapacidade total'],
    grupos:[
      {grupo:'Funcional',perguntas:['Intensidade da dor lombar','Cuidados pessoais','Levantar objetos pesados','Distância que caminha','Tempo sentado','Tempo em pé','Qualidade do sono','Vida social','Capacidade de viajar','Capacidade de trabalhar']}
    ]
  },
  ndi: {
    nome:'NDI — Neck Disability Index', abrev:'NDI',
    escala:['Sem dificuldade','Dificuldade leve','Dificuldade moderada','Dificuldade grave','Incapacidade total'],
    grupos:[
      {grupo:'Funcional',perguntas:['Intensidade da dor cervical','Cuidados pessoais','Levantar objetos','Leitura','Dores de cabeça','Concentração','Capacidade de trabalhar','Dirigir','Qualidade do sono','Atividades de lazer']}
    ]
  },
  dash: {
    nome:'DASH — Disabilities of the Arm, Shoulder and Hand', abrev:'DASH',
    escala:['Sem dificuldade','Dificuldade leve','Dificuldade moderada','Dificuldade grave','Incapaz'],
    grupos:[
      {grupo:'Atividades',perguntas:['Abrir frasco','Escrever','Girar chave','Preparar refeição','Empurrar porta pesada','Objeto acima da cabeça','Tarefas domésticas pesadas','Trabalho no jardim','Fazer uma cama','Carregar sacola','Carregar objeto pesado','Mudar lâmpada','Lavar/secar cabelo','Lavar as costas','Vestir blusa']},
      {grupo:'Sintomas',perguntas:['Dor no braço/ombro/mão','Dor em atividades','Formigamento','Fraqueza','Rigidez']},
      {grupo:'Social',perguntas:['Dificuldade em dormir','Sentiu-se menos capaz']}
    ]
  },
  faam: {
    nome:'FAAM — Foot and Ankle Ability Measure', abrev:'FAAM',
    escala:['Sem dificuldade','Dificuldade leve','Dificuldade moderada','Dificuldade grave','Incapaz'],
    grupos:[
      {grupo:'Atividades diárias',perguntas:['Ficar em pé','Caminhar em superfície plana','Caminhar sem sapatos','Subir morros','Descer morros','Subir escadas','Descer escadas','Caminhar em superfície irregular','Entrar/sair do carro','Ficar em pé 15 min','Ficar em pé 1 hora','Caminhar inicialmente','Caminhar 10 min','Caminhar 15 min ou mais','Tarefas domésticas']},
      {grupo:'Esporte',perguntas:['Correr','Pular','Pousar ao pular','Iniciar/parar rapidamente','Cortar laterais','Atividades de baixo impacto','Praticar atividade normalmente','Atividade normal o dia todo']}
    ]
  },
  visa_a: {
    nome:'VISA-A — Victorian Institute of Sport Assessment (Aquileu)', abrev:'VISA-A',
    escala:['Sem dor (0)','Dor leve (1-3)','Dor moderada (4-6)','Dor intensa (7-10)'],
    grupos:[
      {grupo:'Dor e função',perguntas:['Dor ao ficar em pé 10 min','Dor ao caminhar em superfície plana','Dor ao subir escadas','Dor ao correr','Elevação plantar unipodal sem dor','Participação em esporte/atividade']}
    ]
  },
  wosi: {
    nome:'WOSI — Western Ontario Shoulder Instability Index', abrev:'WOSI',
    escala:['Sem dificuldade','Dificuldade leve','Dificuldade moderada','Dificuldade grave','Dificuldade máxima'],
    grupos:[
      {grupo:'Sintomas físicos',perguntas:['Dor em atividades acima da cabeça','Dor ao carregar objetos pesados','Sensação de clique','Fraqueza no ombro','Rigidez']},
      {grupo:'Esporte/trabalho',perguntas:['Proteger o ombro em esportes','Dificuldade em atividades recreativas','Levantar braço no trabalho','Evitar movimentos no trabalho']},
      {grupo:'Estilo de vida',perguntas:['Medo de luxação','Dificuldade em dormir']}
    ]
  }
};

// ─── UTILITÁRIOS ──────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  if(!el) return;
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
  const d=new Date(nasc),now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate())) age--;
  return age;
}
function initials(nome) { return (nome||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function fmtDate(d) { if(!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }

// ─── INIT ─────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  setupRadioToggles();
  const dataEl = document.getElementById('f-data');
  if(dataEl) dataEl.value = new Date().toISOString().split('T')[0];
  const db = getDB();
  currentProfId = db.profissionais[0]?.id || 1;
  updateProfSelects();
  const loginEl = document.getElementById('screen-login');
  const appEl = document.getElementById('screen-app');
  if(loginEl) loginEl.style.display = 'none';
  if(appEl) appEl.style.display = 'flex';
  updateSidebarUser();
  showPage('dashboard');
});

function updateSidebarUser() {
  const db = getDB();
  const p = db.profissionais.find(x=>x.id===currentProfId);
  const nameEl = document.getElementById('sidebar-name');
  const roleEl = document.getElementById('sidebar-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if(nameEl) nameEl.textContent = p?.nome || 'Profissional';
  if(roleEl) roleEl.textContent = p?.especialidade || 'Fisioterapeuta';
  if(avatarEl) avatarEl.textContent = initials(p?.nome||'P');
}

function doLogout() { toast('Modo local — sem necessidade de logout'); }

function updateProfSelects() {
  const db = getDB();
  const opts = db.profissionais.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
  const ap = document.getElementById('active-prof');
  if(ap) { ap.innerHTML = opts; ap.value = currentProfId; }
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const page = document.getElementById('page-'+name);
  if(page) page.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if(btn) btn.classList.add('active');
  const titles={dashboard:'Dashboard',pacientes:'Pacientes',avaliacao:'Nova avaliação',relatorio:'Gráficos & Relatório PDF',profissionais:'Profissionais'};
  const titleEl = document.getElementById('page-title');
  if(titleEl) titleEl.textContent = titles[name]||name;
  if(name==='dashboard') renderDashboard();
  if(name==='pacientes') renderPatients();
  if(name==='relatorio') loadRelatorioSelect();
  if(name==='profissionais') renderProfissionais();
  if(name==='avaliacao') renderRegiaoSelector();
}

function showTab(idx) {
  document.querySelectorAll('.tab-pane').forEach((p,i)=>p.classList.toggle('active',i===idx));
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
}

function closeModal(id) {
  const el = document.getElementById(id);
  if(el) el.style.display='none';
}

// ─── SELEÇÃO DE REGIÃO ────────────────────────────────────

function renderRegiaoSelector() {
  const container = document.getElementById('regiao-selector');
  if(!container) return;
  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:15px;font-weight:500;margin-bottom:4px">Selecione as regiões a serem avaliadas</div>
      <div style="font-size:13px;color:#6b7280">Pode selecionar múltiplas regiões — clique para ativar/desativar</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px">
      ${Object.entries(REGIOES).map(([key,r])=>{
        const sel = currentRegioes.includes(key);
        return `<button onclick="selecionarRegiao('${key}')"
          style="padding:14px 10px;border-radius:10px;border:2px solid ${sel?r.color:'#e5e7eb'};
          background:${sel?r.color+'18':'#fff'};cursor:pointer;text-align:center;transition:all .15s;
          color:${sel?r.color:'#374151'};position:relative">
          ${sel?`<span style="position:absolute;top:6px;right:8px;background:${r.color};color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center">✓</span>`:''}
          <i class="ti ${r.icon}" style="font-size:22px;display:block;margin-bottom:5px;color:${sel?r.color:'#6b7280'}"></i>
          <span style="font-size:12px;font-weight:${sel?'600':'500'}">${r.label}</span>
        </button>`;
      }).join('')}
    </div>
    ${currentRegioes.length ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:13px;color:#166534;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <i class="ti ti-check-circle" style="font-size:18px;flex-shrink:0"></i>
      <span>Regiões selecionadas: <b>${currentRegioes.map(k=>REGIOES[k].label).join(', ')}</b></span>
    </div>` : `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400e;display:flex;align-items:center;gap:8px">
      <i class="ti ti-info-circle" style="font-size:18px"></i>
      <span>Selecione ao menos uma região para carregar os questionários e testes</span>
    </div>`}`;
}

function selecionarRegiao(key) {
  const idx = currentRegioes.indexOf(key);
  if(idx >= 0) { currentRegioes.splice(idx, 1); }
  else { currentRegioes.push(key); }
  renderRegiaoSelector();
  renderQuestionariosTab();
  renderTestesEspeciaisTab();
  const msg = currentRegioes.length ? currentRegioes.map(k=>REGIOES[k].label).join(' + ') : 'Nenhuma região';
  toast('Regiões: ' + msg);
}

function renderQuestionariosTab() {
  const container = document.getElementById('questionarios-container');
  if(!container) return;
  if(!currentRegioes.length) {
    container.innerHTML = '<div class="empty-state" style="padding:30px"><i class="ti ti-clipboard-list"></i><p>Selecione uma região corporal na aba "Identificação"</p></div>';
    return;
  }
  const qIds = currentRegioes.flatMap(k=>REGIOES[k].questionarios).filter((v,i,a)=>a.indexOf(v)===i);
  if(!qIds.length) {
    container.innerHTML = '<div class="empty-state" style="padding:20px"><p>Nenhum questionário específico para esta região</p></div>';
    return;
  }
  container.innerHTML = qIds.map(qId => {
    const q = QUESTIONARIOS[qId];
    if(!q) return '';
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-title" style="font-size:14px;font-weight:600;margin-bottom:14px">
        <i class="ti ti-clipboard-check"></i> ${q.nome}
      </div>
      ${q.grupos.map((grupo,gi) => `
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f0f0e8">${grupo.grupo}</div>
          ${grupo.perguntas.map((perg,pi) => `
            <div style="margin-bottom:6px;display:flex;align-items:center;gap:10px;padding:6px 8px;background:#f9fafb;border-radius:6px">
              <div style="flex:1;font-size:13px;color:#374151">${perg}</div>
              <select id="q_${qId}_${gi}_${pi}" style="width:180px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">
                <option value="">— selecione —</option>
                ${q.escala.map((op,oi)=>`<option value="${oi}">${op}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>`).join('')}
      <div style="background:#f0fdf4;border-radius:6px;padding:8px 12px;font-size:12px;color:#166534;margin-top:8px;display:flex;align-items:center;gap:8px">
        <b>Pontuação:</b> <span id="score_${qId}">—</span>
        <button onclick="calcularScore('${qId}')" style="padding:3px 10px;border:1px solid #86efac;background:#dcfce7;border-radius:4px;font-size:11px;cursor:pointer;color:#166534">Calcular</button>
      </div>
    </div>`;
  }).join('');
}

function calcularScore(qId) {
  const q = QUESTIONARIOS[qId];
  if(!q) return;
  let total = 0, count = 0, totalPossivel = 0;
  q.grupos.forEach((grupo,gi) => {
    grupo.perguntas.forEach((perg,pi) => {
      const el = document.getElementById(`q_${qId}_${gi}_${pi}`);
      if(el && el.value !== '') { total += parseInt(el.value); count++; }
      totalPossivel += q.escala.length - 1;
    });
  });
  const scoreEl = document.getElementById(`score_${qId}`);
  if(scoreEl) {
    if(count === 0) { scoreEl.textContent = 'Nenhuma resposta'; return; }
    const pct = (total / totalPossivel * 100).toFixed(1);
    scoreEl.textContent = `${total} pts (${pct}% comprometimento) — ${count} respostas`;
  }
}

function getScores() {
  if(!currentRegioes.length) return {};
  const scores = {};
  currentRegioes.flatMap(k=>REGIOES[k].questionarios).filter((v,i,a)=>a.indexOf(v)===i).forEach(qId => {
    const q = QUESTIONARIOS[qId];
    if(!q) return;
    let total = 0, count = 0, totalPossivel = 0;
    q.grupos.forEach((grupo,gi) => {
      grupo.perguntas.forEach((perg,pi) => {
        const el = document.getElementById(`q_${qId}_${gi}_${pi}`);
        if(el && el.value !== '') { total += parseInt(el.value); count++; }
        totalPossivel += q.escala.length - 1;
      });
    });
    if(count > 0) scores[qId] = { total, count, pct: (total/totalPossivel*100).toFixed(1), abrev: q.abrev };
  });
  return scores;
}

function renderTestesEspeciaisTab() {
  const container = document.getElementById('testes-especiais-container');
  if(!container) return;
  if(!currentRegioes.length) {
    container.innerHTML = '<div class="empty-state" style="padding:30px"><i class="ti ti-test-pipe"></i><p>Selecione uma região corporal na aba "Identificação"</p></div>';
    return;
  }
  const testes = currentRegioes.flatMap(k=>REGIOES[k].testes_especiais).filter((v,i,a)=>a.indexOf(v)===i);
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${testes.map(t=>`
        <div style="padding:10px 12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
          <div style="font-size:13px;font-weight:500;margin-bottom:7px;color:#374151">${TESTE_NOMES[t]||t}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px">
            <label style="font-size:11px;color:#6b7280;width:20px">Dir</label>
            <select id="te_${t}_d" style="flex:1;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">
              <option value="">—</option>
              <option value="Positivo">Positivo</option>
              <option value="Negativo">Negativo</option>
              <option value="N/A">N/A</option>
            </select>
            <label style="font-size:11px;color:#6b7280;width:20px">Esq</label>
            <select id="te_${t}_e" style="flex:1;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">
              <option value="">—</option>
              <option value="Positivo">Positivo</option>
              <option value="Negativo">Negativo</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
          <input type="text" id="te_${t}_obs" placeholder="Observação..."
            style="width:100%;padding:4px 6px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;box-sizing:border-box">
        </div>`).join('')}
    </div>`;
}

function getTestesEspeciais() {
  if(!currentRegioes.length) return {};
  const result = {};
  currentRegioes.flatMap(k=>REGIOES[k].testes_especiais).filter((v,i,a)=>a.indexOf(v)===i).forEach(t => {
    const d = document.getElementById(`te_${t}_d`);
    const e = document.getElementById(`te_${t}_e`);
    const obs = document.getElementById(`te_${t}_obs`);
    if(d?.value||e?.value) result[t] = { nome: TESTE_NOMES[t]||t, d:d?.value||'', e:e?.value||'', obs:obs?.value||'' };
  });
  return result;
}

// ─── DASHBOARD ────────────────────────────────────────────

function renderDashboard() {
  const db = getDB();
  const ids = {'st-pacientes':db.pacientes.length,'st-avals':db.avaliacoes.filter(a=>a.tipo==='avaliacao').length,'st-reavals':db.avaliacoes.filter(a=>a.tipo==='reavaliacao').length,'st-profs':db.profissionais.length};
  Object.entries(ids).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent=val; });
  const recEl = document.getElementById('dash-recent');
  if(recEl) {
    const recent = db.pacientes.slice(-5).reverse();
    recEl.innerHTML = recent.length ? recent.map(p=>`
      <div class="patient-item" onclick="openRelatorio(${p.id})">
        <div class="pat-avatar">${initials(p.nome)}</div>
        <div class="pat-info">
          <div class="pat-name">${p.nome}</div>
          <div class="pat-meta">${calcIdade(p.nasc)} anos · ${p.regiao_label||'—'}</div>
        </div>
      </div>`).join('') : '<div class="empty-state" style="padding:20px"><i class="ti ti-users"></i><p>Nenhum paciente ainda</p></div>';
  }
  if(dashChart) { try{dashChart.destroy();}catch(e){} }
  const canvas = document.getElementById('chart-dash-prof');
  if(canvas) {
    const labels = db.profissionais.map(p=>p.nome.split(' ').slice(0,2).join(' '));
    const vals = db.profissionais.map(p=>db.avaliacoes.filter(a=>a.profissional_id===p.id).length);
    const colors=['#2d7d32','#00695c','#1565c0','#6a1b9a','#c62828','#e65100','#37474f'];
    if(vals.some(v=>v>0)) {
      dashChart = new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:colors.slice(0,labels.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}}}});
    }
  }
}

// ─── PACIENTES ────────────────────────────────────────────

function renderPatients(filter='') {
  const db = getDB();
  const list = filter ? db.pacientes.filter(p=>p.nome.toLowerCase().includes(filter.toLowerCase())) : db.pacientes;
  const el = document.getElementById('patient-list');
  if(!el) return;
  el.innerHTML = list.length ? list.map(p=>{
    const avals = db.avaliacoes.filter(a=>a.paciente_id===p.id);
    const prof = db.profissionais.find(x=>x.id===p.profissional_id);
    const regBadge = p.regiao_label ? `<span class="badge badge-green">${p.regiao_label}</span> ` : '';
    const tags = avals.map(a=>`<span class="badge ${a.tipo==='avaliacao'?'badge-green':'badge-teal'}">${a.tipo==='avaliacao'?'Avaliação':'Reavaliação'} ${fmtDate(a.data)}</span>`).join('');
    return `<div class="patient-item">
      <div class="pat-avatar">${initials(p.nome)}</div>
      <div class="pat-info">
        <div class="pat-name">${p.nome}</div>
        <div class="pat-meta">${calcIdade(p.nasc)} anos · ${p.peso||'—'}kg · ${p.altura||'—'}m · ${prof?.nome||'—'}</div>
        <div class="pat-tags">${regBadge}${tags}</div>
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
  const tipoEl = document.getElementById('f-tipo');
  const dataEl = document.getElementById('f-data');
  if(tipoEl) tipoEl.value='reavaliacao';
  if(dataEl) dataEl.value=new Date().toISOString().split('T')[0];
  if(p.regiao) currentRegioes = Array.isArray(p.regiao) ? p.regiao : [p.regiao];
  showPage('avaliacao'); showTab(0);
  toast('Modo reavaliação — '+p.nome.split(' ')[0]);
}

// ─── AVALIAÇÃO ────────────────────────────────────────────

function setupRadioToggles() {
  [['cirurgia','det-cirurgia'],['hdp','det-hdp'],['hda','det-hda'],['dor','det-dor']].forEach(([name,detId])=>{
    document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
      r.addEventListener('change',()=>{ const el=document.getElementById(detId); if(el) el.style.display=r.value==='sim'?'block':'none'; });
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
  const tipoEl=document.getElementById('f-tipo'); if(tipoEl) tipoEl.value='avaliacao';
  const dataEl=document.getElementById('f-data'); if(dataEl) dataEl.value=new Date().toISOString().split('T')[0];
  ['cirurgia','hdp','hda','dor'].forEach(n=>{ const r=document.querySelector(`input[name="${n}"]`); if(r) r.checked=true; });
  ['det-cirurgia','det-hdp','det-hda','det-dor'].forEach(id=>{sv(id,'');const el=document.getElementById(id);if(el)el.style.display='none';});
  ['nordic','squat-d','squat-e','bridge-d','bridge-e','copenh-d','copenh-e','core-d','core-e',
   'step-vd-d','step-vd-e','step-qp-d','step-qp-e','gonio-ri-d','gonio-ri-e','gonio-re-d','gonio-re-e',
   'lunge-cm-d','lunge-cm-e','lunge-ang-d','lunge-ang-e'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['sht','tht','cot'].forEach(p=>['d','e'].forEach(s=>{
    [1,2,3].forEach(i=>{const el=document.getElementById(`${p}${i}-${s}`);if(el)el.value='';});
    const avg=document.getElementById(`${p}-avg-${s}`);if(avg)avg.textContent='—';
  }));
  currentRegioes=[];
  showTab(0);
  renderRegiaoSelector();
}

function salvarAvaliacao() {
  const nomeEl = document.getElementById('f-nome');
  const nome = nomeEl?.value.trim();
  if(!nome) { toast('Informe o nome do paciente'); showTab(0); return; }
  const db = getDB();
  let pac = db.pacientes.find(p=>p.nome.toLowerCase()===nome.toLowerCase());
  if(!pac) {
    pac = {
      id:nextId(db.pacientes), nome,
      nasc:document.getElementById('f-nasc')?.value||null,
      altura:parseFloat(document.getElementById('f-altura')?.value)||null,
      peso:parseFloat(document.getElementById('f-peso')?.value)||null,
      contato:document.getElementById('f-contato')?.value||null,
      profissional_id:currentProfId,
      regiao: currentRegioes.length?currentRegioes:null,
      regiao_label: currentRegioes.length ? currentRegioes.map(k=>REGIOES[k].label).join(', ') : null,
      created_at:new Date().toISOString()
    };
    db.pacientes.push(pac);
  }
  const aval = {
    id:nextId(db.avaliacoes), paciente_id:pac.id, profissional_id:currentProfId,
    data:document.getElementById('f-data')?.value||new Date().toISOString().split('T')[0],
    tipo:document.getElementById('f-tipo')?.value||'avaliacao',
    regiao:currentRegioes.length?currentRegioes:null, regiao_label:currentRegioes.length?currentRegioes.map(k=>REGIOES[k].label).join(', '):null,
    cirurgia:getRadio('cirurgia'), cirurgia_detalhe:document.getElementById('det-cirurgia')?.value||'',
    hdp:getRadio('hdp'), hdp_detalhe:document.getElementById('det-hdp')?.value||'',
    hda:getRadio('hda'), hda_detalhe:document.getElementById('det-hda')?.value||'',
    dor:getRadio('dor'), dor_detalhe:document.getElementById('det-dor')?.value||'',
    scores:getScores(), testesEspeciais:getTestesEspeciais(),
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
    gonio_ri_d:gv('gonio-ri-d'), gonio_ri_e:gv('gonio-ri-e'),
    gonio_re_d:gv('gonio-re-d'), gonio_re_e:gv('gonio-re-e'),
    created_at:new Date().toISOString()
  };
  db.avaliacoes.push(aval);
  saveDB(db);
  toast('Avaliação salva com sucesso!');
  clearForm();
  showPage('pacientes');
}

// ─── RELATÓRIO ────────────────────────────────────────────

function loadRelatorioSelect() {
  const db = getDB();
  const sel = document.getElementById('rel-paciente');
  if(!sel) return;
  sel.innerHTML = '<option value="">Selecione um paciente...</option>'+
    db.pacientes.map(p=>`<option value="${p.id}">${p.nome}${p.regiao_label?' — '+p.regiao_label:''}</option>`).join('');
}

function openRelatorio(id) {
  showPage('relatorio');
  setTimeout(()=>{ loadRelatorioSelect(); const sel=document.getElementById('rel-paciente'); if(sel) sel.value=id; loadRelatorio(id); },50);
}

function destroyRelCharts() { Object.values(relCharts).forEach(c=>{try{c.destroy();}catch(e){}}); relCharts={}; }

function loadRelatorio(pacId) {
  destroyRelCharts();
  const el = document.getElementById('relatorio-content');
  if(!el) return;
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

  const scoresHtml = last.scores && Object.keys(last.scores).length ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-clipboard-check"></i> Questionários funcionais — ${last.regiao_label||'—'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${Object.entries(last.scores).map(([qId,s])=>{
          const pct=parseFloat(s.pct);
          const color=pct<=30?'#2d7d32':pct<=60?'#854F0B':'#c62828';
          return `<div style="background:#f9fafb;border-radius:8px;padding:12px;border:1px solid #e5e7eb">
            <div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:3px">${s.abrev||qId}</div>
            <div style="font-size:22px;font-weight:600;color:${color}">${s.pct}%</div>
            <div style="font-size:11px;color:#9b9b94">comprometimento</div>
            <div style="height:4px;background:#e5e7eb;border-radius:2px;margin-top:6px">
              <div style="height:4px;border-radius:2px;background:${color};width:${Math.min(s.pct,100)}%"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  // Filtrar apenas testes com dados preenchidos
  const testesPreenchidos = last.testesEspeciais ? Object.entries(last.testesEspeciais).filter(([t,v])=>v.d||v.e||v.obs) : [];
  const testesHtml = testesPreenchidos.length ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="ti ti-test-pipe"></i> Testes especiais realizados</div>
      <table class="lsi-table">
        <tr><th>Teste</th><th>Direito</th><th>Esquerdo</th><th>Observação</th></tr>
        ${testesPreenchidos.map(([t,v])=>`
          <tr>
            <td>${v.nome||t}</td>
            <td>${v.d?`<span class="badge ${v.d==='Positivo'?'badge-red':'badge-green'}">${v.d}</span>`:'—'}</td>
            <td>${v.e?`<span class="badge ${v.e==='Positivo'?'badge-red':'badge-green'}">${v.e}</span>`:'—'}</td>
            <td style="font-size:12px;color:#6b7280">${v.obs||'—'}</td>
          </tr>`).join('')}
      </table>
    </div>` : '';

  el.innerHTML = `
  <div class="rel-header">
    <img src="logo.png" alt="Cefise" onerror="this.style.display='none'" style="height:36px;object-fit:contain;filter:brightness(0) invert(1)">
    <div style="flex:1">
      <h2>${pac.nome}</h2>
      <p>${calcIdade(pac.nasc)} anos · ${pac.peso||'—'}kg · ${pac.altura||'—'}m · Prof: ${prof?.nome||'—'} · Região: ${last.regiao_label||'—'}</p>
    </div>
    <button onclick="solicitarInterpretacao(${pac.id})" style="padding:8px 14px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.5);border-radius:7px;color:#fff;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">
      <i class="ti ti-brain" style="font-size:16px"></i> Interpretação IA
    </button>
  </div>
  <div id="interpretacao-container"></div>
  ${hasReav?`<div class="reav-banner"><i class="ti ti-arrows-right-left"></i><div>Comparativo disponível — <b>${avals.length}</b> avaliações · ${fmtDate(first.data)} → ${fmtDate(last.data)}</div></div>`:''}
  ${scoresHtml}${testesHtml}
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
        <tr><th>Teste</th><th>Antes</th><th>Depois</th><th>Variação</th></tr>
        ${[['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Squat E',first.squat_e,last.squat_e],['Bridge D',first.bridge_d,last.bridge_d],['Core D',first.core_d,last.core_d]].map(([n,a,b])=>`<tr><td>${n}</td><td>${a||'—'}</td><td>${b||'—'}</td><td>${diff(a,b)}</td></tr>`).join('')}
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
        return `<tr><td>${n}</td><td>${Number(d||0).toFixed(1)}</td><td>${Number(e||0).toFixed(1)}</td><td><b>${lv.toFixed(1)}%</b></td><td><span class="badge ${lsiClass(lv)}">${lsiLabel(lv)}</span></td></tr>`;
      }).join('')}
    </table>
  </div>`;
  setTimeout(()=>buildRelCharts(first,last,hasReav),80);
}

function buildRelCharts(first,last,hasReav) {
  const G='#2d7d32',R='#c62828',T='#00695c';
  const mkBar=(canvasId,labels,data1,data2)=>{
    const c=document.getElementById(canvasId);
    if(!c) return;
    relCharts[canvasId]=new Chart(c,{type:'bar',data:{labels,datasets:hasReav?[{label:'Antes',data:data1,backgroundColor:R+'bb',borderColor:R,borderWidth:1},{label:'Depois',data:data2,backgroundColor:G+'bb',borderColor:G,borderWidth:1}]:[{label:'Resultado',data:data1,backgroundColor:G+'bb',borderColor:G,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:hasReav,labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true}}}});
  };
  mkBar('rc-forca',['Nordic','Squat D','Squat E','Bridge D','Bridge E','Copenh D'],[first.nordic,first.squat_d,first.squat_e,first.bridge_d,first.bridge_e,first.copenh_d],[last.nordic,last.squat_d,last.squat_e,last.bridge_d,last.bridge_e,last.copenh_d]);
  const hCanvas=document.getElementById('rc-hop');
  if(hCanvas){
    const lof=(d,e)=>e>0?parseFloat((d/e*100).toFixed(1)):0;
    relCharts['rc-hop']=new Chart(hCanvas,{type:'radar',data:{labels:['Single Hop','Triple Hop','Crossover'],datasets:hasReav?[{label:'Antes',data:[lof(first.sht_avg_d,first.sht_avg_e),lof(first.tht_avg_d,first.tht_avg_e),lof(first.cot_avg_d,first.cot_avg_e)],borderColor:R,backgroundColor:R+'33',fill:true},{label:'Depois',data:[lof(last.sht_avg_d,last.sht_avg_e),lof(last.tht_avg_d,last.tht_avg_e),lof(last.cot_avg_d,last.cot_avg_e)],borderColor:G,backgroundColor:G+'33',fill:true}]:[{label:'LSI',data:[lof(last.sht_avg_d,last.sht_avg_e),lof(last.tht_avg_d,last.tht_avg_e),lof(last.cot_avg_d,last.cot_avg_e)],borderColor:G,backgroundColor:G+'33',fill:true}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:60,max:105}},plugins:{legend:{display:hasReav,labels:{font:{size:11},boxWidth:12}}}}});
  }
  const sCanvas=document.getElementById('rc-sim');
  if(sCanvas) relCharts['rc-sim']=new Chart(sCanvas,{type:'bar',data:{labels:['Single Hop','Triple Hop','Crossover','Squat','Bridge','Core'],datasets:[{label:'Direito',data:[last.sht_avg_d,last.tht_avg_d,last.cot_avg_d,last.squat_d,last.bridge_d,last.core_d],backgroundColor:G+'bb',borderColor:G,borderWidth:1},{label:'Esquerdo',data:[last.sht_avg_e,last.tht_avg_e,last.cot_avg_e,last.squat_e,last.bridge_e,last.core_e],backgroundColor:T+'bb',borderColor:T,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true}}}});
  if(hasReav) mkBar('rc-ev',['Nordic','Squat D','Squat E','Bridge D','Bridge E','Copenh D'],[first.nordic,first.squat_d,first.squat_e,first.bridge_d,first.bridge_e,first.copenh_d],[last.nordic,last.squat_d,last.squat_e,last.bridge_d,last.bridge_e,last.copenh_d]);
}



async function solicitarInterpretacao(pacId) {
  const container = document.getElementById('interpretacao-container');
  if(!container) return;
  container.innerHTML = `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;color:#185FA5;margin-bottom:8px">
        <i class="ti ti-brain" style="font-size:20px"></i>
        <span style="font-weight:600;font-size:14px">Gerando interpretação clínica com IA...</span>
        <div style="width:18px;height:18px;border:2px solid #185FA5;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></div>
      </div>
      <p style="font-size:13px;color:#6b7280">Analisando os dados da avaliação...</p>
    </div>`;

  const db = getDB();
  const pac = db.pacientes.find(p=>p.id===parseInt(pacId));
  const avals = db.avaliacoes.filter(a=>a.paciente_id===parseInt(pacId)).sort((a,b)=>a.data.localeCompare(b.data));
  const prof = db.profissionais.find(p=>p.id===avals[avals.length-1]?.profissional_id);

  const texto = await gerarInterpretacao(pac, avals, prof);

  if(!texto) {
    container.innerHTML = `<div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;color:#9a3412">
      <i class="ti ti-alert-triangle"></i> Não foi possível gerar a interpretação automática. Verifique sua conexão.
    </div>`;
    return;
  }

  // Format the text with markdown-like rendering
  const formatado = texto
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin-bottom:10px">')
    .replace(/\n/g, '<br>');

  container.innerHTML = `
    <div style="background:#fff;border:1px solid #bfdbfe;border-radius:10px;padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">
        <i class="ti ti-brain" style="font-size:20px;color:#185FA5"></i>
        <span style="font-weight:600;font-size:14px;color:#185FA5">Interpretação Clínica — Gerada por IA</span>
        <span style="font-size:11px;color:#6b7280;margin-left:auto">Revise com seu julgamento clínico</span>
      </div>
      <div style="font-size:14px;line-height:1.7;color:#374151">
        <p style="margin-bottom:10px">${formatado}</p>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button onclick="copiarInterpretacao()" style="padding:5px 12px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;cursor:pointer;background:#f9fafb">
          <i class="ti ti-copy"></i> Copiar texto
        </button>
        <button onclick="solicitarInterpretacao(${pacId})" style="padding:5px 12px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;cursor:pointer;background:#f9fafb">
          <i class="ti ti-refresh"></i> Regenerar
        </button>
      </div>
    </div>`;
}

function copiarInterpretacao() {
  const el = document.querySelector('#interpretacao-container [style*="line-height"]');
  if(!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(()=>toast('Texto copiado!')).catch(()=>toast('Selecione e copie manualmente'));
}

// ─── INTERPRETAÇÃO CLÍNICA COM IA ────────────────────────

async function gerarInterpretacao(pac, avals, prof) {
  const last = avals[avals.length-1];
  const first = avals[0];
  const hasReav = avals.length > 1;

  const contexto = {
    paciente: { nome: pac.nome, idade: calcIdade(pac.nasc), peso: pac.peso, altura: pac.altura },
    regioes: last.regiao_label || '—',
    tipo: last.tipo,
    data: last.data,
    anamnese: {
      cirurgia: last.cirurgia === 'sim' ? last.cirurgia_detalhe : 'Não',
      hdp: last.hdp === 'sim' ? last.hdp_detalhe : 'Não',
      hda: last.hda === 'sim' ? last.hda_detalhe : 'Não',
      dor: last.dor === 'sim' ? last.dor_detalhe : 'Não'
    },
    questionarios: last.scores || {},
    testes_especiais: last.testesEspeciais || {},
    forca: { nordic: last.nordic, squat_d: last.squat_d, squat_e: last.squat_e, bridge_d: last.bridge_d, bridge_e: last.bridge_e, copenh_d: last.copenh_d, copenh_e: last.copenh_e, core_d: last.core_d, core_e: last.core_e },
    hop_tests: {
      sht: { d: last.sht_avg_d?.toFixed(1), e: last.sht_avg_e?.toFixed(1), lsi: last.sht_avg_e > 0 ? (last.sht_avg_d/last.sht_avg_e*100).toFixed(1) : '—' },
      tht: { d: last.tht_avg_d?.toFixed(1), e: last.tht_avg_e?.toFixed(1), lsi: last.tht_avg_e > 0 ? (last.tht_avg_d/last.tht_avg_e*100).toFixed(1) : '—' },
      cot: { d: last.cot_avg_d?.toFixed(1), e: last.cot_avg_e?.toFixed(1), lsi: last.cot_avg_e > 0 ? (last.cot_avg_d/last.cot_avg_e*100).toFixed(1) : '—' },
    },
    comparativo: hasReav ? {
      nordic: { antes: first.nordic, depois: last.nordic },
      squat_d: { antes: first.squat_d, depois: last.squat_d },
      bridge_d: { antes: first.bridge_d, depois: last.bridge_d },
      sht_lsi: { antes: first.sht_avg_e > 0 ? (first.sht_avg_d/first.sht_avg_e*100).toFixed(1) : '—', depois: last.sht_avg_e > 0 ? (last.sht_avg_d/last.sht_avg_e*100).toFixed(1) : '—' }
    } : null
  };

  const prompt = `Você é um fisioterapeuta especialista em reabilitação esportiva. Analise os dados desta avaliação clínica e gere uma interpretação profissional em português, organizada em 3 parágrafos:

1. **Achados clínicos**: Descreva os principais achados dos testes especiais, questionários funcionais e avaliação funcional.
2. **Análise funcional**: Interprete os dados de força muscular e testes de salto (LSI), classificando o nível de comprometimento.
3. **Conduta recomendada**: Sugira direcionamentos clínicos baseados nos achados (sem fazer diagnóstico médico).

${hasReav ? '4. **Evolução**: Compare com a avaliação anterior e destaque a progressão do paciente.' : ''}

Seja objetivo, use linguagem técnica mas acessível, e baseie-se APENAS nos dados fornecidos. Não invente dados que não estão presentes.

DADOS DA AVALIAÇÃO:
${JSON.stringify(contexto, null, 2)}`;

  try {
    const response = await fetch('/api/interpretacao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: prompt,
    system: 'Você é um fisioterapeuta especialista em reabilitação esportiva e análise clínica.',
    max_tokens: 2000
  })
});

const data = await response.json();
if (!data.success) throw new Error(data.error || 'Erro na interpretação');
const interpretacao = data.text;
  } catch (error) {
      console.error('Erro IA:', error);
      alert('Não foi possível gerar a interpretação: ' + error.message);
    }
}

// ─── PDF ──────────────────────────────────────────────────

function gerarPDF() {
  const pacId = document.getElementById('rel-paciente')?.value;
  if(!pacId) { toast('Selecione um paciente'); return; }
  const db = getDB();
  const pac = db.pacientes.find(p=>p.id===parseInt(pacId));
  const avals = db.avaliacoes.filter(a=>a.paciente_id===parseInt(pacId)).sort((a,b)=>a.data.localeCompare(b.data));
  if(!pac||!avals.length) { toast('Sem dados'); return; }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const last=avals[avals.length-1],first=avals[0],hasReav=avals.length>1;
  const W=210,mg=18; let y=0;
  const prof=db.profissionais.find(p=>p.id===last.profissional_id);
  doc.setFillColor(30,107,40); doc.rect(0,0,W,32,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont(undefined,'bold');
  doc.text('Cefise Academy',mg,13);
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text('Sistema de Avaliação Clínica',mg,20);
  doc.setFontSize(9); doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,mg,27); y=40;
  doc.setTextColor(30,107,40); doc.setFontSize(13); doc.setFont(undefined,'bold');
  doc.text(pac.nome,mg,y); y+=7;
  doc.setTextColor(80,80,80); doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(`Nascimento: ${fmtDate(pac.nasc)} · Estatura: ${pac.altura||'—'}m · Peso: ${pac.peso||'—'}kg`,mg,y); y+=6;
  doc.text(`Prof: ${prof?.nome||'—'} · Data: ${fmtDate(last.data)} · Região: ${last.regiao_label||'—'}`,mg,y); y+=10;
  const sec=(t)=>{doc.setFillColor(232,245,233);doc.rect(mg-2,y-5,W-mg*2+4,8,'F');doc.setTextColor(30,107,40);doc.setFontSize(11);doc.setFont(undefined,'bold');doc.text(t,mg,y);y+=9;doc.setTextColor(50,50,50);doc.setFontSize(10);doc.setFont(undefined,'normal');};
  if(last.scores&&Object.keys(last.scores).length){
    sec('Questionários Funcionais');
    Object.entries(last.scores).forEach(([qId,s])=>{doc.text(`${s.abrev||qId}: ${s.pct}% de comprometimento`,mg,y);y+=5.5;}); y+=4;
  }
  if(last.testesEspeciais&&Object.keys(last.testesEspeciais).length){
    sec('Testes Especiais');
    Object.entries(last.testesEspeciais).forEach(([t,v])=>{doc.text(`${v.nome||t}: D=${v.d||'—'} / E=${v.e||'—'}${v.obs?' — '+v.obs:''}`,mg,y);y+=5.5;}); y+=4;
  }
  sec('Testes de Força');
  [['Nordic',last.nordic],['Squat D',last.squat_d],['Squat E',last.squat_e],['Bridge D',last.bridge_d],['Bridge E',last.bridge_e],['Copenhagen D',last.copenh_d],['Core D (s)',last.core_d],['Core E (s)',last.core_e]].forEach(([l,v])=>{doc.text(`${l}:`,mg,y);doc.text(String(v||0),145,y);y+=5.5;}); y+=4;
  sec('Hop Tests (cm) — LSI');
  [['Single Hop',last.sht_avg_d,last.sht_avg_e],['Triple Hop',last.tht_avg_d,last.tht_avg_e],['Crossover',last.cot_avg_d,last.cot_avg_e]].forEach(([n,d,e])=>{const lsi=e>0?(d/e*100).toFixed(1):'—';doc.text(`${n}: D=${Number(d||0).toFixed(1)} / E=${Number(e||0).toFixed(1)} / LSI=${lsi}%`,mg,y);y+=5.5;}); y+=4;
  if(hasReav&&y<210){
    sec('Comparativo — Antes × Depois');
    [['Nordic',first.nordic,last.nordic],['Squat D',first.squat_d,last.squat_d],['Bridge D',first.bridge_d,last.bridge_d],['Core D',first.core_d,last.core_d]].forEach(([n,a,b])=>{const p=a?((b-a)/a*100).toFixed(1):0;doc.text(`${n}: ${a||0} → ${b||0}  (${p>0?'+':''}${p}%)`,mg,y);y+=5.5;});
  }
  doc.setFontSize(8);doc.setTextColor(160,160,150);doc.text('Cefise Academy — Sistema de Avaliação Clínica',mg,287);
  doc.save(`Avaliacao_${pac.nome.replace(/\s+/g,'_')}_${last.data}.pdf`);
  toast('PDF gerado!');
}

// ─── PROFISSIONAIS ────────────────────────────────────────

function renderProfissionais() {
  const db = getDB();
  const el = document.getElementById('prof-list');
  if(!el) return;
  el.innerHTML = db.profissionais.map(p=>`
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

function showModalProf() {
  const el = document.getElementById('modal-prof');
  if(el) el.style.display='flex';
  showErr('modal-prof-error','');
}

function saveProfissional() {
  const nome=document.getElementById('np-nome')?.value.trim();
  const esp=document.getElementById('np-esp')?.value.trim()||'Fisioterapeuta';
  const crf=document.getElementById('np-crf')?.value.trim()||'';
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
  toast('Profissional removido');
}
