import { Button } from '../ui/Button.jsx';
import { getFilenameField } from '../../filename/index.js';

/**
 * One sortable filename part row with drag handle + keyboard reorder.
 */
export function FilenamePartRow({
  part,
  index,
  total,
  onRemove,
  onMove,
  onUpdateStatic,
  onUpdateOptions,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}) {
  const fieldDef = part.type === 'field' ? getFilenameField(part.field) : null;
  const label =
    part.type === 'static'
      ? 'Custom Text'
      : fieldDef?.label || part.field;
  const typeLabel = part.type === 'static' ? 'Static' : 'Field';

  return (
    <li
      className={[
        'ffb-part',
        isDragging ? 'ffb-part--dragging' : '',
        isDropTarget ? 'ffb-part--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={false}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      aria-roledescription="sortable item"
      aria-label={`${label}, position ${index + 1} of ${total}`}
    >
      <button
        type="button"
        className="ffb-part__handle"
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragEnd={onDragEnd}
        aria-label={`Drag to reorder ${label}`}
        title="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="5" cy="4" r="1.2" fill="currentColor" />
          <circle cx="11" cy="4" r="1.2" fill="currentColor" />
          <circle cx="5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="11" cy="8" r="1.2" fill="currentColor" />
          <circle cx="5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="11" cy="12" r="1.2" fill="currentColor" />
        </svg>
      </button>

      <div className="ffb-part__body">
        <div className="ffb-part__meta">
          <span className="ffb-part__label">{label}</span>
          <span className="ffb-part__type">{typeLabel}</span>
        </div>

        {part.type === 'static' && (
          <input
            className="ui-input ffb-part__static-input"
            type="text"
            value={part.value}
            maxLength={64}
            placeholder="Enter text…"
            aria-label="Custom text value"
            onChange={(e) => onUpdateStatic(part.id, e.target.value)}
          />
        )}

        {part.type === 'field' &&
          fieldDef?.optionFields?.map((optField) => (
            <label key={optField.key} className="ffb-part__option">
              <span className="ui-label">{optField.label}</span>
              <select
                className="ui-select"
                value={part.options?.[optField.key] || optField.options[0]?.value}
                onChange={(e) =>
                  onUpdateOptions(part.id, {
                    ...(part.options || {}),
                    [optField.key]: e.target.value,
                  })
                }
                aria-label={`${label} ${optField.label}`}
              >
                {optField.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
      </div>

      <div className="ffb-part__actions">
        <button
          type="button"
          className="ffb-icon-btn"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${label} up`}
          title="Move up"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          type="button"
          className="ffb-icon-btn"
          onClick={() => onMove(index, index + 1)}
          disabled={index >= total - 1}
          aria-label={`Move ${label} down`}
          title="Move down"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(part.id)}
          aria-label={`Remove ${label}`}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
