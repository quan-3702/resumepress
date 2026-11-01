// ResumePress – writing help: action verbs, example bullets and summaries, resume checker, job keyword match.
'use strict';

const VERBS = {
  'Leadership': ['Led', 'Directed', 'Managed', 'Supervised', 'Coordinated', 'Mentored', 'Trained', 'Oversaw', 'Delegated', 'Headed', 'Guided', 'Recruited'],
  'Results': ['Increased', 'Reduced', 'Improved', 'Grew', 'Saved', 'Cut', 'Boosted', 'Doubled', 'Exceeded', 'Achieved', 'Delivered', 'Accelerated'],
  'Building': ['Built', 'Created', 'Designed', 'Developed', 'Launched', 'Established', 'Implemented', 'Introduced', 'Founded', 'Engineered', 'Set up', 'Automated'],
  'Communication': ['Presented', 'Negotiated', 'Wrote', 'Persuaded', 'Explained', 'Facilitated', 'Collaborated', 'Partnered', 'Advised', 'Resolved', 'Answered', 'Promoted'],
  'Analysis': ['Analyzed', 'Assessed', 'Evaluated', 'Forecast', 'Measured', 'Researched', 'Identified', 'Audited', 'Investigated', 'Mapped', 'Tested', 'Tracked'],
  'Organization': ['Organized', 'Planned', 'Scheduled', 'Streamlined', 'Prioritized', 'Processed', 'Maintained', 'Prepared', 'Handled', 'Restructured', 'Standardized', 'Updated'],
  'Helping': ['Assisted', 'Supported', 'Served', 'Cared for', 'Coached', 'Welcomed', 'Educated', 'Counseled', 'Guided', 'Helped'],
};
const ALL_VERBS = new Set(Object.values(VERBS).flat().map((v) => v.toLowerCase().split(' ')[0]));
['achieved', 'acted', 'adapted', 'added', 'administered', 'applied', 'arranged', 'awarded', 'balanced', 'billed', 'calculated', 'championed', 'checked', 'cleaned', 'closed', 'collected', 'completed', 'composed', 'conducted', 'configured', 'consolidated', 'contributed', 'converted', 'cooked', 'corrected', 'crafted', 'cultivated', 'customized', 'debugged', 'decreased', 'defined', 'deployed', 'diagnosed', 'drafted', 'drove', 'earned', 'edited', 'eliminated', 'enabled', 'ensured', 'executed', 'expanded', 'facilitated', 'filed', 'fixed', 'gathered', 'generated', 'handled', 'hired', 'hosted', 'inspected', 'installed', 'integrated', 'interviewed', 'invented', 'issued', 'kept', 'loaded', 'logged', 'migrated', 'modernized', 'monitored', 'moved', 'onboarded', 'operated', 'optimized', 'ordered', 'orchestrated', 'packed', 'performed', 'piloted', 'prepared', 'produced', 'programmed', 'published', 'raised', 'ran', 'rebuilt', 'received', 'recorded', 'redesigned', 'refactored', 'repaired', 'replaced', 'reported', 'restored', 'revamped', 'reviewed', 'scaled', 'secured', 'shipped', 'sold', 'solved', 'sourced', 'spearheaded', 'stocked', 'strengthened', 'structured', 'taught', 'transformed', 'translated', 'upgraded', 'won', 'wrote'].forEach((v) => ALL_VERBS.add(v));

