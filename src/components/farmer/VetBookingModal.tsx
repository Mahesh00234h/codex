import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Star, 
  Clock, 
  DollarSign,
  Stethoscope,
  MessageSquare,
  Video,
  User,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNearbyVets } from '@/hooks/useVeterinary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/nativeGeolocation';

interface VetBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  diseaseDetectionId?: string;
  diseaseName?: string;
  severity?: string;
}

type ConsultationType = 'chat' | 'video' | 'in_person';

export default function VetBookingModal({ 
  isOpen, 
  onClose, 
  diseaseDetectionId,
  diseaseName,
  severity 
}: VetBookingModalProps) {
  const { user } = useAuth();
  const { vets, isLoading: loadingVets, fetchNearbyVets } = useNearbyVets();
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<ConsultationType>('chat');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      getCurrentPosition()
        .then((coords) => {
          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
          fetchNearbyVets(coords.latitude, coords.longitude);
        })
        .catch(() => fetchNearbyVets());

      // Pre-fill notes with disease info
      if (diseaseName) {
        setNotes(`Disease detected: ${diseaseName}${severity ? ` (${severity} severity)` : ''}`);
      }
    }
  }, [isOpen, fetchNearbyVets, diseaseName, severity]);

  const handleSubmit = async () => {
    if (!user || !selectedVetId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .insert({
          farmer_id: user.id,
          vet_id: selectedVetId,
          disease_detection_id: diseaseDetectionId || null,
          consultation_type: consultationType,
          status: 'pending',
          notes: notes || null,
          fee_paid: 0,
        });

      if (error) throw error;

      toast.success('Consultation request sent!', {
        description: 'The veterinarian will respond shortly.',
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request consultation';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVet = vets.find(v => v.id === selectedVetId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Request Vet Consultation</h2>
                <p className="text-sm text-muted-foreground">
                  Select a veterinarian for expert advice
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Consultation Type */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold mb-3">Consultation Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'chat' as const, icon: MessageSquare, label: 'Chat' },
                  { type: 'video' as const, icon: Video, label: 'Video Call' },
                  { type: 'in_person' as const, icon: User, label: 'In Person' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setConsultationType(type)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      consultationType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nearby Vets List */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold mb-3">Available Veterinarians</h3>
              {loadingVets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : vets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No verified veterinarians available</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {vets.map((vet) => (
                    <button
                      key={vet.id}
                      onClick={() => setSelectedVetId(vet.id)}
                      className={cn(
                        "w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        selectedVetId === vet.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            Dr. {vet.license_number.slice(0, 6)}...
                          </span>
                          {vet.is_available && (
                            <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                              Available
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {vet.specialization || 'General Practice'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-warning" />
                            {vet.rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {vet.experience_years || 0}y exp
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            ₹{vet.consultation_fee || 0}
                          </span>
                          {(vet as any).distance && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {((vet as any).distance).toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedVetId === vet.id && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="p-6">
              <h3 className="font-semibold mb-3">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your concern or add details about the detected issue..."
                className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
            <div>
              {selectedVet && (
                <p className="text-sm text-muted-foreground">
                  Consultation fee: <span className="font-semibold text-foreground">₹{selectedVet.consultation_fee || 0}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedVetId || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4" />
                    Request Consultation
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
