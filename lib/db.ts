// Database types matching the Postgres schema
export type FailureType = 'handshake' | 'derating' | 'interruption' | 'incompatible' | 'other';
export type PinColor = 'green' | 'yellow' | 'red';

export interface Session {
  id: string;
  user_id: string;
  user_email: string;
  station_name: string;
  operator: string;
  max_kw: number;
  battery_start: number;
  battery_end: number;
  location: string;  // WKT format: POINT(lng lat)
  photos: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  charger_hardware_model: string | null;
  charger_software: string | null;
  cable_amp_limit: number | null;
  stall_id: string | null;
  plug_id: string | null;
  connectors_tried: string[];
  successful_connectors: string[];
  attempts: number;
  successes: number;
  error_code: string | null;
  failure_type: FailureType | null;
  technique_required: boolean;
  technique_notes: string | null;
  price_per_kwh: number | null;
  pin_color: PinColor;
  kwh_delivered: number | null;
}

export interface SessionImage {
  id: string;
  session_id: string;
  original_path: string;
  webp_path: string;
  thumbnail_path: string;
  original_filename: string;
  file_size_bytes: number;
  webp_size_bytes: number | null;
  thumbnail_size_bytes: number | null;
  width: number;
  height: number;
  mime_type: string;
  created_at: string;
}

export interface InsertSessionImage {
  id?: string;
  session_id: string;
  original_path: string;
  webp_path: string;
  thumbnail_path: string;
  original_filename: string;
  file_size_bytes: number;
  webp_size_bytes?: number | null;
  thumbnail_size_bytes?: number | null;
  width: number;
  height: number;
  mime_type: string;
}

export interface InsertSession {
  id?: string;
  user_id: string;
  user_email: string;
  station_name: string;
  operator: string;
  max_kw: number;
  battery_start: number;
  battery_end: number;
  location: string;  // WKT format: SRID=4326;POINT(lng lat)
  photos?: string[];
  notes?: string | null;
  charger_hardware_model?: string | null;
  charger_software?: string | null;
  cable_amp_limit?: number | null;
  stall_id?: string | null;
  plug_id?: string | null;
  connectors_tried?: string[];
  successful_connectors?: string[];
  attempts?: number;
  successes?: number;
  error_code?: string | null;
  failure_type?: FailureType | null;
  technique_required?: boolean;
  technique_notes?: string | null;
  price_per_kwh?: number | null;
  kwh_delivered?: number | null;
}

export interface LocationGroup {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sessionCount: number;
  sessions: Session[];
  pinColor: PinColor;
}

export interface PlugShareCache {
  id: string;
  plugshare_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  operator: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWhitelist {
  user_id: string;
  email: string;
  created_at: string;
}

// PostgREST API client
// Use NEXT_PUBLIC_POSTGREST_URL for client-side, POSTGREST_URL for server-side
const getPostgrestUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: use public URL
    return process.env.NEXT_PUBLIC_POSTGREST_URL || "http://localhost:3001";
  }
  // Server-side: use internal URL if available, otherwise public URL
  return process.env.POSTGREST_URL || process.env.NEXT_PUBLIC_POSTGREST_URL || "http://localhost:3001";
};

async function fetchFromPostgREST(
  endpoint: string,
  options: RequestInit = {},
  jwtToken?: string
): Promise<Response> {
  const url = `${getPostgrestUrl()}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add JWT token if provided
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Generate a JWT token for the service account
 * This allows the agent to create sessions with authenticated role
 */
function generateServiceJWT(): string {
  const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
  
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    role: "authenticated",
    user_id: "service-agent",
    email: "agent@local",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    iat: Math.floor(Date.now() / 1000),
  })).toString("base64url");
  
  // Create signature using HMAC-SHA256
  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Create session with service account authentication
 * Used by the agent service endpoint
 */
export async function createSessionAsService(
  session: InsertSession
): Promise<Session> {
  const jwtToken = generateServiceJWT();
  
  const response = await fetchFromPostgREST(
    "/sessions",
    {
      method: "POST",
      body: JSON.stringify(session),
      headers: {
        Prefer: "return=representation",
      },
    },
    jwtToken
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create session: ${errorText}`);
  }

  const data = await response.json();
  return data[0];
}

