/**
 * Extract passport identity fields from OCR text.
 * Priority per field: MRZ, then visual-zone labels, then "unknown".
 */

const UNKNOWN = 'unknown';

const MONTHS = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  SEPT: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

/** @returns {{ name: string, surname: string, passportNumber: string, expiryDate: string }} */
export function emptyPassportFields() {
  return {
    name: UNKNOWN,
    surname: UNKNOWN,
    passportNumber: UNKNOWN,
    expiryDate: UNKNOWN,
  };
}

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {string | null} YYYY-MM-DD
 */
export function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * ICAO MRZ dates are YYMMDD. Expiry on current passports is 20xx / 21xx.
 * @param {string} yymmdd
 * @param {number} [nowYear]
 * @returns {string | null}
 */
export function parseMrzDate(yymmdd, nowYear = new Date().getFullYear()) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  let year = 2000 + yy;
  if (year < nowYear - 20) year += 100;
  return toIsoDate(year, month, day);
}

/** Calendar sanity check for an MRZ YYMMDD (month/day only). */
function mrzDateLooksValid(yymmdd) {
  if (!/^\d{6}$/.test(yymmdd)) return false;
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  return toIsoDate(2000, month, day) != null;
}

/**
 * Parse a visual-zone date (DD MMM YYYY, DD/MM/YYYY, YYYY-MM-DD, …).
 * @param {string} raw
 * @returns {string | null}
 */
export function parseVisualDate(raw) {
  if (!raw) return null;
  const s = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ');

  const monthName = s.match(/^(\d{1,2})[.\-\s/]+([A-Z]{3,4})[.\-\s/]+(\d{2,4})$/);
  if (monthName) {
    const month = MONTHS[monthName[2]];
    if (!month) return null;
    return toIsoDate(expandYear(monthName[3]), month, Number(monthName[1]));
  }

  const ymd = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (ymd) return toIsoDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

  const dmy = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (dmy) return toIsoDate(expandYear(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  return null;
}

function expandYear(yearToken) {
  const token = String(yearToken);
  if (token.length === 4) return Number(token);
  return 2000 + Number(token);
}

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
 * TD3/TD2 MRZ document line: passport number + nationality + DOB + sex + expiry.
 * @param {string} compact Uppercase, no spaces
 * @returns {{ passportNumber: string, expiryDate: string } | null}
 */
function parseMrzDocumentCompact(compact) {
  if (!compact) return null;
  const re =
    /([A-Z0-9<]{9})([0-9<])([A-Z]{3})([0-9]{6})([0-9<])([MFX<])([0-9]{6})([0-9<])/g;
  let match;
  while ((match = re.exec(compact))) {
    const passportNumber = match[1].replace(/</g, '');
    const expiryDate = parseMrzDate(match[7]);
    if (passportNumber.length >= 5 && expiryDate && mrzDateLooksValid(match[4])) {
      return { passportNumber, expiryDate };
    }
  }
  return null;
}

function findAndParseMrzDocument(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^P</.test(trimmed)) continue;
    const compact = trimmed.toUpperCase().replace(/[^A-Z0-9<]/g, '');
    const parsed = parseMrzDocumentCompact(compact);
    if (parsed) return parsed;
  }

  const compactAll = text.toUpperCase().replace(/[^A-Z0-9<]/g, '');
  return parseMrzDocumentCompact(compactAll);
}

function captureAfterLabel(normalized, labelRe, valueRe) {
  const match = normalized.match(new RegExp(`${labelRe.source}\\s*[:/]?\\s*(${valueRe.source})`, 'i'));
  return match ? match[1].trim() : '';
}

/**
 * Parse visual-zone labels for name, surname, passport number, and expiry.
 * @param {string} text
 * @returns {{ surname: string, name: string, passportNumber: string, expiryDate: string }}
 */
