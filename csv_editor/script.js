/* ============================================================
   CSV Editor Pro — Main Script
   Vanilla JS, PapaParse for CSV I/O
   ============================================================ */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const state = {
  rawData: [],          // { id, data: {colKey: value} }[]
  headers: [],          // { key, label, visible }[]
  sortCol: null,
  sortDir: 'asc',
  filters: {},          // { colKey: string }
  searchQuery: '',
  sourceFileName: '',
  nextRowId: 0,
  nextColId: 0,
  dragSrcColIdx: null,
};

/* ============================================================
   DOM REFS
   ============================================================ */
const $ = id => document.getElementById(id);
const dom = {
  upload:        $('csv-upload'),
  btnDownload:   $('btn-download'),
  btnSaveLocal:  $('btn-save-local'),
  btnRestore:    $('btn-restore-local'),
  btnAddRow:     $('btn-add-row'),
  btnAddCol:     $('btn-add-col'),
  btnColVis:     $('btn-col-visibility'),
  searchInput:   $('search-input'),
  btnClearFlt:   $('btn-clear-filters'),
  welcome:       $('welcome-screen'),
  tableWrapper:  $('table-wrapper'),
  tableHead:     $('table-head'),
  tableBody:     $('table-body'),
  statusText:    $('status-text'),
  filterStatus:  $('filter-status'),
  fileNameBadge: $('file-name-display'),
  rowCountBadge: $('row-count-badge'),
  mainContent:   document.querySelector('.main-content'),

  // modals
  modalOverlay:  $('modal-overlay'),
  modalTitle:    $('modal-title'),
  modalForm:     $('modal-form-container'),
  modalClose:    $('modal-close-btn'),
  modalCancel:   $('modal-cancel-btn'),
  modalDelete:   $('modal-delete-btn'),
  modalSave:     $('modal-save-btn'),

  colVisOverlay: $('col-vis-overlay'),
  colVisList:    $('col-vis-list'),
  colVisClose:   $('col-vis-close'),
  colVisAll:     $('col-vis-all'),
  colVisApply:   $('col-vis-apply'),

  addColOverlay: $('add-col-overlay'),
  newColName:    $('new-col-name'),
  newColPos:     $('new-col-position'),
  addColClose:   $('add-col-close'),
  addColCancel:  $('add-col-cancel'),
  addColConfirm: $('add-col-confirm'),
  toastContainer:$('toast-container'),

  exportOverlay:  $('export-overlay'),
  exportInput:    $('export-filename-input'),
  exportClose:    $('export-close'),
  exportCancel:   $('export-cancel'),
  exportConfirm:  $('export-confirm'),

  newOverlay:     $('new-overlay'),
  newColLabels:   $('new-col-labels'),
  newRowCount:    $('new-row-count'),
  newFileName:    $('new-file-name'),
  newClose:       $('new-close'),
  newCancel:      $('new-cancel'),
  newConfirm:     $('new-confirm'),

  btnNew:         $('btn-new'),
  btnNewWelcome:  $('btn-new-welcome'),
  btnTheme:       $('btn-theme-toggle'),
  themeIconDark:  $('theme-icon-dark'),
  themeIconLight: $('theme-icon-light'),
};

let editingRowId = null; // row id currently open in modal

/* ============================================================
   INIT
   ============================================================ */
