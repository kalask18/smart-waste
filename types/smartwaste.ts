export type UserRole = 'citizen' | 'driver' | 'admin';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Collected' | 'Resolved' | 'Rejected';

export type LocationType = 'school' | 'hospital' | 'market' | 'transit_hub' | 'residential' | 'commercial';

export type WasteCategory = 'organic' | 'recyclable' | 'hazardous' | 'construction' | 'general' | 'overflowing_bin';

export type StopStatus = 'pending' | 'arrived' | 'collected' | 'verified' | 'issue_reported';

export type RouteStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
}

export interface WasteReport {
  id: string;
  reporter_id?: string;
  user_id?: string;
  collection_point_id?: string;
  location_name: string;
  latitude: number;
  longitude: number;
  waste_category: WasteCategory;
  category?: WasteCategory;
  description: string;
  photo_url?: string;
  image_url?: string;
  location_type?: LocationType;
  estimated_volume?: 'small' | 'medium' | 'large' | 'massive';
  severity?: PriorityLevel;
  priority_score: number;
  priority_level?: PriorityLevel;
  status: ReportStatus;
  upvotes_count?: number;
  assigned_route_id?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface SmartBin {
  id: string;
  bin_code: string;
  location_name: string;
  latitude: number;
  longitude: number;
  location_type: LocationType;
  capacity_liters: number;
  fill_percentage: number;
  weight_kg: number;
  battery_level: number;
  is_online: boolean;
  last_ping: string;
  priority_score: number;
  priority_level: PriorityLevel;
  status: 'active' | 'maintenance' | 'needs_collection' | 'in_route';
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  report_id?: string;
  bin_id?: string;
  stop_order: number;
  location_name: string;
  latitude: number;
  longitude: number;
  priority_level: PriorityLevel;
  status: StopStatus;
  arrived_at?: string;
  collected_at?: string;
  notes?: string;
  proof_photo_url?: string;
  waste_category?: WasteCategory;
}

export interface CollectionRoute {
  id: string;
  title: string;
  driver_id: string;
  driver_name?: string;
  vehicle_number: string;
  total_distance_km: number;
  estimated_duration_mins: number;
  status: RouteStatus;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  stops: RouteStop[];
}

export interface CollectionVerification {
  id: string;
  stop_id: string;
  report_id?: string;
  driver_id: string;
  proof_photo_url: string;
  collection_weight_kg?: number;
  notes?: string;
  verified_at: string;
}

export interface WastePrediction {
  id: string;
  zone_name: string;
  latitude: number;
  longitude: number;
  forecast_date: string;
  predicted_volume_kg: number;
  hotspot_risk: PriorityLevel;
  confidence_score: number;
}
