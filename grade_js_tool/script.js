const STORAGE_KEY = 'grade-support-tool-v2';

const domainOptions = [
  { value: '0', label: '問題なし（0）', score: 0 },
  { value: '1', label: 'やや問題あり（−1）', score: 1 },
  { value: '2', label: '深刻な問題あり（−2）', score: 2 },
  { value: '3', label: '非常に深刻（−3）', score: 3 }
];

const gradeLevels = ['Very low', 'Low', 'Moderate', 'High'];
const gradeKeys  = ['Verylow', 'Low', 'Moderate', 'High'];

const state = {
  reviewTitle: '',
  reviewAuthor: '',
  reviewNotes: '',
  outcomes: []
};

const els = {
  reviewTitle:      document.getElementById('reviewTitle'),
  reviewAuthor:     document.getElementById('reviewAuthor'),
  reviewNotes:      document.getElementById('reviewNotes'),
  saveReviewBtn:    document.getElementById('saveReviewBtn'),
  addOutcomeBtn:    document.getElementById('addOutcomeBtn'),
  outcomesContainer:document.getElementById('outcomesContainer'),
  outcomeTemplate:  document.getElementById('outcomeTemplate'),
  refreshSummaryBtn:document.getElementById('refreshSummaryBtn'),
  summaryTableBody: document.querySelector('#summaryTable tbody'),
  exportJsonBtn:    document.getElementById('exportJsonBtn'),
  importJsonInput:  document.getElementById('importJsonInput'),
  downloadCsvBtn:   document.getElementById('downloadCsvBtn'),
  printBtn:         document.getElementById('printBtn'),
  resetBtn:         document.getElementById('resetBtn'),
  heroPill:         document.getElementById('heroPill'),
  outcomesCount:    document.getElementById('outcomesCount')
};

/* ─── Data helpers ─────────────────────────────────────── */

function createEmptyOutcome() {
  return {
    id: crypto.randomUUID(),
    outcomeName: '',
    studyDesign: 'RCT',
    studyCount: '',
    participantCount: '',
    relativeEffect: '',
    absoluteEffect: '',
    domains: { rob:'0', inconsistency:'0', indirectness:'0', imprecision:'0', pubbias:'0' },
    upgrades: [],
    i2: '',
    pvalue: '',
    assistNote: '',
    judgementNote: '',
    evidenceNote: ''
  };
}

function getUpgradeScore(upgrades) {
  return upgrades.reduce((sum, item) => sum + (item.startsWith('2_') ? 2 : 1), 0);
}

function getStartGrade(design) {
  return design === 'RCT' ? 3 : 1;
}

function calculateFinalGrade(outcome) {
  const start     = getStartGrade(outcome.studyDesign);
  const downgrade = Object.values(outcome.domains).reduce((sum, v) => sum + Number(v), 0);
  const upgrade   = getUpgradeScore(outcome.upgrades);
  let finalScore  = Math.max(0, Math.min(3, start - downgrade + upgrade));
  return {
    startScore: start,
    startGrade: gradeLevels[start],
    downgrade,
    upgrade,
    finalScore,
    finalGrade: gradeLevels[finalScore],
    finalKey:   gradeKeys[finalScore]
  };
}

function makeHint(outcome) {
  const hints = [];
  const i2 = Number(outcome.i2);
  if (outcome.i2 !== '') {
    if      (i2 < 30) hints.push('I² < 30% — 異質性は低め。');
    else if (i2 < 60) hints.push('I² 30–60% — 中等度の異質性。解釈に注意。');
    else              hints.push('I² ≥ 60% — 高い異質性。Inconsistency downgrade を検討。');
  }
  if (outcome.relativeEffect && /95%\s*CI/i.test(outcome.relativeEffect)) {
    hints.push('95% CI の幅が臨床的意思決定に影響するか Imprecision で確認。');
  }
  if (outcome.studyCount !== '' && Number(outcome.studyCount) < 10) {
    hints.push('研究数が少ない場合、Publication bias 評価は慎重に。');
  }
  return hints.join('　');
}

/* ─── Render ────────────────────────────────────────────── */

function renderReviewInfo() {
  els.reviewTitle.value  = state.reviewTitle  || '';
  els.reviewAuthor.value = state.reviewAuthor || '';
  els.reviewNotes.value  = state.reviewNotes  || '';
}

function fillDomainSelect(select, currentValue) {
  select.innerHTML = '';
  domainOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (String(currentValue) === String(opt.value)) o.selected = true;
    select.appendChild(o);
  });
}

function gradeBadgeHtml(result) {
  const cls = `grade-badge grade-${result.finalKey}`;
  return `<span class="${cls}">${result.finalGrade}</span>`;
}

