"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import { css } from "@/styled-system/css";
import { Session } from "@/lib/supabase";
import { parseWktPoint } from "@/lib/validation";
import { Zap } from "lucide-react";

interface MapComponentProps {
  sessions: Session[];
  onMarkerClick: (session: Session) => void;
  selectedSession: Session | null;
}

export interface MapComponentRef {
  flyTo: (lat: number, lng: number) => void;
}

export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(
  ({ sessions, onMarkerClick, selectedSession }, ref) => {
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

      // Initialize map
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            "osm": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap Contributors",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [103.8198, 1.3521], // Singapore default
        zoom: 11,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");
      map.current.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }), "top-right");

      return () => {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        map.current?.remove();
      };
    }, []);

    // Update markers when sessions change
    useEffect(() => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add markers for each session
      sessions.forEach((session) => {
        try {
          const { lat, lng } = parseWktPoint(session.location);

          // Create custom marker element
          const el = document.createElement("div");
          el.className = css({
            width: "40px",
            height: "40px",
            borderRadius: "full",
            backgroundColor: selectedSession?.id === session.id ? "#3b82f6" : "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: selectedSession?.id === session.id
              ? "0 0 0 4px rgba(59, 130, 246, 0.4)"
              : "0 2px 4px rgba(0,0,0,0.3)",
            border: "2px solid white",
            transition: "all 0.2s",
            _hover: {
              transform: "scale(1.1)",
            },
          });
          el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map.current);

          el.addEventListener("click", () => {
            onMarkerClick(session);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error("Error parsing location for session:", session.id, error);
        }
      });
    }, [sessions, onMarkerClick, selectedSession]);

    // Fly to selected session
    useEffect(() => {
      if (selectedSession && map.current) {
        try {
          const { lat, lng } = parseWktPoint(selectedSession.location);
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true,
          });
        } catch (error) {
          console.error("Error flying to session:", error);
        }
      }
    }, [selectedSession]);

    return (
      <div
        ref={mapContainer}
        className={css({
          width: "100%",
          height: "100%",
        })}
      />
    );
  }
);

MapComponent.displayName = "MapComponent";
