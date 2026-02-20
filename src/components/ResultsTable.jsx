export function ResultsTable({ results, onDownload }) {
  return (
    <section className="results">
      <h2 className="results-title">Processed files</h2>
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Original file</th>
              <th>Initial file name</th>
              <th>Name</th>
              <th>Surname</th>
              <th>New filename</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className={[r.error && 'results-row--error', (r.name === 'unknown' || r.surname === 'unknown') && 'results-row--unknown'].filter(Boolean).join(' ')}>
                <td className="results-cell results-cell--file">{r.originalName}</td>
                <td className="results-cell results-cell--file">{r.originalName}</td>
                <td className="results-cell">{r.name}</td>
                <td className="results-cell">{r.surname}</td>
                <td className="results-cell results-cell--filename">
                  {r.downloadName ?? (r.error ? '—' : '—')}
                </td>
                <td className="results-cell results-cell--action">
                  {r.downloadName && (
                    <button
                      type="button"
                      className="btn-download"
                      onClick={() => onDownload(r)}
                    >
                      Download
                    </button>
                  )}
                  {r.error && <span className="results-error">{r.error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
