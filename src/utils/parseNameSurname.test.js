import { describe, expect, it } from 'vitest';
import {
  extractNameSurname,
  extractPassportFields,
  parseMrzDate,
  parseVisualDate,
  toIsoDate,
} from './parseNameSurname.js';

const ICAO_SAMPLE = `
PASSPORT
Surname ERIKSSON
Given Names ANNA MARIA
Passport No. L898902C3
Date of expiry 15 APR 2012
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10
`;

describe('toIsoDate', () => {
  it('validates calendar dates', () => {
    expect(toIsoDate(2030, 1, 15)).toBe('2030-01-15');
    expect(toIsoDate(2030, 2, 31)).toBeNull();
    expect(toIsoDate(2024, 2, 29)).toBe('2024-02-29');
  });
});

describe('parseMrzDate', () => {
  it('converts YYMMDD expiry to ISO using 20xx', () => {
    expect(parseMrzDate('300115', 2026)).toBe('2030-01-15');
    expect(parseMrzDate('120415', 2026)).toBe('2012-04-15');
  });

  it('rejects impossible dates', () => {
    expect(parseMrzDate('301332', 2026)).toBeNull();
    expect(parseMrzDate('abc', 2026)).toBeNull();
  });
});

describe('parseVisualDate', () => {
  it('parses DD MMM YYYY', () => {
    expect(parseVisualDate('15 JAN 2030')).toBe('2030-01-15');
    expect(parseVisualDate('15-JAN-2030')).toBe('2030-01-15');
  });

  it('parses numeric dates', () => {
    expect(parseVisualDate('15/01/2030')).toBe('2030-01-15');
    expect(parseVisualDate('2030-01-15')).toBe('2030-01-15');
  });
});

describe('extractPassportFields', () => {
  it('reads name, number, and expiry from ICAO MRZ', () => {
    expect(extractPassportFields(ICAO_SAMPLE)).toEqual({
      name: 'ANNA',
      surname: 'ERIKSSON',
      passportNumber: 'L898902C3',
      expiryDate: '2012-04-15',
    });
  });

  it('falls back to visual-zone labels when MRZ line 2 is missing', () => {
    const text = `
Surname Smith
Given Name John
Passport Number AB1234567
Date of expiry 12 JAN 2031
`;
    expect(extractPassportFields(text)).toEqual({
      name: 'John',
      surname: 'Smith',
      passportNumber: 'AB1234567',
      expiryDate: '2031-01-12',
    });
  });

  it('parses MRZ document line with OCR spaces', () => {
    const text = `
P<ARMIVANOV<<SERGEI<<<<<<<<<<<<<<<<<<<<<<<<<<
AB1234567 7 ARM 850101 1 M 300101 5
`;
    expect(extractPassportFields(text)).toMatchObject({
      name: 'SERGEI',
      surname: 'IVANOV',
      passportNumber: 'AB1234567',
      expiryDate: '2030-01-01',
    });
  });

  it('fills fields independently', () => {
    const text = `
P<ARMIVANOV<<SERGEI<<<<<<<<<<<<<<<<<<<<<<<<<<
Passport No. XY9998887
Date of expiry 01 DEC 2029
`;
    expect(extractPassportFields(text)).toEqual({
      name: 'SERGEI',
      surname: 'IVANOV',
      passportNumber: 'XY9998887',
      expiryDate: '2029-12-01',
    });
  });

  it('returns unknown when nothing matches', () => {
    expect(extractPassportFields('')).toEqual({
      name: 'unknown',
      surname: 'unknown',
      passportNumber: 'unknown',
      expiryDate: 'unknown',
    });
    expect(extractPassportFields('no passport data here')).toEqual({
      name: 'unknown',
      surname: 'unknown',
      passportNumber: 'unknown',
      expiryDate: 'unknown',
    });
  });
});

describe('extractNameSurname', () => {
  it('still returns only name and surname', () => {
    expect(extractNameSurname(ICAO_SAMPLE)).toEqual({
      name: 'ANNA',
      surname: 'ERIKSSON',
    });
  });
});
