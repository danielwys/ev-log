import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { processImage, validateImageFile } from "@/lib/image-processor";

/**
 * Image upload handler with Sharp processing
 * 
 * Processing pipeline:
 * 1. Validate file (type, size)
 * 2. Save original to public/uploads/raw/
 * 3. Generate WebP version (quality 85) to public/uploads/processed/
 * 4. Generate thumbnail (400px width, quality 70) to public/uploads/processed/
 * 5. Return URLs for all versions
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with Sharp
    const processed = await processImage(buffer, file.name, file.type);

    // Return all image URLs
    return NextResponse.json({
      success: true,
      urls: {
        original: processed.originalPath,
        full: processed.webpPath,
        thumbnail: processed.thumbnailPath,
      },
      metadata: {
        width: processed.width,
        height: processed.height,
        originalSize: processed.fileSizeBytes,
        webpSize: processed.webpSizeBytes,
        thumbnailSize: processed.thumbnailSizeBytes,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}

/**
 * Handle multiple file uploads
 * Used by agent-create endpoint
 */
export async function handleMultipleUploads(
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

    // Read and process
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const processed = await processImage(buffer, file.name, file.type);

    results.push({
      original: processed.originalPath,
      full: processed.webpPath,
      thumbnail: processed.thumbnailPath,
    });
  }

  return results;
}
