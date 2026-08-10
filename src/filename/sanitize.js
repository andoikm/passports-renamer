/**
 * Centralized filename part sanitization.
 * Keeps the project's existing download-safe ASCII rules so generated
 * names remain portable across common filesystems/browsers.
 */

const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Sanitize a single filename segment (not the full path).
 * Spaces inside a part are removed (historical product behavior).
 * @param {unknown} value
 * @param {{ fallback?: string | null, lowercase?: boolean }} [options]
 * @returns {string}
 */
export function sanitizeFilenamePart(value, options = {}) {
  const { fallback = '', lowercase = true } = options;

  if (value == null) return fallback ?? '';

  let s = String(value).trim();
  if (!s) return fallback ?? '';

  // Normalize whitespace then strip characters illegal on common filesystems
  s = s.replace(/\s+/g, ' ');
  s = s.replace(INVALID_CHARS, '');

  // Keep letters/numbers/._- ; drop other punctuation
  s = s.replace(/[^a-zA-Z0-9._\-\s]/g, '');
  // Spaces inside a *part* are removed (e.g. "John Michael" → "johnmichael")
  s = s.replace(/\s+/g, '');

  if (lowercase) {
    s = s.toLowerCase();
  }

  // Avoid leading/trailing dots which are problematic on Windows
  s = s.replace(/^\.+|\.+$/g, '');

  return s || (fallback ?? '');
}

/**
 * Sanitize a joined filename base (parts already sanitized + separator applied).
 * Preserves spaces so a space separator remains intact.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeFilenameBase(value) {
  if (value == null) return 'unknown';

  let s = String(value).trim();
  if (!s) return 'unknown';

  s = s.replace(INVALID_CHARS, '');
  // Allow spaces here — they may be the configured separator between parts
  s = s.replace(/[^a-zA-Z0-9._\-\s]/g, '');
  // Collapse runs of whitespace to a single space (do not remove entirely)
  s = s.replace(/\s+/g, ' ').trim();
  s = s.toLowerCase();
  s = s.replace(/^\.+|\.+$/g, '');

  return s || 'unknown';
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
