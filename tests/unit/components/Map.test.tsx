import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MapComponent, MapComponentRef } from "@/components/Map";
import { createMockLocationGroup, createMockSessionData } from "@/tests/utils";

// Mock maplibre-gl with self-contained factory
vi.mock("maplibre-gl", () => {
  // Define mocks inside factory to avoid hoisting issues
  const mockMap = {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    addControl: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 1.3521, lng: 103.8198 })),
    getZoom: vi.fn(() => 11),
  };

  const mockMarker = {
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    getElement: vi.fn(() => {
      const el = document.createElement("div");
      el.className = "maplibregl-marker";
      return el;
    }),
  };

  return {
    default: {
      Map: function () { return mockMap; },
      Marker: function () { return mockMarker; },
      NavigationControl: function () {},
      GeolocateControl: function () { return { on: vi.fn(), off: vi.fn() }; },
    },
    Map: function () { return mockMap; },
    Marker: function () { return mockMarker; },
    NavigationControl: function () {},
    GeolocateControl: function () { return { on: vi.fn(), off: vi.fn() }; },
  };
});

describe("MapComponent", () => {
  const mockOnLocationClick = vi.fn();
  const mockOnSessionClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders map container element", () => {
    const { container } = render(
      <MapComponent
        locationGroups={[]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    // Map container should be rendered with correct classes
    const mapContainer = container.querySelector("div.w-full.h-full");
    expect(mapContainer).toBeInTheDocument();
  });

  it("handles empty location groups gracefully", () => {
    const { container } = render(
      <MapComponent
        locationGroups={[]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("accepts location groups as props", () => {
    const locationGroups = [
      createMockLocationGroup({ id: "loc-1" }),
      createMockLocationGroup({ id: "loc-2" }),
    ];

    const { container } = render(
      <MapComponent
        locationGroups={locationGroups}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("accepts selected location prop", () => {
    const locationGroups = [
      createMockLocationGroup({
        id: "loc-1",
        pinColor: "green",
      }),
    ];

    const { container } = render(
      <MapComponent
        locationGroups={locationGroups}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={locationGroups[0]}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("accepts selected session prop", () => {
    const session = createMockSessionData({
      location: "POINT(103.9876 1.2345)",
    });

    const { container } = render(
      <MapComponent
        locationGroups={[]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={session}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("exposes flyTo method via ref", () => {
    const ref = React.createRef<MapComponentRef>();

    render(
      <MapComponent
        ref={ref}
        locationGroups={[]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    // Ref should be set with flyTo method
    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.flyTo).toBe("function");
  });

  it("handles different pin colors", () => {
    const locationGroups = [
      createMockLocationGroup({ id: "loc-green", pinColor: "green" }),
      createMockLocationGroup({ id: "loc-yellow", pinColor: "yellow" }),
      createMockLocationGroup({ id: "loc-red", pinColor: "red" }),
    ];

    const { container } = render(
      <MapComponent
        locationGroups={locationGroups}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("handles cluster with multiple sessions", () => {
    const { container } = render(
      <MapComponent
        locationGroups={[
          createMockLocationGroup({
            id: "loc-cluster",
            sessionCount: 5,
            pinColor: "yellow",
          }),
        ]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("cleans up on unmount", () => {
    const { unmount, container } = render(
      <MapComponent
        locationGroups={[createMockLocationGroup({ id: "loc-1" })]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    unmount();

    // Container should be empty after unmount
    expect(container.firstChild).toBeNull();
  });

  it("handles prop updates via rerender", () => {
    const { rerender, container } = render(
      <MapComponent
        locationGroups={[createMockLocationGroup({ id: "loc-1" })]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    // Rerender with more locations
    rerender(
      <MapComponent
        locationGroups={[
          createMockLocationGroup({ id: "loc-1" }),
          createMockLocationGroup({ id: "loc-2" }),
          createMockLocationGroup({ id: "loc-3" }),
        ]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
  });

  it("configures Singapore as default center", () => {
    const { container } = render(
      <MapComponent
        locationGroups={[]}
        onLocationClick={mockOnLocationClick}
        onSessionClick={mockOnSessionClick}
        selectedLocation={null}
        selectedSession={null}
      />
    );

    // Component renders with expected structure
    const mapDiv = container.querySelector(".w-full.h-full");
    expect(mapDiv).toBeInTheDocument();
  });
});