// Sessions API
export async function getSessions(): Promise<Session[]> {
  const response = await fetchFromPostgREST(
    "/sessions?select=*&order=created_at.desc"
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  return response.json();
}

export async function getSessionById(id: string): Promise<Session | null> {
  const response = await fetchFromPostgREST(
    `/sessions?id=eq.${encodeURIComponent(id)}&select=*`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0] || null;
}

export async function createSession(
  session: InsertSession
): Promise<Session> {
  const response = await fetchFromPostgREST("/sessions", {
    method: "POST",
    body: JSON.stringify(session),
    headers: {
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create session: ${errorText}`);
  }

  const data = await response.json();
  return data[0];
}

export async function updateSession(
  id: string,
  updates: Partial<InsertSession>
): Promise<Session> {
  const response = await fetchFromPostgREST(
    `/sessions?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
      headers: {
        Prefer: "return=representation",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update session: ${errorText}`);
  }

  const data = await response.json();
  return data[0];
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetchFromPostgREST(
    `/sessions?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
}

// PlugShare Cache API
export async function getPlugShareCache(
  plugshareId: string
): Promise<PlugShareCache | null> {
  const response = await fetchFromPostgREST(
    `/plugshare_cache?plugshare_id=eq.${encodeURIComponent(plugshareId)}&select=*`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data[0] || null;
}

export async function createPlugShareCache(
  cache: Omit<PlugShareCache, "id" | "created_at" | "updated_at">
): Promise<PlugShareCache> {
  const response = await fetchFromPostgREST("/plugshare_cache", {
    method: "POST",
    body: JSON.stringify(cache),
    headers: {
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create cache: ${errorText}`);
  }

  const data = await response.json();
  return data[0];
}

// Whitelist API
export async function checkWhitelist(userId: string): Promise<boolean> {
  try {
    const response = await fetchFromPostgREST(
      `/user_whitelist?user_id=eq.${encodeURIComponent(userId)}&select=user_id`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

export async function checkWhitelistByEmail(email: string): Promise<boolean> {
  try {
    const response = await fetchFromPostgREST(
      `/user_whitelist?email=eq.${encodeURIComponent(email)}&select=email`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

// Helper functions for location clustering

// Haversine distance calculation (in meters)
function getDistanceMeters(
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

// Parse WKT POINT string to lat/lng
export function parseWktPoint(wkt: string): { lat: number; lng: number } {
  // Check if it's WKB hex format
  if (/^[0-9a-fA-F]{40,}$/.test(wkt)) {
    const buf = Buffer.from(wkt, "hex");
    if (buf.length >= 21) {
      const x = buf.readDoubleLE(9);
      const y = buf.readDoubleLE(17);
      return { lat: y, lng: x };
    }
  }

  // Try WKT format
  const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (match) {
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  }

  throw new Error("Invalid WKT/WKB format");
}

// Get aggregate pin color based on worst experience in cluster
function getAggregatePinColor(sessions: Session[]): PinColor {
  const hasRed = sessions.some((s) => s.pin_color === "red");
  const hasYellow = sessions.some((s) => s.pin_color === "yellow");

  if (hasRed) return "red";
  if (hasYellow) return "yellow";
  return "green";
}

// Cluster sessions by location proximity (100m radius)
export function clusterSessionsByLocation(
  sessions: Session[]
): LocationGroup[] {
  const clusters: LocationGroup[] = [];
  const CLUSTER_RADIUS_METERS = 100;

  for (const session of sessions) {
    try {
      const { lat, lng } = parseWktPoint(session.location);

      // Find existing cluster within radius
      let matchedCluster: LocationGroup | null = null;
      for (const cluster of clusters) {
        const distance = getDistanceMeters(lat, lng, cluster.lat, cluster.lng);
        if (distance <= CLUSTER_RADIUS_METERS) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        // Add to existing cluster
        matchedCluster.sessions.push(session);
        matchedCluster.sessionCount = matchedCluster.sessions.length;
        // Recalculate center (average)
        const totalLat = matchedCluster.sessions.reduce(
          (sum, s) => sum + parseWktPoint(s.location).lat,
          0
        );
        const totalLng = matchedCluster.sessions.reduce(
          (sum, s) => sum + parseWktPoint(s.location).lng,
          0
        );
        matchedCluster.lat = totalLat / matchedCluster.sessions.length;
        matchedCluster.lng = totalLng / matchedCluster.sessions.length;
        // Update pin color based on worst experience
        matchedCluster.pinColor = getAggregatePinColor(matchedCluster.sessions);
      } else {
        // Create new cluster
        clusters.push({
          id: `loc-${lat.toFixed(6)}-${lng.toFixed(6)}`,
          name: session.station_name,
          lat,
          lng,
          sessionCount: 1,
          sessions: [session],
          pinColor: session.pin_color,
        });
      }
    } catch (error) {
      console.error("Error clustering session:", session.id, error);
    }
  }

  // Sort sessions within each cluster by date (newest first)
  for (const cluster of clusters) {
    cluster.sessions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return clusters;
}

// Calculate pin color based on success rate
export function calculatePinColor(
  attempts: number,
  successes: number,
  techniqueRequired: boolean
): PinColor {
  if (techniqueRequired) {
    return "yellow";
  }

  if (attempts === 0) {
    return "yellow";
  }

  const successRate = successes / attempts;

  if (successRate > 0.75 || successes === attempts) {
    return "green";
  } else if (successRate >= 0.25) {
    return "yellow";
  } else {
    return "red";
  }
}

// Session Images API
export async function getSessionImages(sessionId: string): Promise<SessionImage[]> {
  const response = await fetchFromPostgREST(
    `/session_images?session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.desc&select=*`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch session images: ${response.statusText}`);
  }

  return response.json();
}

export async function createSessionImage(
  image: InsertSessionImage
): Promise<SessionImage> {
  const response = await fetchFromPostgREST("/session_images", {
    method: "POST",
    body: JSON.stringify(image),
    headers: {
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create session image: ${errorText}`);
  }

  const data = await response.json();
  return data[0];
}

export async function deleteSessionImage(id: string): Promise<void> {
  const response = await fetchFromPostgREST(
    `/session_images?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete session image: ${response.statusText}`);
  }
}
