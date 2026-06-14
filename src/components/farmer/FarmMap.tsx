import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Trash2, Calculator, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useFarms } from '@/hooks/useFarms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const { BaseLayer } = LayersControl;

// Fix leaflet default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface FarmMapProps {
  onAreaCalculated?: (area: number, points: { lat: number; lng: number }[]) => void;
  initialPoints?: { lat: number; lng: number }[];
  readonly?: boolean;
}

function LocationMarker({ onLocationFound }: { onLocationFound: (latlng: L.LatLng) => void }) {
  const map = useMap();
  
  useEffect(() => {
    map.locate();
    
    map.on('locationfound', (e) => {
      map.flyTo(e.latlng, 16);
      onLocationFound(e.latlng);
    });
  }, [map, onLocationFound]);
  
  return null;
}

function ClickHandler({ onMapClick, disabled }: { onMapClick: (latlng: L.LatLng) => void; disabled: boolean }) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Custom marker icon for farm points
const createFarmMarkerIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background: linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 76%, 36%) 100%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
      border: 3px solid white;
    ">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Calculate area using Shoelace formula (in square meters, then convert to acres)
function calculatePolygonArea(points: { lat: number; lng: number }[]): number {
  if (points.length < 3) return 0;
  
  // Convert lat/lng to approximate meters
  const toMeters = (lat: number, lng: number, refLat: number, refLng: number) => {
    const latDiff = (lat - refLat) * 111320; // meters per degree latitude
    const lngDiff = (lng - refLng) * 111320 * Math.cos((refLat * Math.PI) / 180);
    return { x: lngDiff, y: latDiff };
  };
  
  const refLat = points[0].lat;
  const refLng = points[0].lng;
  
  const metersPoints = points.map(({ lat, lng }) => toMeters(lat, lng, refLat, refLng));
  
  // Shoelace formula
  let area = 0;
  const n = metersPoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += metersPoints[i].x * metersPoints[j].y;
    area -= metersPoints[j].x * metersPoints[i].y;
  }
  area = Math.abs(area) / 2;
  
  // Convert to acres (1 acre = 4046.86 sq meters)
  return area / 4046.86;
}

export default function FarmMap({ onAreaCalculated, initialPoints = [], readonly = false }: FarmMapProps) {
  const { user } = useAuth();
  const { createFarm, isLoading: isSaving } = useFarms();
  
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>(initialPoints);
  const [area, setArea] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [farmName, setFarmName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  const handleMapClick = useCallback((latlng: L.LatLng) => {
    if (points.length >= 4 || readonly) return;
    
    const newPoint = { lat: latlng.lat, lng: latlng.lng };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    
    if (newPoints.length >= 3) {
      const calculatedArea = calculatePolygonArea(newPoints);
      setArea(calculatedArea);
    }
  }, [points, readonly]);
  
  const handleClearPoints = () => {
    setPoints([]);
    setArea(0);
    setShowSaveForm(false);
    setFarmName('');
  };
  
  const handleSaveClick = () => {
    if (points.length !== 4) {
      toast.error('Please mark exactly 4 corner points');
      return;
    }
    setShowSaveForm(true);
  };

  const handleSaveFarm = async () => {
    if (!farmName.trim()) {
      toast.error('Please enter a farm name');
      return;
    }

    if (!user) {
      toast.error('Please login to save your farm');
      return;
    }

    const result = await createFarm({
      name: farmName.trim(),
      coordinates: points,
      area_acres: area,
    });

    if (result) {
      onAreaCalculated?.(area, points);
      setShowSaveForm(false);
      setFarmName('');
      handleClearPoints();
    }
  };

  const handleLocationFound = useCallback((latlng: L.LatLng) => {
    setUserLocation(latlng);
  }, []);

  // Default center (India)
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const center = userLocation ? [userLocation.lat, userLocation.lng] as [number, number] : defaultCenter;

  // Convert points for Polygon component
  const polygonPositions: [number, number][] = points.map(p => [p.lat, p.lng]);

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {!readonly && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 rounded-xl p-4 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Mark your farm boundaries</p>
              <p className="text-sm text-muted-foreground">
                Click on the map to place exactly 4 corner points. The area will be calculated automatically.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Map */}
      <div className="map-container h-[400px] relative" style={{ minHeight: '400px' }}>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
          className="rounded-2xl z-0"
        >
          <LayersControl position="topright">
            <BaseLayer name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
            <BaseLayer checked name="Satellite">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </BaseLayer>
            <BaseLayer name="Hybrid">
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </BaseLayer>
          </LayersControl>
          <LocationMarker onLocationFound={handleLocationFound} />
          <ClickHandler onMapClick={handleMapClick} disabled={points.length >= 4 || readonly} />
          
          {/* Markers for each point */}
          {points.map((point, index) => (
            <Marker
              key={index}
              position={[point.lat, point.lng]}
              icon={createFarmMarkerIcon(index)}
            />
          ))}
          
          {/* Polygon */}
          {points.length >= 3 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{
                color: 'hsl(142, 71%, 45%)',
                fillColor: 'hsl(142, 71%, 45%)',
                fillOpacity: 0.3,
                weight: 3,
              }}
            />
          )}
        </MapContainer>
        
        {/* Point counter */}
        <div className="absolute top-4 right-4 z-[1000] glass rounded-xl px-4 py-2">
          <span className="text-sm font-medium">
            Points: <span className="text-primary">{points.length}</span>/4
          </span>
        </div>
      </div>

      {/* Area display and actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/20 text-accent-foreground">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Calculated Area</p>
            <p className="text-2xl font-bold text-foreground">
              {area > 0 ? `${area.toFixed(2)} acres` : '—'}
            </p>
          </div>
        </div>
        
        {!readonly && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClearPoints}
              disabled={points.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={points.length !== 4 || !user}
            >
              <Save className="h-4 w-4" />
              Save Farm
            </Button>
          </div>
        )}
      </div>

      {/* Save form */}
      {showSaveForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-xl p-4 border border-border space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="farmName">Farm Name</Label>
            <Input
              id="farmName"
              placeholder="e.g., North Field, Main Farm"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowSaveForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveFarm} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Farm
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Login prompt */}
      {!user && !readonly && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Please <a href="/login" className="text-primary hover:underline">login</a> to save your farm
          </p>
        </div>
      )}
    </div>
  );
}