// example bullets and a summary for common jobs – [brackets] are for the user to fill in
const EXAMPLES = {
  'Software developer': {
    summary: 'Software developer with [X] years of experience building reliable web applications in [languages]. Known for clean code, fast delivery and helping teammates grow.',
    bullets: ['Built [feature] used by [X] customers, increasing sign-ups by [X]%', 'Reduced page load time by [X]% by optimizing queries and caching', 'Automated the release process with CI/CD, cutting deployment time from [X] hours to [X] minutes', 'Mentored [X] junior developers through code reviews and pair programming', 'Fixed [X]+ production bugs and improved test coverage from [X]% to [X]%'],
  },
  'Customer service': {
    summary: 'Friendly customer service professional with [X] years of experience resolving questions by phone, email and chat while keeping satisfaction scores high.',
    bullets: ['Answered [X]+ customer calls and chats per day with a [X]% satisfaction score', 'Resolved billing and order issues on the first contact [X]% of the time', 'Trained [X] new team members on products, tools and service standards', 'Wrote [X] help articles that reduced repeat questions by [X]%', 'Recognized as Employee of the Month [X] times'],
  },
  'Sales': {
    summary: 'Results-driven sales professional with [X] years of B2B experience, consistently exceeding quota by building trust and long-term client relationships.',
    bullets: ['Exceeded annual quota by [X]%, closing $[X] in new business', 'Grew territory revenue from $[X] to $[X] in [X] months', 'Built a pipeline of [X]+ qualified leads through cold outreach and referrals', 'Negotiated renewals with [X] key accounts, achieving a [X]% retention rate', 'Ranked #[X] of [X] reps in [year]'],
  },
  'Retail associate': {
    summary: 'Dependable retail associate with experience in sales, stocking and cash handling. Enjoys helping customers find the right product.',
    bullets: ['Helped [X]+ customers per shift find products and complete purchases', 'Handled cash and card transactions with 100% accurate register counts', 'Restocked shelves and set up seasonal displays that lifted sales by [X]%', 'Signed up [X] customers for the store loyalty program in [month]', 'Trained [X] new associates on store procedures'],
  },
  'Nurse': {
    summary: 'Compassionate registered nurse with [X] years of experience in [unit], skilled in patient assessment, medication administration and family education.',
    bullets: ['Provided care for [X] patients per shift in a [X]-bed [unit]', 'Administered medications and treatments with zero medication errors', 'Educated patients and families on discharge plans, reducing readmissions by [X]%', 'Precepted [X] new graduate nurses', 'Documented care accurately in [EHR system]'],
  },
  'Teacher': {
    summary: 'Dedicated [subject] teacher with [X] years of experience creating engaging lessons that help every student make progress.',
    bullets: ['Taught [subject] to [X] students across [X] classes per year', 'Raised average test scores by [X]% through small-group instruction', 'Designed a new [unit/curriculum] adopted by the whole department', 'Communicated weekly with parents through newsletters and conferences', 'Led the after-school [club] with [X] members'],
  },
  'Marketing': {
    summary: 'Marketing specialist with [X] years of experience in content, email and paid social, focused on campaigns that drive measurable growth.',
    bullets: ['Planned and launched [X] campaigns that generated [X] leads', 'Grew email list from [X] to [X] subscribers with a [X]% open rate', 'Managed a $[X] monthly ad budget with a [X]x return on ad spend', 'Increased organic traffic by [X]% through SEO and content updates', 'Wrote [X]+ blog posts, landing pages and social posts'],
  },
  'Accountant': {
    summary: 'Detail-focused accountant with [X] years of experience in month-end close, reconciliations and financial reporting.',
    bullets: ['Managed month-end close for [X] entities, cutting close time by [X] days', 'Reconciled [X] bank and balance sheet accounts each month', 'Prepared financial statements and variance reports for leadership', 'Identified $[X] in duplicate payments and recovered [X]%', 'Supported annual audits with zero material findings'],
  },
  'Project manager': {
    summary: 'Project manager with [X] years of experience delivering [type] projects on time and on budget by keeping teams focused and stakeholders informed.',
    bullets: ['Managed [X] projects worth $[X], delivering [X]% on time and on budget', 'Led cross-functional teams of up to [X] people', 'Introduced [method/tool], improving delivery predictability by [X]%', 'Reported weekly progress and risks to senior stakeholders', 'Reduced project costs by [X]% through better vendor management'],
  },
  'Administrative assistant': {
    summary: 'Organized administrative assistant with [X] years of experience keeping offices running smoothly through scheduling, records and friendly front-desk service.',
    bullets: ['Managed calendars, travel and meetings for [X] managers', 'Answered and routed [X]+ calls and emails per day', 'Set up a digital filing system that cut document search time by [X]%', 'Ordered office supplies and kept spending [X]% under budget', 'Prepared reports, presentations and meeting minutes'],
  },
  'Data analyst': {
    summary: 'Data analyst with [X] years of experience turning raw data into clear dashboards and insights using SQL, Excel and [tool].',
    bullets: ['Built [X] dashboards in [tool] used weekly by [X] managers', 'Wrote SQL queries to analyze [X] million records and find [insight]', 'Automated a weekly report, saving [X] hours per month', 'Identified [insight] that increased revenue by $[X]', 'Cleaned and merged data from [X] sources into one model'],
  },
  'Graphic designer': {
    summary: 'Graphic designer with [X] years of experience creating brand identities, social media visuals and print materials that get noticed.',
    bullets: ['Designed [X]+ social media graphics per month, lifting engagement by [X]%', 'Created a complete brand identity for [client] including logo and guidelines', 'Produced print materials for [X] events and campaigns', 'Worked with marketing and product teams to deliver designs on deadline', 'Built a reusable template library that sped up production by [X]%'],
  },
  'Warehouse worker': {
    summary: 'Reliable warehouse worker experienced in picking, packing, forklift operation and inventory, with a strong safety record.',
    bullets: ['Picked and packed [X]+ orders per shift with [X]% accuracy', 'Operated forklifts and pallet jacks safely with zero incidents', 'Received and checked incoming shipments against purchase orders', 'Helped reorganize storage, reducing pick time by [X]%', 'Completed cycle counts and kept inventory records up to date'],
  },
  'Restaurant server': {
    summary: 'Energetic server with [X] years of experience in busy restaurants, known for great guest experiences and teamwork.',
    bullets: ['Served up to [X] guests per shift in a [X]-seat restaurant', 'Increased average check by [X]% by recommending specials and drinks', 'Handled cash and card payments accurately', 'Trained [X] new servers on menu and service standards', 'Kept tables and stations clean and ready during rush hours'],
  },
  'Driver': {
    summary: 'Safe and punctual driver with [X] years of experience and a clean driving record, delivering on time in city and highway conditions.',
    bullets: ['Completed [X]+ deliveries per day with a [X]% on-time rate', 'Kept a clean driving record for [X] years', 'Planned routes that cut fuel costs by [X]%', 'Inspected the vehicle daily and reported maintenance needs', 'Delivered friendly service and collected payments accurately'],
  },
  'Human resources': {
    summary: 'HR generalist with [X] years of experience in recruiting, onboarding and employee relations for teams of [X]+ people.',
    bullets: ['Hired [X] employees per year, cutting time-to-hire by [X] days', 'Ran onboarding for [X] new hires with a [X]% first-year retention', 'Updated the employee handbook and HR policies', 'Resolved employee relations cases fairly and confidentially', 'Managed benefits enrollment for [X] employees'],
  },
  'Electrician': {
    summary: 'Licensed electrician with [X] years of residential and commercial experience in installation, troubleshooting and code compliance.',
    bullets: ['Installed and repaired wiring, panels and lighting in [X]+ buildings', 'Diagnosed electrical faults and restored power quickly and safely', 'Completed every job to [code] standards with zero failed inspections', 'Read blueprints and worked with contractors to meet deadlines', 'Trained [X] apprentices on safe work practices'],
  },
  'Student / intern': {
    summary: '[Degree] student at [school] with hands-on experience in [skill] through projects and an internship. Quick learner looking for a [role] position.',
    bullets: ['Completed a [X]-week internship at [company], supporting the [team] team', 'Built [project] using [tools] as part of a team of [X]', 'Maintained a [X] GPA while working [X] hours per week', 'Led [club/activity] with [X] members', 'Presented research on [topic] at [event]'],
  },
};

