import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  MapPin,
  Calendar,
  Loader2,
  ShoppingBag,
  XCircle,
  User,
  IndianRupee,
  UserPlus
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DeliveryAssignmentModal from '@/components/orders/DeliveryAssignmentModal';
import { notifications } from '@/lib/notifications';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

interface Order {
  id: string;
  product_id: string | null;
  buyer_id: string | null;
  delivery_partner_id: string | null;
  quantity: number;
  total_price: number;
  status: string;
  delivery_address: string;
  created_at: string;
  product?: {
    name: string;
    images: string[] | null;
    unit: string;
  };
  buyer?: {
    name: string;
  };
  delivery_partner?: {
    name: string;
  };
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning', label: 'Pending' },
  confirmed: { icon: Package, color: 'text-info', label: 'Confirmed' },
  assigned: { icon: Truck, color: 'text-primary', label: 'Assigned' },
  picked_up: { icon: Truck, color: 'text-primary', label: 'Picked Up' },
  in_transit: { icon: Truck, color: 'text-primary', label: 'In Transit' },
  delivered: { icon: CheckCircle, color: 'text-success', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-destructive', label: 'Cancelled' },
};

export default function FarmerOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (DEMO_DATA_MODE) {
        setOrders([
          {
            id: 'demo-order-1',
            product_id: 'demo-product-1',
            buyer_id: 'demo-buyer-1',
            delivery_partner_id: null,
            quantity: 2,
            total_price: 4900,
            status: 'pending',
            delivery_address: 'Village collection center',
            created_at: new Date().toISOString(),
            product: { name: 'Organic Wheat', images: null, unit: 'quintal' },
            buyer: { name: 'Demo Buyer' },
          },
          {
            id: 'demo-order-2',
            product_id: 'demo-product-2',
            buyer_id: 'demo-buyer-2',
            delivery_partner_id: 'demo-delivery-1',
            quantity: 40,
            total_price: 1680,
            status: 'in_transit',
            delivery_address: 'Nearby mandi gate',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            product: { name: 'Fresh Tomatoes', images: null, unit: 'kg' },
            buyer: { name: 'Local Retailer' },
            delivery_partner: { name: 'Demo Delivery Partner' },
          },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(name, images, unit)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer names and delivery partner names
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          let buyerName = 'Customer';
          let deliveryPartnerName = null;

          if (order.buyer_id) {
            const { data: buyerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', order.buyer_id)
              .maybeSingle();
            if (buyerProfile) buyerName = buyerProfile.name;
          }

          if (order.delivery_partner_id) {
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', order.delivery_partner_id)
              .maybeSingle();
            if (partnerProfile) deliveryPartnerName = partnerProfile.name;
          }

          return {
            ...order,
            product: order.product ? {
              ...order.product,
              images: order.product.images 
                ? (Array.isArray(order.product.images) 
                  ? order.product.images 
                  : JSON.parse(order.product.images as string))
                : null,
            } : undefined,
            buyer: { name: buyerName },
            delivery_partner: deliveryPartnerName ? { name: deliveryPartnerName } : undefined,
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmOrder = async (orderId: string, buyerId: string | null) => {
    try {
      if (DEMO_DATA_MODE) {
        setOrders((current) => current.map((order) => (
          order.id === orderId ? { ...order, status: 'confirmed' } : order
        )));
        toast({ title: 'Demo order confirmed', description: 'Run the Supabase setup SQL to save real orders.' });
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // Notify buyer
      if (buyerId) {
        await notifications.orderAccepted(buyerId, orderId);
      }

      toast({ title: 'Order Confirmed', description: 'The customer has been notified' });
      fetchOrders();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to confirm order', variant: 'destructive' });
    }
  };

  const handleAssignDelivery = (order: Order) => {
    setSelectedOrder(order);
    setAssignModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.status === 'pending';
    if (filter === 'active') return ['confirmed', 'assigned', 'picked_up', 'in_transit'].includes(order.status);
    if (filter === 'completed') return ['delivered', 'cancelled'].includes(order.status);
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeCount = orders.filter(o => ['confirmed', 'assigned', 'picked_up', 'in_transit'].includes(o.status)).length;
  const completedCount = orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length;

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_price, 0);

  return (
    <DashboardLayout title="My Orders" subtitle="Manage orders from customers">
      <div className="space-y-4 lg:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <Package className="h-5 w-5 text-primary mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <Clock className="h-5 w-5 text-warning mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <Truck className="h-5 w-5 text-info mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <IndianRupee className="h-5 w-5 text-success mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 lg:mx-0 lg:px-0">
          {[
            { id: 'all', label: 'All', count: orders.length },
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'active', label: 'In Progress', count: activeCount },
            { id: 'completed', label: 'Completed', count: completedCount },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.id as typeof filter)}
              className="whitespace-nowrap min-h-[44px] px-4 flex-shrink-0"
            >
              {f.label}
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-background/20 rounded">
                {f.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? "You haven't received any orders yet"
                : `No ${filter} orders`}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const needsDeliveryAssignment = order.status === 'confirmed' && !order.delivery_partner_id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "bg-card rounded-2xl border p-4",
                    needsDeliveryAssignment ? "border-warning" : "border-border"
                  )}
                >
                  <div className="flex flex-col gap-4">
                    {/* Product Image - Full width on mobile */}
                    <div className="w-full h-36 sm:hidden rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {order.product?.images?.[0] ? (
                        <img 
                          src={order.product.images[0]} 
                          alt={order.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex gap-4">
                      {/* Product Image - Desktop */}
                      <div className="hidden sm:flex w-24 h-24 rounded-xl bg-muted items-center justify-center overflow-hidden flex-shrink-0">
                        {order.product?.images?.[0] ? (
                          <img 
                            src={order.product.images[0]} 
                            alt={order.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                          <div>
                            <h3 className="font-semibold text-base lg:text-lg">
                              {order.product?.name || 'Product'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Qty: {order.quantity} {order.product?.unit || 'units'}
                            </p>
                          </div>
                          <p className="text-lg lg:text-xl font-bold text-primary">
                            ₹{order.total_price.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mt-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{order.buyer?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{order.delivery_address}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Partner Info */}
                    {order.delivery_partner && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Truck className="h-3 w-3" />
                          {order.delivery_partner.name}
                        </Badge>
                      </div>
                    )}

                    {/* Status & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium w-fit",
                        status.color,
                        "bg-muted"
                      )}>
                        <StatusIcon className="h-4 w-4" />
                        {status.label}
                      </span>

                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {order.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handleConfirmOrder(order.id, order.buyer_id)}
                            className="w-full sm:w-auto min-h-[44px]"
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Confirm Order
                          </Button>
                        )}
                        
                        {needsDeliveryAssignment && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-warning text-warning hover:bg-warning hover:text-warning-foreground w-full sm:w-auto min-h-[44px]"
                            onClick={() => handleAssignDelivery(order)}
                          >
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Assign Delivery
                          </Button>
                        )}

                        {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/track/${order.id}`)}
                            className="w-full sm:w-auto min-h-[44px]"
                          >
                            Track Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Assignment Modal */}
      {selectedOrder && (
        <DeliveryAssignmentModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          orderId={selectedOrder.id}
          orderAddress={selectedOrder.delivery_address}
          onAssigned={fetchOrders}
        />
      )}
    </DashboardLayout>
  );
}
