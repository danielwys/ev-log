import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type InsertSession = Database["public"]["Tables"]["sessions"]["Insert"];
export type PinColor = Database["public"]["Enums"]["pin_color"];

export interface LocationGroup {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sessionCount: number;
  sessions: Session[];
  pinColor: PinColor;
}

// Haversine distance calculation (in meters)
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
function parseWktPoint(wkt: string): { lat: number; lng: number } {
  const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (!match) throw new Error("Invalid WKT format");
  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}

// Cluster sessions by location proximity (100m radius)
export function clusterSessionsByLocation(sessions: Session[]): LocationGroup[] {
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

// Get aggregate pin color based on worst experience in cluster
function getAggregatePinColor(sessions: Session[]): PinColor {
  // Priority: red (worst) > yellow > green (best)
  const hasRed = sessions.some((s) => s.pin_color === "red");
  const hasYellow = sessions.some((s) => s.pin_color === "yellow");

  if (hasRed) return "red";
  if (hasYellow) return "yellow";
  return "green";
}
