export function ProgressOverlay({ fileName, progress, status }) {
  const hasDeterminateProgress =
    typeof progress === 'number' && Number.isFinite(progress) && progress > 0;

  const percent = hasDeterminateProgress
    ? Math.max(0, Math.min(100, Math.round(progress * 100)))
    : null;

  return (
    <div className="progress-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="progress-card">
        <p className="progress-card__eyebrow">Processing</p>
        <p className="progress-file">{fileName || 'Preparing…'}</p>
        <div className="progress-bar-wrap">
          <div
            className={`progress-bar ${hasDeterminateProgress ? '' : 'progress-bar--indeterminate'}`}
            style={hasDeterminateProgress ? { width: `${percent}%` } : undefined}
          />
        </div>
        <div className="progress-meta">
          <p className="progress-status">{status || 'Working…'}</p>
          {percent !== null && (
            <span className="progress-percent">{percent}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
