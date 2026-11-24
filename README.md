# Julieta Lara Romero, portfolio

CX & Data Analyst portfolio, in English with Dutch (`/nl`), European Portuguese (`/pt`) and Spanish (`/es`) versions. Served as a static site on GitHub Pages.

## Structure

- `index.html`, `about.html`, `projects.html`, `projects/*.html`: generated English pages. Translations live in `nl/`, `pt/` and `es/`.
- `assets/`: stylesheet, scripts, favicon and the downloadable CV (PDF).
- `design/`: the previous design portfolio (Multimedia Engineering work), linked as earlier work.
- `build/`: the generator. Do not edit the generated HTML by hand.

## Editing

Text lives in `build/content/{en,nl,pt,es}.mjs`. Contact details and the LinkedIn URL are in `CONFIG` at the top of `build/build.mjs`. After any change:

```bash
node build/build.mjs
```

To regenerate the CV PDF after editing `build/cv.html` (needs Playwright):

```bash
node build/cv.cjs
```

The six projects are practice case studies. Their data is synthetic and generated from a fixed seed in `build/data.mjs`, so the numbers in the text always match the charts.
