import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "EVLogbook/1.0 (research project)",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "Location ID is required" },
      { status: 400 }
    );
  }

  // Create server-side supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // STEP 1: Check local cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from("plugshare_cache")
      .select("*")
      .eq("plugshare_id", locationId)
      .single();

    if (cachedData && !cacheError) {
      console.log("Serving PlugShare data from cache:", locationId);
      return NextResponse.json({
        name: cachedData.name,
        address: cachedData.address,
        latitude: cachedData.latitude,
        longitude: cachedData.longitude,
        operator: cachedData.operator,
        cached: true,
      });
    }

    // STEP 2: Not in cache, scrape from PlugShare
    console.log("Fetching PlugShare data from source:", locationId);
    
    const response = await fetch(
      `https://www.plugshare.com/location/${locationId}`,
      {
        headers: {
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0 (compatible; EVLogbook/1.0)",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Location not found on PlugShare" },
          { status: 404 }
        );
      }
      throw new Error(`PlugShare returned ${response.status}`);
    }

    const html = await response.text();

    // Try multiple patterns to extract data
    
    // Pattern 1: JSON-LD structured data (most reliable)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    let parsedData: any = null;
    if (jsonLdMatch) {
      try {
        parsedData = JSON.parse(jsonLdMatch[1]);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Pattern 2: Meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    
    // Pattern 3: Look for coordinates in various formats
    const coordPatterns = [
      /"latitude":\s*([-\d.]+)/,
      /"lat":\s*([-\d.]+)/,
      /lat[=:]\s*([-\d.]+)/i,
    ];
    const lngPatterns = [
      /"longitude":\s*([-\d.]+)/,
      /"lng":\s*([-\d.]+)/,
      /"lon":\s*([-\d.]+)/,
      /lng[=:]\s*([-\d.]+)/i,
      /lon[=:]\s*([-\d.]+)/i,
    ];

    let lat: number | null = null;
    let lng: number | null = null;

    for (const pattern of coordPatterns) {
      const match = html.match(pattern);
      if (match) {
        lat = parseFloat(match[1]);
        break;
      }
    }

    for (const pattern of lngPatterns) {
      const match = html.match(pattern);
      if (match) {
        lng = parseFloat(match[1]);
        break;
      }
    }

    // Pattern 4: Extract name and address from title
    let name = "Unknown Station";
    let address = "";
    
    if (titleMatch) {
      const fullTitle = titleMatch[1].replace(" - PlugShare", "").trim();
      // Split on " | " to separate name from address
      const parts = fullTitle.split(" | ");
      if (parts.length > 1) {
        name = parts[0].trim();
        address = parts.slice(1).join(", ").trim();
      } else {
        // Try to detect if it's just a name or address
        if (fullTitle.includes(",") && fullTitle.match(/\d{5,}/)) {
          // Looks like an address
          address = fullTitle;
        } else {
          name = fullTitle;
        }
      }
    }

    // Pattern 5: Extract operator/network
    let operator = "Unknown";
    if (parsedData && parsedData.name) {
      operator = parsedData.name;
    } else {
      const operatorMatch = html.match(/"network"["\s]*:["\s]*"([^"]+)"/);
      if (operatorMatch) {
        operator = operatorMatch[1];
      }
    }

    // STEP 3: If no coordinates found, geocode the address
    if ((!lat || !lng) && address) {
      console.log("Geocoding address:", address);
      const coords = await geocodeAddress(address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const result = {
      name,
      address,
      latitude: lat,
      longitude: lng,
      operator,
      cached: false,
    };

    // STEP 4: Save to cache for future requests
    const { error: insertError } = await supabase
      .from("plugshare_cache")
      .insert({
        plugshare_id: locationId,
        name: result.name,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
        operator: result.operator,
      });

    if (insertError) {
      console.error("Failed to cache PlugShare data:", insertError);
    } else {
      console.log("Cached PlugShare data:", locationId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PlugShare fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from PlugShare. Please enter location details manually." },
      { status: 500 }
    );
  }
}
