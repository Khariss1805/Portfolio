// Draws the case-study charts with Chart.js from the JSON embedded in each page.
// Colours come from the CSS custom properties, so charts follow light and dark mode.
(function () {
  const el = document.getElementById('chart-data');
  if (!el || !window.Chart) return;
  const { locale, charts } = JSON.parse(el.textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = (v, d = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(v).replace('-', '−');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
  const alpha = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  // Draws dashed reference lines (team median, target) on the scatter plot.
  const refLines = {
    id: 'refLines',
    afterDatasetsDraw(chart, _args, opts) {
      if (!opts || (opts.x == null && opts.y == null)) return;
      const { ctx, chartArea: a, scales } = chart;
      ctx.save();
      ctx.strokeStyle = opts.color;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      if (opts.x != null) { const x = scales.x.getPixelForValue(opts.x); ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke(); }
      if (opts.y != null) { const y = scales.y.getPixelForValue(opts.y); ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke(); }
      ctx.restore();
    },
  };

  function config(spec) {
    const C = (k) => css(k);
    const ink = C('ink'), muted = C('muted'), line = C('line');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 13;
    Chart.defaults.color = muted;
    const unit = spec.unit || '';
    const grid = { color: line, drawTicks: false };
    const tooltip = {
      backgroundColor: ink, titleColor: C('paper'), bodyColor: C('paper'), padding: 10, cornerRadius: 8, displayColors: false,
    };
    const base = {
      responsive: true, maintainAspectRatio: false, animation: reduce ? false : { duration: 700 },
      plugins: { legend: { display: false }, tooltip },
    };

    if (spec.type === 'bar' || spec.type === 'hbar') {
      const horizontal = spec.type === 'hbar';
      const s = spec.series[0];
      const valueAxis = {
        grid, border: { display: false }, min: spec.min, max: spec.max,
        title: { display: true, text: spec.axis, color: muted },
        ticks: { callback: (v) => nf(v) + (unit === '%' ? '%' : ''), padding: 6 },
      };
      const catAxis = { grid: { display: false }, border: { color: line }, ticks: { color: ink, padding: 6 } };
      return {
        type: 'bar',
        data: {
          labels: spec.labels,
          datasets: [{ label: s.name, data: s.values, backgroundColor: (s.colors || spec.labels.map(() => s.color)).map(C), borderRadius: 4, maxBarThickness: horizontal ? 28 : 56 }],
        },
        options: {
          ...base,
          indexAxis: horizontal ? 'y' : 'x',
          scales: horizontal ? { x: valueAxis, y: catAxis } : { y: valueAxis, x: catAxis },
          plugins: { ...base.plugins, tooltip: { ...tooltip, callbacks: { label: (c) => `${spec.signed && c.raw > 0 ? '+' : ''}${nf(c.raw)}${unit}` } } },
        },
      };
    }

    if (spec.type === 'scatter') {
      return {
        type: 'scatter',
        data: {
          datasets: spec.groups.map((g) => ({
            label: g.name, data: g.points, backgroundColor: alpha(C(g.color), 0.85), borderColor: C(g.color), pointRadius: 6, pointHoverRadius: 8,
          })),
        },
        options: {
          ...base,
          scales: {
            x: { grid, border: { display: false }, title: { display: true, text: spec.xLabel, color: muted }, ticks: { callback: (v) => nf(v) } },
            y: { grid, border: { display: false }, title: { display: true, text: spec.yLabel, color: muted } },
          },
          plugins: {
            ...base.plugins,
            legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: ink, padding: 16 } },
            tooltip: { ...tooltip, callbacks: { title: (items) => `${spec.agentLabel} ${items[0].raw.id}`, label: (c) => `${spec.xLabel}: ${nf(c.raw.x)} · ${spec.yLabel}: ${nf(c.raw.y)}` } },
            refLines: { x: spec.refX, y: spec.refY, color: muted },
          },
        },
        plugins: [refLines],
      };
    }

    if (spec.type === 'line') {
      return {
        type: 'line',
        data: {
          labels: spec.labels,
          datasets: spec.series.map((s) => ({
            label: s.name,
            data: s.values,
            borderColor: s.band ? 'transparent' : C(s.color),
            backgroundColor: s.band === 'lower' ? alpha(C('iris'), 0.16) : C(s.color),
            fill: s.band === 'lower' ? '-1' : false,
            borderDash: s.dash ? [6, 5] : undefined,
            borderWidth: 2.5,
            pointRadius: s.band ? 0 : spec.labels.length > 20 ? 0 : 4,
            pointHoverRadius: s.band ? 0 : 5,
            tension: 0.25,
            spanGaps: false,
            _band: !!s.band,
          })),
        },
        options: {
          ...base,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, border: { color: line }, ticks: { maxTicksLimit: 9, autoSkip: true, maxRotation: 0 } },
            y: { grid, border: { display: false }, title: { display: true, text: spec.axis, color: muted }, ticks: { callback: (v) => nf(v) + unit } },
          },
          plugins: {
            ...base.plugins,
            legend: { display: true, position: 'bottom', labels: { color: ink, boxWidth: 14, boxHeight: 3, padding: 16, filter: (item, data) => !(data.datasets[item.datasetIndex]._band && item.datasetIndex === spec.series.findIndex((s) => s.band === 'upper')) } },
            tooltip: { ...tooltip, displayColors: true, filter: (item) => item.raw != null, callbacks: { label: (c) => `${c.dataset.label}: ${nf(c.raw)}${unit}` } },
          },
        },
      };
    }

    if (spec.type === 'combo') {
      const [bars, ln] = spec.series;
      return {
        type: 'bar',
        data: {
          labels: spec.labels,
          datasets: [
            { type: 'bar', label: bars.name, data: bars.values, backgroundColor: C(bars.color), borderRadius: 4, yAxisID: 'y', order: 2 },
            { type: 'line', label: ln.name, data: ln.values, borderColor: C(ln.color), backgroundColor: C(ln.color), borderWidth: 2.5, pointRadius: 4, yAxisID: 'y2', order: 1, tension: 0.2 },
          ],
        },
        options: {
          ...base,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, border: { color: line }, ticks: { maxRotation: 0, autoSkip: true } },
            y: { grid, border: { display: false }, title: { display: true, text: spec.axis, color: muted } },
            y2: { position: 'right', grid: { display: false }, border: { display: false }, title: { display: true, text: spec.axis2, color: muted } },
          },
          plugins: {
            ...base.plugins,
            legend: { display: true, position: 'bottom', labels: { color: ink, boxWidth: 14, padding: 16 } },
            tooltip: {
              ...tooltip, displayColors: true,
              callbacks: {
                label: (c) => `${c.dataset.label}: ${nf(c.raw)}`,
                afterBody: (items) => spec.extra ? `${spec.extra.name}: ${nf(spec.extra.values[items[0].dataIndex])}${spec.extra.unit}` : '',
              },
            },
          },
        },
      };
    }
    return null;
  }

  const instances = [];
  function drawAll() {
    instances.splice(0).forEach((c) => c.destroy());
    for (const [id, spec] of Object.entries(charts)) {
      const canvas = document.getElementById(id);
      const cfg = canvas && config(spec);
      if (cfg) instances.push(new Chart(canvas, cfg));
    }
  }
  drawAll();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawAll);
})();
