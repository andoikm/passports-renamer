# Project Documentation Analysis

## 1. Executive Summary

**Passport PDF Renamer** is a browser-only React (Vite) app that accepts passport PDF uploads, renders the first page with `pdfjs-dist`, runs English OCR with `tesseract.js`, extracts name/surname (MRZ first, then label fields), and lets the user download the original PDF under a renamed filename.

Documentation consists of a single file, `README.md`. It correctly describes the core pipeline and stack, but it is **incomplete relative to the current UI/code**: configurable filename patterns (order, separator, prefix/suffix, `localStorage` persistence), failure/unknown handling, and several parsing/sanitization behaviors are implemented but not documented. There is no architecture doc, contributing guide, license, or test documentation.

## 2. Files Analyzed

| File | Purpose |
|------|---------|
| `README.md` | Sole project documentation: purpose, features, tech stack, run/build commands, and high-level processing flow |

**Note:** No other `.md` files existed in the repository at analysis time (no `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, architecture notes, etc.). Conclusions about missing docs are relative to this single source plus inspection of the implementation for context.

## 3. Project Understanding

### Purpose (from `README.md`)

Upload passport PDFs, extract **name** and **surname** via OCR, and download files renamed for convenience. All processing is client-side; no backend.

### Architecture (from code; partially reflected in docs)

```
UploadZone → App.handleFiles → processFile
  → pdfFirstPageToImage (pdfjs-dist, page 1 @ scale 2)
  → runOcr (tesseract.js, lang: eng)
  → extractNameSurname (MRZ → labels → unknown)
→ ResultsTable + per-row Download (Object URL of original File)
```

| Area | Location | Role |
|------|----------|------|
| UI shell / pattern config | `src/App.jsx` | Upload orchestration, filename pattern UI + `localStorage`, download |
| Upload | `src/components/UploadZone.jsx` | Drag/drop + file picker, `.pdf` only, multiple |
| Progress | `src/components/ProgressOverlay.jsx` | Per-file progress bar/status |
| Results | `src/components/ResultsTable.jsx` | Table of parsed names + download button |
| Pipeline | `src/utils/processFile.js` | End-to-end PDF → OCR → parse |
| PDF render | `src/utils/pdfToImage.js` | First page → PNG data URL |
| OCR | `src/utils/ocr.js` | Tesseract `eng` recognition |
| Parse / rename | `src/utils/parseNameSurname.js` | MRZ + label parsing; `buildRenamedFilename` |
| Sample PDFs | `src/passports/*.pdf` | Local sample inputs (not mentioned in README) |

### Workflow (documented vs implemented)

`README.md` → **Flow**:

1. Upload PDF(s)
2. First page → image
3. OCR on image
4. Parse name/surname (MRZ or labels)
5. Show preview and offer download as `name.surname.pdf`

Implemented additions not in that flow:

- Configurable filename format (left/right part = first/last, separator `.`/`_`/`-`/none, optional prefix/suffix)
- Persist pattern under `localStorage` key `passport-renamer-pattern` via **Save format**
- Sequential multi-file processing with progress overlay
- Error rows (`error` message) and `unknown` name/surname fallbacks
- Filename sanitization (lowercase; strip non `[a-z0-9._-]`)

### Important concepts (code-backed)

- **MRZ priority:** `extractNameSurname` tries MRZ (`P<…SURNAME<<GIVEN…`) before label fields (`Surname` / `Given Name` / `First Name`).
- **MRZ given name:** only the **first** given-name token is kept (`split(/\s+/)[0]`).
- **First page only:** multi-page PDFs (e.g. sample `DURAIRAJ.MUTHUKUMAR.pdf` has 2 pages) only contribute page 1 to OCR.
- **Download:** original `File` bytes are re-downloaded under the new name; content is not rewritten.

## 4. Key Requirements

Extracted from `README.md` (functional / technical). Items marked **(code)** are evidenced in implementation but not stated in Markdown.

### Functional

- Accept single or multiple PDF uploads; drag & drop; `.pdf` only (`README.md` → Features)
- Render first PDF page in-browser (`README.md` → Features / Flow)
- OCR English text with progress (`README.md` → Features)
- Parse via MRZ or Surname / Given Name labels (`README.md` → Features)
- Rename/download as lowercase `name.surname.pdf` (`README.md` → Features / Flow) — **partially superseded by code** (see Inconsistencies)
- Client-side only; no server upload (`README.md` → Tech; UI footer)

### Technical

- Stack: React (Vite), `pdfjs-dist`, `tesseract.js` (`README.md` → Tech)
- Scripts: `npm install`, `npm run dev`, `npm run build`, `npm run preview` (`README.md` → Run / Build)
- **(code)** Default rename pattern: `firstName.lastName.pdf` via `buildRenamedFilename`
- **(code)** OCR language fixed to `eng`
- **(code)** PDF worker configured for Vite (`pdf.worker.min.mjs?url`)

## 5. Inconsistencies

### 5.1 Fixed rename format vs configurable pattern

* **File(s):** `README.md` → Features (“Rename”), Flow step 5; vs `src/App.jsx`, `src/utils/parseNameSurname.js` → `buildRenamedFilename`
* **Relevant section:** Features / Flow vs Filename format UI
* **Problem:** README states rename is `{name}.{surname}.pdf` (lowercase). The app defaults closer to `firstName.lastName.pdf` and allows reordering, separators, prefix/suffix, and saving the pattern.
* **Recommended resolution:** Update README Features and Flow to describe the configurable format and that the default is `firstname.lastname.pdf`. Mention optional persistence via **Save format**.

### 5.2 Package / product naming mismatch

* **File(s):** `README.md` (title “Passport PDF Renamer”); `package.json` (`"name": "document-parser"`); repository name `passports-renamer`
* **Relevant section:** README title vs `package.json` `name`
* **Problem:** Three different identifiers for the same project. Not a contradiction inside Markdown alone, but Markdown does not acknowledge the npm package name.
* **Recommended resolution:** Align `package.json` `name` with the product/repo name, or document the package name if it must differ.

### 5.3 Download behavior wording

* **File(s):** `README.md` → Features (“Download: One-by-one”)
* **Relevant section:** Features
* **Problem:** Accurate for per-row downloads, but “one-by-one” could be read as sequential processing only. Processing is sequential; downloads are per-result and independent. No batch download exists (undocumented either way).
* **Recommended resolution:** Clarify “per-file download from results table; no zip/batch download.”

### 5.4 Cross-doc contradictions

* **File(s):** N/A (only one Markdown file)
* **Problem:** No Markdown-to-Markdown contradictions exist.
* **Recommended resolution:** None for inter-doc conflicts; focus on README ↔ code alignment.

## 6. Missing Information

Documentation gaps relative to the implemented product and typical project needs:

1. **Filename pattern UI** — order, separators, prefix/suffix, live example, **Save format** / `localStorage` (`App.jsx`).
2. **Parsing details** — MRZ takes only first given name; label fallbacks; `unknown` when parse fails; sanitization removes spaces/special characters (e.g. multi-part given names collapse).
3. **Error / unknown UX** — failed processing rows; visual treatment for unknown names (`ResultsTable.jsx`).
4. **Limitations** — English OCR only; first page only; OCR accuracy depends on scan quality; no image upload; no manual name edit before download (assumption: not implemented — confirmed by UI code).
5. **Sample assets** — `src/passports/` PDFs exist but are undocumented (purpose, whether they are fixtures, PII sensitivity).
6. **Browser / environment requirements** — modern browser with WebAssembly/canvas; no Node version constraint documented.
7. **Network behavior** — Tesseract may fetch worker/language data at runtime; README says “no files uploaded” but does not discuss third-party asset loading.
8. **Project structure / architecture** — no map of `src/components` vs `src/utils`.
9. **Testing** — no test suite or how-to-verify section (manual checklist with sample PDFs would help).
10. **License, contributing, security/privacy policy** — absent.
11. **Results table columns** — “Original file” and “Initial file name” both show `originalName` (`ResultsTable.jsx`); undocumented and redundant (implementation smell affecting user-facing clarity).

## 7. Outdated or Questionable Information

| Item | Why questionable | Evidence |
|------|------------------|----------|
| Rename always `name.surname.pdf` | UI/code support configurable patterns; default is first.then.last | `App.jsx` pattern config; `buildRenamedFilename` |
| Flow step 5 “offer download as `name.surname.pdf`” | Same as above; also omits results table / progress | `ResultsTable.jsx`, `ProgressOverlay.jsx` |
| Feature list completeness | Omits pattern config, persistence, error states | `App.jsx` |
| Implied completeness of “Parsing” | Example MRZ is fine, but behavior for multi-given names / failed OCR is unspecified | `parseNameSurname.js` |
| Sample PDFs in repo | Not referenced; may include personal passport data — **privacy concern** if published | `src/passports/*.pdf` filenames suggest real-looking names |

**Assumption (not a documented fact):** sample PDFs may be real or synthetic; documentation should state which and whether they should be committed.

## 8. TODOs and Open Questions

### TODOs in Markdown / source

- No `TODO` / `FIXME` / `XXX` markers found in project source or `README.md`.

### Open questions (need clarification)

1. Is the **intended** public rename format still fixed `name.surname.pdf`, or is the configurable pattern the source of truth?
2. Should `package.json` `name` be `passports-renamer` / `passport-pdf-renamer` instead of `document-parser`?
3. Are `src/passports/*.pdf` meant as fixtures, demos, or private samples? Should they be gitignored?
4. Is batch download / zip export planned?
5. Is manual correction of OCR-extracted names in the UI planned?
6. Should OCR support languages other than English?
7. Is processing non-first pages or image inputs in scope?
8. Duplicate ResultsTable columns: intentional or leftover from a UI rename?

### Assumptions made for this analysis

- README is intended as the primary (only) user-facing doc.
- Implementation in `src/` is the current product behavior to compare against docs.
- Absence of other `.md` files means architecture/requirements live only in README + code comments.

## 9. Recommendations

### High Priority

1. **Update `README.md` Features and Flow** to match configurable filename format and default `firstname.lastname.pdf`.
2. **Document privacy posture clearly:** client-side processing; whether sample PDFs contain sensitive data; recommend not committing real passports if applicable.
3. **Clarify OCR/network caveat:** no passport files leave the browser, but OCR runtime assets may be loaded from the network.

### Medium Priority

4. Document parsing rules (MRZ priority, first given name only, sanitization, `unknown` fallback).
5. Document limitations (English only, first page only, sequential processing).
6. Align or explain `package.json` `"name": "document-parser"`.
7. Add a short “Project structure” section pointing at `src/components` and `src/utils`.
8. Fix or explain duplicate ResultsTable columns (“Original file” vs “Initial file name”).

### Low Priority

9. Add manual test checklist using sample PDFs (after clarifying sample status).
10. Add LICENSE / CONTRIBUTING if the repo is public.
11. Mention Vite default URL caveat (`http://localhost:5173`) as example only — already present; keep as-is.
12. Consider `CHANGELOG.md` after the filename-pattern feature if releases matter.

## 10. Suggested Next Steps

1. Decide source of truth for rename format (fixed vs configurable) and update `README.md` accordingly.
2. Decide fate of `src/passports/` (document as fixtures, replace with synthetic samples, or remove from VCS).
3. Patch README: Features, Flow, Limitations, Privacy.
4. Optionally add a brief Architecture subsection listing the pipeline modules.
5. Resolve UI duplicate column and package name alignment as small follow-ups.
6. Keep this `ANALYSIS.md` updated when README or major behavior changes.

---

### Analysis metadata

- **Markdown files reviewed:** `README.md` (only project `.md` file found)
- **Code inspected for context (not Markdown):** `package.json`, `vite.config.js`, `index.html`, `src/App.jsx`, `src/main.jsx`, `src/components/*`, `src/utils/*`, `src/passports/*` (file presence/types), `.gitignore`
- **Change to `ANALYSIS.md`:** **Created** (new file; no prior version to preserve)