function renderOutcomes() {
  /* Remember scroll position to avoid jarring jump */
  const scrollY = window.scrollY;

  els.outcomesContainer.innerHTML = '';

  state.outcomes.forEach((outcome, index) => {
    const clone = els.outcomeTemplate.content.cloneNode(true);
    const root  = clone.querySelector('.outcome');
    root.dataset.id = outcome.id;

    root.querySelector('.outcome-num').textContent = index + 1;
    root.querySelector('.outcome-name').value       = outcome.outcomeName;
    root.querySelector('.study-design').value       = outcome.studyDesign;
    root.querySelector('.study-count').value        = outcome.studyCount;
    root.querySelector('.participant-count').value  = outcome.participantCount;
    root.querySelector('.relative-effect').value    = outcome.relativeEffect;
    root.querySelector('.absolute-effect').value    = outcome.absoluteEffect;
    root.querySelector('.i2').value                 = outcome.i2;
    root.querySelector('.pvalue').value             = outcome.pvalue;
    root.querySelector('.assist-note').value        = outcome.assistNote;
    root.querySelector('.judgement-note').value     = outcome.judgementNote;
    root.querySelector('.evidence-note').value      = outcome.evidenceNote;

    root.querySelectorAll('.domain').forEach(sel => {
      fillDomainSelect(sel, outcome.domains[sel.dataset.domain]);
    });

    const upgradeSelect = root.querySelector('.upgrade-select');
    [...upgradeSelect.options].forEach(o => {
      o.selected = outcome.upgrades.includes(o.value);
    });

    const result = calculateFinalGrade(outcome);
    root.querySelector('.start-grade').textContent      = result.startGrade;
    root.querySelector('.downgrade-total').textContent  = result.downgrade;
    root.querySelector('.upgrade-total').textContent    = result.upgrade;
    root.querySelector('.final-grade-wrap').innerHTML   = gradeBadgeHtml(result);

    const hint = root.querySelector('.hint');
    const hintText = makeHint(outcome);
    if (hintText) { hint.textContent = hintText; hint.style.display = ''; }
    else           { hint.style.display = 'none'; }

    root.addEventListener('input',  e => handleOutcomeInput(e, outcome.id));
    root.addEventListener('change', e => handleOutcomeInput(e, outcome.id));
    root.querySelector('.delete-outcome').addEventListener('click', () => deleteOutcome(outcome.id));
    root.querySelector('.duplicate-outcome').addEventListener('click', () => duplicateOutcome(outcome.id));

    els.outcomesContainer.appendChild(clone);
  });

  updateCounts();
  window.scrollTo({ top: scrollY });
}

function updateCounts() {
  const n = state.outcomes.length;
  if (els.heroPill)      els.heroPill.innerHTML   = `Outcomes: <strong>${n}</strong>`;
  if (els.outcomesCount) els.outcomesCount.textContent = `${n} outcome${n !== 1 ? 's' : ''}`;
}

/* ─── Input handling ────────────────────────────────────── */

function handleOutcomeInput(event, id) {
  const outcome = state.outcomes.find(item => item.id === id);
  if (!outcome) return;
  const w = event.currentTarget;

  outcome.outcomeName      = w.querySelector('.outcome-name').value;
  outcome.studyDesign      = w.querySelector('.study-design').value;
  outcome.studyCount       = w.querySelector('.study-count').value;
  outcome.participantCount = w.querySelector('.participant-count').value;
  outcome.relativeEffect   = w.querySelector('.relative-effect').value;
  outcome.absoluteEffect   = w.querySelector('.absolute-effect').value;
  outcome.i2               = w.querySelector('.i2').value;
  outcome.pvalue           = w.querySelector('.pvalue').value;
  outcome.assistNote       = w.querySelector('.assist-note').value;
  outcome.judgementNote    = w.querySelector('.judgement-note').value;
  outcome.evidenceNote     = w.querySelector('.evidence-note').value;

  w.querySelectorAll('.domain').forEach(sel => {
    outcome.domains[sel.dataset.domain] = sel.value;
  });
  const upgradeSelect = w.querySelector('.upgrade-select');
  outcome.upgrades = [...upgradeSelect.selectedOptions].map(o => o.value);

  /* Live update only the result box and hint — no full re-render for smooth UX */
  const result = calculateFinalGrade(outcome);
  w.querySelector('.start-grade').textContent      = result.startGrade;
  w.querySelector('.downgrade-total').textContent  = result.downgrade;
  w.querySelector('.upgrade-total').textContent    = result.upgrade;
  w.querySelector('.final-grade-wrap').innerHTML   = gradeBadgeHtml(result);

  const hint = w.querySelector('.hint');
  const hintText = makeHint(outcome);
  if (hintText) { hint.textContent = hintText; hint.style.display = ''; }
  else           { hint.style.display = 'none'; }

  persist();
  renderSummary();
}

/* ─── Outcome CRUD ──────────────────────────────────────── */

function deleteOutcome(id) {
  if (state.outcomes.length === 1) { alert('最低1つのOutcomeは残してください。'); return; }
  state.outcomes = state.outcomes.filter(item => item.id !== id);
  persist();
  renderOutcomes();
  renderSummary();
}

function duplicateOutcome(id) {
  const original = state.outcomes.find(item => item.id === id);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = crypto.randomUUID();
  copy.outcomeName = original.outcomeName ? `${original.outcomeName}（複製）` : '複製';
  state.outcomes.push(copy);
  persist();
  renderOutcomes();
  renderSummary();
}

/* ─── Summary ───────────────────────────────────────────── */

