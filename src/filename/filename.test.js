import { describe, expect, it } from 'vitest';
import {
  createDefaultFilenameConfig,
  generateFilename,
  migrateLegacyPattern,
  normalizeExtension,
  normalizeFilenameConfig,
  sanitizeFilenamePart,
  toFilenameData,
} from './index.js';

const sample = {
  firstName: 'John',
  lastName: 'Smith',
  originalName: 'scan.pdf',
  date: new Date('2026-08-10T12:00:00'),
};

function config(parts, separator = '_') {
  return {
    version: 1,
    separator,
    parts: parts.map((p, i) =>
      typeof p === 'string'
        ? { id: `f${i}`, type: 'field', field: p }
        : { id: `p${i}`, ...p }
    ),
  };
}

describe('generateFilename ordering', () => {
  it('follows configured part order', () => {
    expect(
      generateFilename(config(['lastName', 'firstName'], '_'), sample, 'pdf')
    ).toBe('smith_john.pdf');

    expect(
      generateFilename(config(['firstName', 'lastName'], '_'), sample, 'pdf')
    ).toBe('john_smith.pdf');
  });

  it('updates when order changes', () => {
    const a = generateFilename(
      config(['lastName', 'firstName', 'originalName'], '_'),
      sample,
      'pdf'
    );
    expect(a).toBe('smith_john_scan.pdf');

    const b = generateFilename(
      config(['originalName', 'lastName', 'firstName'], '_'),
      sample,
      'pdf'
    );
    expect(b).toBe('scan_smith_john.pdf');
  });
});

describe('missing values', () => {
  it('skips empty parts and does not double separators', () => {
    const data = { firstName: 'John', lastName: '', originalName: 'x.pdf' };
    expect(
      generateFilename(
        config(['firstName', 'lastName', 'originalName'], '_'),
        data,
        'pdf'
      )
    ).toBe('john_x.pdf');
  });

  it('skips null, undefined, and whitespace-only', () => {
    const data = {
      firstName: '  ',
      lastName: null,
      originalName: undefined,
    };
    // all empty → fallback unknown
    expect(generateFilename(config(['firstName', 'lastName', 'originalName'], '_'), data, 'pdf')).toBe(
      'unknown.pdf'
    );
  });
});

describe('static text', () => {
  it('includes static segments in order', () => {
    expect(
      generateFilename(
        config(
          [{ type: 'static', value: 'Invoice' }, 'firstName', 'date'],
          '_'
        ),
        sample,
        'pdf'
      )
    ).toBe('invoice_john_2026-08-10.pdf');
  });
});

describe('separator', () => {
  it('supports underscore, dash, and none', () => {
    expect(generateFilename(config(['firstName', 'lastName'], '_'), sample, 'pdf')).toBe(
      'john_smith.pdf'
    );
    expect(generateFilename(config(['firstName', 'lastName'], '-'), sample, 'pdf')).toBe(
      'john-smith.pdf'
    );
    expect(generateFilename(config(['firstName', 'lastName'], ''), sample, 'pdf')).toBe(
      'johnsmith.pdf'
    );
  });
});

describe('sanitization', () => {
  it('strips invalid filesystem characters', () => {
    expect(sanitizeFilenamePart('a/b:c*d?e"f<g>h|i')).toBe('abcdefghi');
  });

  it('lowercases and removes spaces (existing product behavior)', () => {
    expect(sanitizeFilenamePart('John Michael')).toBe('johnmichael');
  });

  it('applies sanitization during generation', () => {
    expect(
      generateFilename(config(['firstName'], '_'), { firstName: 'Jo/hn' }, 'pdf')
    ).toBe('john.pdf');
  });
});

describe('extension', () => {
  it('normalizes and does not duplicate extension', () => {
    expect(normalizeExtension('.PDF')).toBe('pdf');
    expect(generateFilename(config(['firstName'], '_'), sample, 'pdf')).toBe('john.pdf');
    expect(generateFilename(config(['firstName'], '_'), sample, '.PDF')).toBe('john.pdf');
  });
});

describe('default / migration', () => {
  it('default config reproduces previous firstName.lastName.pdf behavior', () => {
    const def = createDefaultFilenameConfig();
    expect(generateFilename(def, toFilenameData({ name: 'John', surname: 'Doe' }), 'pdf')).toBe(
      'john.doe.pdf'
    );
  });

  it('migrates legacy left/right/prefix/suffix pattern', () => {
    const migrated = migrateLegacyPattern({
      left: 'last',
      right: 'first',
      sep: '_',
      prefix: 'pass',
      suffix: 'v1',
    });

    expect(migrated.separator).toBe('_');
    expect(migrated.parts.map((p) => (p.type === 'field' ? p.field : p.value))).toEqual([
      'pass',
      'lastName',
      'firstName',
      'v1',
    ]);

    expect(
      generateFilename(
        migrated,
        toFilenameData({ name: 'John', surname: 'Smith' }),
        'pdf'
      )
    ).toBe('pass_smith_john_v1.pdf');
  });

  it('normalizeFilenameConfig accepts legacy objects', () => {
    const cfg = normalizeFilenameConfig({
      left: 'first',
      right: 'last',
      sep: '.',
      prefix: '',
      suffix: '',
    });
    expect(generateFilename(cfg, sample, 'pdf')).toBe('john.smith.pdf');
  });

  it('malformed config falls back safely', () => {
    expect(generateFilename(null, sample, 'pdf')).toBe('john.smith.pdf');
    expect(generateFilename({ version: 1, separator: '_', parts: 'bad' }, sample, 'pdf')).toBe(
      'unknown.pdf'
    );
  });
});

describe('date formats', () => {
  it('formats date according to options', () => {
    expect(
      generateFilename(
        {
          version: 1,
          separator: '_',
          parts: [{ id: 'd', type: 'field', field: 'date', options: { format: 'YYYYMMDD' } }],
        },
        sample,
        'pdf'
      )
    ).toBe('20260810.pdf');
  });
});
