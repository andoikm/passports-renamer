/**
 * Parse MRZ line (e.g. P<ARMIVANOV<<SERGEI<<<<<<<<<<<<) to extract surname and given name.
 * MRZ format: P<COUNTRY(3)SURNAME<<GIVENNAMES<...
 * @param {string} line
 * @returns {{ surname: string, name: string } | null}
 */
function parseMRZLine(line) {
  const trimmed = line.trim();
  // P< or P<UT for passport type, then 3-letter country, then SURNAME<<GIVEN...
  const mrzMatch = trimmed.match(/^P<[A-Z0-9<]{3}([A-Z]+)<<([A-Z<]+)/);
  if (!mrzMatch) return null;
  const surname = mrzMatch[1].replace(/</g, '').trim();
  const given = mrzMatch[2].replace(/<+/g, ' ').trim().split(/\s+/)[0] || '';
  if (!surname || !given) return null;
  return { surname, name: given };
}

/**
 * Find MRZ line in full OCR text (usually a line containing P< and <<).
 */
function findAndParseMRZ(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (/P<[A-Z0-9<]{3}[A-Z]+<</.test(line)) {
      const parsed = parseMRZLine(line);
      if (parsed) return parsed;
    }
  }
  return null;
}

/**
 * Parse "Surname" / "Given Name" labels from OCR text.
 * Handles patterns like "Surname Smith" or "Surname\nSmith" or "Given Name John"
 * @param {string} text
 * @returns {{ surname: string, name: string } | null}
 */
function parseLabelFields(text) {
  let surname = '';
  let name = '';

  // Normalize: replace multiple spaces/newlines with single space for label detection
  const normalized = text.replace(/\s+/g, ' ');

  // Surname (allow "Surname", "Surname/", "Surname:")
  const surnameRegex = /Surname\s*[:/]?\s*([A-Za-z\-'\s]+?)(?=\s*(?:Given|First|Name|$))/i;
  const surnameMatch = normalized.match(surnameRegex);
  if (surnameMatch) {
    surname = surnameMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Given name / First name
  const givenRegex = /(?:Given Name|First Name|Given names?)\s*[:/]?\s*([A-Za-z\-'\s]+?)(?=\s*(?:Surname|Nationality|Date|Sex|$))/i;
  const givenMatch = normalized.match(givenRegex);
  if (givenMatch) {
    name = givenMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Also try line-by-line: line equals "Surname" then next line is value
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    if (/^Surname\s*[:/]?\s*$/i.test(lines[i]) && lines[i + 1]) {
      surname = lines[i + 1].trim();
    }
    if (/^(?:Given Name|First Name)\s*[:/]?\s*$/i.test(lines[i]) && lines[i + 1]) {
      name = lines[i + 1].trim();
    }
  }

  surname = surname.trim();
  name = name.trim();
  if (surname && name) return { surname, name };
  if (surname || name) {
    return {
      surname: surname || 'unknown',
      name: name || 'unknown',
    };
  }
  return null;
}

/**
 * Extract name and surname from OCR text.
 * Priority: 1) MRZ, 2) Surname/Given Name labels, 3) unknown.
 * @param {string} ocrText
 * @returns {{ surname: string, name: string }}
 */
export function extractNameSurname(ocrText) {
  if (!ocrText || !ocrText.trim()) {
    return { name: 'unknown', surname: 'unknown' };
  }

  const mrz = findAndParseMRZ(ocrText);
  if (mrz) return mrz;

  const labels = parseLabelFields(ocrText);
  if (labels) return labels;

  return { name: 'unknown', surname: 'unknown' };
}

/**
 * Sanitize for filename: lowercase, only letters/numbers/dots/dashes/underscores.
 * @param {string} s
 * @returns {string}
 */
export function sanitizeFileNamePart(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^\.+|\.+$/g, '') || 'unknown';
}

/**
 * Build renamed filename using a configurable pattern.
 *
 * Pattern fields:
 * - left:   'first' | 'last'             (which part goes first)
 * - sep:    '.', '_', '-', ''            (separator between parts; '' means nothing)
 * - right:  'first' | 'last'             (which part goes second)
 * - prefix: string (optional, before base)
 * - suffix: string (optional, after base, before .pdf)
 *
 * Defaults to: firstName.lastName.pdf
 */
export function buildRenamedFilename(
  name,
  surname,
  pattern = { left: 'first', sep: '.', right: 'last', prefix: '', suffix: '' }
) {
  const n = sanitizeFileNamePart(name);
  const s = sanitizeFileNamePart(surname);

  const partByKey = {
    first: n,
    last: s,
  };

  const left = partByKey[pattern.left] || '';
  const right = partByKey[pattern.right] || '';
  const sep = pattern.sep || '';

  const prefix = pattern.prefix ? sanitizeFileNamePart(pattern.prefix) : '';
  const suffix = pattern.suffix ? sanitizeFileNamePart(pattern.suffix) : '';

  const base = [left, right].filter(Boolean).join(sep);
  const finalBase = base || sanitizeFileNamePart('unknown');

  const withPrefix = `${prefix || ''}${finalBase}${suffix || ''}`;

  return `${withPrefix}.pdf`;
}

