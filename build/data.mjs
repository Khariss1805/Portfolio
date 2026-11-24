// Synthetic data for the six practice projects.
// Everything here is generated from a fixed seed, so the numbers quoted in the
// case-study text always match the charts. No real company or user data.

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
  const normal = (mu = 0, sd = 1) => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { rand: r, normal };
}
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sum = (a) => a.reduce((s, x) => s + x, 0);
// standard normal CDF (Abramowitz and Stegun 7.1.26)
function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// ---------------------------------------------------------------------------
// P1 · Sales dashboard for an online store (Power BI)
// ---------------------------------------------------------------------------
function p1() {
  const { normal, rand } = makeRng(101);
  const cats = ['electronics', 'home', 'apparel', 'beauty', 'sports', 'books'];
  const share = { electronics: 0.31, home: 0.24, apparel: 0.17, beauty: 0.12, sports: 0.1, books: 0.06 };
  const aov = { electronics: 148, home: 74, apparel: 52, beauty: 31, sports: 63, books: 22 };
  const returns = { electronics: 6.2, home: 7.9, apparel: 21.4, beauty: 3.1, sports: 9.8, books: 2.2 };
  const season = [0.82, 0.76, 0.86, 0.88, 0.93, 0.9, 0.87, 0.92, 0.96, 1.04, 1.38, 1.71];
  const months = season.map((s, m) => {
    const base = 182000 * (1 + 0.012 * m) * s * (1 + normal(0, 0.025));
    return Math.round(base);
  });
  const total = sum(months);
  const byCat = cats.map((k) => {
    const rev = Math.round(total * share[k] * (1 + normal(0, 0.02)));
    return { key: k, revenue: rev, orders: Math.round(rev / aov[k]), returnRate: round(returns[k] + normal(0, 0.4)) };
  }).sort((a, b) => b.revenue - a.revenue);
  const revTotal = sum(byCat.map((c) => c.revenue));
  const orders = sum(byCat.map((c) => c.orders));
  const avgReturn = sum(byCat.map((c) => c.returnRate * c.orders)) / orders;
  const apparel = byCat.find((c) => c.key === 'apparel');
  const topTwo = byCat[0].revenue + byCat[1].revenue;
  const avgMonth = total / 12;
  void rand;
  const stats = {
    revenueK: round(revTotal / 1000, 0),
    revenueM: round(revTotal / 1e6, 2),
    orders,
    aov: round(revTotal / orders, 0),
    returnRate: round(avgReturn),
    topTwoShare: round((100 * topTwo) / revTotal),
    decLift: round(100 * (months[11] / avgMonth - 1), 0),
    q4Share: round((100 * (months[9] + months[10] + months[11])) / total),
    apparelReturn: apparel.returnRate,
    apparelLostK: round((apparel.revenue * apparel.returnRate) / 100 / 1000, 0),
  };
  return { months, byCat, stats };
}

// ---------------------------------------------------------------------------
// P2 · A/B test of a redesigned checkout
// ---------------------------------------------------------------------------
function p2() {
  const { rand } = makeRng(202);
  const days = 21;
  const p = { A: { mobile: 0.0235, desktop: 0.0405 }, B: { mobile: 0.0322, desktop: 0.0418 } };
  const agg = { A: { mobile: [0, 0], desktop: [0, 0] }, B: { mobile: [0, 0], desktop: [0, 0] } };
  const cum = { A: [], B: [] };
  const run = { A: [0, 0], B: [0, 0] };
  for (let d = 0; d < days; d++) {
    for (const v of ['A', 'B']) {
      for (const dev of ['mobile', 'desktop']) {
        const sessions = Math.round((dev === 'mobile' ? 720 : 430) * (0.9 + 0.2 * rand()));
        let conv = 0;
        for (let i = 0; i < sessions; i++) if (rand() < p[v][dev]) conv++;
        agg[v][dev][0] += sessions; agg[v][dev][1] += conv;
        run[v][0] += sessions; run[v][1] += conv;
      }
      cum[v].push(round((100 * run[v][1]) / run[v][0], 2));
    }
  }
  const rate = (v, dev) => (dev ? agg[v][dev][1] / agg[v][dev][0] : run[v][1] / run[v][0]);
  const nA = run.A[0], nB = run.B[0];
  const pA = rate('A'), pB = rate('B');
  const pool = (run.A[1] + run.B[1]) / (nA + nB);
  const z = (pB - pA) / Math.sqrt(pool * (1 - pool) * (1 / nA + 1 / nB));
  const pValue = 2 * (1 - phi(Math.abs(z)));
  const devices = ['mobile', 'desktop'].map((dev) => ({ key: dev, A: round(100 * rate('A', dev), 2), B: round(100 * rate('B', dev), 2) }));
  const stats = {
    days,
    sessions: nA + nB,
    convA: round(100 * pA, 2),
    convB: round(100 * pB, 2),
    lift: round(100 * (pB / pA - 1), 0),
    pValue: pValue < 0.001 ? 0.001 : round(pValue, 3),
    mobileA: devices[0].A, mobileB: devices[0].B,
    mobileLift: round(100 * (devices[0].B / devices[0].A - 1), 0),
    desktopLift: round(100 * (devices[1].B / devices[1].A - 1), 0),
    extraOrders: Math.round((pB - pA) * 30000),
  };
  return { cum, devices, stats };
}

