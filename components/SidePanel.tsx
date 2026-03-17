"use client";

import { css } from "@/styled-system/css";
import { Session } from "@/lib/supabase";
import { parseWktPoint } from "@/lib/validation";
import { X, Zap, Battery, Calendar, MapPin, Navigation } from "lucide-react";
import Image from "next/image";

interface SidePanelProps {
  session: Session;
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
}

export function SidePanel({ session, onClose, onLocate }: SidePanelProps) {
  const { lat, lng } = parseWktPoint(session.location);
  const batteryAdded = session.battery_end - session.battery_start;
  const date = new Date(session.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date(session.created_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={css({
        width: "400px",
        maxWidth: "100%",
        bg: "surface",
        borderLeft: "1px solid",
        borderColor: "gray.700",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideIn 0.3s ease-out",
      })}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 4,
          py: 3,
          borderBottom: "1px solid",
          borderColor: "gray.700",
        })}
      >
        <h2
          className={css({
            fontSize: "lg",
            fontWeight: "semibold",
            color: "text",
            truncate: true,
          })}
        >
          {session.station_name}
        </h2>
        <div className={css({ display: "flex", gap: 2 })}>
          <button
            onClick={() => onLocate(lat, lng)}
            className={css({
              p: 2,
              borderRadius: "md",
              color: "muted",
              cursor: "pointer",
              _hover: { color: "primary", bg: "gray.700" },
              transition: "all 0.2s",
            })}
            title="Locate on map"
          >
            <Navigation size={18} />
          </button>
          <button
            onClick={onClose}
            className={css({
              p: 2,
              borderRadius: "md",
              color: "muted",
              cursor: "pointer",
              _hover: { color: "text", bg: "gray.700" },
              transition: "all 0.2s",
            })}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={css({
          flex: 1,
          overflowY: "auto",
          px: 4,
          py: 4,
        })}
      >
        {/* Photos Gallery */}
        {session.photos && session.photos.length > 0 && (
          <div className={css({ mb: 6 })}>
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "medium",
                color: "muted",
                mb: 3,
                textTransform: "uppercase",
                letterSpacing: "wide",
              })}
            >
              Photos
            </h3>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
              })}
            >
              {session.photos.map((photo, index) => (
                <div
                  key={index}
                  className={css({
                    position: "relative",
                    aspectRatio: "4/3",
                    borderRadius: "md",
                    overflow: "hidden",
                    bg: "gray.800",
                  })}
                >
                  <Image
                    src={photo}
                    alt={`Charging session photo ${index + 1}`}
                    fill
                    className={css({ objectFit: "cover" })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Summary */}
        <div className={css({ mb: 6 })}>
          <h3
            className={css({
              fontSize: "sm",
              fontWeight: "medium",
              color: "muted",
              mb: 3,
              textTransform: "uppercase",
              letterSpacing: "wide",
            })}
          >
            Technical Summary
          </h3>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 3,
            })}
          >
            {/* Operator */}
            <div
              className={css({
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1,
                })}
              >
                <Zap size={16} className={css({ color: "primary" })} />
                <span className={css({ fontSize: "xs", color: "muted" })}>
                  Operator
                </span>
              </div>
              <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                {session.operator}
              </p>
            </div>

            {/* Max kW */}
            <div
              className={css({
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1,
                })}
              >
                <Zap size={16} className={css({ color: "warning" })} />
                <span className={css({ fontSize: "xs", color: "muted" })}>
                  Max kW
                </span>
              </div>
              <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                {session.max_kw.toFixed(1)} kW
              </p>
            </div>

            {/* Battery Start */}
            <div
              className={css({
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1,
                })}
              >
                <Battery size={16} className={css({ color: "danger" })} />
                <span className={css({ fontSize: "xs", color: "muted" })}>
                  Battery Start
                </span>
              </div>
              <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                {session.battery_start}%
              </p>
            </div>

            {/* Battery End */}
            <div
              className={css({
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1,
                })}
              >
                <Battery size={16} className={css({ color: "secondary" })} />
                <span className={css({ fontSize: "xs", color: "muted" })}>
                  Battery End
                </span>
              </div>
              <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                {session.battery_end}%
              </p>
            </div>
          </div>

          {/* Battery Added Summary */}
          <div
            className={css({
              mt: 3,
              p: 3,
              bg: "gray.800",
              borderRadius: "md",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            })}
          >
            <span className={css({ fontSize: "sm", color: "muted" })}>
              Battery Added
            </span>
            <span
              className={css({
                fontSize: "lg",
                fontWeight: "bold",
                color: batteryAdded > 0 ? "secondary" : "danger",
              })}
            >
              {batteryAdded > 0 ? "+" : ""}
              {batteryAdded}%
            </span>
          </div>
        </div>

        {/* Date & Location */}
        <div>
          <h3
            className={css({
              fontSize: "sm",
              fontWeight: "medium",
              color: "muted",
              mb: 3,
              textTransform: "uppercase",
              letterSpacing: "wide",
            })}
          >
            Details
          </h3>

          <div className={css({ spaceY: 3 })}>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <Calendar size={18} className={css({ color: "muted" })} />
              <div>
                <p className={css({ fontSize: "xs", color: "muted" })}>Date</p>
                <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                  {date} at {time}
                </p>
              </div>
            </div>

            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 3,
                bg: "gray.800",
                borderRadius: "md",
              })}
            >
              <MapPin size={18} className={css({ color: "muted" })} />
              <div>
                <p className={css({ fontSize: "xs", color: "muted" })}>
                  Coordinates
                </p>
                <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </div>

            {session.notes && (
              <div
                className={css({
                  p: 3,
                  bg: "gray.800",
                  borderRadius: "md",
                })}
              >
                <p className={css({ fontSize: "xs", color: "muted", mb: 1 })}>
                  Notes
                </p>
                <p className={css({ fontSize: "sm", color: "text" })}>
                  {session.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
