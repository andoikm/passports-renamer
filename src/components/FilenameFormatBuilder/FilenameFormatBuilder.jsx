import { useMemo, useState } from 'react';
import {
  FILENAME_PREVIEW_SAMPLE,
  PRESET_SEPARATORS,
  createPartId,
  generateFilename,
  getFilenameField,
  listFilenameFields,
} from '../../filename/index.js';
import { Button } from '../ui/Button.jsx';
import { FilenamePartRow } from './FilenamePartRow.jsx';
import './FilenameFormatBuilder.css';

/**
 * Filename Format Builder — ordered parts are the single source of truth.
 */
export function FilenameFormatBuilder({
  config,
  onChange,
  onSave,
  onReset,
  saving = false,
  savedFlash = false,
  dirty = false,
  issues = [],
  hasErrors = false,
}) {
  const [addValue, setAddValue] = useState('');
  const [customSep, setCustomSep] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  const fields = listFilenameFields();
  const usedFields = useMemo(
    () =>
      new Set(
        config.parts
          .filter((p) => p.type === 'field')
          .map((p) => p.field)
      ),
    [config.parts]
  );

  const availableToAdd = fields.filter(
    (f) => f.allowDuplicate || !usedFields.has(f.id)
  );

  const preview = generateFilename(config, FILENAME_PREVIEW_SAMPLE, 'pdf');

  const isPresetSep = PRESET_SEPARATORS.some((s) => s.value === config.separator);
  const separatorSelectValue = isPresetSep ? config.separator : '__custom__';

  const updateParts = (parts) => onChange({ ...config, parts });

  const handleAdd = () => {
    if (!addValue) return;

    if (addValue === '__static__') {
      updateParts([
        ...config.parts,
        { id: createPartId(), type: 'static', value: '' },
      ]);
      setAddValue('');
      return;
    }

    const def = getFilenameField(addValue);
    if (!def) return;
    if (!def.allowDuplicate && usedFields.has(def.id)) return;

    const part = {
      id: createPartId(),
      type: 'field',
      field: def.id,
    };
    if (def.id === 'date') {
      part.options = { format: 'YYYY-MM-DD' };
    }
    updateParts([...config.parts, part]);
    setAddValue('');
  };

  const handleRemove = (id) => {
    updateParts(config.parts.filter((p) => p.id !== id));
  };

  const handleMove = (from, to) => {
    if (to < 0 || to >= config.parts.length || from === to) return;
    const next = [...config.parts];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateParts(next);
  };

  const handleUpdateStatic = (id, value) => {
    updateParts(
      config.parts.map((p) =>
        p.id === id && p.type === 'static' ? { ...p, value } : p
      )
    );
  };

  const handleUpdateOptions = (id, options) => {
    updateParts(
      config.parts.map((p) =>
        p.id === id && p.type === 'field' ? { ...p, options } : p
      )
    );
  };

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Improve drag image targeting from the handle
    if (e.currentTarget.parentElement) {
      e.dataTransfer.setDragImage(e.currentTarget.parentElement, 20, 20);
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const from =
      dragIndex != null
        ? dragIndex
        : Number(e.dataTransfer.getData('text/plain'));
    if (Number.isFinite(from)) {
      handleMove(from, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const errorMessages = issues.filter((i) => i.level === 'error');
  const warningMessages = issues.filter((i) => i.level === 'warning');

  return (
    <section
      className={`ffb ui-card ${collapsed ? 'ffb--collapsed' : ''}`}
      aria-labelledby="ffb-heading"
    >
      <button
        type="button"
        className="ffb__toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-controls="ffb-panel"
        id="ffb-toggle"
      >
        <div className="ffb__toggle-main">
          <h2 id="ffb-heading" className="ffb__title">Filename format</h2>
          {collapsed ? (
            <code className="ffb__preview-value ffb__preview-value--collapsed" aria-live="polite">
              {preview}
            </code>
          ) : null}
        </div>
        <span className="ffb__chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      <div
        id="ffb-panel"
        className="ffb__panel"
        role="region"
        aria-labelledby="ffb-heading"
        aria-hidden={collapsed || undefined}
        {...(collapsed ? { inert: '' } : {})}
      >
        <div className="ffb__panel-inner">
        <p className="ffb__subtitle">
          Add fields, drag to reorder, and choose a separator. The list order is the filename order.
        </p>

      <div className="ffb__toolbar">
        <div className="ui-field ffb__add">
          <label className="ui-label" htmlFor="ffb-add-field">Add part</label>
          <div className="ffb__add-row">
            <select
              id="ffb-add-field"
              className="ui-select"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
            >
              <option value="">Select a field…</option>
              {availableToAdd.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
              <option value="__static__">Custom Text</option>
            </select>
            <Button
              variant="secondary"
              onClick={handleAdd}
              disabled={!addValue}
              aria-label="Add selected part to filename"
            >
              Add
            </Button>
          </div>
        </div>

        <div className="ui-field ffb__sep">
          <label className="ui-label" htmlFor="ffb-separator">Separator</label>
          <select
            id="ffb-separator"
            className="ui-select"
            value={separatorSelectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '__custom__') {
                const next = isPresetSep ? '_' : config.separator;
                setCustomSep(next);
                onChange({ ...config, separator: next });
                return;
              }
              onChange({ ...config, separator: value });
            }}
          >
            {PRESET_SEPARATORS.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {separatorSelectValue === '__custom__' && (
          <div className="ui-field ffb__sep-custom">
            <label className="ui-label" htmlFor="ffb-custom-sep">Custom separator</label>
            <input
              id="ffb-custom-sep"
              className="ui-input"
              type="text"
              maxLength={8}
              value={isPresetSep ? customSep : config.separator}
              onChange={(e) => {
                setCustomSep(e.target.value);
                onChange({ ...config, separator: e.target.value });
              }}
              placeholder="e.g. __"
            />
          </div>
        )}
      </div>

      <div className="ffb__structure">
        <div className="ffb__structure-label">Filename structure</div>
        {config.parts.length === 0 ? (
          <div className="ffb__empty" role="status">
            No filename fields selected. Add at least one field or custom text.
          </div>
        ) : (
          <ol className="ffb__list" aria-label="Filename parts in order">
            {config.parts.map((part, index) => (
              <FilenamePartRow
                key={part.id}
                part={part}
                index={index}
                total={config.parts.length}
                onRemove={handleRemove}
                onMove={handleMove}
                onUpdateStatic={handleUpdateStatic}
                onUpdateOptions={handleUpdateOptions}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={dragIndex === index}
                isDropTarget={overIndex === index && dragIndex !== index}
              />
            ))}
          </ol>
        )}
      </div>

      <div className="ffb__preview" aria-live="polite">
        <span className="ffb__preview-label">Preview</span>
        <code className="ffb__preview-value">{preview}</code>
        {savedFlash && <span className="ffb__saved">Saved</span>}
        {dirty && !savedFlash && <span className="ffb__dirty">Unsaved changes</span>}
      </div>

      {(errorMessages.length > 0 || warningMessages.length > 0) && (
        <ul className="ffb__issues" aria-live="polite">
          {errorMessages.map((i) => (
            <li key={i.message} className="ffb__issue ffb__issue--error">
              {i.message}
            </li>
          ))}
          {warningMessages.map((i) => (
            <li key={i.message} className="ffb__issue ffb__issue--warning">
              {i.message}
            </li>
          ))}
        </ul>
      )}

      <div className="ffb__footer">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          Reset to default
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          loading={saving}
          disabled={hasErrors}
          aria-label="Save filename format"
        >
          Save format
        </Button>
      </div>
        </div>
      </div>
    </section>
  );
}