function init() {
  // テーマ初期化
  initTheme();

  dom.upload.addEventListener('change', handleFileUpload);
  dom.btnDownload.addEventListener('click', openExportModal);
  dom.btnSaveLocal.addEventListener('click', saveToLocalStorage);
  dom.btnRestore.addEventListener('click', restoreFromLocalStorage);
  dom.btnAddRow.addEventListener('click', addNewRow);
  dom.btnAddCol.addEventListener('click', openAddColModal);
  dom.btnColVis.addEventListener('click', openColVisModal);
  dom.searchInput.addEventListener('input', handleSearch);
  dom.btnClearFlt.addEventListener('click', clearAllFilters);
  dom.btnTheme.addEventListener('click', toggleTheme);

  // 新規作成
  dom.btnNew.addEventListener('click', openNewModal);
  dom.btnNewWelcome.addEventListener('click', openNewModal);
  dom.newClose.addEventListener('click', () => dom.newOverlay.classList.add('hidden'));
  dom.newCancel.addEventListener('click', () => dom.newOverlay.classList.add('hidden'));
  dom.newOverlay.addEventListener('click', e => { if (e.target === dom.newOverlay) dom.newOverlay.classList.add('hidden'); });
  dom.newConfirm.addEventListener('click', confirmNewFile);
  dom.newColLabels.addEventListener('keydown', e => { if (e.key === 'Enter') confirmNewFile(); });

  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalOverlay.addEventListener('click', e => { if (e.target === dom.modalOverlay) closeModal(); });
  dom.modalSave.addEventListener('click', saveRowEdit);
  dom.modalDelete.addEventListener('click', deleteEditingRow);

  dom.colVisClose.addEventListener('click', () => dom.colVisOverlay.classList.add('hidden'));
  dom.colVisApply.addEventListener('click', applyColVisibility);
  dom.colVisAll.addEventListener('click', () => {
    dom.colVisList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
  });

  dom.addColClose.addEventListener('click', () => dom.addColOverlay.classList.add('hidden'));
  dom.addColCancel.addEventListener('click', () => dom.addColOverlay.classList.add('hidden'));
  dom.addColConfirm.addEventListener('click', confirmAddColumn);

  dom.exportClose.addEventListener('click', () => dom.exportOverlay.classList.add('hidden'));
  dom.exportCancel.addEventListener('click', () => dom.exportOverlay.classList.add('hidden'));
  dom.exportOverlay.addEventListener('click', e => { if (e.target === dom.exportOverlay) dom.exportOverlay.classList.add('hidden'); });
  dom.exportConfirm.addEventListener('click', confirmDownload);
  dom.exportInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmDownload(); });

  // Drag & drop file
  dom.mainContent.addEventListener('dragover', e => {
    e.preventDefault();
    dom.mainContent.classList.add('drag-over');
  });
  dom.mainContent.addEventListener('dragleave', () => dom.mainContent.classList.remove('drag-over'));
  dom.mainContent.addEventListener('drop', e => {
    e.preventDefault();
    dom.mainContent.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processCSVFile(file);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      dom.colVisOverlay.classList.add('hidden');
      dom.addColOverlay.classList.add('hidden');
      dom.exportOverlay.classList.add('hidden');
      dom.newOverlay.classList.add('hidden');
    }
  });
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('csvEditorPro_theme') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
    dom.themeIconDark.style.display  = 'none';
    dom.themeIconLight.style.display = '';
    dom.btnTheme.title = 'ダークモードに切替';
  } else {
    document.documentElement.classList.remove('light');
    dom.themeIconDark.style.display  = '';
    dom.themeIconLight.style.display = 'none';
    dom.btnTheme.title = 'ライトモードに切替';
  }
  localStorage.setItem('csvEditorPro_theme', theme);
}

/* ============================================================
   NEW FILE
   ============================================================ */
function openNewModal() {
  dom.newColLabels.value = '';
  dom.newRowCount.value  = '1';
  dom.newFileName.value  = '';
  dom.newOverlay.classList.remove('hidden');
  setTimeout(() => dom.newColLabels.focus(), 50);
}

