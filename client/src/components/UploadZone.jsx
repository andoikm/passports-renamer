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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(true);
  }, []);

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
    <section className="upload-zone">
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
        />
        <span className="upload-icon">PDF</span>
        <span className="upload-text">{drag ? 'Drop PDFs here' : 'Drag & drop passport PDFs or click to browse'}</span>
        <span className="upload-hint">Accepts .pdf only</span>
      </label>
    </section>
  );
}