function buildReasonSummary(outcome, result) {
  const domainNames = { rob:'RoB', inconsistency:'Inconsistency', indirectness:'Indirectness', imprecision:'Imprecision', pubbias:'Pub.bias' };
  const downs = Object.entries(outcome.domains)
    .filter(([,v]) => Number(v) > 0)
    .map(([k,v]) => `${domainNames[k]} −${v}`);
  const up = outcome.upgrades.length > 0 ? `Upgrade +${result.upgrade}` : '';
  const note = outcome.judgementNote?.trim() ? ` / ${outcome.judgementNote.trim().slice(0,80)}` : '';
  return [...downs, up].filter(Boolean).join('；') + note;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function renderSummary() {
  els.summaryTableBody.innerHTML = '';
  state.outcomes.forEach(outcome => {
    const result = calculateFinalGrade(outcome);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(outcome.outcomeName || '未入力')}</td>
      <td><span style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(outcome.studyDesign)}</span></td>
      <td>${escapeHtml(outcome.studyCount || '—')}</td>
      <td>${escapeHtml(outcome.participantCount || '—')}</td>
      <td style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(outcome.relativeEffect || '—')}</td>
      <td>${escapeHtml(outcome.absoluteEffect || '—')}</td>
      <td>${gradeBadgeHtml(result)}</td>
      <td style="color:var(--text-muted);font-size:12px;">${escapeHtml(buildReasonSummary(outcome, result))}</td>
    `;
    els.summaryTableBody.appendChild(tr);
  });
}

/* ─── Persistence ───────────────────────────────────────── */

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initialLoad() {
  const saved = localStorage.getItem(STORAGE_KEY);
  // Also try old key
  const savedOld = !saved ? localStorage.getItem('grade-support-tool-v1') : null;
  const raw = saved || savedOld;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    } catch(e) { console.error('保存データの読み込みに失敗:', e); }
  }
  if (!Array.isArray(state.outcomes) || state.outcomes.length === 0) {
    state.outcomes = [createEmptyOutcome()];
  }
  renderReviewInfo();
  renderOutcomes();
  renderSummary();
}

/* ─── Export / Import ───────────────────────────────────── */

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, buildFileName('grade_review', 'json'));
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.outcomes)) throw new Error('形式が不正です');
      state.reviewTitle  = parsed.reviewTitle  || '';
      state.reviewAuthor = parsed.reviewAuthor || '';
      state.reviewNotes  = parsed.reviewNotes  || '';
      state.outcomes     = parsed.outcomes.map(item => ({ ...createEmptyOutcome(), ...item }));
      persist();
      renderReviewInfo();
      renderOutcomes();
      renderSummary();
      alert('JSONを読み込みました。');
    } catch(err) { alert('JSONの読み込みに失敗しました。'); console.error(err); }
  };
  reader.readAsText(file);
}

function downloadSummaryCsv() {
  const rows = [['Outcome','Study design','Studies','Participants','Relative effect','Absolute effect','Final GRADE','Reason summary']];
  state.outcomes.forEach(outcome => {
    const result = calculateFinalGrade(outcome);
    rows.push([outcome.outcomeName||'',outcome.studyDesign||'',outcome.studyCount||'',outcome.participantCount||'',
               outcome.relativeEffect||'',outcome.absoluteEffect||'',result.finalGrade,buildReasonSummary(outcome,result)]);
  });
  const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8;'}), buildFileName('grade_summary','csv'));
}

function buildFileName(prefix, ext) {
  return `${prefix}_${new Date().toISOString().slice(0,10)}.${ext}`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ─── Event listeners ───────────────────────────────────── */

els.saveReviewBtn.addEventListener('click', () => {
  state.reviewTitle  = els.reviewTitle.value;
  state.reviewAuthor = els.reviewAuthor.value;
  state.reviewNotes  = els.reviewNotes.value;
  persist();
  const btn = els.saveReviewBtn;
  btn.textContent = '✓ 保存しました';
  setTimeout(() => { btn.textContent = '保存'; }, 1800);
});

els.addOutcomeBtn.addEventListener('click', () => {
  state.outcomes.push(createEmptyOutcome());
  persist();
  renderOutcomes();
  renderSummary();
  /* Scroll to new outcome */
  setTimeout(() => {
    const articles = els.outcomesContainer.querySelectorAll('.outcome');
    const last = articles[articles.length - 1];
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
});

els.refreshSummaryBtn.addEventListener('click', renderSummary);
els.exportJsonBtn.addEventListener('click', exportJson);
els.importJsonInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) importJson(file);
  e.target.value = '';
});
els.downloadCsvBtn.addEventListener('click', downloadSummaryCsv);
els.printBtn.addEventListener('click', () => window.print());
els.resetBtn.addEventListener('click', () => {
  if (!confirm('保存データをすべて初期化します。よろしいですか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('grade-support-tool-v1');
  state.reviewTitle = ''; state.reviewAuthor = ''; state.reviewNotes = '';
  state.outcomes = [createEmptyOutcome()];
  renderReviewInfo();
  renderOutcomes();
  renderSummary();
});

initialLoad();
