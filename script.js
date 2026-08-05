(() => {
  'use strict';

  const STORAGE_KEY = 'igl_entries_v1';

  const CRITERIA = [
    { key: 'design', label: '🎨 Design & Vibes', short: '🎨 Design' },
    { key: 'ux', label: '🧭 Usability / UX', short: '🧭 UX' },
    { key: 'content', label: '📄 Content Quality', short: '📄 Content' },
    { key: 'latent', label: '🫠 Latent Factor', short: '🫠 Latent' },
    { key: 'chaos', label: '🎭 Entertainment / Chaos', short: '🎭 Chaos' },
  ];

  const form = document.getElementById('siteForm');
  const editingIdInput = document.getElementById('editingId');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const entriesList = document.getElementById('entriesList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const exportBtn = document.getElementById('exportBtn');
  const importInput = document.getElementById('importInput');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const cardTemplate = document.getElementById('entryCardTemplate');

  const statCount = document.getElementById('statCount');
  const statAvg = document.getElementById('statAvg');
  const statGoat = document.getElementById('statGoat');

  const sliders = {};
  CRITERIA.forEach(c => {
    const input = document.getElementById('score' + capitalize(c.key));
    const live = document.getElementById('live' + capitalize(c.key));
    sliders[c.key] = { input, live };
    input.addEventListener('input', () => { live.textContent = input.value; });
  });

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  let entries = loadEntries();

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load entries', e);
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function computeOverall(scores) {
    const vals = CRITERIA.map(c => Number(scores[c.key]) || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }

  function getVerdict(avg) {
    if (avg >= 8.5) return { label: '🐐 ABSOLUTE GOAT', cls: 'verdict-goat' };
    if (avg >= 7) return { label: '🔥 CERTIFIED LATENT', cls: 'verdict-fire' };
    if (avg >= 5) return { label: '😐 DECENT NGL', cls: 'verdict-mid' };
    if (avg >= 3) return { label: '🥴 MID AT BEST', cls: 'verdict-mid' };
    return { label: '💀 UNINSTALL THIS', cls: 'verdict-rough' };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function resetForm() {
    form.reset();
    editingIdInput.value = '';
    CRITERIA.forEach(c => {
      sliders[c.key].input.value = 5;
      sliders[c.key].live.textContent = '5';
    });
    submitBtn.textContent = 'SEND TO THE PANEL 🎤';
    cancelEditBtn.hidden = true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('siteName').value.trim();
    const url = document.getElementById('siteUrl').value.trim();
    if (!name || !url) return;

    const scores = {};
    CRITERIA.forEach(c => { scores[c.key] = Number(sliders[c.key].input.value); });

    const editingId = editingIdInput.value;

    if (editingId) {
      const entry = entries.find(en => en.id === editingId);
      if (entry) {
        entry.name = name;
        entry.url = url;
        entry.category = document.getElementById('siteCategory').value;
        entry.thumb = document.getElementById('thumbUrl').value.trim();
        entry.notes = document.getElementById('judgeNotes').value.trim();
        entry.scores = scores;
      }
    } else {
      entries.push({
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        name,
        url,
        category: document.getElementById('siteCategory').value,
        thumb: document.getElementById('thumbUrl').value.trim(),
        notes: document.getElementById('judgeNotes').value.trim(),
        scores,
        createdAt: Date.now(),
      });
    }

    saveEntries();
    resetForm();
    render();
  });

  cancelEditBtn.addEventListener('click', resetForm);

  function startEdit(id) {
    const entry = entries.find(en => en.id === id);
    if (!entry) return;
    editingIdInput.value = entry.id;
    document.getElementById('siteName').value = entry.name;
    document.getElementById('siteUrl').value = entry.url;
    document.getElementById('siteCategory').value = entry.category;
    document.getElementById('thumbUrl').value = entry.thumb || '';
    document.getElementById('judgeNotes').value = entry.notes || '';
    CRITERIA.forEach(c => {
      const v = entry.scores[c.key] ?? 5;
      sliders[c.key].input.value = v;
      sliders[c.key].live.textContent = v;
    });
    submitBtn.textContent = 'UPDATE ENTRY ✏️';
    cancelEditBtn.hidden = false;
    document.getElementById('entryForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteEntry(id) {
    if (!confirm('Send this contestant home for good? This cannot be undone.')) return;
    entries = entries.filter(en => en.id !== id);
    saveEntries();
    render();
  }

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'internet-got-latent-entries.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        const existingIds = new Set(entries.map(en => en.id));
        imported.forEach(en => {
          if (!en.id || existingIds.has(en.id)) {
            en.id = 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          }
        });
        entries = entries.concat(imported);
        saveEntries();
        render();
      } catch (err) {
        alert('Could not import that file — make sure it is a JSON export from this tool.');
      } finally {
        importInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  clearAllBtn.addEventListener('click', () => {
    if (!entries.length) return;
    if (!confirm('Clear ALL contestants from the stage? This cannot be undone.')) return;
    entries = [];
    saveEntries();
    render();
  });

  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);

  function getFilteredSorted() {
    const query = searchInput.value.trim().toLowerCase();
    let list = entries.filter(en => en.name.toLowerCase().includes(query));

    const sortMode = sortSelect.value;
    list = list.slice().sort((a, b) => {
      const overallA = computeOverall(a.scores);
      const overallB = computeOverall(b.scores);
      switch (sortMode) {
        case 'score-asc': return overallA - overallB;
        case 'date-desc': return b.createdAt - a.createdAt;
        case 'date-asc': return a.createdAt - b.createdAt;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'score-desc':
        default: return overallB - overallA;
      }
    });
    return list;
  }

  function render() {
    const list = getFilteredSorted();
    entriesList.innerHTML = '';
    emptyState.style.display = entries.length === 0 ? 'block' : 'none';

    list.forEach((entry, index) => {
      const node = cardTemplate.content.cloneNode(true);
      const overall = computeOverall(entry.scores);
      const verdict = getVerdict(overall);

      const thumbEl = node.querySelector('[data-thumb]');
      if (entry.thumb && /^https?:\/\//i.test(entry.thumb)) {
        thumbEl.style.backgroundImage = `url("${entry.thumb.replace(/["\\]/g, '')}")`;
        thumbEl.textContent = '';
      } else {
        thumbEl.textContent = (entry.name.trim()[0] || '?').toUpperCase();
      }

      node.querySelector('[data-number]').textContent = 'SITE #' + String(index + 1).padStart(3, '0');

      const verdictEl = node.querySelector('[data-verdict]');
      verdictEl.textContent = verdict.label;
      verdictEl.classList.add(verdict.cls);

      const linkEl = node.querySelector('[data-link]');
      linkEl.href = entry.url;
      linkEl.textContent = entry.name;

      node.querySelector('[data-category]').textContent = entry.category || 'Other';
      node.querySelector('[data-overall]').textContent = overall.toFixed(1);

      const barsEl = node.querySelector('[data-bars]');
      CRITERIA.forEach(c => {
        const val = Number(entry.scores[c.key]) || 0;
        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
          <span class="bar-label">${c.short}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${val * 10}%"></span></span>
          <span class="bar-value">${val}</span>
        `;
        barsEl.appendChild(row);
      });

      const notesEl = node.querySelector('[data-notes]');
      if (entry.notes) {
        notesEl.textContent = '"' + entry.notes + '"';
      } else {
        notesEl.remove();
      }

      node.querySelector('[data-edit]').addEventListener('click', () => startEdit(entry.id));
      node.querySelector('[data-delete]').addEventListener('click', () => deleteEntry(entry.id));

      entriesList.appendChild(node);
    });

    renderStats();
  }

  function renderStats() {
    statCount.textContent = entries.length;
    if (entries.length === 0) {
      statAvg.textContent = '0.0';
      statGoat.textContent = '0';
      return;
    }
    const overalls = entries.map(en => computeOverall(en.scores));
    const avg = overalls.reduce((a, b) => a + b, 0) / overalls.length;
    statAvg.textContent = avg.toFixed(1);
    statGoat.textContent = overalls.filter(o => o >= 8.5).length;
  }

  render();
})();
