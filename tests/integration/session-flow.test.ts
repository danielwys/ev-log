import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as AGENT_POST } from '@/app/api/sessions/agent-create/route';
import { PUT, GET, DELETE } from '@/app/api/sessions/[id]/route';
import { auth } from '@/auth';
import { createSessionAsService, getSessionById, updateSession, deleteSession, checkWhitelist } from '@/lib/db';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  createSessionAsService: vi.fn(),
  getSessionById: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  checkWhitelist: vi.fn(),
}));

// Helper functions
function createMockJsonRequest(body: object) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as Request;
}

function createMockParams(id: string) {
  return Promise.resolve({ id });
}

describe('Session Flow Integration', () => {
  // Must match the API key set in setup.ts before route was imported
  const TEST_API_KEY = process.env.AGENT_API_KEY || 'test-api-key-123456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Full CRUD Flow', () => {
    it('should complete full session lifecycle: create via agent API', async () => {
      // Create session via agent API
      const newSession = {
        id: 'session-flow-001',
        user_id: 'service-agent',
        user_email: 'agent@local',
        station_name: 'Electree Cypress',
        operator: 'Electree',
        max_kw: 82.5,
        battery_start: 38.0,
        battery_end: 80.0,
        location: 'SRID=4326;POINT(103.8198 1.3521)',
        photos: [],
        notes: 'Initial session',
        created_at: '2024-03-20T14:30:00Z',
        updated_at: '2024-03-20T14:30:00Z',
      };

      vi.mocked(createSessionAsService).mockResolvedValueOnce(newSession as any);

      const createReq = {
        json: vi.fn().mockResolvedValue({
          station_name: 'Electree Cypress',
          operator: 'Electree',
          max_kw: 82.5,
          battery_start: 38.0,
          battery_end: 80.0,
          latitude: 1.3521,
          longitude: 103.8198,
          notes: 'Initial session',
        }),
        headers: new Headers({ 'X-API-Key': TEST_API_KEY }),
      } as unknown as Request;

      const createRes = await AGENT_POST(createReq as any);

      expect(createRes.status).toBe(200);
      const createJson = await createRes.json();
      expect(createJson.success).toBe(true);
      expect(createJson.session_id).toBe('session-flow-001');

      // Verify createSessionAsService was called with correct data
      expect(createSessionAsService).toHaveBeenCalledWith(
        expect.objectContaining({
          station_name: 'Electree Cypress',
          operator: 'Electree',
          user_id: 'service-agent',
        })
      );
    });

    it('should handle multi-session creation', async () => {
      const sessions = [
        { id: 'multi-001', station_name: 'Shell Recharge A', operator: 'Shell', max_kw: 82.5 },
        { id: 'multi-002', station_name: 'SP Charging B', operator: 'SP', max_kw: 50 },
        { id: 'multi-003', station_name: 'Charge+ C', operator: 'Charge+', max_kw: 120 },
      ];

      for (const session of sessions) {
        vi.mocked(createSessionAsService).mockResolvedValueOnce({
          id: session.id,
          user_id: 'service-agent',
          station_name: session.station_name,
          operator: session.operator,
          max_kw: session.max_kw,
          battery_start: 20,
          battery_end: 80,
          location: 'SRID=4326;POINT(103.85 1.35)',
        } as any);

        const req = {
          json: vi.fn().mockResolvedValue({
            station_name: session.station_name,
            operator: session.operator,
            max_kw: session.max_kw,
            battery_start: 20,
            battery_end: 80,
            latitude: 1.35,
            longitude: 103.85,
          }),
          headers: new Headers({ 'X-API-Key': TEST_API_KEY }),
        } as unknown as Request;

        const res = await AGENT_POST(req as any);
        expect(res.status).toBe(200);
      }

      // Verify all sessions were created
      expect(createSessionAsService).toHaveBeenCalledTimes(3);
    });

    it('should enforce authorization rules', async () => {
      // Create session as agent
      const session = {
        id: 'auth-test-001',
        user_id: 'service-agent',
        station_name: 'Test Station',
      };

      vi.mocked(createSessionAsService).mockResolvedValueOnce(session as any);

      const createReq = {
        json: vi.fn().mockResolvedValue({
          station_name: 'Test Station',
          operator: 'TestOp',
          max_kw: 50,
          battery_start: 20,
          battery_end: 80,
          latitude: 1.35,
          longitude: 103.85,
        }),
        headers: new Headers({ 'X-API-Key': TEST_API_KEY }),
      } as unknown as Request;

      const createRes = await AGENT_POST(createReq as any);
      expect(createRes.status).toBe(200);

      // Try to update without authentication
      vi.mocked(auth).mockResolvedValueOnce(null);

      const updateReq = createMockJsonRequest({ station_name: 'Hacked' });
      const updateRes = await PUT(updateReq as any, { params: createMockParams('auth-test-001') });

      expect(updateRes.status).toBe(401);

      // Try to update without whitelist
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'unauthorized-user', email: 'hacker@example.com' },
      } as any);

      vi.mocked(checkWhitelist).mockResolvedValueOnce(false);

      const updateReq2 = createMockJsonRequest({ station_name: 'Hacked' });
      const updateRes2 = await PUT(updateReq2 as any, { params: createMockParams('auth-test-001') });

      expect(updateRes2.status).toBe(403);
    });

    it('should update session as whitelisted user', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any);

      vi.mocked(checkWhitelist).mockResolvedValueOnce(true);

      const updatedSession = {
        id: 'update-test-001',
        station_name: 'Updated Name',
        notes: 'Updated notes',
        price_per_kwh: 0.55,
      };

      vi.mocked(updateSession).mockResolvedValueOnce(updatedSession as any);

      const req = createMockJsonRequest({
        station_name: 'Updated Name',
        notes: 'Updated notes',
        price_per_kwh: 0.55,
      });

      const res = await PUT(req as any, { params: createMockParams('update-test-001') });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.station_name).toBe('Updated Name');
    });
  });
});
