// Synthetic data for the six practice projects.
// Everything here is generated from a fixed seed, so the numbers quoted in the
// case-study text always match the charts. No real customer or employer data.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const r = mulberry32(seed);
  const rand = () => r();
  const normal = (mu = 0, sd = 1) => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = (items, weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let x = r() * total;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };
  return { rand, normal, pick };
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const pct = (n, d) => (100 * n) / d;

// ---------------------------------------------------------------------------
// P1 · What drives CSAT in a multilingual support desk
// ---------------------------------------------------------------------------
function p1() {
  const { rand, pick } = makeRng(11);
  const reasons = ['billing', 'delivery', 'access', 'fault', 'cancel', 'plan'];
  const reasonEffect = { billing: -0.1, delivery: 0.15, access: 0.35, fault: -0.25, cancel: -0.55, plan: 0.3 };
  const langs = ['en', 'es', 'pt', 'nl'];
  const rows = [];
  for (let i = 0; i < 18000; i++) {
    const reason = pick(reasons, [22, 18, 15, 17, 10, 18]);
    const lang = pick(langs, [40, 25, 15, 20]);
    const fcr = rand() < 0.71;
    const transfers = rand() < 0.74 ? 0 : rand() < 0.75 ? 1 : 2;
    const longWait = rand() < 0.27;
    const newAgent = rand() < 0.22;
    // NL queue is short of native speakers, so more contacts are handled in English.
    const nativeMatch = rand() < (lang === 'nl' ? 0.58 : lang === 'pt' ? 0.8 : 0.95);
    const logit = 0.55 + reasonEffect[reason] + (fcr ? 1.05 : -0.35) - 0.42 * transfers
      - (longWait ? 0.6 : 0) - (newAgent ? 0.25 : 0) + (nativeMatch ? 0.2 : -0.45);
    rows.push({ reason, lang, fcr, transfers, longWait, newAgent, nativeMatch, sat: rand() < sigmoid(logit) });
  }
  const csat = (sub) => pct(sub.filter((r) => r.sat).length, sub.length);
  const overall = csat(rows);
  const byReason = reasons.map((k) => ({ key: k, csat: round(csat(rows.filter((r) => r.reason === k))) }))
    .sort((a, b) => b.csat - a.csat);
  const byLang = langs.map((k) => ({ key: k, csat: round(csat(rows.filter((r) => r.lang === k))) }));
  const gap = (f) => round(csat(rows.filter(f)) - csat(rows.filter((r) => !f(r))));
  const drivers = [
    { key: 'fcr', gap: gap((r) => r.fcr) },
    { key: 'native', gap: gap((r) => r.nativeMatch) },
    { key: 'noTransfer', gap: gap((r) => r.transfers === 0) },
    { key: 'shortWait', gap: gap((r) => !r.longWait) },
    { key: 'tenured', gap: gap((r) => !r.newAgent) },
  ].sort((a, b) => b.gap - a.gap);
  const nl = rows.filter((r) => r.lang === 'nl');
  const stats = {
    n: rows.length,
    overall: round(overall),
    fcrGap: drivers.find((d) => d.key === 'fcr').gap,
    nativeGap: drivers.find((d) => d.key === 'native').gap,
    transferGap: drivers.find((d) => d.key === 'noTransfer').gap,
    nlCsat: byLang.find((l) => l.key === 'nl').csat,
    nlNative: round(pct(nl.filter((r) => r.nativeMatch).length, nl.length)),
    nlNativeCsat: round(csat(nl.filter((r) => r.nativeMatch))),
    nlOtherCsat: round(csat(nl.filter((r) => !r.nativeMatch))),
    bestReason: byReason[0].csat,
    worstReason: byReason[byReason.length - 1].csat,
  };
  return { byReason, byLang, drivers, stats };
}

