// Static site generator for the portfolio. Run: node build/build.mjs
// Writes English pages at the repo root and translations under /nl, /pt and /es.
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from './data.mjs';
import snippets from './snippets.mjs';
import en from './content/en.mjs';
import nl from './content/nl.mjs';
import pt from './content/pt.mjs';
import es from './content/es.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://khariss1805.github.io/Portfolio/';
const CONFIG = {
  name: 'Julieta Lara Romero',
  email: 'julietalarar98@gmail.com',
  phone: '+57 322 211 8698',
  phoneHref: '+573222118698',
  linkedin: null, // e.g. 'https://www.linkedin.com/in/your-handle/'
  cv: 'assets/Julieta-Lara-Romero-CV.pdf',
};
const LANGS = [
  { c: en, dir: '', code: 'EN' },
  { c: nl, dir: 'nl/', code: 'NL' },
  { c: pt, dir: 'pt/', code: 'PT' },
  { c: es, dir: 'es/', code: 'ES' },
];
const PROJECTS = ['csat-drivers', 'agent-scorecard', 'repeat-contacts', 'volume-forecast', 'qa-calibration', 'retention-cohorts'];
const FEATURED = ['csat-drivers', 'agent-scorecard', 'volume-forecast'];
const data = buildData();

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const statsOf = (key) => data[key].stats;
function fill(str, c) {
  return str.replace(/\{(p\d)\.(\w+)(\|abs)?\}/g, (_, p, k, abs) => {
    let v = statsOf(p)[k];
    if (v === undefined) throw new Error(`Missing stat ${p}.${k}`);
    if (abs) v = Math.abs(v);
    return num(v, c);
  });
}
const num = (v, c, d = 2) => new Intl.NumberFormat(c.locale, { maximumFractionDigits: d }).format(v).replace('-', '−');
const T = (s, c) => fill(s, c); // text with placeholders, may contain trusted inline HTML
function rel(from, to) {
  const r = posix.relative(posix.dirname('/' + from), '/' + to);
  return r === '' ? './' : r;
}

// ---------------------------------------------------------------- layout
function head(c, page, title, description, dir = '') {
  const self = dir + page;
  const alt = LANGS.map((l) => `<link rel="alternate" hreflang="${l.c.lang}" href="${SITE}${l.dir}${page}">`).join('\n  ');
  return `<!doctype html>
<html lang="${c.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  ${alt}
  <link rel="alternate" hreflang="x-default" href="${SITE}${page}">
  <link rel="icon" href="${rel(self, 'assets/favicon.svg')}" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:ital,wght@0,400..700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${rel(self, 'assets/site.css')}">
  <script>document.documentElement.classList.add('js')</script>
</head>`;
}

