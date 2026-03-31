import { NextRequest, NextResponse } from "next/server";
import { createSessionAsService, InsertSession, FailureType } from "@/lib/db";
import { processImage, validateImageFile } from "@/lib/image-processor";

const AGENT_API_KEY = process.env.AGENT_API_KEY;
const SERVICE_USER_ID = "service-agent";
const SERVICE_USER_EMAIL = "agent@local";

/**
 * Agent service endpoint for creating charging sessions
 * Authenticated via API key (not OAuth)
 * Pre-whitelisted service account
 * 
 * Image processing:
 * - Saves original uploads to public/uploads/raw/
 * - Generates WebP versions (quality 85) to public/uploads/processed/
 * - Generates thumbnails (400px width, quality 70) to public/uploads/processed/
 * - Stores WebP URLs in session.photos for gallery display
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey || apiKey !== AGENT_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request body (JSON or FormData)
    let data: Record<string, string | number | boolean | null> = {};
    let photos: string[] = [];
    
    const contentType = request.headers.get("Content-Type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (key !== "photos") {
          data[key] = value as string;
        }
      });
      
      // Handle photo uploads from FormData
      const photoFiles = formData.getAll("photos") as File[];
      const processedPhotos = await processAgentPhotos(photoFiles);
      photos = processedPhotos.map(p => p.full); // Use WebP for session.photos
    } else {
      // Handle JSON
      data = await request.json();
    }

    // Extract required fields
    const station_name = String(data.station_name);
    const operator = String(data.operator);
    const max_kw = parseFloat(String(data.max_kw));
    const battery_start = parseFloat(String(data.battery_start));
    const battery_end = parseFloat(String(data.battery_end));
    const latitude = parseFloat(String(data.latitude));
    const longitude = parseFloat(String(data.longitude));

    // Validate required fields
    if (!station_name || !operator || isNaN(max_kw) || isNaN(battery_start) || 
        isNaN(battery_end) || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // Build session object
    const session: InsertSession = {
      user_id: SERVICE_USER_ID,
      user_email: SERVICE_USER_EMAIL,
      station_name,
      operator,
      max_kw,
      battery_start,
      battery_end,
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      photos,
      notes: getStringOrNull(data.notes),
      charger_hardware_model: getStringOrNull(data.charger_hardware_model),
      charger_software: getStringOrNull(data.charger_software),
      cable_amp_limit: getNumberOrNull(data.cable_amp_limit),
      stall_id: getStringOrNull(data.stall_id),
      plug_id: getStringOrNull(data.plug_id),
      price_per_kwh: getNumberOrNull(data.price_per_kwh),
      kwh_delivered: getNumberOrNull(data.kwh_delivered),
      failure_type: getFailureTypeOrNull(data.failure_type),
      technique_required: data.technique_required === true || data.technique_required === "true",
      technique_notes: getStringOrNull(data.technique_notes),
    };

    // Create session via PostgREST with service authentication
    const createdSession = await createSessionAsService(session);

    return NextResponse.json({
      success: true,
      session_id: createdSession.id,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`,
      photos_uploaded: photos.length,
    });

  } catch (error) {
    console.error("Agent create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Process photos uploaded via agent endpoint
 * Returns processed image info with all URLs
 */
async function processAgentPhotos(
  files: File[]
): Promise<Array<{ original: string; full: string; thumbnail: string }>> {
  const results = [];

  for (const file of files) {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.warn(`Skipping invalid file ${file.name}: ${validation.error}`);
      continue;
    }

    try {
      // Read and process
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const processed = await processImage(buffer, file.name, file.type);

      results.push({
        original: processed.originalPath,
        full: processed.webpPath,
        thumbnail: processed.thumbnailPath,
      });
      
      console.log(`Processed image: ${file.name} -> WebP: ${processed.webpSizeBytes} bytes, Thumb: ${processed.thumbnailSizeBytes} bytes`);
    } catch (error) {
      console.error(`Failed to process image ${file.name}:`, error);
    }
  }

  return results;
}

// Type-safe helper functions for extracting data values
function getStringOrNull(value: string | number | boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function getNumberOrNull(value: string | number | boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
}

function getFailureTypeOrNull(value: string | number | boolean | null | undefined): FailureType | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  const validTypes: FailureType[] = ['handshake', 'derating', 'interruption', 'incompatible', 'other'];
  return validTypes.includes(str as FailureType) ? (str as FailureType) : null;
}
