// Excel workbooks for the six practice projects.
// One spec per project feeds two outputs:
//   1. the Excel-style preview on each case-study page (build.mjs), and
//   2. the real .xlsx file people can download (build/excel.py, via openpyxl).
// Every sheet has the same layout, so formulas can point at fixed cells:
//   row 1        title
//   rows 3 and 4 KPI labels and KPI values (only if the sheet has KPIs)
//   row 6        table header (row 3 when there are no KPIs), data below it.
// Values are computed here, so the preview shows real numbers; the .xlsx
// carries the formulas and Excel recalculates them on open.

export const colName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => sum(a) / a.length;
const r1 = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

// sheet({ name, title, kpis, head, rows, chart })
//   kpis: [{ label, fmt, v, f(ctx) }]       f gets { first, last, hdr } of the table
//   head: [{ label, fmt, cf: 'bar' | 'scale' | 'scale-rev' }]
//   rows: [[value | { v, f(r) }]]          f gets the Excel row number
function sheet({ name, title, kpis = [], head, rows, chart, note }) {
  const hdr = kpis.length ? 6 : 3;
  const first = hdr + 1;
  const last = hdr + rows.length;
  const ctx = { hdr, first, last };
  return {
    name, title, note, hdr, first, last,
    kpis: kpis.map((k) => ({ label: k.label, fmt: k.fmt, v: k.v, f: k.f ? k.f(ctx) : null })),
    head,
    rows: rows.map((row, i) => row.map((cell) => {
      if (cell && typeof cell === 'object') return { v: cell.v, f: cell.f ? cell.f(first + i) : null };
      return { v: cell, f: null };
    })),
    chart,
  };
}

