import * as pdfjsLib from 'pdfjs-dist';
// Vite: resolve worker from node_modules and get URL for browser
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Renders the first page of a PDF to a PNG data URL (for OCR).
 * @param {ArrayBuffer} arrayBuffer - PDF file content
 * @returns {Promise<string>} - Data URL of the first page image
 */
export async function pdfFirstPageToImage(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/png');
}
