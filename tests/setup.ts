import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables - MUST be set before any route imports
// because some routes read env vars at module load time
process.env.NEXT_PUBLIC_POSTGREST_URL = 'http://localhost:3001';
process.env.POSTGREST_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.AGENT_API_KEY = 'test-api-key-123456';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock the crypto module for Node.js
vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      digest: vi.fn().mockReturnValue('mock-signature'),
    }),
  }),
}));

// Reset mocks before each test
beforeEach(() => {
  mockFetch.mockClear();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
