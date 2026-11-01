// ResumePress – resume and cover letter templates. Each returns HTML for one document (paper size handled by CSS).
'use strict';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', free: true, ats: true },
  { id: 'modern', name: 'Modern', free: true, ats: true },
  { id: 'minimal', name: 'Minimal', free: true, ats: true },
  { id: 'sidebar', name: 'Sidebar', cols: true },
  { id: 'executive', name: 'Executive', ats: true },
  { id: 'compact', name: 'Compact', ats: true },
  { id: 'bold', name: 'Bold header' },
  { id: 'timeline', name: 'Timeline' },
];
const COLORS = ['#2f4b7c', '#1f7a5c', '#7c2f4b', '#2b2b2b', '#0f6e8c', '#8a5a00', '#5b3c88', '#b23a2e'];
const FONTS = [
  { id: 'sans', name: 'Clean sans', css: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" },
  { id: 'calibri', name: 'Calibri', css: "Calibri, Carlito, 'Segoe UI', sans-serif" },
  { id: 'georgia', name: 'Georgia', css: "Georgia, 'Times New Roman', serif" },
  { id: 'garamond', name: 'Garamond', css: "Garamond, 'EB Garamond', 'Times New Roman', serif" },
  { id: 'cambria', name: 'Cambria', css: "Cambria, Caladea, Georgia, serif" },
  { id: 'arial', name: 'Arial', css: "Arial, 'Liberation Sans', sans-serif" },
];
const SECTION_TITLES = { summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Projects', certs: 'Certifications', languages: 'Languages', awards: 'Awards', volunteer: 'Volunteering' };
const LEVELS = ['', 'Beginner', 'Basic', 'Good', 'Very good', 'Expert'];
const LANG_LEVELS = ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'];

const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function monthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  if (!mo) return y;
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
function dates(x) {
  const a = monthLabel(x.start), b = x.current ? 'Present' : monthLabel(x.end);
  return a && b ? `${a} – ${b}` : a || b;
}
function bulletList(text) {
  const items = String(text || '').split('\n').map((s) => s.replace(/^[•\-*–]\s*/, '').trim()).filter(Boolean);
  return items.length ? `<ul>${items.map((b) => `<li>${h(b)}</li>`).join('')}</ul>` : '';
}
function para(text) { return String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${h(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function linkText(u) { return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''); }

function contactItems(c) {
  return [c.email, c.phone, c.location, linkText(c.website), linkText(c.linkedin)].filter(Boolean);
}

const sec = (key, title, body) => body ? `<section class="r-sec s-${key}"><h2>${h(title)}</h2>${body}</section>` : '';

function entry(head, sub, when, where, body) {
  return `<div class="r-item"><div class="r-row"><div class="r-head">${head}</div>${when ? `<div class="r-when">${h(when)}</div>` : ''}</div>${sub || where ? `<div class="r-row r-subrow"><div class="r-sub">${sub || ''}</div>${where ? `<div class="r-where">${h(where)}</div>` : ''}</div>` : ''}${body || ''}</div>`;
}

function renderSection(R, key, opt) {
  const o = opt || {};
  const title = key.startsWith('custom:') ? ((R.custom || []).find((s) => 'custom:' + s.id === key) || {}).title || '' : (R.titles && R.titles[key]) || SECTION_TITLES[key];
  switch (key) {
    case 'summary': return sec(key, title, para(R.summary));
    case 'experience':
    case 'volunteer': {
      const list = (R[key] || []).filter((x) => x.role || x.company);
      return sec(key, title, list.map((x) => entry(`<b>${h(x.role)}</b>`, h(x.company), dates(x), x.location, bulletList(x.bullets))).join(''));
    }
    case 'education': {
      const list = (R.education || []).filter((x) => x.school || x.degree);
      return sec(key, title, list.map((x) => entry(`<b>${h(x.degree)}</b>`, h(x.school), dates(x), x.location, x.details ? bulletList(x.details) : '')).join(''));
    }
    case 'skills': {
      const list = (R.skills || []).filter((x) => x.name);
      if (!list.length) return '';
      if (R.skillLevels || o.levels) return sec(key, title, `<div class="r-skills lv">${list.map((s) => `<div class="r-skill"><span>${h(s.name)}</span><span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= (s.level || 0) ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div>`);
      return sec(key, title, `<div class="r-skills">${list.map((s) => `<span class="r-chip">${h(s.name)}</span>`).join('')}</div>`);
    }
    case 'projects': {
      const list = (R.projects || []).filter((x) => x.name);
      return sec(key, title, list.map((x) => entry(`<b>${h(x.name)}</b>`, x.link ? h(linkText(x.link)) : '', dates(x), '', (x.desc && x.desc.includes('\n')) ? bulletList(x.desc) : para(x.desc))).join(''));
    }
    case 'certs': {
      const list = (R.certs || []).filter((x) => x.name);
      return sec(key, title, list.map((x) => entry(`<b>${h(x.name)}</b>`, h(x.issuer), monthLabel(x.date), '', '')).join(''));
    }
    case 'languages': {
      const list = (R.languages || []).filter((x) => x.name);
      return sec(key, title, `<div class="r-langs">${list.map((x) => `<div class="r-lang"><b>${h(x.name)}</b>${x.level ? ` <span>${h(x.level)}</span>` : ''}</div>`).join('')}</div>`);
    }
    case 'awards': {
      const list = (R.awards || []).filter((x) => x.name);
      return sec(key, title, list.map((x) => entry(`<b>${h(x.name)}</b>`, h(x.by), monthLabel(x.date), '', para(x.desc))).join(''));
    }
    default: {
      const s = (R.custom || []).find((c) => 'custom:' + c.id === key);
      if (!s) return '';
      const list = (s.items || []).filter((x) => x.title || x.desc);
      return sec('custom', title, list.map((x) => entry(`<b>${h(x.title)}</b>`, h(x.sub), x.date || '', '', (x.desc && x.desc.includes('\n')) ? bulletList(x.desc) : para(x.desc))).join(''));
    }
  }
}

function visibleOrder(R) { return (R.order || []).filter((k) => !(R.hide && R.hide[k])); }

function photoHtml(c, cls) { return c.photo ? `<img class="${cls || 'r-photo'}" src="${c.photo}" alt="">` : ''; }

function header(R, kind) {
  const c = R.contact || {};
  const items = contactItems(c);
  if (kind === 'center') return `<header class="r-top center">${photoHtml(c)}<h1>${h(c.fullName)}</h1>${c.title ? `<div class="r-title">${h(c.title)}</div>` : ''}<div class="r-contact">${items.map(h).join('<span class="sep">•</span>')}</div></header>`;
  if (kind === 'band') return `<header class="r-top band">${photoHtml(c)}<div><h1>${h(c.fullName)}</h1>${c.title ? `<div class="r-title">${h(c.title)}</div>` : ''}<div class="r-contact">${items.map(h).join('<span class="sep">|</span>')}</div></div></header>`;
  return `<header class="r-top">${photoHtml(c)}<div><h1>${h(c.fullName)}</h1>${c.title ? `<div class="r-title">${h(c.title)}</div>` : ''}<div class="r-contact">${items.map(h).join('<span class="sep">|</span>')}</div></div></header>`;
}

function renderResume(R) {
  const t = R.template || 'classic';
  const order = visibleOrder(R);
  const body = (keys, opt) => keys.map((k) => renderSection(R, k, opt)).join('');
  let inner;
  if (t === 'sidebar') {
    const sideKeys = order.filter((k) => ['skills', 'languages', 'certs', 'awards'].includes(k));
    const mainKeys = order.filter((k) => !sideKeys.includes(k));
    const c = R.contact || {};
    inner = `<div class="r-cols"><aside class="r-side">${photoHtml(c)}<h1>${h(c.fullName)}</h1>${c.title ? `<div class="r-title">${h(c.title)}</div>` : ''}<div class="r-contact">${contactItems(c).map((x) => `<div>${h(x)}</div>`).join('')}</div>${body(sideKeys, { levels: true })}</aside><main class="r-main">${body(mainKeys)}</main></div>`;
  } else if (t === 'executive') inner = header(R, 'center') + body(order);
  else if (t === 'bold') inner = header(R, 'band') + `<div class="r-pad">${body(order)}</div>`;
  else if (t === 'compact') {
    inner = header(R) + body(order);
  } else inner = header(R) + body(order);
  const font = (FONTS.find((f) => f.id === R.font) || FONTS[0]).css;
  return `<div class="resume t-${t}" style="--rc:${h(R.color || COLORS[0])};--rf:${font};--rz:${(R.scale || 100) / 100}">${inner}</div>`;
}

function renderCover(R) {
  const c = R.contact || {}, L = R.cover || {};
  const t = R.template || 'classic';
  const font = (FONTS.find((f) => f.id === R.font) || FONTS[0]).css;
  const today = L.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const to = [L.recipient, L.recipientTitle, L.company, L.address].filter(Boolean).map((x) => h(x).replace(/\n/g, '<br>')).join('<br>');
  const head = t === 'executive' ? header(R, 'center') : t === 'bold' ? header(R, 'band') : header(R);
  return `<div class="resume cover t-${t === 'sidebar' || t === 'timeline' ? 'modern' : t}" style="--rc:${h(R.color || COLORS[0])};--rf:${font};--rz:${(R.scale || 100) / 100}">${head}<div class="${t === 'bold' ? 'r-pad' : ''}"><div class="c-date">${h(today)}</div>${to ? `<div class="c-to">${to}</div>` : ''}<p class="c-greet">${h(L.greeting || 'Dear Hiring Manager,')}</p><div class="c-body">${para(L.body)}</div><p class="c-close">${h(L.closing || 'Sincerely,')}<br><br><b>${h(c.fullName)}</b></p></div></div>`;
}

// plain text (ATS) version
function resumePlain(R) {
  const c = R.contact || {}, out = [];
  out.push((c.fullName || '').toUpperCase());
  if (c.title) out.push(c.title);
  out.push(contactItems(c).join(' | '), '');
  visibleOrder(R).forEach((k) => {
    const title = k.startsWith('custom:') ? ((R.custom || []).find((s) => 'custom:' + s.id === k) || {}).title : (R.titles && R.titles[k]) || SECTION_TITLES[k];
    const lines = [];
    const bl = (t) => String(t || '').split('\n').map((s) => s.replace(/^[•\-*–]\s*/, '').trim()).filter(Boolean).forEach((b) => lines.push('- ' + b));
    if (k === 'summary' && R.summary) lines.push(R.summary.trim());
    if (k === 'experience' || k === 'volunteer') (R[k] || []).filter((x) => x.role || x.company).forEach((x) => { lines.push([x.role, x.company].filter(Boolean).join(', ') + (dates(x) ? ' (' + dates(x) + ')' : '') + (x.location ? ', ' + x.location : '')); bl(x.bullets); lines.push(''); });
    if (k === 'education') (R.education || []).filter((x) => x.school || x.degree).forEach((x) => { lines.push([x.degree, x.school].filter(Boolean).join(', ') + (dates(x) ? ' (' + dates(x) + ')' : '')); bl(x.details); });
    if (k === 'skills') { const s = (R.skills || []).filter((x) => x.name).map((x) => x.name); if (s.length) lines.push(s.join(', ')); }
    if (k === 'projects') (R.projects || []).filter((x) => x.name).forEach((x) => { lines.push(x.name + (x.link ? ' – ' + x.link : '')); if (x.desc) lines.push(x.desc); });
    if (k === 'certs') (R.certs || []).filter((x) => x.name).forEach((x) => lines.push([x.name, x.issuer, monthLabel(x.date)].filter(Boolean).join(', ')));
    if (k === 'languages') (R.languages || []).filter((x) => x.name).forEach((x) => lines.push(x.name + (x.level ? ' – ' + x.level : '')));
    if (k === 'awards') (R.awards || []).filter((x) => x.name).forEach((x) => lines.push([x.name, x.by, monthLabel(x.date)].filter(Boolean).join(', ')));
    if (k.startsWith('custom:')) { const s = (R.custom || []).find((c2) => 'custom:' + c2.id === k); (s && s.items || []).forEach((x) => { lines.push([x.title, x.sub, x.date].filter(Boolean).join(', ')); if (x.desc) lines.push(x.desc); }); }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (lines.length) out.push((title || '').toUpperCase(), ...lines, '');
  });
  return out.join('\r\n');
}
