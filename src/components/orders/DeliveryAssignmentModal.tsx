import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  Star, 
  MapPin, 
  CheckCircle,
  Loader2,
  Package,
  User
} from 'lucide-react';
import { notifications } from '@/lib/notifications';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

interface DeliveryPartner {
  user_id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  active_orders: number;
  completed_orders: number;
  rating: number;
}

interface DeliveryAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderAddress: string;
  onAssigned: () => void;
}

export default function DeliveryAssignmentModal({
  open,
  onOpenChange,
  orderId,
  orderAddress,
  onAssigned
}: DeliveryAssignmentModalProps) {
  const { toast } = useToast();
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDeliveryPartners();
    }
  }, [open]);

  const fetchDeliveryPartners = async () => {
    setLoading(true);
    try {
      if (DEMO_DATA_MODE) {
        setPartners([
          {
            user_id: 'demo-delivery-1',
            name: 'Demo Delivery Partner',
            avatar_url: null,
            phone: '+91 90000 00000',
            active_orders: 0,
            completed_orders: 42,
            rating: 4.8,
          },
        ]);
        return;
      }

      // Get users with delivery role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'delivery');

      if (roleError) throw roleError;

      const deliveryUserIds = roleData?.map(r => r.user_id) || [];

      if (deliveryUserIds.length === 0) {
        setPartners([]);
        return;
      }

      // Get profiles for delivery partners
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, phone')
        .in('user_id', deliveryUserIds);

      if (profileError) throw profileError;

      // Get order counts for each partner
      const partnersWithStats: DeliveryPartner[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Count active orders
          const { count: activeCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('delivery_partner_id', profile.user_id)
            .in('status', ['assigned', 'picked_up', 'in_transit']);

          // Count completed orders
          const { count: completedCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('delivery_partner_id', profile.user_id)
            .eq('status', 'delivered');

          return {
            user_id: profile.user_id,
            name: profile.name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            active_orders: activeCount || 0,
            completed_orders: completedCount || 0,
            rating: 4.5 + Math.random() * 0.5, // Simulated rating
          };
        })
      );

      // Sort by fewest active orders first
      partnersWithStats.sort((a, b) => a.active_orders - b.active_orders);
      setPartners(partnersWithStats);
    } catch (error) {
      console.error('Error fetching delivery partners:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery partners',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPartner) return;

    setAssigning(true);
    try {
      if (DEMO_DATA_MODE) {
        toast({
          title: 'Demo delivery assigned',
          description: 'Run the Supabase setup SQL to save real delivery assignments.',
        });
        onAssigned();
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_partner_id: selectedPartner,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification to delivery partner
      await notifications.newDeliveryAssignment(selectedPartner, orderId);

      toast({
        title: 'Delivery Partner Assigned',
        description: 'The delivery partner has been notified',
      });

      onAssigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign delivery partner',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Assign Delivery Partner
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            {orderAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No delivery partners available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Delivery partners need to register first
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {partners.map((partner) => (
                  <button
                    key={partner.user_id}
                    onClick={() => setSelectedPartner(partner.user_id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPartner === partner.user_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {partner.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold truncate">{partner.name}</p>
                          {selectedPartner === partner.user_id && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{partner.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {partner.completed_orders} deliveries
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={partner.active_orders === 0 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {partner.active_orders === 0 
                              ? 'Available' 
                              : `${partner.active_orders} active`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedPartner || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Assign Partner
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
