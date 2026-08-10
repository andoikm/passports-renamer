import { useCallback, useState } from 'react';

export function UploadZone({ onFiles, accept = '.pdf', disabled }) {
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      if (disabled) return;
      const files = e.dataTransfer?.files;
      if (files?.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDrag(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
  }, []);

  const handleChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files?.length) onFiles(files);
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <section className="upload-zone" aria-label="Upload passport PDFs">
      <label
        className={`upload-label ${drag ? 'upload-label--drag' : ''} ${disabled ? 'upload-label--disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="upload-input"
          aria-label="Choose PDF files"
        />
        <span className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <span className="upload-text">
          {drag ? 'Drop PDFs to process' : disabled ? 'Processing files…' : 'Drag & drop passport PDFs'}
        </span>
        <span className="upload-hint">
          {disabled ? 'Please wait until the current batch finishes' : 'or click to browse · PDF only · multiple files supported'}
        </span>
        <span className="upload-badge">PDF</span>
      </label>
    </section>
  );
}
