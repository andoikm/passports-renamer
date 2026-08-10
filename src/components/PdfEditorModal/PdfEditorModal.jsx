import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { PdfViewer } from './PdfViewer.jsx';
import { inspectPdfFormFields, readPdfBytes } from '../../pdf/pdfDocument.js';
import './PdfEditorModal.css';

/**
 * @typedef {{
 *   id: string,
 *   originalName?: string,
 *   name?: string,
 *   surname?: string,
 *   file?: File | Blob,
 * }} PdfEditorRow
 */

/**
 * PDF view + manual edit modal.
 *
 * Case A (AcroForm present): edit native form fields + save rewritten PDF bytes.
 * Case B (flat PDF — typical for passport scans): edit OCR metadata (name/surname)
 * used by this app; PDF binary is not rewritten. Structure leaves room for a
 * future field-overlay system without changing the table API.
 */
export function PdfEditorModal({
  open,
  row,
  onClose,
  onSaved,
  returnFocusRef,
}) {
  const loadIdRef = useRef(0);
  const firstInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null));
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null));
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [bytes, setBytes] = useState(/** @type {Uint8Array | null} */ (null));
  const [hasAcroForm, setHasAcroForm] = useState(false);
  const [acroFields, setAcroFields] = useState(/** @type {import('../../pdf/pdfDocument.js').PdfFormField[]} */ ([]));
  const [acroValues, setAcroValues] = useState(/** @type {Record<string, string>} */ ({}));
  const [initialAcroValues, setInitialAcroValues] = useState(/** @type {Record<string, string>} */ ({}));

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');

  const documentTitle = row?.originalName || 'Document';

  const dirty = useMemo(() => {
    if (!open) return false;
    if (firstName !== initialFirstName || lastName !== initialLastName) return true;
    if (hasAcroForm) {
      for (const field of acroFields) {
        if ((acroValues[field.name] ?? '') !== (initialAcroValues[field.name] ?? '')) {
          return true;
        }
      }
    }
    return false;
  }, [
    open,
    firstName,
    lastName,
    initialFirstName,
    initialLastName,
    hasAcroForm,
    acroFields,
    acroValues,
    initialAcroValues,
  ]);

  const resetTransient = useCallback(() => {
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(false);
    setBytes(null);
    setHasAcroForm(false);
    setAcroFields([]);
    setAcroValues({});
    setInitialAcroValues({});
  }, []);

  const loadDocument = useCallback(async () => {
    if (!row?.file) {
      setLoadError('This row has no PDF file to open.');
      setLoading(false);
      return;
    }

    const loadId = ++loadIdRef.current;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const pdfBytes = await readPdfBytes(row.file);
      if (loadId !== loadIdRef.current) return;

      const inspection = await inspectPdfFormFields(pdfBytes);
      if (loadId !== loadIdRef.current) return;

      const nextAcro = {};
      for (const field of inspection.fields) {
        nextAcro[field.name] = field.value ?? '';
      }

      setBytes(pdfBytes);
      setHasAcroForm(inspection.hasAcroForm);
      setAcroFields(inspection.fields);
      setAcroValues(nextAcro);
      setInitialAcroValues({ ...nextAcro });

      const fn = row.name ?? '';
      const ln = row.surname ?? '';
      setFirstName(fn);
      setLastName(ln);
      setInitialFirstName(fn);
      setInitialLastName(ln);
    } catch (err) {
      if (loadId !== loadIdRef.current) return;
      setLoadError(err?.message || 'Failed to load PDF');
      setBytes(null);
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, [row]);

  useEffect(() => {
    if (!open) {
      loadIdRef.current += 1;
      resetTransient();
      return;
    }
    loadDocument();
  }, [open, row?.id, loadDocument, resetTransient]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty) {
      const ok = window.confirm('You have unsaved changes. Close without saving?');
      if (!ok) return;
    }
    onClose?.();
  }, [saving, dirty, onClose]);

  const handleSave = async () => {
    if (!row || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let nextFile = row.file;
      let nextBytes = bytes;

      if (hasAcroForm && bytes) {
        const acroDirty = acroFields.some(
          (f) => (acroValues[f.name] ?? '') !== (initialAcroValues[f.name] ?? '')
        );
        if (acroDirty) {
          const { applyAcroFormValues } = await import('../../pdf/applyAcroFormValues.js');
          nextBytes = await applyAcroFormValues(bytes, acroValues);
          nextFile = new File([nextBytes], row.originalName || 'document.pdf', {
            type: 'application/pdf',
          });
          setBytes(nextBytes);
          setInitialAcroValues({ ...acroValues });
        }
      }

      setInitialFirstName(firstName);
      setInitialLastName(lastName);

      await onSaved?.({
        id: row.id,
        name: firstName.trim() || 'unknown',
        surname: lastName.trim() || 'unknown',
        file: nextFile,
        hasAcroForm,
      });

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`View / Edit · ${documentTitle}`}
      onClose={requestClose}
      size="large"
      className="pdf-editor-modal"
      closeOnEscape={!saving}
      initialFocusRef={firstInputRef}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button variant="ghost" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={loading || !!loadError || !dirty}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="pdf-editor">
        <aside className="pdf-editor__sidebar" aria-label="Document fields">
          <div className="pdf-editor__mode">
            {loading ? (
              <span className="pdf-editor__pill">Inspecting PDF…</span>
            ) : hasAcroForm ? (
              <span className="pdf-editor__pill pdf-editor__pill--form">
                Editable AcroForm detected
              </span>
            ) : (
              <span className="pdf-editor__pill pdf-editor__pill--flat">
                Flat PDF · metadata edit
              </span>
            )}
          </div>

          {!hasAcroForm && !loading && !loadError && (
            <p className="pdf-editor__hint">
              This PDF has no interactive form fields. You can correct the extracted
              first and last name used for renaming. In-PDF field overlays can be
              added later without changing this workflow.
            </p>
          )}

          <div className="pdf-editor__section">
            <h3 className="pdf-editor__section-title">Extracted name</h3>
            <div className="ui-field">
              <label className="ui-label" htmlFor="pdf-edit-first-name">First name</label>
              <input
                ref={firstInputRef}
                id="pdf-edit-first-name"
                className="ui-input"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setSaveSuccess(false);
                }}
                disabled={loading || !!loadError || saving}
                autoComplete="off"
              />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="pdf-edit-last-name">Last name / surname</label>
              <input
                id="pdf-edit-last-name"
                className="ui-input"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setSaveSuccess(false);
                }}
                disabled={loading || !!loadError || saving}
                autoComplete="off"
              />
            </div>
          </div>

          {hasAcroForm && (
            <div className="pdf-editor__section">
              <h3 className="pdf-editor__section-title">PDF form fields</h3>
              <div className="pdf-editor__acro-list">
                {acroFields.map((field) => (
                  <div className="ui-field" key={field.name}>
                    <label className="ui-label" htmlFor={`acro-${field.name}`}>
                      {field.name}
                      <span className="pdf-editor__field-type">{field.type}</span>
                    </label>
                    <input
                      id={`acro-${field.name}`}
                      className="ui-input"
                      type="text"
                      value={acroValues[field.name] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAcroValues((prev) => ({ ...prev, [field.name]: value }));
                        setSaveSuccess(false);
                      }}
                      disabled={field.readOnly || saving}
                      readOnly={field.readOnly}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {saveError && (
            <div className="pdf-editor__banner pdf-editor__banner--error" role="alert">
              {saveError}
            </div>
          )}
          {saveSuccess && !dirty && (
            <div className="pdf-editor__banner pdf-editor__banner--success" role="status">
              Changes saved.
            </div>
          )}
        </aside>

        <section className="pdf-editor__viewer-pane" aria-label="PDF preview">
          {loading && (
            <div className="pdf-editor__loading" role="status">
              <div className="ui-skeleton pdf-editor__skeleton" />
              <div className="ui-skeleton pdf-editor__skeleton pdf-editor__skeleton--short" />
              <p>Loading PDF…</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="pdf-editor__error" role="alert">
              <p>{loadError}</p>
              <Button variant="secondary" onClick={loadDocument}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !loadError && bytes && <PdfViewer bytes={bytes} />}
        </section>
      </div>
    </Modal>
  );
}
