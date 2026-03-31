import { z } from "zod";
import { FailureType } from "./db";

export const failureTypes = [
  "handshake",
  "derating",
  "interruption",
  "incompatible",
  "other",
] as const;

export const sessionSchema = z.object({
  station_name: z.string().min(1, "Station name is required"),
  operator: z.string().min(1, "Operator is required"),
  max_kw: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(0, "Must be at least 0").max(1000, "Must be less than 1000")
  ),
  battery_start: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(0, "Must be at least 0%").max(100, "Must be at most 100%")
  ),
  battery_end: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(0, "Must be at least 0%").max(100, "Must be at most 100%")
  ),
  latitude: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(-90).max(90)
  ),
  longitude: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(-180).max(180)
  ),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  // V1 fields
  charger_hardware_model: z.string().optional(),
  charger_software: z.string().optional(),
  cable_amp_limit: z.preprocess(
    (val) =>
      val === "" || val === undefined
        ? undefined
        : typeof val === "string"
        ? parseInt(val, 10)
        : val,
    z.number().int().min(0).max(1000).optional()
  ),
  stall_id: z.string().optional(),
  plug_id: z.string().optional(),
  connectors_tried: z.array(z.string()).default([]),
  successful_connectors: z.array(z.string()).default([]),
  attempts: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(1, "Must be at least 1").default(1)
  ),
  successes: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(0, "Must be at least 0").default(0)
  ),
  error_code: z.string().optional(),
  failure_type: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.enum(failureTypes).optional()
  ),
  technique_required: z.boolean().default(false),
  technique_notes: z.string().optional(),
  price_per_kwh: z.preprocess(
    (val) =>
      val === "" || val === undefined
        ? undefined
        : typeof val === "string"
        ? parseFloat(val)
        : val,
    z.number().min(0).max(10).optional()
  ),
  kwh_delivered: z.preprocess(
    (val) =>
      val === "" || val === undefined
        ? undefined
        : typeof val === "string"
        ? parseFloat(val)
        : val,
    z.number().min(0).max(1000).optional()
  ),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

export function wktPoint(
  lat: number | string,
  lng: number | string
): string {
  const latNum = typeof lat === "string" ? parseFloat(lat) : lat;
  const lngNum = typeof lng === "string" ? parseFloat(lng) : lng;

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
  }

  // WKT format: SRID=4326;POINT(longitude latitude)
  return `SRID=4326;POINT(${lngNum} ${latNum})`;
}

// Parse WKT POINT string to lat/lng
export function parseWktPoint(wkt: string): { lat: number; lng: number } {
  if (!wkt || typeof wkt !== "string") {
    throw new Error(`Invalid point input: ${wkt}`);
  }

  // Check if it's WKB hex format (starts with 01 or 00 followed by type bytes)
  if (/^[0-9a-fA-F]{40,}$/.test(wkt)) {
    // WKB hex - parse manually
    const buf = Buffer.from(wkt, "hex");
    if (buf.length >= 21) {
      // Skip first 9 bytes (endian + type + srid flag), read X and Y as doubles
      const x = buf.readDoubleLE(9);
      const y = buf.readDoubleLE(17);
      return { lat: y, lng: x };
    }
  }

  // Handle WKT formats: "SRID=4326;POINT(lng lat)" and "POINT(lng lat)"
  const match = wkt.match(/POINT\(([^ ]+)\s+([^)]+)\)/i);
  if (!match) {
    throw new Error(`Invalid point format: ${wkt}`);
  }

  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);

  if (isNaN(lng) || isNaN(lat)) {
    throw new Error(`Invalid coordinates: lng=${match[1]}, lat=${match[2]}`);
  }

  return { lng, lat };
}

// PlugShare URL parsing helper
export function extractPlugShareId(url: string): string | null {
  const patterns = [
    /plugshare\.com\/location\/(\d+)/,
    /plugshare\.com\/?\?location=([\w-]+)/,
    /plugshare\.com\/(?:[\w-]+\/)?location\/(\d+)/i,
    /\/location\/(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export interface PlugShareData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  operator: string;
}

// Calculate pin color based on success rate
export function calculatePinColor(
  attempts: number,
  successes: number,
  techniqueRequired: boolean
): "green" | "yellow" | "red" {
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