function header(c, page, dir, current) {
  const link = (to, label, key) =>
    `<a href="${rel(dir + page, dir + to)}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const langs = LANGS.map((l) =>
    `<a href="${rel(dir + page, l.dir + page)}" hreflang="${l.c.lang}" lang="${l.c.lang}" title="${esc(l.c.langName)}"${l.c === c ? ' aria-current="true"' : ''}>${l.code}</a>`).join('');
  return `<a class="skip" href="#main">${c.nav.skip}</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="${rel(dir + page, dir + 'index.html')}">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="currentColor"/></svg>
      <span><span class="brand-name">${CONFIG.name}</span><span class="brand-role">${c.role}</span></span>
    </a>
    <nav class="main-nav" aria-label="Main">
      ${link('index.html', c.nav.home, 'home')}
      ${link('about.html', c.nav.about, 'about')}
      ${link('projects.html', c.nav.projects, 'projects')}
      <a href="${rel(dir + page, CONFIG.cv)}">${c.nav.resume}</a>
    </nav>
    <nav class="lang-switch" aria-label="${c.nav.language}">${langs}</nav>
  </div>
</header>`;
}

function footer(c, page, dir) {
  const p = dir + page;
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="footer-name">${CONFIG.name}</p>
      <p class="muted">${c.footer.bio}</p>
    </div>
    <div>
      <h2 class="footer-h">${c.footer.pages}</h2>
      <ul class="plain">
        <li><a href="${rel(p, dir + 'index.html')}">${c.nav.home}</a></li>
        <li><a href="${rel(p, dir + 'about.html')}">${c.nav.about}</a></li>
        <li><a href="${rel(p, dir + 'projects.html')}">${c.nav.projects}</a></li>
        <li><a href="${rel(p, CONFIG.cv)}">${c.nav.resume}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">${c.footer.contact}</h2>
      <ul class="plain">
        <li><a href="mailto:${CONFIG.email}">${CONFIG.email}</a></li>
        <li><a href="tel:${CONFIG.phoneHref}">${CONFIG.phone}</a></li>
        ${CONFIG.linkedin ? `<li><a href="${CONFIG.linkedin}" rel="me">LinkedIn</a></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="wrap footer-base muted">
    <p>© ${new Date().getFullYear()} ${CONFIG.name}</p>
    <p>${c.footer.built}</p>
  </div>
</footer>`;
}

function page(c, dir, file, current, title, description, body, extra = '') {
  const out = `${head(c, file, title, description, dir)}
<body>
${header(c, file, dir, current)}
<main id="main">
${body}
</main>
${footer(c, file, dir)}
<script src="${rel(dir + file, 'assets/site.js')}" defer></script>
${extra}
</body>
</html>
`;
  const path = join(ROOT, dir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
}

function contactBlock(c, p) {
  return `<section class="section contact" id="contact" aria-labelledby="contact-h">
  <div class="wrap contact-inner">
    <div>
      <h2 id="contact-h">${c.contact.heading}</h2>
      <p class="lede">${c.contact.text}</p>
    </div>
    <ul class="contact-list plain">
      <li><span class="muted">${c.contact.email}</span><a href="mailto:${CONFIG.email}">${CONFIG.email}</a></li>
      <li><span class="muted">${c.contact.phone}</span><a href="tel:${CONFIG.phoneHref}">${CONFIG.phone}</a></li>
      ${CONFIG.linkedin ? `<li><span class="muted">${c.contact.linkedin}</span><a href="${CONFIG.linkedin}" rel="me">${CONFIG.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></li>` : ''}
      <li><a class="btn" href="${rel(p, CONFIG.cv)}" download>${c.contact.resume}</a></li>
    </ul>
  </div>
</section>`;
}

function projectRow(c, slug, from, dir, n) {
  const pr = c.projects[slug];
  return `<li class="proj" data-cat="${pr.category}">
  <a class="proj-link" href="${rel(from, dir + 'projects/' + slug + '.html')}">
    <span class="proj-main">
      <span class="proj-cat">${c.categories[pr.category]}</span>
      <span class="proj-title">${T(pr.title, c)}</span>
      <span class="proj-short">${T(pr.short, c)}</span>
      <span class="proj-tools">${pr.tools.map((t) => `<span>${t}</span>`).join('')}</span>
    </span>
    <span class="proj-results">${pr.results.map(([b, s]) => `<span class="result"><strong>${T(b, c)}</strong><span>${T(s, c)}</span></span>`).join('')}</span>
  </a>
</li>`;
}

// ---------------------------------------------------------------- home
function home(c, dir) {
  const p = dir + 'index.html';
  const flow = c.home.flow.map((s, i) => `<li style="--i:${i}"><span class="node" aria-hidden="true"></span><strong>${s.t}</strong><span>${s.d}</span></li>`).join('');
  const work = FEATURED.map((s) => projectRow(c, s, p, dir, PROJECTS.indexOf(s) + 1)).join('');
  const focus = c.home.focus.map((f) => `<li><h3>${f.t}</h3><p>${f.d}</p></li>`).join('');
  const groups = c.home.skillGroups.map((g) => `<div class="skill-group">
      <h3>${g.t}</h3>
      <ul class="tags plain">${g.tools.map((t) => `<li>${t}</li>`).join('')}</ul>
      <p class="seein"><span class="muted">${c.home.seeIn}</span> ${g.projects.map((s) => `<a href="${rel(p, dir + 'projects/' + s + '.html')}">${T(c.projects[s].title, c)}</a>`).join('<span class="sep" aria-hidden="true">/</span>')}</p>
    </div>`).join('');
  const langs = c.languages.map(([l, lvl]) => `<li><strong>${l}</strong> <span class="muted">${lvl}</span></li>`).join('');
  const body = `<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <p class="hero-role">${c.role}</p>
      <h1 class="hero-name"><span>Julieta</span> <span>Lara Romero</span></h1>
      <p class="hero-lead">${c.home.lead}</p>
      <p class="muted hero-loc">${c.home.location}</p>
      <div class="actions">
        <a class="btn" href="#work">${c.home.ctaWork}</a>
        <a class="btn btn-quiet" href="${rel(p, CONFIG.cv)}" download>${c.home.ctaResume}</a>
      </div>
    </div>
    <figure class="flow" aria-labelledby="flow-cap">
      <figcaption id="flow-cap" class="flow-title">${c.home.flowTitle}</figcaption>
      <ol class="flow-list plain">${flow}</ol>
      <p class="flow-note muted">${c.home.flowNote}</p>
    </figure>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="work-h">${c.home.workHeading}</h2>
      <p class="lede">${c.home.workSub}</p>
    </div>
    <ol class="proj-list plain">${work}</ol>
    <p><a class="btn btn-quiet" href="${rel(p, dir + 'projects.html')}">${c.home.workAll}</a></p>
  </div>
</section>

<section class="section band" aria-labelledby="focus-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="focus-h">${c.home.focusHeading}</h2>
      <p class="lede">${c.home.focusSub}</p>
    </div>
    <ul class="focus plain">${focus}</ul>
  </div>
</section>

<section class="section" aria-labelledby="skills-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="skills-h">${c.home.skillsHeading}</h2>
      <p class="lede">${c.home.skillsSub}</p>
    </div>
    <div class="skills">${groups}</div>
  </div>
</section>

<section class="section band" aria-labelledby="about-h">
  <div class="wrap about-grid">
    <div>
      <h2 id="about-h">${c.home.aboutHeading}</h2>
      ${c.home.about.map((t) => `<p>${t}</p>`).join('')}
      <p class="actions"><a class="btn btn-quiet" href="${rel(p, dir + 'about.html')}">${c.home.aboutMore}</a></p>
    </div>
    <aside class="lang-card">
      <h3>${c.home.languagesHeading}</h3>
      <ul class="plain">${langs}</ul>
    </aside>
  </div>
</section>

${contactBlock(c, p)}`;
  page(c, dir, 'index.html', 'home', c.meta.title, c.meta.description, body);
}

// ---------------------------------------------------------------- about
function about(c, dir) {
  const p = dir + 'about.html';
  const tl = c.timeline.map((r, i) => `<li class="tl-item tl-${r.kind}">
    <details${i === c.timeline.length - 1 ? ' open' : ''}>
      <summary>
        <span class="tl-date">${r.date}</span>
        <span class="tl-what"><strong>${r.t}</strong><span class="muted">${r.org}</span></span>
        <span class="tl-kind">${c.about.kind[r.kind]}</span>
      </summary>
      <p>${r.d}</p>
    </details>
  </li>`).join('');
  const earlier = c.about.earlier.map((e) => `<li><a href="${rel(p, e.href)}"><strong>${e.t}</strong><span>${e.d}</span></a></li>`).join('');
  const langs = c.languages.map(([l, lvl]) => `<li><strong>${l}</strong> <span class="muted">${lvl}</span></li>`).join('');
  const body = `<section class="page-head">
  <div class="wrap about-grid">
    <div>
      <p class="hero-role">${c.nav.about}</p>
      <h1>${c.about.heading}</h1>
      <p class="hero-lead">${c.about.lead}</p>
      ${c.about.body.map((t) => `<p>${t}</p>`).join('')}
    </div>
    <aside class="lang-card">
      <h2 class="h3">${c.home.languagesHeading}</h2>
      <ul class="plain">${langs}</ul>
    </aside>
  </div>
</section>

<section class="section" aria-labelledby="tl-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="tl-h">${c.about.timelineHeading}</h2>
      <p class="lede">${c.about.timelineSub}</p>
    </div>
    <ol class="timeline plain">${tl}</ol>
  </div>
</section>

<section class="section band" aria-labelledby="earlier-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="earlier-h">${c.about.earlierHeading}</h2>
      <p class="lede">${c.about.earlierSub}</p>
    </div>
    <ul class="earlier plain">${earlier}</ul>
  </div>
</section>

${contactBlock(c, p)}`;
  page(c, dir, 'about.html', 'about', `${c.about.title} | ${CONFIG.name}`, c.about.lead, body);
}

// ---------------------------------------------------------------- projects index
function projectsIndex(c, dir) {
  const p = dir + 'projects.html';
  const cats = Object.keys(c.categories);
  const count = (k) => PROJECTS.filter((s) => c.projects[s].category === k).length;
  const filters = [`<button type="button" aria-pressed="true" data-filter="all">${c.projectsPage.all} <span>${PROJECTS.length}</span></button>`]
    .concat(cats.map((k) => `<button type="button" aria-pressed="false" data-filter="${k}">${c.categories[k]} <span>${count(k)}</span></button>`)).join('');
  const rows = PROJECTS.map((s, i) => projectRow(c, s, p, dir, i + 1)).join('');
  const earlier = c.about.earlier.map((e) => `<li><a href="${rel(p, e.href)}"><strong>${e.t}</strong><span>${e.d}</span></a></li>`).join('');
  const body = `<section class="page-head">
  <div class="wrap">
    <p class="hero-role">${c.projectsPage.title}</p>
    <h1>${c.projectsPage.heading}</h1>
    <p class="hero-lead">${c.projectsPage.sub}</p>
    <p class="practice-note">${c.practice.note}</p>
  </div>
</section>
<section class="section section-tight" aria-label="${c.projectsPage.title}">
  <div class="wrap">
    <div class="filters" role="group" aria-label="${c.projectsPage.title}" hidden>${filters}</div>
    <ol class="proj-list plain" id="proj-list">${rows}</ol>
  </div>
</section>
<section class="section band" aria-labelledby="earlier-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="earlier-h">${c.projectsPage.earlierHeading}</h2>
      <p class="lede">${c.projectsPage.earlierSub}</p>
    </div>
    <ul class="earlier plain">${earlier}</ul>
  </div>
</section>
<section class="section">
  <div class="wrap cta-row">
    <h2>${c.projectsPage.cta}</h2>
    <a class="btn" href="${rel(p, CONFIG.cv)}" download>${c.projectsPage.ctaBtn}</a>
  </div>
</section>`;
  page(c, dir, 'projects.html', 'projects', `${c.projectsPage.title} | ${CONFIG.name}`, c.projectsPage.sub, body);
}

// ---------------------------------------------------------------- charts
function chartSpecs(c) {
  const L = c.chart;
  const d = data;
  const specs = {};
  specs['p1-drivers'] = { type: 'hbar', unit: ' ' + L.pts, labels: d.p1.drivers.map((x) => L.drivers[x.key]), series: [{ name: L.gapPts, values: d.p1.drivers.map((x) => x.gap), color: 'iris' }], axis: L.gapPts };
  specs['p1-reasons'] = { type: 'hbar', unit: '%', min: 50, labels: d.p1.byReason.map((x) => L.reasons[x.key]), series: [{ name: L.csatPct, values: d.p1.byReason.map((x) => x.csat), colors: d.p1.byReason.map((x) => (['cancel', 'fault'].includes(x.key) ? 'orchid' : 'iris')) }], axis: L.csatPct };
  specs['p1-langs'] = { type: 'bar', unit: '%', min: 50, labels: d.p1.byLang.map((x) => L.langs[x.key]), series: [{ name: L.csatPct, values: d.p1.byLang.map((x) => x.csat), colors: d.p1.byLang.map((x) => (x.key === 'nl' ? 'orchid' : 'iris')) }], axis: L.csatPct };
  const s2 = d.p2.stats;
  const quad = (a) => (a.aht < s2.medAht && a.qa < s2.targetQa ? 0 : a.aht >= s2.medAht && a.qa >= s2.targetQa ? 2 : 1);
  specs['p2-scatter'] = {
    type: 'scatter', xLabel: L.aht, yLabel: L.qa, refX: s2.medAht, refY: s2.targetQa,
    groups: [[L.quadFastLow, 'orchid'], [L.quadOther, 'lav'], [L.quadSlowHigh, 'iris']].map(([name, color], gi) => ({
      name, color, points: d.p2.agents.filter((a) => quad(a) === gi).map((a) => ({ x: a.aht, y: a.qa, id: a.id })),
    })),
    agentLabel: L.agent,
  };
  const items2 = [...d.p2.items].sort((a, b) => b.rate - a.rate);
  specs['p2-items'] = { type: 'hbar', unit: '%', labels: items2.map((x) => L.qaItems[x.key]), series: [{ name: L.failRate, values: items2.map((x) => x.rate), colors: items2.map((x, i) => (i < 2 ? 'orchid' : 'iris')) }], axis: L.failRate };
  specs['p3-reasons'] = { type: 'hbar', unit: '%', labels: d.p3.byReason.map((x) => L.reasons[x.key]), series: [{ name: L.repeatPct, values: d.p3.byReason.map((x) => x.rate), colors: d.p3.byReason.map((x) => (['delivery', 'fault'].includes(x.key) ? 'orchid' : 'iris')) }], axis: L.repeatPct };
  specs['p3-days'] = { type: 'bar', unit: '%', labels: d.p3.days.map((_, i) => L.dayN.replace('{n}', i + 1)), series: [{ name: L.shareRepeats, values: d.p3.days, colors: d.p3.days.map((_, i) => (i < 2 ? 'orchid' : 'iris')) }], axis: L.shareRepeats };
  const h = d.p4.history.length;
  const pad = (n) => Array(n).fill(null);
  specs['p4-forecast'] = {
    type: 'line', labels: Array.from({ length: h + 12 }, (_, i) => L.weekN.replace('{n}', i + 1)), axis: L.contacts,
    series: [
      { name: L.actual, values: d.p4.history.concat(pad(12)), color: 'ink' },
      { name: L.backtest, values: pad(h - 12).concat(d.p4.backtest, pad(12)), color: 'orchid', dash: true },
      { name: L.forecast, values: pad(h - 1).concat([d.p4.history[h - 1]], d.p4.future), color: 'iris' },
      { name: L.range, values: pad(h).concat(d.p4.band.map((b) => b[1])), color: 'lav', band: 'upper', hidden: true },
      { name: L.range, values: pad(h).concat(d.p4.band.map((b) => b[0])), color: 'lav', band: 'lower' },
    ],
  };
  specs['p4-staff'] = {
    type: 'combo', labels: d.p4.monday.map((r) => `${r.hour}:00`), axis: L.calls, axis2: L.agentsNeeded,
    series: [
      { name: L.calls, values: d.p4.monday.map((r) => r.calls), color: 'lav' },
      { name: L.agentsNeeded, values: d.p4.monday.map((r) => r.agents), color: 'iris', line: true },
    ],
    extra: { name: L.serviceLevel, values: d.p4.monday.map((r) => r.sl), unit: '%' },
  };
  specs['p5-dev'] = { type: 'bar', unit: ' ' + L.pts, signed: true, labels: d.p5.deviation.map((x) => `${L.evaluator} ${x.key}`), series: [{ name: L.deviation, values: d.p5.deviation.map((x) => x.dev), colors: d.p5.deviation.map((x) => (Math.abs(x.dev) > 3 ? 'orchid' : 'iris')) }], axis: L.deviation };
  specs['p5-items'] = { type: 'hbar', unit: '%', max: 100, labels: d.p5.itemAgree.map((x) => L.qaItems[x.key]), series: [{ name: L.agreement, values: d.p5.itemAgree.map((x) => x.agree), colors: d.p5.itemAgree.map((x) => (x.agree < 60 ? 'orchid' : 'iris')) }], axis: L.agreement };
  specs['p6-curves'] = {
    type: 'line', unit: '%', labels: d.p6.curves.call.map((_, i) => L.monthN.replace('{n}', i)), axis: L.retained,
    series: [
      { name: L.welcomeCall, values: d.p6.curves.call, color: 'iris' },
      { name: L.emailOnly, values: d.p6.curves.email, color: 'orchid', dash: true },
    ],
  };
  return specs;
}

function heatTable(c, rows, colLabels, rowLabels, { caption, max, unit = '', rowHeader, extraCol }) {
  const cells = rows.map((row, ri) => `<tr><th scope="row">${rowLabels[ri]}</th>${extraCol ? `<td class="num">${extraCol[ri]}</td>` : ''}${row.map((v) => {
    if (v == null) return '<td class="heat-empty"></td>';
    const k = Math.max(0, Math.min(1, v / max));
    return `<td class="heat${k > 0.55 ? ' heat-strong' : ''}" style="--k:${k.toFixed(3)}">${num(v, c, 1)}${unit}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table class="heat-table">
  <caption class="sr-only">${caption}</caption>
  <thead><tr><th scope="col">${rowHeader}</th>${extraCol ? `<th scope="col">${c.chart.members}</th>` : ''}${colLabels.map((l) => `<th scope="col">${l}</th>`).join('')}</tr></thead>
  <tbody>${cells}</tbody></table></div>`;
}

function chartFigure(c, id, caption, specs) {
  const L = c.chart;
  if (id === 'p4-heat') {
    const max = Math.max(...data.p4.heat.flat());
    return `<figure class="chart-fig"><div class="figbox">${heatTable(c, data.p4.heat, data.p4.hours.map((h) => `${h}h`), L.weekdays, { caption, max, rowHeader: '' })}</div><figcaption>${T(caption, c)}</figcaption></figure>`;
  }
  if (id === 'p6-cohorts') {
    const months = data.p6.cohorts[0].row.map((_, i) => L.monthN.replace('{n}', i));
    const fmt = new Intl.DateTimeFormat(c.locale, { month: 'short', year: 'numeric' });
    const labels = data.p6.cohorts.map((g) => fmt.format(new Date(g.cohort + '-15')));
    return `<figure class="chart-fig"><div class="figbox">${heatTable(c, data.p6.cohorts.map((g) => g.row), months, labels, { caption, max: 100, unit: '%', rowHeader: L.cohort, extraCol: data.p6.cohorts.map((g) => num(g.size, c)) })}</div><figcaption>${T(caption, c)}</figcaption></figure>`;
  }
  const s = specs[id];
  // accessible data table
  let table = '';
  if (s.type === 'scatter') {
    const rows = s.groups.flatMap((g) => g.points.map((pt) => [pt.id, pt.x, pt.y, g.name])).sort((a, b) => a[0].localeCompare(b[0]));
    table = `<table><thead><tr><th>${s.agentLabel}</th><th>${s.xLabel}</th><th>${s.yLabel}</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td class="num">${num(r[1], c)}</td><td class="num">${num(r[2], c)}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`;
  } else {
    const series = s.series.filter((x) => !x.band).concat(s.series.filter((x) => x.band === 'upper').map((x) => ({ ...x, name: x.name + ' ↑' })), s.series.filter((x) => x.band === 'lower').map((x) => ({ ...x, name: x.name + ' ↓' })));
    if (s.extra) series.push({ ...s.extra });
    const rowsIdx = s.labels.map((_, i) => i).filter((i) => series.some((x) => x.values[i] != null));
    table = `<table><thead><tr><th></th>${series.map((x) => `<th scope="col">${x.name}</th>`).join('')}</tr></thead><tbody>${rowsIdx.map((i) => `<tr><th scope="row">${s.labels[i]}</th>${series.map((x) => `<td class="num">${x.values[i] == null ? '' : num(x.values[i], c, 1)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  const tall = s.type === 'hbar' ? ` style="--h:${Math.max(220, s.labels.length * 44 + 60)}px"` : '';
  return `<figure class="chart-fig">
  <div class="figbox"><div class="chart"${tall}><canvas id="${id}" role="img" aria-label="${esc(T(caption, c))}"></canvas></div></div>
  <figcaption>${T(caption, c)} <span class="muted">${c.labels.chartHint}</span></figcaption>
  <details class="data-table"><summary>${c.labels.table}</summary><div class="table-scroll">${table}</div></details>
</figure>`;
}

// ---------------------------------------------------------------- case study
function caseStudy(c, dir, slug, i) {
  const file = `projects/${slug}.html`;
  const p = dir + file;
  const pr = c.projects[slug];
  const specs = chartSpecs(c);
  const used = [];
  const fig = (id, cap) => { if (specs[id]) used.push(id); return chartFigure(c, id, cap, specs); };
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const s2 = data.p2.stats;
  let dash = '';
  if (pr.dashboard) {
    const L = c.chart;
    const tiles = [
      [L.kpiAht, `${num(s2.medAhtMin, c)} ${L.minutes}`, false],
      [L.kpiQa, num(s2.avgQa, c), s2.avgQa < s2.targetQa],
      [L.kpiCsat, `${num(s2.avgCsat, c)}%`, false],
      [L.kpiFcr, `${num(s2.avgFcr, c)}%`, s2.avgFcr < 70],
    ].map(([k, v, miss]) => `<div class="kpi${miss ? ' kpi-miss' : ''}"><span>${k}</span><strong>${v}</strong></div>`).join('');
    dash = `<div class="dash" aria-label="Dashboard">
      <div class="dash-bar"><span class="dash-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${T(pr.title, c)}</span></div>
      <div class="kpis">${tiles}</div>
      <div class="dash-grid">
        ${pr.findings.map((f) => fig(f.chart, f.caption)).join('')}
      </div>
    </div>`;
  }
  const findings = pr.findings.map((f) => `<div class="finding">
      <h3>${T(f.t, c)}</h3>
      <p>${T(f.text, c)}</p>
      ${pr.dashboard ? '' : fig(f.chart, f.caption)}
    </div>`).join('');
  const snip = snippets[pr.code];
  const chartData = Object.fromEntries(used.map((id) => [id, specs[id]]));
  const body = `<article>
<header class="page-head case-head">
  <div class="wrap narrow">
    <nav class="crumbs" aria-label="${c.labels.breadcrumbs}"><a href="${rel(p, dir + 'index.html')}">${c.nav.home}</a><span aria-hidden="true">/</span><a href="${rel(p, dir + 'projects.html')}">${c.nav.projects}</a></nav>
    <p class="case-tags"><span class="tag">${c.categories[pr.category]}</span><span class="tag tag-practice">${c.practice.tag}</span></p>
    <h1>${T(pr.title, c)}</h1>
    <p class="hero-lead">${T(pr.lead, c)}</p>
    <div class="case-results">${pr.results.map(([b, s]) => `<span class="result"><strong>${T(b, c)}</strong><span>${T(s, c)}</span></span>`).join('')}</div>
    <p class="practice-note">${c.practice.note}</p>
  </div>
</header>
<div class="wrap narrow case-body">
  <section><h2>${c.labels.question}</h2>${pr.question.map((t) => `<p>${T(t, c)}</p>`).join('')}</section>
  <section><h2>${c.labels.data}</h2>${pr.data.map((t) => `<p>${T(t, c)}</p>`).join('')}</section>
  <section><h2>${c.labels.approach}</h2><ol class="steps">${pr.approach.map((t) => `<li>${T(t, c)}</li>`).join('')}</ol></section>
</div>
${dash ? `<div class="wrap wide">${dash}</div>` : ''}
<div class="wrap narrow case-body">
  <section><h2>${c.labels.findings}</h2>${findings}</section>
  <section><h2>${c.labels.recommend}</h2><ul class="recs">${pr.recommend.map((t) => `<li>${T(t, c)}</li>`).join('')}</ul></section>
  <section><h2>${c.labels.code}</h2>
    <figure class="code"><figcaption>${snip.lang}</figcaption><pre tabindex="0"><code>${esc(snip.code)}</code></pre></figure>
  </section>
  <section><h2>${c.labels.tools}</h2><ul class="tags plain">${pr.tools.map((t) => `<li>${t}</li>`).join('')}</ul></section>
  <nav class="case-nav" aria-label="${c.nav.projects}">
    <a href="${rel(p, dir + 'projects.html')}">${c.labels.back}</a>
    <a class="case-next" href="${rel(p, dir + 'projects/' + next + '.html')}"><span class="muted">${c.labels.next}</span>${T(c.projects[next].title, c)}</a>
  </nav>
</div>
</article>`;
  const extra = used.length ? `<script type="application/json" id="chart-data">${JSON.stringify({ locale: c.locale, charts: chartData }).replace(/</g, '\\u003c')}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" defer></script>
<script src="${rel(p, 'assets/charts.js')}" defer></script>` : '';
  page(c, dir, file, 'projects', `${T(pr.title, c)} | ${CONFIG.name}`, T(pr.short, c), body, extra);
}

// ---------------------------------------------------------------- run
for (const l of LANGS) {
  if (l.dir && existsSync(join(ROOT, l.dir))) rmSync(join(ROOT, l.dir), { recursive: true });
  home(l.c, l.dir);
  about(l.c, l.dir);
  projectsIndex(l.c, l.dir);
  PROJECTS.forEach((s, i) => caseStudy(l.c, l.dir, s, i));
}
// sitemap
const pages = ['index.html', 'about.html', 'projects.html', ...PROJECTS.map((s) => `projects/${s}.html`)];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => pages.map((pg) => `  <url><loc>${SITE}${l.dir}${pg}</loc>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a.c.lang}" href="${SITE}${a.dir}${pg}"/>`).join('')}</url>`)).join('\n')}
</urlset>
`);
console.log(`Built ${LANGS.length} languages × ${pages.length} pages`);
