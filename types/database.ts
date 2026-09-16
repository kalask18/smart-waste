export type UserRole = 'citizen' | 'driver' | 'admin';

export type AreaType = 'village' | 'town' | 'ward' | 'panchayat_zone';

export type CollectionPointStatus = 'active' | 'overflowing' | 'maintenance' | 'inactive';

export type WasteCategory = 'organic' | 'recyclable' | 'hazardous' | 'construction' | 'general' | 'overflowing_bin';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PriorityLevel = SeverityLevel;

export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Collected' | 'Resolved' | 'Rejected';

export type VehicleStatus = 'available' | 'on_route' | 'maintenance' | 'offline';

export type RouteStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type StopStatus = 'pending' | 'arrived' | 'collected' | 'skipped' | 'issue_reported' | 'overdue' | 'missed';

export type CollectionStatus = 'scheduled' | 'arrived' | 'completed' | 'missed' | 'issue_reported' | 'overdue';

export type NotificationType = 'info' | 'warning' | 'alert' | 'task' | 'OVERDUE_COLLECTION' | 'MISSED_COLLECTION';

export interface Area {
  id: string;
  name: string;
  type: AreaType;
  population?: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  area_id?: string;
  created_at: string;
}

export interface CollectionPoint {
  id: string;
  area_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_fill_percent: number;
  current_weight_kg: number;
  last_collected_at?: string;
  status: CollectionPointStatus;
  created_at: string;
}

export interface WasteReport {
  id: string;
  report_code?: string;
  user_id?: string;
  collection_point_id?: string;
  location_name?: string;
  category: WasteCategory;
  description?: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  photo_url?: string;
  severity: SeverityLevel;
  status: ReportStatus;
  priority_score?: number;
  priority_level?: PriorityLevel;
  created_at: string;
  resolved_at?: string;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity_kg: number;
  driver_id?: string;
  status: VehicleStatus;
  current_latitude?: number;
  current_longitude?: number;
  created_at: string;
}

export interface Route {
  id: string;
  vehicle_id?: string;
  route_date: string;
  status: RouteStatus;
  total_distance_km?: number;
  estimated_duration_minutes?: number;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  collection_point_id: string;
  sequence_number: number;
  priority_score: number;
  status: StopStatus;
  scheduled_at?: string;
  arrived_at?: string;
  collected_at?: string;
  verified_at?: string;
  missed_at?: string;
  overdue_reason?: string;
}

export interface Collection {
  id: string;
  collection_point_id: string;
  vehicle_id?: string;
  worker_id?: string;
  scheduled_at: string;
  arrived_at?: string;
  collected_at?: string;
  missed_at?: string;
  status: CollectionStatus;
  verification_image_url?: string;
  verification_latitude?: number;
  verification_longitude?: number;
  issue_description?: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  route_id?: string;
  stop_id?: string;
  collection_point_id?: string;
  created_at: string;
}

export interface SensorReading {
  id: string;
  collection_point_id: string;
  fill_percent: number;
  weight_kg: number;
  recorded_at: string;
}

