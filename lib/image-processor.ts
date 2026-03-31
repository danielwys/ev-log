import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface ProcessedImage {
  originalPath: string;
  webpPath: string;
  thumbnailPath: string;
  originalFilename: string;
  fileSizeBytes: number;
  webpSizeBytes: number;
  thumbnailSizeBytes: number;
  width: number;
  height: number;
  mimeType: string;
}

// Storage paths
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const RAW_DIR = path.join(UPLOADS_DIR, "raw");
const PROCESSED_DIR = path.join(UPLOADS_DIR, "processed");

// Image processing settings
const WEBP_QUALITY = 85;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 70;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Ensure upload directories exist
 */
async function ensureDirectories(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    await mkdir(RAW_DIR, { recursive: true });
  }
  if (!existsSync(PROCESSED_DIR)) {
    await mkdir(PROCESSED_DIR, { recursive: true });
  }
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${timestamp}-${random}-${cleanName}`;
}

/**
 * Process an image file with Sharp
 * - Saves original to raw/
 * - Creates WebP version (quality 85)
 * - Creates thumbnail (400px width, quality 70)
 */
export async function processImage(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<ProcessedImage> {
  await ensureDirectories();

  // Generate unique filenames
  const baseFilename = generateFilename(originalFilename);
  const originalExt = path.extname(originalFilename) || ".jpg";
  const originalName = `${baseFilename}${originalExt}`;
  const webpName = `${baseFilename}.webp`;
  const thumbnailName = `${baseFilename}-thumb.webp`;

  const originalPath = path.join(RAW_DIR, originalName);
  const webpPath = path.join(PROCESSED_DIR, webpName);
  const thumbnailPath = path.join(PROCESSED_DIR, thumbnailName);

  // Get image metadata
  const metadata = await sharp(fileBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Save original
  await writeFile(originalPath, fileBuffer);

  // Create WebP version (quality 85)
  const webpBuffer = await sharp(fileBuffer)
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  await writeFile(webpPath, webpBuffer);

  // Create thumbnail (400px width, quality 70)
  const thumbnailBuffer = await sharp(fileBuffer)
    .resize(THUMBNAIL_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
    .toBuffer();
  await writeFile(thumbnailPath, thumbnailBuffer);

  // Get file sizes
  const { stat } = await import("fs/promises");
  const [originalStat, webpStat, thumbnailStat] = await Promise.all([
    stat(originalPath),
    stat(webpPath),
    stat(thumbnailPath),
  ]);

  return {
    originalPath: `/uploads/raw/${originalName}`,
    webpPath: `/uploads/processed/${webpName}`,
    thumbnailPath: `/uploads/processed/${thumbnailName}`,
    originalFilename,
    fileSizeBytes: originalStat.size,
    webpSizeBytes: webpStat.size,
    thumbnailSizeBytes: thumbnailStat.size,
    width,
    height,
    mimeType,
  };
}

/**
 * Process multiple images
 */
export async function processImages(
  files: Array<{ buffer: Buffer; filename: string; mimeType: string }>
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  
  for (const file of files) {
    const result = await processImage(file.buffer, file.filename, file.mimeType);
    results.push(result);
  }
  
  return results;
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File | { name: string; type: string; size: number }
): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Only image files are allowed" };
  }

  // Check file size
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }

  // Check supported formats
  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  
  if (!supportedTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: `Unsupported image format: ${file.type}` };
  }

  return { valid: true };
}

/**
 * Get image URLs for a session
 * Returns thumbnail for gallery, full WebP for lightbox
 */
export function getImageUrls(
  processedImage: ProcessedImage
): {
  thumbnail: string;
  full: string;
  original: string;
} {
  return {
    thumbnail: processedImage.thumbnailPath,
    full: processedImage.webpPath,
    original: processedImage.originalPath,
  };
}
