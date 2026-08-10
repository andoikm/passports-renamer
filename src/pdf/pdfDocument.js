/**
 * @typedef {{
 *   name: string,
 *   type: string,
 *   value: string,
 *   readOnly?: boolean,
 *   pageIndex?: number,
 * }} PdfFormField
 */

import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

/**
 * Ensure pdf.js worker is configured. In the browser we load the Vite URL;
 * in Node/tests the host (vitest.setup) should set workerSrc first.
 */
export async function ensurePdfWorker() {
  if (workerConfigured || pdfjsLib.GlobalWorkerOptions.workerSrc) {
    workerConfigured = true;
    return;
  }
  if (typeof window !== 'undefined') {
    const mod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = mod.default;
  }
  workerConfigured = true;
}

/**
 * @param {File | Blob | ArrayBuffer | Uint8Array} source
 * @returns {Promise<Uint8Array>}
 */
export async function readPdfBytes(source) {
  if (source instanceof Uint8Array) {
    return source.slice();
  }
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source.slice(0));
  }
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    const buffer = await source.arrayBuffer();
    return new Uint8Array(buffer);
  }
  throw new Error('Unsupported PDF source');
}

/**
 * Inspect a PDF for AcroForm/Widget fields using pdf.js (read-only).
 * @param {Uint8Array} bytes
 * @returns {Promise<{ pageCount: number, fields: PdfFormField[], hasAcroForm: boolean }>}
 */
export async function inspectPdfFormFields(bytes) {
  await ensurePdfWorker();
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  /** @type {Map<string, PdfFormField>} */
  const byName = new Map();
  const pageCount = pdf.numPages;

  try {
    // Prefer getFieldObjects when available (pdf.js ≥3)
    if (typeof pdf.getFieldObjects === 'function') {
      const objects = await pdf.getFieldObjects();
      if (objects && typeof objects === 'object') {
        for (const [name, entries] of Object.entries(objects)) {
          const first = Array.isArray(entries) ? entries[0] : entries;
          if (!first) continue;
          byName.set(name, {
            name,
            type: String(first.type || first.fieldType || 'text'),
            value: fieldValueToString(first.value ?? first.fieldValue ?? ''),
            readOnly: Boolean(first.readOnly),
            pageIndex: typeof first.page === 'number' ? first.page : undefined,
          });
        }
      }
    }

    if (byName.size === 0) {
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const annotations = await page.getAnnotations();
        for (const ann of annotations) {
          if (ann.subtype !== 'Widget' || !ann.fieldName) continue;
          if (byName.has(ann.fieldName)) continue;
          byName.set(ann.fieldName, {
            name: ann.fieldName,
            type: String(ann.fieldType || 'Tx'),
            value: fieldValueToString(ann.fieldValue ?? ''),
            readOnly: Boolean(ann.readOnly),
            pageIndex: i - 1,
          });
        }
      }
    }
  } finally {
    await pdf.destroy();
  }

  const fields = Array.from(byName.values());
  return {
    pageCount,
    fields,
    hasAcroForm: fields.length > 0,
  };
}

/**
 * @param {unknown} value
 */
function fieldValueToString(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}

/**
 * Open a pdf.js document from bytes (caller must destroy).
 * @param {Uint8Array} bytes
 */
export async function openPdfDocument(bytes) {
  await ensurePdfWorker();
  return pdfjsLib.getDocument({ data: bytes.slice() }).promise;
}
