# Passport PDF Renamer

Browser-only tool: upload passport PDFs, extract **name** and **surname** via OCR, and download files renamed as `name.surname.pdf`.

## Features

- **Upload**: Single or multiple PDFs; drag & drop; `.pdf` only
- **PDF → Image**: First page rendered in-browser with `pdfjs-dist`
- **OCR**: English text extraction with `tesseract.js` and progress
- **Parsing**: MRZ line (e.g. `P<ARMIVANOV<<SERGEI<<`) or "Surname" / "Given Name" labels
- **Rename**: `{name}.{surname}.pdf` (lowercase)
- **Download**: One-by-one; all processing client-side

## Tech

- React (Vite)
- pdfjs-dist
- tesseract.js

No backend; everything runs in the browser.

## Run

```bash
npm install
npm run dev
```

Then open the URL shown (e.g. http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Flow

1. Upload PDF(s)
2. First page → image
3. OCR on image
4. Parse name/surname (MRZ or labels)
5. Show preview and offer download as `name.surname.pdf`