function confirmNewFile() {
  const rawLabels = dom.newColLabels.value;
  const labels = rawLabels
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (labels.length === 0) {
    toast('列名を1つ以上入力してください', 'warning');
    dom.newColLabels.focus();
    return;
  }

  const rowCount = Math.max(0, Math.min(500, parseInt(dom.newRowCount.value) || 0));
  const fname    = dom.newFileName.value.trim() || '新規ファイル';

  state.sourceFileName = fname + '.csv';
  dom.newOverlay.classList.add('hidden');

  // 空行を rowCount 個作成
  const rows = Array.from({ length: rowCount }, () => {
    const obj = {};
    labels.forEach(l => { obj[l] = ''; });
    return obj;
  });

  loadData(labels, rows);
  dom.fileNameBadge.textContent = state.sourceFileName + ' (新規)';
  toast(`新規ファイルを作成しました（${labels.length}列 / ${rowCount}行）`, 'success');
}

/* ============================================================
   CSV LOAD
   ============================================================ */
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) processCSVFile(file);
  e.target.value = '';
}

function processCSVFile(file) {
  state.sourceFileName = file.name;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    encoding: 'UTF-8',
    complete: result => {
      if (!result.data.length && !result.meta.fields?.length) {
        toast('データが見つかりません', 'error'); return;
      }
      loadData(result.meta.fields || [], result.data);
      toast(`${file.name} を読み込みました（${state.rawData.length}行）`, 'success');
    },
    error: err => {
      // Shift-JIS retry
      const reader = new FileReader();
      reader.onload = ev => {
        Papa.parse(ev.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: result => {
            loadData(result.meta.fields || [], result.data);
            toast(`${file.name} を読み込みました (Shift-JIS)`, 'success');
          },
          error: () => toast('CSVの読み込みに失敗しました', 'error'),
        });
      };
      reader.readAsText(file, 'Shift_JIS');
    },
  });
}

function loadData(fields, rows) {
  // reset
  state.sortCol = null;
  state.sortDir = 'asc';
  state.filters = {};
  state.searchQuery = '';
  state.nextColId = 0;
  state.nextRowId = 0;
  dom.searchInput.value = '';

  state.headers = fields.map(f => ({
    key: 'col_' + (state.nextColId++),
    label: f,
    visible: true,
  }));

  const keyMap = {}; // label -> key
  state.headers.forEach(h => { keyMap[h.label] = h.key; });

  state.rawData = rows.map(row => {
    const data = {};
    state.headers.forEach(h => { data[h.key] = row[h.label] ?? ''; });
    return { id: state.nextRowId++, data };
  });

  enableToolbar();
  render();
  dom.fileNameBadge.textContent = state.sourceFileName;
}

/* ============================================================
   TOOLBAR ENABLE
   ============================================================ */
function enableToolbar() {
  dom.btnDownload.disabled = false;
  dom.btnSaveLocal.disabled = false;
  dom.btnAddRow.disabled = false;
  dom.btnAddCol.disabled = false;
  dom.btnColVis.disabled = false;
  dom.searchInput.disabled = false;
  dom.btnClearFlt.disabled = false;
}

/* ============================================================
   VIEW DATA (sort + filter + search)
   ============================================================ */
