/**
 * Centralized filename part sanitization.
 * Keeps the project's existing download-safe ASCII rules so generated
 * names remain portable across common filesystems/browsers.
 */

const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Sanitize a single filename segment (not the full path).
 * @param {unknown} value
 * @param {{ fallback?: string | null, lowercase?: boolean }} [options]
 * @returns {string}
 */
export function sanitizeFilenamePart(value, options = {}) {
  const { fallback = '', lowercase = true } = options;

  if (value == null) return fallback ?? '';

  let s = String(value).trim();
  if (!s) return fallback ?? '';

  // Normalize whitespace to a single underscore-friendly space first
  s = s.replace(/\s+/g, ' ');

  // Strip characters illegal on common filesystems
  s = s.replace(INVALID_CHARS, '');

  // Collapse remaining unsafe punctuation; keep letters/numbers/._- and spaces
  // then convert spaces to nothing matching prior project behavior (spaces removed)
  s = s.replace(/[^a-zA-Z0-9._\-\s]/g, '');
  s = s.replace(/\s+/g, '');

  if (lowercase) {
    s = s.toLowerCase();
  }

  // Avoid leading/trailing dots which are problematic on Windows
  s = s.replace(/^\.+|\.+$/g, '');

  return s || (fallback ?? '');
}

/**
 * Sanitize a full base name (already joined), still without extension.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeFilenameBase(value) {
  const cleaned = sanitizeFilenamePart(value, { fallback: 'unknown' });
  return cleaned || 'unknown';
}

/**
 * Normalize an extension like "pdf" / ".PDF" → "pdf"
 * @param {unknown} extension
 * @returns {string}
 */
export function normalizeExtension(extension) {
  if (extension == null || extension === '') return '';
  return String(extension).trim().replace(/^\./, '').toLowerCase();
}