const WEAK = ['responsible for', 'duties included', 'helped with', 'worked on', 'in charge of', 'tasked with', 'assisted with', 'involved in', 'various', 'etc'];
const CLICHES = ['hard worker', 'hard-working', 'hardworking', 'team player', 'go-getter', 'synergy', 'think outside the box', 'detail-oriented', 'results-oriented', 'self-starter', 'dynamic', 'passionate about', 'best of breed', 'proven track record', 'go-to person', 'rockstar', 'ninja', 'guru'];
const PRONOUNS = /\b(i|me|my|mine|myself)\b/i;

const words = (s) => (String(s || '').match(/[A-Za-z0-9'+#.-]+/g) || []);
const wc = (s) => words(s).length;

// resume checker → { score, items:[{level:'good'|'warn'|'bad', text}] }
function checkResume(R, pages) {
  const items = [], add = (level, text, pts) => items.push({ level, text, pts: pts || 0 });
  let score = 100;
  const minus = (n, level, text) => { score -= n; add(level, text, n); };
  const c = R.contact || {};
  if (!c.fullName) minus(10, 'bad', 'Add your full name at the top.');
  if (!c.email) minus(8, 'bad', 'Add an email address so employers can reach you.');
  else if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c.email)) minus(5, 'bad', `“${c.email}” does not look like a valid email address.`);
  else if (/^(.*(sexy|420|69|lol|xx|cutie|baby|hot)[^@]*)@/i.test(c.email)) minus(3, 'warn', 'Use a simple, professional email address (for example firstname.lastname@…).');
  if (!c.phone) minus(4, 'warn', 'Add a phone number.');
  if (!c.location) minus(2, 'warn', 'Add your city and state/country – many employers filter by location.');
  if (!c.title) minus(3, 'warn', 'Add a headline under your name, for example the job title you want.');
  const sw = wc(R.summary);
  if (!sw) minus(6, 'warn', 'Add a short summary (2–4 sentences) about who you are and what you offer.');
  else if (sw < 25) minus(3, 'warn', `Your summary is short (${sw} words). Aim for 30–80 words.`);
  else if (sw > 110) minus(3, 'warn', `Your summary is long (${sw} words). Keep it under about 80 words.`);
  else add('good', `Summary length is good (${sw} words).`);
  const jobs = (R.experience || []).filter((x) => x.role || x.company);
  if (!jobs.length && !(R.education || []).length) minus(15, 'bad', 'Add your work experience or education.');
  else if (!jobs.length) minus(6, 'warn', 'No work experience yet – add internships, volunteering, projects or part-time jobs.');
  let bulletsAll = [], noDates = 0, few = 0, many = 0;
  jobs.forEach((j) => {
    const b = (j.bullets || '').split('\n').map((s) => s.replace(/^[•\-*–]\s*/, '').trim()).filter(Boolean);
    bulletsAll.push(...b);
    if (!j.start) noDates++;
    if (b.length < 2) few++;
    if (b.length > 7) many++;
  });
  if (noDates) minus(4, 'warn', `${noDates} job${noDates > 1 ? 's are' : ' is'} missing dates.`);
  if (few) minus(5, 'warn', `${few} job${few > 1 ? 's have' : ' has'} fewer than 2 bullet points. Add 3–5 achievements per job.`);
  if (many) minus(2, 'warn', `${many} job${many > 1 ? 's have' : ' has'} more than 7 bullets. Keep the strongest 3–6.`);
  if (bulletsAll.length) {
    const startsVerb = bulletsAll.filter((b) => ALL_VERBS.has(b.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, ''))).length;
    const withNum = bulletsAll.filter((b) => /\d|%|\$/.test(b)).length;
    const long = bulletsAll.filter((b) => wc(b) > 30).length;
    const vr = startsVerb / bulletsAll.length, nr = withNum / bulletsAll.length;
    if (vr < 0.6) minus(8, 'warn', `Only ${Math.round(vr * 100)}% of your bullets start with an action verb. Start with words like “Led”, “Built”, “Increased”.`);
    else add('good', `${Math.round(vr * 100)}% of bullets start with a strong action verb.`);
    if (nr < 0.3) minus(8, 'warn', `Only ${withNum} of ${bulletsAll.length} bullets have a number. Add results: %, $, time saved, people served.`);
    else add('good', `${withNum} of ${bulletsAll.length} bullets show measurable results.`);
    if (long) minus(3, 'warn', `${long} bullet${long > 1 ? 's are' : ' is'} longer than 30 words. Keep each to one or two lines.`);
    const brackets = bulletsAll.filter((b) => /\[[^\]]*\]/.test(b)).length + (/\[[^\]]*\]/.test(R.summary || '') ? 1 : 0);
    if (brackets) minus(6, 'bad', `${brackets} line${brackets > 1 ? 's still have' : ' still has'} [placeholders] from the examples – replace them with your own details.`);
  }
  const all = resumeText(R).toLowerCase();
  const weak = WEAK.filter((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(all));
  if (weak.length) minus(Math.min(8, weak.length * 2), 'warn', `Weak phrases found: ${weak.map((w) => '“' + w + '”').join(', ')}. Say what you achieved instead.`);
  const cl = CLICHES.filter((w) => all.includes(w));
  if (cl.length) minus(Math.min(6, cl.length * 2), 'warn', `Overused words: ${cl.map((w) => '“' + w + '”').join(', ')}. Show it with an example instead.`);
  if (bulletsAll.some((b) => PRONOUNS.test(b)) || PRONOUNS.test(R.summary || '')) minus(3, 'warn', 'Avoid “I”, “me” and “my” – resumes are written without personal pronouns.');
  const skills = (R.skills || []).filter((s) => s.name);
  if (skills.length < 5) minus(4, 'warn', `Add more skills (${skills.length} now, aim for 6–12). Employers and ATS software search for them.`);
  else add('good', `${skills.length} skills listed.`);
  if (!(R.education || []).some((e) => e.school || e.degree)) minus(4, 'warn', 'Add your education (school, degree or certificate).');
  if (pages > 2) minus(6, 'warn', `Your resume is about ${pages} pages. Most employers prefer 1–2 pages.`);
  else add('good', `Length: about ${pages} page${pages > 1 ? 's' : ''}.`);
  const dup = {}; bulletsAll.forEach((b) => { const v = b.split(/\s+/)[0].toLowerCase(); dup[v] = (dup[v] || 0) + 1; });
  const rep = Object.entries(dup).filter(([v, n]) => n >= 3 && v.length > 2);
  if (rep.length) minus(2, 'warn', `You start ${rep.map(([v, n]) => `${n} bullets with “${v}”`).join(', ')}. Mix in other verbs.`);
  return { score: Math.max(0, Math.min(100, Math.round(score))), items };
}

