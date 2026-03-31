import { describe, it, expect } from 'vitest';
import {
  sessionSchema,
  extractPlugShareId,
  parseWktPoint,
  wktPoint,
  calculatePinColor,
} from '@/lib/validation';

describe('sessionSchema.parse()', () => {
  const validSession = {
    station_name: 'Test Station',
    operator: 'Test Operator',
    max_kw: 120,
    battery_start: 20,
    battery_end: 80,
    latitude: 1.35,
    longitude: 103.85,
    notes: 'Test notes',
    photos: ['photo1.jpg', 'photo2.jpg'],
    charger_hardware_model: 'Test Model',
    charger_software: 'v1.0',
    cable_amp_limit: 32,
    stall_id: 'A1',
    plug_id: 'CCS2-1',
    connectors_tried: ['CCS2'],
    successful_connectors: ['CCS2'],
    attempts: 1,
    successes: 1,
    error_code: undefined,
    failure_type: undefined,
    technique_required: false,
    technique_notes: undefined,
    price_per_kwh: 0.44,
    kwh_delivered: 45.2,
  };

  it('valid complete session - should parse successfully', () => {
    const result = sessionSchema.parse(validSession);
    expect(result).toBeDefined();
    expect(result.station_name).toBe('Test Station');
    expect(result.operator).toBe('Test Operator');
    expect(result.max_kw).toBe(120);
    expect(result.battery_start).toBe(20);
    expect(result.battery_end).toBe(80);
    expect(result.latitude).toBe(1.35);
    expect(result.longitude).toBe(103.85);
    expect(result.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result.attempts).toBe(1);
    expect(result.successes).toBe(1);
  });

  it('invalid battery_start > 100 - should throw error', () => {
    const invalid = { ...validSession, battery_start: 101 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid battery_start < 0 - should throw error', () => {
    const invalid = { ...validSession, battery_start: -1 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid battery_end > 100 - should throw error', () => {
    const invalid = { ...validSession, battery_end: 150 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid battery_end < 0 - should throw error', () => {
    const invalid = { ...validSession, battery_end: -5 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('missing required field station_name - should throw error', () => {
    const { station_name: _, ...missing } = validSession;
    expect(() => sessionSchema.parse(missing)).toThrow();
  });

  it('missing required field operator - should throw error', () => {
    const { operator: _, ...missing } = validSession;
    expect(() => sessionSchema.parse(missing)).toThrow();
  });

  it('empty station_name - should throw error', () => {
    const invalid = { ...validSession, station_name: '' };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('empty operator - should throw error', () => {
    const invalid = { ...validSession, operator: '' };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid latitude > 90 - should throw error', () => {
    const invalid = { ...validSession, latitude: 91 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid latitude < -90 - should throw error', () => {
    const invalid = { ...validSession, latitude: -91 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid longitude > 180 - should throw error', () => {
    const invalid = { ...validSession, longitude: 181 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('invalid longitude < -180 - should throw error', () => {
    const invalid = { ...validSession, longitude: -181 };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('decimal battery percentages - should parse successfully', () => {
    const decimalSession = { ...validSession, battery_start: 38.9, battery_end: 82.5 };
    const result = sessionSchema.parse(decimalSession);
    expect(result.battery_start).toBe(38.9);
    expect(result.battery_end).toBe(82.5);
  });

  it('string battery values - should parse and convert', () => {
    const stringSession = { ...validSession, battery_start: '25', battery_end: '75' };
    const result = sessionSchema.parse(stringSession);
    expect(result.battery_start).toBe(25);
    expect(result.battery_end).toBe(75);
  });

  it('string max_kw - should parse and convert to number', () => {
    const stringSession = { ...validSession, max_kw: '150' };
    const result = sessionSchema.parse(stringSession);
    expect(result.max_kw).toBe(150);
  });

  it('optional fields can be undefined', () => {
    const minimal = {
      station_name: 'Minimal Station',
      operator: 'Test Operator',
      max_kw: 100,
      battery_start: 10,
      battery_end: 60,
      latitude: 1.3,
      longitude: 103.8,
    };
    const result = sessionSchema.parse(minimal);
    expect(result).toBeDefined();
    expect(result.notes).toBeUndefined();
    expect(result.photos).toEqual([]);
  });

  it('invalid failure_type - should throw error', () => {
    const invalid = { ...validSession, failure_type: 'invalid_type' };
    expect(() => sessionSchema.parse(invalid)).toThrow();
  });

  it('valid failure_type values - should parse successfully', () => {
    const validTypes = ['handshake', 'derating', 'interruption', 'incompatible', 'other'];
    for (const type of validTypes) {
      const valid = { ...validSession, failure_type: type };
      const result = sessionSchema.parse(valid);
      expect(result.failure_type).toBe(type);
    }
  });

  it('empty string failure_type - should convert to undefined', () => {
    const session = { ...validSession, failure_type: '' };
    const result = sessionSchema.parse(session);
    expect(result.failure_type).toBeUndefined();
  });

  it('null failure_type - should convert to undefined', () => {
    const session = { ...validSession, failure_type: null };
    const result = sessionSchema.parse(session);
    expect(result.failure_type).toBeUndefined();
  });
});

describe('extractPlugShareId()', () => {
  it('valid URL with /location/ prefix - should extract ID', () => {
    const url = 'https://www.plugshare.com/location/123456';
    expect(extractPlugShareId(url)).toBe('123456');
  });

  it('valid URL with query param - should extract ID', () => {
    const url = 'https://www.plugshare.com/?location=abc123-def';
    expect(extractPlugShareId(url)).toBe('abc123-def');
  });

  it('valid URL with full path - should extract ID', () => {
    const url = 'https://www.plugshare.com/singapore/shell-recharge-somewhere/location/789012';
    expect(extractPlugShareId(url)).toBe('789012');
  });

  it('URL without location - should return null', () => {
    const url = 'https://www.plugshare.com/';
    expect(extractPlugShareId(url)).toBeNull();
  });

  it('URL without location pattern - should return null', () => {
    const url = 'https://www.google.com/search?q=chargers';
    expect(extractPlugShareId(url)).toBeNull();
  });

  it('empty string - should return null', () => {
    expect(extractPlugShareId('')).toBeNull();
  });

  it('null input - should throw or return null', () => {
    expect(() => extractPlugShareId(null as unknown as string)).toThrow();
  });

  it('URL with only location path - should extract ID', () => {
    const url = '/location/555666';
    expect(extractPlugShareId(url)).toBe('555666');
  });

  it('malformed URL - should return null', () => {
    const url = 'plugshare.com/not-a-location/123';
    expect(extractPlugShareId(url)).toBeNull();
  });
});

describe('parseWktPoint()', () => {
  it('valid POINT string with SRID - should parse correctly', () => {
    const wkt = 'SRID=4326;POINT(103.85 1.35)';
    const result = parseWktPoint(wkt);
    expect(result.lat).toBe(1.35);
    expect(result.lng).toBe(103.85);
  });

  it('valid POINT string without SRID - should parse correctly', () => {
    const wkt = 'POINT(103.85 1.35)';
    const result = parseWktPoint(wkt);
    expect(result.lat).toBe(1.35);
    expect(result.lng).toBe(103.85);
  });

  it('negative coordinates - should parse correctly', () => {
    const wkt = 'POINT(-74.006 40.7128)';
    const result = parseWktPoint(wkt);
    expect(result.lat).toBe(40.7128);
    expect(result.lng).toBe(-74.006);
  });

  it('decimal coordinates - should parse correctly', () => {
    const wkt = 'POINT(103.819836 1.352083)';
    const result = parseWktPoint(wkt);
    expect(result.lat).toBeCloseTo(1.352083, 6);
    expect(result.lng).toBeCloseTo(103.819836, 6);
  });

  it('invalid format - should throw error', () => {
    const wkt = 'INVALID_FORMAT';
    expect(() => parseWktPoint(wkt)).toThrow();
  });

  it('empty string - should throw error', () => {
    expect(() => parseWktPoint('')).toThrow();
  });

  it('null input - should throw error', () => {
    expect(() => parseWktPoint(null as unknown as string)).toThrow();
  });

  it('undefined input - should throw error', () => {
    expect(() => parseWktPoint(undefined as unknown as string)).toThrow();
  });

  it('malformed POINT with missing parenthesis - should throw error', () => {
    const wkt = 'POINT 103.85 1.35';
    expect(() => parseWktPoint(wkt)).toThrow();
  });

  it('malformed POINT with only one coordinate - should throw error', () => {
    const wkt = 'POINT(103.85)';
    expect(() => parseWktPoint(wkt)).toThrow();
  });

  it('WKB hex format - should parse without throwing', () => {
    // WKB hex string for a point (at least 40 hex chars = 20 bytes)
    // We verify the parser attempts WKB parsing for hex strings
    const wkbHex = '0101000000e610000085eb51b81e295940000000000000f83f';
    // Just verify it doesn't throw - actual coordinate values depend on buffer layout
    expect(() => parseWktPoint(wkbHex)).not.toThrow();
  });
});

describe('wktPoint()', () => {
  it('valid numbers - should create WKT string', () => {
    const result = wktPoint(1.35, 103.85);
    expect(result).toBe('SRID=4326;POINT(103.85 1.35)');
  });

  it('string coordinates - should parse and create WKT string', () => {
    const result = wktPoint('1.35', '103.85');
    expect(result).toBe('SRID=4326;POINT(103.85 1.35)');
  });

  it('negative coordinates - should create WKT string', () => {
    const result = wktPoint(40.7128, -74.006);
    expect(result).toBe('SRID=4326;POINT(-74.006 40.7128)');
  });

  it('invalid string - should throw error', () => {
    expect(() => wktPoint('invalid', 103.85)).toThrow();
  });
});

describe('calculatePinColor()', () => {
  it('technique_required true - should return yellow', () => {
    expect(calculatePinColor(5, 5, true)).toBe('yellow');
  });

  it('attempts 0 - should return yellow', () => {
    expect(calculatePinColor(0, 0, false)).toBe('yellow');
  });

  it('100% success rate - should return green', () => {
    expect(calculatePinColor(5, 5, false)).toBe('green');
  });

  it('success rate > 0.75 - should return green', () => {
    expect(calculatePinColor(5, 4, false)).toBe('green');
  });

  it('success rate exactly 0.75 - should return yellow', () => {
    expect(calculatePinColor(4, 3, false)).toBe('yellow');
  });

  it('success rate 0.5 - should return yellow', () => {
    expect(calculatePinColor(4, 2, false)).toBe('yellow');
  });

  it('success rate 0.25 - should return yellow', () => {
    expect(calculatePinColor(4, 1, false)).toBe('yellow');
  });

  it('success rate < 0.25 - should return red', () => {
    expect(calculatePinColor(4, 0, false)).toBe('red');
  });

  it('zero successes with multiple attempts - should return red', () => {
    expect(calculatePinColor(3, 0, false)).toBe('red');
  });

  it('single attempt success - should return green', () => {
    expect(calculatePinColor(1, 1, false)).toBe('green');
  });

  it('single attempt failure - should return red', () => {
    expect(calculatePinColor(1, 0, false)).toBe('red');
  });
});
