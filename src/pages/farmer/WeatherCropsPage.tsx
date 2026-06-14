import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Droplets, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WeatherWidget from '@/components/farmer/WeatherWidget';
import { Button } from '@/components/ui/button';

// Mock AI crop recommendations
const cropRecommendations = [
  {
    crop: 'Wheat',
    score: 92,
    yield: '35-40 quintals/acre',
    risk: 'Low',
    water: 'Medium',
    season: 'Rabi',
    reason: 'Ideal temperature and moisture levels. Your soil type is perfect for wheat cultivation.',
  },
  {
    crop: 'Tomato',
    score: 85,
    yield: '200-250 quintals/acre',
    risk: 'Medium',
    water: 'High',
    season: 'Year-round',
    reason: 'Good market demand. Requires regular irrigation and disease monitoring.',
  },
  {
    crop: 'Chickpea',
    score: 78,
    yield: '10-12 quintals/acre',
    risk: 'Low',
    water: 'Low',
    season: 'Rabi',
    reason: 'Drought-resistant crop. Fixes nitrogen in soil, good for crop rotation.',
  },
];

export default function WeatherCropsPage() {
  return (
    <DashboardLayout 
      title="Weather & AI Crops" 
      subtitle="AI-powered crop recommendations based on your conditions"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weather */}
        <section>
          <h2 className="text-lg font-bold mb-4">Current Weather</h2>
          <WeatherWidget />
        </section>

        {/* AI Recommendations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">AI Recommendations</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on your location, weather, and farm size, here are the top crops to grow:
            </p>
            <div className="space-y-4">
              {cropRecommendations.map((crop, i) => (
                <motion.div
                  key={crop.crop}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-muted/50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">{crop.crop}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Score:</span>
                      <span className="text-xl font-bold text-primary">{crop.score}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span>{crop.yield}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-info" />
                      <span>{crop.water} water</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span>{crop.risk} risk</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{crop.reason}</p>
                </motion.div>
              ))}
            </div>
            <Button className="w-full">Get Detailed Plan</Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
