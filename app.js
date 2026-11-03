// ResumePress – resume builder. Offline: everything stays in this browser profile (IndexedDB).
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// ---------- storage ----------
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => { const r = indexedDB.open('resumepress', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
async function dbGet(k) { const d = await db(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function dbSet(k, v) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function dbDel(k) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }

// ---------- Pro (Microsoft Store add-on via Digital Goods API) + one-time trial ----------
const STORE_BILLING = 'https://store.microsoft.com/billing';
const PRO_SKU = 'resumepress_pro';
const PRO_IDS = [PRO_SKU];
let STORE_URL = 'https://apps.microsoft.com/detail/9NRFXK36T685';
let proAvailable = false, proSku = PRO_SKU, isPro = false;
try { if ('getDigitalGoodsService' in window && localStorage.getItem('resumepress-proavail') === '1') proAvailable = true; } catch (_) {} // keep Pro limits when offline
try { isPro = localStorage.getItem('resumepress-pro') === '1'; } catch (_) {}
const TRIAL_DAYS = 7, DAY = 86400000;
let trialStart = 0;
try { trialStart = Number(localStorage.getItem('resumepress-trial')) || 0; } catch (_) {}
const trialLeft = () => (trialStart ? Math.max(0, Math.ceil((trialStart + TRIAL_DAYS * DAY - Date.now()) / DAY)) : 0);
const trialActive = () => trialLeft() > 0;
const unlocked = () => isPro || !proAvailable || trialActive();
const FREE_DOCS = 1, FREE_APPS = 5;
async function loadTrial() {
  const t = await dbGet('trial').catch(() => 0);
  trialStart = Math.max(trialStart, Number(t) || 0);
  if (trialStart) { try { localStorage.setItem('resumepress-trial', String(trialStart)); } catch (_) {} dbSet('trial', trialStart).catch(() => {}); }
}
async function startTrial() {
  if (trialStart) return;
  trialStart = Date.now();
  try { localStorage.setItem('resumepress-trial', String(trialStart)); } catch (_) {}
  await dbSet('trial', trialStart).catch(() => {});
  setPro(isPro); $('proDialog').close(); toast(`★ Every Pro feature is unlocked for ${TRIAL_DAYS} days. Good luck with the job hunt!`);
}
function proLabel() { return isPro ? '★ Pro' : trialActive() ? `★ Pro trial · ${trialLeft()} day${trialLeft() === 1 ? '' : 's'} left` : '★ Get Pro'; }
async function billing() {
  if (!('getDigitalGoodsService' in window)) return null;
  try { return await window.getDigitalGoodsService(STORE_BILLING); } catch (_) { return null; }
}
function setPro(v) {
  isPro = v;
  try { localStorage.setItem('resumepress-pro', v ? '1' : '0'); } catch (_) {}
  const b = $('proBtn');
  b.textContent = proLabel();
  b.classList.toggle('is-pro', v || trialActive());
  b.hidden = !proAvailable && !v;
  if (R) renderAll();
}
async function checkProAfterBuy() {
  for (let i = 0; i < 6; i++) {
    if (await checkPro()) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  proMessage('Thank you! If Pro is not unlocked within a minute, click “Restore purchase”.');
  return false;
}
async function checkPro() {
  const svc = await billing();
  if (!svc) return false;
  try {
    const details = await svc.getDetails(PRO_IDS).catch(() => []);
    if (details.length) { proAvailable = true; try { localStorage.setItem('resumepress-proavail', '1'); } catch (_) {} }
    if (details[0]) { proSku = details[0].itemId; if (!PRO_IDS.includes(proSku)) PRO_IDS.push(proSku); }
    const list = await svc.listPurchases();
    const owned = list.some((p) => PRO_IDS.includes(p.itemId));
    if (owned || details.length) { setPro(owned); return owned; }
    setPro(isPro); // Store did not answer (offline): keep what we knew
    return isPro;
  } catch (_) { return isPro; }
}
function proMessage(text) { const m = $('proMsg'); m.hidden = !text; m.textContent = text || ''; }
async function openPro(reason) {
  if (!reason && !isPro && trialStart && !trialActive()) reason = 'Your free Pro trial has ended. Your resumes stay here – unlock Pro to keep using the Pro tools.';
  proMessage(reason || '');
  $('trialBtn').hidden = isPro || !!trialStart;
  $('trialInfo').hidden = !trialActive() || isPro; $('trialInfo').textContent = trialActive() ? `You are trying Pro: ${trialLeft()} day${trialLeft() === 1 ? '' : 's'} left.` : '';
  const svc = await billing();
  if (!svc) { $('buyBtn').textContent = 'Get ResumePress on Microsoft Store'; $('restoreBtn').hidden = true; }
  else {
    $('restoreBtn').hidden = false;
    try {
      const [d] = await svc.getDetails([proSku]);
      const price = d && d.price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)) : '';
      $('buyBtn').textContent = price ? `Unlock Pro – ${price}` : 'Unlock Pro';
    } catch (_) { $('buyBtn').textContent = 'Unlock Pro'; }
  }
  if (!$('proDialog').open) $('proDialog').showModal();
}
async function buyPro() {
  const svc = await billing();
  if (!svc) { window.open(STORE_URL, '_blank'); return; }
  const methods = [{ supportedMethods: STORE_BILLING, data: { sku: proSku } }];
  try {
    let req;
    try { req = new PaymentRequest(methods); } catch (_) { req = new PaymentRequest(methods, { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } }); }
    const res = await req.show();
    await res.complete('success');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    proMessage('Purchase could not be completed: ' + (e.message || e));
    return;
  }
  if (await checkProAfterBuy()) { proMessage('Thank you! Pro is unlocked. ★'); setTimeout(() => $('proDialog').close(), 1500); }
}
const needsPro = (why) => { if (unlocked()) return false; openPro(why); return true; };

// ---------- toast ----------
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3800); }

// ---------- data model ----------
const BASE_ORDER = ['summary', 'experience', 'education', 'skills', 'projects', 'certs', 'languages', 'awards', 'volunteer'];
const ITEM_DEFS = {
  experience: { add: 'Add a job', fields: [['role', 'Job title'], ['company', 'Employer'], ['location', 'City'], ['dates'], ['bullets', 'What you did and achieved (one per line)', 'area', true]] },
  volunteer: { add: 'Add volunteering', fields: [['role', 'Role'], ['company', 'Organization'], ['location', 'City'], ['dates'], ['bullets', 'What you did (one per line)', 'area', true]] },
  education: { add: 'Add education', fields: [['degree', 'Degree / certificate'], ['school', 'School'], ['location', 'City'], ['dates'], ['details', 'Details (optional, one per line) – GPA, honors, courses', 'area']] },
  projects: { add: 'Add a project', fields: [['name', 'Project name'], ['link', 'Link (optional)'], ['dates'], ['desc', 'Description (one line per point)', 'area']] },
  certs: { add: 'Add a certification', fields: [['name', 'Certification'], ['issuer', 'Issued by'], ['date', 'Date', 'month']] },
  languages: { add: 'Add a language', fields: [['name', 'Language'], ['level', 'Level', 'lang']] },
  awards: { add: 'Add an award', fields: [['name', 'Award'], ['by', 'Given by'], ['date', 'Date', 'month'], ['desc', 'Description (optional)', 'area']] },
};
function blankResume(name) {
  return {
    name: name || 'My resume', template: 'modern', color: COLORS[0], font: 'sans', paper: 'letter', scale: 100, skillLevels: false,
    contact: { fullName: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', photo: '' },
    summary: '', experience: [{ id: uid('e') }], education: [{ id: uid('d') }], skills: [], projects: [], certs: [], languages: [], awards: [], volunteer: [], custom: [],
    order: BASE_ORDER.slice(), hide: { projects: true, certs: true, languages: true, awards: true, volunteer: true }, titles: {},
    cover: { recipient: '', recipientTitle: '', company: '', address: '', date: '', greeting: 'Dear Hiring Manager,', body: '', closing: 'Sincerely,' },
    updated: Date.now(),
  };
}
function normalize(o) {
  const b = blankResume();
  o = Object.assign(b, o || {});
  o.contact = Object.assign(blankResume().contact, o.contact || {});
  o.cover = Object.assign(blankResume().cover, o.cover || {});
  ['experience', 'education', 'skills', 'projects', 'certs', 'languages', 'awards', 'volunteer', 'custom'].forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; o[k].forEach((x) => { if (!x.id) x.id = uid('i'); }); });
  o.custom.forEach((s) => { if (!Array.isArray(s.items)) s.items = []; s.items.forEach((x) => { if (!x.id) x.id = uid('i'); }); });
  if (!Array.isArray(o.order)) o.order = BASE_ORDER.slice();
  BASE_ORDER.forEach((k) => { if (!o.order.includes(k)) o.order.push(k); });
  o.custom.forEach((s) => { if (!o.order.includes('custom:' + s.id)) o.order.push('custom:' + s.id); });
  o.order = o.order.filter((k) => BASE_ORDER.includes(k) || o.custom.some((s) => 'custom:' + s.id === k));
  o.hide = o.hide || {}; o.titles = o.titles || {};
  if (!TEMPLATES.some((t) => t.id === o.template)) o.template = 'modern';
  return o;
}