function getViewData() {
  let data = [...state.rawData];

  // search
  const q = state.searchQuery.toLowerCase();
  if (q) {
    data = data.filter(row =>
      state.headers.some(h => String(row.data[h.key] ?? '').toLowerCase().includes(q))
    );
  }

  // column filters
  Object.entries(state.filters).forEach(([key, val]) => {
    if (!val) return;
    const lv = val.toLowerCase();
    data = data.filter(row => String(row.data[key] ?? '').toLowerCase().includes(lv));
  });

  // sort
  if (state.sortCol) {
    const h = state.headers.find(h => h.key === state.sortCol);
    const isNum = h ? isNumericCol(h.key) : false;
    data.sort((a, b) => {
      const av = a.data[state.sortCol] ?? '';
      const bv = b.data[state.sortCol] ?? '';
      let cmp;
      if (isNum) {
        cmp = parseFloat(av) - parseFloat(bv);
        if (isNaN(cmp)) cmp = String(av).localeCompare(String(bv), 'ja');
      } else {
        cmp = String(av).localeCompare(String(bv), 'ja');
      }
      return state.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  return data;
}

function isNumericCol(key) {
  let count = 0, total = 0;
  for (const row of state.rawData) {
    const v = row.data[key];
    if (v === '' || v == null) continue;
    total++;
    if (!isNaN(parseFloat(v)) && isFinite(v)) count++;
    if (total >= 20) break;
  }
  return total > 0 && count / total > 0.8;
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  const view = getViewData();
  renderHead();
  renderBody(view);
  updateStatus(view.length);
}

function renderHead() {
  const visHeaders = state.headers.filter(h => h.visible);

  // ---- main header row ----
  const tr = document.createElement('tr');

  // row-number th
  const thNum = document.createElement('th');
  thNum.className = 'th-row-num';
  thNum.innerHTML = `<div class="th-inner"><span style="color:var(--text3);font-size:11px">#</span></div>`;
  tr.appendChild(thNum);

  visHeaders.forEach((h, visIdx) => {
    const realIdx = state.headers.indexOf(h);
    const th = document.createElement('th');
    th.dataset.key = h.key;
    th.setAttribute('draggable', 'true');

    // sort indicator
    const isSorted = state.sortCol === h.key;
    const sortArrow = isSorted
      ? (state.sortDir === 'asc' ? '▲' : '▼')
      : '⇅';

    th.innerHTML = `
      <div class="th-inner">
        <button class="th-move-btn" data-dir="left" data-key="${h.key}" title="左へ移動" ${realIdx === 0 ? 'disabled' : ''}>◀</button>
        <span class="col-name" data-key="${h.key}" title="クリックで列名を編集">${escHtml(h.label)}</span>
        <button class="th-move-btn" data-dir="right" data-key="${h.key}" title="右へ移動" ${realIdx === state.headers.length - 1 ? 'disabled' : ''}>▶</button>
        <button class="th-sort-btn ${isSorted ? 'active' : ''}" data-key="${h.key}" title="ソート">${sortArrow}</button>
      </div>`;

    // col name click → inline edit
    th.querySelector('.col-name').addEventListener('click', e => startColNameEdit(e, h.key));

    // sort btn
    th.querySelector('.th-sort-btn').addEventListener('click', () => handleSort(h.key));

    // move btns
    th.querySelectorAll('.th-move-btn').forEach(btn => {
      btn.addEventListener('click', () => moveColumn(h.key, btn.dataset.dir));
    });

    // drag for col reorder
    th.addEventListener('dragstart', () => {
      state.dragSrcColIdx = realIdx;
      setTimeout(() => th.classList.add('dragging-col'), 0);
    });
    th.addEventListener('dragend', () => {
      th.classList.remove('dragging-col');
      document.querySelectorAll('.drag-over-col').forEach(el => el.classList.remove('drag-over-col'));
    });
    th.addEventListener('dragover', e => {
      e.preventDefault();
      document.querySelectorAll('.drag-over-col').forEach(el => el.classList.remove('drag-over-col'));
      th.classList.add('drag-over-col');
    });
    th.addEventListener('drop', e => {
      e.preventDefault();
      th.classList.remove('drag-over-col');
      const targetIdx = state.headers.indexOf(h);
      if (state.dragSrcColIdx !== null && state.dragSrcColIdx !== targetIdx) {
        const moved = state.headers.splice(state.dragSrcColIdx, 1)[0];
        state.headers.splice(targetIdx, 0, moved);
        render();
      }
      state.dragSrcColIdx = null;
    });

    tr.appendChild(th);
  });

  // ---- filter row ----
  const trFilter = document.createElement('tr');
  trFilter.className = 'filter-row';

  const tdNumFilter = document.createElement('th');
  tdNumFilter.className = 'th-row-num';
  trFilter.appendChild(tdNumFilter);

  visHeaders.forEach(h => {
    const thF = document.createElement('th');
    const val = state.filters[h.key] || '';
    thF.innerHTML = `<input class="filter-input ${val ? 'active' : ''}" data-key="${h.key}" placeholder="絞込..." value="${escHtml(val)}">`;
    thF.querySelector('input').addEventListener('input', e => {
      state.filters[h.key] = e.target.value;
      render();
    });
    trFilter.appendChild(thF);
  });

  dom.tableHead.innerHTML = '';
  dom.tableHead.appendChild(tr);
  dom.tableHead.appendChild(trFilter);
}

function renderBody(view) {
  const visHeaders = state.headers.filter(h => h.visible);
  const frag = document.createDocumentFragment();

  view.forEach((row, vIdx) => {
    const realIdx = state.rawData.indexOf(row);
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    // row number + up/down
    const tdNum = document.createElement('td');
    tdNum.innerHTML = `
      <div class="row-actions">
        <button class="row-move-btn" data-id="${row.id}" data-dir="up" title="上へ" ${realIdx === 0 ? 'disabled' : ''}>▲</button>
        <span class="row-num-label">${vIdx + 1}</span>
        <button class="row-move-btn" data-id="${row.id}" data-dir="down" title="下へ" ${realIdx === state.rawData.length - 1 ? 'disabled' : ''}>▼</button>
      </div>`;
    tdNum.querySelectorAll('.row-move-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        moveRow(parseInt(btn.dataset.id), btn.dataset.dir);
      });
    });
    tr.appendChild(tdNum);

    // data cells
    visHeaders.forEach(h => {
      const td = document.createElement('td');
      td.title = row.data[h.key] ?? '';
      td.textContent = row.data[h.key] ?? '';
      tr.appendChild(td);
    });

    // click → modal
    tr.addEventListener('click', e => {
      if (e.target.closest('.row-move-btn')) return;
      openEditModal(row.id);
    });

    frag.appendChild(tr);
  });

  dom.tableBody.innerHTML = '';
  dom.tableBody.appendChild(frag);

  dom.welcome.classList.add('hidden');
  dom.tableWrapper.classList.remove('hidden');
}

