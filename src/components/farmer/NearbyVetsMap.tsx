import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import {
  MapPin,
  Star,
  Loader2,
  Search,
  Filter,
  Calendar,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNearbyVets } from '@/hooks/useVeterinary';
import { cn } from '@/lib/utils';
import BookVetConsultationModal from './BookVetConsultationModal';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

interface VetProfile {
  id: string;
  user_id: string;
  specialization?: string;
  experience_years: number;
  consultation_fee: number;
  is_available: boolean;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  rating: number;
}

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createVetMarkerIcon = (isAvailable: boolean) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background: ${isAvailable ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      font-weight: 700;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
      border: 3px solid white;
    ">V</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const userMarkerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
    border: 3px solid white;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocationFinder({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    map.locate();
    map.on('locationfound', (e) => {
      map.flyTo(e.latlng, 12);
      onLocationFound(e.latlng.lat, e.latlng.lng);
    });
  }, [map, onLocationFound]);

  return null;
}

export default function NearbyVetsMap() {
  const { vets, isLoading, fetchNearbyVets } = useNearbyVets();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVet, setSelectedVet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingVet, setBookingVet] = useState<VetProfile | null>(null);

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    fetchNearbyVets(lat, lng);
  }, [fetchNearbyVets]);

  useEffect(() => {
    fetchNearbyVets();
  }, [fetchNearbyVets]);

  const filteredVets = (vets as VetProfile[]).filter((vet) =>
    vet.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vet.location_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by specialization or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[500px] rounded-2xl overflow-hidden border border-border" style={{ minHeight: '500px' }}>
          <MapContainer
            center={defaultCenter}
            zoom={5}
            style={{ height: '100%', width: '100%', minHeight: '500px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationFinder onLocationFound={handleLocationFound} />

            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userMarkerIcon}>
                <Popup>Your location</Popup>
              </Marker>
            )}

            {filteredVets.map((vet) => (
              vet.location_lat && vet.location_lng ? (
                <Marker
                  key={vet.id}
                  position={[vet.location_lat, vet.location_lng]}
                  icon={createVetMarkerIcon(vet.is_available)}
                  eventHandlers={{
                    click: () => setSelectedVet(vet.id),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <p className="font-semibold">{vet.specialization || 'General Veterinary'}</p>
                      <div className="flex items-center gap-1 text-sm text-yellow-500 my-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{vet.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-gray-500">{vet.location_address}</p>
                      <p className="text-sm font-medium mt-1">Rs.{vet.consultation_fee}</p>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredVets.length === 0 ? (
            <div className="text-center py-10">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No vets found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search</p>
            </div>
          ) : (
            filteredVets.map((vet, index) => (
              <motion.div
                key={vet.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedVet(vet.id)}
                className={cn(
                  "bg-card rounded-xl p-4 border cursor-pointer transition-all",
                  selectedVet === vet.id
                    ? "border-primary shadow-md"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    vet.is_available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}>
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">
                        {vet.specialization || 'General Veterinary'}
                      </p>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        vet.is_available
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {vet.is_available ? 'Available' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm my-1">
                      <Star className="h-3 w-3 text-warning fill-warning" />
                      <span>{vet.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        - {vet.experience_years} yrs exp
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {vet.location_address}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-semibold text-primary">Rs.{vet.consultation_fee}</p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingVet(vet);
                        }}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Book
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {bookingVet && (
        <BookVetConsultationModal
          isOpen={!!bookingVet}
          onClose={() => setBookingVet(null)}
          vet={{
            id: bookingVet.id,
            user_id: bookingVet.user_id,
            specialization: bookingVet.specialization,
            consultation_fee: bookingVet.consultation_fee ?? 0,
            location_address: bookingVet.location_address,
            rating: bookingVet.rating ?? 0,
            experience_years: bookingVet.experience_years ?? 0,
          }}
        />
      )}
    </div>
  );
}
