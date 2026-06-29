# TES Quiz

A configurable quiz/assessment application built with vanilla JavaScript
and HTML, served via **GitHub Pages**. No build tools or frameworks required.

---

## Features

| Feature | Detail |
|---------|--------|
| **YAML-driven content** | Questions, scoring rules, and page text are all edited in plain YAML files — no code changes needed |
| **Multi-vertical scoring** | Define as many assessment dimensions as you like (e.g. Leadership, Technical, Communication) |
| **PDF report** | Generates a formatted A4 PDF with scores, levels, and descriptions |
| **Single-page app** | Pure HTML + JS + CDN libraries; works on any static host |
| **Responsive UI** | Mobile-friendly design |

---

## Project structure

```
tes-quiz/
├── index.html            ← Entry point
├── css/
│   └── style.css         ← Styling
├── js/
│   └── app.js            ← Application logic
├── config/
│   ├── config.yaml       ← Page title, labels, footer
│   ├── questions.yaml    ← Quiz questions
│   └── scoring.yaml      ← Verticals and score levels
└── .nojekyll             ← Disables Jekyll on GitHub Pages
```

---

## Configuration

All customisation is done through the three YAML files in `config/`.

### `config/config.yaml` — Page text

```yaml
title:          "My Assessment"
subtitle:       "Find your strengths"
description:    "Answer honestly for best results."
welcome_button: "Begin"
results_title:  "Your Results"
pdf_button:     "📄 Download PDF"
footer:         "Results are confidential."
```

### `config/questions.yaml` — Questions

```yaml
questions:
  - id: q1                   # unique ID (string)
    vertical: leadership     # must match an id in scoring.yaml
    text: "Your question here?"
    options:
      - { text: "Rarely",    value: 1 }
      - { text: "Sometimes", value: 2 }
      - { text: "Often",     value: 3 }
      - { text: "Always",    value: 4 }
```

### `config/scoring.yaml` — Verticals & levels

```yaml
verticals:
  - id: leadership
    name: "Leadership"
    max_score: 16          # total possible score for this vertical

    levels:
      - min: 4
        max: 7
        label: "Developing"
        description: "Feedback shown to the user."
      - min: 8
        max: 11
        label: "Competent"
        description: "..."
      - min: 12
        max: 16
        label: "Proficient"
        description: "..."
```

Level label keywords control the colour displayed in the UI and PDF:

| Colour | Keywords in label |
|--------|-------------------|
| 🔴 Red | `begin`, `develop`, `emerg`, `basic`, `found` |
| 🟠 Orange | *(anything else — default)* |
| 🟢 Green | `profic`, `advanc`, `expert`, `master`, `excel` |

---

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Under *Build and deployment*, set **Source** to *Deploy from a branch*,
   choose `main` (or your default branch) and the `/ (root)` folder.
4. Click **Save**. Your quiz will be available at
   `https://<your-username>.github.io/<repo-name>/` within a minute.

> The `.nojekyll` file at the root disables Jekyll processing so that
> directories starting with `_` and all YAML files are served correctly.

---

## CDN dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [js-yaml](https://github.com/nodeca/js-yaml) | 4.1.0 | Parse YAML config files |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Generate the PDF report |

Both are loaded from the Cloudflare CDN. The `<script>` tags in `index.html` include
`integrity` (SHA-512 SRI) hashes so browsers verify the files have not been tampered with.