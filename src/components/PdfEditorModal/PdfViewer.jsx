import { useEffect, useRef, useState } from 'react';
import { openPdfDocument } from '../../pdf/pdfDocument.js';

/**
 * Renders PDF pages with the existing pdfjs-dist dependency.
 * Does not edit the PDF — viewing only. Future field overlays can
 * mount on top of `.pdf-viewer__page` without changing the table/modal API.
 */
export function PdfViewer({ bytes, className = '' }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!bytes) return undefined;

    let cancelled = false;
    /** @type {import('pdfjs-dist').PDFDocumentProxy | null} */
    let pdf = null;
    const canvases = [];

    async function render() {
      setRendering(true);
      setError(null);
      const host = containerRef.current;
      if (host) host.replaceChildren();

      try {
        pdf = await openPdfDocument(bytes);
        if (cancelled) return;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const width = host?.clientWidth || 720;
          const scale = Math.min(2, Math.max(0.8, (width - 16) / baseViewport.width));
          const viewport = page.getViewport({ scale });

          const wrap = document.createElement('div');
          wrap.className = 'pdf-viewer__page';
          wrap.dataset.page = String(pageNum);

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `PDF page ${pageNum}`);

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error('Canvas is unavailable');

          wrap.appendChild(canvas);
          host?.appendChild(wrap);
          canvases.push(canvas);

          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to render PDF');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    render();

    return () => {
      cancelled = true;
      if (pdf) {
        pdf.destroy().catch(() => {});
      }
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
  }, [bytes]);

  return (
    <div className={`pdf-viewer ${className}`.trim()}>
      {rendering && (
        <div className="pdf-viewer__status" role="status">
          <span className="ui-spinner" aria-hidden="true" />
          Rendering pages…
        </div>
      )}
      {error && (
        <div className="pdf-viewer__error" role="alert">
          {error}
        </div>
      )}
      <div ref={containerRef} className="pdf-viewer__pages" />
    </div>
  );
}