// all visible text of a resume (for keyword matching and plain-text export)
function resumeText(R) {
  const parts = [R.contact && R.contact.title, R.summary];
  (R.experience || []).forEach((x) => parts.push(x.role, x.company, x.bullets));
  (R.education || []).forEach((x) => parts.push(x.degree, x.school, x.details));
  (R.skills || []).forEach((x) => parts.push(x.name));
  (R.projects || []).forEach((x) => parts.push(x.name, x.desc));
  (R.certs || []).forEach((x) => parts.push(x.name, x.issuer));
  (R.languages || []).forEach((x) => parts.push(x.name));
  (R.awards || []).forEach((x) => parts.push(x.name, x.desc));
  (R.volunteer || []).forEach((x) => parts.push(x.role, x.company, x.bullets));
  (R.custom || []).forEach((s) => (s.items || []).forEach((x) => parts.push(x.title, x.sub, x.desc)));
  return parts.filter(Boolean).join('\n');
}

const STOP = new Set(('a about above after again against all also am an and any are aren as at be because been before being below between both but by can could did do does doing down during each etc few for from further had has have having he her here hers him his how i if in into is it its itself just more most must my no nor not now of off on once only or other our ours out over own per plus same she should so some such than that the their them then there these they this those through to too under until up very via was we were what when where which while who whom why will with within without would you your yours ' +
  'able ability abilities apply applicant applicants candidate candidates company role position job jobs work working works team teams including include includes using use used new well across strong excellent good great years year experience experienced requirements required requirement preferred plus ideal ideally responsibilities responsibility opportunity opportunities benefits salary equal employer employment based help helping make making ensure provide providing support supporting within day days week weeks time full part looking join us ability must etc e.g i.e like one two three will skills skill knowledge understanding environment level high highly related relevant other others need needs needed want wants seeking ' +
  'drive driving drives own owning owns run running runs hit hitting hits record track manage manages managing reduce reducing reduces deliver delivering deliver ensure ensuring create creating build building lead leading join joining grow growing take taking get getting keep keeping bring bringing love loves passion passionate fast paced fast-paced self motivated dynamic proven track-record successful success-driven candidate.').split(/\s+/));

