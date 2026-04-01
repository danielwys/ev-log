import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    pool: 'forks',
    env: {
      NEXTAUTH_SECRET: 'test-secret',
      JWT_SECRET: 'test-jwt-secret',
      AGENT_API_KEY: 'test-api-key',
      NEXT_PUBLIC_POSTGREST_URL: 'http://localhost:3001',
      POSTGREST_URL: 'http://localhost:3001',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://localhost:5432/test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        'postgres/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
    },
  },
});
