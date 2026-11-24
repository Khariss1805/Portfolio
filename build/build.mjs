// Static site generator for the portfolio. Run: node build/build.mjs
// Writes English pages at the repo root and translations under /nl, /pt and /es.
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildData } from './data.mjs';
import snippets from './snippets.mjs';
import { workbooks, colName } from './workbooks.mjs';
import en from './content/en.mjs';
import nl from './content/nl.mjs';
import pt from './content/pt.mjs';
import es from './content/es.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://khariss1805.github.io/Portfolio/';
const CONFIG = {
  name: 'Julieta Lara Romero',
  email: 'julietalarar98@gmail.com',
  linkedin: 'https://www.linkedin.com/in/julieta-lara-romero-525366285/',
  cv: 'assets/Julieta-Lara-Romero-CV.pdf',
  // Excel workbook shown on each project page. By default the build writes a
  // workbook from the synthetic data to assets/excel/<project>.xlsx. To show
  // your own instead, add an entry here:
  //   'sales-dashboard': { file: 'assets/excel/my-dashboard.xlsx' }
  //     links your own file (put it in assets/excel/ under a different name);
  //   'sales-dashboard': { embed: 'https://onedrive.live.com/embed?...' }
  //     shows your live workbook from OneDrive / Excel for the web (File >
  //     Share > Embed in Excel) instead of the built-in preview.
  excel: {},
};
const LANGS = [
  { c: en, dir: '', code: 'EN' },
  { c: nl, dir: 'nl/', code: 'NL' },
  { c: pt, dir: 'pt/', code: 'PT' },
  { c: es, dir: 'es/', code: 'ES' },
];
const PROJECTS = ['sales-dashboard', 'checkout-ab-test', 'signup-funnel', 'usability-study', 'order-forecast', 'onboarding-retention'];
const FEATURED = ['sales-dashboard', 'checkout-ab-test', 'usability-study'];
const data = buildData();
const MEDIA = JSON.parse(readFileSync(join(ROOT, 'assets/work/manifest.json'), 'utf8'));
const WORK = ['irina', 'nona'];

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v, c, d = 2) => new Intl.NumberFormat(c.locale, { maximumFractionDigits: d }).format(v).replace('-', '−');
const decimals = (v) => (String(v).split('.')[1] || '').length;
function stat(p, k, abs) {
  const v = data[p].stats[k];
  if (v === undefined) throw new Error(`Missing stat ${p}.${k}`);
  return abs ? Math.abs(v) : v;
}
const PH = /\{(p\d)\.(\w+)(\|abs)?\}/g;
// Plain text with numbers filled in.
const T = (s, c) => s.replace(PH, (_, p, k, abs) => num(stat(p, k, abs), c));
// Same, but each number becomes a counter that animates from zero when it scrolls into view.
const TC = (s, c) => s.replace(PH, (_, p, k, abs) => {
  const v = stat(p, k, abs);
  return `<span class="count" data-to="${v}" data-dec="${decimals(v)}">${num(v, c)}</span>`;
});
const countSpan = (v, c, d) => `<span class="count" data-to="${v}" data-dec="${d}">${num(v, c, d)}</span>`;
function rel(from, to) {
  const r = posix.relative(posix.dirname('/' + from), '/' + to);
  return r === '' ? './' : r;
}

// ---------------------------------------------------------------- layout
function head(c, page, title, description, dir) {
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
  <meta name="theme-color" content="#f7f4fc" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#150f26" media="(prefers-color-scheme: dark)">
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
  <script>document.documentElement.classList.add('js');setTimeout(function(){if(!window.__site)document.documentElement.classList.remove('js')},3000)</script>
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
      ${link('resume.html', c.nav.resume, 'resume')}
    </nav>
    <nav class="lang-switch" aria-label="${c.nav.language}">${langs}</nav>
  </div>
</header>`;
}

// Small line icons (24px grid, stroked with currentColor).
const ICON = {
  mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16"/>',
  doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15h6M9.5 18h4"/>',
  arrow: '<path d="M7 17L17 7M9 7h8v8"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 19.5h14"/>',
  print: '<path d="M7 9V4h10v5M7 17H5v-7h14v7h-2M7 14h10v6H7z"/>',
  sheet: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>',
};
const icon = (k, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;

function footer(c, page, dir) {
  const p = dir + page;
  const F = c.footer;
  const social = [
    [`mailto:${CONFIG.email}`, 'mail', c.contact.email, ''],
    [CONFIG.linkedin, 'linkedin', 'LinkedIn', ' rel="me noopener" target="_blank"'],
    [rel(p, dir + 'resume.html'), 'doc', c.nav.resume, ''],
  ].map(([href, ic, label, extra]) => `<a class="social" href="${href}"${extra} aria-label="${esc(label)}" title="${esc(label)}">${icon(ic)}</a>`).join('');
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-about">
      <a class="footer-brand" href="${rel(p, dir + 'index.html')}">
        <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="currentColor"/></svg>
        <span class="footer-name">${CONFIG.name}</span>
      </a>
      <p class="muted">${F.bio}</p>
      <div class="socials">${social}</div>
    </div>
    <nav aria-labelledby="f-pages">
      <h2 class="footer-h" id="f-pages">${F.pages}</h2>
      <ul class="plain footer-links">
        <li><a href="${rel(p, dir + 'index.html')}"><span>${c.nav.home}</span></a></li>
        <li><a href="${rel(p, dir + 'about.html')}"><span>${c.nav.about}</span></a></li>
        <li><a href="${rel(p, dir + 'projects.html')}"><span>${c.nav.projects}</span></a></li>
        <li><a href="${rel(p, dir + 'resume.html')}"><span>${c.nav.resume}</span></a></li>
      </ul>
    </nav>
    <div>
      <h2 class="footer-h">${F.contact}</h2>
      <ul class="plain footer-links">
        <li><a href="mailto:${CONFIG.email}">${icon('mail')}<span>${c.contact.write}</span></a></li>
        <li><a href="${CONFIG.linkedin}" rel="me noopener" target="_blank">${icon('linkedin')}<span>LinkedIn</span><span class="sr-only"> ${c.labels.newTab}</span></a></li>
        <li><a href="${rel(p, dir + 'resume.html')}">${icon('doc')}<span>${c.nav.resume}</span></a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>© ${new Date().getFullYear()} ${CONFIG.name}<span class="dot" aria-hidden="true">·</span><span class="muted">${F.built}</span></p>
    <a class="to-top" href="#main">${F.top}${icon('up')}</a>
  </div>
</footer>`;
}

