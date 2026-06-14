import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Sparkles, Leaf, AlertTriangle, CheckCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

interface QualityResult {
  qualityScore: number;
  grade: string;
  freshness: { level: string; estimatedShelfLife: string };
  appearance: { color: string; uniformity: string; cleanliness: string };
  defects: { type: string; severity: string; percentage: string }[];
  strengths: string[];
  improvements: string[];
  marketability: { score: number; targetMarket: string; pricingAdvice: string };
  verificationBadge: { eligible: boolean; reason: string };
  summary: string;
}

export default function QualityGradingPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeQuality = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    try {
      if (DEMO_DATA_MODE) {
        const demoResult: QualityResult = {
          qualityScore: 84,
          grade: 'A',
          freshness: { level: 'Good', estimatedShelfLife: '3-5 days' },
          appearance: { color: 'Consistent', uniformity: 'Mostly uniform', cleanliness: 'Clean' },
          defects: [{ type: 'Minor surface marks', severity: 'low', percentage: '4%' }],
          strengths: ['Good color consistency', 'Low visible defect rate', 'Suitable for premium local sale'],
          improvements: ['Sort out bruised pieces', 'Use ventilated crates during transport'],
          marketability: {
            score: 86,
            targetMarket: 'local retail',
            pricingAdvice: 'Price 5-8% above mixed-grade produce after sorting.',
          },
          verificationBadge: { eligible: true, reason: 'Meets demo quality threshold' },
          summary: 'Demo mode quality grading. Deploy quality-analysis for live OpenAI vision grading.',
        };
        setResult(demoResult);
        toast.success('Demo quality analysis complete!');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quality-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64, productType: 'agricultural produce' }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data as QualityResult);
      toast.success('Quality analysis complete!');
    } catch (err) {
      toast.error('Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'text-green-600 bg-green-500/10';
    if (grade === 'B') return 'text-yellow-600 bg-yellow-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  const reset = () => { setImagePreview(null); setImageBase64(null); setResult(null); };

  return (
    <DashboardLayout title="AI Quality Grading" subtitle="Get instant quality scores for your produce">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Upload Area */}
        {!imagePreview ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Produce Photo</h3>
                <p className="text-muted-foreground text-sm mb-4">Take a clear photo of your fruits, vegetables, or grains for AI quality analysis</p>
                <Button><Upload className="h-4 w-4 mr-2" />Choose Photo</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <img src={imagePreview} alt="Produce" className="w-full max-h-64 object-contain rounded-lg" />
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1"><RotateCcw className="h-4 w-4 mr-2" />New Photo</Button>
              <Button onClick={analyzeQuality} disabled={isAnalyzing} className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />{isAnalyzing ? 'Analyzing...' : 'Analyze Quality'}
              </Button>
            </div>
          </motion.div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Quality Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className={`text-4xl font-bold px-4 py-2 rounded-xl ${gradeColor(result.grade)}`}>
                    {result.grade}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Overall Score</span>
                      <span className="font-semibold">{result.qualityScore}/100</span>
                    </div>
                    <Progress value={result.qualityScore} className="h-3" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Freshness</p>
                    <p className="font-semibold flex items-center gap-1"><Leaf className="h-4 w-4 text-green-500" />{result.freshness.level}</p>
                    <p className="text-xs text-muted-foreground">{result.freshness.estimatedShelfLife}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Market Target</p>
                    <p className="font-semibold capitalize">{result.marketability.targetMarket}</p>
                    <p className="text-xs text-muted-foreground">Score: {result.marketability.score}/100</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Verification</p>
                    <p className="font-semibold flex items-center gap-1">
                      <ShieldCheck className={`h-4 w-4 ${result.verificationBadge.eligible ? 'text-green-500' : 'text-muted-foreground'}`} />
                      {result.verificationBadge.eligible ? 'Eligible' : 'Not Yet'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Defects, Strengths, Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Strengths</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-yellow-500" />Improvements</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.improvements.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />{r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Advice */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm"><span className="font-semibold">💰 Pricing Advice:</span> {result.marketability.pricingAdvice}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
