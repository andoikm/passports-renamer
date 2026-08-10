import { useCallback, useEffect, useState } from 'react';
import { processFile } from './utils/processFile.js';
import { buildRenamedFilename } from './utils/parseNameSurname.js';
import { UploadZone } from './components/UploadZone.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ProgressOverlay } from './components/ProgressOverlay.jsx';
import { ThemeToggle } from './components/ThemeToggle.jsx';
import { Button } from './components/ui/Button.jsx';
import { useTheme } from './hooks/useTheme.js';
import './App.css';

export default function App() {
  const STORAGE_KEY = 'passport-renamer-pattern';
  const { theme, toggleTheme } = useTheme();

  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [savingPattern, setSavingPattern] = useState(false);
  const [patternSaved, setPatternSaved] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const defaultPattern = {
    left: 'first',
    sep: '.',
    right: 'last',
    prefix: '',
    suffix: '',
  };

  const [pattern, setPattern] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultPattern;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultPattern;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultPattern;
      return {
        ...defaultPattern,
        ...parsed,
      };
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return defaultPattern;
    }
  });

  useEffect(() => {
    document.documentElement.classList.add('theme-ready');
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSavePattern = async () => {
    if (savingPattern) return;
    setSavingPattern(true);
    setPatternSaved(false);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
      }
      // Brief loading state so the button feedback is perceptible
      await new Promise((r) => setTimeout(r, 280));
      setPatternSaved(true);
      window.setTimeout(() => setPatternSaved(false), 2000);
    } catch {
      // ignore quota / private-mode errors
    } finally {
      setSavingPattern(false);
    }
  };

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

      <section className="pattern-config ui-card" aria-labelledby="pattern-heading">
        <div className="pattern-config__header">
          <div>
            <h2 id="pattern-heading" className="pattern-title">Filename format</h2>
            <p className="pattern-subtitle">Choose how first and last names appear in the download name.</p>
          </div>
        </div>

        <div className="pattern-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="pattern-prefix">Prefix</label>
            <input
              id="pattern-prefix"
              className="ui-input"
              type="text"
              placeholder="optional"
              value={pattern.prefix}
              onChange={(e) =>
                setPattern((prev) => ({
                  ...prev,
                  prefix: e.target.value,
                }))
              }
            />
          </div>

          <div className="ui-field">
            <label className="ui-label" htmlFor="pattern-left">Left part</label>
            <select
              id="pattern-left"
              className="ui-select"
              value={pattern.left}
              onChange={(e) =>
                setPattern((prev) => ({
                  ...prev,
                  left: e.target.value,
                }))
              }
            >
              <option value="first">firstName</option>
              <option value="last">lastName</option>
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label" htmlFor="pattern-sep">Separator</label>
            <select
              id="pattern-sep"
              className="ui-select"
              value={pattern.sep}
              onChange={(e) =>
                setPattern((prev) => ({
                  ...prev,
                  sep: e.target.value,
                }))
              }
            >
              <option value=".">.</option>
              <option value="_">_</option>
              <option value="-">-</option>
              <option value="">none</option>
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label" htmlFor="pattern-right">Right part</label>
            <select
              id="pattern-right"
              className="ui-select"
              value={pattern.right}
              onChange={(e) =>
                setPattern((prev) => ({
                  ...prev,
                  right: e.target.value,
                }))
              }
            >
              <option value="first">firstName</option>
              <option value="last">lastName</option>
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label" htmlFor="pattern-suffix">Suffix</label>
            <input
              id="pattern-suffix"
              className="ui-input"
              type="text"
              placeholder="optional"
              value={pattern.suffix}
              onChange={(e) =>
                setPattern((prev) => ({
                  ...prev,
                  suffix: e.target.value,
                }))
              }
            />
          </div>

          <div className="pattern-actions">
            <Button
              variant="secondary"
              onClick={handleSavePattern}
              loading={savingPattern}
              aria-label="Save filename format"
            >
              Save format
            </Button>
          </div>
        </div>

        <div className="pattern-preview" aria-live="polite">
          <span className="pattern-preview__label">Example</span>
          <code className="pattern-preview__value">
            {buildRenamedFilename('john', 'doe', pattern)}
          </code>
          {patternSaved && <span className="pattern-saved">Saved</span>}
        </div>
      </section>

      <UploadZone onFiles={handleFiles} accept=".pdf" disabled={processing} />

      {processing && (
        <ProgressOverlay
          fileName={currentFile}
          progress={progress}
          status={progressStatus}
        />
      )}

      {results.length > 0 && (
        <ResultsTable results={results} onDownload={handleDownload} pattern={pattern} />
      )}

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