// ---------------------------------------------------------------------------
// P3 · Sign-up funnel analysis (SQL)
// ---------------------------------------------------------------------------
function p3() {
  const steps = ['landing', 'start', 'email', 'verify', 'profile', 'first'];
  const pass = {
    mobile: [1, 0.38, 0.81, 0.52, 0.84, 0.71],
    desktop: [1, 0.44, 0.88, 0.74, 0.86, 0.76],
  };
  const start = { mobile: 26000, desktop: 14000 };
  const counts = {};
  for (const dev of ['mobile', 'desktop']) {
    let n = start[dev];
    counts[dev] = pass[dev].map((r) => (n = Math.round(n * r)));
  }
  const total = steps.map((_, i) => counts.mobile[i] + counts.desktop[i]);
  const pctOfStart = (arr) => arr.map((v) => round((100 * v) / arr[0]));
  const stepDrop = steps.slice(1).map((k, i) => ({ key: k, drop: round(100 * (1 - total[i + 1] / total[i])) }));
  const verify = stepDrop.find((s) => s.key === 'verify');
  const stats = {
    visitors: total[0],
    completed: total[5],
    overall: round((100 * total[5]) / total[0], 1),
    verifyDrop: verify.drop,
    mobileVerifyDrop: round(100 * (1 - pass.mobile[3])),
    desktopVerifyDrop: round(100 * (1 - pass.desktop[3])),
    mobileComplete: round((100 * counts.mobile[5]) / counts.mobile[0], 1),
    desktopComplete: round((100 * counts.desktop[5]) / counts.desktop[0], 1),
    // if mobile verification matched desktop
    extraUsers: Math.round(counts.mobile[2] * (pass.desktop[3] - pass.mobile[3]) * pass.mobile[4] * pass.mobile[5]),
  };
  return { steps, mobile: pctOfStart(counts.mobile), desktop: pctOfStart(counts.desktop), stepDrop, stats };
}

// ---------------------------------------------------------------------------
// P4 · Usability study of a booking app prototype
// ---------------------------------------------------------------------------
function p4() {
  const { normal, rand } = makeRng(404);
  const tasks = ['find', 'book', 'cancel', 'payment', 'invite'];
  const n = 10;
  const pSucc = { v1: [0.9, 0.7, 0.4, 0.5, 0.8], v2: [1, 0.9, 0.8, 0.9, 0.9] };
  const tMed = { v1: [38, 95, 142, 118, 64], v2: [31, 71, 58, 66, 49] };
  const res = {};
  for (const v of ['v1', 'v2']) {
    res[v] = tasks.map((_, i) => {
      let s = 0; const times = [];
      for (let k = 0; k < n; k++) { if (rand() < pSucc[v][i]) s++; times.push(Math.max(12, tMed[v][i] * Math.exp(normal(0, 0.25)))); }
      times.sort((a, b) => a - b);
      return { success: (100 * s) / n, time: Math.round((times[4] + times[5]) / 2) };
    });
  }
  const sus = { v1: [], v2: [] };
  for (let k = 0; k < n; k++) {
    sus.v1.push(Math.max(30, Math.min(95, round(normal(61, 9) / 2.5, 0) * 2.5)));
    sus.v2.push(Math.max(45, Math.min(100, round(normal(79, 7) / 2.5, 0) * 2.5)));
  }
  const ci = res.v1.findIndex((_, i) => tasks[i] === 'cancel');
  const stats = {
    participants: n,
    tasks: tasks.length,
    susV1: round(mean(sus.v1)),
    susV2: round(mean(sus.v2)),
    successV1: round(mean(res.v1.map((r) => r.success)), 0),
    successV2: round(mean(res.v2.map((r) => r.success)), 0),
    cancelV1: res.v1[ci].success,
    cancelV2: res.v2[ci].success,
    cancelTimeV1: res.v1[ci].time,
    cancelTimeV2: res.v2[ci].time,
    timeSaved: round(100 * (1 - sum(res.v2.map((r) => r.time)) / sum(res.v1.map((r) => r.time))), 0),
  };
  return { tasks, res, sus, stats };
}

