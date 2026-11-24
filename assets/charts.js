// Draws the case-study charts with Chart.js from the JSON embedded in each page.
// Each chart is created only when it scrolls into view, so its entrance animation
// is seen: bars grow from zero one after another and lines draw from left to right.
// Colours come from CSS custom properties, so charts follow light and dark mode.
(function () {
  const el = document.getElementById('chart-data');
  if (!el || !window.Chart) return;
  const { locale, charts } = JSON.parse(el.textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = (v, d = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(v).replace('-', '−');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
  const alpha = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  function config(spec) {
    const C = (k) => css(k);
    const ink = C('ink'), muted = C('muted'), line = C('line');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 13;
    Chart.defaults.color = muted;
    const unit = spec.unit || '';
    const tickUnit = unit === '%' ? '%' : '';
    const grid = { color: line, drawTicks: false };
    const tooltip = { backgroundColor: ink, titleColor: C('paper'), bodyColor: C('paper'), padding: 10, cornerRadius: 8, displayColors: !!spec.legend || spec.series.length > 1 };
    const legend = { display: !!spec.legend || spec.series.length > 1, position: 'bottom', labels: { color: ink, boxWidth: 14, boxHeight: 10, padding: 16 } };

    if (spec.type === 'bar' || spec.type === 'hbar') {
      const horizontal = spec.type === 'hbar';
      const valueAxis = {
        grid, border: { display: false }, min: spec.min, max: spec.max, beginAtZero: true,
        title: { display: true, text: spec.axis, color: muted },
        ticks: { callback: (v) => nf(v) + tickUnit, padding: 6 },
      };
      const catAxis = { grid: { display: false }, border: { color: line }, ticks: { color: ink, padding: 6, autoSkip: false, maxRotation: 0, callback(v) { const l = this.getLabelForValue(v); if (horizontal || l.length <= 14) return l; const out = []; let cur = ''; l.split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > 14 && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); out.push(cur); return out; } } };
      return {
        type: 'bar',
        data: {
          labels: spec.labels,
          datasets: spec.series.map((s) => ({
            label: s.name, data: s.values,
            backgroundColor: (s.colors || spec.labels.map(() => s.color)).map(C),
            borderRadius: 4, maxBarThickness: horizontal ? 26 : 52,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: horizontal ? 'y' : 'x',
          animation: reduce ? false : {
            duration: 900, easing: 'easeOutQuart',
            delay: (ctx) => (ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 70 + ctx.datasetIndex * 140 : 0),
          },
          scales: horizontal ? { x: valueAxis, y: catAxis } : { y: valueAxis, x: catAxis },
          plugins: { legend, tooltip: { ...tooltip, callbacks: { label: (c) => `${c.dataset.label}: ${nf(c.raw)}${unit}` } } },
        },
      };
    }

    if (spec.type === 'line') {
      // Progressive draw: each point appears after the previous one.
      const n = spec.labels.length;
      const total = 1600;
      const step = total / n;
      const prevY = (ctx) => ctx.index === 0 ? ctx.chart.scales.y.bottom : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;
      const progressive = reduce ? false : {
        x: { type: 'number', easing: 'linear', duration: step, from: NaN, delay(ctx) { if (ctx.type !== 'data' || ctx.xStarted) return 0; ctx.xStarted = true; return ctx.index * step; } },
        y: { type: 'number', easing: 'linear', duration: step, from: prevY, delay(ctx) { if (ctx.type !== 'data' || ctx.yStarted) return 0; ctx.yStarted = true; return ctx.index * step; } },
      };
      const upperIdx = spec.series.findIndex((s) => s.band === 'upper');
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
            pointRadius: s.band ? 0 : n > 20 ? 0 : 3.5,
            pointHoverRadius: s.band ? 0 : 5,
            tension: 0.25,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: reduce ? false : { duration: total },
          animations: progressive || undefined,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, border: { color: line }, ticks: { maxTicksLimit: 9, autoSkip: true, maxRotation: 0 } },
            y: { grid, border: { display: false }, title: { display: true, text: spec.axis, color: muted }, ticks: { callback: (v) => nf(v) + tickUnit } },
          },
          plugins: {
            legend: { ...legend, display: true, labels: { ...legend.labels, boxHeight: 3, filter: (item) => item.datasetIndex !== upperIdx } },
            tooltip: { ...tooltip, displayColors: true, filter: (item) => item.raw != null, callbacks: { label: (c) => `${c.dataset.label}: ${nf(c.raw)}${unit}` } },
          },
        },
      };
    }
    return null;
  }

  const instances = {};
  function draw(id) {
    const canvas = document.getElementById(id);
    if (!canvas || instances[id]) return;
    const cfg = config(charts[id]);
    if (cfg) instances[id] = new Chart(canvas, cfg);
  }

  const ids = Object.keys(charts);
  if (reduce || !('IntersectionObserver' in window)) {
    ids.forEach(draw);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { draw(e.target.id); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    ids.forEach((id) => { const c = document.getElementById(id); if (c) io.observe(c); });
    // Safety net: never leave an empty chart box if the observer misses one.
    setTimeout(() => ids.forEach((id) => {
      const c = document.getElementById(id);
      if (c && c.getBoundingClientRect().top < window.innerHeight) draw(id);
    }), 2500);
  }

  // Redraw in the new colours when the system theme changes.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    Object.keys(instances).forEach((id) => { instances[id].destroy(); delete instances[id]; draw(id); });
  });
})();