let docs = [], cur = '', R = null, jobs = [], tab = 'resume';
const openSec = new Set(['contact', 'summary', 'experience']), openItems = new Set();
let saveT = 0, prevT = 0;
function save() { if (!R) return; R.updated = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => dbSet('r:' + cur, R).catch(() => toast('Could not save – storage may be full')), 250); }
function saveNow() { clearTimeout(saveT); return dbSet('r:' + cur, R); }
function changed() { save(); clearTimeout(prevT); prevT = setTimeout(renderPreview, 120); }

function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }

// ---------- editor ----------
const secTitle = (k) => k.startsWith('custom:') ? (R.custom.find((s) => 'custom:' + s.id === k) || {}).title || 'Custom section' : R.titles[k] || SECTION_TITLES[k];
function inputHtml(path, label, kind, extra) {
  const v = getPath(R, path);
  if (kind === 'area') return `<label class="field"><span class="lbl-row"><span>${esc(label)}</span>${extra || ''}</span><textarea data-p="${path}" rows="${path.endsWith('bullets') ? 5 : 3}">${esc(v || '')}</textarea></label>`;
  if (kind === 'month') return `<label class="field">${esc(label)}<input type="month" data-p="${path}" value="${esc(v || '')}"></label>`;
  if (kind === 'lang') return `<label class="field">${esc(label)}<select data-p="${path}"><option value=""></option>${LANG_LEVELS.map((l) => `<option${v === l ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
  return `<label class="field">${esc(label)}<input data-p="${path}" value="${esc(v || '')}"${extra ? ` placeholder="${esc(extra)}"` : ''}></label>`;
}
function itemTitle(key, x) {
  if (key === 'experience' || key === 'volunteer') return [x.role, x.company].filter(Boolean).join(' – ') || 'New entry';
  if (key === 'education') return [x.degree, x.school].filter(Boolean).join(' – ') || 'New entry';
  return x.name || x.title || 'New entry';
}
function itemsEditor(key) {
  const def = ITEM_DEFS[key], list = R[key];
  const html = list.map((x, i) => {
    const p = `${key}.${i}`;
    const fields = def.fields.map(([f, label, kind, ideas]) => {
      if (f === 'dates') return `<div class="two">${inputHtml(p + '.start', 'Start', 'month')}${inputHtml(p + '.end', 'End', 'month')}</div><label class="check"><input type="checkbox" data-p="${p}.current"${x.current ? ' checked' : ''}> I still ${key === 'education' ? 'study' : 'work'} here</label>`;
      return inputHtml(`${p}.${f}`, label, kind, ideas ? `<button class="mini ghost" data-ideas="${p}.${f}">💡 Ideas</button>` : '');
    });
    return `<div class="ed-item${openItems.has(x.id) || list.length === 1 ? '' : ' closed'}" data-item="${x.id}"><div class="ed-item-h"><b data-toggle-item="${x.id}">${esc(itemTitle(key, x))}</b><button data-move="${key}|${i}|-1" title="Move up">↑</button><button data-move="${key}|${i}|1" title="Move down">↓</button><button data-del="${key}|${i}" title="Delete">✕</button></div><div class="ed-fields">${fields.join('')}</div></div>`;
  }).join('');
  return html + `<button class="add-btn" data-add="${key}">＋ ${def.add}</button>`;
}
function customEditor(s) {
  const si = R.custom.indexOf(s);
  const html = s.items.map((x, i) => {
    const p = `custom.${si}.items.${i}`;
    return `<div class="ed-item${openItems.has(x.id) || s.items.length === 1 ? '' : ' closed'}" data-item="${x.id}"><div class="ed-item-h"><b data-toggle-item="${x.id}">${esc(x.title || 'New entry')}</b><button data-cmove="${si}|${i}|-1">↑</button><button data-cmove="${si}|${i}|1">↓</button><button data-cdel="${si}|${i}">✕</button></div><div class="ed-fields">${inputHtml(p + '.title', 'Title')}<div class="two">${inputHtml(p + '.sub', 'Subtitle')}${inputHtml(p + '.date', 'Date / years')}</div>${inputHtml(p + '.desc', 'Description', 'area')}</div></div>`;
  }).join('');
  return `${inputHtml(`custom.${si}.title`, 'Section title')}${html}<button class="add-btn" data-cadd="${si}">＋ Add entry</button><button class="ghost mini danger" data-csecdel="${si}" style="margin-top:8px">Remove this section</button>`;
}
function skillsEditor() {
  const rows = R.skills.map((s, i) => `<div class="skill-row"><input data-p="skills.${i}.name" value="${esc(s.name || '')}" placeholder="Skill"><select data-p="skills.${i}.level" data-num="1"><option value="0">Level (optional)</option>${[1, 2, 3, 4, 5].map((l) => `<option value="${l}"${+s.level === l ? ' selected' : ''}>${LEVELS[l]}</option>`).join('')}</select><button data-del="skills|${i}" title="Delete">✕</button></div>`).join('');
  return `<label class="check"><input type="checkbox" data-p="skillLevels"${R.skillLevels ? ' checked' : ''}> Show skill levels as dots</label>${rows}<div class="row-btns"><button class="add-btn" data-add="skills" style="margin-top:0">＋ Add skill</button></div><label class="field">Add many at once<input id="skillBulk" placeholder="Type skills separated by commas, then press Enter"></label>`;
}
function contactEditor() {
  const c = 'contact.';
  return `${inputHtml(c + 'fullName', 'Full name')}${inputHtml(c + 'title', 'Headline', '', 'e.g. Customer Service Specialist')}<div class="two">${inputHtml(c + 'email', 'Email')}${inputHtml(c + 'phone', 'Phone')}</div>${inputHtml(c + 'location', 'City, State / Country')}<div class="two">${inputHtml(c + 'linkedin', 'LinkedIn (optional)')}${inputHtml(c + 'website', 'Website (optional)')}</div><div class="photo-row">${R.contact.photo ? `<img src="${R.contact.photo}" alt="">` : ''}<button class="ghost mini" id="photoBtn">📷 ${R.contact.photo ? 'Change' : 'Add a'} photo</button>${R.contact.photo ? '<button class="ghost mini" id="photoDel">Remove</button>' : ''}</div><p class="hint">In the US, UK and Canada most employers prefer resumes without a photo.</p>`;
}
function secBox(key, body, count) {
  const off = R.hide[key];
  const open = openSec.has(key);
  const movable = key !== 'contact';
  return `<div class="ed-sec${off ? ' off' : ''}${open ? '' : ' closed'}" data-sec="${key}"><div class="ed-h" data-toggle="${key}"><b>${esc(key === 'contact' ? 'Contact details' : secTitle(key))}</b>${count != null ? `<span class="cnt">${count}</span>` : ''}${movable ? `<button class="ic" data-smove="${key}|-1" title="Move section up">↑</button><button class="ic" data-smove="${key}|1" title="Move section down">↓</button><button class="ic" data-hide="${key}" title="${off ? 'Show on resume' : 'Hide from resume'}">${off ? '🚫' : '👁'}</button>` : ''}</div><div class="ed-body">${body}</div></div>`;
}
function renderEditor() {
  if (tab === 'cover') return renderCoverEditor();
  let html = `<p class="order-hint">Use ↑ ↓ to change the order of sections, 👁 to hide one. Everything saves automatically.</p>`;
  html += secBox('contact', contactEditor());
  R.order.forEach((k) => {
    if (k === 'summary') html += secBox(k, `${inputHtml('summary', '2–4 sentences about you', 'area', '<button class="mini ghost" data-ideas="summary">💡 Examples</button>')}`);
    else if (k === 'skills') html += secBox(k, skillsEditor(), R.skills.filter((s) => s.name).length || '');
    else if (ITEM_DEFS[k]) html += secBox(k, (k !== 'summary' ? inputHtml(`titles.${k}`, 'Section title', '', SECTION_TITLES[k]).replace('class="field"', 'class="field sec-title"') : '') + itemsEditor(k), R[k].length || '');
    else if (k.startsWith('custom:')) { const s = R.custom.find((c) => 'custom:' + c.id === k); if (s) html += secBox(k, customEditor(s), s.items.length || ''); }
  });
  const hidden = R.order.filter((k) => R.hide[k]);
  html += `<h2>Add a section</h2><div class="add-sec">${hidden.map((k) => `<button class="ghost" data-show="${k}">＋ ${esc(secTitle(k))}</button>`).join('')}<button class="ghost" id="addCustom">＋ Custom section…</button></div>`;
  $('editor').innerHTML = html;
}
function renderCoverEditor() {
  const p = 'cover.';
  $('editor').innerHTML = `<p class="order-hint">The cover letter uses the same template, colors and contact details as your resume.</p>
  ${unlocked() ? '' : '<p class="pro-msg">Cover letters are part of ResumePress Pro. ' + (trialStart ? 'Your free trial has ended.' : 'You can try everything free for 7 days.') + '</p>'}
  <div class="ed-sec"><div class="ed-h"><b>Who it goes to</b></div><div class="ed-body"><div class="two">${inputHtml(p + 'recipient', 'Hiring manager', '', 'e.g. Ms. Jane Lee')}${inputHtml(p + 'recipientTitle', 'Their title')}</div>${inputHtml(p + 'company', 'Company')}${inputHtml(p + 'address', 'Address (optional)', 'area')}${inputHtml(p + 'date', 'Date', '', 'Leave empty for today')}</div></div>
  <div class="ed-sec"><div class="ed-h"><b>Letter</b></div><div class="ed-body">${inputHtml(p + 'greeting', 'Greeting')}<div class="row-btns"><button class="ghost" id="draftBtn">✨ Write a first draft from my resume</button></div><label class="field">Letter text (leave an empty line between paragraphs)<textarea data-p="${p}body" rows="16">${esc(R.cover.body || '')}</textarea></label>${inputHtml(p + 'closing', 'Closing')}</div></div>`;
}

// ---------- preview ----------
const PAGE = { letter: [816, 1056, '8.5in 11in'], a4: [794, 1123, 'A4'] };
let pages = 1;
function docHtml() { return tab === 'cover' ? renderCover(R) : renderResume(R); }
function renderPreview() {
  if (!R || (tab !== 'resume' && tab !== 'cover')) return;
  const [w, hgt] = PAGE[R.paper] || PAGE.letter;
  const paper = $('paper');
  paper.style.width = w + 'px';
  paper.innerHTML = docHtml();
  const doc = paper.firstElementChild;
  doc.style.width = w + 'px';
  doc.style.minHeight = hgt + 'px';
  const fullH = doc.scrollHeight;
  pages = Math.max(1, Math.ceil((fullH - 4) / hgt));
  doc.style.minHeight = pages * hgt + 'px';
  for (let i = 1; i < pages; i++) { const d = document.createElement('div'); d.className = 'pbreak'; d.style.top = i * hgt + 'px'; d.innerHTML = `<span>Page ${i + 1}</span>`; paper.appendChild(d); }
  const avail = $('paperWrap').clientWidth - 32;
  const s = Math.min(1, avail / w);
  paper.style.transform = `scale(${s})`;
  paper.style.marginBottom = -(pages * hgt * (1 - s)) + 'px';
  paper.style.marginLeft = paper.style.marginRight = s < 1 ? '0' : 'auto';
  $('prevInfo').textContent = tab === 'cover' ? `Cover letter · ${pages} page${pages > 1 ? 's' : ''}` : `${pages} page${pages > 1 ? 's' : ''} · ${(R.paper || 'letter') === 'a4' ? 'A4' : 'US Letter'} · the red line shows where a new page starts`;
  if (tab === 'resume') updateScore();
}
function updateScore() {
  const { score } = checkResume(R, pages);
  const b = $('scoreBtn');
  b.textContent = `Score ${score}`;
  b.className = 'score' + (score >= 80 ? ' good' : score < 55 ? ' bad' : '');
}
function renderToolbar() {
  const t = TEMPLATES.find((x) => x.id === R.template);
  $('tplName').textContent = t ? t.name : '';
  $('swatches').innerHTML = COLORS.map((c) => `<button data-color="${c}" style="background:${c}" class="${R.color === c ? 'on' : ''}" title="Color"></button>`).join('');
  $('fontSel').innerHTML = FONTS.map((f) => `<option value="${f.id}"${R.font === f.id ? ' selected' : ''}>${f.name}</option>`).join('');
  $('sizeSel').value = R.paper || 'letter';
  $('scaleSel').value = String(R.scale || 100);
  $('scoreBtn').hidden = tab !== 'resume';
}
function renderDocPick() {
  $('docPick').innerHTML = docs.map((d) => `<option value="${d.id}"${d.id === cur ? ' selected' : ''}>📄 ${esc(d.name)}</option>`).join('') + '<option value="__new">＋ New resume…</option>';
}
function renderAll() {
  if (!R) return;
  renderDocPick();
  const docTab = tab === 'resume' || tab === 'cover';
  $('docPane').hidden = !docTab; $('matchPane').hidden = tab !== 'match'; $('appsPane').hidden = tab !== 'apps';
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  if (docTab) { renderToolbar(); renderEditor(); renderPreview(); }
  if (tab === 'match') renderMatch();
  if (tab === 'apps') renderApps();
}

// ---------- editor events ----------
$('editor').addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset.p) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.num) v = +v;
  setPath(R, el.dataset.p, v);
  if (el.dataset.p === 'skillLevels') { changed(); return; }
  // update item heading live
  const item = el.closest('.ed-item');
  if (item) { const m = el.dataset.p.match(/^(\w+)\.(\d+)\./); if (m && ITEM_DEFS[m[1]]) item.querySelector('.ed-item-h b').textContent = itemTitle(m[1], R[m[1]][+m[2]]); else if (/^custom\.\d+\.items\.\d+\.title$/.test(el.dataset.p)) item.querySelector('.ed-item-h b').textContent = el.value || 'New entry'; }
  if (/^custom\.\d+\.title$/.test(el.dataset.p)) { const b = el.closest('.ed-sec').querySelector('.ed-h b'); b.textContent = el.value || 'Custom section'; }
  if (/^titles\./.test(el.dataset.p)) { if (!el.value) delete R.titles[el.dataset.p.slice(7)]; el.closest('.ed-sec').querySelector('.ed-h b').textContent = secTitle(el.dataset.p.slice(7)); }
  changed();
});
$('editor').addEventListener('change', (e) => { if (e.target.type === 'checkbox' && e.target.dataset.p && e.target.dataset.p.endsWith('.current')) { renderPreview(); } });
$('editor').addEventListener('keydown', (e) => {
  if (e.target.id === 'skillBulk' && e.key === 'Enter') {
    e.preventDefault();
    const names = e.target.value.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    names.forEach((n) => { if (!R.skills.some((s) => (s.name || '').toLowerCase() === n.toLowerCase())) R.skills.push({ id: uid('s'), name: n, level: 0 }); });
    R.skills = R.skills.filter((s) => s.name);
    changed(); renderEditor(); setTimeout(() => $('skillBulk') && $('skillBulk').focus(), 0);
  }
});
$('editor').addEventListener('click', (e) => {
  const t = e.target.closest('button,[data-toggle],[data-toggle-item]');
  if (!t) return;
  const d = t.dataset;
  if (d.toggle && !e.target.closest('button')) { openSec.has(d.toggle) ? openSec.delete(d.toggle) : openSec.add(d.toggle); t.parentElement.classList.toggle('closed'); return; }
  if (d.toggleItem) { const it = t.closest('.ed-item'); it.classList.toggle('closed'); it.classList.contains('closed') ? openItems.delete(d.toggleItem) : openItems.add(d.toggleItem); return; }
  if (d.add) { const x = { id: uid('i') }; if (d.add === 'skills') x.name = ''; R[d.add].push(x); openItems.add(x.id); openSec.add(d.add); delete R.hide[d.add]; changed(); renderEditor(); const el = document.querySelector(`[data-item="${x.id}"] input`); if (el) el.focus(); return; }
  if (d.del) { const [k, i] = d.del.split('|'); const x = R[k][+i]; const empty = !Object.keys(x).some((f) => f !== 'id' && x[f]); if (!empty && !confirm('Delete this entry?')) return; R[k].splice(+i, 1); changed(); renderEditor(); return; }
  if (d.move) { const [k, i, dir] = d.move.split('|'); const a = +i, b = a + +dir; if (b < 0 || b >= R[k].length) return; [R[k][a], R[k][b]] = [R[k][b], R[k][a]]; changed(); renderEditor(); return; }
  if (d.smove) { const [k, dir] = d.smove.split('|'); const a = R.order.indexOf(k), b = a + +dir; if (b < 0 || b >= R.order.length) return; [R.order[a], R.order[b]] = [R.order[b], R.order[a]]; changed(); renderEditor(); return; }
  if (d.hide) { R.hide[d.hide] = !R.hide[d.hide]; if (!R.hide[d.hide]) delete R.hide[d.hide]; changed(); renderEditor(); return; }
  if (d.show) { delete R.hide[d.show]; openSec.add(d.show); const k = d.show; if (ITEM_DEFS[k] && !R[k].length) { const x = { id: uid('i') }; R[k].push(x); openItems.add(x.id); } changed(); renderEditor(); const box = document.querySelector(`[data-sec="${k}"]`); if (box) box.scrollIntoView({ block: 'center' }); return; }
  if (d.cadd) { const s = R.custom[+d.cadd]; const x = { id: uid('i') }; s.items.push(x); openItems.add(x.id); changed(); renderEditor(); return; }
  if (d.cdel) { const [si, i] = d.cdel.split('|').map(Number); R.custom[si].items.splice(i, 1); changed(); renderEditor(); return; }
  if (d.cmove) { const [si, i, dir] = d.cmove.split('|').map(Number); const L = R.custom[si].items; const b = i + dir; if (b < 0 || b >= L.length) return; [L[i], L[b]] = [L[b], L[i]]; changed(); renderEditor(); return; }
  if (d.csecdel) { const s = R.custom[+d.csecdel]; if (!confirm(`Remove the section “${s.title || 'Custom section'}”?`)) return; R.order = R.order.filter((k) => k !== 'custom:' + s.id); R.custom.splice(+d.csecdel, 1); changed(); renderEditor(); return; }
  if (d.ideas) { openIdeas(d.ideas); return; }
  if (t.id === 'addCustom') { const title = prompt('Name of the new section (e.g. Publications, Interests, References)', ''); if (!title) return; const s = { id: uid('c'), title, items: [{ id: uid('i') }] }; R.custom.push(s); R.order.push('custom:' + s.id); openSec.add('custom:' + s.id); changed(); renderEditor(); return; }
  if (t.id === 'photoBtn') { pickFile('image/*', addPhoto); return; }
  if (t.id === 'photoDel') { R.contact.photo = ''; changed(); renderEditor(); return; }
  if (t.id === 'draftBtn') { writeDraft(); return; }
});

