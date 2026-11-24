// Renders build/cv.html to the downloadable PDF. Run: node build/cv.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'cv.html'));
  await p.pdf({ path: path.join(__dirname, '..', 'assets', 'Julieta-Lara-Romero-CV.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
