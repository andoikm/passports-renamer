/**
 * Apply AcroForm field values and return a new PDF bytes array.
 * Uses pdf-lib because pdf.js cannot serialize form updates.
 *
 * Why pdf-lib: existing pdfjs-dist only renders/reads PDFs; writing
 * updated AcroForm values requires a PDF writer. pdf-lib is ~small,
 * tree-shakeable for this path, and lazy-loaded only when saving forms.
 *
 * @param {Uint8Array} originalBytes
 * @param {Record<string, string>} values
 * @returns {Promise<Uint8Array>}
 */
export async function applyAcroFormValues(originalBytes, values) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(originalBytes.slice(), {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const name = field.getName();
    if (!(name in values)) continue;
    const next = values[name] ?? '';

    const ctor = field.constructor?.name || '';
    try {
      if (ctor.includes('TextField') || typeof /** @type {{ setText?: Function }} */ (field).setText === 'function') {
        /** @type {{ setText: (v: string) => void }} */ (field).setText(String(next));
      } else if (
        ctor.includes('CheckBox') ||
        typeof /** @type {{ check?: Function, uncheck?: Function }} */ (field).check === 'function'
      ) {
        const checked = /^(true|1|yes|on|checked)$/i.test(String(next).trim());
        const box = /** @type {{ check: () => void, uncheck: () => void }} */ (field);
        if (checked) box.check();
        else box.uncheck();
      } else if (
        ctor.includes('Dropdown') ||
        typeof /** @type {{ select?: Function }} */ (field).select === 'function'
      ) {
        /** @type {{ select: (v: string) => void }} */ (field).select(String(next));
      }
    } catch (err) {
      console.warn(`[pdf] Could not update field "${name}"`, err);
    }
  }

  const saved = await pdfDoc.save({ updateFieldAppearances: true });
  return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
}
