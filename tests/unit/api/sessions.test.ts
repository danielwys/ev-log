import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/sessions/[id]/route';
import { auth } from '@/auth';
import { checkWhitelist, updateSession, getSessionById, deleteSession } from '@/lib/db';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  checkWhitelist: vi.fn(),
  updateSession: vi.fn(),
  getSessionById: vi.fn(),
  deleteSession: vi.fn(),
}));

// Helper to create mock request with JSON body
function createMockRequest(body: object, options: { userId?: string } = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as Request;
}

// Helper to create mock params
function createMockParams(id: string) {
  return Promise.resolve({ id });
}

describe('/api/sessions/[id] PUT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when updating as whitelisted user', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);

    const updatedSession = {
      id: 'session-123',
      user_id: 'user-123',
      station_name: 'Updated Station',
      operator: 'Updated Operator',
      notes: 'Updated notes',
      updated_at: '2024-01-02T00:00:00Z',
    };

    vi.mocked(updateSession).mockResolvedValueOnce(updatedSession as any);

    const req = createMockRequest({
      station_name: 'Updated Station',
      notes: 'Updated notes',
    });

    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.station_name).toBe('Updated Station');
    expect(json.data.notes).toBe('Updated notes');
  });

  it('should return 403 when user is not whitelisted', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-456', email: 'unauthorized@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(false);

    const req = createMockRequest({ station_name: 'New Name' });
    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('not whitelisted');
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = createMockRequest({ station_name: 'New Name' });
    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('not authenticated');
  });

  it('should return 500 when update fails', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);
    vi.mocked(updateSession).mockRejectedValueOnce(new Error('Database error'));

    const req = createMockRequest({ station_name: 'New Name' });
    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(500);
  });

  it('should update location when lat/lng provided', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);

    const updatedSession = {
      id: 'session-123',
      location: 'SRID=4326;POINT(103.90 1.40)',
    };

    vi.mocked(updateSession).mockResolvedValueOnce(updatedSession as any);

    const req = createMockRequest({
      latitude: 1.40,
      longitude: 103.90,
    });

    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        location: expect.stringContaining('POINT'),
      })
    );
  });

  it('should handle partial updates correctly', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);

    const updatedSession = {
      id: 'session-123',
      station_name: 'New Name',
    };

    vi.mocked(updateSession).mockResolvedValueOnce(updatedSession as any);

    const req = createMockRequest({ station_name: 'New Name' });
    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({ station_name: 'New Name' })
    );
  });

  it('should handle various field updates', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);
    vi.mocked(updateSession).mockResolvedValueOnce({ id: 'session-123' } as any);

    const req = createMockRequest({
      station_name: 'New Name',
      operator: 'New Operator',
      max_kw: 150,
      battery_start: 30,
      battery_end: 90,
      price_per_kwh: 0.55,
      notes: 'Updated notes',
    });

    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        station_name: 'New Name',
        operator: 'New Operator',
        max_kw: 150,
        battery_start: 30,
        battery_end: 90,
        price_per_kwh: 0.55,
        notes: 'Updated notes',
      })
    );
  });

  it('should handle boolean and array fields', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(checkWhitelist).mockResolvedValueOnce(true);
    vi.mocked(updateSession).mockResolvedValueOnce({ id: 'session-123' } as any);

    const req = createMockRequest({
      technique_required: true,
      technique_notes: 'Tap card twice',
      connectors_tried: ['CCS2', 'CHAdeMO'],
      successful_connectors: ['CCS2'],
    });

    const res = await PUT(req as any, { params: createMockParams('session-123') });

    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        technique_required: true,
        technique_notes: 'Tap card twice',
        connectors_tried: ['CCS2', 'CHAdeMO'],
        successful_connectors: ['CCS2'],
      })
    );
  });
});
