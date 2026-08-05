(() => {
  'use strict';

  const CRITERIA = [
    { key: 'design', label: '🎨 Design', input: 'inputDesign' },
    { key: 'usefulness', label: '🚀 Usefulness', input: 'inputUsefulness' },
    { key: 'wow', label: '🤯 Wow Factor', input: 'inputWow' },
    { key: 'freeValue', label: '💸 Free Value', input: 'inputFreeValue' },
    { key: 'returnValue', label: '🎯 Return Value', input: 'inputReturn' },
  ];

  const EPISODE_KEY = 'igl_site_count_v1';

  const scenes = {};
  document.querySelectorAll('.scene').forEach(el => { scenes[el.dataset.scene] = el; });

  const episodeTag = document.getElementById('episodeTag');
  const homeBtn = document.getElementById('homeBtn');
  const flashOverlay = document.getElementById('flashOverlay');

  let siteCount = Number(localStorage.getItem(EPISODE_KEY)) || 0;
  let currentEntry = null;
  let activeScene = 'intro';

  function updateEpisodeTag() {
    if (siteCount > 0) {
      episodeTag.textContent = 'SITE #' + String(siteCount).padStart(3, '0');
      episodeTag.hidden = false;
    } else {
      episodeTag.hidden = true;
    }
  }
  updateEpisodeTag();

  function goToScene(name) {
    if (!scenes[name]) return;
    scenes[activeScene].classList.remove('active');
    scenes[name].classList.add('active');
    activeScene = name;
  }

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goToScene(btn.dataset.goto));
  });

  homeBtn.addEventListener('click', () => goToScene('intro'));

  // ---------- Setup -> Performer ----------
  const revealPerformerBtn = document.getElementById('revealPerformerBtn');
  revealPerformerBtn.addEventListener('click', () => {
    const name = document.getElementById('inputName').value.trim();
    if (!name) {
      document.getElementById('inputName').focus();
      return;
    }
    const tagline = document.getElementById('inputTagline').value.trim();
    const scores = {};
    CRITERIA.forEach(c => {
      const raw = Number(document.getElementById(c.input).value);
      scores[c.key] = Number.isFinite(raw) ? Math.max(0, Math.min(10, raw)) : 0;
    });

    currentEntry = { name, tagline, scores };
    siteCount += 1;
    localStorage.setItem(EPISODE_KEY, String(siteCount));
    updateEpisodeTag();

    document.getElementById('performerName').textContent = currentEntry.name;
    document.getElementById('performerTagline').textContent = currentEntry.tagline || '';
    document.getElementById('performerTagline').style.display = currentEntry.tagline ? '' : 'none';

    goToScene('performer');
  });

  // ---------- Performer -> Scorecard ----------
  const scoreItBtn = document.getElementById('scoreItBtn');
  const scorecardRows = document.getElementById('scorecardRows');
  const finalVerdictBtn = document.getElementById('finalVerdictBtn');

  scoreItBtn.addEventListener('click', () => {
    document.getElementById('scorecardName').textContent = currentEntry.name;
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
      row.dataset.target = currentEntry.scores[c.key];
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
    const values = CRITERIA.map(c => currentEntry.scores[c.key]);
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
    document.getElementById('inputName').value = '';
    document.getElementById('inputTagline').value = '';
    CRITERIA.forEach(c => { document.getElementById(c.input).value = 8; });
    goToScene('setup');
    document.getElementById('inputName').focus();
  });

  document.getElementById('endShowBtn').addEventListener('click', () => goToScene('intro'));

  // ---------- Keyboard shortcuts ----------
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Escape') {
      goToScene('intro');
      return;
    }

    if (isTyping) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const buttons = scenes[activeScene].querySelectorAll('.btn-stage');
      const primaryBtn = Array.from(buttons).find(b => b.offsetParent !== null);
      if (primaryBtn) primaryBtn.click();
    }
  });
})();
