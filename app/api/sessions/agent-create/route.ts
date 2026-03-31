import { NextRequest, NextResponse } from "next/server";
import { createSessionAsService } from "@/lib/db";
import { InsertSession } from "@/lib/db";

const AGENT_API_KEY = process.env.AGENT_API_KEY;
const SERVICE_USER_ID = "service-agent";
const SERVICE_USER_EMAIL = "agent@local";

/**
 * Agent service endpoint for creating charging sessions
 * Authenticated via API key (not OAuth)
 * Pre-whitelisted service account
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
    let data: Record<string, any> = {};
    let photos: string[] = [];
    
    const contentType = request.headers.get("Content-Type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await request.formData();
      formData.forEach((value, key) => {
        data[key] = value;
      });
      
      // Handle photo uploads from FormData
      const photoFiles = formData.getAll("photos") as File[];
      for (const file of photoFiles) {
        if (file && file.size > 0) {
          const uploadUrl = await uploadPhoto(file);
          if (uploadUrl) photos.push(uploadUrl);
        }
      }
    } else {
      // Handle JSON
      data = await request.json();
    }

    // Extract required fields
    const station_name = data.station_name as string;
    const operator = data.operator as string;
    const max_kw = parseFloat(data.max_kw);
    const battery_start = parseFloat(data.battery_start);
    const battery_end = parseFloat(data.battery_end);
    const latitude = parseFloat(data.latitude);
    const longitude = parseFloat(data.longitude);

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
      notes: data.notes || null,
      charger_hardware_model: data.charger_hardware_model || null,
      charger_software: data.charger_software || null,
      cable_amp_limit: data.cable_amp_limit ? parseInt(data.cable_amp_limit) : null,
      stall_id: data.stall_id || null,
      plug_id: data.plug_id || null,
      price_per_kwh: data.price_per_kwh ? parseFloat(data.price_per_kwh) : null,
      kwh_delivered: data.kwh_delivered ? parseFloat(data.kwh_delivered) : null,
      failure_type: data.failure_type || null,
      technique_required: data.technique_required === true || data.technique_required === "true",
      technique_notes: data.technique_notes || null,
    };

    // Create session via PostgREST with service authentication
    const createdSession = await createSessionAsService(session);

    return NextResponse.json({
      success: true,
      session_id: createdSession.id,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`,
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
 * Upload photo to storage
 * Returns URL or null if failed
 */
async function uploadPhoto(file: File): Promise<string | null> {
  try {
    // Create FormData for upload
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    // Upload to internal upload endpoint
    const uploadResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/upload`,
      {
        method: "POST",
        headers: {
          "X-API-Key": process.env.AGENT_API_KEY || "",
        },
        body: uploadFormData,
      }
    );

    if (!uploadResponse.ok) {
      console.error("Photo upload failed:", await uploadResponse.text());
      return null;
    }

    const uploadData = await uploadResponse.json();
    return uploadData.url;
  } catch (error) {
    console.error("Photo upload error:", error);
    return null;
  }
}
