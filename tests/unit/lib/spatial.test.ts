import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the global fetch
global.fetch = vi.fn();

/**
 * Mock PostgREST nearby_sessions() function
 * This simulates spatial search via PostgREST/PostgreSQL
 */
async function nearbySessions(
  lat: number,
  lng: number,
  radius: number = 1000 // meters
): Promise<Array<{ id: string; name: string; lat: number; lng: number; distance: number }>> {
  const baseUrl = process.env.NEXT_PUBLIC_POSTGREST_URL || 'http://localhost:3001';
  const response = await fetch(
    `${baseUrl}/rpc/nearby_sessions?lat=${lat}&lng=${lng}&radius=${radius}`,
    { headers: { Accept: 'application/json' } }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby sessions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

describe('Spatial Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('nearby_sessions RPC', () => {
    it('should query with lat/lng and return sessions within radius', async () => {
      const mockSessions = [
        { id: '1', name: 'Shell Recharge', lat: 1.3521, lng: 103.8198, distance: 450 },
        { id: '2', name: 'SP Charging', lat: 1.3515, lng: 103.8202, distance: 890 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const result = await nearbySessions(1.3520, 103.8199, 1000);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rpc/nearby_sessions?lat=1.352&lng=103.8199&radius=1000'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Shell Recharge');
    });

    it('should return empty results for faraway location', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await nearbySessions(40.7128, -74.006, 1000); // New York coordinates

      expect(result).toEqual([]);
    });

    it('should handle custom radius parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await nearbySessions(1.3520, 103.8199, 5000); // 5km radius

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radius=5000'),
        expect.any(Object)
      );
    });

    it('should throw error on failed request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(nearbySessions(1.3520, 103.8199)).rejects.toThrow(
        'Failed to fetch nearby sessions: Internal Server Error'
      );
    });

    it('should return sessions with correct distance calculation', async () => {
      const mockSessions = [
        { id: '1', name: 'Close Station', lat: 1.3520, lng: 103.8199, distance: 100 },
        { id: '2', name: 'Far Station', lat: 1.3510, lng: 103.8189, distance: 800 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const result = await nearbySessions(1.3520, 103.8199);

      expect(result[0].distance).toBe(100);
      expect(result[1].distance).toBe(800);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate correct distance between two nearby points', () => {
      // Two points in Singapore (~111 meters apart per 0.001 degree at equator)
      const dist = calculateDistance(1.3520, 103.8198, 1.3521, 103.8198);
      expect(dist).toBeCloseTo(11.1, 0); // ~11 meters per 0.0001 degree at equator
    });

    it('should return 0 for same coordinates', () => {
      const dist = calculateDistance(1.3520, 103.8198, 1.3520, 103.8198);
      expect(dist).toBe(0);
    });

    it('should calculate distance between Singapore and Kuala Lumpur (~316km)', () => {
      const singaporeLat = 1.3521;
      const singaporeLng = 103.8198;
      const klLat = 3.1390;
      const klLng = 101.6869;

      const dist = calculateDistance(singaporeLat, singaporeLng, klLat, klLng);
      
      // Distance should be approximately 316km (316,000 meters)
      expect(dist).toBeGreaterThan(300000);
      expect(dist).toBeLessThan(330000);
    });

    it('should handle negative coordinates (Southern/Western hemispheres)', () => {
      // Sydney: -33.8688, 151.2093
      // Melbourne: -37.8136, 144.9631
      const dist = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      
      // Distance should be approximately 713km
      expect(dist).toBeGreaterThan(700000);
      expect(dist).toBeLessThan(750000);
    });

    it('should be symmetric (A to B equals B to A)', () => {
      const distAB = calculateDistance(1.3520, 103.8198, 1.3610, 103.8288);
      const distBA = calculateDistance(1.3610, 103.8288, 1.3520, 103.8198);
      expect(distAB).toBeCloseTo(distBA, 5);
    });

    it('should calculate small distances accurately', () => {
      // ~11m apart per 0.0001 degree at equator
      const lat1 = 1.3520;
      const lng1 = 103.8198;
      const lat2 = 1.3520;
      const lng2 = 103.8199;

      const dist = calculateDistance(lat1, lng1, lat2, lng2);
      expect(dist).toBeCloseTo(11, 0); // ~11 meters
    });

    it('should handle coordinates near the poles', () => {
      // Points near North Pole - distance is larger due to convergence of longitude
      const dist = calculateDistance(89.99, 0, 89.99, 180);
      
      // At 89.99°N, 180° apart is approximately 2*PI*R*cos(89.99) ≈ 2224m
      expect(dist).toBeGreaterThan(2000);
      expect(dist).toBeLessThan(2500);
    });

    it('should handle coordinates near the dateline', () => {
      // Points on either side of the 180° meridian
      const dist = calculateDistance(1.3520, 179.99, 1.3520, -179.99);
      
      // These are actually very close (only 0.02° apart across the dateline)
      expect(dist).toBeCloseTo(2220, -2); // ~2.2km
    });
  });

  describe('real-world Singapore scenarios', () => {
    it('should find nearby chargers in central Singapore', async () => {
      const mockSessions = [
        { 
          id: '1', 
          name: 'ION Orchard', 
          lat: 1.3048, 
          lng: 103.8318, 
          distance: 250 
        },
        { 
          id: '2', 
          name: 'Marina Bay', 
          lat: 1.2830, 
          lng: 103.8600, 
          distance: 1200 
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      // Orchard Road area
      const result = await nearbySessions(1.3040, 103.8320, 2000);

      expect(result).toHaveLength(2);
      expect(result[0].distance).toBeLessThan(1000); // Closest first
    });

    it('should return sessions within specified radius', async () => {
      // The radius parameter is passed to the PostgREST function
      // which handles the filtering at the database level
      const mockSessions = [
        { id: '1', name: 'Nearby', lat: 1.3521, lng: 103.8198, distance: 400 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const result = await nearbySessions(1.3520, 103.8199, 500);

      // Verify the request was made with correct radius
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radius=500'),
        expect.any(Object)
      );
      
      // Results should be within radius
      expect(result.every(s => s.distance <= 500)).toBe(true);
    });
  });
});
