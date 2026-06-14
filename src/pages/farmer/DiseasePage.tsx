import DashboardLayout from '@/components/layout/DashboardLayout';
import DiseaseDetector from '@/components/farmer/DiseaseDetector';

export default function DiseasePage() {
  return (
    <DashboardLayout 
      title="Disease Detection" 
      subtitle="Upload plant images for AI-powered disease diagnosis"
    >
      <div className="max-w-2xl mx-auto">
        <DiseaseDetector />
      </div>
    </DashboardLayout>
  );
}
