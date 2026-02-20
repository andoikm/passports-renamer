export function ProgressOverlay({ fileName, progress, status }) {
  return (
    <div className="progress-overlay" role="status" aria-live="polite">
      <div className="progress-card">
        <p className="progress-file">{fileName}</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="progress-status">{status}</p>
      </div>
    </div>
  );
}
