/**
 * Single source of truth for filename generation.
 * Preview and downloads MUST use this function.
 */

import { getFilenameField } from './registry.js';
import { normalizeFilenameConfig } from './schema.js';
import {
  normalizeExtension,
  sanitizeFilenameBase,
  sanitizeFilenamePart,
} from './sanitize.js';

/**
 * Resolve one config part to a raw string (before sanitization).
 * @param {import('./schema.js').FilenamePart} part
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function resolvePartValue(part, data) {
  if (!part) return '';

  if (part.type === 'static') {
    return typeof part.value === 'string' ? part.value : '';
  }

  if (part.type === 'field') {
    const def = getFilenameField(part.field);
    if (!def) return '';
    try {
      const resolved = def.resolve(data || {}, part.options || {});
      if (resolved == null) return '';
      return String(resolved);
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Generate a filename from ordered configuration + record data.
 *
 * @param {import('./schema.js').FilenameConfig | unknown} configuration
 * @param {Record<string, unknown>} data
 * @param {string} [extension='pdf']
 * @returns {string}
 */
export function generateFilename(configuration, data = {}, extension = 'pdf') {
  const config = normalizeFilenameConfig(configuration);
  const sep = typeof config.separator === 'string' ? config.separator : '';

  const segments = [];
  for (const part of config.parts) {
    const raw = resolvePartValue(part, data);
    const cleaned = sanitizeFilenamePart(raw, { fallback: '' });
    if (cleaned) {
      segments.push(cleaned);
    }
  }

  const base = sanitizeFilenameBase(segments.join(sep));
  const ext = normalizeExtension(extension);

  return ext ? `${base}.${ext}` : base;
}

/**
 * Build the data object used for passport rename results.
 * @param {{ name?: string, surname?: string, firstName?: string, lastName?: string, originalName?: string, date?: Date | string | number }} result
 */
export function toFilenameData(result = {}) {
  return {
    firstName: result.firstName ?? result.name ?? '',
    lastName: result.lastName ?? result.surname ?? '',
    name: result.name ?? result.firstName ?? '',
    surname: result.surname ?? result.lastName ?? '',
    originalName: result.originalName ?? '',
    date: result.date ?? new Date(),
  };
}