// ---------------------------------------------------------------------------
// P2 · Agent performance scorecard (Power BI style dashboard)
// ---------------------------------------------------------------------------
function p2() {
  const { normal, rand } = makeRng(22);
  const agents = [];
  for (let i = 1; i <= 40; i++) {
    const skill = normal(0, 1);
    const rush = normal(0, 1); // tendency to close contacts quickly
    const aht = Math.round(Math.max(240, Math.min(720, 430 - 55 * rush - 20 * skill + normal(0, 25))));
    const qa = round(Math.max(62, Math.min(98, 84 + 5 * skill - 2.2 * rush + normal(0, 2.5))));
    const fcr = round(Math.max(52, Math.min(90, 72 + 4 * skill - 5 * rush + normal(0, 3))));
    const csat = round(Math.max(60, Math.min(95, 79 + 4 * skill - 2.5 * rush + normal(0, 3))));
    agents.push({ id: `A${String(i).padStart(2, '0')}`, aht, qa, fcr, csat, tenure: Math.round(2 + rand() * 34) });
  }
  const items = [
    ['greeting', 3.1], ['verification', 11.8], ['empathy', 17.4], ['accuracy', 9.6],
    ['resolution', 14.2], ['hold', 7.3], ['notes', 21.9], ['closing', 4.4],
  ].map(([key, rate]) => ({ key, rate }));
  const medAht = [...agents].map((a) => a.aht).sort((a, b) => a - b)[20];
  const targetQa = 85;
  const quad = (f) => agents.filter(f).length;
  // Pearson correlation between AHT and FCR
  const ma = mean(agents.map((a) => a.aht)), mf = mean(agents.map((a) => a.fcr));
  let num = 0, da = 0, df = 0;
  agents.forEach((a) => { num += (a.aht - ma) * (a.fcr - mf); da += (a.aht - ma) ** 2; df += (a.fcr - mf) ** 2; });
  const fastest = [...agents].sort((a, b) => a.aht - b.aht).slice(0, 10);
  const stats = {
    agents: agents.length,
    medAht,
    medAhtMin: round(medAht / 60),
    avgQa: round(mean(agents.map((a) => a.qa))),
    avgCsat: round(mean(agents.map((a) => a.csat))),
    avgFcr: round(mean(agents.map((a) => a.fcr))),
    targetQa,
    fastSloppy: quad((a) => a.aht < medAht && a.qa < targetQa),
    slowGood: quad((a) => a.aht >= medAht && a.qa >= targetQa),
    corr: round(num / Math.sqrt(da * df), 2),
    fastestFcr: round(mean(fastest.map((a) => a.fcr))),
    notesRate: items.find((i) => i.key === 'notes').rate,
    empathyRate: items.find((i) => i.key === 'empathy').rate,
  };
  return { agents, items, stats };
}

// ---------------------------------------------------------------------------
// P3 · Repeat contacts and first-contact resolution (SQL)
// ---------------------------------------------------------------------------
function p3() {
  const { rand, pick } = makeRng(33);
  const reasons = ['billing', 'delivery', 'access', 'fault', 'cancel', 'plan'];
  const repeatP = { billing: 0.24, delivery: 0.31, access: 0.12, fault: 0.27, cancel: 0.09, plan: 0.1 };
  const counts = Object.fromEntries(reasons.map((r) => [r, { n: 0, rep: 0 }]));
  const days = Array(7).fill(0);
  let total = 0, repeats = 0;
  for (let i = 0; i < 26000; i++) {
    const reason = pick(reasons, [22, 18, 15, 17, 10, 18]);
    counts[reason].n++; total++;
    if (rand() < repeatP[reason]) {
      counts[reason].rep++; repeats++;
      const d = pick([1, 2, 3, 4, 5, 6, 7], [38, 22, 12, 9, 7, 6, 6]);
      days[d - 1]++;
    }
  }
  const byReason = reasons.map((k) => ({ key: k, rate: round(pct(counts[k].rep, counts[k].n)), repeats: counts[k].rep }))
    .sort((a, b) => b.rate - a.rate);
  const topTwo = [...byReason].sort((a, b) => b.repeats - a.repeats).slice(0, 2);
  const stats = {
    n: total,
    repeatRate: round(pct(repeats, total)),
    fcr: round(100 - pct(repeats, total)),
    topTwoShare: round(pct(topTwo[0].repeats + topTwo[1].repeats, repeats)),
    within48: round(pct(days[0] + days[1], repeats)),
    deliveryRate: byReason.find((r) => r.key === 'delivery').rate,
    faultRate: byReason.find((r) => r.key === 'fault').rate,
    // If delivery and fault repeat rates fell to the desk average excluding them:
    avoidable: Math.round(
      ['delivery', 'fault'].reduce((s, k) => s + counts[k].rep - counts[k].n * 0.15, 0) / 26,
    ),
  };
  return { byReason, days: days.map((v) => round(pct(v, repeats))), stats };
}

