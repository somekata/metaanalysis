# SR Data Viewer

A lightweight, browser-based tool for managing and viewing systematic review data extracted from studies on *Candida auris* candidemia mortality.

No installation, no server, no dependencies — everything runs locally in the browser.

---

## Files

| File | Description |
|------|-------------|
| `sr_viewer.html` | Main viewer application |
| `template.txt` | Blank extraction template (copy this for each new study) |
| `sample.txt` | Completed example (Smith JA 2021) |

---

## Quick Start

1. Open `sr_viewer.html` in any modern browser
2. Click **＋ ファイル読込** or drag & drop one or more `.txt` files
3. Browse the table, detail view, or dashboard

---

## Extraction Format

Each study is stored as a plain `.txt` file following a structured 10-section format.

### Section overview

| # | Section | Key fields |
|---|---------|-----------|
| 1 | Study Characteristics | Author, Year, Journal, Country, Design, Setting, Article title, PMID, DOI, URL |
| 2 | Population | Sample size, Age, Sex, Inclusion/Exclusion criteria |
| 3 | Exposure / Comparison | Exposure, Comparison group, Follow-up period |
| 4 | Outcomes | Primary outcome, Secondary outcomes, Definitions |
| 5 | Results | Effect size (OR/RR/HR), 95% CI, p-value, Multivariate model |
| 6 | Meta-analysis Raw Data | **2×2 table: event.e / n.e / event.c / n.c** |
| 7 | Risk of Bias (NOS) | Selection, Comparability, Outcome |
| 8 | Confounding | Key confounders, Methods |
| 9 | GRADE | Risk of bias, Inconsistency, Indirectness, Imprecision |
| 10 | Final Assessment | Suitable for meta-analysis, Notes |

### Section 6 format (critical for meta-analysis)

```
6. Meta-analysis Relevant Raw Data

Primary outcome data (2×2 table format):

  Outcome timepoint: 30-day mortality

  C. auris group (experimental):
    event.e (deaths): 38
    n.e (total): 110

  Comparison group 1 (non-C. auris; C. albicans + other combined):
    event.c (deaths): 57
    n.c (total): 210
```

This format maps directly to the `meta` / `metafor` R package input:

```r
metabin(event.e, n.e, event.c, n.c, data = df, sm = "OR")
```

---

## Viewer Features

- **一覧表** — sortable table with key fields including `e/n (e vs c)` column
- **詳細表示** — structured field-by-field view or raw text view; PMID/DOI/URL are displayed as clickable links
- **ダッシュボード** — summary stats (N, countries, designs) and per-study 2×2 data table
- **エクスポート** — CSV / JSON / HTML export (all studies or selected rows)
- **ダーク/ライトモード** — toggle in top-right
- **Drag & drop** — load multiple `.txt` files at once

---

## Workflow

```
template.txt
    ↓  copy & fill in for each paper
StudyA.txt, StudyB.txt, ...
    ↓  drag & drop into sr_viewer.html
    ↓  export CSV/JSON for R/metafor
```

---

## License / Disclaimer

本ツールおよび同梱ファイルはAI（Claude, Anthropic）を用いて作成されました。データ抽出内容・コードには誤りが含まれる可能性があります。研究・論文執筆への使用は必ず原著論文および一次資料を参照のうえ、自己の責任において行ってください。二次利用・再配布は自己責任のもとで可能です。その際、本注記の保持を推奨します。

This tool and accompanying files were created with AI assistance (Claude, Anthropic). The content and code may contain errors. Always verify against original sources before use in research or publication. Redistribution is permitted at your own risk; retention of this notice is recommended.
