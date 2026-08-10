/**
 * Persistence for FilenameConfig.
 * This app is browser-only with no backend settings API — localStorage is intentional.
 */

import {
  FILENAME_CONFIG_STORAGE_KEY,
  LEGACY_PATTERN_STORAGE_KEY,
  createDefaultFilenameConfig,
  isLegacyPattern,
  migrateLegacyPattern,
  normalizeFilenameConfig,
} from './schema.js';

/**
 * @returns {import('./schema.js').FilenameConfig}
 */
export function loadFilenameConfig() {
  if (typeof window === 'undefined') {
    return createDefaultFilenameConfig();
  }

  try {
    const raw = window.localStorage.getItem(FILENAME_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeFilenameConfig(parsed);
    }
  } catch (err) {
    console.warn('[filename] Failed to load filename config; using default.', err);
  }

  // Migrate legacy pattern if present
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_PATTERN_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (isLegacyPattern(legacy) || (legacy && typeof legacy === 'object')) {
        const migrated = isLegacyPattern(legacy)
          ? migrateLegacyPattern(legacy)
          : normalizeFilenameConfig(legacy);
        saveFilenameConfig(migrated);
        try {
          window.localStorage.removeItem(LEGACY_PATTERN_STORAGE_KEY);
        } catch {
          // ignore
        }
        return migrated;
      }
    }
  } catch (err) {
    console.warn('[filename] Legacy pattern migration failed; using default.', err);
  }

  return createDefaultFilenameConfig();
}

/**
 * @param {import('./schema.js').FilenameConfig} config
 * @returns {boolean} whether save succeeded
 */
export function saveFilenameConfig(config) {
  if (typeof window === 'undefined') return false;
  try {
    const normalized = normalizeFilenameConfig(config);
    window.localStorage.setItem(
      FILENAME_CONFIG_STORAGE_KEY,
      JSON.stringify(normalized)
    );
    return true;
  } catch (err) {
    console.warn('[filename] Failed to persist filename config.', err);
    return false;
  }
}