// ---------------------------------------------------------------------------
// P4 · Contact volume forecast and staffing (Excel + Python)
// ---------------------------------------------------------------------------
function erlangC(agents, traffic) {
  // probability a contact has to wait
  let sum = 0, term = 1;
  for (let k = 0; k < agents; k++) { if (k > 0) term *= traffic / k; sum += term; }
  const top = term * (traffic / agents) * (agents / (agents - traffic));
  return top / (sum + top);
}
function agentsNeeded(callsPerHour, ahtSec, targetSec = 20, sl = 0.8) {
  const traffic = (callsPerHour * ahtSec) / 3600;
  for (let n = Math.ceil(traffic) + 1; n < 200; n++) {
    const pw = erlangC(n, traffic);
    const service = 1 - pw * Math.exp(-((n - traffic) * targetSec) / ahtSec);
    if (service >= sl) return { n, service };
  }
  return { n: NaN, service: 0 };
}

function p4() {
  const { normal } = makeRng(44);
  const weeks = 104;
  const actual = [];
  for (let w = 0; w < weeks; w++) {
    const season = 1 + 0.16 * Math.sin((2 * Math.PI * (w - 8)) / 52) + (w % 52 >= 46 ? 0.22 : 0);
    actual.push(Math.round((5200 + 14 * w) * season * (1 + normal(0, 0.035))));
  }
  // seasonal naive with year-on-year growth, back-tested on the last 12 weeks
  const growth = (from) => mean(actual.slice(from - 12, from)) / mean(actual.slice(from - 64, from - 52));
  const fc = (w, from) => Math.round(actual[w - 52] * growth(from));
  const backtest = [];
  for (let w = weeks - 12; w < weeks; w++) backtest.push(fc(w, weeks - 12));
  const ape = backtest.map((f, i) => Math.abs(f - actual[weeks - 12 + i]) / actual[weeks - 12 + i]);
  const future = [];
  const g = growth(weeks);
  for (let h = 0; h < 12; h++) future.push(Math.round(actual[weeks + h - 52] * g));
  const mape = mean(ape) * 100;
  const band = future.map((f) => [Math.round(f * (1 - mape / 100 * 1.6)), Math.round(f * (1 + mape / 100 * 1.6))]);

  // intraday profile (Mon..Sun x 08..20h), share of weekly volume
  const hours = Array.from({ length: 13 }, (_, i) => 8 + i);
  const dayW = [1.18, 1.1, 1.02, 0.98, 0.95, 0.52, 0.25];
  const hourW = hours.map((h) => Math.exp(-((h - 11) ** 2) / 8) + 0.75 * Math.exp(-((h - 15) ** 2) / 6) + 0.18);
  const raw = dayW.map((d) => hourW.map((h) => d * h));
  const tot = raw.flat().reduce((a, b) => a + b, 0);
  const nextWeek = future[0];
  const heat = raw.map((row) => row.map((v) => Math.round((v / tot) * nextWeek)));
  const aht = 380;
  const monday = hours.map((h, i) => ({ hour: h, calls: heat[0][i], ...agentsNeeded(heat[0][i], aht) }))
    .map((r) => ({ hour: r.hour, calls: r.calls, agents: r.n, sl: round(r.service * 100) }));
  const peak = monday.reduce((a, b) => (b.calls > a.calls ? b : a));
  const stats = {
    mape: round(mape),
    nextWeek,
    peakWeek: Math.max(...future),
    peakHour: peak.hour,
    peakCalls: peak.calls,
    peakAgents: peak.agents,
    aht,
    flatAgents: Math.max(...monday.map((r) => r.agents)) * 13,
    hourlyAgents: monday.reduce((s, r) => s + r.agents, 0),
  };
  stats.savedHours = stats.flatAgents - stats.hourlyAgents;
  return {
    history: actual.slice(weeks - 52), backtest, future, band, heat, hours, monday, stats,
  };
}

