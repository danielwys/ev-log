import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getSessionImages,
  createSessionImage,
  deleteSessionImage,
  getPlugShareCache,
  createPlugShareCache,
  checkWhitelist,
  checkWhitelistByEmail,
} from '@/lib/db';
import type { Session, InsertSession, InsertSessionImage, SessionImage, PlugShareCache } from '@/lib/db';

describe('getSessions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success case with mock response - should return array of sessions', async () => {
    const mockSessions: Session[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user-1',
        user_email: 'test@example.com',
        station_name: 'Test Station',
        operator: 'Shell',
        max_kw: 120,
        battery_start: 20,
        battery_end: 80,
        location: 'POINT(103.85 1.35)',
        photos: ['photo1.jpg'],
        notes: 'Test notes',
        created_at: '2026-03-31T10:00:00Z',
        updated_at: '2026-03-31T10:00:00Z',
        charger_hardware_model: 'Schneider',
        charger_software: 'v1.0',
        cable_amp_limit: 32,
        stall_id: 'A1',
        plug_id: 'CCS2-1',
        connectors_tried: ['CCS2'],
        successful_connectors: ['CCS2'],
        attempts: 1,
        successes: 1,
        error_code: null,
        failure_type: null,
        technique_required: false,
        technique_notes: null,
        price_per_kwh: 0.44,
        pin_color: 'green',
        kwh_delivered: 45.2,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSessions,
    } as Response);

    const result = await getSessions();
    expect(result).toEqual(mockSessions);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions'),
      expect.any(Object)
    );
  });

  it('empty response - should return empty array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await getSessions();
    expect(result).toEqual([]);
  });

  it('network error handling - should throw error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(getSessions()).rejects.toThrow('Network error');
  });

  it('non-ok response - should throw error with status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(getSessions()).rejects.toThrow('Failed to fetch sessions');
  });
});

describe('getSessionById()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success case - should return session', async () => {
    const mockSession: Session = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 'user-1',
      user_email: 'test@example.com',
      station_name: 'Test Station',
      operator: 'Shell',
      max_kw: 120,
      battery_start: 20,
      battery_end: 80,
      location: 'POINT(103.85 1.35)',
      photos: [],
      notes: null,
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
      charger_hardware_model: null,
      charger_software: null,
      cable_amp_limit: null,
      stall_id: null,
      plug_id: null,
      connectors_tried: [],
      successful_connectors: [],
      attempts: 1,
      successes: 1,
      error_code: null,
      failure_type: null,
      technique_required: false,
      technique_notes: null,
      price_per_kwh: null,
      pin_color: 'green',
      kwh_delivered: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockSession],
    } as Response);

    const result = await getSessionById('123e4567-e89b-12d3-a456-426614174000');
    expect(result).toEqual(mockSession);
  });

  it('non-existent ID - should return null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await getSessionById('non-existent-id');
    expect(result).toBeNull();
  });
});

describe('createSession()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const newSession: InsertSession = {
    user_id: 'user-1',
    user_email: 'test@example.com',
    station_name: 'New Station',
    operator: 'BP',
    max_kw: 150,
    battery_start: 10,
    battery_end: 70,
    location: 'SRID=4326;POINT(103.85 1.35)',
  };

  it('success case - should create and return session', async () => {
    const createdSession: Session = {
      ...newSession,
      id: 'new-uuid-1234',
      photos: [],
      notes: null,
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
      charger_hardware_model: null,
      charger_software: null,
      cable_amp_limit: null,
      stall_id: null,
      plug_id: null,
      connectors_tried: [],
      successful_connectors: [],
      attempts: 1,
      successes: 0,
      error_code: null,
      failure_type: null,
      technique_required: false,
      technique_notes: null,
      price_per_kwh: null,
      pin_color: 'red',
      kwh_delivered: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [createdSession],
    } as Response);

    const result = await createSession(newSession);
    expect(result).toEqual(createdSession);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newSession),
      })
    );
  });

  it('validation error before API call - should handle gracefully', async () => {
    // This test ensures the function validates input before making API call
    // If validation is handled elsewhere, the function should still reject
    const invalidSession = {
      ...newSession,
      station_name: '', // Invalid - empty string
    };

    // If there's client-side validation, it would throw here
    // Otherwise, the API will return an error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Validation failed: station_name is required',
    } as Response);

    await expect(createSession(invalidSession)).rejects.toThrow();
  });

  it('API error - should throw with error message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Database connection failed',
    } as Response);

    await expect(createSession(newSession)).rejects.toThrow('Failed to create session');
  });
});

describe('updateSession()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success case - should update and return session', async () => {
    const updates = { station_name: 'Updated Station', max_kw: 180 };
    const updatedSession: Session = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 'user-1',
      user_email: 'test@example.com',
      station_name: 'Updated Station',
      operator: 'Shell',
      max_kw: 180,
      battery_start: 20,
      battery_end: 80,
      location: 'POINT(103.85 1.35)',
      photos: [],
      notes: null,
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T11:00:00Z',
      charger_hardware_model: null,
      charger_software: null,
      cable_amp_limit: null,
      stall_id: null,
      plug_id: null,
      connectors_tried: [],
      successful_connectors: [],
      attempts: 1,
      successes: 1,
      error_code: null,
      failure_type: null,
      technique_required: false,
      technique_notes: null,
      price_per_kwh: null,
      pin_color: 'green',
      kwh_delivered: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [updatedSession],
    } as Response);

    const result = await updateSession('123e4567-e89b-12d3-a456-426614174000', updates);
    expect(result).toEqual(updatedSession);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions?id=eq.'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    );
  });

  it('404 for non-existent ID - should handle gracefully', async () => {
    const updates = { station_name: 'Updated Station' };

    // PostgREST returns 200 with empty array for non-existent rows with PATCH
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    // Should return undefined or handle empty array
    const result = await updateSession('non-existent-id', updates);
    expect(result).toBeUndefined();
  });
});

