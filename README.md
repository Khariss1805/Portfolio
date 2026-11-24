# Julieta Lara Romero, portfolio

Data Analyst and UX/UI Designer portfolio, in English with Dutch (`/nl`), European Portuguese (`/pt`) and Spanish (`/es`) versions. Served as a static site on GitHub Pages.

## Structure

- `index.html`, `about.html`, `projects.html`, `projects/*.html`: generated English pages. Translations live in `nl/`, `pt/` and `es/`.
- `assets/`: stylesheet, scripts, favicon, the CV (PDF) and `excel/`, one Excel workbook per project.
- `resume.html`: the CV as a web page (from `build/cv.html`), with a PDF download button.
- `design/`: the previous design portfolio (Multimedia Engineering work), linked as earlier work.
- `build/`: the generator. Do not edit the generated HTML by hand.

## Editing

Text lives in `build/content/{en,nl,pt,es}.mjs`. Contact details (email and LinkedIn) are in `CONFIG` at the top of `build/build.mjs`. Motion (scroll reveal, count-up numbers, chart drawing) lives in `assets/site.js`, `assets/charts.js` and the Motion section of `assets/site.css`; all of it respects reduced-motion settings. After any change:

```bash
node build/build.mjs
```

The build also writes `assets/excel/<project>.xlsx` (formulas, conditional formatting and charts) from `build/workbooks.mjs` when Python 3 and `openpyxl` are installed (`pip install openpyxl`). Each project page shows an Excel-style preview of the same workbook. To show your own workbook instead, add it to `excel` in `CONFIG` (`build/build.mjs`): either `file` (your own .xlsx in `assets/excel/`) or `embed` (an embed link from Excel for the web / OneDrive).

To regenerate the CV PDF after editing `build/cv.html` (needs Playwright):

```bash
node build/cv.cjs
```

The six projects are practice case studies. Their data is synthetic and generated from a fixed seed in `build/data.mjs`, so the numbers in the text always match the charts.
