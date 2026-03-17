export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          distance_meters: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