function pickFile(accept, cb) { const f = $('fileIn'); f.value = ''; f.accept = accept; f.onchange = () => { if (f.files[0]) cb(f.files[0]); }; f.click(); }
function addPhoto(file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = 360, c = document.createElement('canvas'); c.width = c.height = s;
    const m = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
    R.contact.photo = c.toDataURL('image/jpeg', 0.86); URL.revokeObjectURL(url); changed(); renderEditor();
  };
  img.onerror = () => toast('That picture could not be opened');
  img.src = url;
}

// ---------- writing ideas ----------
let ideaTarget = '';
function openIdeas(path) {
  ideaTarget = path;
  const isSum = path === 'summary';
  $('ideaTitle').textContent = isSum ? 'Summary examples' : 'Writing ideas';
  $('ideaJob').innerHTML = Object.keys(EXAMPLES).map((k) => `<option>${esc(k)}</option>`).join('');
  const guess = guessJob(); if (guess) $('ideaJob').value = guess;
  document.querySelector('.idea-tabs').hidden = isSum;
  showIdeaTab('examples'); renderIdeaList();
  $('verbList').innerHTML = Object.entries(VERBS).map(([g, vs]) => `<div class="verb-group"><h3>${esc(g)}</h3>${vs.map((v) => `<button class="ghost" data-verb="${esc(v)}">${esc(v)}</button>`).join('')}</div>`).join('');
  $('ideaDlg').showModal();
}
function guessJob() {
  const t = ((R.contact.title || '') + ' ' + ((R.experience[0] || {}).role || '')).toLowerCase();
  const map = [['develop|engineer|program|software', 'Software developer'], ['customer|support|call center', 'Customer service'], ['sales|account exec|business develop', 'Sales'], ['retail|cashier|store', 'Retail associate'], ['nurse|rn\\b|lpn', 'Nurse'], ['teach|tutor', 'Teacher'], ['market|seo|social media', 'Marketing'], ['account|bookkeep|finance', 'Accountant'], ['project|program manager|scrum', 'Project manager'], ['admin|assistant|office', 'Administrative assistant'], ['data|analyst', 'Data analyst'], ['design', 'Graphic designer'], ['warehouse|forklift|picker', 'Warehouse worker'], ['server|waiter|waitress|restaurant|barista', 'Restaurant server'], ['driver|delivery|truck', 'Driver'], ['hr\\b|human resources|recruit', 'Human resources'], ['electric', 'Electrician'], ['student|intern|graduate', 'Student / intern']];
  const hit = map.find(([re]) => new RegExp(re).test(t));
  return hit ? hit[1] : '';
}
function renderIdeaList() {
  const ex = EXAMPLES[$('ideaJob').value]; if (!ex) return;
  $('ideaList').innerHTML = ideaTarget === 'summary' ? `<button class="idea sum" data-line="${esc(ex.summary)}">${esc(ex.summary)}</button>` : ex.bullets.map((b) => `<button class="idea" data-line="${esc(b)}">${esc(b)}</button>`).join('');
}
function showIdeaTab(w) { document.querySelectorAll('.idea-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.i === w)); $('ideaExamples').hidden = w !== 'examples'; $('ideaVerbs').hidden = w !== 'verbs'; }
function insertLine(line) {
  const curV = getPath(R, ideaTarget) || '';
  const v = ideaTarget === 'summary' ? (curV.trim() ? curV.trim() + ' ' : '') + line : (curV.trim() ? curV.replace(/\s+$/, '') + '\n' : '') + line;
  setPath(R, ideaTarget, v);
  const el = document.querySelector(`[data-p="${ideaTarget}"]`); if (el) el.value = v;
  changed(); toast('Added – replace the [brackets] with your own details');
}
document.querySelector('.idea-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showIdeaTab(b.dataset.i); });
$('ideaJob').onchange = renderIdeaList;
$('ideaList').addEventListener('click', (e) => { const b = e.target.closest('[data-line]'); if (b) { insertLine(b.dataset.line); b.disabled = true; } });
$('verbList').addEventListener('click', (e) => { const b = e.target.closest('[data-verb]'); if (b) insertLine(b.dataset.verb + ' '); });
$('ideaClose').onclick = () => $('ideaDlg').close();

// ---------- toolbar ----------
$('swatches').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (!b) return; R.color = b.dataset.color; changed(); renderToolbar(); });
$('fontSel').onchange = () => { R.font = $('fontSel').value; changed(); };
$('sizeSel').onchange = () => { R.paper = $('sizeSel').value; changed(); };
$('scaleSel').onchange = () => { R.scale = +$('scaleSel').value; changed(); };
$('tplBtn').onclick = () => {
  const sample = R.contact.fullName ? R : sampleResume();
  $('tplGrid').innerHTML = TEMPLATES.map((t) => `<button class="tpl-card${R.template === t.id ? ' on' : ''}" data-tpl="${t.id}"><div class="thumb"><div>${renderResume(Object.assign({}, sample, { template: t.id, color: R.color, font: R.font }))}</div></div><div class="tn">${esc(t.name)} <small>${t.ats ? 'ATS-friendly' : t.cols ? 'Two columns' : 'Eye-catching'}</small></div>${t.free || unlocked() ? '' : '<span class="lock pro-tag">★ Pro</span>'}</button>`).join('');
  $('tplDlg').showModal();
};
$('tplGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tpl]'); if (!b) return;
  const t = TEMPLATES.find((x) => x.id === b.dataset.tpl);
  if (!t.free && needsPro(`The ${t.name} template is part of ResumePress Pro.`)) return;
  R.template = t.id; changed(); renderToolbar(); $('tplDlg').close();
});
$('tplClose').onclick = () => $('tplDlg').close();
$('scoreBtn').onclick = () => {
  const { score, items } = checkResume(R, pages);
  $('scoreBig').innerHTML = `${score}<small> / 100</small>`;
  const order = { bad: 0, warn: 1, good: 2 };
  $('checkList').innerHTML = items.sort((a, b) => order[a.level] - order[b.level]).map((x) => `<li class="${x.level}">${esc(x.text)}</li>`).join('');
  $('scoreDlg').showModal();
};
$('scoreClose').onclick = () => $('scoreDlg').close();

