import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck,
  Phone,
  ArrowLeft,
  Navigation,
  RefreshCw,
  Timer,
  Navigation2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TurnByTurnDirections from '@/components/navigation/TurnByTurnDirections';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useRouteDirections, formatDistance, formatDuration } from '@/hooks/useRouteDirections';
import { supabase } from '@/integrations/supabase/client';
import { getDeliveryETA } from '@/lib/geoUtils';
import 'leaflet/dist/leaflet.css';

interface Order {
  id: string;
  delivery_address: string;
  delivery_coordinates: { lat: number; lng: number } | null;
  status: string;
  total_price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// Custom markers
const deliveryMarkerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 22px;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    border: 3px solid white;
    animation: pulse 2s infinite;
  ">TRK</div>
  <style>
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  </style>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const destinationMarkerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    border: 3px solid white;
  ">PIN</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Map component that auto-centers on delivery location
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1 });
    }
  }, [center, map]);
  
  return null;
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { location, isLoading: isTrackingLoading, error: trackingError, startTracking } = useOrderTracking();
  const { route, isLoading: isRouteLoading, error: routeError, fetchRoute } = useRouteDirections();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasRequestedRoute, setHasRequestedRoute] = useState(false);

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      startTracking(orderId);
    }
  }, [orderId, startTracking]);

  // Fetch route when we have both locations
  useEffect(() => {
    if (location && order?.delivery_coordinates && !hasRequestedRoute && order.status === 'in_transit') {
      fetchRoute(
        { lat: location.latitude, lng: location.longitude },
        { lat: order.delivery_coordinates.lat, lng: order.delivery_coordinates.lng }
      );
      setHasRequestedRoute(true);
    }
  }, [location, order?.delivery_coordinates, order?.status, hasRequestedRoute, fetchRoute]);

  // Refetch route when location significantly changes (every ~500m)
  useEffect(() => {
    if (!location || !order?.delivery_coordinates || order.status !== 'in_transit') return;
    
    const refetchInterval = setInterval(() => {
      fetchRoute(
        { lat: location.latitude, lng: location.longitude },
        { lat: order.delivery_coordinates!.lat, lng: order.delivery_coordinates!.lng }
      );
    }, 60000); // Refetch every minute

    return () => clearInterval(refetchInterval);
  }, [location, order?.delivery_coordinates, order?.status, fetchRoute]);

  // Subscribe to real-time order status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrder(prev => prev ? {
            ...prev,
            ...updatedOrder,
            delivery_coordinates: updatedOrder.delivery_coordinates as { lat: number; lng: number } | null,
          } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      setOrder({
        ...data,
        delivery_coordinates: data.delivery_coordinates as { lat: number; lng: number } | null,
      });
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusProgress = (status: string): number => {
    const statusMap: Record<string, number> = {
      pending: 10,
      confirmed: 25,
      assigned: 40,
      picked_up: 55,
      in_transit: 75,
      delivered: 100,
    };
    return statusMap[status] || 0;
  };

  const getStatusSteps = () => [
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'picked_up', label: 'Picked Up', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: MapPin },
  ];

  const isStepCompleted = (stepKey: string, currentStatus: string) => {
    const order = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'];
    return order.indexOf(currentStatus) >= order.indexOf(stepKey);
  };

  const deliveryPosition: [number, number] | null = location 
    ? [location.latitude, location.longitude] 
    : null;

  const destinationPosition: [number, number] | null = order?.delivery_coordinates 
    ? [order.delivery_coordinates.lat, order.delivery_coordinates.lng] 
    : null;

  // Use route geometry if available, otherwise straight line
  const routePath: [number, number][] = route?.geometry || (
    deliveryPosition && destinationPosition 
      ? [deliveryPosition, destinationPosition] 
      : []
  );

  // Calculate ETA from route or fallback to distance-based
  const etaInfo = useMemo(() => {
    if (route) {
      return {
        distanceKm: route.distance / 1000,
        distanceFormatted: formatDistance(route.distance),
        eta: {
          minutes: Math.round(route.duration / 60),
          formattedTime: formatDuration(route.duration),
          arrivalTime: new Date(Date.now() + route.duration * 1000),
        },
      };
    }
    
    if (!location || !order?.delivery_coordinates) return null;
    
    return getDeliveryETA(
      location.latitude,
      location.longitude,
      order.delivery_coordinates.lat,
      order.delivery_coordinates.lng,
      location.speed
    );
  }, [location, order?.delivery_coordinates, route]);

  const handleRefreshRoute = () => {
    if (location && order?.delivery_coordinates) {
      fetchRoute(
        { lat: location.latitude, lng: location.longitude },
        { lat: order.delivery_coordinates.lat, lng: order.delivery_coordinates.lng }
      );
    }
  };

  const goBack = () => navigate('/farmer/orders');

  if (isLoading) {
    return (
      <DashboardLayout title="Order Tracking" subtitle="Loading order details...">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Not Found" subtitle="Unable to find the requested order">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Order Not Found</h3>
            <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Live Order Tracking" 
      subtitle={`Order #${order.id.slice(0, 8)}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    Live Tracking
                  </span>
                  <div className="flex items-center gap-2">
                    {route && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshRoute}
                        disabled={isRouteLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isRouteLoading ? 'animate-spin' : ''}`} />
                        Refresh Route
                      </Button>
                    )}
                    {location && (
                      <Badge variant="outline" className="bg-success/10 text-success animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-success mr-2" />
                        Live
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] lg:h-[500px]">
                  <MapContainer
                    center={deliveryPosition || destinationPosition || defaultCenter}
                    zoom={deliveryPosition ? 15 : 5}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={deliveryPosition} />

                    {/* Delivery Partner Location */}
                    {deliveryPosition && (
                      <Marker position={deliveryPosition} icon={deliveryMarkerIcon}>
                        <Popup>
                          <div className="p-2 text-center">
                            <p className="font-semibold">Delivery Partner</p>
                            <p className="text-sm text-gray-500">
                              {location?.speed ? `${Math.round(location.speed * 3.6)} km/h` : 'Stationary'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Updated: {new Date(location!.updated_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Destination Location */}
                    {destinationPosition && (
                      <Marker position={destinationPosition} icon={destinationMarkerIcon}>
                        <Popup>
                          <div className="p-2">
                            <p className="font-semibold">Delivery Address</p>
                            <p className="text-sm text-gray-500">{order.delivery_address}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Route Polyline */}
                    {routePath.length >= 2 && (
                      <Polyline
                        positions={routePath}
                        pathOptions={{
                          color: route ? '#8b5cf6' : '#8b5cf6',
                          weight: route ? 5 : 4,
                          opacity: 0.8,
                          dashArray: route ? undefined : '10, 10',
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            {/* Turn-by-Turn Directions */}
            {order.status === 'in_transit' && (route || isRouteLoading) && (
              <TurnByTurnDirections
                steps={route?.steps || []}
                totalDistance={route?.distance || 0}
                totalDuration={route?.duration || 0}
                isLoading={isRouteLoading}
                currentStepIndex={currentStepIndex}
                onStepClick={setCurrentStepIndex}
              />
            )}

            {/* ETA Card */}
            {etaInfo && order.status === 'in_transit' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Timer className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                          <p className="text-2xl font-bold text-primary">{etaInfo.eta.formattedTime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Distance</p>
                        <p className="text-lg font-semibold">{etaInfo.distanceFormatted}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Arriving by {etaInfo.eta.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {location?.speed && location.speed > 0 && (
                        <span className="text-muted-foreground">
                          Speed: {Math.round(location.speed * 3.6)} km/h
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* No Live Location Notice */}
            {!location && order.status !== 'delivered' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Waiting for live location</p>
                      <p className="text-sm text-muted-foreground">
                        Live tracking will appear once the delivery partner starts the delivery
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={order.status === 'delivered' ? 'outline' : 'default'} className="capitalize">
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getStatusProgress(order.status)}%
                  </span>
                </div>
                <Progress value={getStatusProgress(order.status)} className="h-2" />

                {/* Status Steps */}
                <div className="space-y-3 pt-2">
                  {getStatusSteps().map((step, index) => {
                    const completed = isStepCompleted(step.key, order.status);
                    const current = order.status === step.key;
                    
                    return (
                      <div 
                        key={step.key}
                        className={`flex items-center gap-3 ${completed ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${completed ? 'bg-success text-success-foreground' : 'bg-muted'}
                          ${current ? 'ring-2 ring-primary ring-offset-2' : ''}
                        `}>
                          <step.icon className="h-4 w-4" />
                        </div>
                        <span className={`text-sm ${current ? 'font-semibold' : ''}`}>
                          {step.label}
                        </span>
                        {current && (
                          <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Order ID</span>
                  <span className="font-mono text-sm">#{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="font-medium">{order.quantity} items</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">Rs.{order.total_price}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="text-sm font-medium">{order.delivery_address}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Stats */}
            {location && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Partner
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-card rounded-lg">
                        <p className="text-xs text-muted-foreground">Speed</p>
                        <p className="font-semibold">
                          {location.speed ? `${Math.round(location.speed * 3.6)} km/h` : '0 km/h'}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-card rounded-lg">
                        <p className="text-xs text-muted-foreground">Last Update</p>
                        <p className="font-semibold text-sm">
                          {new Date(location.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Contact Button */}
            <Button variant="outline" className="w-full gap-2">
              <Phone className="h-4 w-4" />
              Contact Delivery Partner
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