function page(c, dir, file, current, title, description, body, extra = '', progress = false) {
  const out = `${head(c, file, title, description, dir)}
<body>
${progress ? '<div class="read-progress" aria-hidden="true"></div>\n' : ''}${header(c, file, dir, current)}
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

function sectionHead(id, h, sub) {
  return `<div class="section-head" data-reveal>
      <h2 id="${id}">${h}</h2>
      <p class="lede">${sub}</p>
    </div>`;
}

function contactBlock(c, p) {
  return `<section class="section contact" id="contact" aria-labelledby="contact-h">
  <div class="wrap contact-inner">
    <div data-reveal>
      <h2 id="contact-h">${c.contact.heading}</h2>
      <p class="lede">${c.contact.text}</p>
    </div>
    <div class="contact-side" data-reveal>
      <ul class="contact-cards plain">
        <li><a class="contact-card" href="mailto:${CONFIG.email}">
          <span class="cc-icon">${icon('mail')}</span>
          <span class="cc-text"><span class="cc-label">${c.contact.email}</span><span class="cc-value">${CONFIG.email}</span></span>
          <span class="cc-go">${icon('arrow')}</span></a></li>
        <li><a class="contact-card" href="${CONFIG.linkedin}" rel="me noopener" target="_blank">
          <span class="cc-icon">${icon('linkedin')}</span>
          <span class="cc-text"><span class="cc-label">${c.contact.linkedin}</span><span class="cc-value">${c.contact.profile}</span></span>
          <span class="cc-go">${icon('arrow')}</span><span class="sr-only"> ${c.labels.newTab}</span></a></li>
      </ul>
      <a class="btn btn-contact" href="${rel(p, p.replace(/[^/]*$/, '') + 'resume.html')}">${icon('doc')}${c.contact.resume}</a>
    </div>
  </div>
</section>`;
}

function results(c, pr) {
  return pr.results.map(([b, s]) => `<span class="result"><strong>${TC(b, c)}</strong><span>${T(s, c)}</span></span>`).join('');
}

function projectRow(c, slug, from, dir, i) {
  const pr = c.projects[slug];
  return `<li class="proj" data-cat="${pr.category}" data-reveal style="--d:${i}">
  <a class="proj-link" href="${rel(from, dir + 'projects/' + slug + '.html')}">
    <span class="proj-main">
      <span class="proj-cat">${c.categories[pr.category]}</span>
      <span class="proj-title">${T(pr.title, c)}</span>
      <span class="proj-short">${T(pr.short, c)}</span>
      <span class="proj-tools">${pr.tools.map((t) => `<span translate="no">${t}</span>`).join('')}</span>
    </span>
    <span class="proj-results">${results(c, pr)}</span>
  </a>
</li>`;
}

function earlierList(c, p, dir) {
  const cards = [
    ['irina', c.work.irina.title, c.work.irina.lead, c.work.irina.cover],
    ['nona', c.work.nona.title, c.work.nona.lead, c.work.nona.cover],
    ['archive', c.work.archive.title, c.work.archive.card, 'visual-concept'],
  ];
  return cards.map(([slug, t, d, img], i) => `<li data-reveal style="--d:${i}"><a href="${rel(p, dir + 'work/' + slug + '.html')}">
    <span class="earlier-img">${pic(img, '', p, { lazy: true })}</span>
    <strong>${t}</strong><span>${d}</span></a></li>`).join('');
}

// ---------------------------------------------------------------- media
function pic(key, alt, from, { lazy = true, cls = '' } = {}) {
  const m = MEDIA[key];
  if (!m) throw new Error('Missing image ' + key);
  return `<img src="${rel(from, 'assets/work/' + key + '.webp')}" width="${m.w}" height="${m.h}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}${cls ? ` class="${cls}"` : ''}>`;
}
function mediaItem(c, key, caption, from, i, desc = '') {
  const m = MEDIA[key];
  if (m.video) {
    return `<figure class="tile tile-video" data-reveal style="--d:${i % 3}">
      <div class="tile-media${m.h > m.w ? ' tall' : ''}"><video controls preload="none" playsinline poster="${rel(from, 'assets/work/' + key + '.webp')}" width="${m.w}" height="${m.h}"><source src="${rel(from, 'assets/work/' + key + '.mp4')}" type="video/mp4"></video></div>
      <figcaption><strong>${caption}</strong>${desc ? `<span>${desc}</span>` : ''}</figcaption>
    </figure>`;
  }
  return `<figure class="tile" data-reveal style="--d:${i % 3}">
    <button type="button" class="tile-media" data-lightbox="${rel(from, 'assets/work/' + key + '.webp')}" data-caption="${esc(caption)}" aria-label="${esc(c.work.labels.openImage + ': ' + caption)}">${pic(key, caption, from)}</button>
    <figcaption><strong>${caption}</strong>${desc ? `<span>${desc}</span>` : ''}</figcaption>
  </figure>`;
}
function lightbox(c) {
  const L = c.work.labels;
  return `<dialog class="lightbox" aria-label="${L.openImage}">
  <figure><img alt=""><figcaption></figcaption></figure>
  <button type="button" class="lb-btn lb-close" data-lb="close" aria-label="${L.close}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <button type="button" class="lb-btn lb-prev" data-lb="-1" aria-label="${L.prev}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
  <button type="button" class="lb-btn lb-next" data-lb="1" aria-label="${L.nextImage}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
</dialog>`;
}

