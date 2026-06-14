import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Tractor, Calendar, MapPin, IndianRupee, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

const CATEGORIES = ['Tractor', 'Harvester', 'Plough', 'Sprayer', 'Seeder', 'Irrigation', 'Transport', 'Other'];

interface Equipment {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: string;
  daily_rate: number;
  location_address: string | null;
  is_available: boolean;
  created_at: string;
}

export default function EquipmentRentalPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', category: 'Tractor', daily_rate: '', location_address: '' });
  const [bookingData, setBookingData] = useState({ start_date: '', end_date: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEquipment = useCallback(async () => {
    setIsLoading(true);
    if (DEMO_DATA_MODE) {
      setEquipment([
        {
          id: 'demo-equipment-1',
          owner_id: 'demo-owner-1',
          name: '45 HP Tractor',
          description: 'Suitable for ploughing, transport, and seed drilling.',
          category: 'Tractor',
          daily_rate: 2500,
          location_address: 'Nashik District',
          is_available: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-equipment-2',
          owner_id: 'demo-owner-2',
          name: 'Power Sprayer',
          description: 'Backpack sprayer for orchard and vegetable plots.',
          category: 'Sprayer',
          daily_rate: 450,
          location_address: 'Nearby village',
          is_available: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('equipment_rentals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEquipment(data as Equipment[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const handleAddEquipment = async () => {
    if (!user || !formData.name || !formData.daily_rate) return;
    setIsSubmitting(true);
    if (DEMO_DATA_MODE) {
      toast.success('Demo equipment listed locally. Run the Supabase setup SQL to save real rentals.');
      setShowAddModal(false);
      setFormData({ name: '', description: '', category: 'Tractor', daily_rate: '', location_address: '' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('equipment_rentals').insert({
      owner_id: user.id,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      daily_rate: parseFloat(formData.daily_rate),
      location_address: formData.location_address || null,
    });
    if (error) { toast.error('Failed to list equipment'); }
    else { toast.success('Equipment listed!'); setShowAddModal(false); setFormData({ name: '', description: '', category: 'Tractor', daily_rate: '', location_address: '' }); fetchEquipment(); }
    setIsSubmitting(false);
  };

  const handleBookEquipment = async () => {
    if (!user || !selectedEquipment || !bookingData.start_date || !bookingData.end_date) return;
    setIsSubmitting(true);
    const days = Math.max(1, Math.ceil((new Date(bookingData.end_date).getTime() - new Date(bookingData.start_date).getTime()) / 86400000));
    if (DEMO_DATA_MODE) {
      toast.success(`Demo booking created for ${days} days.`);
      setShowBookModal(false);
      setBookingData({ start_date: '', end_date: '', notes: '' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('equipment_bookings').insert({
      rental_id: selectedEquipment.id,
      renter_id: user.id,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date,
      total_cost: days * selectedEquipment.daily_rate,
      notes: bookingData.notes || null,
    });
    if (error) { toast.error('Failed to book'); }
    else { toast.success(`Booked for ${days} days — ₹${days * selectedEquipment.daily_rate}`); setShowBookModal(false); setBookingData({ start_date: '', end_date: '', notes: '' }); }
    setIsSubmitting(false);
  };

  const filtered = equipment.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <DashboardLayout title="Equipment Rental" subtitle="Rent or list farm equipment">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search equipment..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4 mr-2" />List Equipment</Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Tractor className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No equipment found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map(eq => (
                <motion.div key={eq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{eq.name}</CardTitle>
                        <Badge variant={eq.is_available ? 'default' : 'secondary'}>
                          {eq.is_available ? 'Available' : 'Rented'}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="w-fit">{eq.category}</Badge>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-2 text-sm text-muted-foreground">
                      {eq.description && <p className="line-clamp-2">{eq.description}</p>}
                      <div className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /><span className="font-semibold text-foreground">₹{eq.daily_rate}/day</span></div>
                      {eq.location_address && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{eq.location_address}</div>}
                    </CardContent>
                    <CardFooter>
                      {eq.owner_id === user?.id ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>Your Listing</Button>
                      ) : eq.is_available ? (
                        <Button size="sm" className="w-full" onClick={() => { setSelectedEquipment(eq); setShowBookModal(true); }}>
                          <Calendar className="h-4 w-4 mr-1" />Book Now
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" className="w-full" disabled>Currently Rented</Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>List Equipment for Rent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Deere Tractor" /></div>
            <div><Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Daily Rate (₹) *</Label><Input type="number" value={formData.daily_rate} onChange={e => setFormData(p => ({ ...p, daily_rate: e.target.value }))} placeholder="500" /></div>
            <div><Label>Location</Label><Input value={formData.location_address} onChange={e => setFormData(p => ({ ...p, location_address: e.target.value }))} placeholder="Village, District" /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Condition, specs..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddEquipment} disabled={isSubmitting || !formData.name || !formData.daily_rate}>{isSubmitting ? 'Listing...' : 'List Equipment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Equipment Modal */}
      <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book {selectedEquipment?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Rate: <span className="font-semibold text-foreground">₹{selectedEquipment?.daily_rate}/day</span></p>
            <div><Label>Start Date *</Label><Input type="date" value={bookingData.start_date} onChange={e => setBookingData(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>End Date *</Label><Input type="date" value={bookingData.end_date} onChange={e => setBookingData(p => ({ ...p, end_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={bookingData.notes} onChange={e => setBookingData(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requirements..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookModal(false)}>Cancel</Button>
            <Button onClick={handleBookEquipment} disabled={isSubmitting || !bookingData.start_date || !bookingData.end_date}>{isSubmitting ? 'Booking...' : 'Confirm Booking'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
