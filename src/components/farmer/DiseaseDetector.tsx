import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  CheckCircle, 
  Loader2,
  Leaf,
  Bug,
  Pill,
  Shield,
  Send,
  Stethoscope,
  CalendarPlus,
  RotateCw,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDiseaseDetection } from '@/hooks/useDiseaseDetection';
import { useAuth } from '@/contexts/AuthContext';
import VetBookingModal from './VetBookingModal';
import NearbyStores from './NearbyStores';
import { Pill as PillIcon, AlertTriangle, Sparkles } from 'lucide-react';

export default function DiseaseDetector() {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  const { isLoading, analysis, analyzeImage, clearAnalysis, isOfflineResult, preloadOfflineModel } = useDiseaseDetection();

  // Warm up offline model in idle time so it's ready if connectivity drops
  useEffect(() => {
    const id = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback?.(() => preloadOfflineModel()) ?? window.setTimeout(() => preloadOfflineModel(), 2000);
    return () => { try { clearTimeout(id as number); } catch { /* */ } };
  }, [preloadOfflineModel]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setRotation(0);
      clearAnalysis();
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const getRotatedImage = (src: string, deg: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (deg % 360 === 0) return resolve(src);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const rad = (deg * Math.PI) / 180;
        const swap = deg % 180 !== 0;
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas ctx'));
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    const finalImg = await getRotatedImage(selectedImage, rotation);
    await analyzeImage(finalImg);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setRotation(0);
    clearAnalysis();
  };

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-success bg-success/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'high': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Please login to use disease detection</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200",
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-medium">Upload plant image</p>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to select
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <label className="cursor-pointer flex-1">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
                <Button asChild className="w-full">
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </span>
                </Button>
              </label>
              <label className="cursor-pointer flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
                <Button variant="outline" asChild className="w-full">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload from Gallery
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Image Preview */}
      {selectedImage && !analysis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="relative rounded-2xl overflow-hidden">
            <div className="w-full h-64 flex items-center justify-center bg-muted overflow-hidden">
              <img
                src={selectedImage}
                alt="Selected plant"
                style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                  <p className="font-medium">Analyzing with AI...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleReset} disabled={isLoading} className="flex-1">
              <RefreshCw className="h-4 w-4" />
              Retake
            </Button>
            <Button variant="outline" onClick={handleRotate} disabled={isLoading} className="flex-1">
              <RotateCw className="h-4 w-4" />
              Rotate
            </Button>
            <Button onClick={handleAnalyze} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Detect Disease
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Result */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Disease Card */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-md">
            {isOfflineResult && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-warning/10 border border-warning/30 text-sm">
                <WifiOff className="h-4 w-4 text-warning flex-shrink-0" />
                <span className="text-warning font-medium">Offline diagnosis</span>
                <span className="text-muted-foreground">— full AI report will run when you reconnect.</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-xl",
                  analysis.isHealthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {analysis.isHealthy ? <Leaf className="h-6 w-6" /> : <Bug className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {analysis.isHealthy ? 'Healthy Plant' : analysis.disease.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Plant: {analysis.plantIdentified}
                  </p>
                  {!analysis.isHealthy && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1",
                      getSeverityColor(analysis.disease.severity)
                    )}>
                      {analysis.disease.severity.toUpperCase()} Severity
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold text-primary">{analysis.disease.confidence}%</p>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-4">{analysis.disease.description}</p>
            
            {analysis.escalateToVet && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl mb-4">
                <Stethoscope className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Expert Consultation Recommended</p>
                  <p className="text-sm text-muted-foreground">{analysis.escalationReason}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setShowBookingModal(true)}
                >
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  Book Now
                </Button>
              </div>
            )}

            {/* Symptoms */}
            {analysis.symptoms.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Symptoms Detected:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.symptoms.map((symptom, i) => (
                    <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cure Steps */}
          {!analysis.isHealthy && analysis.cure.length > 0 && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-success/10 text-success">
                  <Pill className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold">Treatment Steps</h4>
              </div>
              <ul className="space-y-3">
                {analysis.cure.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 text-success flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>

              {/* Chemical Treatment */}
              {analysis.chemicalTreatment?.product && (
                <div className="mt-4 p-4 bg-muted rounded-xl">
                  <h5 className="font-semibold mb-2">Recommended Chemical Treatment:</h5>
                  <p className="text-sm"><strong>Product:</strong> {analysis.chemicalTreatment.product}</p>
                  <p className="text-sm"><strong>Dosage:</strong> {analysis.chemicalTreatment.dosage}</p>
                  <p className="text-sm"><strong>Frequency:</strong> {analysis.chemicalTreatment.frequency}</p>
                </div>
              )}
            </div>
          )}

          {/* Recommended Medicines (detailed) */}
          {!analysis.isHealthy && analysis.recommendedMedicines && analysis.recommendedMedicines.length > 0 && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <PillIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Recommended Medicines</h4>
                  <p className="text-xs text-muted-foreground">Buy from nearby agri-input stores listed below</p>
                </div>
              </div>
              <div className="space-y-4">
                {analysis.recommendedMedicines.map((med, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h5 className="font-semibold">{med.name}</h5>
                        <p className="text-xs text-muted-foreground">{med.activeIngredient} • {med.type}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium whitespace-nowrap">
                        ₹ {med.estimatedPriceINR}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3">
                      <div><span className="text-muted-foreground">Dosage:</span> <strong>{med.dosage}</strong></div>
                      <div><span className="text-muted-foreground">Method:</span> <strong>{med.applicationMethod}</strong></div>
                      <div className="sm:col-span-2"><span className="text-muted-foreground">Frequency:</span> <strong>{med.frequency}</strong></div>
                    </div>
                    {med.safety && (
                      <div className="mt-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="text-sm font-medium">Safety & PHI</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {med.safety.preHarvestInterval && <li>• PHI: {med.safety.preHarvestInterval}</li>}
                          {med.safety.protectiveGear && <li>• Gear: {med.safety.protectiveGear}</li>}
                          {med.safety.warnings && <li>• ⚠️ {med.safety.warnings}</li>}
                        </ul>
                      </div>
                    )}
                    {med.organicAlternative?.name && (
                      <div className="mt-3 p-3 rounded-lg bg-success/5 border border-success/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Organic Alternative</span>
                        </div>
                        <p className="text-xs"><strong>{med.organicAlternative.name}</strong> — {med.organicAlternative.dosage}</p>
                        {med.organicAlternative.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{med.organicAlternative.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Stores */}
          {!analysis.isHealthy && (
            <NearbyStores searchKeywords={analysis.searchKeywords} />
          )}

          {/* Organic Remedies */}
          {analysis.organicRemedies && analysis.organicRemedies.length > 0 && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Leaf className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold">Organic Remedies</h4>
              </div>
              <ul className="space-y-2">
                {analysis.organicRemedies.map((remedy, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{remedy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prevention */}
          {analysis.prevention.length > 0 && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold">Prevention Tips</h4>
              </div>
              <ul className="space-y-2">
                {analysis.prevention.map((tip, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Notes */}
          {analysis.additionalNotes && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> {analysis.additionalNotes}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Analyze Another Image
            </Button>
            {!analysis.isHealthy && (
              <Button onClick={() => setShowBookingModal(true)} className="flex-1">
                <Stethoscope className="h-4 w-4" />
                Consult a Vet
              </Button>
            )}
          </div>

          {/* Vet Booking Modal */}
          <VetBookingModal
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            diseaseName={analysis.disease.name}
            severity={analysis.disease.severity}
          />
        </motion.div>
      )}
    </div>
  );
}
