// Leonida Trophy Ledger — tracker logic. No build step, no network at run time
// beyond fetching this app's own data file (app/data/trophies.json). Progress
// lives in localStorage; export writes a JSON file, import reads one back.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-trophy-ledger-v1';
const SPOILER_KEY = 'leonida-trophy-ledger-spoilers';

const STAGES = [
  {
    stage: 1,
    title: 'Stage 1 — Story first',
    hours: '~60–80 hours',
    blurb: 'Play the story straight through, Chapters 1 to 5. Do the Chapter 1 meditation while you are there.',
  },
  {
    stage: 2,
    title: 'Stage 2 — The 100% checklist',
    hours: '~100 hours',
    blurb: 'Stunts, shooting ranges, drone races, WAiNK scans, cards, vehicles, vaults and shops — the bulk of the list.',
  },
  {
    stage: 3,
    title: 'Stage 3 — Strangers & Freaks + cleanup',
    hours: '~10 hours',
    blurb: 'Finish the stranger strands and the quest-givers, re-check the four unconfirmed trophies, then the platinum.',
  },
];

let trophies = [];
let earned = new Set();
let spoilersHidden = false;
let hideEarned = false;
let activeKind = 'all';
let activeGrade = 'all';
let query = '';
let openId = null;

const listEl = document.getElementById('trophy-list');
const stagesEl = document.getElementById('stages');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const shownCount = document.getElementById('shown-count');
const emptyNote = document.getElementById('empty-note');

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    if (Array.isArray(ids)) earned = new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    earned = new Set();
  }
  spoilersHidden = localStorage.getItem(SPOILER_KEY) === '1';
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  localStorage.setItem(SPOILER_KEY, spoilersHidden ? '1' : '0');
}

function gradeLabel(grade) {
  return grade === 'platinum' ? 'Platinum' : grade[0].toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  const labels = {
    platinum: 'Platinum',
    story: 'Story',
    collectibles: 'Collectibles',
    activities: 'Activities',
    completion: '100% completion',
  };
  return labels[kind] || kind;
}

function trophyMatches(trophy) {
  if (activeKind === 'online') return false;
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && trophy.kind !== activeKind) return false;
  if (activeGrade !== 'all' && trophy.grade !== activeGrade) return false;
  if (hideEarned && earned.has(trophy.id)) return false;
  if (query && !trophy.name.toLowerCase().includes(query)) return false;
  return true;
}

function spoilerHides(trophy) {
  return spoilersHidden && trophy.kind === 'story' && !earned.has(trophy.id);
}

function sourceLinks(sources) {
  return sources
    .map((source) => {
      const match = source.match(/^(.*) \((https?:\/\/[^)]+)\)$/);
      if (!match) return escapeHtml(source);
      return `<a href="${match[2]}" target="_blank" rel="noopener">${escapeHtml(match[1])}</a>`;
    })
    .join(' · ');
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRoadmap() {
  stagesEl.innerHTML = STAGES.map((stage) => {
    const members = trophies.filter((t) => t.stage === stage.stage);
    const names = members
      .slice(0, 8)
      .map((t) => `<li>${escapeHtml(t.name)}</li>`)
      .join('');
    const extra = members.length > 8 ? `<li>…and ${members.length - 8} more in this stage</li>` : '';
    return `<article class="stage">
      <h3>${escapeHtml(stage.title)}</h3>
      <p class="stage-hours">${escapeHtml(stage.hours)} · ${members.length} trophies</p>
      <p>${escapeHtml(stage.blurb)}</p>
      <ul>${names}${extra}</ul>
    </article>`;
  }).join('');
}

