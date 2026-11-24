// Project filters on the projects page. Without JavaScript every project is shown.
(function () {
  const group = document.querySelector('.filters');
  const list = document.getElementById('proj-list');
  if (!group || !list) return;
  group.hidden = false;
  const buttons = group.querySelectorAll('button');
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const f = btn.dataset.filter;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    list.querySelectorAll('.proj').forEach((row) => {
      row.hidden = f !== 'all' && row.dataset.cat !== f;
    });
  });
})();