// ---------------------------------------------------------------- earlier work: case studies
function workCase(c, dir, key, i) {
  const file = `work/${key}.html`;
  const p = dir + file;
  const w = c.work[key];
  const L = c.work.labels;
  const nextKey = i + 1 < WORK.length ? WORK[i + 1] : 'archive';
  const nextTitle = nextKey === 'archive' ? c.work.archive.title : c.work[nextKey].title;
  const links = w.links.map(([href, label], k) => `<a class="btn${k ? ' btn-quiet' : ''}" href="${href}" rel="noopener" target="_blank">${label}<span class="sr-only"> (opens in a new tab)</span></a>`).join('');
  let n = 0;
  const groups = w.groups.map((g) => `<div class="tile-group">
      <h3 data-reveal>${g.h}</h3>
      <div class="gallery">${g.items.map(([img, cap]) => mediaItem(c, img, cap, p, n++)).join('')}</div>
    </div>`).join('');
  const body = `<article>
<header class="page-head case-head">
  <div class="wrap narrow">
    <nav class="crumbs hero-in" style="--d:0" aria-label="${c.labels.breadcrumbs}"><a href="${rel(p, dir + 'index.html')}">${c.nav.home}</a><span aria-hidden="true">/</span><a href="${rel(p, dir + 'projects.html')}">${c.nav.projects}</a></nav>
    <p class="case-tags hero-in" style="--d:1"><span class="tag">${w.kicker}</span><span class="tag tag-practice">${c.work.tag}</span></p>
    <h1 class="hero-in" style="--d:2">${w.title}</h1>
    <p class="hero-lead hero-in" style="--d:3">${w.lead}</p>
    <dl class="facts hero-in" style="--d:4" aria-label="${L.facts}">${w.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="actions hero-in" style="--d:5">${links}</div>
  </div>
</header>
<div class="wrap wide"><figure class="cover hero-in" style="--d:5">${pic(w.cover, w.title, p, { lazy: false })}</figure></div>
<div class="wrap narrow case-body">
  <section data-reveal><h2>${L.challenge}</h2>${w.challenge.map((t) => `<p>${t}</p>`).join('')}</section>
  <section><h2 data-reveal>${L.process}</h2><ol class="steps">${w.process.map((t, k) => `<li data-reveal style="--d:${k}">${t}</li>`).join('')}</ol></section>
  <section data-reveal><h2>${L.role}</h2>${w.role.map((t) => `<p>${t}</p>`).join('')}</section>
  <section><h2 data-reveal>${L.artefacts}</h2><p class="muted" data-reveal>${L.enlarge}</p></section>
</div>
<div class="wrap wide">${groups}</div>
<div class="wrap narrow case-body">
  <div class="actions" data-reveal>${links}</div>
  <nav class="case-nav" aria-label="${c.nav.projects}" data-reveal>
    <a class="case-back" href="${rel(p, dir + 'projects.html')}"><span class="muted">${c.nav.projects}</span>${L.back}</a>
    <a class="case-next" href="${rel(p, dir + 'work/' + nextKey + '.html')}"><span class="muted">${c.labels.next}</span>${nextTitle}</a>
  </nav>
</div>
</article>
${lightbox(c)}`;
  page(c, dir, file, 'projects', `${w.title} | ${CONFIG.name}`, w.lead, body, '', true);
}

// ---------------------------------------------------------------- earlier work: archive
function workArchive(c, dir) {
  const file = 'work/archive.html';
  const p = dir + file;
  const a = c.work.archive;
  const chips = a.groups.map((g) => `<a href="#${g.id}">${g.h}</a>`).join('');
  const groups = a.groups.map((g) => `<section class="section-tight archive-group" id="${g.id}" aria-labelledby="${g.id}-h">
    <div class="section-head" data-reveal><h2 id="${g.id}-h">${g.h}</h2><p class="lede">${g.sub}</p></div>
    <div class="gallery">${g.items.map(([img, t, d], i) => mediaItem(c, img, t, p, i, d)).join('')}</div>
  </section>`).join('');
  const body = `<section class="page-head">
  <div class="wrap">
    <nav class="crumbs hero-in" style="--d:0" aria-label="${c.labels.breadcrumbs}"><a href="${rel(p, dir + 'index.html')}">${c.nav.home}</a><span aria-hidden="true">/</span><a href="${rel(p, dir + 'projects.html')}">${c.nav.projects}</a></nav>
    <p class="case-tags hero-in" style="--d:1"><span class="tag tag-practice">${c.work.tag}</span></p>
    <h1 class="hero-in" style="--d:2">${a.heading}</h1>
    <p class="hero-lead hero-in" style="--d:3">${a.lead}</p>
    <nav class="chips hero-in" style="--d:4" aria-label="${a.heading}">${chips}</nav>
  </div>
</section>
<div class="wrap wide">${groups}</div>
<div class="wrap narrow case-body">
  <nav class="case-nav" aria-label="${c.nav.projects}" data-reveal>
    <a class="case-back" href="${rel(p, dir + 'projects.html')}"><span class="muted">${c.nav.projects}</span>${c.work.labels.back}</a>
    <a class="case-next" href="${rel(p, dir + 'work/irina.html')}"><span class="muted">${c.labels.next}</span>${c.work.irina.title}</a>
  </nav>
</div>
${lightbox(c)}`;
  page(c, dir, file, 'projects', `${a.title} | ${CONFIG.name}`, a.lead, body);
}

