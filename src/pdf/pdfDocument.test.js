import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { inspectPdfFormFields, readPdfBytes } from './pdfDocument.js';
import { applyAcroFormValues } from './applyAcroFormValues.js';

async function createFlatPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Flat passport scan', { x: 40, y: 100, size: 14, font });
  return new Uint8Array(await doc.save());
}

async function createAcroFormPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const form = doc.getForm();
  const first = form.createTextField('firstName');
  first.setText('Ada');
  first.addToPage(page, { x: 40, y: 120, width: 160, height: 24 });
  const last = form.createTextField('lastName');
  last.setText('Lovelace');
  last.addToPage(page, { x: 40, y: 80, width: 160, height: 24 });
  return new Uint8Array(await doc.save());
}

describe('pdfDocument inspect', () => {
  it('detects flat PDFs as having no AcroForm fields', async () => {
    const bytes = await createFlatPdf();
    const info = await inspectPdfFormFields(bytes);
    expect(info.hasAcroForm).toBe(false);
    expect(info.fields).toEqual([]);
    expect(info.pageCount).toBe(1);
  });

  it('detects AcroForm text fields', async () => {
    const bytes = await createAcroFormPdf();
    const info = await inspectPdfFormFields(bytes);
    expect(info.hasAcroForm).toBe(true);
    const names = info.fields.map((f) => f.name).sort();
    expect(names).toEqual(['firstName', 'lastName']);
  });
});

describe('applyAcroFormValues', () => {
  it('writes updated field values into a new PDF', async () => {
    const original = await createAcroFormPdf();
    const updated = await applyAcroFormValues(original, {
      firstName: 'Grace',
      lastName: 'Hopper',
    });

    const doc = await PDFDocument.load(updated);
    const form = doc.getForm();
    expect(form.getTextField('firstName').getText()).toBe('Grace');
    expect(form.getTextField('lastName').getText()).toBe('Hopper');
  });
});

describe('readPdfBytes', () => {
  it('copies Uint8Array input', async () => {
    const src = new Uint8Array([1, 2, 3]);
    const out = await readPdfBytes(src);
    expect(out).toEqual(src);
    expect(out).not.toBe(src);
  });
});
