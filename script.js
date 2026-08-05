(() => {
  'use strict';

  const CRITERIA = [
    { key: 'firstImpression', label: '👀 First Impression', input: 'inputFirstImpression' },
    { key: 'wow', label: '🤯 Wow Factor', input: 'inputWow' },
    { key: 'usefulness', label: '🚀 Usefulness', input: 'inputUsefulness' },
    { key: 'returnValue', label: '🎯 Return Value', input: 'inputReturn' },
  ];

  const STATE_KEY = 'igl_show_state_v2';

  const scenes = {};
  document.querySelectorAll('.scene').forEach(el => { scenes[el.dataset.scene] = el; });

  const episodeTag = document.getElementById('episodeTag');
  const homeBtn = document.getElementById('homeBtn');
  const flashOverlay = document.getElementById('flashOverlay');

  let activeScene = 'intro';

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return { queue: [], currentIndex: 0 };
      const parsed = JSON.parse(raw);
      return {
        queue: Array.isArray(parsed.queue) ? parsed.queue : [],
        currentIndex: Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : 0,
      };
    } catch (e) {
      return { queue: [], currentIndex: 0 };
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function goToScene(name) {
    if (!scenes[name]) return;
    scenes[activeScene].classList.remove('active');
    scenes[name].classList.add('active');
    activeScene = name;
  }

  function updateEpisodeTag() {
    if (state.queue.length > 0 && state.currentIndex < state.queue.length) {
      episodeTag.textContent = 'SITE ' + (state.currentIndex + 1) + ' OF ' + state.queue.length;
      episodeTag.hidden = false;
    } else {
      episodeTag.hidden = true;
    }
  }

  homeBtn.addEventListener('click', () => { refreshIntroButton(); goToScene('intro'); });

  // ---------- Intro (dynamic action button) ----------
  const introActionBtn = document.getElementById('introActionBtn');
  const introEditLineupBtn = document.getElementById('introEditLineupBtn');

  function refreshIntroButton() {
    const hasPending = state.queue.length > 0 && state.currentIndex < state.queue.length;

    if (state.queue.length === 0) {
      introActionBtn.textContent = '📝 BUILD LINEUP';
      introActionBtn.onclick = () => { renderQueueList(); goToScene('queue'); };
      introEditLineupBtn.hidden = true;
    } else if (hasPending) {
      introActionBtn.textContent = state.currentIndex === 0 ? '🎤 START SHOW' : '▶ RESUME SHOW';
      introActionBtn.onclick = () => {
        loadPerformer(state.currentIndex);
        goToScene('performer');
      };
      introEditLineupBtn.hidden = false;
    } else {
      introActionBtn.textContent = '📝 ADD MORE SITES';
      introActionBtn.onclick = () => { renderQueueList(); goToScene('queue'); };
      introEditLineupBtn.hidden = true;
    }
  }
  introEditLineupBtn.addEventListener('click', () => { renderQueueList(); goToScene('queue'); });

  // ---------- Queue management ----------
  const queueNameInput = document.getElementById('queueName');
  const queueTaglineInput = document.getElementById('queueTagline');
  const queueListEl = document.getElementById('queueList');
  const queueEmptyEl = document.getElementById('queueEmpty');
  const queueDoneBtn = document.getElementById('queueDoneBtn');

  function renderQueueList() {
    queueListEl.innerHTML = '';
    queueEmptyEl.style.display = state.queue.length === 0 ? '' : 'none';

    state.queue.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'queue-item';
      if (i < state.currentIndex) row.classList.add('is-done');
      if (i === state.currentIndex) row.classList.add('is-current');
      row.innerHTML = `
        <span class="queue-item__index">${i + 1}.</span>
        <span class="queue-item__text">
          <span class="queue-item__name"></span>
          <span class="queue-item__tagline"></span>
        </span>
        <button class="queue-item__remove" type="button" title="Remove">✕</button>
      `;
      row.querySelector('.queue-item__name').textContent = item.name;
      row.querySelector('.queue-item__tagline').textContent = item.tagline || '';
      row.querySelector('.queue-item__remove').addEventListener('click', () => removeQueueItem(item.id));
      queueListEl.appendChild(row);
    });

    updateEpisodeTag();
  }

  document.getElementById('addToQueueBtn').addEventListener('click', () => {
    const name = queueNameInput.value.trim();
    if (!name) {
      queueNameInput.focus();
      return;
    }
    const tagline = queueTaglineInput.value.trim();
    state.queue.push({ id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name, tagline });
    saveState();
    queueNameInput.value = '';
    queueTaglineInput.value = '';
    queueNameInput.focus();
    renderQueueList();
  });

  function removeQueueItem(id) {
    const idx = state.queue.findIndex(item => item.id === id);
    if (idx === -1) return;
    state.queue.splice(idx, 1);
    if (idx < state.currentIndex) state.currentIndex -= 1;
    saveState();
    renderQueueList();
  }

  queueDoneBtn.addEventListener('click', () => {
    refreshIntroButton();
    goToScene('intro');
  });

  // ---------- Performer reveal ----------
  function loadPerformer(index) {
    const item = state.queue[index];
    if (!item) return;
    document.getElementById('performerName').textContent = item.name;
    const taglineEl = document.getElementById('performerTagline');
    taglineEl.textContent = item.tagline || '';
    taglineEl.style.display = item.tagline ? '' : 'none';
    document.getElementById('scoreEntryName').textContent = item.name;
    updateEpisodeTag();
  }

  document.getElementById('scoreItBtn').addEventListener('click', () => {
    CRITERIA.forEach(c => { document.getElementById(c.input).value = 5; });
    goToScene('scoreEntry');
  });

  // ---------- Score entry -> Scorecard ----------
  const scorecardRows = document.getElementById('scorecardRows');
  const finalVerdictBtn = document.getElementById('finalVerdictBtn');
  let currentScores = null;

  document.getElementById('revealScorecardBtn').addEventListener('click', () => {
    currentScores = {};
    CRITERIA.forEach(c => {
      const raw = Number(document.getElementById(c.input).value);
      currentScores[c.key] = Number.isFinite(raw) ? Math.max(0, Math.min(10, raw)) : 0;
    });

    document.getElementById('scorecardName').textContent = state.queue[state.currentIndex].name;
    scorecardRows.innerHTML = '';
    finalVerdictBtn.hidden = true;

    CRITERIA.forEach(c => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <span class="row-label">${c.label}</span>
        <span class="row-track"><span class="row-fill"></span></span>
        <span class="row-value">0.0</span>
      `;
      row.dataset.target = currentScores[c.key];
      scorecardRows.appendChild(row);
    });

    goToScene('scorecard');
    runScorecardReveal();
  });

  function animateValue(fromVal, toVal, duration, onFrame, onDone) {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = fromVal + (toVal - fromVal) * eased;
      onFrame(value);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(tick);
  }

  function runScorecardReveal() {
    const rows = Array.from(scorecardRows.querySelectorAll('.score-row'));
    rows.forEach((row, i) => {
      setTimeout(() => {
        row.classList.add('show');
        const target = Number(row.dataset.target);
        const valueEl = row.querySelector('.row-value');
        const fillEl = row.querySelector('.row-fill');
        animateValue(0, target, 700, (v) => {
          valueEl.textContent = v.toFixed(1);
          fillEl.style.width = (v * 10) + '%';
        }, () => {
          row.classList.add('landed');
        });
      }, i * 550);
    });

    const totalDelay = rows.length * 550 + 750;
    setTimeout(() => {
      finalVerdictBtn.hidden = false;
      finalVerdictBtn.style.animation = 'riseIn 0.5s ease both';
    }, totalDelay);
  }

  // ---------- Scorecard -> Verdict ----------
  const finalScoreEl = document.getElementById('finalScore');
  const verdictLabelEl = document.getElementById('verdictLabel');
  const verdictActionsEl = document.getElementById('verdictActions');

  function getVerdict(avg) {
    if (avg >= 9) return { label: '🏆 INTERNET LEGEND', cls: 'verdict-goat' };
    if (avg >= 7.5) return { label: '🔥 CERTIFIED BANGER', cls: 'verdict-fire' };
    if (avg >= 6) return { label: '😎 SOLID FIND', cls: 'verdict-mid' };
    if (avg >= 4) return { label: '😬 MEH ENERGY', cls: 'verdict-mid' };
    return { label: '💀 CLOSE THE TAB', cls: 'verdict-rough' };
  }

  finalVerdictBtn.addEventListener('click', () => {
    const values = CRITERIA.map(c => currentScores[c.key]);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

    finalScoreEl.textContent = '0.0';
    verdictLabelEl.hidden = true;
    verdictLabelEl.classList.remove('verdict-goat', 'verdict-fire', 'verdict-mid', 'verdict-rough');
    verdictActionsEl.hidden = true;

    goToScene('verdict');

    finalScoreEl.classList.add('counting');
    animateValue(0, avg, 1400, (v) => {
      finalScoreEl.textContent = v.toFixed(1);
    }, () => {
      finalScoreEl.classList.remove('counting');
      finalScoreEl.textContent = avg.toFixed(1);

      flashOverlay.classList.remove('flash');
      void flashOverlay.offsetWidth;
      flashOverlay.classList.add('flash');

      const verdict = getVerdict(avg);
      verdictLabelEl.textContent = verdict.label;
      verdictLabelEl.classList.add(verdict.cls);
      verdictLabelEl.hidden = false;
      verdictLabelEl.style.animation = 'riseIn 0.5s ease both';

      setTimeout(() => {
        verdictActionsEl.hidden = false;
        verdictActionsEl.style.animation = 'riseIn 0.5s ease both';
      }, 300);
    });
  });

  // ---------- Verdict actions ----------
  document.getElementById('nextWebsiteBtn').addEventListener('click', () => {
    state.currentIndex += 1;
    saveState();
    updateEpisodeTag();

    if (state.currentIndex < state.queue.length) {
      loadPerformer(state.currentIndex);
      goToScene('performer');
    } else {
      goToScene('wrap');
    }
  });

  document.getElementById('endShowBtn').addEventListener('click', () => {
    refreshIntroButton();
    goToScene('intro');
  });

  // ---------- Wrap actions ----------
  document.getElementById('addMoreBtn').addEventListener('click', () => {
    renderQueueList();
    goToScene('queue');
  });
  document.getElementById('wrapHomeBtn').addEventListener('click', () => {
    refreshIntroButton();
    goToScene('intro');
  });

  // ---------- Keyboard shortcuts ----------
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Escape') {
      refreshIntroButton();
      goToScene('intro');
      return;
    }

    if (isTyping && e.key !== 'Enter') return;
    if (isTyping && activeScene === 'queue') return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const buttons = scenes[activeScene].querySelectorAll('.btn-stage');
      const primaryBtn = Array.from(buttons).find(b => b.offsetParent !== null && !b.disabled);
      if (primaryBtn) primaryBtn.click();
    }
  });

  // ---------- Init ----------
  updateEpisodeTag();
  refreshIntroButton();
})();