// ---------------------------------------------------------------------------
// P5 · QA calibration between evaluators
// ---------------------------------------------------------------------------
function p5() {
  const { normal, rand } = makeRng(55);
  const evaluators = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];
  const bias = { E1: 0.4, E2: -1.1, E3: 0.2, E4: 6.3, E5: -3.8, E6: 0.9 };
  const items = ['greeting', 'verification', 'empathy', 'accuracy', 'resolution', 'hold', 'notes', 'closing'];
  const fuzz = { greeting: 0.04, verification: 0.07, empathy: 0.31, accuracy: 0.1, resolution: 0.14, hold: 0.08, notes: 0.27, closing: 0.05 };
  const calls = 30;
  const scores = {}; evaluators.forEach((e) => (scores[e] = []));
  const agree = Object.fromEntries(items.map((i) => [i, 0]));
  for (let c = 0; c < calls; c++) {
    const truth = Math.max(55, Math.min(98, normal(82, 8)));
    evaluators.forEach((e) => scores[e].push(Math.max(40, Math.min(100, truth + bias[e] + normal(0, 2.2)))));
    items.forEach((it) => { if (rand() > fuzz[it] * 1.6) agree[it]++; });
  }
  const consensus = Array.from({ length: calls }, (_, c) => {
    const s = evaluators.map((e) => scores[e][c]).sort((a, b) => a - b);
    return (s[2] + s[3]) / 2;
  });
  const deviation = evaluators.map((e) => ({ key: e, dev: round(mean(scores[e].map((v, c) => v - consensus[c]))) }));
  const itemAgree = items.map((k) => ({ key: k, agree: round(pct(agree[k], calls)) })).sort((a, b) => a.agree - b.agree);
  const spreadBefore = round(Math.max(...deviation.map((d) => d.dev)) - Math.min(...deviation.map((d) => d.dev)));
  const stats = {
    calls, evaluators: evaluators.length,
    e4: deviation.find((d) => d.key === 'E4').dev,
    e5: deviation.find((d) => d.key === 'E5').dev,
    spread: spreadBefore,
    empathyAgree: itemAgree.find((i) => i.key === 'empathy').agree,
    notesAgree: itemAgree.find((i) => i.key === 'notes').agree,
    greetingAgree: itemAgree.find((i) => i.key === 'greeting').agree,
  };
  return { deviation, itemAgree, stats };
}

// ---------------------------------------------------------------------------
// P6 · Member onboarding and retention cohorts
// ---------------------------------------------------------------------------
function p6() {
  const { normal } = makeRng(66);
  const cohorts = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const months = 7; // month 0..6
  const grid = cohorts.map((c, ci) => {
    const lift = ci >= 4 ? 0.035 : 0; // welcome call rolled out in May
    const row = [100];
    for (let m = 1; m < months; m++) {
      if (ci + m >= cohorts.length) { row.push(null); continue; }
      const prev = row[m - 1];
      const decay = (m === 1 ? 0.8 : 0.93) + lift + normal(0, 0.008);
      row.push(round(prev * Math.min(decay, 0.99)));
    }
    return { cohort: c, size: Math.round(420 + 30 * ci + normal(0, 25)), row };
  });
  const curve = (first, later) => {
    const out = [100];
    for (let m = 1; m < months; m++) out.push(round(out[m - 1] * (m === 1 ? first : later)));
    return out;
  };
  const call = curve(0.86, 0.955);
  const email = curve(0.76, 0.925);
  const stats = {
    call3: call[3], email3: email[3], call6: call[6], email6: email[6],
    gap6: round(call[6] - email[6]),
    m1Drop: round(100 - email[1]),
    preM3: round(mean(grid.slice(0, 4).map((g) => g.row[3]))),
    postM3: round(mean(grid.slice(4).filter((g) => g.row[3] != null).map((g) => g.row[3]))),
  };
  stats.m3Lift = round(stats.postM3 - stats.preM3);
  return { cohorts: grid, curves: { call, email }, stats };
}

export function buildData() {
  return { p1: p1(), p2: p2(), p3: p3(), p4: p4(), p5: p5(), p6: p6() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = buildData();
  for (const k of Object.keys(d)) console.log(k, JSON.stringify(d[k].stats));
}