// ---------------------------------------------------------------- home
function home(c, dir) {
  const p = dir + 'index.html';
  const flow = c.home.flow.map((s, i) => `<li style="--i:${i}"><span class="node" aria-hidden="true"></span><strong>${s.t}</strong><span>${s.d}</span></li>`).join('');
  const work = FEATURED.map((s, i) => projectRow(c, s, p, dir, i)).join('');
  const focus = c.home.focus.map((f, i) => `<li data-reveal style="--d:${i % 3}"><h3>${f.t}</h3><p>${f.d}</p></li>`).join('');
  const groups = c.home.skillGroups.map((g, i) => `<div class="skill-group" data-reveal style="--d:${i}">
      <h3>${g.t}</h3>
      <ul class="tags plain">${g.tools.map((t) => `<li>${t}</li>`).join('')}</ul>
      <p class="seein"><span class="muted">${c.home.seeIn}</span> ${g.projects.map((s) => `<a href="${rel(p, dir + 'projects/' + s + '.html')}">${T(c.projects[s].title, c)}</a>`).join('<span class="sep" aria-hidden="true">/</span>')}</p>
    </div>`).join('');
  const langs = c.languages.map(([l, lvl]) => `<li><strong>${l}</strong> <span class="muted">${lvl}</span></li>`).join('');
  const body = `<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <p class="hero-role hero-in" style="--d:0">${c.role}</p>
      <h1 class="hero-name"><span class="line"><span>Julieta</span></span> <span class="line"><span>Lara Romero</span></span></h1>
      <p class="hero-lead hero-in" style="--d:3">${c.home.lead}</p>
      <p class="muted hero-loc hero-in" style="--d:4">${c.home.location}</p>
      <div class="actions hero-in" style="--d:5">
        <a class="btn" href="#work">${c.home.ctaWork}</a>
        <a class="btn btn-quiet" href="${rel(p, dir + 'resume.html')}">${c.home.ctaResume}</a>
      </div>
    </div>
    <figure class="flow hero-in" style="--d:4" aria-labelledby="flow-cap">
      <figcaption id="flow-cap" class="flow-title">${c.home.flowTitle}</figcaption>
      <div class="flow-track">
        <span class="flow-packet" aria-hidden="true"></span>
        <ol class="flow-list plain">${flow}</ol>
      </div>
      <p class="flow-note muted">${c.home.flowNote}</p>
    </figure>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-h">
  <div class="wrap">
    ${sectionHead('work-h', c.home.workHeading, c.home.workSub)}
    <ol class="proj-list plain">${work}</ol>
    <p data-reveal><a class="btn btn-quiet" href="${rel(p, dir + 'projects.html')}">${c.home.workAll}</a></p>
  </div>
</section>

<section class="section band" aria-labelledby="focus-h">
  <div class="wrap">
    ${sectionHead('focus-h', c.home.focusHeading, c.home.focusSub)}
    <ul class="focus plain">${focus}</ul>
  </div>
</section>

<section class="section" aria-labelledby="skills-h">
  <div class="wrap">
    ${sectionHead('skills-h', c.home.skillsHeading, c.home.skillsSub)}
    <div class="skills">${groups}</div>
  </div>
</section>

<section class="section band" aria-labelledby="about-h">
  <div class="wrap about-grid">
    <div data-reveal>
      <h2 id="about-h">${c.home.aboutHeading}</h2>
      ${c.home.about.map((t) => `<p>${t}</p>`).join('')}
      <p class="actions"><a class="btn btn-quiet" href="${rel(p, dir + 'about.html')}">${c.home.aboutMore}</a></p>
    </div>
    <aside class="lang-card" data-reveal style="--d:1">
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
  const tl = c.timeline.map((r, i) => `<li class="tl-item tl-${r.kind}" data-reveal style="--d:${i % 4}">
    <details${i === c.timeline.length - 1 ? ' open' : ''}>
      <summary>
        <span class="tl-date">${r.date}</span>
        <span class="tl-what"><strong>${r.t}</strong><span class="muted">${r.org}</span></span>
        <span class="tl-kind">${c.about.kind[r.kind]}</span>
        <span class="tl-icon" aria-hidden="true"></span>
      </summary>
      <div class="tl-body"><p>${r.d}</p></div>
    </details>
  </li>`).join('');
  const langs = c.languages.map(([l, lvl]) => `<li><strong>${l}</strong> <span class="muted">${lvl}</span></li>`).join('');
  const body = `<section class="page-head">
  <div class="wrap about-grid">
    <div>
      <p class="hero-role hero-in" style="--d:0">${c.nav.about}</p>
      <h1 class="hero-in" style="--d:1">${c.about.heading}</h1>
      <p class="hero-lead hero-in" style="--d:2">${c.about.lead}</p>
      ${c.about.body.map((t, i) => `<p class="hero-in" style="--d:${3 + i}">${t}</p>`).join('')}
    </div>
    <aside class="lang-card hero-in" style="--d:3">
      <h2 class="h3">${c.home.languagesHeading}</h2>
      <ul class="plain">${langs}</ul>
    </aside>
  </div>
</section>

<section class="section" aria-labelledby="tl-h">
  <div class="wrap">
    ${sectionHead('tl-h', c.about.timelineHeading, c.about.timelineSub)}
    <ol class="timeline plain">${tl}</ol>
  </div>
</section>

<section class="section band" aria-labelledby="earlier-h">
  <div class="wrap">
    ${sectionHead('earlier-h', c.about.earlierHeading, c.about.earlierSub)}
    <ul class="earlier plain">${earlierList(c, p, dir)}</ul>
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
  const rows = PROJECTS.map((s, i) => projectRow(c, s, p, dir, i)).join('');
  const body = `<section class="page-head">
  <div class="wrap">
    <p class="hero-role hero-in" style="--d:0">${c.projectsPage.title}</p>
    <h1 class="hero-in" style="--d:1">${c.projectsPage.heading}</h1>
    <p class="hero-lead hero-in" style="--d:2">${c.projectsPage.sub}</p>
    <p class="practice-note hero-in" style="--d:3">${c.practice.note}</p>
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
    ${sectionHead('earlier-h', c.projectsPage.earlierHeading, c.projectsPage.earlierSub)}
    <ul class="earlier plain">${earlierList(c, p, dir)}</ul>
  </div>
</section>
<section class="section">
  <div class="wrap cta-row" data-reveal>
    <h2>${c.projectsPage.cta}</h2>
    <a class="btn" href="${rel(p, dir + 'resume.html')}">${c.projectsPage.ctaBtn}</a>
  </div>
</section>`;
  page(c, dir, 'projects.html', 'projects', `${c.projectsPage.title} | ${CONFIG.name}`, c.projectsPage.sub, body);
}

