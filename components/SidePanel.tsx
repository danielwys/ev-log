"use client";

import { css } from "@/styled-system/css";
import { Session } from "@/lib/supabase";
import { parseWktPoint } from "@/lib/validation";
import { 
  X, Zap, Battery, Calendar, MapPin, Navigation, Pencil, 
  Cable, Plug, AlertTriangle, Wallet, Cpu, Hash, Lightbulb
} from "lucide-react";
import Image from "next/image";

interface SidePanelProps {
  session: Session;
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
  onEdit?: (session: Session) => void;
  currentUserId?: string;
}

export function SidePanel({ session, onClose, onLocate, onEdit, currentUserId }: SidePanelProps) {
  const { lat, lng } = parseWktPoint(session.location);
  const batteryAdded = session.battery_end - session.battery_start;
  const canEdit = currentUserId && session.user_id === currentUserId;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={css({
        width: "420px",
        maxWidth: "100%",
        bg: "gray.50",
        borderLeft: "1px solid",
        borderColor: "gray.200",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideIn 0.3s ease-out",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
      })}
    >
      {/* Header Card */}
      <div
        className={css({
          bg: "white",
          px: 5,
          py: 4,
          borderBottom: "1px solid",
          borderColor: "gray.200",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        })}
      >
        <div
          className={css({
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 3,
          })}
        >
          <div className={css({ flex: 1, minWidth: 0 })}>
            <h2
              className={css({
                fontSize: "xl",
                fontWeight: "bold",
                color: "gray.900",
                lineHeight: "1.3",
                mb: 1,
              })}
            >
              {session.station_name}
            </h2>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                color: "gray.500",
                fontSize: "sm",
              })}
            >
              <Zap size={14} />
              <span>{session.operator}</span>
            </div>
          </div>
          <div className={css({ display: "flex", gap: 1 })}>
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(session)}
                className={css({
                  p: 2,
                  borderRadius: "lg",
                  color: "gray.500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  _hover: { color: "blue.600", bg: "blue.50" },
                })}
                title="Edit session"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              onClick={() => onLocate(lat, lng)}
              className={css({
                p: 2,
                borderRadius: "lg",
                color: "gray.500",
                cursor: "pointer",
                transition: "all 0.2s",
                _hover: { color: "blue.600", bg: "blue.50" },
              })}
              title="Locate on map"
            >
              <Navigation size={18} />
            </button>
            <button
              onClick={onClose}
              className={css({
                p: 2,
                borderRadius: "lg",
                color: "gray.500",
                cursor: "pointer",
                transition: "all 0.2s",
                _hover: { color: "gray.700", bg: "gray.100" },
              })}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={css({
          flex: 1,
          overflowY: "auto",
          px: 5,
          py: 5,
        })}
      >
        {/* Photos Gallery */}
        {session.photos && session.photos.length > 0 && (
          <div className={css({ mb: 6 })}>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 3,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "purple.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <span className={css({ fontSize: "md" })}>📷</span>
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "gray.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Photos
              </h3>
            </div>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: session.photos.length === 1 ? "1fr" : "repeat(2, 1fr)",
                gap: 2,
              })}
            >
              {session.photos.map((photo, index) => (
                <div
                  key={index}
                  className={css({
                    position: "relative",
                    aspectRatio: "4/3",
                    borderRadius: "xl",
                    overflow: "hidden",
                    bg: "gray.200",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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

        {/* Charging Summary Card */}
        <div
          className={css({
            bg: "white",
            borderRadius: "xl",
            p: 4,
            mb: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: "gray.100",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 4,
            })}
          >
            <div
              className={css({
                w: 8,
                h: 8,
                borderRadius: "lg",
                bg: "green.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Battery size={16} className={css({ color: "green.600" })} />
            </div>
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "semibold",
                color: "gray.700",
                textTransform: "uppercase",
                letterSpacing: "wide",
              })            >
              Charging Summary
            </h3>
          </div>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 3,
            })}
          >
            <div
              className={css({
                textAlign: "center",
                p: 3,
                bg: "red.50",
                borderRadius: "lg",
              })}
            >
              <p className={css({ fontSize: "xs", color: "red.600", mb: 1 })}>
                Start
              </p>
              <p className={css({ fontSize: "2xl", fontWeight: "bold", color: "red.700" })}>
                {session.battery_start}%
              </p>
            </div>
            <div
              className={css({
                textAlign: "center",
                p: 3,
                bg: "blue.50",
                borderRadius: "lg",
              })}
            >
              <p className={css({ fontSize: "xs", color: "blue.600", mb: 1 })}>
                End
              </p>
              <p className={css({ fontSize: "2xl", fontWeight: "bold", color: "blue.700" })}>
                {session.battery_end}%
              </p>
            </div>
            <div
              className={css({
                textAlign: "center",
                p: 3,
                bg: batteryAdded > 0 ? "green.50" : "orange.50",
                borderRadius: "lg",
              })}
            >
              <p
                className={css({
                  fontSize: "xs",
                  color: batteryAdded > 0 ? "green.600" : "orange.600",
                  mb: 1,
                })}
              >
                Added
              </p>
              <p
                className={css({
                  fontSize: "2xl",
                  fontWeight: "bold",
                  color: batteryAdded > 0 ? "green.700" : "orange.700",
                })}
              >
                {batteryAdded > 0 ? "+" : ""}
                {batteryAdded}%
              </p>
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div
          className={css({
            bg: "white",
            borderRadius: "xl",
            p: 4,
            mb: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: "gray.100",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 4,
            })}
          >
            <div
              className={css({
                w: 8,
                h: 8,
                borderRadius: "lg",
                bg: "yellow.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Zap size={16} className={css({ color: "yellow.700" })} />
            </div>
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "semibold",
                color: "gray.700",
                textTransform: "uppercase",
                letterSpacing: "wide",
              })}
            >
              Performance
            </h3>
          </div>

          <div className={css({ spaceY: 3 })}>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 3,
                bg: "gray.50",
                borderRadius: "lg",
              })}
            >
              <div className={css({ display: "flex", alignItems: "center", gap: 3 })}>
                <div
                  className={css({
                    w: 10,
                    h: 10,
                    borderRadius: "lg",
                    bg: "yellow.500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Zap size={20} className={css({ color: "white" })} />
                </div>
                <div>
                  <p className={css({ fontSize: "xs", color: "gray.500" })}>
                    Max Power
                  </p>
                  <p className={css({ fontSize: "lg", fontWeight: "bold", color: "gray.900" })}>
                    {session.max_kw.toFixed(1)} kW
                  </p>
                </div>
              </div>
            </div>

            {session.price_per_kwh && (
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 3,
                  bg: "gray.50",
                  borderRadius: "lg",
                })}
              >
                <div className={css({ display: "flex", alignItems: "center", gap: 3 })}>
                  <div
                    className={css({
                      w: 10,
                      h: 10,
                      borderRadius: "lg",
                      bg: "emerald.500",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Wallet size={20} className={css({ color: "white" })} />
                  </div>
                  <div>
                    <p className={css({ fontSize: "xs", color: "gray.500" })}>
                      Price per kWh
                    </p>
                    <p className={css({ fontSize: "lg", fontWeight: "bold", color: "gray.900" })}>
                      ${session.price_per_kwh.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Specs Card */}
        {(session.charger_hardware_model || session.charger_software || session.cable_amp_limit) && (
          <div
            className={css({
              bg: "white",
              borderRadius: "xl",
              p: 4,
              mb: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: "gray.100",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 4,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "blue.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Cpu size={16} className={css({ color: "blue.600" })} />
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "gray.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Technical Specs
              </h3>
            </div>

            <div className={css({ spaceY: 3 })}>
              {session.charger_hardware_model && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 3,
                    bg: "gray.50",
                    borderRadius: "lg",
                  })}
                >
                  <Cable size={18} className={css({ color: "gray.400" })} />
                  <div>
                    <p className={css({ fontSize: "xs", color: "gray.500" })}>
                      Hardware Model
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                      {session.charger_hardware_model}
                    </p>
                  </div>
                </div>
              )}

              {session.charger_software && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 3,
                    bg: "gray.50",
                    borderRadius: "lg",
                  })}
                >
                  <Cpu size={18} className={css({ color: "gray.400" })} />
                  <div>
                    <p className={css({ fontSize: "xs", color: "gray.500" })}>
                      Software
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                      {session.charger_software}
                    </p>
                  </div>
                </div>
              )}

              {session.cable_amp_limit && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 3,
                    bg: "gray.50",
                    borderRadius: "lg",
                  })}
                >
                  <Zap size={18} className={css({ color: "gray.400" })} />
                  <div>
                    <p className={css({ fontSize: "xs", color: "gray.500" })}>
                      Cable Amp Limit
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                      {session.cable_amp_limit}A
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connector Info Card */}
        {(session.connectors_tried && session.connectors_tried.length > 0) && (
          <div
            className={css({
              bg: "white",
              borderRadius: "xl",
              p: 4,
              mb: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: "gray.100",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 4,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "violet.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Plug size={16} className={css({ color: "violet.600" })} />
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "gray.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Connectors
              </h3>
            </div>

            <div className={css({ spaceY: 3 })}>
              <div>
                <p className={css({ fontSize: "xs", color: "gray.500", mb: 2 })}>
                  Attempted ({session.connectors_tried.length})
                </p>
                <div className={css({ display: "flex", flexWrap: "wrap", gap: 2 })}>
                  {session.connectors_tried.map((connector) => (
                    <span
                      key={connector}
                      className={css({
                        px: 3,
                        py: 1,
                        bg: session.successful_connectors?.includes(connector) ? "green.100" : "gray.200",
                        color: session.successful_connectors?.includes(connector) ? "green.700" : "gray.600",
                        borderRadius: "full",
                        fontSize: "sm",
                        fontWeight: "medium",
                      })}
                    >
                      {session.successful_connectors?.includes(connector) && "✓ "}
                      {connector}
                    </span>
                  ))}
                </div>
              </div>

              {(session.attempts !== undefined && session.attempts > 0) && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 3,
                    bg: "gray.50",
                    borderRadius: "lg",
                    mt: 3,
                  })}
                >
                  <span className={css({ fontSize: "sm", color: "gray.600" })}>
                    Success Rate
                  </span>
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "bold",
                      color: session.successes && session.successes >= session.attempts ? "green.600" : "orange.600",
                    })}
                  >
                    {session.successes || 0} / {session.attempts}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Details Card */}
        {(session.error_code || session.failure_type) && (
          <div
            className={css({
              bg: "white",
              borderRadius: "xl",
              p: 4,
              mb: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: "red.200",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 4,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "red.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <AlertTriangle size={16} className={css({ color: "red.600" })} />
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "red.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Error Details
              </h3>
            </div>

            <div className={css({ spaceY: 3 })}>
              {session.error_code && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 3,
                    bg: "red.50",
                    borderRadius: "lg",
                  })}
                >
                  <Hash size={18} className={css({ color: "red.500" })} />
                  <div>
                    <p className={css({ fontSize: "xs", color: "red.500" })}>
                      Error Code
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", color: "red.700" })}>
                      {session.error_code}
                    </p>
                  </div>
                </div>
              )}

              {session.failure_type && (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 3,
                    bg: "red.50",
                    borderRadius: "lg",
                  })}
                >
                  <AlertTriangle size={18} className={css({ color: "red.500" })} />
                  <div>
                    <p className={css({ fontSize: "xs", color: "red.500" })}>
                      Failure Type
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", color: "red.700" })}>
                      {session.failure_type}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technique Required Card */}
        {session.technique_required && (
          <div
            className={css({
              bg: "white",
              borderRadius: "xl",
              p: 4,
              mb: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: "amber.200",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 4,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "amber.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Lightbulb size={16} className={css({ color: "amber.600" })} />
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "amber.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Technique Required
              </h3>
            </div>

            {session.technique_notes && (
              <div
                className={css({
                  p: 3,
                  bg: "amber.50",
                  borderRadius: "lg",
                })}
              >
                <p className={css({ fontSize: "sm", color: "amber.800" })}>
                  {session.technique_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location Card */}
        <div
          className={css({
            bg: "white",
            borderRadius: "xl",
            p: 4,
            mb: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: "gray.100",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 4,
            })}
          >
            <div
              className={css({
                w: 8,
                h: 8,
                borderRadius: "lg",
                bg: "cyan.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <MapPin size={16} className={css({ color: "cyan.600" })} />
            </div>
            <h3
              className={css({
                fontSize: "sm",
                fontWeight: "semibold",
                color: "gray.700",
                textTransform: "uppercase",
                letterSpacing: "wide",
              })}
            >
              Location & Time
            </h3>
          </div>

          <div className={css({ spaceY: 3 })}>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 3,
                bg: "gray.50",
                borderRadius: "lg",
              })}
            >
              <Calendar size={18} className={css({ color: "gray.400" })} />
              <div>
                <p className={css({ fontSize: "xs", color: "gray.500" })}>
                  Date & Time
                </p>
                <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                  {formatDate(session.created_at)} at {formatTime(session.created_at)}
                </p>
              </div>
            </div>

            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 3,
                bg: "gray.50",
                borderRadius: "lg",
              })}
            >
              <MapPin size={18} className={css({ color: "gray.400" })} />
              <div>
                <p className={css({ fontSize: "xs", color: "gray.500" })}>
                  Coordinates
                </p>
                <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </div>

            {(session.stall_id || session.plug_id) && (
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  p: 3,
                  bg: "gray.50",
                  borderRadius: "lg",
                })}
              >
                <Hash size={18} className={css({ color: "gray.400" })} />
                <div>
                  <p className={css({ fontSize: "xs", color: "gray.500" })}>
                    Stall / Plug
                  </p>
                  <p className={css({ fontSize: "sm", fontWeight: "medium", color: "gray.900" })}>
                    {session.stall_id || "N/A"} / {session.plug_id || "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Card */}
        {session.notes && (
          <div
            className={css({
              bg: "white",
              borderRadius: "xl",
              p: 4,
              mb: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: "gray.100",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 4,
              })}
            >
              <div
                className={css({
                  w: 8,
                  h: 8,
                  borderRadius: "lg",
                  bg: "gray.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <span className={css({ fontSize: "md" })}>📝</span>
              </div>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "semibold",
                  color: "gray.700",
                  textTransform: "uppercase",
                  letterSpacing: "wide",
                })}
              >
                Notes
              </h3>
            </div>

            <div
              className={css({
                p: 3,
                bg: "gray.50",
                borderRadius: "lg",
              })}
            >
              <p className={css({ fontSize: "sm", color: "gray.700", lineHeight: "relaxed" })}>
                {session.notes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
