import { useCallback, useState } from 'react';
import { processFile } from './utils/processFile.js';
import { buildRenamedFilename } from './utils/parseNameSurname.js';
import { UploadZone } from './components/UploadZone.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ProgressOverlay } from './components/ProgressOverlay.jsx';
import './App.css';

export default function App() {
  const STORAGE_KEY = 'passport-renamer-pattern';

  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
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
      // If parsing fails (e.g. old non-JSON value), fall back and clear key
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return defaultPattern;
    }
  });

  const handleSavePattern = () => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
    } catch {
      // ignore quota / private-mode errors
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
      <header className="header">
        <h1>Passport PDF Renamer</h1>
        <p className="tagline">Upload passport PDFs · OCR extracts name & surname · Download using your preferred filename format</p>
      </header>

      <section className="pattern-config">
        <h2 className="pattern-title">Filename format</h2>
        <div className="pattern-row">
          <input
            className="pattern-input"
            type="text"
            placeholder="prefix (optional)"
            value={pattern.prefix}
            onChange={(e) =>
              setPattern((prev) => ({
                ...prev,
                prefix: e.target.value,
              }))
            }
          />
          <select
            className="pattern-select"
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

          <select
            className="pattern-select pattern-select--sep"
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
            <option value="">no separator</option>
          </select>

          <select
            className="pattern-select"
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

          <input
            className="pattern-input"
            type="text"
            placeholder="suffix (optional)"
            value={pattern.suffix}
            onChange={(e) =>
              setPattern((prev) => ({
                ...prev,
                suffix: e.target.value,
              }))
            }
          />
          <button
            type="button"
            className="btn-save-pattern"
            onClick={handleSavePattern}
          >
            Save format
          </button>
        </div>
        <p className="pattern-preview">
          Example:&nbsp;
          <strong>
            {buildRenamedFilename('john', 'doe', pattern)}
          </strong>
        </p>
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
        All processing runs in your browser. No files are uploaded to any server.
      </footer>
    </div>
  );
}
