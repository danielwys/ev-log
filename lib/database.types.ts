export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FailureType = 'handshake' | 'derating' | 'interruption' | 'incompatible' | 'other';
export type PinColor = 'green' | 'yellow' | 'red';

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          user_id: string;
          station_name: string;
          operator: string;
          max_kw: number;
          battery_start: number;
          battery_end: number;
          location: string;
          photos: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
          // V1 fields
          charger_hardware_model: string | null;
          charger_software: string | null;
          cable_amp_limit: number | null;
          stall_id: string | null;
          plug_id: string | null;
          connectors_tried: string[];
          successful_connectors: string[];
          attempts: number;
          successes: number;
          error_code: string | null;
          failure_type: FailureType | null;
          technique_required: boolean;
          technique_notes: string | null;
          price_per_kwh: number | null;
          pin_color: PinColor;
        };
        Insert: {
          id?: string;
          user_id: string;
          station_name: string;
          operator: string;
          max_kw: number;
          battery_start: number;
          battery_end: number;
          location: string;
          photos?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          // V1 fields
          charger_hardware_model?: string | null;
          charger_software?: string | null;
          cable_amp_limit?: number | null;
          stall_id?: string | null;
          plug_id?: string | null;
          connectors_tried?: string[];
          successful_connectors?: string[];
          attempts?: number;
          successes?: number;
          error_code?: string | null;
          failure_type?: FailureType | null;
          technique_required?: boolean;
          technique_notes?: string | null;
          price_per_kwh?: number | null;
          pin_color?: PinColor;
        };
        Update: {
          id?: string;
          user_id?: string;
          station_name?: string;
          operator?: string;
          max_kw?: number;
          battery_start?: number;
          battery_end?: number;
          location?: string;
          photos?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          // V1 fields
          charger_hardware_model?: string | null;
          charger_software?: string | null;
          cable_amp_limit?: number | null;
          stall_id?: string | null;
          plug_id?: string | null;
          connectors_tried?: string[];
          successful_connectors?: string[];
          attempts?: number;
          successes?: number;
          error_code?: string | null;
          failure_type?: FailureType | null;
          technique_required?: boolean;
          technique_notes?: string | null;
          price_per_kwh?: number | null;
          pin_color?: PinColor;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      nearby_sessions: {
        Args: {
          search_lat: number;
          search_lng: number;
          radius_meters?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          station_name: string;
          operator: string;
          max_kw: number;
          battery_start: number;
          battery_end: number;
          location: string;
          photos: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
          charger_hardware_model: string | null;
          charger_software: string | null;
          cable_amp_limit: number | null;
          stall_id: string | null;
          plug_id: string | null;
          connectors_tried: string[];
          successful_connectors: string[];
          attempts: number;
          successes: number;
          error_code: string | null;
          failure_type: FailureType | null;
          technique_required: boolean;
          technique_notes: string | null;
          price_per_kwh: number | null;
          pin_color: PinColor;
          distance_meters: number;
        }[];
      };
    };
    Enums: {
      failure_type: FailureType;
      pin_color: PinColor;
    };
  };
};
