"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import { LocationGroup, Session } from "@/lib/supabase";

interface MapComponentProps {
  locationGroups: LocationGroup[];
  onLocationClick: (location: LocationGroup) => void;
  onSessionClick: (session: Session) => void;
  selectedLocation: LocationGroup | null;
  selectedSession: Session | null;
}

export interface MapComponentRef {
  flyTo: (lat: number, lng: number) => void;
}

function getClusterPinColorClasses(pinColor: string | null, isSelected: boolean): string {
  const baseClasses = "relative flex items-center justify-center cursor-pointer border-3 border-white transition-all duration-200";

  if (isSelected) {
    return `${baseClasses} w-14 h-14 rounded-full bg-blue-600 scale-130 shadow-2xl ring-4 ring-blue-300`;
  }

  switch (pinColor) {
    case "green":
      return `${baseClasses} w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 shadow-lg`;
    case "red":
      return `${baseClasses} w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg`;
    case "yellow":
    default:
      return `${baseClasses} w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-lg`;
  }
}

function getCountBadgeClasses(pinColor: string | null): string {
  const baseClasses = "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md";
  
  switch (pinColor) {
    case "green":
      return `${baseClasses} bg-green-700`;
    case "red":
      return `${baseClasses} bg-red-700`;
    case "yellow":
    default:
      return `${baseClasses} bg-yellow-700`;
  }
}

export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(
  ({ locationGroups, onLocationClick, onSessionClick, selectedLocation, selectedSession }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number) => {
        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true,
          });
        }
      },
    }));

    useEffect(() => {
      if (!mapContainer.current) return;

      // Initialize map with OpenFreeMap Liberty style
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [103.8198, 1.3521], // Singapore default
        zoom: 11,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");
      map.current.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right"
      );

      return () => {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        map.current?.remove();
      };
    }, []);

    // Update markers when location groups change
    useEffect(() => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Store map reference to avoid null check issues in forEach
      const mapInstance = map.current;

      // Add markers for each location group
      locationGroups.forEach((location) => {
        const isSelected = selectedLocation?.id === location.id;

        // Create custom marker element with Tailwind classes
        const el = document.createElement("div");
        el.className = getClusterPinColorClasses(location.pinColor, isSelected);
        if (isSelected) {
          el.style.zIndex = "1000";
        }

        // Lightning bolt SVG + count badge
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          ${location.sessionCount > 1 ? `<span class="${getCountBadgeClasses(location.pinColor)}">${location.sessionCount}</span>` : ""}
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([location.lng, location.lat])
          .addTo(mapInstance);

        el.addEventListener("click", () => {
          onLocationClick(location);
        });

        markersRef.current.push(marker);
      });
    }, [locationGroups, onLocationClick, selectedLocation]);

    // Fly to selected session
    useEffect(() => {
      if (selectedSession && map.current) {
        try {
          const match = selectedSession.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            map.current.flyTo({
              center: [lng, lat],
              zoom: 15,
              essential: true,
            });
          }
        } catch (error) {
          console.error("Error flying to session:", error);
        }
      }
    }, [selectedSession]);

    return <div ref={mapContainer} className="w-full h-full" />;
  }
);

MapComponent.displayName = "MapComponent";
