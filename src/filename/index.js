/**
 * Public API for the filename-template architecture.
 */

export {
  FILENAME_FIELD_REGISTRY,
  listFilenameFields,
  getFilenameField,
  isRegisteredField,
  formatDateValue,
} from './registry.js';

export {
  sanitizeFilenamePart,
  sanitizeFilenameBase,
  normalizeExtension,
} from './sanitize.js';

export {
  FILENAME_CONFIG_VERSION,
  FILENAME_CONFIG_STORAGE_KEY,
  LEGACY_PATTERN_STORAGE_KEY,
  PRESET_SEPARATORS,
  MAX_STATIC_LENGTH,
  createPartId,
  createDefaultFilenameConfig,
  migrateLegacyPattern,
  isLegacyPattern,
  normalizeFilenameConfig,
  validateFilenameConfig,
  configHasBlockingErrors,
} from './schema.js';

export { generateFilename, resolvePartValue, toFilenameData } from './generate.js';

export { loadFilenameConfig, saveFilenameConfig } from './persistence.js';

/** Sample values for live preview — same generator as production. */
export const FILENAME_PREVIEW_SAMPLE = {
  firstName: 'John',
  lastName: 'Smith',
  name: 'John',
  surname: 'Smith',
  originalName: 'passport-scan.pdf',
  date: new Date('2026-08-10T12:00:00'),
};
