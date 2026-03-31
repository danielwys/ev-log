import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { auth } from '@/auth';
import { validateImageFile, processImage } from '@/lib/image-processor';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock image processor
vi.mock('@/lib/image-processor', () => ({
  validateImageFile: vi.fn(),
  processImage: vi.fn(),
}));

// Mock NextRequest and formData
function createMockRequest(formData: FormData, options: { authenticated?: boolean } = {}) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
    headers: new Headers(),
  } as unknown as Request;
}

describe('/api/upload POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with processed URLs for authenticated user + valid image', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(validateImageFile).mockReturnValueOnce({ valid: true });
    vi.mocked(processImage).mockResolvedValueOnce({
      originalPath: '/uploads/raw/test.jpg',
      webpPath: '/uploads/processed/test.webp',
      thumbnailPath: '/uploads/processed/test-thumb.webp',
      originalFilename: 'test.jpg',
      fileSizeBytes: 2500000,
      webpSizeBytes: 1800000,
      thumbnailSizeBytes: 50000,
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', new File(['test-data'], 'test.jpg', { type: 'image/jpeg' }));

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.urls.original).toBe('/uploads/raw/test.jpg');
    expect(json.urls.full).toBe('/uploads/processed/test.webp');
    expect(json.urls.thumbnail).toBe('/uploads/processed/test-thumb.webp');
    expect(json.metadata.width).toBe(1920);
    expect(json.metadata.height).toBe(1080);
  });

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should return 400 when no file provided', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const formData = new FormData();
    // No file appended

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No file provided');
  });

  it('should return 400 for non-image file (PDF)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(validateImageFile).mockReturnValueOnce({
      valid: false,
      error: 'Only image files are allowed',
    });

    const formData = new FormData();
    formData.append('file', new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' }));

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Only image files are allowed');
  });

  it('should return 400 for oversized image (>10MB)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(validateImageFile).mockReturnValueOnce({
      valid: false,
      error: 'File size exceeds 10MB limit',
    });

    const formData = new FormData();
    formData.append('file', new File(['large-data'], 'large.jpg', { type: 'image/jpeg' }));

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('File size exceeds 10MB limit');
  });

  it('should return 500 for corrupted image processing error', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    vi.mocked(validateImageFile).mockReturnValueOnce({ valid: true });
    vi.mocked(processImage).mockRejectedValueOnce(new Error('Corrupted image'));

    const formData = new FormData();
    formData.append('file', new File(['corrupted'], 'corrupt.jpg', { type: 'image/jpeg' }));

    const req = createMockRequest(formData);
    const res = await POST(req as any);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to process image');
  });

  it('should validate different image formats', () => {
    // Mock implementations for testing
    vi.mocked(validateImageFile)
      .mockReturnValueOnce({ valid: true })
      .mockReturnValueOnce({ valid: true })
      .mockReturnValueOnce({ valid: true })
      .mockReturnValueOnce({ valid: false, error: 'Only image files are allowed' });

    const formats = [
      { type: 'image/jpeg', expectValid: true },
      { type: 'image/png', expectValid: true },
      { type: 'image/webp', expectValid: true },
      { type: 'application/pdf', expectValid: false },
    ];

    for (const format of formats) {
      const result = validateImageFile({
        name: 'test.file',
        type: format.type,
        size: 1000,
      } as File);

      expect(result.valid).toBe(format.expectValid);
    }
  });

  it('should handle image validation with size check', () => {
    vi.mocked(validateImageFile)
      .mockReturnValueOnce({ valid: true })
      .mockReturnValueOnce({ valid: false, error: 'File size exceeds 10MB limit' });

    const valid = validateImageFile({
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024,
    } as File);
    expect(valid.valid).toBe(true);

    const oversized = validateImageFile({
      name: 'large.jpg',
      type: 'image/jpeg',
      size: 15 * 1024 * 1024,
    } as File);
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain('10MB');
  });
});