function keywordsOf(text) { // → [{k, n}] most important first
  const t = String(text || '').toLowerCase().replace(/[’']/g, "'");
  const tokens = t.match(/[a-z][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || [];
  const counts = new Map();
  const bump = (k, w) => counts.set(k, (counts.get(k) || 0) + w);
  const sing = (w) => (w && w.length > 4 && /[^su]s$/.test(w) && !/(ics|ness|sis|ous)$/.test(w) ? w.slice(0, -1) : w);
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replace(/[./-]+$/, '');
    if (raw.length < 2 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    const a = sing(raw);
    bump(a, 1);
    const b0 = tokens[i + 1] && tokens[i + 1].replace(/[./-]+$/, ''), b = b0 && sing(b0);
    if (b && !STOP.has(b0) && b.length > 1 && !/^\d+$/.test(b)) bump(a + ' ' + b, 1.6);
  }
  let list = [...counts.entries()].map(([k, n]) => ({ k, n }));
  // drop single words that mostly appear inside a stronger two-word phrase
  const pairs = list.filter((x) => x.k.includes(' ') && x.n >= 3.2);
  list = list.filter((x) => x.k.includes(' ') ? x.n >= 3.2 : !pairs.some((p) => p.k.split(' ').includes(x.k) && p.n / 1.6 >= x.n * 0.8));
  list.sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  return list.slice(0, 30).map((x) => ({ k: x.k, n: Math.round(x.n / (x.k.includes(' ') ? 1.6 : 1)) }));
}
function matchJob(R, jd) {
  const kws = keywordsOf(jd);
  const mine = ' ' + resumeText(R).toLowerCase().replace(/[^a-z0-9+#]+/g, ' ') + ' ';
  const has = (k) => {
    const v = k.replace(/[^a-z0-9+#]+/g, ' ').trim();
    if (mine.includes(' ' + v + ' ')) return true;
    const stem = v.replace(/(ing|ed|es|s)$/, '');
    return stem.length > 3 && mine.includes(' ' + stem);
  };
  const found = kws.filter((x) => has(x.k)), missing = kws.filter((x) => !has(x.k));
  const total = kws.reduce((s, x) => s + x.n, 0) || 1, got = found.reduce((s, x) => s + x.n, 0);
  return { pct: kws.length ? Math.round((got / total) * 100) : 0, found, missing };
}