function renderTrophyList() {
  const shown = trophies.filter(trophyMatches);
  shownCount.textContent = `(${shown.length} of ${trophies.length} shown)`;
  emptyNote.hidden = shown.length > 0;

  listEl.innerHTML = shown.map((trophy) => {
    const isEarned = earned.has(trophy.id);
    const hidden = spoilerHides(trophy);
    const unconfirmed = trophy.guide.startsWith('NOT YET CONFIRMED');
    const classes = ['trophy-card'];
    if (isEarned) classes.push('earned');
    if (trophy.missable) classes.push('missable-flag');
    if (unconfirmed) classes.push('unconfirmed-flag');

    const name = hidden ? 'Hidden trophy — earn it to reveal it' : escapeHtml(trophy.name);
    const desc = hidden
      ? '<p class="trophy-desc spoiler-hidden">Description hidden while spoilers are on.</p>'
      : `<p class="trophy-desc">“${escapeHtml(trophy.description)}”</p>`;
    const guide = hidden
      ? '<p class="trophy-guide spoiler-hidden">Guide hidden while spoilers are on — earn this trophy to reveal it.</p>'
      : `<p class="trophy-guide">${escapeHtml(trophy.guide)}</p>`;
    const sources = hidden
      ? ''
      : `<p class="trophy-sources">Sources: ${sourceLinks(trophy.sources)}</p>`;

    const badges = [`<span class="badge badge-${trophy.grade}">${gradeLabel(trophy.grade)}</span>`];
    badges.push(`<span class="badge badge-kind">${kindLabel(trophy.kind)}</span>`);
    if (trophy.target !== null) {
      badges.push(`<span class="badge badge-target">${trophy.target.toLocaleString('en-US')} ${escapeHtml(trophy.targetUnit)}</span>`);
    }
    if (trophy.missable) badges.push('<span class="badge badge-missable">Missable</span>');
    if (unconfirmed) badges.push('<span class="badge badge-unconfirmed">Not yet confirmed</span>');
    if (trophy.hidden) badges.push('<span class="badge badge-kind">Hidden on PSN</span>');

    const expanded = openId === trophy.id ? ' open' : '';
    return `<article class="${classes.join(' ')}" data-id="${trophy.id}">
      <div class="trophy-head">
        <input type="checkbox" class="trophy-check" data-id="${trophy.id}" ${isEarned ? 'checked' : ''} aria-label="Mark ${escapeHtml(trophy.name)} as earned">
        <div class="trophy-title">
          <h3 class="trophy-name">${name}</h3>
          <div class="trophy-badges">${badges.join('')}</div>
        </div>
      </div>
      <details${expanded}>
        <summary>Guide &amp; sources</summary>
        ${desc}
        ${guide}
        ${sources}
      </details>
    </article>`;
  }).join('');
}

function updateProgressBar() {
  const count = earned.size;
  const total = trophies.length || 55;
  const pct = Math.round((count / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${count} / ${total} earned · ${pct}% to the platinum`;
}

function renderAll() {
  renderRoadmap();
  renderTrophyList();
  updateProgressBar();
}

function toggleEarned(id, checked) {
  if (checked) earned.add(id);
  else earned.delete(id);
  saveProgress();
  renderTrophyList();
  updateProgressBar();
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-ledger',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-trophy-progress.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((n) => Number.isInteger(n) && known.has(n)));
      saveProgress();
      renderAll();
    } catch {
      alert('That file is not a Leonida Trophy Ledger export.');
    }
  };
  reader.readAsText(file);
}

function applyUrlState() {
  const params = new URLSearchParams(location.search);
  const kind = params.get('filter');
  if (kind && ['all', 'story', 'missable', 'collectibles', 'activities', 'online'].includes(kind)) {
    activeKind = kind;
  }
  const grade = params.get('grade');
  if (grade && ['all', 'platinum', 'gold', 'silver', 'bronze'].includes(grade)) activeGrade = grade;
  if (params.get('spoilers') === 'on') spoilersHidden = true;
  const open = Number(params.get('open'));
  if (Number.isInteger(open)) openId = open;
}

// Scroll after the list has rendered, so the target is at its final position:
// an opened trophy card in the middle of the viewport, a requested section at
// the top, or the checklist when a filter or the spoiler setting is on.
function scrollToRequestedView() {
  if (openId !== null) {
    const card = listEl.querySelector(`[data-id="${openId}"]`);
    if (card) {
      card.scrollIntoView({ block: 'center' });
      return;
    }
  }
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  if (view === 'roadmap' || view === 'checklist') {
    document.getElementById(view)?.scrollIntoView();
    return;
  }
  if (activeKind !== 'all' || activeGrade !== 'all' || spoilersHidden) {
    document.getElementById('checklist')?.scrollIntoView();
  }
}

function wireControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    renderTrophyList();
  });

  document.getElementById('grade-filter').addEventListener('change', (event) => {
    activeGrade = event.target.value;
    renderTrophyList();
  });

  document.querySelectorAll('.kind-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.kind-btn').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      activeKind = button.dataset.kind;
      renderTrophyList();
    });
  });

  const spoilerToggle = document.getElementById('spoiler-toggle');
  spoilerToggle.checked = spoilersHidden;
  spoilerToggle.addEventListener('change', (event) => {
    spoilersHidden = event.target.checked;
    saveProgress();
    renderTrophyList();
  });

  const hideEarnedToggle = document.getElementById('hide-earned-toggle');
  hideEarnedToggle.addEventListener('change', (event) => {
    hideEarned = event.target.checked;
    renderTrophyList();
  });

  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });

  listEl.addEventListener('change', (event) => {
    const box = event.target.closest('.trophy-check');
    if (box) toggleEarned(Number(box.dataset.id), box.checked);
  });
}

async function loadTrophies() {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = data.trophies;
  loadProgress();
  applyUrlState();
  document.getElementById('grade-filter').value = activeGrade;
  document.querySelectorAll('.kind-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.kind === activeKind);
  });
  wireControls();
  renderAll();
  // Scroll synchronously: scrollIntoView forces layout, so the target is at
  // its final position. (A rAF-deferred scroll was racing the first paint in
  // headless screenshots and landing on a blank region.)
  scrollToRequestedView();
}

loadTrophies();
