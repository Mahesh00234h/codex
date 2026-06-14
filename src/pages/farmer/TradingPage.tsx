import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Handshake, IndianRupee, Package, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Seeds', 'Fertilizer', 'Other'];

interface Trade {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  product_name: string;
  description: string | null;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function TradingPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [myTrades, setMyTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '', description: '', category: 'Vegetables', quantity: '', unit: 'kg', price_per_unit: '', notes: '',
  });

  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    if (DEMO_DATA_MODE) {
      const demoTrades: Trade[] = [
        {
          id: 'demo-trade-1',
          seller_id: 'demo-seller-1',
          buyer_id: null,
          product_name: 'Organic Wheat',
          description: 'Clean, recently harvested wheat available for direct farmer trade.',
          category: 'Grains',
          quantity: 12,
          unit: 'quintal',
          price_per_unit: 2450,
          total_price: 29400,
          status: 'open',
          notes: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-trade-2',
          seller_id: 'demo-seller-2',
          buyer_id: null,
          product_name: 'Tomato Crates',
          description: 'A-grade tomatoes packed in ventilated crates.',
          category: 'Vegetables',
          quantity: 80,
          unit: 'kg',
          price_per_unit: 38,
          total_price: 3040,
          status: 'open',
          notes: null,
          created_at: new Date().toISOString(),
        },
      ];
      setTrades(demoTrades);
      setMyTrades([]);
      setIsLoading(false);
      return;
    }

    const [{ data: openTrades }, { data: owned }] = await Promise.all([
      supabase.from('farmer_trades').select('*').eq('status', 'open').order('created_at', { ascending: false }),
      user ? supabase.from('farmer_trades').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }) : { data: [] },
    ]);
    setTrades((openTrades || []) as Trade[]);
    setMyTrades((owned || []) as Trade[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const handleCreateTrade = async () => {
    if (!user || !formData.product_name || !formData.quantity || !formData.price_per_unit) return;
    setIsSubmitting(true);
    if (DEMO_DATA_MODE) {
      toast.success('Demo trade listed locally. Run the Supabase setup SQL to save real trades.');
      setShowCreateModal(false);
      setFormData({ product_name: '', description: '', category: 'Vegetables', quantity: '', unit: 'kg', price_per_unit: '', notes: '' });
      setIsSubmitting(false);
      return;
    }

    const qty = parseFloat(formData.quantity);
    const ppu = parseFloat(formData.price_per_unit);
    const { error } = await supabase.from('farmer_trades').insert({
      seller_id: user.id,
      product_name: formData.product_name,
      description: formData.description || null,
      category: formData.category,
      quantity: qty,
      unit: formData.unit,
      price_per_unit: ppu,
      total_price: qty * ppu,
      notes: formData.notes || null,
    });
    if (error) { toast.error('Failed to create trade'); }
    else { toast.success('Trade listed!'); setShowCreateModal(false); setFormData({ product_name: '', description: '', category: 'Vegetables', quantity: '', unit: 'kg', price_per_unit: '', notes: '' }); fetchTrades(); }
    setIsSubmitting(false);
  };

  const handleAcceptTrade = async (trade: Trade) => {
    if (!user) return;
    if (DEMO_DATA_MODE) {
      toast.success('Demo trade accepted. Run the Supabase setup SQL to save real trades.');
      setTrades((current) => current.filter((item) => item.id !== trade.id));
      return;
    }

    const { error } = await supabase.from('farmer_trades').update({ buyer_id: user.id, status: 'accepted' }).eq('id', trade.id);
    if (error) { toast.error('Failed to accept trade'); }
    else { toast.success(`Trade accepted! Contact seller to arrange pickup.`); fetchTrades(); }
  };

  const statusColors: Record<string, string> = {
    open: 'bg-green-500/10 text-green-600',
    accepted: 'bg-blue-500/10 text-blue-600',
    completed: 'bg-primary/10 text-primary',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  const filtered = trades.filter(t =>
    t.product_name.toLowerCase().includes(searchQuery.toLowerCase()) && t.seller_id !== user?.id
  );

  const TradeCard = ({ trade, showAccept = false }: { trade: Trade; showAccept?: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{trade.product_name}</CardTitle>
            <Badge className={statusColors[trade.status] || ''}>{trade.status}</Badge>
          </div>
          <Badge variant="outline" className="w-fit">{trade.category}</Badge>
        </CardHeader>
        <CardContent className="pb-2 space-y-1.5 text-sm">
          {trade.description && <p className="text-muted-foreground line-clamp-2">{trade.description}</p>}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-muted-foreground" />{trade.quantity} {trade.unit}</span>
            <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />₹{trade.price_per_unit}/{trade.unit}</span>
          </div>
          <p className="font-semibold text-foreground">Total: ₹{trade.total_price}</p>
        </CardContent>
        {showAccept && trade.status === 'open' && (
          <CardFooter>
            <Button size="sm" className="w-full" onClick={() => handleAcceptTrade(trade)}>
              <Handshake className="h-4 w-4 mr-1" />Accept Trade
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );

  return (
    <DashboardLayout title="Farmer Trading" subtitle="Trade directly with other farmers">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search trades..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-2" />Create Trade</Button>
        </div>

        <Tabs defaultValue="marketplace">
          <TabsList>
            <TabsTrigger value="marketplace"><ArrowRightLeft className="h-4 w-4 mr-1" />Marketplace ({filtered.length})</TabsTrigger>
            <TabsTrigger value="my-trades"><Package className="h-4 w-4 mr-1" />My Trades ({myTrades.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="marketplace">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center"><Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No open trades</p></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>{filtered.map(t => <TradeCard key={t.id} trade={t} showAccept />)}</AnimatePresence>
              </div>
            )}
          </TabsContent>
          <TabsContent value="my-trades">
            {myTrades.length === 0 ? (
              <Card className="p-8 text-center"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No trades yet</p></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTrades.map(t => <TradeCard key={t.id} trade={t} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Trade Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create a Trade Listing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Product Name *</Label><Input value={formData.product_name} onChange={e => setFormData(p => ({ ...p, product_name: e.target.value }))} placeholder="e.g. Organic Wheat" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label>
                <Select value={formData.unit} onValueChange={v => setFormData(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['kg','quintal','ton','piece','bag'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity *</Label><Input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="100" /></div>
              <div><Label>Price per unit (₹) *</Label><Input type="number" value={formData.price_per_unit} onChange={e => setFormData(p => ({ ...p, price_per_unit: e.target.value }))} placeholder="25" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Quality, variety..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTrade} disabled={isSubmitting || !formData.product_name || !formData.quantity || !formData.price_per_unit}>
              {isSubmitting ? 'Creating...' : 'List Trade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