// ---------------------------------------------------------------- charts
function chartSpecs(c) {
  const L = c.chart;
  const d = data;
  const S = {};
  const months = L.months;
  // P1 sales
  S['p1-months'] = { type: 'bar', labels: months, axis: L.revenueK, series: [{ name: L.revenueK, values: d.p1.months.map((v) => Math.round(v / 1000)), colors: months.map((_, i) => (i >= 9 ? 'orchid' : 'iris')) }] };
  S['p1-cats'] = { type: 'hbar', labels: d.p1.byCat.map((x) => L.cats[x.key]), axis: L.revenueK, series: [{ name: L.revenueK, values: d.p1.byCat.map((x) => Math.round(x.revenue / 1000)), colors: d.p1.byCat.map((_, i) => (i < 2 ? 'orchid' : 'iris')) }] };
  const ret = [...d.p1.byCat].sort((a, b) => b.returnRate - a.returnRate);
  S['p1-returns'] = { type: 'hbar', unit: '%', labels: ret.map((x) => L.cats[x.key]), axis: L.returnRate, series: [{ name: L.returnRate, values: ret.map((x) => x.returnRate), colors: ret.map((x) => (x.key === 'apparel' ? 'orchid' : 'iris')) }] };
  // P2 A/B test
  S['p2-cum'] = {
    type: 'line', unit: '%', labels: d.p2.cum.A.map((_, i) => L.dayN.replace('{n}', i + 1)), axis: L.cumConversion,
    series: [{ name: L.variantA, values: d.p2.cum.A, color: 'lav', dash: true }, { name: L.variantB, values: d.p2.cum.B, color: 'iris' }],
  };
  S['p2-devices'] = {
    type: 'bar', unit: '%', min: 0, labels: d.p2.devices.map((x) => L.devices[x.key]), axis: L.conversion, legend: true,
    series: [{ name: L.variantA, values: d.p2.devices.map((x) => x.A), color: 'lav' }, { name: L.variantB, values: d.p2.devices.map((x) => x.B), color: 'iris' }],
  };
  // P3 funnel
  S['p3-funnel'] = {
    type: 'hbar', unit: '%', max: 100, labels: d.p3.steps.map((k) => L.steps[k]), axis: L.pctOfVisitors, legend: true,
    series: [{ name: L.devices.desktop, values: d.p3.desktop, color: 'iris' }, { name: L.devices.mobile, values: d.p3.mobile, color: 'orchid' }],
  };
  S['p3-drop'] = { type: 'bar', unit: '%', labels: d.p3.stepDrop.map((x) => L.steps[x.key]), axis: L.dropPct, series: [{ name: L.dropPct, values: d.p3.stepDrop.map((x) => x.drop), colors: d.p3.stepDrop.map((x) => (x.key === 'verify' ? 'orchid' : 'iris')) }] };
  // P4 usability
  const tasks = d.p4.tasks.map((k) => L.tasks[k]);
  S['p4-success'] = {
    type: 'bar', unit: '%', min: 0, max: 100, labels: tasks, axis: L.successPct, legend: true,
    series: [{ name: L.v1, values: d.p4.res.v1.map((r) => r.success), color: 'lav' }, { name: L.v2, values: d.p4.res.v2.map((r) => r.success), color: 'iris' }],
  };
  S['p4-time'] = {
    type: 'hbar', unit: ' s', labels: tasks, axis: L.medianTime, legend: true,
    series: [{ name: L.v1, values: d.p4.res.v1.map((r) => r.time), color: 'lav' }, { name: L.v2, values: d.p4.res.v2.map((r) => r.time), color: 'iris' }],
  };
  // P5 forecast
  const h = d.p5.history.length;
  const pad = (n) => Array(n).fill(null);
  S['p5-forecast'] = {
    type: 'line', labels: Array.from({ length: h + 12 }, (_, i) => L.weekN.replace('{n}', i + 1)), axis: L.orders,
    series: [
      { name: L.actual, values: d.p5.history.concat(pad(12)), color: 'ink' },
      { name: L.backtest, values: pad(h - 12).concat(d.p5.backtest, pad(12)), color: 'orchid', dash: true },
      { name: L.forecast, values: pad(h - 1).concat([d.p5.history[h - 1]], d.p5.future), color: 'iris' },
      { name: L.range, values: pad(h).concat(d.p5.band.map((b) => b[1])), color: 'lav', band: 'upper' },
      { name: L.range, values: pad(h).concat(d.p5.band.map((b) => b[0])), color: 'lav', band: 'lower' },
    ],
  };
  // P6 retention
  S['p6-curves'] = {
    type: 'line', unit: '%', labels: d.p6.curves.tour.map((_, i) => L.monthN.replace('{n}', i)), axis: L.retained,
    series: [{ name: L.tour, values: d.p6.curves.tour, color: 'iris' }, { name: L.noTour, values: d.p6.curves.skip, color: 'orchid', dash: true }],
  };
  return S;
}

