import React from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { vi } from "vitest";

// Mock Session type extension for our tests
type MockSession = Session & {
  user: {
    id: string;
    email: string;
  };
};

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  session?: MockSession | null;
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: Partial<MockSession["user"]>): MockSession {
  return {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      ...overrides,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

/**
 * Create a mock location group for testing
 */
export function createMockLocationGroup(overrides?: {
  id?: string;
  name?: string;
  lat?: number;
  lng?: number;
  pinColor?: "green" | "yellow" | "red";
  sessionCount?: number;
}): import("@/lib/db").LocationGroup {
  return {
    id: "loc-1",
    name: "Test Charging Station",
    lat: 1.3521,
    lng: 103.8198,
    sessionCount: 1,
    pinColor: "green",
    sessions: [createMockSessionData(overrides?.id)],
    ...overrides,
  };
}

/**
 * Create a mock session data object for testing
 */
export function createMockSessionData(
  overrides?: Partial<import("@/lib/db").Session>
): import("@/lib/db").Session {
  const base = {
    id: overrides?.id || "session-123",
    user_id: "user-123",
    user_email: "test@example.com",
    station_name: "Test Station",
    operator: "Shell Recharge",
    max_kw: 120,
    battery_start: 20,
    battery_end: 80,
    location: "POINT(103.8198 1.3521)",
    photos: [],
    notes: "Test session notes",
    created_at: "2024-03-15T10:00:00Z",
    updated_at: "2024-03-15T10:00:00Z",
    charger_hardware_model: null,
    charger_software: null,
    cable_amp_limit: null,
    stall_id: null,
    plug_id: null,
    connectors_tried: [],
    successful_connectors: [],
    attempts: 1,
    successes: 1,
    error_code: null,
    failure_type: null,
    technique_required: false,
    technique_notes: null,
    price_per_kwh: 0.55,
    pin_color: "green" as const,
    kwh_delivered: 45.123,
  };
  return { ...base, ...overrides };
}

/**
 * Render component with all necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { session = null, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <SessionProvider session={session}>{children}</SessionProvider>
    );
  };

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Helper to wait for a short delay (useful for async operations)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock photo URLs for testing
 */
export function createMockPhotos(count: number = 3): string[] {
  return Array.from({ length: count }, (_, i) => `/uploads/photo-${i + 1}.webp`);
}
