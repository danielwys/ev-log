import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateSession, checkWhitelist } from "@/lib/db";
import { wktPoint } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params (Next.js 15+ params is a Promise)
    const { id: sessionId } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check whitelist
    const isWhitelisted = await checkWhitelist(userId);
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: "Forbidden - user not whitelisted" },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json();

    // Build the update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        updateData.location = wktPoint(lat, lng);
      }
    }

    // Update the session
    const updatedSession = await updateSession(sessionId, updateData);

    return NextResponse.json({ data: updatedSession });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}