import { z } from "zod";

export const sessionSchema = z.object({
  station_name: z.string().min(1, "Station name is required"),
  operator: z.string().min(1, "Operator is required"),
  max_kw: z.coerce
    .number()
    .min(0, "Must be at least 0")
    .max(1000, "Must be less than 1000"),
  battery_start: z.coerce
    .number()
    .int()
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%"),
  battery_end: z.coerce
    .number()
    .int()
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

export function wktPoint(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export function parseWktPoint(wkt: string): { lat: number; lng: number } {
  const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (!match) {
    throw new Error("Invalid WKT point");
  }
  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}
