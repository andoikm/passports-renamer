import { useRef, useState } from 'react';
import { Button } from './ui/Button.jsx';

export function ResultsTable({ results, onDownload, buildFilename, onViewPdf }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const viewButtonRefs = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}));

  const handleDownloadClick = async (result, downloadName) => {
    if (!downloadName || downloadingId) return;
    setDownloadingId(result.id);
    try {
      onDownload(result, downloadName);
      await new Promise((r) => setTimeout(r, 220));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="results-header">
        <h2 id="results-heading" className="results-title">Processed files</h2>
        <span className="results-count">
          {results.length} {results.length === 1 ? 'file' : 'files'}
        </span>
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
            {results.map((r) => {
              const downloadName = buildFilename(r);
              const isUnknown = r.name === 'unknown' || r.surname === 'unknown';
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
                        <Button
                          variant="primary"
                          size="sm"
                          loading={downloadingId === r.id}
                          disabled={Boolean(downloadingId) && downloadingId !== r.id}
                          onClick={() => handleDownloadClick(r, downloadName)}
                          aria-label={`Download ${downloadName}`}
                        >
                          Download
                        </Button>
                      )}
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
