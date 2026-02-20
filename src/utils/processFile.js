import { pdfFirstPageToImage } from './pdfToImage.js';
import { runOcr } from './ocr.js';
import { extractNameSurname } from './parseNameSurname.js';

/**
 * Process a single passport PDF: first page → image → OCR → parse name/surname.
 * @param {File} file - PDF file
 * @param {(progress: number, status: string) => void} onProgress - 0-1, status text
 * @returns {Promise<{ name: string, surname: string, ocrText: string }>}
 */
export async function processFile(file, onProgress) {
  onProgress?.(0, 'Loading PDF…');
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(0.15, 'Converting to image…');
  const imageDataUrl = await pdfFirstPageToImage(arrayBuffer);
  onProgress?.(0.25, 'Running OCR…');
  const ocrText = await runOcr(imageDataUrl, (p, status) => {
    onProgress?.(0.25 + p * 0.7, status);
  });
  onProgress?.(0.95, 'Parsing name & surname…');
  const { name, surname } = extractNameSurname(ocrText);
  onProgress?.(1, 'Done');
  return { name, surname, ocrText };
}
