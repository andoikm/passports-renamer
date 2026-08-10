/**
 * FilenameConfig schema, defaults, validation, and legacy migration.
 */

import { isRegisteredField, getFilenameField } from './registry.js';

export const FILENAME_CONFIG_VERSION = 1;
export const FILENAME_CONFIG_STORAGE_KEY = 'passport-renamer-filename-config';
/** Legacy pattern key used by the previous left/right UI */
export const LEGACY_PATTERN_STORAGE_KEY = 'passport-renamer-pattern';

export const MAX_STATIC_LENGTH = 64;
export const MAX_PARTS = 12;
export const MAX_CUSTOM_SEPARATOR_LENGTH = 8;

export const PRESET_SEPARATORS = [
  { value: '.', label: 'Dot (.)' },
  { value: '_', label: 'Underscore (_)' },
  { value: '-', label: 'Dash (-)' },
  { value: ' ', label: 'Space' },
  { value: '', label: 'None' },
];

/**
 * @typedef {{ id: string, type: 'field', field: string, options?: Record<string, string> }} FieldPart
 * @typedef {{ id: string, type: 'static', value: string }} StaticPart
 * @typedef {FieldPart | StaticPart} FilenamePart
 * @typedef {{ version: number, separator: string, parts: FilenamePart[] }} FilenameConfig
 */

export function createPartId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `part_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Default config reproducing the previous product default:
 * firstName.lastName.pdf
 * @returns {FilenameConfig}
 */
export function createDefaultFilenameConfig() {
  return {
    version: FILENAME_CONFIG_VERSION,
    separator: '.',
    parts: [
      { id: createPartId(), type: 'field', field: 'firstName' },
      { id: createPartId(), type: 'field', field: 'lastName' },
    ],
  };
}

/**
 * Migrate the previous left/right/prefix/suffix pattern into FilenameConfig.
 * Previous shape:
 * { left: 'first'|'last', right: 'first'|'last', sep, prefix, suffix }
 * @param {Record<string, unknown>} legacy
 * @returns {FilenameConfig}
 */
export function migrateLegacyPattern(legacy) {
  const mapSide = (side) => (side === 'last' ? 'lastName' : 'firstName');
  const parts = [];

  const prefix = typeof legacy.prefix === 'string' ? legacy.prefix.trim() : '';
  if (prefix) {
    parts.push({ id: createPartId(), type: 'static', value: prefix });
  }

  parts.push({
    id: createPartId(),
    type: 'field',
    field: mapSide(legacy.left),
  });
  parts.push({
    id: createPartId(),
    type: 'field',
    field: mapSide(legacy.right),
  });

  const suffix = typeof legacy.suffix === 'string' ? legacy.suffix.trim() : '';
  if (suffix) {
    parts.push({ id: createPartId(), type: 'static', value: suffix });
  }

  const separator = typeof legacy.sep === 'string' ? legacy.sep : '.';

  return normalizeFilenameConfig({
    version: FILENAME_CONFIG_VERSION,
    separator,
    parts,
  });
}

/**
 * Detect legacy pattern objects (no version / parts).
 * @param {unknown} value
 */
export function isLegacyPattern(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = /** @type {Record<string, unknown>} */ (value);
  return (
    ('left' in obj || 'right' in obj) &&
    !('parts' in obj) &&
    !('version' in obj)
  );
}

/**
 * @param {unknown} part
 * @returns {FilenamePart | null}
 */
function normalizePart(part) {
  if (!part || typeof part !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (part);
  const id = typeof p.id === 'string' && p.id ? p.id : createPartId();

  if (p.type === 'static') {
    const value = typeof p.value === 'string' ? p.value.slice(0, MAX_STATIC_LENGTH) : '';
    return { id, type: 'static', value };
  }

  if (p.type === 'field') {
    const field = typeof p.field === 'string' ? p.field : '';
    if (!isRegisteredField(field)) return null;
    /** @type {FieldPart} */
    const normalized = { id, type: 'field', field };
    if (p.options && typeof p.options === 'object' && !Array.isArray(p.options)) {
      const opts = {};
      const def = getFilenameField(field);
      const allowed = new Set(
        (def?.optionFields || []).flatMap((f) => f.options.map((o) => o.value))
      );
      for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (p.options))) {
        if (typeof v === 'string' && (allowed.size === 0 || allowed.has(v) || k === 'format')) {
          opts[k] = v;
        }
      }
      if (Object.keys(opts).length) normalized.options = opts;
    }
    return normalized;
  }

  return null;
}

/**
 * Normalize / repair a config. Never throws.
 * @param {unknown} raw
 * @returns {FilenameConfig}
 */
export function normalizeFilenameConfig(raw) {
  if (isLegacyPattern(raw)) {
    return migrateLegacyPattern(/** @type {Record<string, unknown>} */ (raw));
  }

  if (!raw || typeof raw !== 'object') {
    return createDefaultFilenameConfig();
  }

  const obj = /** @type {Record<string, unknown>} */ (raw);
  const separator =
    typeof obj.separator === 'string'
      ? obj.separator.slice(0, MAX_CUSTOM_SEPARATOR_LENGTH)
      : '.';

  const rawParts = Array.isArray(obj.parts) ? obj.parts : [];
  const parts = rawParts
    .map(normalizePart)
    .filter(Boolean)
    .slice(0, MAX_PARTS);

  return {
    version: FILENAME_CONFIG_VERSION,
    separator,
    parts: /** @type {FilenamePart[]} */ (parts),
  };
}

/**
 * Validate a config for save UX. Returns issues; empty array = valid enough to save.
 * @param {FilenameConfig} config
 * @returns {{ level: 'error' | 'warning', message: string }[]}
 */
export function validateFilenameConfig(config) {
  const issues = [];
  if (!config || typeof config !== 'object') {
    issues.push({ level: 'error', message: 'Filename configuration is missing.' });
    return issues;
  }
  if (!Array.isArray(config.parts) || config.parts.length === 0) {
    issues.push({
      level: 'error',
      message: 'Add at least one field or static text to build a filename.',
    });
  }
  if (typeof config.separator !== 'string') {
    issues.push({ level: 'error', message: 'Separator must be a string.' });
  } else if (config.separator.length > MAX_CUSTOM_SEPARATOR_LENGTH) {
    issues.push({
      level: 'error',
      message: `Separator must be at most ${MAX_CUSTOM_SEPARATOR_LENGTH} characters.`,
    });
  }

  const seenFields = new Set();
  for (const part of config.parts || []) {
    if (part.type === 'field') {
      if (!isRegisteredField(part.field)) {
        issues.push({
          level: 'error',
          message: `Unknown field “${part.field}”.`,
        });
      } else if (seenFields.has(part.field)) {
        issues.push({
          level: 'warning',
          message: `Field “${getFilenameField(part.field)?.label || part.field}” appears more than once.`,
        });
      } else {
        seenFields.add(part.field);
      }
    }
    if (part.type === 'static') {
      if (!part.value?.trim()) {
        issues.push({
          level: 'warning',
          message: 'A static text part is empty and will be skipped.',
        });
      } else if (part.value.length > MAX_STATIC_LENGTH) {
        issues.push({
          level: 'error',
          message: `Static text must be at most ${MAX_STATIC_LENGTH} characters.`,
        });
      }
    }
  }

  return issues;
}

export function configHasBlockingErrors(config) {
  return validateFilenameConfig(config).some((i) => i.level === 'error');
}