function heatTable(c, rows, colLabels, rowLabels, { caption, max, unit = '', rowHeader, extraCol }) {
  const cells = rows.map((row, ri) => `<tr><th scope="row">${rowLabels[ri]}</th>${extraCol ? `<td class="num">${extraCol[ri]}</td>` : ''}${row.map((v, ci) => {
    if (v == null) return '<td class="heat-empty"></td>';
    const k = Math.max(0, Math.min(1, v / max));
    return `<td class="heat${k > 0.55 ? ' heat-strong' : ''}" style="--k:${k.toFixed(3)};--w:${ri + ci}">${num(v, c, 1)}${unit}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table class="heat-table">
  <caption class="sr-only">${caption}</caption>
  <thead><tr><th scope="col">${rowHeader}</th>${extraCol ? `<th scope="col">${c.chart.members}</th>` : ''}${colLabels.map((l) => `<th scope="col">${l}</th>`).join('')}</tr></thead>
  <tbody>${cells}</tbody></table></div>`;
}

function chartFigure(c, id, caption, specs) {
  const L = c.chart;
  const cap = T(caption, c);
  if (id === 'p5-heat') {
    const max = Math.max(...data.p5.heat.flat());
    return `<figure class="chart-fig" data-reveal data-heat><div class="figbox">${heatTable(c, data.p5.heat, data.p5.hours.map((h) => `${h}h`), L.weekdays, { caption: cap, max, rowHeader: '' })}</div><figcaption>${cap}</figcaption></figure>`;
  }
  if (id === 'p6-cohorts') {
    const months = data.p6.cohorts[0].row.map((_, i) => L.monthN.replace('{n}', i));
    const fmt = new Intl.DateTimeFormat(c.locale, { month: 'short', year: 'numeric' });
    const labels = data.p6.cohorts.map((g) => fmt.format(new Date(g.cohort + '-15')));
    return `<figure class="chart-fig" data-reveal data-heat><div class="figbox">${heatTable(c, data.p6.cohorts.map((g) => g.row), months, labels, { caption: cap, max: 100, unit: '%', rowHeader: L.cohort, extraCol: data.p6.cohorts.map((g) => num(g.size, c)) })}</div><figcaption>${cap}</figcaption></figure>`;
  }
  const s = specs[id];
  const series = s.series.filter((x) => !x.band)
    .concat(s.series.filter((x) => x.band === 'upper').map((x) => ({ ...x, name: x.name + ' ↑' })), s.series.filter((x) => x.band === 'lower').map((x) => ({ ...x, name: x.name + ' ↓' })));
  const rowsIdx = s.labels.map((_, i) => i).filter((i) => series.some((x) => x.values[i] != null));
  const table = `<table><thead><tr><th></th>${series.map((x) => `<th scope="col">${x.name}</th>`).join('')}</tr></thead><tbody>${rowsIdx.map((i) => `<tr><th scope="row">${s.labels[i]}</th>${series.map((x) => `<td class="num">${x.values[i] == null ? '' : num(x.values[i], c, 2)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const bars = s.type === 'hbar' ? s.labels.length * s.series.length : 0;
  const tall = s.type === 'hbar' ? ` style="--h:${Math.max(240, bars * 30 + s.labels.length * 14 + 90)}px"` : '';
  return `<figure class="chart-fig" data-reveal>
  <div class="figbox"><div class="chart"${tall}><canvas id="${id}" role="img" aria-label="${esc(cap)}"></canvas></div></div>
  <figcaption>${cap} <span class="muted">${c.labels.chartHint}</span></figcaption>
  <details class="data-table"><summary>${c.labels.table}</summary><div class="table-scroll">${table}</div></details>
</figure>`;
}

// ---------------------------------------------------------------- Excel workbook preview
function xlFormat(v, fmt, c) {
  if (v == null || typeof v === 'string') return v == null ? '' : esc(v);
  switch (fmt) {
    case 'int': return num(v, c, 0);
    case 'eur': return '€' + num(v, c, 0);
    case 'eur2': return '€' + new Intl.NumberFormat(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    case 'pct': return num(v, c, 1) + '%';
    case 'pct0': return num(v, c, 0) + '%';
    case 'pct2': return num(v, c, 2) + '%';
    case 'ratio': return num(v * 100, c, 1) + '%';
    case 'pts': return (v > 0 ? '+' : '') + num(v, c, 1) + ' pts';
    case 'n1': return num(v, c, 1);
    default: return num(v, c, 2);
  }
}

function xlSheet(c, sh, si, slug) {
  const ncols = Math.max(sh.head.length, sh.kpis.length);
  // Min and max per column (or per block) for conditional formatting.
  const range = (cols) => {
    const vals = sh.rows.flatMap((r) => cols.map((ci) => r[ci].v)).filter((v) => typeof v === 'number');
    return [Math.min(...vals), Math.max(...vals)];
  };
  const block = sh.head.map((h, i) => (h.cf === 'scale-all' ? i : -1)).filter((i) => i > -1);
  const ranges = sh.head.map((h, ci) => (h.cf === 'scale-all' ? range(block) : h.cf ? range([ci]) : null));
  const letters = Array.from({ length: ncols }, (_, i) => `<th scope="col">${colName(i)}</th>`).join('');
  const cell = (ref, html, { f = '', cls = '', style = '', th = false } = {}) => {
    const tag = th ? 'th' : 'td';
    return `<${tag} data-ref="${ref}"${f ? ` data-f="${esc(f)}" tabindex="0"` : ''}${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''}>${html}</${tag}>`;
  };
  const blank = (r, from = 0) => Array.from({ length: ncols - from }, (_, i) => cell(`${colName(i + from)}${r}`, '')).join('');
  const rows = [];
  const row = (n, cells, cls = '') => rows.push(`<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${n}</th>${cells}</tr>`);
  row(1, `<td data-ref="A1" class="xl-title" colspan="${ncols}">${esc(sh.title)}</td>`);
  row(2, blank(2));
  if (sh.kpis.length) {
    row(3, sh.kpis.map((k, i) => cell(`${colName(i)}3`, esc(k.label), { cls: 'xl-kpi-label' })).join('') + blank(3, sh.kpis.length));
    row(4, sh.kpis.map((k, i) => cell(`${colName(i)}4`, xlFormat(k.v, k.fmt, c), { f: k.f || '', cls: 'xl-kpi' + (k.f ? ' xl-f' : '') })).join('') + blank(4, sh.kpis.length));
    row(5, blank(5));
  }
  row(sh.hdr, sh.head.map((h, i) => cell(`${colName(i)}${sh.hdr}`, esc(h.label), { cls: 'xl-head' })).join('') + blank(sh.hdr, sh.head.length));
  sh.rows.forEach((r, ri) => {
    const n = sh.first + ri;
    row(n, r.map((x, ci) => {
      const h = sh.head[ci];
      let cls = ci === 0 ? 'xl-cat' : 'xl-num';
      let style = '';
      const rg = ranges[ci];
      if (rg && typeof x.v === 'number') {
        const k = rg[1] === rg[0] ? 1 : (x.v - rg[0]) / (rg[1] - rg[0]);
        if (h.cf === 'bar') { cls += ' xl-bar'; style = `--bar:${(8 + 92 * k).toFixed(1)}%`; }
        else { cls += ' xl-scale' + (k > 0.62 ? ' xl-strong' : ''); style = `--k:${k.toFixed(3)}`; }
      }
      if (x.f) cls += ' xl-f';
      return cell(`${colName(ci)}${n}`, xlFormat(x.v, h.fmt, c), { f: x.f || '', cls, style });
    }).join('') + blank(n, r.length));
  });
  const id = `xl-${slug}-${si}`;
  return `<div class="xl-sheet" role="tabpanel" id="${id}" aria-labelledby="${id}-tab"${si ? ' hidden' : ''}>
    <div class="xl-grid-scroll" tabindex="0" aria-label="${esc(sh.name)}">
      <table class="xl-grid"><caption class="sr-only">${esc(sh.title)}</caption><thead><tr><th class="xl-corner" aria-hidden="true"></th>${letters}</tr></thead><tbody>${rows.join('')}</tbody></table>
    </div>
  </div>`;
}

function excelBlock(c, slug, p, sheets) {
  const X = c.xl;
  const own = CONFIG.excel[slug] || {};
  const file = own.file || `assets/excel/${slug}.xlsx`;
  const fileName = file.split('/').pop();
  const ribbon = X.ribbon.map((t, i) => `<span${i === 1 ? ' class="on"' : ''}>${t}</span>`).join('');
  let body;
  if (own.embed) {
    body = `<div class="xl-embed"><iframe src="${esc(own.embed)}" title="${esc(X.heading)}" loading="lazy" allowfullscreen></iframe></div>`;
  } else {
    const firstF = sheets[0].kpis.find((k) => k.f) ? sheets[0].kpis.findIndex((k) => k.f) : -1;
    const startRef = firstF > -1 ? `${colName(firstF)}4` : 'A1';
    const startF = firstF > -1 ? sheets[0].kpis[firstF].f : sheets[0].title;
    const tabs = sheets.map((sh, si) => `<button type="button" role="tab" id="xl-${slug}-${si}-tab" aria-controls="xl-${slug}-${si}" aria-selected="${si ? 'false' : 'true'}"${si ? ' tabindex="-1"' : ''}>${esc(sh.name)}</button>`).join('');
    body = `<div class="xl-fbar">
      <span class="xl-name" aria-label="${X.cell}">${startRef}</span>
      <span class="xl-fx" aria-hidden="true">fx</span>
      <output class="xl-formula" aria-live="polite" aria-label="${X.formulaBar}" translate="no">${esc(startF)}</output>
    </div>
    ${sheets.map((sh, si) => xlSheet(c, sh, si, slug)).join('')}
    <div class="xl-tabs" role="tablist" aria-label="${X.sheets}">${tabs}<span class="xl-plus" aria-hidden="true">+</span></div>
    <div class="xl-status" aria-hidden="true"><span>${X.ready}</span><span>${X.hint}</span></div>`;
  }
  return `<section class="xl-section" aria-labelledby="xl-h-${slug}">
  <div class="wrap narrow case-body"><h2 id="xl-h-${slug}" data-reveal>${X.heading}</h2><p data-reveal>${X.sub}</p></div>
  <div class="wrap wide">
    <div class="xl" data-reveal data-xl>
      <div class="xl-top">
        <span class="xl-app" aria-hidden="true">X</span>
        <span class="xl-file" translate="no">${esc(fileName)}</span>
        <span class="xl-saved">${X.fileSaved}</span>
      </div>
      <div class="xl-ribbon" aria-hidden="true">${ribbon}</div>
      ${body}
    </div>
    <div class="actions xl-actions" data-reveal>
      <a class="btn" href="${rel(p, file)}" download="${esc(fileName)}">${icon('download')}${X.download}</a>
      <p class="muted">${X.opens}</p>
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------------- résumé
function resume(c, dir) {
  const p = dir + 'resume.html';
  const R = c.resume;
  const src = readFileSync(join(ROOT, 'build/cv.html'), 'utf8');
  let cv = src.slice(src.indexOf('<body>') + 6, src.indexOf('</body>')).trim();
  cv = cv
    .replace(CONFIG.email, `<a href="mailto:${CONFIG.email}">${CONFIG.email}</a>`)
    .replace(/linkedin\.com\/in\/[\w-]+/, `<a href="${CONFIG.linkedin}" rel="me noopener" target="_blank">LinkedIn</a>`)
    .replace('khariss1805.github.io/Portfolio', `<a href="${SITE}">khariss1805.github.io/Portfolio</a>`)
    .replace(/class="contact"/g, 'class="cv-contact"')
    .replace('<h1>', '<h2 class="cv-name">').replace('</h1>', '</h2>');
  const body = `<section class="page-head resume-head">
  <div class="wrap narrow">
    <p class="hero-role hero-in" style="--d:0">${c.nav.resume}</p>
    <h1 class="hero-in" style="--d:1">${R.heading}</h1>
    <p class="hero-lead hero-in" style="--d:2">${R.lead}</p>
    ${R.note ? `<p class="practice-note hero-in" style="--d:3">${R.note}</p>` : ''}
    <div class="actions hero-in" style="--d:4">
      <a class="btn" href="${rel(p, CONFIG.cv)}" download="Julieta-Lara-Romero-CV.pdf">${icon('download')}${R.download}</a>
      <button type="button" class="btn btn-quiet" data-print>${icon('print')}${R.print}</button>
    </div>
  </div>
</section>
<section class="section-tight resume-body">
  <div class="wrap narrow">
    <article class="cv-sheet hero-in" style="--d:4" lang="en">${cv}</article>
  </div>
</section>
${contactBlock(c, p)}`;
  page(c, dir, 'resume.html', 'resume', `${R.title} | ${CONFIG.name}`, R.lead, body);
}

const bookCache = new Map();
function workbooksFor(c) {
  if (!bookCache.has(c)) bookCache.set(c, workbooks(data, c, (s) => T(c.projects[s].title, c)));
  return bookCache.get(c);
}

// ---------------------------------------------------------------- case study
function caseStudy(c, dir, slug, i) {
  const file = `projects/${slug}.html`;
  const p = dir + file;
  const pr = c.projects[slug];
  const specs = chartSpecs(c);
  const book = workbooksFor(c)[slug];
  const used = [];
  const fig = (id, cap) => { if (specs[id]) used.push(id); return chartFigure(c, id, cap, specs); };
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  let dash = '';
  if (pr.dashboard) {
    const L = c.chart;
    const s1 = data.p1.stats;
    const tiles = [
      [L.kpiRevenue, `€${countSpan(s1.revenueM, c, 2)}M`],
      [L.kpiOrders, countSpan(s1.orders, c, 0)],
      [L.kpiAov, `€${countSpan(s1.aov, c, 0)}`],
      [L.kpiReturns, `${countSpan(s1.returnRate, c, 1)}%`, true],
    ].map(([k, v, warn]) => `<div class="kpi${warn ? ' kpi-miss' : ''}"><span>${k}</span><strong>${v}</strong></div>`).join('');
    const [f0, f1, f2] = pr.findings;
    dash = `<div class="dash" data-reveal>
      <div class="dash-bar"><span class="dash-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${T(pr.title, c)}</span></div>
      <div class="kpis">${tiles}</div>
      <div class="dash-grid">
        <div class="dash-wide">${fig(f1.chart, f1.caption)}</div>
        ${fig(f0.chart, f0.caption)}
        ${fig(f2.chart, f2.caption)}
      </div>
    </div>`;
  }
  const findings = pr.findings.map((f) => `<div class="finding">
      <h3 data-reveal>${T(f.t, c)}</h3>
      <p data-reveal>${T(f.text, c)}</p>
      ${pr.dashboard ? '' : fig(f.chart, f.caption)}
    </div>`).join('');
  const snip = snippets[pr.code];
  const chartData = Object.fromEntries(used.map((id) => [id, specs[id]]));
  const body = `<article>
<header class="page-head case-head">
  <div class="wrap narrow">
    <nav class="crumbs hero-in" style="--d:0" aria-label="${c.labels.breadcrumbs}"><a href="${rel(p, dir + 'index.html')}">${c.nav.home}</a><span aria-hidden="true">/</span><a href="${rel(p, dir + 'projects.html')}">${c.nav.projects}</a></nav>
    <p class="case-tags hero-in" style="--d:1"><span class="tag">${c.categories[pr.category]}</span><span class="tag tag-practice">${c.practice.tag}</span></p>
    <h1 class="hero-in" style="--d:2">${T(pr.title, c)}</h1>
    <p class="hero-lead hero-in" style="--d:3">${T(pr.lead, c)}</p>
    <div class="case-results hero-in" style="--d:4">${results(c, pr)}</div>
    <p class="practice-note hero-in" style="--d:5">${c.practice.note}</p>
  </div>
</header>
<div class="wrap narrow case-body">
  <section data-reveal><h2>${c.labels.question}</h2>${pr.question.map((t) => `<p>${T(t, c)}</p>`).join('')}</section>
  <section data-reveal><h2>${c.labels.data}</h2>${pr.data.map((t) => `<p>${T(t, c)}</p>`).join('')}</section>
  <section><h2 data-reveal>${c.labels.approach}</h2><ol class="steps">${pr.approach.map((t, k) => `<li data-reveal style="--d:${k}">${T(t, c)}</li>`).join('')}</ol></section>
</div>
${dash ? `<div class="wrap wide">${dash}</div>` : ''}
${excelBlock(c, slug, p, book)}
<div class="wrap narrow case-body">
  <section><h2 data-reveal>${c.labels.findings}</h2>${findings}</section>
  <section><h2 data-reveal>${c.labels.recommend}</h2><ul class="recs">${pr.recommend.map((t, k) => `<li data-reveal style="--d:${k}">${T(t, c)}</li>`).join('')}</ul></section>
  <section data-reveal><h2>${c.labels.code}</h2>
    <figure class="code"><figcaption>${snip.lang}</figcaption><pre tabindex="0" translate="no"><code>${esc(snip.code)}</code></pre></figure>
  </section>
  <section data-reveal><h2>${c.labels.tools}</h2><ul class="tags plain">${pr.tools.map((t) => `<li>${t}</li>`).join('')}</ul></section>
  <nav class="case-nav" aria-label="${c.nav.projects}" data-reveal>
    <a class="case-back" href="${rel(p, dir + 'projects.html')}"><span class="muted">${c.nav.projects}</span>${c.labels.back}</a>
    <a class="case-next" href="${rel(p, dir + 'projects/' + next + '.html')}"><span class="muted">${c.labels.next}</span>${T(c.projects[next].title, c)}</a>
  </nav>
</div>
</article>`;
  const extra = used.length ? `<script type="application/json" id="chart-data">${JSON.stringify({ locale: c.locale, charts: chartData }).replace(/</g, '\\u003c')}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" defer></script>
<script src="${rel(p, 'assets/charts.js')}" defer></script>` : '';
  page(c, dir, file, 'projects', `${T(pr.title, c)} | ${CONFIG.name}`, T(pr.short, c), body, extra, true);
}

// ---------------------------------------------------------------- run
for (const l of LANGS) {
  if (l.dir && existsSync(join(ROOT, l.dir))) rmSync(join(ROOT, l.dir), { recursive: true });
}
for (const d of ['projects', 'work']) if (existsSync(join(ROOT, d))) rmSync(join(ROOT, d), { recursive: true });
for (const l of LANGS) {
  home(l.c, l.dir);
  about(l.c, l.dir);
  projectsIndex(l.c, l.dir);
  resume(l.c, l.dir);
  PROJECTS.forEach((s, i) => caseStudy(l.c, l.dir, s, i));
  WORK.forEach((k, i) => workCase(l.c, l.dir, k, i));
  workArchive(l.c, l.dir);
}
const pages = ['index.html', 'about.html', 'projects.html', 'resume.html', ...PROJECTS.map((s) => `projects/${s}.html`), ...WORK.map((k) => `work/${k}.html`), 'work/archive.html'];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => pages.map((pg) => `  <url><loc>${SITE}${l.dir}${pg}</loc>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a.c.lang}" href="${SITE}${a.dir}${pg}"/>`).join('')}</url>`)).join('\n')}
</urlset>
`);
// The old design pages now point to their redesigned versions.
const REDIRECTS = { 'Irina.html': 'work/irina.html', 'nona.html': 'work/nona.html', 'graphic.html': 'work/archive.html#graphic', 'content.html': 'work/archive.html#motion', 'webdev.html': 'work/archive.html#web', 'index.html': 'index.html' };
for (const [from, to] of Object.entries(REDIRECTS)) {
  const target = '../' + to;
  writeFileSync(join(ROOT, 'design', from), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<link rel="canonical" href="${SITE}${to.split('#')[0]}">
<meta http-equiv="refresh" content="0; url=${target}">
<meta name="robots" content="noindex">
</head><body><p>This page has moved: <a href="${target}">${target}</a></p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>
`);
}
console.log(`Built ${LANGS.length} languages × ${pages.length} pages`);

// Excel files: written from the English spec with Python and openpyxl. If either
// is missing, the files already in assets/excel/ are kept as they are.
{
  const spec = Object.fromEntries(PROJECTS.filter((s) => !(CONFIG.excel[s] && CONFIG.excel[s].file))
    .map((s) => [s, { author: CONFIG.name, sheets: workbooksFor(en)[s] }]));
  const tmp = join(tmpdir(), `portfolio-excel-${process.pid}.json`);
  writeFileSync(tmp, JSON.stringify(spec));
  const r = spawnSync('python3', [join(ROOT, 'build/excel.py'), tmp, join(ROOT, 'assets/excel')], { encoding: 'utf8' });
  rmSync(tmp, { force: true });
  if (r.status === 0) console.log(r.stdout.trim());
  else console.warn('Excel files not rebuilt (needs python3 + openpyxl):', (r.stderr || r.error || '').toString().trim().split('\n').pop());
}
