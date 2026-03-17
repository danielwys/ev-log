"use client";

import { useState, useRef } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { css } from "@/styled-system/css";
import { sessionSchema, SessionFormData, wktPoint } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { X, Upload, MapPin, Loader2 } from "lucide-react";

interface NewLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewLogModal({ isOpen, onClose, onSuccess }: NewLogModalProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema) as Resolver<SessionFormData>,
    defaultValues: {
      photos: [],
      battery_start: 20,
      battery_end: 80,
    },
  });

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
      } as any);

      if (error) throw error;

      reset();
      setUploadedPhotos([]);
      onSuccess();
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to create session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setUploadedPhotos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={css({
        position: "fixed",
        inset: 0,
        bg: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 4,
      })}
      onClick={handleClose}
    >
      <div
        className={css({
          bg: "surface",
          borderRadius: "xl",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        })}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 6,
            py: 4,
            borderBottom: "1px solid",
            borderColor: "gray.700",
          })}
        >
          <h2 className={css({ fontSize: "xl", fontWeight: "bold", color: "text" })}>
            New Charging Session
          </h2>
          <button
            onClick={handleClose}
            className={css({
              p: 2,
              borderRadius: "md",
              color: "muted",
              cursor: "pointer",
              _hover: { color: "text", bg: "gray.700" },
              transition: "all 0.2s",
            })}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={css({
            flex: 1,
            overflowY: "auto",
            px: 6,
            py: 4,
          })}
        >
          <div className={css({ display: "flex", flexDirection: "column", gap: 4 })}>
            {/* Station Name */}
            <div>
              <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                Station Name *
              </label>
              <input
                {...register("station_name")}
                type="text"
                placeholder="e.g., Shell Recharge Bukit Batok"
                className={css({
                  width: "100%",
                  px: 3,
                  py: 2,
                  bg: "gray.800",
                  border: "1px solid",
                  borderColor: errors.station_name ? "danger" : "gray.700",
                  borderRadius: "md",
                  color: "text",
                  fontSize: "sm",
                  _focus: { outline: "none", borderColor: "primary" },
                  _placeholder: { color: "gray.500" },
                })}
              />
              {errors.station_name && (
                <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                  {errors.station_name.message}
                </p>
              )}
            </div>

            {/* Operator */}
            <div>
              <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                Operator *
              </label>
              <input
                {...register("operator")}
                type="text"
                placeholder="e.g., Shell, SP, Charge+"
                className={css({
                  width: "100%",
                  px: 3,
                  py: 2,
                  bg: "gray.800",
                  border: "1px solid",
                  borderColor: errors.operator ? "danger" : "gray.700",
                  borderRadius: "md",
                  color: "text",
                  fontSize: "sm",
                  _focus: { outline: "none", borderColor: "primary" },
                  _placeholder: { color: "gray.500" },
                })}
              />
              {errors.operator && (
                <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                  {errors.operator.message}
                </p>
              )}
            </div>

            {/* Max kW */}
            <div>
              <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                Max kW Observed *
              </label>
              <input
                {...register("max_kw")}
                type="number"
                step="0.1"
                placeholder="e.g., 150"
                className={css({
                  width: "100%",
                  px: 3,
                  py: 2,
                  bg: "gray.800",
                  border: "1px solid",
                  borderColor: errors.max_kw ? "danger" : "gray.700",
                  borderRadius: "md",
                  color: "text",
                  fontSize: "sm",
                  _focus: { outline: "none", borderColor: "primary" },
                  _placeholder: { color: "gray.500" },
                })}
              />
              {errors.max_kw && (
                <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                  {errors.max_kw.message}
                </p>
              )}
            </div>

            {/* Battery Levels */}
            <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 })}>
              <div>
                <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                  Battery Start % *
                </label>
                <input
                  {...register("battery_start")}
                  type="number"
                  min="0"
                  max="100"
                  className={css({
                    width: "100%",
                    px: 3,
                    py: 2,
                    bg: "gray.800",
                    border: "1px solid",
                    borderColor: errors.battery_start ? "danger" : "gray.700",
                    borderRadius: "md",
                    color: "text",
                    fontSize: "sm",
                    _focus: { outline: "none", borderColor: "primary" },
                  })}
                />
                {errors.battery_start && (
                  <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                    {errors.battery_start.message}
                  </p>
                )}
              </div>

              <div>
                <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                  Battery End % *
                </label>
                <input
                  {...register("battery_end")}
                  type="number"
                  min="0"
                  max="100"
                  className={css({
                    width: "100%",
                    px: 3,
                    py: 2,
                    bg: "gray.800",
                    border: "1px solid",
                    borderColor: errors.battery_end ? "danger" : "gray.700",
                    borderRadius: "md",
                    color: "text",
                    fontSize: "sm",
                    _focus: { outline: "none", borderColor: "primary" },
                  })}
                />
                {errors.battery_end && (
                  <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                    {errors.battery_end.message}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 })}>
              <div>
                <label className={css({ display: "flex", alignItems: "center", gap: 1, fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                  <MapPin size={14} />
                  Latitude *
                </label>
                <input
                  {...register("latitude")}
                  type="number"
                  step="any"
                  placeholder="1.3521"
                  className={css({
                    width: "100%",
                    px: 3,
                    py: 2,
                    bg: "gray.800",
                    border: "1px solid",
                    borderColor: errors.latitude ? "danger" : "gray.700",
                    borderRadius: "md",
                    color: "text",
                    fontSize: "sm",
                    _focus: { outline: "none", borderColor: "primary" },
                    _placeholder: { color: "gray.500" },
                  })}
                />
                {errors.latitude && (
                  <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              <div>
                <label className={css({ display: "flex", alignItems: "center", gap: 1, fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                  <MapPin size={14} />
                  Longitude *
                </label>
                <input
                  {...register("longitude")}
                  type="number"
                  step="any"
                  placeholder="103.8198"
                  className={css({
                    width: "100%",
                    px: 3,
                    py: 2,
                    bg: "gray.800",
                    border: "1px solid",
                    borderColor: errors.longitude ? "danger" : "gray.700",
                    borderRadius: "md",
                    color: "text",
                    fontSize: "sm",
                    _focus: { outline: "none", borderColor: "primary" },
                    _placeholder: { color: "gray.500" },
                  })}
                />
                {errors.longitude && (
                  <p className={css({ fontSize: "xs", color: "danger", mt: 1 })}>
                    {errors.longitude.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                Notes
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Any additional notes about this charging session..."
                className={css({
                  width: "100%",
                  px: 3,
                  py: 2,
                  bg: "gray.800",
                  border: "1px solid",
                  borderColor: "gray.700",
                  borderRadius: "md",
                  color: "text",
                  fontSize: "sm",
                  resize: "vertical",
                  _focus: { outline: "none", borderColor: "primary" },
                  _placeholder: { color: "gray.500" },
                })}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "text", mb: 1 })}>
                Photos
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className={css({ display: "none" })}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={css({
                  width: "100%",
                  px: 4,
                  py: 3,
                  border: "2px dashed",
                  borderColor: isUploading ? "gray.600" : "gray.500",
                  borderRadius: "md",
                  color: isUploading ? "muted" : "text",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  _hover: !isUploading ? { borderColor: "primary", bg: "gray.800" } : {},
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                })}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={20} className={css({ animation: "spin" })} />
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
                <div className={css({ display: "flex", flexWrap: "wrap", gap: 2, mt: 3 })}>
                  {uploadedPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className={css({
                        position: "relative",
                        width: "80px",
                        height: "80px",
                        borderRadius: "md",
                        overflow: "hidden",
                        bg: "gray.800",
                      })}
                    >
                      <img
                        src={photo}
                        alt={`Upload ${index + 1}`}
                        className={css({ width: "100%", height: "100%", objectFit: "cover" })}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className={css({
                          position: "absolute",
                          top: 1,
                          right: 1,
                          p: 1,
                          bg: "rgba(0,0,0,0.7)",
                          borderRadius: "full",
                          color: "white",
                          cursor: "pointer",
                          _hover: { bg: "danger" },
                        })}
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
          <div
            className={css({
              display: "flex",
              gap: 3,
              mt: 6,
              pt: 4,
              borderTop: "1px solid",
              borderColor: "gray.700",
            })}
          >
            <button
              type="button"
              onClick={handleClose}
              className={css({
                flex: 1,
                px: 4,
                py: 2,
                bg: "transparent",
                border: "1px solid",
                borderColor: "gray.600",
                borderRadius: "md",
                color: "text",
                fontSize: "sm",
                fontWeight: "medium",
                cursor: "pointer",
                _hover: { bg: "gray.800" },
                transition: "all 0.2s",
              })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={css({
                flex: 1,
                px: 4,
                py: 2,
                bg: "primary",
                border: "1px solid",
                borderColor: "primary",
                borderRadius: "md",
                color: "white",
                fontSize: "sm",
                fontWeight: "medium",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                _hover: !isSubmitting ? { bg: "blue.600" } : {},
                transition: "all 0.2s",
              })}
            >
              {isSubmitting ? (
                <span className={css({ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 })}>
                  <Loader2 size={16} className={css({ animation: "spin" })} />
                  Saving...
                </span>
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