function updateStatus(visCount) {
  const total = state.rawData.length;
  const hasFilter = state.searchQuery || Object.values(state.filters).some(v => v);
  dom.statusText.textContent = hasFilter
    ? `${visCount} / ${total} 行表示`
    : `${total} 行`;
  dom.filterStatus.textContent = hasFilter ? `（フィルタ適用中）` : '';
  dom.rowCountBadge.textContent = `${total} rows`;
  dom.rowCountBadge.classList.remove('hidden');
}

/* ============================================================
   COLUMN OPERATIONS
   ============================================================ */
function startColNameEdit(e, key) {
  const span = e.currentTarget;
  const h = state.headers.find(h => h.key === key);
  if (!h) return;

  const input = document.createElement('input');
  input.className = 'col-name-input';
  input.value = h.label;
  span.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newLabel = input.value.trim() || h.label;
    h.label = newLabel;
    render();
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') render();
  });
}

function moveColumn(key, dir) {
  const idx = state.headers.findIndex(h => h.key === key);
  if (idx === -1) return;
  if (dir === 'left' && idx > 0) {
    [state.headers[idx - 1], state.headers[idx]] = [state.headers[idx], state.headers[idx - 1]];
  } else if (dir === 'right' && idx < state.headers.length - 1) {
    [state.headers[idx], state.headers[idx + 1]] = [state.headers[idx + 1], state.headers[idx]];
  }
  render();
}

function openColVisModal() {
  dom.colVisList.innerHTML = '';
  state.headers.forEach(h => {
    const div = document.createElement('div');
    div.className = 'col-vis-item';
    div.innerHTML = `
      <input type="checkbox" id="cv_${h.key}" ${h.visible ? 'checked' : ''}>
      <label for="cv_${h.key}">${escHtml(h.label)}</label>`;
    dom.colVisList.appendChild(div);
  });
  dom.colVisOverlay.classList.remove('hidden');
}