describe('deleteSession()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success case - should delete without error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as Response);

    await expect(deleteSession('123e4567-e89b-12d3-a456-426614174000')).resolves.not.toThrow();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions?id=eq.'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('non-existent ID - should throw error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as Response);

    await expect(deleteSession('non-existent-id')).rejects.toThrow('Failed to delete session');
  });
});

describe('getSessionImages()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns images for session - should return array of images', async () => {
    const mockImages: SessionImage[] = [
      {
        id: 'img-1',
        session_id: 'session-1',
        original_path: '/images/session-1/original.jpg',
        webp_path: '/images/session-1/webp.webp',
        thumbnail_path: '/images/session-1/thumb.webp',
        original_filename: 'original.jpg',
        file_size_bytes: 1024000,
        webp_size_bytes: 512000,
        thumbnail_size_bytes: 64000,
        width: 1920,
        height: 1080,
        mime_type: 'image/jpeg',
        created_at: '2026-03-31T10:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockImages,
    } as Response);

    const result = await getSessionImages('session-1');
    expect(result).toEqual(mockImages);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/session_images?session_id=eq.session-1'),
      expect.any(Object)
    );
  });

  it('no images for session - should return empty array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await getSessionImages('session-with-no-images');
    expect(result).toEqual([]);
  });
});

describe('createSessionImage()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates with all paths - should create and return image', async () => {
    const newImage: InsertSessionImage = {
      session_id: 'session-1',
      original_path: '/images/session-1/original.jpg',
      webp_path: '/images/session-1/webp.webp',
      thumbnail_path: '/images/session-1/thumb.webp',
      original_filename: 'photo.jpg',
      file_size_bytes: 1024000,
      webp_size_bytes: 512000,
      thumbnail_size_bytes: 64000,
      width: 1920,
      height: 1080,
      mime_type: 'image/jpeg',
    };

    const createdImage: SessionImage = {
      ...newImage,
      id: 'img-123',
      created_at: '2026-03-31T10:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [createdImage],
    } as Response);

    const result = await createSessionImage(newImage);
    expect(result).toEqual(createdImage);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/session_images'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newImage),
      })
    );
  });

  it('API error - should throw with error message', async () => {
    const newImage: InsertSessionImage = {
      session_id: 'session-1',
      original_path: '/images/test.jpg',
      webp_path: '/images/test.webp',
      thumbnail_path: '/images/test-thumb.webp',
      original_filename: 'test.jpg',
      file_size_bytes: 1000,
      width: 100,
      height: 100,
      mime_type: 'image/jpeg',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Foreign key constraint failed',
    } as Response);

    await expect(createSessionImage(newImage)).rejects.toThrow('Failed to create session image');
  });
});

describe('deleteSessionImage()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success case - should delete without error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as Response);

    await expect(deleteSessionImage('img-1')).resolves.not.toThrow();
  });
});

describe('PlugShare Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPlugShareCache - should return cache entry', async () => {
    const mockCache: PlugShareCache = {
      id: 'cache-1',
      plugshare_id: '123456',
      name: 'Shell Station',
      address: '123 Main St',
      latitude: 1.35,
      longitude: 103.85,
      operator: 'Shell',
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockCache],
    } as Response);

    const result = await getPlugShareCache('123456');
    expect(result).toEqual(mockCache);
  });

  it('getPlugShareCache - non-existent should return null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await getPlugShareCache('non-existent');
    expect(result).toBeNull();
  });

  it('createPlugShareCache - should create cache entry', async () => {
    const newCache = {
      plugshare_id: '789012',
      name: 'BP Station',
      address: '456 Oak Rd',
      latitude: 1.36,
      longitude: 103.86,
      operator: 'BP',
    };

    const createdCache: PlugShareCache = {
      ...newCache,
      id: 'cache-new',
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [createdCache],
    } as Response);

    const result = await createPlugShareCache(newCache);
    expect(result).toEqual(createdCache);
  });
});

describe('Whitelist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checkWhitelist - whitelisted user should return true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ user_id: 'user-1' }],
    } as Response);

    const result = await checkWhitelist('user-1');
    expect(result).toBe(true);
  });

  it('checkWhitelist - non-whitelisted user should return false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await checkWhitelist('user-not-in-list');
    expect(result).toBe(false);
  });

  it('checkWhitelistByEmail - whitelisted email should return true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ email: 'test@example.com' }],
    } as Response);

    const result = await checkWhitelistByEmail('test@example.com');
    expect(result).toBe(true);
  });

  it('checkWhitelistByEmail - non-whitelisted email should return false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await checkWhitelistByEmail('not@whitelisted.com');
    expect(result).toBe(false);
  });

  it('checkWhitelist - API error should return false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as Response);

    const result = await checkWhitelist('user-1');
    expect(result).toBe(false);
  });
});
