"use client";

import { useState } from "react";
import { Session, LocationGroup } from "@/lib/db";
import {
  X,
  MapPin,
  Edit2,
  Zap,
  Cable,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BatteryCharging,
  Battery,
  DollarSign,
  ChevronLeft,
  List,
  Navigation,
  Calculator,
} from "lucide-react";

const BATTERY_CAPACITY_KWH = 75.3;

interface SidePanelProps {
  location: LocationGroup | null;
  session: Session | null;
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
  onSessionSelect: (session: Session) => void;
  onBackToLocation: () => void;
  onEdit?: (session: Session) => void;
  currentUserId?: string;
}

export function SidePanel({
  location,
  session,
  onClose,
  onLocate,
  onSessionSelect,
  onBackToLocation,
  onEdit,
  currentUserId,
}: SidePanelProps) {
  if (session) {
    return (
      <SessionDetailView
        session={session}
        onClose={onClose}
        onBack={onBackToLocation}
        onLocate={onLocate}
        onEdit={onEdit}
        currentUserId={currentUserId}
      />
    );
  }

  if (location) {
    return (
      <LocationListView
        location={location}
        onClose={onClose}
        onLocate={onLocate}
        onSessionSelect={onSessionSelect}
      />
    );
  }

  return null;
}

interface LocationListViewProps {
  location: LocationGroup;
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
  onSessionSelect: (session: Session) => void;
}

