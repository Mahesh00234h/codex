import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, IndianRupee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

interface CropPrice {
  name: string;
  category: string;
  avgPrice: number;
  listings: number;
  trend: 'up' | 'down' | 'stable';
}

export default function CropPriceTicker() {
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      if (DEMO_DATA_MODE) {
        setPrices([
          { name: 'Tomato', category: 'tomato', avgPrice: 42, listings: 8, trend: 'up' },
          { name: 'Wheat', category: 'grains', avgPrice: 26, listings: 5, trend: 'stable' },
          { name: 'Onion', category: 'onion', avgPrice: 31, listings: 4, trend: 'down' },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('name, category, price')
        .eq('is_available', true);

      if (error) throw error;

      // Aggregate prices by category
      const categoryMap: Record<string, { total: number; count: number; names: string[] }> = {};
      (data || []).forEach(p => {
        if (!categoryMap[p.category]) {
          categoryMap[p.category] = { total: 0, count: 0, names: [] };
        }
        categoryMap[p.category].total += Number(p.price);
        categoryMap[p.category].count++;
        if (!categoryMap[p.category].names.includes(p.name)) {
          categoryMap[p.category].names.push(p.name);
        }
      });

      const cropPrices: CropPrice[] = Object.entries(categoryMap).map(([cat, info]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        category: cat,
        avgPrice: Math.round(info.total / info.count),
        listings: info.count,
        trend: info.count > 3 ? 'up' : info.count > 1 ? 'stable' : 'down',
      }));

      setPrices(cropPrices);
    } catch (err) {
      if (isMissingBackendError(err)) {
        setPrices([]);
        return;
      }
      console.error('Error fetching prices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="h-6 bg-muted rounded w-1/3 mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (prices.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <IndianRupee className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Market Prices</h3>
      </div>
      <div className="space-y-2">
        {prices.slice(0, 5).map((crop, i) => (
          <motion.div
            key={`${crop.category}-${crop.name}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
          >
            <div>
              <p className="font-medium text-sm">{crop.name}</p>
              <p className="text-xs text-muted-foreground">{crop.listings} listing{crop.listings !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">₹{crop.avgPrice}</span>
              <span className={cn("flex items-center", 
                crop.trend === 'up' ? 'text-success' : crop.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {crop.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                {crop.trend === 'down' && <TrendingDown className="h-4 w-4" />}
                {crop.trend === 'stable' && <Minus className="h-4 w-4" />}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
