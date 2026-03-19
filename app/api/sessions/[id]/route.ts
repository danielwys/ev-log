import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - no token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Create a new Supabase client with the user's token
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const sessionId = params.id;

    // Parse the request body
    const body = await request.json();

    // First, check if the session belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch session" },
        { status: 500 }
      );
    }

    if (existingSession.user_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - you can only edit your own sessions" },
        { status: 403 }
      );
    }

    // Build the update object
    const updateData: any = {};

    // Only include fields that are provided
    if (body.station_name !== undefined) updateData.station_name = body.station_name;
    if (body.operator !== undefined) updateData.operator = body.operator;
    if (body.max_kw !== undefined) updateData.max_kw = body.max_kw;
    if (body.battery_start !== undefined) updateData.battery_start = body.battery_start;
    if (body.battery_end !== undefined) updateData.battery_end = body.battery_end;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.photos !== undefined) updateData.photos = body.photos;
    if (body.charger_hardware_model !== undefined) updateData.charger_hardware_model = body.charger_hardware_model || null;
    if (body.charger_software !== undefined) updateData.charger_software = body.charger_software || null;
    if (body.cable_amp_limit !== undefined) updateData.cable_amp_limit = body.cable_amp_limit || null;
    if (body.stall_id !== undefined) updateData.stall_id = body.stall_id || null;
    if (body.plug_id !== undefined) updateData.plug_id = body.plug_id || null;
    if (body.connectors_tried !== undefined) updateData.connectors_tried = body.connectors_tried;
    if (body.successful_connectors !== undefined) updateData.successful_connectors = body.successful_connectors;
    if (body.attempts !== undefined) updateData.attempts = body.attempts;
    if (body.successes !== undefined) updateData.successes = body.successes;
    if (body.error_code !== undefined) updateData.error_code = body.error_code || null;
    if (body.failure_type !== undefined) updateData.failure_type = body.failure_type || null;
    if (body.technique_required !== undefined) updateData.technique_required = body.technique_required;
    if (body.technique_notes !== undefined) updateData.technique_notes = body.technique_notes || null;
    if (body.price_per_kwh !== undefined) updateData.price_per_kwh = body.price_per_kwh || null;

    // Handle location update if lat/lng provided
    if (body.latitude !== undefined && body.longitude !== undefined) {
      const lat = parseFloat(body.latitude);
      const lng = parseFloat(body.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        updateData.location = `SRID=4326;POINT(${lng} ${lat})`;
      }
    }

    // Update the session
    const { data, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json(
        { error: "Failed to update session", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
