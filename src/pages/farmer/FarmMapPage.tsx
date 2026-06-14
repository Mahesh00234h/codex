import DashboardLayout from '@/components/layout/DashboardLayout';
import FarmMap from '@/components/farmer/FarmMap';
import { toast } from 'sonner';

export default function FarmMapPage() {
  const handleAreaCalculated = (area: number, points: { lat: number; lng: number }[]) => {
    console.log('Farm saved:', { area, points });
    toast.success(`Farm saved! Area: ${area.toFixed(2)} acres`);
  };

  return (
    <DashboardLayout 
      title="Farm Mapping" 
      subtitle="Mark your farm boundaries to calculate area"
    >
      <div className="max-w-4xl mx-auto">
        <FarmMap onAreaCalculated={handleAreaCalculated} />
      </div>
    </DashboardLayout>
  );
}
