import Dexie, { Table } from 'dexie';

// Define interfaces for offline data
export interface OfflineFarm {
  id: string;
  user_id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  area_acres: number;
  soil_type?: string;
  location_address?: string;
  created_at: string;
  updated_at: string;
  _synced: boolean;
  _deleted?: boolean;
}

export interface OfflineProduct {
  id: string;
  farmer_id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  images?: string[];
  is_available: boolean;
  quality_score?: number;
  created_at: string;
  updated_at: string;
  _synced: boolean;
  _deleted?: boolean;
}

export interface OfflineNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  data?: unknown;
  is_read: boolean;
  created_at: string;
  _synced: boolean;
}

export interface OfflineDiseaseDetection {
  id: string;
  user_id: string;
  farm_id?: string;
  image_url?: string;
  disease_name?: string;
  severity?: string;
  confidence_score?: number;
  ai_response?: unknown;
  created_at: string;
  _synced: boolean;
}

export interface OfflineCropRecommendation {
  id: string;
  user_id: string;
  farm_id?: string;
  recommendations: unknown;
  weather_data?: unknown;
  location_data?: unknown;
  created_at: string;
  _synced: boolean;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  created_at: string;
  retries: number;
}

export interface CachedWeather {
  id: string;
  lat: number;
  lng: number;
  data: unknown;
  cached_at: string;
}

// Create the Dexie database
class OfflineDatabase extends Dexie {
  farms!: Table<OfflineFarm, string>;
  products!: Table<OfflineProduct, string>;
  notifications!: Table<OfflineNotification, string>;
  diseaseDetections!: Table<OfflineDiseaseDetection, string>;
  cropRecommendations!: Table<OfflineCropRecommendation, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  cachedWeather!: Table<CachedWeather, string>;

  constructor() {
    super('KrishiConnectOfflineDB');
    
    this.version(1).stores({
      farms: 'id, user_id, _synced',
      products: 'id, farmer_id, category, _synced',
      notifications: 'id, user_id, is_read, _synced',
      diseaseDetections: 'id, user_id, farm_id, _synced',
      cropRecommendations: 'id, user_id, farm_id, _synced',
      syncQueue: '++id, table, operation, created_at',
      cachedWeather: 'id, lat, lng, cached_at',
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper to generate UUIDs for offline records
export function generateOfflineId(): string {
  return `offline-${crypto.randomUUID()}`;
}

// Helper to check if an ID is an offline-generated ID
export function isOfflineId(id: string): boolean {
  return id.startsWith('offline-');
}
