// Leonida Trophy Ledger — offline GTA VI trophy guide and tracker.
// Loads app/data/trophies.json, renders the checklist, and keeps progress in
// localStorage. No network requests beyond its own files; source links are
// plain anchors the reader follows, never fetched by the app.

const STORAGE_KEY = 'gta6-trophy-guide-01-v1';
const SPOILER_KEY = 'gta6-trophy-guide-01-spoilers';
const SOURCE_LINKS = {
  'Official list — Exophase': 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/',
  'PSN targets — PSNProfiles': 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi',
  'PowerPyx — GTA 6 Trophy Guide & Roadmap': 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/'
};

let guideData = null;
let earned = new Set();
let kindFilter = 'all';
let searchQuery = '';
let spoilerOn = false;
let selectedId = null;

const $ = (id) => document.getElementById(id);

function loadTrophies() {
  return fetch('data/trophies.json').then((res) => {
    if (!res.ok) throw new Error('trophies.json did not load');
    return res.json();
  });
}

function readSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set((ids || []).filter((n) => Number.isInteger(n)));
  } catch (err) {
    return new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ app: 'gta6-trophy-guide-01', version: 1, earned: [...earned].sort((a, b) => a - b) }));
  } catch (err) { /* storage full or blocked: progress just does not persist */ }
}

function seedDemoProgress(count) {
  const n = Math.max(0, Math.min(55, count));
  earned = new Set(guideData.trophies.slice(0, n).map((t) => t.id));
  saveProgress();
}

function spoilerMasked(trophy) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.id);
}

