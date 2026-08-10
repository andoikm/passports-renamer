import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { processFile } from './utils/processFile.js';
import { generateFilename, toFilenameData } from './filename/index.js';
import { UploadZone } from './components/UploadZone.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ProgressOverlay } from './components/ProgressOverlay.jsx';
import { ThemeToggle } from './components/ThemeToggle.jsx';
import { FilenameFormatBuilder } from './components/FilenameFormatBuilder/FilenameFormatBuilder.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useFilenameConfig } from './hooks/useFilenameConfig.js';
import './App.css';

const PdfEditorModal = lazy(() =>
  import('./components/PdfEditorModal/PdfEditorModal.jsx').then((m) => ({
    default: m.PdfEditorModal,
  }))
);

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const filename = useFilenameConfig();

  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);

  const [pdfEditorOpen, setPdfEditorOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const pdfReturnFocusRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add('theme-ready');
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleFiles = useCallback(async (files) => {
    const pdfFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    setProcessing(true);
    const nextResults = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setCurrentFile(file.name);
      setProgress(0);
      setProgressStatus('Starting…');

      try {
        const result = await processFile(file, (p, status) => {
          setProgress(p);
          setProgressStatus(status || 'Processing…');
        });
        nextResults.push({
          id: `${file.name}-${i}-${Date.now()}`,
          originalName: file.name,
          file,
          ...result,
        });
      } catch (err) {
        nextResults.push({
          id: `${file.name}-${i}-${Date.now()}`,
          originalName: file.name,
          file,
          name: 'unknown',
          surname: 'unknown',
          ocrText: '',
          error: err?.message || 'Processing failed',
        });
      }
    }

    setResults((prev) => [...nextResults, ...prev]);
    setProcessing(false);
    setCurrentFile(null);
    setProgress(0);
    setProgressStatus('');
  }, []);

  const handleDownload = (result, downloadName) => {
    if (!downloadName || !result.file) return;
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildNameForResult = useCallback(
    (result) =>
      generateFilename(filename.config, toFilenameData(result), 'pdf'),
    [filename.config]
  );

  const handleViewPdf = useCallback((row, options = {}) => {
    pdfReturnFocusRef.current = options.returnFocusRef?.current ?? null;
    setSelectedRow(row);
    setPdfEditorOpen(true);
  }, []);

  const handleClosePdfEditor = useCallback(() => {
    setPdfEditorOpen(false);
    setSelectedRow(null);
  }, []);

  const handlePdfSaved = useCallback(async (payload) => {
    setResults((prev) =>
      prev.map((item) => {
        if (item.id !== payload.id) return item;
        return {
          ...item,
          name: payload.name,
          surname: payload.surname,
          file: payload.file || item.file,
        };
      })
    );
    setSelectedRow((prev) =>
      prev && prev.id === payload.id
        ? {
            ...prev,
            name: payload.name,
            surname: payload.surname,
            file: payload.file || prev.file,
          }
        : prev
    );
  }, []);

  const pdfFocusProxy = useRef({
    get current() {
      return pdfReturnFocusRef.current;
    },
  });

  return (
    <div className="app">
      <header className={`app-nav ${navScrolled ? 'app-nav--scrolled' : ''}`}>
        <div className="app-brand">
          <div className="app-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15h6M9 11h6" />
            </svg>
          </div>
          <div className="app-brand__text">
            <p className="app-brand__title">Passport Renamer</p>
            <p className="app-brand__subtitle">Client-side OCR · Private by design</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <section className="app-hero">
        <h1 className="app-hero__title">Rename passport PDFs with OCR</h1>
        <p className="app-hero__desc">
          Upload one or more passport PDFs. Names are extracted in your browser and files are ready to download in your preferred format.
        </p>
      </section>

      <FilenameFormatBuilder
        config={filename.config}
        onChange={filename.setConfig}
        onSave={filename.save}
        onReset={filename.resetToDefault}
        saving={filename.saving}
        savedFlash={filename.savedFlash}
        dirty={filename.dirty}
        issues={filename.issues}
        hasErrors={filename.hasErrors}
      />

      <UploadZone onFiles={handleFiles} accept=".pdf" disabled={processing} />

      {processing && (
        <ProgressOverlay
          fileName={currentFile}
          progress={progress}
          status={progressStatus}
        />
      )}

      {results.length > 0 && (
        <ResultsTable
          results={results}
          onDownload={handleDownload}
          buildFilename={buildNameForResult}
          onViewPdf={handleViewPdf}
        />
      )}

      <Suspense fallback={null}>
        <PdfEditorModal
          open={pdfEditorOpen}
          row={selectedRow}
          onClose={handleClosePdfEditor}
          onSaved={handlePdfSaved}
          returnFocusRef={pdfFocusProxy}
        />
      </Suspense>

      <footer className="footer">
        <span className="footer__lock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          All processing runs in your browser. No files are uploaded to any server.
        </span>
      </footer>
    </div>
  );
}
