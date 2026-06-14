import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Package, 
  IndianRupee, 
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Loader2
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AddProductModal from '@/components/farmer/AddProductModal';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  quality_score: number | null;
  is_available: boolean | null;
  description: string | null;
  images: string[] | null;
}

const statusColors = {
  active: 'bg-success/10 text-success',
  sold: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
};

const qualityColors: Record<string, string> = {
  'A+': 'bg-primary/10 text-primary',
  'A': 'bg-success/10 text-success',
  'B': 'bg-warning/10 text-warning',
};

const categoryEmojis: Record<string, string> = {
  vegetables: '🥬',
  fruits: '🍎',
  grains: '🌾',
  dairy: '🥛',
  poultry: '🐔',
  livestock: '🐄',
};

function getQualityGrade(score: number | null): string {
  if (!score) return 'B';
  if (score >= 80) return 'A+';
  if (score >= 60) return 'A';
  return 'B';
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['farmer-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (DEMO_DATA_MODE) {
        return [
          {
            id: 'demo-product-1',
            name: 'Organic Wheat',
            category: 'grains',
            quantity: 12,
            unit: 'quintal',
            price: 2450,
            quality_score: 88,
            is_available: true,
            description: 'Clean wheat for local buyers',
            images: null,
          },
          {
            id: 'demo-product-2',
            name: 'Fresh Tomatoes',
            category: 'vegetables',
            quantity: 80,
            unit: 'kg',
            price: 42,
            quality_score: 82,
            is_available: true,
            description: 'A-grade tomatoes packed in crates',
            images: null,
          },
        ] as Product[];
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!user?.id,
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = products.filter(p => p.is_available).reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const activeProducts = products.filter(p => p.is_available).length;

  const handleDeleteProduct = async (productId: string) => {
    try {
      if (DEMO_DATA_MODE) {
        toast({ title: 'Demo product removed', description: 'Run the Supabase setup SQL to save real product changes.' });
        return;
      }

      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      toast({ title: 'Product deleted', description: 'Your product has been removed.' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout 
      title="My Products" 
      subtitle="Manage and sell your farm products directly"
    >
      <div className="space-y-4 lg:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <Package className="h-5 w-5 text-primary mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">{products.length}</p>
            <p className="text-xs text-muted-foreground">Total Products</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <CheckCircle className="h-5 w-5 text-success mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">{activeProducts}</p>
            <p className="text-xs text-muted-foreground">Active Listings</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <IndianRupee className="h-5 w-5 text-accent mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">Potential Revenue</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 lg:p-4">
            <TrendingUp className="h-5 w-5 text-info mb-1.5 lg:mb-2" />
            <p className="text-xl lg:text-2xl font-bold">+23%</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto min-h-[44px]">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Product
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4 px-4">Start selling by adding your first product</p>
            <Button onClick={() => setIsAddModalOpen(true)} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {filteredProducts.map((product, i) => {
              const qualityGrade = getQualityGrade(product.quality_score);
              const status = product.is_available ? 'active' : 'sold';
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-4 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl lg:text-4xl">{categoryEmojis[product.category] || '📦'}</div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      statusColors[status]
                    )}>
                      {status === 'active' ? 'Active' : 'Sold Out'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base lg:text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 capitalize">{product.category}</p>
                  
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="font-semibold text-sm lg:text-base">{product.quantity} {product.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-bold text-base lg:text-lg text-primary">₹{product.price}/{product.unit}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-xs font-medium",
                      qualityColors[qualityGrade]
                    )}>
                      Quality: {qualityGrade}
                    </span>
                    <div className="flex items-center gap-1">
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors touch-target">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors touch-target">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button 
                        className="p-2.5 hover:bg-destructive/10 rounded-xl transition-colors touch-target"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AddProductModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => refetch()}
      />
    </DashboardLayout>
  );
}
