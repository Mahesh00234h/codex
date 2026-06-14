import { supabase } from '@/integrations/supabase/client';
import { offlineDb, SyncQueueItem, isOfflineId } from './offlineDb';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

const MAX_RETRIES = 3;

class SyncService {
  private isSyncing = false;
  private syncListeners: Set<() => void> = new Set();

  constructor() {
    // Listen for online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.sync().catch((error) => {
          console.warn('Background sync failed:', error);
        });
      });
    }
  }

  addSyncListener(listener: () => void) {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners() {
    this.syncListeners.forEach(listener => listener());
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'retries' | 'created_at'>) {
    await offlineDb.syncQueue.add({
      ...item,
      created_at: new Date().toISOString(),
      retries: 0,
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.sync().catch((error) => {
        console.warn('Immediate offline sync failed:', error);
      });
    }
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      const pendingItems = await offlineDb.syncQueue.orderBy('created_at').toArray();

      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await offlineDb.syncQueue.delete(item.id!);
          syncedCount++;
        } catch (error) {
          console.error('Sync error for item:', item, error);
          
          // Increment retry count
          if (item.retries < MAX_RETRIES) {
            await offlineDb.syncQueue.update(item.id!, { retries: item.retries + 1 });
          } else {
            // Remove from queue after max retries
            await offlineDb.syncQueue.delete(item.id!);
            console.error('Max retries reached for sync item:', item);
          }
        }
      }

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline changes`);
        this.notifyListeners();
      }

      // Also sync local data from server
      await this.pullFromServer();
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncItem(item: SyncQueueItem) {
    const data = item.data as Record<string, unknown>;

    switch (item.table) {
      case 'farms':
        await this.syncFarm(item.operation, data);
        break;
      case 'products':
        await this.syncProduct(item.operation, data);
        break;
      case 'notifications':
        await this.syncNotification(item.operation, data);
        break;
      case 'disease_detections':
        await this.syncDiseaseDetection(item.operation, data);
        break;
      default:
        console.warn('Unknown table for sync:', item.table);
    }
  }

  private async syncFarm(operation: string, data: Record<string, unknown>) {
    const { _synced, _deleted, ...farmData } = data;
    const originalId = farmData.id as string;

    if (operation === 'create') {
      // Remove offline ID and let Supabase generate a new one
      const insertData = {
        user_id: farmData.user_id as string,
        name: farmData.name as string,
        coordinates: farmData.coordinates as { lat: number; lng: number }[],
        area_acres: farmData.area_acres as number,
        soil_type: farmData.soil_type as string | undefined,
        location_address: farmData.location_address as string | undefined,
      };
      
      const { data: newFarm, error } = await supabase
        .from('farms')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Update local record with new ID
      if (isOfflineId(originalId) && newFarm) {
        await offlineDb.farms.delete(originalId);
        await offlineDb.farms.put({ 
          ...newFarm, 
          coordinates: newFarm.coordinates as { lat: number; lng: number }[],
          _synced: true 
        });
      }
    } else if (operation === 'update') {
      if (!isOfflineId(originalId)) {
        const updateData = {
          name: farmData.name as string,
          coordinates: farmData.coordinates as { lat: number; lng: number }[],
          area_acres: farmData.area_acres as number,
          soil_type: farmData.soil_type as string | undefined,
          location_address: farmData.location_address as string | undefined,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('farms')
          .update(updateData)
          .eq('id', originalId);

        if (error) throw error;
        await offlineDb.farms.update(originalId, { _synced: true });
      }
    } else if (operation === 'delete') {
      if (!isOfflineId(originalId)) {
        const { error } = await supabase
          .from('farms')
          .delete()
          .eq('id', originalId);

        if (error) throw error;
      }
      await offlineDb.farms.delete(originalId);
    }
  }

  private async syncProduct(operation: string, data: Record<string, unknown>) {
    const { _synced, _deleted, ...productData } = data;
    const originalId = productData.id as string;

    if (operation === 'create') {
      const insertData = {
        farmer_id: productData.farmer_id as string,
        name: productData.name as string,
        description: productData.description as string | undefined,
        price: productData.price as number,
        quantity: productData.quantity as number,
        unit: productData.unit as string,
        category: productData.category as string,
        images: productData.images as string[] | undefined,
        is_available: productData.is_available as boolean,
        quality_score: productData.quality_score as number | undefined,
      };
      
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (isOfflineId(originalId) && newProduct) {
        await offlineDb.products.delete(originalId);
        await offlineDb.products.put({ 
          ...newProduct, 
          images: newProduct.images as string[] | undefined,
          is_available: newProduct.is_available ?? true,
          _synced: true 
        });
      }
    } else if (operation === 'update') {
      if (!isOfflineId(originalId)) {
        const updateData = {
          name: productData.name as string,
          description: productData.description as string | undefined,
          price: productData.price as number,
          quantity: productData.quantity as number,
          unit: productData.unit as string,
          category: productData.category as string,
          images: productData.images as string[] | undefined,
          is_available: productData.is_available as boolean,
          quality_score: productData.quality_score as number | undefined,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', originalId);

        if (error) throw error;
        await offlineDb.products.update(originalId, { _synced: true });
      }
    } else if (operation === 'delete') {
      if (!isOfflineId(originalId)) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', originalId);

        if (error) throw error;
      }
      await offlineDb.products.delete(originalId);
    }
  }

  private async syncNotification(operation: string, data: Record<string, unknown>) {
    if (operation === 'update') {
      const id = data.id as string;
      const is_read = data.is_read as boolean;
      if (!isOfflineId(id)) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read })
          .eq('id', id);

        if (error) throw error;
        await offlineDb.notifications.update(id, { _synced: true });
      }
    }
  }

  private async syncDiseaseDetection(operation: string, data: Record<string, unknown>) {
    const { _synced, ...detectionData } = data;
    const originalId = detectionData.id as string;

    if (operation === 'create') {
      const insertData = {
        user_id: detectionData.user_id as string,
        farm_id: detectionData.farm_id as string | undefined,
        image_url: detectionData.image_url as string | undefined,
        disease_name: detectionData.disease_name as string | undefined,
        severity: detectionData.severity as string | undefined,
        confidence_score: detectionData.confidence_score as number | undefined,
        ai_response: detectionData.ai_response as Json,
      };
      
      const { data: newDetection, error } = await supabase
        .from('disease_detections')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      if (isOfflineId(originalId) && newDetection) {
        await offlineDb.diseaseDetections.delete(originalId);
        await offlineDb.diseaseDetections.put({ 
          ...newDetection, 
          _synced: true 
        });
      }
    }
  }

  private async pullFromServer() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Pull farms
      const { data: farms } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (farms) {
        await offlineDb.farms.bulkPut(
          farms.map(farm => ({ ...farm, _synced: true })) as unknown as import('./offlineDb').OfflineFarm[]
        );
      }

      // Pull products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false });

      if (products) {
        await offlineDb.products.bulkPut(
          products.map(product => ({ ...product, _synced: true })) as unknown as import('./offlineDb').OfflineProduct[]
        );
      }

      // Pull notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifications) {
        await offlineDb.notifications.bulkPut(
          notifications.map(n => ({ ...n, _synced: true })) as unknown as import('./offlineDb').OfflineNotification[]
        );
      }

      // Pull disease detections
      const { data: detections } = await supabase
        .from('disease_detections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (detections) {
        await offlineDb.diseaseDetections.bulkPut(
          detections.map(d => ({ ...d, _synced: true })) as unknown as import('./offlineDb').OfflineDiseaseDetection[]
        );
      }

      // Pull crop recommendations
      const { data: recommendations } = await supabase
        .from('crop_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recommendations) {
        await offlineDb.cropRecommendations.bulkPut(
          recommendations.map(r => ({ ...r, _synced: true })) as unknown as import('./offlineDb').OfflineCropRecommendation[]
        );
      }
    } catch (error) {
      console.error('Error pulling data from server:', error);
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      return await offlineDb.syncQueue.count();
    } catch (error) {
      console.warn('Offline sync queue unavailable:', error);
      return 0;
    }
  }

  async clearLocalData() {
    try {
      await offlineDb.farms.clear();
      await offlineDb.products.clear();
      await offlineDb.notifications.clear();
      await offlineDb.diseaseDetections.clear();
      await offlineDb.cropRecommendations.clear();
      await offlineDb.syncQueue.clear();
      await offlineDb.cachedWeather.clear();
    } catch (error) {
      console.warn('Offline database unavailable while clearing local data:', error);
    }
  }
}

export const syncService = new SyncService();
