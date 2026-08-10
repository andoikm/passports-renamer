import { useCallback, useMemo, useState } from 'react';
import {
  configHasBlockingErrors,
  createDefaultFilenameConfig,
  loadFilenameConfig,
  normalizeFilenameConfig,
  saveFilenameConfig,
  validateFilenameConfig,
} from '../filename/index.js';

/**
 * Owns FilenameConfig state + persistence (browser localStorage).
 */
export function useFilenameConfig() {
  const [config, setConfigState] = useState(() => loadFilenameConfig());
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dirty, setDirty] = useState(false);

  const issues = useMemo(() => validateFilenameConfig(config), [config]);
  const hasErrors = useMemo(() => configHasBlockingErrors(config), [config]);

  const setConfig = useCallback((next) => {
    setConfigState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      return normalizeFilenameConfig(value);
    });
    setDirty(true);
    setSavedFlash(false);
  }, []);

  const save = useCallback(async () => {
    if (hasErrors || saving) {
      return { ok: false, issues };
    }
    setSaving(true);
    try {
      const ok = saveFilenameConfig(config);
      await new Promise((r) => setTimeout(r, 220));
      if (ok) {
        setDirty(false);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2000);
      }
      return { ok, issues };
    } finally {
      setSaving(false);
    }
  }, [config, hasErrors, issues, saving]);

  const resetToDefault = useCallback(() => {
    setConfig(createDefaultFilenameConfig());
  }, [setConfig]);

  return {
    config,
    setConfig,
    save,
    resetToDefault,
    saving,
    savedFlash,
    dirty,
    issues,
    hasErrors,
  };
}