function LocationListView({
  location,
  onClose,
  onLocate,
  onSessionSelect,
}: LocationListViewProps) {
  const handleLocate = () => onLocate(location.lat, location.lng);

  const getSuccessRate = (session: Session) => {
    if (!session.attempts || session.attempts === 0) return null;
    return Math.round((session.successes / session.attempts) * 100);
  };

  const getEfficiency = (session: Session) => {
    if (!session.kwh_delivered || session.kwh_delivered <= 0) return null;
    const socChange = session.battery_end - session.battery_start;
    const kwhStored = (socChange / 100) * BATTERY_CAPACITY_KWH;
    return (kwhStored / session.kwh_delivered) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-SG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              location.pinColor === "green"
                ? "bg-green-500"
                : location.pinColor === "red"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Location
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">
              {location.sessionCount} session
              {location.sessionCount !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-300">•</span>
            <span
              className={`text-sm font-medium ${
                location.pinColor === "green"
                  ? "text-green-600"
                  : location.pinColor === "red"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {location.pinColor === "green"
                ? "Good experience"
                : location.pinColor === "red"
                ? "Problematic"
                : "Mixed results"}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={handleLocate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Navigation size={16} />
            Center on Map
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <List className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Charging Sessions
            </h3>
          </div>

          <div className="space-y-3">
            {location.sessions.map((session) => {
              const successRate = getSuccessRate(session);
              const efficiency = getEfficiency(session);

              return (
                <button
                  key={session.id}
                  onClick={() => onSessionSelect(session)}
                  className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(session.created_at)}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        session.pin_color === "green"
                          ? "bg-green-500"
                          : session.pin_color === "red"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {successRate !== null && (
                      <div className="flex items-center gap-1">
                        {successRate >= 75 ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-yellow-600" />
                        )}
                        <span
                          className={
                            successRate >= 75
                              ? "text-green-700"
                              : successRate >= 25
                              ? "text-yellow-700"
                              : "text-red-700"
                          }
                        >
                          {successRate}%
                        </span>
                      </div>
                    )}
                    {session.max_kw > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-600" />
                        <span className="text-gray-600">{session.max_kw} kW</span>
                      </div>
                    )}
                    {efficiency !== null && (
                      <div className="flex items-center gap-1">
                        <BatteryCharging className="w-3 h-3 text-purple-600" />
                        <span
                          className={
                            efficiency > 85
                              ? "text-green-700"
                              : efficiency >= 75
                              ? "text-yellow-700"
                              : "text-red-700"
                          }
                        >
                          {efficiency.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {session.charger_hardware_model && (
                    <div className="mt-2 text-xs text-gray-500">
                      {session.charger_hardware_model}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-blue-600 font-medium group-hover:text-blue-700">
                    View Details →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SessionDetailViewProps {
  session: Session;
  onClose: () => void;
  onBack: () => void;
  onLocate: (lat: number, lng: number) => void;
  onEdit?: (session: Session) => void;
  currentUserId?: string;
}

function SessionDetailView({
  session,
  onClose,
  onBack,
  onLocate,
  onEdit,
  currentUserId,
}: SessionDetailViewProps) {
  const canEdit = currentUserId && session.user_id === currentUserId;

  const handleLocate = () => {
    const match = session.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      onLocate(parseFloat(match[2]), parseFloat(match[1]));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-SG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSuccessRate = () => {
    if (!session.attempts || session.attempts === 0) return null;
    return Math.round((session.successes / session.attempts) * 100);
  };

  const successRate = getSuccessRate();

  return (
    <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Back to location"
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className={`w-3 h-3 rounded-full ${
              session.pin_color === "green"
                ? "bg-green-500"
                : session.pin_color === "red"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Session Details
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(session)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit session"
            >
              <Edit2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {session.station_name}
          </h2>
          {session.operator && (
            <p className="text-sm text-gray-500 mt-1">{session.operator}</p>
          )}
        </div>

        <button
          onClick={handleLocate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          <MapPin size={16} />
          Center on Map
        </button>

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Charging Summary
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {session.battery_start}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Start</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {session.battery_end}%
              </div>
              <div className="text-xs text-gray-500 mt-1">End</div>
            </div>
          </div>

          {session.max_kw && (
            <div className="mb-3 flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm text-gray-600">Peak Power</span>
              <span className="text-lg font-semibold text-gray-900">
                {session.max_kw} kW
              </span>
            </div>
          )}

          <EnergyEfficiencyDisplay session={session} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Technical Details
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {session.charger_hardware_model && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Hardware</div>
                <div className="text-sm font-medium text-gray-900">
                  {session.charger_hardware_model}
                </div>
              </div>
            )}
            {session.charger_software && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Software</div>
                <div className="text-sm font-medium text-gray-900">
                  {session.charger_software}
                </div>
              </div>
            )}
            {session.cable_amp_limit && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Cable Amp Limit</div>
                <div className="text-sm font-medium text-gray-900">
                  {session.cable_amp_limit}A
                </div>
              </div>
            )}
            {session.stall_id && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Stall / Plug</div>
                <div className="text-sm font-medium text-gray-900">
                  {session.stall_id}
                  {session.plug_id && ` / ${session.plug_id}`}
                </div>
              </div>
            )}
          </div>

          {successRate !== null && (
            <div
              className={`p-3 rounded-lg flex items-center justify-between ${
                successRate >= 75
                  ? "bg-green-50"
                  : successRate >= 25
                  ? "bg-yellow-50"
                  : "bg-red-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {successRate >= 75 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  Success Rate
                </span>
              </div>
              <span
                className={`text-lg font-bold ${
                  successRate >= 75
                    ? "text-green-700"
                    : successRate >= 25
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {session.successes}/{session.attempts} ({successRate}%)
              </span>
            </div>
          )}

          {session.error_code && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xs text-red-600 mb-1">Error Code</div>
              <div className="text-sm font-mono font-medium text-red-800">
                {session.error_code}
              </div>
            </div>
          )}

          {session.technique_required && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-xs text-yellow-700 mb-1 font-medium">
                Technique Required
              </div>
              {session.technique_notes && (
                <div className="text-sm text-yellow-800">
                  {session.technique_notes}
                </div>
              )}
            </div>
          )}
        </div>

        {session.price_per_kwh && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-xs text-green-600">Charger Price</div>
                <div className="text-sm font-semibold text-green-800">
                  SGD {session.price_per_kwh}/kWh
                </div>
              </div>
            </div>

            {/* Effective cost after efficiency losses */}
            {session.kwh_delivered &&
              session.battery_start !== undefined &&
              session.battery_end !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-xs text-blue-600">
                      Effective Cost (after losses)
                    </div>
                    <div className="text-sm font-semibold text-blue-800">
                      SGD{" "}
                      {(() => {
                        const kwhStored =
                          ((session.battery_end - session.battery_start) / 100) *
                          75.3;
                        const efficiency = kwhStored / session.kwh_delivered;
                        const effectiveCost = session.price_per_kwh / efficiency;
                        return effectiveCost.toFixed(2);
                      })()}
                      /kWh
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      You paid SGD {session.price_per_kwh} for delivered energy,
                      but only{" "}
                      {(() => {
                        const kwhStored =
                          ((session.battery_end - session.battery_start) / 100) *
                          75.3;
                        return ((kwhStored / session.kwh_delivered) * 100).toFixed(
                          0
                        );
                      })()}
                      % made it to the battery
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {session.photos && session.photos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Photos ({session.photos.length})
            </h3>
            <PhotoGallery photos={session.photos} />
          </div>
        )}

        {session.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {session.notes}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t border-gray-100">
          <Calendar className="w-4 h-4" />
          {formatDate(session.created_at)}
        </div>
      </div>
    </div>
  );
}

interface PhotoGalleryProps {
  photos: string[];
}

/**
 * Photo gallery with thumbnail grid and lightbox
 * - Displays thumbnails (400px width WebP)
 * - Opens lightbox with full WebP on click
 * - Supports original fallback if needed
 */
function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Convert full WebP URL to thumbnail URL
  const getThumbnailUrl = (photoUrl: string): string => {
    // If it's already a thumbnail, return as-is
    if (photoUrl.includes("-thumb.webp")) {
      return photoUrl;
    }
    // If it's a processed WebP, convert to thumbnail
    if (photoUrl.includes("/uploads/processed/")) {
      return photoUrl.replace(".webp", "-thumb.webp");
    }
    // Fallback: return original
    return photoUrl;
  };

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => openLightbox(idx)}
            className="relative w-full h-24 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
          >
            <img
              src={getThumbnailUrl(photo)}
              alt={`Session photo ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors rotate-180"
              >
                <ChevronLeft size={32} />
              </button>
            </>
          )}

          {/* Image counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
          )}

          {/* Full image */}
          <img
            src={photos[currentIndex]}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-[90%] max-h-[90%] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

interface EnergyEfficiencyDisplayProps {
  session: Session;
}

function EnergyEfficiencyDisplay({ session }: EnergyEfficiencyDisplayProps) {
  const socChange = session.battery_end - session.battery_start;
  const kwhStored = (socChange / 100) * BATTERY_CAPACITY_KWH;
  const kwhDelivered = session.kwh_delivered;
  const efficiency =
    kwhDelivered && kwhDelivered > 0
      ? (kwhStored / kwhDelivered) * 100
      : null;

  const getEfficiencyColor = (eff: number): string => {
    if (eff > 85) return "text-green-600";
    if (eff >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyBg = (eff: number): string => {
    if (eff > 85) return "bg-green-100 border-green-200";
    if (eff >= 75) return "bg-yellow-100 border-yellow-200";
    return "bg-red-100 border-red-200";
  };

  if (!kwhDelivered) {
    return (
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BatteryCharging className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Energy</span>
        </div>
        <div className="text-sm text-gray-500">
          Energy stored:{" "}
          <span className="font-semibold text-gray-900">
            {kwhStored.toFixed(2)} kWh
          </span>
          <span className="text-xs text-gray-400 ml-1">(calculated)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">
              Energy Delivered
            </span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {kwhDelivered.toFixed(3)} kWh
          </span>
        </div>
      </div>

      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">
              Energy Stored
            </span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {kwhStored.toFixed(2)} kWh
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {socChange.toFixed(1)}% × {BATTERY_CAPACITY_KWH} kWh capacity
        </div>
      </div>

      {efficiency && (
        <div className={`p-3 rounded-lg border ${getEfficiencyBg(efficiency)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${getEfficiencyColor(efficiency)}`} />
              <span className="text-sm font-medium text-gray-700">
                Efficiency
              </span>
            </div>
            <span className={`text-xl font-bold ${getEfficiencyColor(efficiency)}`}>
              {efficiency.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {efficiency > 85
              ? "Excellent charging efficiency"
              : efficiency >= 75
              ? "Good charging efficiency"
              : "Poor efficiency - check for issues"}
          </div>
        </div>
      )}
    </div>
  );
}