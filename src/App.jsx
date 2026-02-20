import { useCallback, useState } from 'react';
import { processFile } from './utils/processFile.js';
import { buildRenamedFilename } from './utils/parseNameSurname.js';
import { UploadZone } from './components/UploadZone.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ProgressOverlay } from './components/ProgressOverlay.jsx';
import './App.css';

export default function App() {
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

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
          downloadName: buildRenamedFilename(result.name, result.surname),
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
          downloadName: null,
        });
      }
    }

    setResults((prev) => [...nextResults, ...prev]);
    setProcessing(false);
    setCurrentFile(null);
    setProgress(0);
    setProgressStatus('');
  }, []);

  const handleDownload = (result) => {
    if (!result.downloadName || !result.file) return;
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Passport PDF Renamer</h1>
        <p className="tagline">Upload passport PDFs · OCR extracts name & surname · Download as name.surname.pdf</p>
      </header>

      <UploadZone onFiles={handleFiles} accept=".pdf" disabled={processing} />

      {processing && (
        <ProgressOverlay
          fileName={currentFile}
          progress={progress}
          status={progressStatus}
        />
      )}

      {results.length > 0 && (
        <ResultsTable results={results} onDownload={handleDownload} />
      )}

      <footer className="footer">
        All processing runs in your browser. No files are uploaded to any server.
      </footer>
    </div>
  );
}