function applyColVisibility() {
  state.headers.forEach(h => {
    const cb = document.getElementById('cv_' + h.key);
    if (cb) h.visible = cb.checked;
  });
  dom.colVisOverlay.classList.add('hidden');
  render();
}

function openAddColModal() {
  dom.newColName.value = '';
  dom.newColPos.innerHTML = '';
  state.headers.forEach((h, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `「${h.label}」の後`;
    dom.newColPos.appendChild(opt);
  });
  const optFirst = document.createElement('option');
  optFirst.value = 0;
  optFirst.textContent = '先頭に追加';
  dom.newColPos.insertBefore(optFirst, dom.newColPos.firstChild);
  dom.newColPos.value = state.headers.length;
  dom.addColOverlay.classList.remove('hidden');
  dom.newColName.focus();
}

function confirmAddColumn() {
  const label = dom.newColName.value.trim();
  if (!label) { toast('列名を入力してください', 'warning'); return; }
  const pos = parseInt(dom.newColPos.value);
  const key = 'col_' + (state.nextColId++);
  const newH = { key, label, visible: true };
  state.headers.splice(pos, 0, newH);
  state.rawData.forEach(row => { row.data[key] = ''; });
  dom.addColOverlay.classList.add('hidden');
  render();
  toast(`列「${label}」を追加しました`, 'success');
}

/* ============================================================
   ROW OPERATIONS
   ============================================================ */
function moveRow(id, dir) {
  const idx = state.rawData.findIndex(r => r.id === id);
  if (idx === -1) return;
  if (dir === 'up' && idx > 0) {
    [state.rawData[idx - 1], state.rawData[idx]] = [state.rawData[idx], state.rawData[idx - 1]];
  } else if (dir === 'down' && idx < state.rawData.length - 1) {
    [state.rawData[idx], state.rawData[idx + 1]] = [state.rawData[idx + 1], state.rawData[idx]];
  }
  render();
}

function addNewRow() {
  const data = {};
  state.headers.forEach(h => { data[h.key] = ''; });
  const newRow = { id: state.nextRowId++, data };
  state.rawData.push(newRow);
  render();
  // open edit modal for new row
  openEditModal(newRow.id);
}

/* ============================================================
   SORT
   ============================================================ */
function handleSort(key) {
  if (state.sortCol === key) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortCol = key;
    state.sortDir = 'asc';
  }
  render();
}

/* ============================================================
   SEARCH / FILTER
   ============================================================ */
function handleSearch(e) {
  state.searchQuery = e.target.value;
  render();
}

function clearAllFilters() {
  state.filters = {};
  state.searchQuery = '';
  state.sortCol = null;
  dom.searchInput.value = '';
  render();
  toast('フィルタ・ソートをリセットしました');
}

/* ============================================================
   EDIT MODAL
   ============================================================ */
function openEditModal(id) {
  const row = state.rawData.find(r => r.id === id);
  if (!row) return;
  editingRowId = id;
  dom.modalTitle.textContent = `行を編集`;

  const visHeaders = state.headers; // show all columns in modal
  const isLong = visHeaders.length > 6;

  dom.modalForm.innerHTML = '';
  const grid = document.createElement('div');
  if (isLong) grid.className = 'form-grid';

  visHeaders.forEach(h => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const val = row.data[h.key] ?? '';
    const isMultiline = String(val).includes('\n') || String(val).length > 80;
    group.innerHTML = `
      <label class="form-label" for="fe_${h.key}">${escHtml(h.label)}</label>
      ${isMultiline
        ? `<textarea class="form-input" id="fe_${h.key}" data-key="${h.key}" rows="3">${escHtml(val)}</textarea>`
        : `<input type="text" class="form-input" id="fe_${h.key}" data-key="${h.key}" value="${escHtml(val)}">`
      }`;
    grid.appendChild(group);
  });

  dom.modalForm.appendChild(grid);
  dom.modalOverlay.classList.remove('hidden');

  // focus first input
  const first = dom.modalForm.querySelector('input, textarea');
  if (first) setTimeout(() => first.focus(), 50);
}

