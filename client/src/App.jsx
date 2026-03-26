import { useCallback, useEffect, useState } from 'react';
import { getMe, login, register, logout } from './auth/api.js';
import { processFile } from './utils/processFile.js';
import { buildRenamedFilename } from './utils/parseNameSurname.js';
import { UploadZone } from './components/UploadZone.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ProgressOverlay } from './components/ProgressOverlay.jsx';
import './App.css';

export default function App() {
  const STORAGE_KEY = 'passport-renamer-pattern';

  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authed' | 'unauth'
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

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
    if (typeof window === 'undefined') return defaultPattern;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultPattern;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultPattern;
      return { ...defaultPattern, ...parsed };
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return defaultPattern;
    }
  });

  const refreshAuth = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      setAuthStatus('authed');
    } catch {
      setUser(null);
      setAuthStatus('unauth');
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) return;

    setAuthBusy(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        await login({ username: authUsername, password: authPassword });
      } else {
        await register({ username: authUsername, password: authPassword });
      }
      await refreshAuth();
    } catch (err) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await logout();
    } catch {
      // best-effort logout
    } finally {
      setUser(null);
      setAuthStatus('unauth');
      setAuthBusy(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h2 className="auth-title">Checking session…</h2>
          <p className="auth-subtitle">Almost there.</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauth') {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h2 className="auth-title">{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <p className="auth-subtitle">Sign in to rename your documents.</p>

          <div className="header-actions">
            <button
              type="button"
              className="auth-linkbtn"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              disabled={authBusy}
            >
              Login
            </button>
            <button
              type="button"
              className="auth-linkbtn"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              disabled={authBusy}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-row">
            <label className="auth-label">
              Username
              <input
                className="auth-input"
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                disabled={authBusy}
                autoComplete="username"
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                disabled={authBusy}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            <div className="auth-actions">
              <button className="auth-btn" type="submit" disabled={authBusy}>
                {authBusy ? 'Please wait…' : authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </div>

            {authError && <div className="auth-error">{authError}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Passport PDF Renamer</h1>
        <div className="header-actions">
          <span className="tagline" style={{ margin: 0 }}>
            Signed in as <strong>{user?.username}</strong>
          </span>
          <button type="button" className="btn-logout" onClick={handleLogout} disabled={authBusy}>
            Logout
          </button>
        </div>
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
          <button type="button" className="btn-save-pattern" onClick={handleSavePattern}>
            Save format
          </button>
        </div>
        <p className="pattern-preview">
          Example:&nbsp;
          <strong>{buildRenamedFilename('john', 'doe', pattern)}</strong>
        </p>
      </section>

      <UploadZone onFiles={handleFiles} accept=".pdf" disabled={!user || processing} />

      {processing && <ProgressOverlay fileName={currentFile} progress={progress} status={progressStatus} />}

      {results.length > 0 && <ResultsTable results={results} onDownload={handleDownload} pattern={pattern} />}

      <footer className="footer">All processing runs in your browser. No files are uploaded to any server.</footer>
    </div>
  );
}

