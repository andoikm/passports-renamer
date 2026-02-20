import Tesseract from 'tesseract.js';

/**
 * Run OCR on an image (data URL or URL).
 * @param {string} imageSrc - Data URL or URL of the image
 * @param {(progress: number, status: string) => void} onProgress - Progress callback 0-1, status text
 * @returns {Promise<string>} - Extracted text
 */
export async function runOcr(imageSrc, onProgress) {
  const result = await Tesseract.recognize(imageSrc, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(m.progress, m.status);
      } else {
        onProgress?.(m.progress || 0, m.status || '');
      }
    },
  });
  return result.data.text;
}