function saveRowEdit() {
  const row = state.rawData.find(r => r.id === editingRowId);
  if (!row) return;

  dom.modalForm.querySelectorAll('[data-key]').forEach(el => {
    row.data[el.dataset.key] = el.value;
  });

  closeModal();
  render();
  toast('保存しました', 'success');
}

function deleteEditingRow() {
  if (!confirm('この行を削除しますか？')) return;
  const idx = state.rawData.findIndex(r => r.id === editingRowId);
  if (idx !== -1) state.rawData.splice(idx, 1);
  closeModal();
  render();
  toast('行を削除しました');
}

function closeModal() {
  dom.modalOverlay.classList.add('hidden');
  editingRowId = null;
}

/* ============================================================
   CSV DOWNLOAD
   ============================================================ */
function openExportModal() {
  if (!state.rawData.length && !state.headers.length) return;
  const base = state.sourceFileName.replace(/\.[^/.]+$/, '') || 'export';
  dom.exportInput.value = base;
  dom.exportOverlay.classList.remove('hidden');
  setTimeout(() => {
    dom.exportInput.focus();
    dom.exportInput.select();
  }, 50);
}

function confirmDownload() {
  let fname = dom.exportInput.value.trim();
  if (!fname) { toast('ファイル名を入力してください', 'warning'); return; }
  // 末尾の .csv を除去して付け直す（二重拡張子防止）
  fname = fname.replace(/\.csv$/i, '');
  dom.exportOverlay.classList.add('hidden');
  downloadCSV(fname + '.csv');
}

function downloadCSV(fname) {
  const fields = state.headers.map(h => h.label);
  const data = state.rawData.map(row => {
    const obj = {};
    state.headers.forEach(h => { obj[h.label] = row.data[h.key] ?? ''; });
    return obj;
  });

  const csv = Papa.unparse({ fields, data });
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${fname} をダウンロードしました`, 'success');
}

/* ============================================================
   LOCALSTORAGE
   ============================================================ */
function saveToLocalStorage() {
  try {
    const payload = JSON.stringify({
      rawData: state.rawData,
      headers: state.headers,
      sourceFileName: state.sourceFileName,
      nextRowId: state.nextRowId,
      nextColId: state.nextColId,
    });
    localStorage.setItem('csvEditorPro_data', payload);
    toast('ローカルに保存しました', 'success');
  } catch (e) {
    toast('保存失敗: データが大きすぎる可能性があります', 'error');
  }
}

function restoreFromLocalStorage() {
  const raw = localStorage.getItem('csvEditorPro_data');
  if (!raw) { toast('保存データが見つかりません', 'warning'); return; }
  try {
    const obj = JSON.parse(raw);
    state.rawData = obj.rawData || [];
    state.headers = obj.headers || [];
    state.sourceFileName = obj.sourceFileName || 'restored';
    state.nextRowId = obj.nextRowId || state.rawData.length;
    state.nextColId = obj.nextColId || state.headers.length;
    state.filters = {};
    state.searchQuery = '';
    state.sortCol = null;
    dom.searchInput.value = '';
    dom.fileNameBadge.textContent = state.sourceFileName + ' (復元)';
    enableToolbar();
    render();
    toast('データを復元しました', 'success');
  } catch (e) {
    toast('復元に失敗しました', 'error');
  }
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ============================================================
   UTILS
   ============================================================ */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(n) { return String(n).padStart(2, '0'); }

/* ============================================================
   BOOT
   ============================================================ */
init();
