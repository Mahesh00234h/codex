import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Phone, MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance } from '@/lib/geoUtils';
import { getCurrentPosition } from '@/lib/nativeGeolocation';

interface NearbyStore {
  id: number;
  name: string;
  lat: number;
  lng: number;
  phone?: string;
  address?: string;
  type: string;
  distanceKm: number;
}

interface NearbyStoresProps {
  searchKeywords?: string[];
}

const STORE_TYPE_LABELS: Record<string, string> = {
  agrarian: 'Agri Input Store',
  pesticide: 'Pesticide Shop',
  pharmacy: 'Pharmacy',
  chemist: 'Chemist',
  garden_centre: 'Garden Centre',
  veterinary: 'Vet Pharmacy',
};

export default function NearbyStores({ searchKeywords }: NearbyStoresProps) {
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then((coords) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setUserLoc(loc);
        fetchStores(loc.lat, loc.lng);
      })
      .catch(() => {
        setError('Unable to access location. Please enable location access.');
        setLoading(false);
      });
  }, []);

  const fetchStores = async (lat: number, lng: number) => {
    try {
      const radius = 10000; // 10km
      // Overpass QL — agri stores, pesticide/farm shops, pharmacies, vet
      const query = `
        [out:json][timeout:25];
        (
          node["shop"="agrarian"](around:${radius},${lat},${lng});
          node["shop"="farm"](around:${radius},${lat},${lng});
          node["shop"="garden_centre"](around:${radius},${lat},${lng});
          node["shop"="pesticide"](around:${radius},${lat},${lng});
          node["shop"="chemist"](around:${radius},${lat},${lng});
          node["amenity"="pharmacy"](around:${radius},${lat},${lng});
          node["amenity"="veterinary"](around:${radius},${lat},${lng});
          node["name"~"krishi|seva kendra|agri|pesticide|fertilizer",i](around:${radius},${lat},${lng});
        );
        out body 30;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (!response.ok) throw new Error('Failed to fetch nearby stores');

      const data = await response.json();
      const results: NearbyStore[] = (data.elements || [])
        .filter((el: any) => el.tags?.name)
        .map((el: any) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat,
          lng: el.lon,
          phone: el.tags.phone || el.tags['contact:phone'],
          address:
            el.tags['addr:full'] ||
            [el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(', '),
          type:
            el.tags.shop || el.tags.amenity || 'store',
          distanceKm: calculateDistance(lat, lng, el.lat, el.lon),
        }))
        .sort((a: NearbyStore, b: NearbyStore) => a.distanceKm - b.distanceKm)
        .slice(0, 10);

      setStores(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const openDirections = (lat: number, lng: number) => {
    if (!userLoc) return;
    window.open(
      `https://www.openstreetmap.org/directions?from=${userLoc.lat},${userLoc.lng}&to=${lat},${lng}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <h4 className="text-lg font-bold">Nearby Stores</h4>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Finding stores near you...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-5 w-5 text-warning" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <h4 className="text-lg font-bold">Nearby Stores</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          No agri-input or pharmacy stores found within 10km. Try searching online or contact your local Krishi Seva Kendra.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold">Nearby Stores</h4>
            <p className="text-xs text-muted-foreground">{stores.length} found within 10km</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {stores.map((store, i) => (
          <motion.div
            key={store.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium truncate">{store.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                  {STORE_TYPE_LABELS[store.type] || store.type}
                </span>
              </div>
              {store.address && (
                <p className="text-xs text-muted-foreground flex items-start gap-1 mb-1">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{store.address}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                📍 {store.distanceKm.toFixed(1)} km away
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {store.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8"
                >
                  <a href={`tel:${store.phone}`}>
                    <Phone className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => openDirections(store.lat, store.lng)}
                className="h-8"
              >
                <Navigation className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 italic">
        Data from OpenStreetMap. Call ahead to confirm stock availability.
      </p>
    </div>
  );
}