// ---------- print / export ----------
function doPrint() {
  if (tab === 'cover' && needsPro('Cover letters are part of ResumePress Pro.')) return;
  const tpl = TEMPLATES.find((t) => t.id === R.template);
  if (tpl && !tpl.free && needsPro(`The ${tpl.name} template is part of ResumePress Pro. To print for free, click 🎨 Template and choose Classic, Modern or Minimal – your text stays the same.`)) return;
  const [, , size] = PAGE[R.paper] || PAGE.letter;
  $('pageRule').textContent = `@page { size: ${size}; margin: 0.4in 0; } @page :first { margin-top: 0; } @media print { #printArea .resume { width: auto !important; } #printArea .resume.t-sidebar .r-cols, #printArea .resume.t-bold .r-top.band { -webkit-print-color-adjust: exact; } }`;
  $('printArea').innerHTML = (tab === 'cover' ? renderCover(R) : renderResume(R));
  const prevTitle = document.title;
  document.title = (R.contact.fullName || 'Resume') + (tab === 'cover' ? ' – Cover letter' : ' – Resume');
  setTimeout(() => { window.print(); document.title = prevTitle; }, 50);
  toast('In the print window choose “Save as PDF” (or “Microsoft Print to PDF”) to get a PDF file');
}
$('printBtn').onclick = doPrint;
$('printBtn2').onclick = () => { $('menu').hidden = true; if (tab !== 'resume' && tab !== 'cover') setTab('resume'); doPrint(); };
function download(name, data, type) {
  const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileBase = () => (R.contact.fullName || R.name || 'Resume').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Resume';
$('txtBtn').onclick = () => { $('menu').hidden = true; download(fileBase() + ' - Resume.txt', '﻿' + resumePlain(R), 'text/plain;charset=utf-8'); toast('Plain text saved – paste it into online application forms'); };
$('wordBtn').onclick = () => {
  $('menu').hidden = true;
  if (needsPro('Export to Word is part of ResumePress Pro.')) return;
  download(fileBase() + ' - Resume.doc', wordDoc(R), 'application/msword');
  toast('Word file saved – open it in Word to make final edits');
};
function wordDoc(R) {
  const c = R.contact, col = R.color, font = (FONTS.find((f) => f.id === R.font) || FONTS[0]).css.replace(/"/g, "'");
  const eh = (s) => esc(s);
  const lines = (t) => String(t || '').split('\n').map((s) => s.replace(/^[•\-*–]\s*/, '').trim()).filter(Boolean);
  let body = `<p style="font-size:22pt;font-weight:bold;margin:0">${eh(c.fullName)}</p>`;
  if (c.title) body += `<p style="font-size:12pt;color:${col};margin:0">${eh(c.title)}</p>`;
  body += `<p style="font-size:9.5pt;color:#444;margin:4pt 0 8pt">${contactItems(c).map(eh).join(' | ')}</p>`;
  const H = (t) => `<p style="font-size:11pt;font-weight:bold;color:${col};text-transform:uppercase;letter-spacing:1pt;border-bottom:1px solid #bbb;margin:12pt 0 4pt">${eh(t)}</p>`;
  const item = (a, b, when, ul) => `<p style="margin:6pt 0 0"><b>${eh(a)}</b>${b ? ', <i>' + eh(b) + '</i>' : ''}${when ? `<span style="color:#555"> &nbsp;·&nbsp; ${eh(when)}</span>` : ''}</p>${ul && ul.length ? `<ul style="margin:2pt 0 0">${ul.map((x) => `<li>${eh(x)}</li>`).join('')}</ul>` : ''}`;
  visibleOrder(R).forEach((k) => {
    const title = k.startsWith('custom:') ? (R.custom.find((s) => 'custom:' + s.id === k) || {}).title : R.titles[k] || SECTION_TITLES[k];
    let s = '';
    if (k === 'summary' && R.summary) s = `<p>${eh(R.summary)}</p>`;
    if (k === 'experience' || k === 'volunteer') s = R[k].filter((x) => x.role || x.company).map((x) => item(x.role, [x.company, x.location].filter(Boolean).join(', '), dates(x), lines(x.bullets))).join('');
    if (k === 'education') s = R.education.filter((x) => x.school || x.degree).map((x) => item(x.degree, [x.school, x.location].filter(Boolean).join(', '), dates(x), lines(x.details))).join('');
    if (k === 'skills') { const n = R.skills.filter((x) => x.name).map((x) => x.name); if (n.length) s = `<p>${eh(n.join(' • '))}</p>`; }
    if (k === 'projects') s = R.projects.filter((x) => x.name).map((x) => item(x.name, x.link, dates(x), lines(x.desc))).join('');
    if (k === 'certs') s = R.certs.filter((x) => x.name).map((x) => item(x.name, x.issuer, monthLabel(x.date))).join('');
    if (k === 'languages') { const n = R.languages.filter((x) => x.name).map((x) => x.name + (x.level ? ' (' + x.level + ')' : '')); if (n.length) s = `<p>${eh(n.join(' • '))}</p>`; }
    if (k === 'awards') s = R.awards.filter((x) => x.name).map((x) => item(x.name, x.by, monthLabel(x.date), lines(x.desc))).join('');
    if (k.startsWith('custom:')) { const cs = R.custom.find((z) => 'custom:' + z.id === k); s = (cs ? cs.items : []).filter((x) => x.title || x.desc).map((x) => item(x.title, x.sub, x.date, lines(x.desc))).join(''); }
    if (s) body += H(title) + s;
  });
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${eh(c.fullName)}</title><style>@page WordSection1{size:${R.paper === 'a4' ? '21cm 29.7cm' : '8.5in 11in'};margin:0.6in 0.7in}div.WordSection1{page:WordSection1}body{font-family:${font};font-size:10.5pt;color:#222}p{margin:0 0 3pt}li{margin:1pt 0}</style></head><body><div class="WordSection1">${body}</div></body></html>`;
}

// ---------- cover letter draft ----------
function writeDraft() {
  if (needsPro('Writing a cover letter draft is part of ResumePress Pro.')) return;
  const c = R.contact, L = R.cover;
  if (L.body && L.body.trim() && !confirm('Replace the current letter text with a new draft?')) return;
  const job = L.jobTitle || c.title || (R.experience[0] || {}).role || 'this position';
  const company = L.company || 'your company';
  const years = yearsOfExperience();
  const skills = R.skills.filter((s) => s.name).slice(0, 4).map((s) => s.name);
  const best = R.experience.flatMap((x) => String(x.bullets || '').split('\n')).map((s) => s.replace(/^[•\-*–]\s*/, '').trim()).filter((b) => b && /\d/.test(b) && !/\[/.test(b)).slice(0, 2);
  const lastJob = R.experience.find((x) => x.role || x.company) || {};
  const p1 = `I am excited to apply for the ${job} position at ${company}. ${years ? `With ${years} years of work experience${lastJob.role ? ', most recently as a ' + lastJob.role.toLowerCase() : ''}` : lastJob.role ? `With my experience as a ${lastJob.role.toLowerCase()}` : 'With my background'}${skills.length ? ` and strengths in ${listJoin(skills)}` : ''}, I am confident I can make a real contribution to your team.`;
  const p2 = best.length ? `In my ${lastJob.company ? 'role at ' + lastJob.company : 'recent work'}, I ${best.map((b) => b.charAt(0).toLowerCase() + b.slice(1).replace(/\.$/, '')).join(', and ')}. These results come from ${skills[0] ? 'strong ' + skills[0].toLowerCase() + ' skills' : 'hard work'} and a focus on doing things well.` : `In my ${lastJob.company ? 'role at ' + lastJob.company : 'recent work'}, I [describe one or two achievements with numbers]. [Explain how this experience fits what ${company} needs.]`;
  const p3 = `I am drawn to ${company} because [say what you admire about the company, its customers or its mission]. I would welcome the chance to bring the same energy and results to your team.`;
  const p4 = `Thank you for your time and consideration. I would be glad to talk about how I can help ${company}. You can reach me at ${[c.phone, c.email].filter(Boolean).join(' or ') || '[phone/email]'}.`;
  L.body = [p1, p2, p3, p4].join('\n\n');
  if (L.recipient && /Hiring Manager/.test(L.greeting)) L.greeting = `Dear ${L.recipient},`;
  changed(); renderEditor(); toast('Draft written – edit the [brackets] and make it your own');
}
function listJoin(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function yearsOfExperience() {
  let min = null;
  R.experience.forEach((x) => { if (x.start && (!min || x.start < min)) min = x.start; });
  if (!min) return 0;
  const y = new Date().getFullYear() - +min.slice(0, 4);
  return y >= 2 ? y : 0;
}

// ---------- job match ----------
let lastMatch = null;
function renderMatch() {
  $('jmDocName').textContent = R.name;
  $('matchTag').hidden = unlocked();
  if (lastMatch && lastMatch.doc === cur) showMatch(); else $('jmOut').innerHTML = '';
}
$('jmRun').onclick = () => {
  if (needsPro('Job match is part of ResumePress Pro.')) return;
  const jd = $('jmText').value.trim();
  if (jd.split(/\s+/).length < 25) { toast('Paste the whole job ad (at least a few sentences)'); return; }
  lastMatch = { doc: cur, jd, title: $('jmTitle').value.trim(), company: $('jmCompany').value.trim() };
  showMatch();
};
function showMatch() {
  const m = matchJob(R, lastMatch.jd);
  const col = m.pct >= 70 ? '#30a46c' : m.pct >= 45 ? '#e2a400' : '#e5484d';
  $('jmOut').innerHTML = `<div class="jm-score"><div class="ring" style="background:conic-gradient(${col} ${m.pct * 3.6}deg, var(--line) 0)"><span>${m.pct}%</span></div><div><b style="font-size:18px">${m.pct >= 70 ? 'Strong match' : m.pct >= 45 ? 'Good start – add a few keywords' : 'Low match – tailor this resume'}</b><p class="hint">Your resume has ${m.found.length} of the ${m.found.length + m.missing.length} most important words in this job ad. Aim for 70% or more – but only add skills you really have.</p></div></div>
  <h2>Missing keywords <span class="muted" style="font-size:14px">– click one to add it to your skills</span></h2><div>${m.missing.map((x) => `<span class="kw miss" data-kw="${esc(x.k)}">＋ ${esc(x.k)} <small>×${x.n}</small></span>`).join('') || '<p class="hint">None – great!</p>'}</div>
  <h2>Already in your resume</h2><div>${m.found.map((x) => `<span class="kw ok">✓ ${esc(x.k)} <small>×${x.n}</small></span>`).join('') || '<p class="hint">None yet.</p>'}</div>
  <div class="row-btns" style="margin-top:18px"><button class="primary" id="jmTailor">⧉ Make a tailored copy for this job</button><button class="ghost" id="jmSaveApp">📋 Save to Applications</button></div>
  <p class="hint">Tip: also use the job's exact title in your headline and mention the top 2–3 keywords in your summary.</p>`;
}
$('jmOut').addEventListener('click', async (e) => {
  const k = e.target.closest('[data-kw]');
  if (k) { const name = k.dataset.kw.replace(/\b\w/g, (c) => c.toUpperCase()); if (!R.skills.some((s) => (s.name || '').toLowerCase() === k.dataset.kw)) R.skills.push({ id: uid('s'), name, level: 0 }); delete R.hide.skills; save(); showMatch(); toast(`Added “${name}” to your skills`); return; }
  if (e.target.id === 'jmTailor') { if (!(await duplicateDoc(`${R.name} – ${lastMatch.company || lastMatch.title || 'tailored'}`))) return; if (lastMatch.title && R.contact) { R.contact.title = lastMatch.title; } if (lastMatch.company) R.cover.company = lastMatch.company; if (lastMatch.title) R.cover.jobTitle = lastMatch.title; save(); lastMatch.doc = cur; setTab('resume'); toast('Tailored copy created – edit it for this job'); return; }
  if (e.target.id === 'jmSaveApp') { openApp(null, { company: lastMatch.company, role: lastMatch.title, status: 'saved', doc: cur }); }
});

// ---------- applications ----------
const STATUSES = [['saved', 'Saved'], ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn']];
let editApp = null;
function renderApps() {
  const f = $('appFilter').value, q = $('appSearch').value.trim().toLowerCase();
  if ($('appFilter').options.length < 2) $('appFilter').innerHTML = '<option value="">All</option>' + STATUSES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  const counts = Object.fromEntries(STATUSES.map(([k]) => [k, 0])); jobs.forEach((j) => counts[j.status] = (counts[j.status] || 0) + 1);
  $('appStats').innerHTML = `<div><b>${jobs.length}</b><span>Total</span></div>` + STATUSES.slice(0, 5).map(([k, l]) => `<div><b>${counts[k]}</b><span>${l}</span></div>`).join('');
  const list = jobs.filter((j) => (!f || j.status === f) && (!q || (j.company + ' ' + j.role).toLowerCase().includes(q))).sort((a, b) => (b.applied || b.created || '').localeCompare(a.applied || a.created || ''));
  const today = todayStr();
  $('appTable').innerHTML = `<tr><th>Company</th><th>Role</th><th>Status</th><th>Applied</th><th>Follow up</th><th>Resume</th><th></th></tr>` + (list.map((j) => `<tr data-app="${j.id}"><td class="name">${esc(j.company || '—')}</td><td>${esc(j.role || '')}</td><td><span class="st st-${j.status}">${esc((STATUSES.find((s) => s[0] === j.status) || [])[1] || '')}</span></td><td>${esc(j.applied || '')}</td><td class="${j.follow && j.follow <= today && ['applied', 'interview'].includes(j.status) ? 'due' : ''}">${esc(j.follow || '')}</td><td>${esc((docs.find((d) => d.id === j.doc) || {}).name || '')}</td><td>${j.link ? `<a href="${esc(j.link)}" target="_blank" rel="noopener">Open ↗</a>` : ''}</td></tr>`).join('') || `<tr><td colspan="7" class="hint" style="padding:18px">No jobs yet. Add the jobs you apply for to keep track of follow-ups and interviews.</td></tr>`);
  const due = jobs.filter((j) => j.follow && j.follow <= today && ['applied', 'interview'].includes(j.status)).length;
  $('appHint').textContent = (due ? `⏰ ${due} follow-up${due > 1 ? 's are' : ' is'} due. ` : '') + (unlocked() ? '' : `Free version: up to ${FREE_APPS} jobs.`);
}
function openApp(id, preset) {
  if (!id && jobs.length >= FREE_APPS && needsPro(`The free version tracks ${FREE_APPS} jobs. Unlock Pro for unlimited tracking.`)) return;
  editApp = id ? jobs.find((j) => j.id === id) : null;
  const j = editApp || Object.assign({ status: 'applied', applied: todayStr(), doc: cur }, preset || {});
  $('aStatus').innerHTML = STATUSES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  $('aDoc').innerHTML = '<option value=""></option>' + docs.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  [['aCompany', 'company'], ['aRole', 'role'], ['aStatus', 'status'], ['aDoc', 'doc'], ['aApplied', 'applied'], ['aFollow', 'follow'], ['aSalary', 'salary'], ['aLocation', 'location'], ['aLink', 'link'], ['aContact', 'contact'], ['aNotes', 'notes']].forEach(([el, f]) => ($(el).value = j[f] || ''));
  if (!editApp && !j.follow && j.applied) { const d = new Date(); d.setDate(d.getDate() + 7); $('aFollow').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  $('aDel').hidden = !editApp; $('appDlgTitle').textContent = editApp ? 'Edit application' : 'Add a job';
  $('appDlg').showModal(); $('aCompany').focus();
}
$('aSave').onclick = async () => {
  const j = editApp || { id: uid('j'), created: todayStr() };
  [['aCompany', 'company'], ['aRole', 'role'], ['aStatus', 'status'], ['aDoc', 'doc'], ['aApplied', 'applied'], ['aFollow', 'follow'], ['aSalary', 'salary'], ['aLocation', 'location'], ['aLink', 'link'], ['aContact', 'contact'], ['aNotes', 'notes']].forEach(([el, f]) => (j[f] = $(el).value.trim()));
  if (!j.company && !j.role) { toast('Type a company or a role'); return; }
  if (!editApp) jobs.push(j);
  await dbSet('jobs', jobs); $('appDlg').close(); renderApps(); toast('Saved');
};
$('aDel').onclick = async () => { if (!editApp || !confirm('Delete this application?')) return; jobs = jobs.filter((j) => j !== editApp); await dbSet('jobs', jobs); $('appDlg').close(); renderApps(); };
$('aCancel').onclick = () => $('appDlg').close();
$('addAppBtn').onclick = () => openApp(null);
$('appTable').addEventListener('click', (e) => { if (e.target.closest('a')) return; const r = e.target.closest('[data-app]'); if (r) openApp(r.dataset.app); });
$('appFilter').onchange = renderApps; $('appSearch').oninput = renderApps;

// ---------- documents ----------
async function loadDoc(id) {
  if (R) await saveNow().catch(() => {});
  const d = await dbGet('r:' + id);
  R = normalize(d || blankResume());
  cur = id; await dbSet('cur', id);
  openItems.clear(); renderAll();
}
async function newDoc(name, data) {
  if (docs.length >= FREE_DOCS && needsPro('The free version holds one resume. Unlock Pro for unlimited resumes – one tailored copy for every job.')) return false;
  const id = uid('r'); const doc = normalize(data || blankResume(name)); doc.name = name;
  docs.push({ id, name }); await dbSet('docs', docs); await dbSet('r:' + id, doc); await loadDoc(id); return true;
}
async function duplicateDoc(name) {
  if (docs.length >= FREE_DOCS && needsPro('Making tailored copies is part of ResumePress Pro.')) return false;
  const copy = JSON.parse(JSON.stringify(R)); return newDoc(name || R.name + ' (copy)', copy);
}
$('docPick').onchange = async () => {
  const v = $('docPick').value;
  if (v === '__new') { $('docPick').value = cur; const n = prompt('Name for the new resume (for example the job you are applying for)', 'Resume ' + (docs.length + 1)); if (n) await newDoc(n.trim()); return; }
  await loadDoc(v);
};
$('newDocBtn').onclick = async () => { $('menu').hidden = true; const n = prompt('Name for the new resume', 'Resume ' + (docs.length + 1)); if (n) await newDoc(n.trim()); };
$('dupDocBtn').onclick = async () => { $('menu').hidden = true; const n = prompt('Name for the copy (for example the company you are applying to)', R.name + ' – copy'); if (n) { if (await duplicateDoc(n.trim())) toast('Copy created'); } };
$('renameDocBtn').onclick = async () => { $('menu').hidden = true; const n = prompt('New name', R.name); if (!n) return; R.name = n.trim(); docs.find((d) => d.id === cur).name = R.name; await dbSet('docs', docs); save(); renderDocPick(); };
$('delDocBtn').onclick = async () => {
  $('menu').hidden = true;
  if (docs.length < 2) { if (!confirm('Clear this resume and start over? This cannot be undone.')) return; const n = R.name; R = blankResume(n); await saveNow(); renderAll(); return; }
  if (!confirm(`Delete “${R.name}”? This cannot be undone.`)) return;
  await dbDel('r:' + cur); docs = docs.filter((d) => d.id !== cur); await dbSet('docs', docs); R = null; await loadDoc(docs[0].id);
};
$('sampleBtn').onclick = async () => {
  $('menu').hidden = true;
  const empty = !R.contact.fullName && !R.summary && !R.experience.some((x) => x.role);
  if (empty) { const n = R.name; R = normalize(sampleResume()); R.name = n; await saveNow(); renderAll(); toast('Sample loaded – replace it with your own details'); return; }
  if (docs.length >= FREE_DOCS && !unlocked()) { if (!confirm('Replace this resume with the sample? Your current text will be lost.')) return; const n = R.name; R = normalize(sampleResume()); R.name = n; await saveNow(); renderAll(); return; }
  await newDoc('Sample resume', sampleResume());
};
$('backupBtn').onclick = async () => {
  $('menu').hidden = true; await saveNow();
  const all = { app: 'resumepress', v: 1, docs: [], jobs };
  for (const d of docs) all.docs.push({ name: d.name, data: await dbGet('r:' + d.id) });
  download(`ResumePress backup ${todayStr()}.json`, JSON.stringify(all), 'application/json'); toast('Backup saved');
};
$('restoreFileBtn').onclick = () => { $('menu').hidden = true; pickFile('.json,application/json', restoreBackup); };
async function restoreBackup(file) {
  try {
    const o = JSON.parse(await file.text());
    if (o.app !== 'resumepress' || !Array.isArray(o.docs)) throw new Error('not a ResumePress backup');
    if (!confirm(`Restore ${o.docs.length} resume(s) and ${(o.jobs || []).length} application(s)? They are added next to what you have now.`)) return;
    for (const d of o.docs) { const id = uid('r'); docs.push({ id, name: d.name || 'Restored resume' }); await dbSet('r:' + id, normalize(d.data)); }
    await dbSet('docs', docs);
    const have = new Set(jobs.map((j) => j.id)); (o.jobs || []).forEach((j) => { if (!have.has(j.id)) jobs.push(j); }); await dbSet('jobs', jobs);
    renderAll(); toast('Backup restored');
  } catch (e) { toast('Could not restore: ' + e.message); }
}

// ---------- tabs, menu, pro ----------
function setTab(t) {
  tab = t;
  if (t === 'cover' && !unlocked()) toast('Cover letters are a Pro feature – you can look around, printing needs Pro or the free trial');
  renderAll();
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t); });
$('moreBtn').onclick = (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; };
document.addEventListener('click', (e) => { if (!e.target.closest('#menu') && e.target.id !== 'moreBtn') $('menu').hidden = true; });
$('proBtn').onclick = () => { if (!isPro) openPro(''); };
$('trialBtn').onclick = startTrial;
$('buyBtn').onclick = buyPro; $('closePro').onclick = () => $('proDialog').close();
$('restoreBtn').onclick = async () => { proMessage('Checking your purchases…'); proMessage((await checkPro()) ? 'Pro is unlocked. ★' : 'No Pro purchase was found on this Microsoft account.'); };
window.addEventListener('resize', () => { clearTimeout(prevT); prevT = setTimeout(renderPreview, 100); });
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && (tab === 'resume' || tab === 'cover')) { e.preventDefault(); doPrint(); } });
setInterval(() => { if (!isPro && trialStart && $('proBtn').textContent !== proLabel()) setPro(false); }, 3600000);

// ---------- sample ----------
function sampleResume() {
  return {
    name: 'Sample resume', template: 'modern', color: COLORS[0], font: 'sans', paper: 'letter', scale: 100,
    contact: { fullName: 'Jordan Ellis', title: 'Customer Success Specialist', email: 'jordan.ellis@email.com', phone: '(555) 214-7788', location: 'Denver, CO', linkedin: 'linkedin.com/in/jordanellis', website: '', photo: '' },
    summary: 'Customer success specialist with 6 years of experience helping software customers get value fast. Known for clear communication, calm problem solving and turning unhappy customers into loyal fans. Keeps renewal rates high by spotting risks early.',
    experience: [
      { id: 'e1', role: 'Customer Success Specialist', company: 'Brightline Software', location: 'Denver, CO', start: '2022-03', current: true, bullets: 'Managed a portfolio of 85 business accounts worth $1.2M in yearly revenue\nRaised renewal rate from 84% to 93% by running quarterly check-ins\nCut average onboarding time from 21 to 12 days with a new welcome program\nWrote 40 help-center articles that reduced repeat tickets by 18%' },
      { id: 'e2', role: 'Customer Support Representative', company: 'Peak Telecom', location: 'Boulder, CO', start: '2019-06', end: '2022-02', bullets: 'Answered 60+ calls and chats per day with a 96% satisfaction score\nResolved billing issues on the first contact 88% of the time\nTrained 12 new team members on tools and service standards' },
      { id: 'e3', role: 'Sales Associate', company: 'Summit Outdoor', location: 'Boulder, CO', start: '2017-05', end: '2019-05', bullets: 'Helped 50+ customers per shift choose the right gear\nSigned up 300 customers for the loyalty program in one year' },
    ],
    education: [{ id: 'd1', degree: 'B.A. Communication', school: 'University of Colorado Boulder', location: 'Boulder, CO', start: '2013-08', end: '2017-05', details: '' }],
    skills: ['Customer onboarding', 'Account management', 'Zendesk', 'Salesforce', 'Conflict resolution', 'Data analysis', 'Public speaking', 'Spanish (conversational)'].map((n, i) => ({ id: 's' + i, name: n, level: [5, 5, 4, 4, 5, 3, 4, 3][i] })),
    certs: [{ id: 'c1', name: 'Certified Customer Success Manager', issuer: 'SuccessHACKER', date: '2023-04' }],
    languages: [{ id: 'l1', name: 'English', level: 'Native' }, { id: 'l2', name: 'Spanish', level: 'Intermediate' }],
    projects: [], awards: [], volunteer: [], custom: [],
    order: BASE_ORDER.slice(), hide: { projects: true, awards: true, volunteer: true }, titles: {},
    cover: { recipient: 'Ms. Priya Shah', recipientTitle: 'Head of Customer Success', company: 'Northwind Apps', address: '', date: '', greeting: 'Dear Ms. Shah,', body: '', closing: 'Sincerely,' },
  };
}

// ---------- start ----------
(async () => {
  try {
    await loadTrial();
    docs = (await dbGet('docs')) || [];
    jobs = (await dbGet('jobs')) || [];
    if (!docs.length) { const id = uid('r'); docs = [{ id, name: 'My resume' }]; await dbSet('docs', docs); await dbSet('r:' + id, blankResume('My resume')); }
    const c = await dbGet('cur');
    await loadDoc(docs.some((d) => d.id === c) ? c : docs[0].id);
  } catch (_) { R = normalize(blankResume()); cur = 'mem'; docs = [{ id: 'mem', name: 'My resume' }]; renderAll(); toast('Storage is not available – changes will not be saved'); }
  setPro(isPro);
  checkPro();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
