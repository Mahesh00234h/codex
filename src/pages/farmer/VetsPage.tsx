import DashboardLayout from '@/components/layout/DashboardLayout';
import NearbyVetsMap from '@/components/farmer/NearbyVetsMap';

export default function VetsPage() {
  return (
    <DashboardLayout
      title="Nearby Vets"
      subtitle="Find verified veterinary experts near your farm"
    >
      <NearbyVetsMap />
    </DashboardLayout>
  );
}