// ---------------------------------------------------------------------------
// P5 · Weekly order forecast for an online store
// ---------------------------------------------------------------------------
function p5() {
  const { normal } = makeRng(505);
  const weeks = 104;
  const actual = [];
  for (let w = 0; w < weeks; w++) {
    const season = 1 + 0.14 * Math.sin((2 * Math.PI * (w - 10)) / 52) + (w % 52 >= 45 && w % 52 <= 50 ? 0.38 : 0);
    actual.push(Math.round((2100 + 6 * w) * season * (1 + normal(0, 0.04))));
  }
  const growth = (from) => mean(actual.slice(from - 12, from)) / mean(actual.slice(from - 64, from - 52));
  const backtest = [];
  for (let w = weeks - 12; w < weeks; w++) backtest.push(Math.round(actual[w - 52] * growth(weeks - 12)));
  const ape = backtest.map((f, i) => Math.abs(f - actual[weeks - 12 + i]) / actual[weeks - 12 + i]);
  const g = growth(weeks);
  const future = Array.from({ length: 12 }, (_, h) => Math.round(actual[weeks + h - 52] * g));
  const mape = mean(ape) * 100;
  const band = future.map((f) => [Math.round(f * (1 - (mape / 100) * 1.6)), Math.round(f * (1 + (mape / 100) * 1.6))]);
  // orders by weekday x hour (online store: evenings and Sunday)
  const hours = Array.from({ length: 16 }, (_, i) => 8 + i);
  const dayW = [0.95, 0.92, 0.94, 0.97, 0.9, 0.86, 1.22];
  const hourW = hours.map((h) => 0.25 + 0.55 * Math.exp(-((h - 13) ** 2) / 5) + 1.05 * Math.exp(-((h - 21) ** 2) / 3));
  const raw = dayW.map((d) => hourW.map((h) => d * h));
  const tot = sum(raw.flat());
  const nextWeek = future[0];
  const heat = raw.map((row) => row.map((v) => Math.round((v / tot) * nextWeek)));
  const evening = sum(heat.map((row) => sum(row.filter((_, i) => hours[i] >= 19 && hours[i] <= 22))));
  const stats = {
    mape: round(mape),
    nextWeek,
    peakWeek: Math.max(...future),
    peakLift: round(100 * (Math.max(...future) / nextWeek - 1), 0),
    eveningShare: round((100 * evening) / sum(heat.flat()), 0),
    sundayShare: round((100 * sum(heat[6])) / sum(heat.flat()), 0),
  };
  return { history: actual.slice(weeks - 52), backtest, future, band, heat, hours, stats };
}

// ---------------------------------------------------------------------------
// P6 · Onboarding tour and retention cohorts
// ---------------------------------------------------------------------------
function p6() {
  const { normal } = makeRng(66);
  const cohorts = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const months = 7;
  const grid = cohorts.map((c, ci) => {
    const lift = ci >= 4 ? 0.035 : 0; // onboarding tour shipped in May
    const row = [100];
    for (let m = 1; m < months; m++) {
      if (ci + m >= cohorts.length) { row.push(null); continue; }
      const decay = (m === 1 ? 0.8 : 0.93) + lift + normal(0, 0.008);
      row.push(round(row[m - 1] * Math.min(decay, 0.99)));
    }
    return { cohort: c, size: Math.round(420 + 30 * ci + normal(0, 25)), row };
  });
  const curve = (first, later) => {
    const out = [100];
    for (let m = 1; m < months; m++) out.push(round(out[m - 1] * (m === 1 ? first : later)));
    return out;
  };
  const tour = curve(0.86, 0.955);
  const skip = curve(0.76, 0.925);
  const stats = {
    tour6: tour[6], skip6: skip[6],
    gap6: round(tour[6] - skip[6]),
    m1Drop: round(100 - skip[1]),
    preM3: round(mean(grid.slice(0, 4).map((g) => g.row[3]))),
    postM3: round(mean(grid.slice(4).filter((g) => g.row[3] != null).map((g) => g.row[3]))),
  };
  stats.m3Lift = round(stats.postM3 - stats.preM3);
  return { cohorts: grid, curves: { tour, skip }, stats };
}

export function buildData() {
  return { p1: p1(), p2: p2(), p3: p3(), p4: p4(), p5: p5(), p6: p6() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = buildData();
  for (const k of Object.keys(d)) console.log(k, JSON.stringify(d[k].stats));
}