export function workbooks(data, c, title) {
  const X = c.xl;
  const L = c.chart;
  const W = {};

  // ---------------------------------------------------------------- P1 sales
  {
    const d = data.p1;
    const cats = d.byCat;
    const rev = sum(cats.map((x) => x.revenue));
    const ord = sum(cats.map((x) => x.orders));
    const ret = sum(cats.map((x) => x.returnRate * x.orders)) / ord;
    const total = sum(d.months);
    W['sales-dashboard'] = [
      sheet({
        name: 'Dashboard', title: title('sales-dashboard'),
        kpis: [
          { label: X.revenue, fmt: 'eur', v: rev, f: (t) => `=SUM(B${t.first}:B${t.last})` },
          { label: X.orders, fmt: 'int', v: ord, f: (t) => `=SUM(C${t.first}:C${t.last})` },
          { label: X.aov, fmt: 'eur2', v: rev / ord, f: () => '=A4/B4' },
          { label: X.returned, fmt: 'pct', v: ret, f: (t) => `=SUMPRODUCT(C${t.first}:C${t.last},E${t.first}:E${t.last})/B4` },
        ],
        head: [{ label: X.category }, { label: X.revenue, fmt: 'eur', cf: 'bar' }, { label: X.orders, fmt: 'int' }, { label: X.aov, fmt: 'eur2' }, { label: X.returned, fmt: 'pct', cf: 'scale' }],
        rows: cats.map((x) => [L.cats[x.key], x.revenue, x.orders, { v: x.revenue / x.orders, f: (r) => `=B${r}/C${r}` }, x.returnRate]),
        chart: { type: 'bar', cat: 0, series: [1], title: X.revenue },
      }),
      sheet({
        name: 'Monthly', title: X.byMonth,
        head: [{ label: X.month }, { label: X.revenue, fmt: 'eur', cf: 'bar' }, { label: X.share, fmt: 'ratio' }],
        rows: d.months.map((v, i) => [L.months[i], v, { v: v / total, f: (r) => `=B${r}/SUM($B$4:$B$15)` }]),
        chart: { type: 'col', cat: 0, series: [1], title: X.revenue },
      }),
    ];
  }

  // ---------------------------------------------------------------- P2 A/B test
  {
    const d = data.p2;
    const s = d.stats;
    W['checkout-ab-test'] = [
      sheet({
        name: 'Dashboard', title: title('checkout-ab-test'),
        kpis: [
          { label: X.convA, fmt: 'pct2', v: s.convA },
          { label: X.convB, fmt: 'pct2', v: s.convB },
          { label: X.lift, fmt: 'ratio', v: s.convB / s.convA - 1, f: () => '=B4/A4-1' },
          { label: X.sessions, fmt: 'int', v: s.sessions },
        ],
        head: [{ label: X.device }, { label: X.convA, fmt: 'pct2' }, { label: X.convB, fmt: 'pct2' }, { label: X.lift, fmt: 'ratio', cf: 'scale' }],
        rows: d.devices.map((x) => [L.devices[x.key], x.A, x.B, { v: x.B / x.A - 1, f: (r) => `=C${r}/B${r}-1` }]),
        chart: { type: 'col', cat: 0, series: [1, 2], title: X.conversion },
      }),
      sheet({
        name: 'Daily', title: X.byDay,
        head: [{ label: X.day }, { label: X.convA, fmt: 'pct2' }, { label: X.convB, fmt: 'pct2' }, { label: X.gap, fmt: 'pts', cf: 'bar' }],
        rows: d.cum.A.map((a, i) => [L.dayN.replace('{n}', i + 1), a, d.cum.B[i], { v: d.cum.B[i] - a, f: (r) => `=C${r}-B${r}` }]),
        chart: { type: 'line', cat: 0, series: [1, 2], title: X.conversion },
      }),
    ];
  }

  // ---------------------------------------------------------------- P3 funnel
  {
    const d = data.p3;
    const s = d.stats;
    W['signup-funnel'] = [
      sheet({
        name: 'Dashboard', title: title('signup-funnel'),
        kpis: [
          { label: X.visitors, fmt: 'int', v: s.visitors },
          { label: X.completed, fmt: 'int', v: s.completed },
          { label: X.overall, fmt: 'ratio', v: s.completed / s.visitors, f: () => '=B4/A4' },
          { label: X.verifyDrop, fmt: 'pct', v: s.verifyDrop },
        ],
        head: [{ label: X.step }, { label: X.desktop, fmt: 'pct', cf: 'bar' }, { label: X.mobile, fmt: 'pct', cf: 'bar' }, { label: X.gap, fmt: 'pts', cf: 'scale' }],
        rows: d.steps.map((k, i) => [L.steps[k], d.desktop[i], d.mobile[i], { v: d.desktop[i] - d.mobile[i], f: (r) => `=B${r}-C${r}` }]),
        chart: { type: 'bar', cat: 0, series: [1, 2], title: X.reached },
      }),
      sheet({
        name: 'Drop-off', title: X.lost,
        head: [{ label: X.step }, { label: X.lost, fmt: 'pct', cf: 'scale' }],
        rows: d.stepDrop.map((x) => [L.steps[x.key], x.drop]),
        chart: { type: 'col', cat: 0, series: [1], title: X.lost },
      }),
    ];
  }

  // ---------------------------------------------------------------- P4 usability
  {
    const d = data.p4;
    const n = d.sus.v1.length;
    const susLast = 3 + n;
    W['usability-study'] = [
      sheet({
        name: 'Dashboard', title: title('usability-study'),
        kpis: [
          { label: X.sus1, fmt: 'n1', v: mean(d.sus.v1), f: () => `=AVERAGE(SUS!B4:B${susLast})` },
          { label: X.sus2, fmt: 'n1', v: mean(d.sus.v2), f: () => `=AVERAGE(SUS!C4:C${susLast})` },
          { label: X.succAvg1, fmt: 'pct0', v: mean(d.res.v1.map((x) => x.success)), f: (t) => `=AVERAGE(B${t.first}:B${t.last})` },
          { label: X.succAvg2, fmt: 'pct0', v: mean(d.res.v2.map((x) => x.success)), f: (t) => `=AVERAGE(C${t.first}:C${t.last})` },
        ],
        head: [{ label: X.task }, { label: X.succ1, fmt: 'pct0', cf: 'scale' }, { label: X.succ2, fmt: 'pct0', cf: 'scale' }, { label: X.time1, fmt: 'int' }, { label: X.time2, fmt: 'int' }, { label: X.saved, fmt: 'ratio', cf: 'bar' }],
        rows: d.tasks.map((k, i) => {
          const a = d.res.v1[i], b = d.res.v2[i];
          return [L.tasks[k], a.success, b.success, a.time, b.time, { v: 1 - b.time / a.time, f: (r) => `=1-E${r}/D${r}` }];
        }),
        chart: { type: 'col', cat: 0, series: [1, 2], title: X.successTitle },
      }),
      sheet({
        name: 'SUS', title: X.susTitle,
        head: [{ label: X.participant }, { label: X.sus1, fmt: 'n1', cf: 'scale' }, { label: X.sus2, fmt: 'n1', cf: 'scale' }],
        rows: d.sus.v1.map((v, i) => [`P${i + 1}`, v, d.sus.v2[i]]),
        chart: { type: 'col', cat: 0, series: [1, 2], title: 'SUS' },
      }),
    ];
  }

  // ---------------------------------------------------------------- P5 forecast
  {
    const d = data.p5;
    const s = d.stats;
    const h = d.history.length;
    const evening = sum(d.heat.map((row) => sum(row.filter((_, i) => d.hours[i] >= 19 && d.hours[i] <= 22))));
    const all = sum(d.heat.flat());
    const eveStart = colName(1 + d.hours.indexOf(19));
    const eveEnd = colName(1 + d.hours.indexOf(22));
    const heatEnd = colName(d.hours.length);
    W['order-forecast'] = [
      sheet({
        name: 'Dashboard', title: title('order-forecast'),
        kpis: [
          { label: X.nextWeek, fmt: 'int', v: d.future[0], f: (t) => `=B${t.first}` },
          { label: X.peakWeek, fmt: 'int', v: Math.max(...d.future), f: (t) => `=MAX(B${t.first}:B${t.last})` },
          { label: X.mape, fmt: 'pct', v: s.mape },
          { label: X.evening, fmt: 'ratio', v: evening / all, f: () => `=SUM(Heatmap!${eveStart}4:${eveEnd}10)/SUM(Heatmap!B4:${heatEnd}10)` },
        ],
        head: [{ label: X.week }, { label: X.forecast, fmt: 'int', cf: 'bar' }, { label: X.low, fmt: 'int' }, { label: X.high, fmt: 'int' }],
        rows: d.future.map((v, i) => [L.weekN.replace('{n}', h + i + 1), v, d.band[i][0], d.band[i][1]]),
        chart: { type: 'line', cat: 0, series: [1, 2, 3], title: X.forecast },
      }),
      sheet({
        name: 'Heatmap', title: X.heatTitle,
        head: [{ label: X.weekday }].concat(d.hours.map((hr) => ({ label: `${hr}h`, fmt: 'int', cf: 'scale-all' }))),
        rows: d.heat.map((row, i) => [L.weekdays[i], ...row]),
      }),
    ];
  }

  // ---------------------------------------------------------------- P6 retention
  {
    const d = data.p6;
    const s = d.stats;
    const fmtM = new Intl.DateTimeFormat(c.locale, { month: 'short', year: 'numeric' });
    const months = d.cohorts[0].row.length;
    W['onboarding-retention'] = [
      sheet({
        name: 'Dashboard', title: title('onboarding-retention'),
        kpis: [
          { label: X.tour6, fmt: 'pct', v: s.tour6, f: () => '=Curves!B10' },
          { label: X.skip6, fmt: 'pct', v: s.skip6, f: () => '=Curves!C10' },
          { label: X.gap6, fmt: 'pts', v: s.tour6 - s.skip6, f: () => '=A4-B4' },
          { label: X.members, fmt: 'int', v: sum(d.cohorts.map((g) => g.size)), f: (t) => `=SUM(B${t.first}:B${t.last})` },
        ],
        head: [{ label: X.cohort }, { label: X.members, fmt: 'int' }].concat(Array.from({ length: months }, (_, i) => ({ label: L.monthN.replace('{n}', i), fmt: 'pct', cf: 'scale-all' }))),
        rows: d.cohorts.map((g) => [fmtM.format(new Date(g.cohort + '-15')), g.size, ...g.row]),
      }),
      sheet({
        name: 'Curves', title: X.curvesTitle,
        head: [{ label: X.month }, { label: X.tour, fmt: 'pct', cf: 'bar' }, { label: X.noTour, fmt: 'pct', cf: 'bar' }, { label: X.gap, fmt: 'pts' }],
        rows: d.curves.tour.map((v, i) => [L.monthN.replace('{n}', i), v, d.curves.skip[i], { v: r1(v - d.curves.skip[i]), f: (r) => `=B${r}-C${r}` }]),
        chart: { type: 'line', cat: 0, series: [1, 2], title: X.retained },
      }),
    ];
  }
  return W;
}
