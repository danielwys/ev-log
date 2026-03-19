"use client";

import { useState, useRef } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionSchema, SessionFormData, wktPoint, extractPlugShareId, PlugShareData } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { 
  X, Upload, MapPin, Loader2, Link2, AlertTriangle, Zap, Cable, Plug
} from "lucide-react";

interface NewLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewLogModal({ isOpen, onClose, onSuccess }: NewLogModalProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPlugShare, setIsFetchingPlugShare] = useState(false);
  const [plugShareError, setPlugShareError] = useState<string | null>(null);
  const [plugShareUrl, setPlugShareUrl] = useState("");
  const [connectorInput, setConnectorInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema) as Resolver<SessionFormData>,
    defaultValues: {
      photos: [],
      battery_start: 20,
      battery_end: 80,
      attempts: 1,
      successes: 0,
      connectors_tried: [],
      successful_connectors: [],
      technique_required: false,
    },
  });

  const connectorsTried = watch("connectors_tried") || [];
  const successfulConnectors = watch("successful_connectors") || [];
  const attempts = watch("attempts") || 1;
  const successes = watch("successes") || 0;
  const techniqueRequired = watch("technique_required") || false;

  const handleFetchPlugShare = async () => {
    if (!plugShareUrl.trim()) return;
    
    setIsFetchingPlugShare(true);
    setPlugShareError(null);
    
    try {
      const locationId = extractPlugShareId(plugShareUrl);
      
      if (!locationId) {
        setPlugShareError("Could not extract location ID from URL.");
        return;
      }
      
      const response = await fetch(`/api/plugshare?locationId=${locationId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch location data");
      }
      
      const data: PlugShareData = await response.json();
      
      setValue("station_name", data.name);
      setValue("operator", data.operator || "");
      setValue("latitude", data.latitude);
      setValue("longitude", data.longitude);
      setValue("notes", data.address ? `Address: ${data.address}` : "");
      
    } catch (error) {
      console.error("PlugShare fetch error:", error);
      setPlugShareError(error instanceof Error ? error.message : "Failed to fetch PlugShare data");
    } finally {
      setIsFetchingPlugShare(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      setUploadedPhotos((prev) => [...prev, ...uploadedUrls]);
      setValue("photos", [...uploadedPhotos, ...uploadedUrls]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photos. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = uploadedPhotos.filter((_, i) => i !== index);
    setUploadedPhotos(newPhotos);
    setValue("photos", newPhotos);
  };

  const addConnector = () => {
    if (!connectorInput.trim()) return;
    if (connectorsTried.includes(connectorInput.trim())) {
      setConnectorInput("");
      return;
    }
    const newConnectors = [...connectorsTried, connectorInput.trim()];
    setValue("connectors_tried", newConnectors);
    setConnectorInput("");
  };

  const removeConnector = (connector: string) => {
    const newConnectors = connectorsTried.filter((c) => c !== connector);
    setValue("connectors_tried", newConnectors);
    
    if (successfulConnectors.includes(connector)) {
      setValue("successful_connectors", successfulConnectors.filter((c) => c !== connector));
    }
  };

  const toggleSuccessfulConnector = (connector: string) => {
    if (successfulConnectors.includes(connector)) {
      setValue("successful_connectors", successfulConnectors.filter((c) => c !== connector));
    } else {
      setValue("successful_connectors", [...successfulConnectors, connector]);
    }
  };

  const onSubmit = async (data: SessionFormData) => {
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("sessions").insert({
        user_id: userData.user.id,
        station_name: data.station_name,
        operator: data.operator,
        max_kw: data.max_kw,
        battery_start: data.battery_start,
        battery_end: data.battery_end,
        location: wktPoint(data.latitude, data.longitude),
        photos: uploadedPhotos,
        notes: data.notes || null,
        charger_hardware_model: data.charger_hardware_model || null,
        charger_software: data.charger_software || null,
        cable_amp_limit: data.cable_amp_limit || null,
        stall_id: data.stall_id || null,
        plug_id: data.plug_id || null,
        connectors_tried: data.connectors_tried || [],
        successful_connectors: data.successful_connectors || [],
        attempts: data.attempts || 1,
        successes: data.successes || 0,
        error_code: data.error_code || null,
        failure_type: data.failure_type || null,
        technique_required: data.technique_required || false,
        technique_notes: data.technique_notes || null,
        price_per_kwh: data.price_per_kwh || null,
      } as any);

      if (error) throw error;

      reset();
      setUploadedPhotos([]);
      setPlugShareUrl("");
      onSuccess();
    } catch (error) {
      console.error("Submit error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to create session: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setUploadedPhotos([]);
    setPlugShareUrl("");
    setPlugShareError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            New Charging Session
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <div className="flex flex-col gap-5">
            
            {/* PlugShare URL Input */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Link2 size={16} />
                PlugShare URL (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={plugShareUrl}
                  onChange={(e) => setPlugShareUrl(e.target.value)}
                  placeholder="https://www.plugshare.com/location/..."
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleFetchPlugShare}
                  disabled={isFetchingPlugShare || !plugShareUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isFetchingPlugShare ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MapPin size={16} />
                  )}
                  {isFetchingPlugShare ? "Fetching..." : "Import"}
                </button>
              </div>
              {plugShareError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {plugShareError}
                </p>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name *
                </label>
                <input
                  {...register("station_name")}
                  type="text"
                  placeholder="e.g., Shell Recharge Bukit Batok"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.station_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.station_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator *
                </label>
                <input
                  {...register("operator")}
                  type="text"
                  placeholder="e.g., Shell, SP, Charge+"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.operator && (
                  <p className="text-xs text-red-600 mt-1">{errors.operator.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max kW Observed *
                </label>
                <input
                  {...register("max_kw")}
                  type="number"
                  step="0.1"
                  placeholder="e.g., 150"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.max_kw && (
                  <p className="text-xs text-red-600 mt-1">{errors.max_kw.message}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin size={14} />
                  Latitude *
                </label>
                <input
                  {...register("latitude")}
                  type="number"
                  step="any"
                  placeholder="1.3521"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.latitude && (
                  <p className="text-xs text-red-600 mt-1">{errors.latitude.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin size={14} />
                  Longitude *
                </label>
                <input
                  {...register("longitude")}
                  type="number"
                  step="any"
                  placeholder="103.8198"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.longitude && (
                  <p className="text-xs text-red-600 mt-1">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            {/* Battery Levels */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Start % *
                </label>
                <input
                  {...register("battery_start")}
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.battery_start && (
                  <p className="text-xs text-red-600 mt-1">{errors.battery_start.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery End % *
                </label>
                <input
                  {...register("battery_end")}
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.battery_end && (
                  <p className="text-xs text-red-600 mt-1">{errors.battery_end.message}</p>
                )}
              </div>
            </div>

            {/* Charger Details */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Cable size={16} className="text-purple-600" />
                Charger Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hardware Model
                  </label>
                  <input
                    {...register("charger_hardware_model")}
                    type="text"
                    placeholder="e.g., Starcharge Titan v3"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Software/Firmware
                  </label>
                  <input
                    {...register("charger_software")}
                    type="text"
                    placeholder="e.g., Starcharge native"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cable Amp Limit
                  </label>
                  <input
                    {...register("cable_amp_limit")}
                    type="number"
                    placeholder="e.g., 205"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stall ID
                  </label>
                  <input
                    {...register("stall_id")}
                    type="text"
                    placeholder="e.g., Stall 1, Bay B"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plug ID
                  </label>
                  <input
                    {...register("plug_id")}
                    type="text"
                    placeholder="e.g., CCS2, Plug 4"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per kWh (SGD)
                  </label>
                  <input
                    {...register("price_per_kwh")}
                    type="number"
                    step="0.0001"
                    placeholder="e.g., 0.55"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Connector Tracking */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Plug size={16} className="text-green-600" />
                Connector Tracking
              </h3>
              
              <div className="space-y-4">
                {/* Add Connector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connectors Tried
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={connectorInput}
                      onChange={(e) => setConnectorInput(e.target.value)}
                      placeholder="e.g., CCS1-01"
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addConnector();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addConnector}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Connector List */}
                {connectorsTried.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-2">Click to mark as successful:</p>
                    <div className="flex flex-wrap gap-2">
                      {connectorsTried.map((connector) => (
                        <button
                          key={connector}
                          type="button"
                          onClick={() => toggleSuccessfulConnector(connector)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            successfulConnectors.includes(connector)
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-gray-200 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {successfulConnectors.includes(connector) && <Zap size={12} />}
                          {connector}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              removeConnector(connector);
                            }}
                            className="ml-1 cursor-pointer hover:text-red-500"
                          >
                            &times;
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {successfulConnectors.length} of {connectorsTried.length} connectors worked
                    </p>
                  </div>
                )}

                {/* Attempts/Successes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Attempts
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setValue("attempts", Math.max(1, attempts - 1))}
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        -
                      </button>
                      <input
                        {...register("attempts")}
                        type="number"
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setValue("attempts", attempts + 1)}
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Successful Connections
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setValue("successes", Math.max(0, successes - 1))}
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        -
                      </button>
                      <input
                        {...register("successes")}
                        type="number"
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setValue("successes", Math.min(attempts, successes + 1))}
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Error Details (if failed)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Error Code
                  </label>
                  <input
                    {...register("error_code")}
                    type="text"
                    placeholder="e.g., 0xa00014"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Failure Type
                  </label>
                  <select
                    {...register("failure_type")}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="handshake">Handshake/Negotiation</option>
                    <option value="derating">Derating</option>
                    <option value="interruption">Interruption</option>
                    <option value="incompatible">Incompatible</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Technique Required */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  {...register("technique_required")}
                  type="checkbox"
                  id="technique_required"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="technique_required" className="text-sm font-medium text-gray-700">
                  Special technique required to connect
                </label>
              </div>
              
              {techniqueRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technique Notes
                  </label>
                  <textarea
                    {...register("technique_notes")}
                    rows={2}
                    placeholder="Describe the technique needed..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Notes
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Any additional notes about this charging session..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              />
            </div>

            {/* Photo Upload */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Click to upload photos
                  </>
                )}
              </button>

              {/* Photo Preview */}
              {uploadedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {uploadedPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={photo}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Session"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