function parseLabelFields(text) {
  let surname = '';
  let name = '';
  let passportNumber = '';
  let expiryDate = '';

  const normalized = text.replace(/\s+/g, ' ');

  const surnameRegex = /Surname\s*[:/]?\s*([A-Za-z\-'\s]+?)(?=\s*(?:Given|First|Name|$))/i;
  const surnameMatch = normalized.match(surnameRegex);
  if (surnameMatch) {
    surname = surnameMatch[1].trim().replace(/\s+/g, ' ');
  }

  const givenRegex =
    /(?:Given Name|First Name|Given names?)\s*[:/]?\s*([A-Za-z\-'\s]+?)(?=\s*(?:Surname|Nationality|Date|Sex|Passport|Document|$))/i;
  const givenMatch = normalized.match(givenRegex);
  if (givenMatch) {
    name = givenMatch[1].trim().replace(/\s+/g, ' ');
  }

  const passportLabel =
    /(?:Passport\s*(?:\/\s*Travel\s*Document\s*)?(?:No\.?|Number|Num)|Document\s*(?:No\.?|Number))/i;
  const passportValue = /[A-Z0-9][A-Z0-9\-]{4,14}/i;
  const passportCaptured = captureAfterLabel(normalized, passportLabel, passportValue);
  if (passportCaptured) {
    passportNumber = passportCaptured.replace(/[\s-]/g, '').toUpperCase();
  }

  const expiryLabel =
    /(?:Date of Expir(?:y|ation)|Expir(?:y|ation)\s*Date|Valid Until|Date of Expire)/i;
  const expiryValue =
    /\d{1,2}\s+[A-Za-z]{3,4}\s+\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}[./-]\s*[A-Za-z]{3,4}[./-]\s*\d{2,4}/i;
  const expiryCaptured = captureAfterLabel(normalized, expiryLabel, expiryValue);
  if (expiryCaptured) {
    expiryDate = parseVisualDate(expiryCaptured) || '';
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    if (/^Surname\s*[:/]?\s*$/i.test(lines[i]) && lines[i + 1]) {
      surname = lines[i + 1].trim();
    }
    if (/^(?:Given Name|First Name)\s*[:/]?\s*$/i.test(lines[i]) && lines[i + 1]) {
      name = lines[i + 1].trim();
    }

    const passportLine = lines[i].match(
      /^(?:Passport\s*(?:\/\s*Travel\s*Document\s*)?(?:No\.?|Number)|Document\s*(?:No\.?|Number))\s*[:/]?\s*(.*)$/i
    );
    if (passportLine) {
      const same = (passportLine[1] || '').trim();
      const value = same || lines[i + 1] || '';
      const cleaned = value.replace(/[\s-]/g, '').toUpperCase();
      if (/^[A-Z0-9]{5,15}$/.test(cleaned)) {
        passportNumber = cleaned;
      }
    }

    const expiryLine = lines[i].match(
      /^(?:Date of Expir(?:y|ation)|Expir(?:y|ation)\s*Date|Valid Until)\s*[:/]?\s*(.*)$/i
    );
    if (expiryLine) {
      const same = (expiryLine[1] || '').trim();
      const value = same || lines[i + 1] || '';
      const parsed = parseVisualDate(value);
      if (parsed) expiryDate = parsed;
    }
  }

  return {
    surname: surname.trim(),
    name: name.trim(),
    passportNumber: passportNumber.trim(),
    expiryDate: expiryDate.trim(),
  };
}

function orUnknown(value) {
  return value && value !== UNKNOWN ? value : UNKNOWN;
}

/**
 * Extract name and surname from OCR text.
 * Priority: 1) MRZ, 2) Surname/Given Name labels, 3) unknown.
 * @param {string} ocrText
 * @returns {{ surname: string, name: string }}
 */
export function extractNameSurname(ocrText) {
  const { name, surname } = extractPassportFields(ocrText);
  return { name, surname };
}

/**
 * Extract name, surname, passport number, and expiry date from OCR text.
 * Each field is filled independently (MRZ first, then labels).
 * @param {string} ocrText
 * @returns {{ name: string, surname: string, passportNumber: string, expiryDate: string }}
 */
export function extractPassportFields(ocrText) {
  if (!ocrText || !ocrText.trim()) {
    return emptyPassportFields();
  }

  const mrzNames = findAndParseMRZ(ocrText);
  const mrzDoc = findAndParseMrzDocument(ocrText);
  const labels = parseLabelFields(ocrText);

  return {
    name: orUnknown(mrzNames?.name || labels.name),
    surname: orUnknown(mrzNames?.surname || labels.surname),
    passportNumber: orUnknown(mrzDoc?.passportNumber || labels.passportNumber),
    expiryDate: orUnknown(mrzDoc?.expiryDate || labels.expiryDate),
  };
}
