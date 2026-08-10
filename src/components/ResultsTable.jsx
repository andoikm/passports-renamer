import { useMemo, useRef, useState } from 'react';
import { Button } from './ui/Button.jsx';

function isUnknownResult(r) {
  return r.name === 'unknown' || r.surname === 'unknown';
}

export function ResultsTable({ results, onDownload, buildFilename, onViewPdf, onDelete }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const viewButtonRefs = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}));

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aUnknown = isUnknownResult(a) ? 0 : 1;
      const bUnknown = isUnknownResult(b) ? 0 : 1;
      return aUnknown - bUnknown;
    });
  }, [results]);

  const hasUnknown = useMemo(
    () => results.some((r) => isUnknownResult(r)),
    [results]
  );

  const downloadableResults = useMemo(
    () => results.filter((r) => r.file && !r.error),
    [results]
  );

  const handleDownloadClick = async (result, downloadName) => {
    if (!downloadName || downloadingId || downloadingAll) return;
    setDownloadingId(result.id);
    try {
      onDownload(result, downloadName);
      await new Promise((r) => setTimeout(r, 220));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (hasUnknown || downloadingAll || downloadingId || downloadableResults.length === 0) {
      return;
    }
    setDownloadingAll(true);
    try {
      for (const result of downloadableResults) {
        const downloadName = buildFilename(result);
        if (!downloadName || !result.file) continue;
        onDownload(result, downloadName);
        // Stagger downloads so browsers don't block them
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="results-header">
        <div className="results-header__left">
          <h2 id="results-heading" className="results-title">Processed files</h2>
          <span className="results-count">
            {results.length} {results.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadAll}
          loading={downloadingAll}
          disabled={
            hasUnknown ||
            downloadableResults.length === 0 ||
            Boolean(downloadingId)
          }
          title={
            hasUnknown
              ? 'Resolve all unknown names before downloading all'
              : 'Download all files'
          }
          aria-label={
            hasUnknown
              ? 'Download all disabled because at least one file has an unknown name'
              : 'Download all files'
          }
        >
          Download all
        </Button>
      </div>

      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">Original file</th>
              <th scope="col">Name</th>
              <th scope="col">Surname</th>
              <th scope="col">New filename</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r) => {
              const downloadName = buildFilename(r);
              const isUnknown = isUnknownResult(r);
              const canView = Boolean(r.file) && !r.error;
              return (
                <tr
                  key={r.id}
                  className={[
                    r.error && 'results-row--error',
                    isUnknown && 'results-row--unknown',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="results-cell results-cell--file" title={r.originalName}>
                    {r.originalName}
                    {r.error && <span className="results-badge results-badge--error">Error</span>}
                    {!r.error && isUnknown && (
                      <span className="results-badge results-badge--unknown">Review</span>
                    )}
                  </td>
                  <td className="results-cell results-cell--name">{r.name}</td>
                  <td className="results-cell results-cell--name">{r.surname}</td>
                  <td className="results-cell results-cell--filename">
                    {downloadName || '—'}
                  </td>
                  <td className="results-cell results-cell--action">
                    <div className="results-actions">
                      <button
                        type="button"
                        className="results-icon-btn"
                        title="View / Edit PDF"
                        aria-label={`View / Edit PDF: ${r.originalName}`}
                        disabled={!canView}
                        ref={(el) => {
                          viewButtonRefs.current[r.id] = el;
                        }}
                        onClick={() => {
                          if (!canView) return;
                          onViewPdf?.(r, {
                            returnFocusRef: {
                              get current() {
                                return viewButtonRefs.current[r.id] || null;
                              },
                            },
                          });
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {downloadName && (
                        <button
                          type="button"
                          className={`results-icon-btn results-icon-btn--download ${
                            downloadingId === r.id ? 'results-icon-btn--loading' : ''
                          }`}
                          title="Download"
                          aria-label={`Download ${downloadName}`}
                          aria-busy={downloadingId === r.id || undefined}
                          disabled={Boolean(downloadingId) || downloadingAll}
                          onClick={() => handleDownloadClick(r, downloadName)}
                        >
                          {downloadingId === r.id ? (
                            <span className="ui-spinner" aria-hidden="true" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="results-icon-btn results-icon-btn--danger"
                        title="Delete"
                        aria-label={`Delete ${r.originalName}`}
                        disabled={downloadingAll || downloadingId === r.id}
                        onClick={() => onDelete?.(r)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                    {r.error && <span className="results-error">{r.error}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
