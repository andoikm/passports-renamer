/**
 * Filename field registry — single source of truth for supported dynamic fields.
 * Adding a new field should only require registering it here.
 */

/**
 * @typedef {object} FilenameFieldDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {boolean} [allowDuplicate]
 * @property {(data: Record<string, unknown>, options?: Record<string, unknown>) => unknown} resolve
 * @property {{ key: string, label: string, options: { value: string, label: string }[] }[]} [optionFields]
 */

/**
 * @param {Date} date
 * @param {string} [format]
 */
export function formatDateValue(date, format = 'YYYY-MM-DD') {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYYMMDD':
      return `${y}${m}${d}`;
    case 'DD-MM-YYYY':
      return `${d}-${m}-${y}`;
    case 'YYYY-MM-DD':
    default:
      return `${y}-${m}-${d}`;
  }
}

function stripExtension(filename) {
  if (!filename) return '';
  const s = String(filename);
  const i = s.lastIndexOf('.');
  if (i <= 0) return s;
  return s.slice(0, i);
}

/** @type {Record<string, FilenameFieldDefinition>} */
export const FILENAME_FIELD_REGISTRY = {
  firstName: {
    id: 'firstName',
    label: 'First Name',
    description: 'Given name extracted from the passport',
    allowDuplicate: false,
    resolve: (data) => data.firstName ?? data.name ?? '',
  },
  lastName: {
    id: 'lastName',
    label: 'Last Name',
    description: 'Surname extracted from the passport',
    allowDuplicate: false,
    resolve: (data) => data.lastName ?? data.surname ?? '',
  },
  originalName: {
    id: 'originalName',
    label: 'Original Filename',
    description: 'Original PDF filename without extension',
    allowDuplicate: false,
    resolve: (data) => stripExtension(data.originalName ?? data.fileName ?? ''),
  },
  date: {
    id: 'date',
    label: 'Date',
    description: 'Processing / current date',
    allowDuplicate: false,
    optionFields: [
      {
        key: 'format',
        label: '',
        options: [
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
          { value: 'YYYYMMDD', label: 'YYYYMMDD' },
          { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
        ],
      },
    ],
    resolve: (data, options = {}) => {
      const raw = data.date;
      const date =
        raw instanceof Date
          ? raw
          : raw
            ? new Date(/** @type {string | number} */ (raw))
            : new Date();
      return formatDateValue(date, /** @type {string} */ (options.format) || 'YYYY-MM-DD');
    },
  },
};

/** @returns {FilenameFieldDefinition[]} */
export function listFilenameFields() {
  return Object.values(FILENAME_FIELD_REGISTRY);
}

/**
 * @param {string} fieldId
 * @returns {FilenameFieldDefinition | null}
 */
export function getFilenameField(fieldId) {
  return FILENAME_FIELD_REGISTRY[fieldId] || null;
}

export function isRegisteredField(fieldId) {
  return Boolean(FILENAME_FIELD_REGISTRY[fieldId]);
}
