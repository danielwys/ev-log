"use client";

import { Session } from "@/lib/supabase";
import { X, MapPin, Edit2, Zap, Cable, Plug, Battery, DollarSign, Calendar, AlertTriangle, CheckCircle, BatteryCharging } from "lucide-react";

// Default battery capacity for GAC Aion V Luxury
const BATTERY_CAPACITY_KWH = 75.3;

interface SidePanelProps {
  session: Session;
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
  onEdit?: (session: Session) => void;
  currentUserId?: string;
}

export function SidePanel({ session, onClose, onLocate, onEdit, currentUserId }: SidePanelProps) {
  const canEdit = currentUserId && session.user_id === currentUserId;

  const handleLocate = () => {
    // Parse WKT point to get lat/lng
    try {
      const match = session.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        onLocate(lat, lng);
      }
    } catch (e) {
      console.error("Failed to parse location:", e);
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Station Name */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{session.station_name}</h2>
          {session.operator && (
            <p className="text-sm text-gray-500 mt-1">{session.operator}</p>
          )}
        </div>

        {/* Locate Button */}
        <button
          onClick={handleLocate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          <MapPin size={16} />
          Center on Map
        </button>

        {/* Charging Summary */}
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

          {/* Energy & Efficiency */}
          <EnergyEfficiencyDisplay session={session} />
        </div>

        {/* Technical Details */}
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

          {/* Success Rate */}
          {successRate !== null && (
            <div className={`p-3 rounded-lg flex items-center justify-between ${
              successRate >= 75
                ? "bg-green-50"
                : successRate >= 25
                ? "bg-yellow-50"
                : "bg-red-50"
            }`}>
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
              <span className={`text-lg font-bold ${
                successRate >= 75
                  ? "text-green-700"
                  : successRate >= 25
                  ? "text-yellow-700"
                  : "text-red-700"
              }`}>
                {session.successes}/{session.attempts} ({successRate}%)
              </span>
            </div>
          )}

          {/* Error Code */}
          {session.error_code && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xs text-red-600 mb-1">Error Code</div>
              <div className="text-sm font-mono font-medium text-red-800">
                {session.error_code}
              </div>
            </div>
          )}

          {/* Technique Required */}
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

        {/* Pricing */}
        {session.price_per_kwh && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-xs text-green-600">Price</div>
              <div className="text-sm font-semibold text-green-800">
                SGD {session.price_per_kwh}/kWh
              </div>
            </div>
          </div>
        )}

        {/* Photos */}
        {session.photos && session.photos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Photos ({session.photos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {session.photos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`Session photo ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {session.notes}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t border-gray-100">
          <Calendar className="w-4 h-4" />
          {formatDate(session.created_at)}
        </div>
      </div>
    </div>
  );
}

// Energy & Efficiency Display Component
interface EnergyEfficiencyDisplayProps {
  session: Session;
}

function EnergyEfficiencyDisplay({ session }: EnergyEfficiencyDisplayProps) {
  // Calculate kWh stored based on battery percentage change
  const socChange = session.battery_end - session.battery_start;
  const kwhStored = (socChange / 100) * BATTERY_CAPACITY_KWH;
  
  // Get kWh delivered from session
  const kwhDelivered = session.kwh_delivered;
  
  // Calculate efficiency if kWh delivered is available
  const efficiency = kwhDelivered && kwhDelivered > 0
    ? (kwhStored / kwhDelivered) * 100
    : null;

  // Determine efficiency color
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

  // If no kWh delivered data, show simplified view
  if (!kwhDelivered) {
    return (
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BatteryCharging className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Energy</span>
        </div>
        <div className="text-sm text-gray-500">
          Energy stored: <span className="font-semibold text-gray-900">{kwhStored.toFixed(2)} kWh</span>
          <span className="text-xs text-gray-400 ml-1">(calculated)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Energy Delivered */}
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Energy Delivered</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {kwhDelivered.toFixed(3)} kWh
          </span>
        </div>
      </div>

      {/* Energy Stored (Calculated) */}
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Energy Stored</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {kwhStored.toFixed(2)} kWh
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {socChange.toFixed(1)}% × {BATTERY_CAPACITY_KWH} kWh capacity
        </div>
      </div>

      {/* Efficiency */}
      {efficiency && (
        <div className={`p-3 rounded-lg border ${getEfficiencyBg(efficiency)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${getEfficiencyColor(efficiency)}`} />
              <span className="text-sm font-medium text-gray-700">Efficiency</span>
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
