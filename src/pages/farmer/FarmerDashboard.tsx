import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Map, 
  CloudSun, 
  ScanLine, 
  ShoppingBag, 
  FileText, 
  TrendingUp,
  Leaf,
  AlertTriangle,
  ArrowRight,
  Stethoscope,
  Loader2
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WeatherWidget from '@/components/farmer/WeatherWidget';
import CropPriceTicker from '@/components/farmer/CropPriceTicker';
import SmartSuggestionsCard from '@/components/farmer/SmartSuggestionsCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

interface DashboardStats {
  totalArea: number;
  farmCount: number;
  productsListed: number;
  totalRevenue: number;
  recentDetections: Array<{
    disease_name: string | null;
    severity: string | null;
    created_at: string;
  }>;
}

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalArea: 0,
    farmCount: 0,
    productsListed: 0,
    totalRevenue: 0,
    recentDetections: [],
  });
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string; severity: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      if (DEMO_DATA_MODE) {
        setStats({
          totalArea: 0,
          farmCount: 0,
          productsListed: 0,
          totalRevenue: 0,
          recentDetections: [],
        });
        setAlerts([
          { type: 'setup', message: 'Demo mode: run supabase/farmer_only_setup.sql to enable live data.', severity: 'info' },
        ]);
        return;
      }

      const [
        { data: farms },
        { data: products },
        { data: orders },
        { data: detections },
        { data: notifications },
      ] = await Promise.all([
        supabase.from('farms').select('area_acres').eq('user_id', user!.id),
        supabase.from('products').select('id').eq('farmer_id', user!.id),
        supabase.from('orders').select('total_price, status').eq('seller_id', user!.id).eq('status', 'delivered'),
        supabase.from('disease_detections').select('disease_name, severity, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('notifications').select('title, body, notification_type').eq('user_id', user!.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
      ]);

      const totalArea = farms?.reduce((sum, f) => sum + Number(f.area_acres), 0) || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_price), 0) || 0;

      setStats({
        totalArea,
        farmCount: farms?.length || 0,
        productsListed: products?.length || 0,
        totalRevenue,
        recentDetections: detections || [],
      });

      // Build alerts from real data
      const realAlerts: Array<{ type: string; message: string; severity: string }> = [];
      
      if (detections && detections.length > 0) {
        const latest = detections[0];
        if (latest.severity === 'high' || latest.severity === 'critical') {
          realAlerts.push({
            type: 'disease',
            message: `${latest.disease_name || 'Disease'} detected - ${latest.severity} severity`,
            severity: 'warning',
          });
        }
      }

      notifications?.forEach(n => {
        realAlerts.push({
          type: n.notification_type,
          message: n.body,
          severity: n.notification_type === 'order' ? 'success' : 'info',
        });
      });

      if (realAlerts.length === 0) {
        realAlerts.push(
          { type: 'info', message: 'No new alerts. Everything looks good!', severity: 'success' }
        );
      }

      setAlerts(realAlerts.slice(0, 3));
    } catch (err) {
      if (isMissingBackendError(err)) {
        setAlerts([
          { type: 'setup', message: 'Supabase tables are missing. Run supabase/farmer_only_setup.sql.', severity: 'info' },
        ]);
        return;
      }
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: Map, label: t('dashboard.mapFarm'), path: '/farmer/map', color: 'bg-primary/10 text-primary' },
    { icon: ScanLine, label: t('dashboard.scanDisease'), path: '/farmer/disease', color: 'bg-warning/10 text-warning' },
    { icon: Stethoscope, label: t('dashboard.findVet', 'Find Veterinarian'), path: '/farmer/vets', color: 'bg-accent/10 text-accent-foreground' },
    { icon: ShoppingBag, label: t('dashboard.sellProduct'), path: '/farmer/products', color: 'bg-success/10 text-success' },
    { icon: FileText, label: t('dashboard.viewSchemes'), path: '/farmer/schemes', color: 'bg-info/10 text-info' },
  ];

  return (
    <DashboardLayout 
      title={t('dashboard.welcome')}
      subtitle={t('dashboard.subtitle')}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={action.path}
                  className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border border-border hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className={`p-4 rounded-xl ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-center">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weather */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('dashboard.weatherInsights')}</h2>
              <Link to="/farmer/weather">
                <Button variant="ghost" size="sm">
                  {t('dashboard.viewDetails')} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <WeatherWidget />
          </section>

          {/* Market Prices */}
          <section>
            <h2 className="text-lg font-bold mb-4">Market Prices</h2>
            <CropPriceTicker />
          </section>
        </div>

        {/* Alerts & Updates */}
        <section>
          <h2 className="text-lg font-bold mb-4">{t('dashboard.recentAlerts')}</h2>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              alerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    alert.severity === 'warning' ? 'bg-warning/10' :
                    alert.severity === 'success' ? 'bg-success/10' : 'bg-info/10'
                  }`}
                >
                  {alert.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-warning" />}
                  {alert.severity === 'success' && <Leaf className="h-5 w-5 text-success" />}
                  {alert.severity === 'info' && <FileText className="h-5 w-5 text-info" />}
                  <p className="text-sm font-medium">{alert.message}</p>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Farm Stats */}
        <section>
          <h2 className="text-lg font-bold mb-4">{t('dashboard.farmOverview')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('dashboard.totalArea'), value: isLoading ? '...' : `${stats.totalArea.toFixed(1)} acres`, icon: Map, change: `${stats.farmCount} farm${stats.farmCount !== 1 ? 's' : ''}` },
              { label: t('dashboard.activeCrops'), value: isLoading ? '...' : `${stats.recentDetections.length} scans`, icon: Leaf, change: 'Recent detections' },
              { label: t('dashboard.productsListed'), value: isLoading ? '...' : `${stats.productsListed} items`, icon: ShoppingBag, change: `₹${(stats.totalRevenue / 1000).toFixed(1)}K revenue` },
              { label: t('dashboard.cropHealth'), value: isLoading ? '...' : stats.recentDetections.some(d => d.severity === 'high') ? 'Needs attention' : 'Good', icon: TrendingUp, change: stats.recentDetections.length > 0 ? `${stats.recentDetections.length} recent scans` : 'No recent scans' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-success mt-1">{stat.change}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <SmartSuggestionsCard />
        </section>
      </div>
    </DashboardLayout>
  );
}