function visibleTrophies() {
  const q = searchQuery.trim().toLowerCase();
  return guideData.trophies.filter((t) => {
    if (kindFilter === 'missable' && !t.missable) return false;
    if (kindFilter === 'online') return false;
    if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
    if (q) {
      if (spoilerMasked(t)) return 'hidden story trophy'.includes(q);
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', misc: 'Hidden' }[kind] || kind;
}

function renderProgress() {
  const total = guideData.trophies.length;
  const got = earned.size;
  $('earnedCount').textContent = String(got);
  $('earnedPct').textContent = Math.round((got / total) * 100) + '%';
  $('progressFill').style.width = ((got / total) * 100) + '%';
  $('platinumState').textContent = earned.has(1) ? 'earned!' : 'not yet earned';
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  $('gradeCounts').innerHTML = grades.map((g) => {
    const all = guideData.trophies.filter((t) => t.grade === g).length;
    const done = guideData.trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return '<b>' + done + '/' + all + '</b> ' + g;
  }).join(' &middot; ');
}

function trophyRow(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(trophy.id) ? ' earned' : '') + (selectedId === trophy.id ? ' selected' : '');
  const masked = spoilerMasked(trophy);

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'trophy-check';
  check.checked = earned.has(trophy.id);
  check.setAttribute('aria-label', 'Mark ' + (masked ? 'this hidden story trophy' : trophy.name) + ' earned');
  check.addEventListener('click', (ev) => ev.stopPropagation());
  check.addEventListener('change', () => {
    if (check.checked) earned.add(trophy.id); else earned.delete(trophy.id);
    saveProgress();
    renderAll();
  });
  li.appendChild(check);

  const medal = document.createElement('span');
  medal.className = 'medal ' + trophy.grade;
  medal.title = gradeLabel(trophy.grade);
  li.appendChild(medal);

  const body = document.createElement('div');
  body.className = 'trophy-body';
  const name = document.createElement('div');
  name.className = 'trophy-name';
  name.textContent = masked ? 'Hidden story trophy' : trophy.name;
  body.appendChild(name);
  const desc = document.createElement('div');
  desc.className = 'trophy-desc';
  desc.textContent = masked ? 'Earn it to reveal the name and description.' : trophy.description;
  body.appendChild(desc);
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag grade-' + trophy.grade;
  gradeTag.textContent = gradeLabel(trophy.grade);
  meta.appendChild(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(trophy.kind);
  meta.appendChild(kindTag);
  if (trophy.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = 'Missable';
    meta.appendChild(m);
  }
  if (trophy.hidden && !masked) {
    const h = document.createElement('span');
    h.className = 'tag hidden';
    h.textContent = 'Hidden on PSN';
    meta.appendChild(h);
  }
  if (trophy.target) {
    const tg = document.createElement('span');
    tg.className = 'tag target';
    tg.textContent = 'PSN target: ' + (trophy.targetLabel || trophy.target);
    meta.appendChild(tg);
  }
  body.appendChild(meta);
  li.appendChild(body);

  li.addEventListener('click', () => {
    selectedId = trophy.id;
    renderTrophyList();
    renderDetail();
  });
  return li;
}

function renderTrophyList() {
  const list = $('trophyList');
  list.innerHTML = '';
  const shown = visibleTrophies();
  if (kindFilter === 'online') {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = 'There are no online trophies: all 55 trophies in Grand Theft Auto VI are offline single-player, and the platinum needs no multiplayer or DLC. (PowerPyx trophy roadmap; Exophase list.)';
    list.appendChild(note);
    return;
  }
  if (shown.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = 'No trophies match this filter and search. Clear the search or pick another kind.';
    list.appendChild(note);
    return;
  }
  shown.forEach((t) => list.appendChild(trophyRow(t)));
}

function sourceLink(label) {
  const a = document.createElement('a');
  a.textContent = label;
  a.href = SOURCE_LINKS[label] || '#';
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function renderDetail() {
  const pane = $('detail');
  pane.innerHTML = '';
  const trophy = guideData.trophies.find((t) => t.id === selectedId);
  if (!trophy) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and its sources.';
    pane.appendChild(p);
    return;
  }
  if (spoilerMasked(trophy)) {
    const h = document.createElement('h3');
    h.textContent = 'Hidden story trophy';
    pane.appendChild(h);
    const p = document.createElement('p');
    p.className = 'official';
    p.textContent = 'Spoilers are on, and this story trophy is not earned yet — its name, description and guide stay hidden until you tick it off.';
    pane.appendChild(p);
    return;
  }
  const h = document.createElement('h3');
  h.textContent = trophy.name;
  pane.appendChild(h);
  const off = document.createElement('p');
  off.className = 'official';
  off.textContent = 'Official: "' + trophy.description + '" — ' + gradeLabel(trophy.grade) + ' trophy.';
  pane.appendChild(off);
  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  meta.innerHTML = '';
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(trophy.kind);
  meta.appendChild(kindTag);
  if (trophy.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = 'Missable';
    meta.appendChild(m);
  }
  if (trophy.target) {
    const tg = document.createElement('span');
    tg.className = 'tag target';
    tg.textContent = 'PSN target: ' + (trophy.targetLabel || trophy.target);
    meta.appendChild(tg);
  }
  pane.appendChild(meta);
  if (trophy.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = 'Potentially missable — read the timing note in the guide below before you play past Chapter 1.';
    pane.appendChild(warn);
  }
  const gl = document.createElement('p');
  gl.className = 'guide-label';
  gl.textContent = 'Guide — in our own words';
  pane.appendChild(gl);
  const g = document.createElement('p');
  g.className = 'guide';
  g.textContent = trophy.guide;
  pane.appendChild(g);
  const sl = document.createElement('p');
  sl.className = 'sources-label';
  sl.textContent = 'Sources for this guide';
  pane.appendChild(sl);
  const ul = document.createElement('ul');
  ul.className = 'sources';
  trophy.sources.forEach((label) => {
    const li = document.createElement('li');
    li.appendChild(sourceLink(label));
    ul.appendChild(li);
  });
  pane.appendChild(ul);
  const earnedBtn = document.createElement('button');
  earnedBtn.type = 'button';
  earnedBtn.textContent = earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned';
  earnedBtn.addEventListener('click', () => {
    if (earned.has(trophy.id)) earned.delete(trophy.id); else earned.add(trophy.id);
    saveProgress();
    renderAll();
  });
  pane.appendChild(document.createElement('br'));
  pane.appendChild(earnedBtn);
}

function renderRoadmap() {
  const host = $('roadmap');
  host.innerHTML = '';
  guideData.roadmap.forEach((stage) => {
    const box = document.createElement('div');
    box.className = 'roadmap-stage';
    const h = document.createElement('h3');
    h.textContent = stage.title;
    box.appendChild(h);
    const p = document.createElement('p');
    p.textContent = stage.text;
    box.appendChild(p);
    const ul = document.createElement('ul');
    guideData.trophies.filter((t) => t.stage === stage.stage).forEach((t) => {
      const li = document.createElement('li');
      if (earned.has(t.id)) li.className = 'done';
      li.textContent = (spoilerMasked(t) ? 'Hidden story trophy' : t.name) + ' — ' + gradeLabel(t.grade) + (t.missable ? ' — MISSABLE' : '');
      ul.appendChild(li);
    });
    box.appendChild(ul);
    host.appendChild(box);
  });
}

function renderMissable() {
  const host = $('missableList');
  host.innerHTML = '';
  guideData.trophies.filter((t) => t.missable).forEach((t) => {
    const box = document.createElement('div');
    box.className = 'roadmap-stage';
    const h = document.createElement('h3');
    h.textContent = t.name + ' — ' + gradeLabel(t.grade);
    box.appendChild(h);
    const p = document.createElement('p');
    p.textContent = t.guide;
    box.appendChild(p);
    const sl = document.createElement('p');
    sl.className = 'sources-label';
    sl.textContent = 'Sources';
    box.appendChild(sl);
    const ul = document.createElement('ul');
    ul.className = 'sources';
    t.sources.forEach((label) => {
      const li = document.createElement('li');
      li.appendChild(sourceLink(label));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    host.appendChild(box);
  });
  const note = document.createElement('p');
  note.className = 'empty-note';
  note.textContent = 'Every other trophy is safe: PowerPyx confirms all trophy-related quest givers return after the story, optional missions that expire do not matter for trophies, and the 100% checklist is fully doable in free-roam.';
  host.appendChild(note);
}

function renderSources() {
  const host = $('sourceList');
  host.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'source-list';
  const entries = [
    ['Official list — Exophase', 'Every trophy name, description and grade as PlayStation publishes them, cross-checked against PSNProfiles.'],
    ['PSN targets — PSNProfiles', 'The progress target PlayStation tracks for each counted trophy (for example 250 stunts, 42 shooting range challenges, 18 meditation spots).'],
    ['PowerPyx — GTA 6 Trophy Guide & Roadmap', 'The launch-day guide this ledger draws its how-to detail from: the 3-stage roadmap, the Chapter 1 meditation warning, the 100% checklist figures, and the per-trophy walkthrough notes — all rewritten in our own words and cited per trophy.']
  ];
  entries.forEach(([label, note]) => {
    const li = document.createElement('li');
    li.appendChild(sourceLink(label));
    const p = document.createElement('p');
    p.textContent = note;
    li.appendChild(p);
    ul.appendChild(li);
  });
  host.appendChild(ul);
}

function renderAll() {
  renderProgress();
  renderTrophyList();
  renderDetail();
  renderRoadmap();
  renderMissable();
  renderSources();
}

function setView(view) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'view-' + view; });
  $('controls').style.display = view === 'tracker' ? '' : 'none';
}

function exportProgress() {
  const payload = { app: 'gta6-trophy-guide-01', version: 1, exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('status').textContent = 'Exported ' + earned.size + ' earned trophies to gta6-trophy-progress.json.';
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(guideData.trophies.map((t) => t.id));
      const next = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      earned = next;
      saveProgress();
      renderAll();
      $('status').textContent = 'Imported ' + earned.size + ' earned trophies from ' + file.name + '.';
    } catch (err) {
      $('status').textContent = 'Import failed: that file is not a progress export from this guide.';
    }
  };
  reader.readAsText(file);
}

function bindControls() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
    kindFilter = b.dataset.kind;
    renderTrophyList();
  }));
  $('search').addEventListener('input', (ev) => {
    searchQuery = ev.target.value;
    renderTrophyList();
  });
  spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
  $('spoilerToggle').checked = spoilerOn;
  $('spoilerToggle').addEventListener('change', (ev) => {
    spoilerOn = ev.target.checked;
    try { localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0'); } catch (err) {}
    renderAll();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (ev) => {
    if (ev.target.files && ev.target.files[0]) importProgress(ev.target.files[0]);
    ev.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    earned = new Set();
    saveProgress();
    renderAll();
    $('status').textContent = 'Progress reset. All 55 trophies are unmarked.';
  });
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  loadTrophies().then((data) => {
    guideData = data;
    earned = readSavedProgress();
    if (params.has('seed')) seedDemoProgress(parseInt(params.get('seed'), 10) || 0);
    bindControls();
    if (params.get('spoilers') === '1') {
      spoilerOn = true;
      $('spoilerToggle').checked = true;
      try { localStorage.setItem(SPOILER_KEY, '1'); } catch (err) {}
    }
    const kind = params.get('kind');
    if (kind && document.querySelector('.chip[data-kind="' + kind + '"]')) {
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.kind === kind));
      kindFilter = kind;
    }
    renderAll();
    const view = params.get('view');
    if (view && document.querySelector('.tab[data-view="' + view + '"]')) setView(view);
    const detail = parseInt(params.get('detail'), 10);
    if (detail && guideData.trophies.some((t) => t.id === detail)) {
      selectedId = detail;
      renderTrophyList();
      renderDetail();
    }
  }).catch((err) => {
    $('trophyList').innerHTML = '<li class="empty-note">The trophy list could not be loaded. Open this guide from its own files (app/index.html) — it needs its data file beside it.</li>';
  });
}

boot();
