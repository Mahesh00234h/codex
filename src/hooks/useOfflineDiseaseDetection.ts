import { useCallback, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Heuristic mapping: MobileNet returns generic ImageNet classes. We look for
// keywords that hint at plant/leaf health issues. This is a rough offline
// fallback - full disease diagnosis still requires the online OpenAI call.
const DISEASE_KEYWORDS = [
  'fungus', 'mold', 'mildew', 'rust', 'blight', 'rot', 'spot', 'wilt',
  'mushroom', 'lichen', 'moss',
];
const PLANT_KEYWORDS = [
  'leaf', 'plant', 'tree', 'flower', 'fruit', 'vegetable', 'corn', 'apple',
  'banana', 'orange', 'lemon', 'tomato', 'potato', 'pepper', 'cucumber',
  'grape', 'strawberry', 'broccoli', 'cauliflower', 'cabbage', 'pineapple',
  'pumpkin', 'squash', 'zucchini', 'mushroom', 'pod', 'seed', 'rose',
  'daisy', 'sunflower', 'palm', 'fern',
];

export interface OfflineAnalysis {
  plantIdentified: string;
  isHealthy: boolean;
  disease: {
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  };
  symptoms: string[];
  cure: string[];
  prevention: string[];
  organicRemedies: string[];
  chemicalTreatment: { product: string; dosage: string; frequency: string };
  escalateToVet: boolean;
  escalationReason?: string;
  additionalNotes?: string;
  _offline: true;
  _topPredictions: { className: string; probability: number }[];
}

let modelPromise: Promise<mobilenet.MobileNet> | null = null;

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      // Prefer WebGL, fall back to CPU
      try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
      await tf.ready();
      return mobilenet.load({ version: 2, alpha: 0.5 });
    })();
  }
  return modelPromise;
}

function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function useOfflineDiseaseDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState<'idle' | 'loading-model' | 'analyzing'>('idle');
  const modelRef = useRef<mobilenet.MobileNet | null>(null);

  const ensureModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    setProgress('loading-model');
    const m = await loadModel();
    modelRef.current = m;
    setIsReady(true);
    return m;
  }, []);

  const analyze = useCallback(async (imageDataUrl: string): Promise<OfflineAnalysis> => {
    setIsLoading(true);
    try {
      const model = await ensureModel();
      setProgress('analyzing');
      const img = await imageFromDataUrl(imageDataUrl);
      const preds = await model.classify(img, 5);

      const top = preds[0];
      const lowerAll = preds.map((p) => p.className.toLowerCase()).join(' ');
      const plantHit = PLANT_KEYWORDS.find((k) => lowerAll.includes(k));
      const diseaseHit = DISEASE_KEYWORDS.find((k) => lowerAll.includes(k));
      const isPlant = !!plantHit;
      const looksUnhealthy = !!diseaseHit;

      const plantIdentified = isPlant
        ? top.className.split(',')[0]
        : `Unknown (${top.className.split(',')[0]})`;

      const confidencePct = Math.round((top.probability || 0) * 100);

      return {
        plantIdentified,
        isHealthy: !looksUnhealthy,
        disease: {
          name: looksUnhealthy
            ? `Possible ${diseaseHit} detected`
            : isPlant ? 'No obvious disease' : 'Unable to identify confidently',
          confidence: Math.min(confidencePct, 60), // cap — offline model is generic
          severity: looksUnhealthy ? 'medium' : 'low',
          description: isPlant
            ? 'Offline diagnosis using on-device MobileNet. For accurate disease identification, medicines, and dosage, reconnect to the internet — your image will be re-analyzed automatically.'
            : 'Could not confidently identify a plant in this image while offline.',
        },
        symptoms: looksUnhealthy ? [`Visual cues consistent with ${diseaseHit}`] : [],
        cure: looksUnhealthy
          ? [
              'Isolate the affected plant if possible to prevent spread.',
              'Remove and destroy heavily infected leaves.',
              'Apply a broad-spectrum organic fungicide such as neem oil (5 ml/L) until you can reconnect for a full diagnosis.',
            ]
          : [],
        prevention: [
          'Maintain proper spacing between plants for airflow.',
          'Avoid overhead watering — water at the base.',
          'Rotate crops each season.',
        ],
        organicRemedies: looksUnhealthy
          ? ['Neem oil spray (5 ml/L water) every 7 days', 'Diluted buttermilk spray for fungal issues']
          : [],
        chemicalTreatment: { product: '', dosage: '', frequency: '' },
        escalateToVet: true,
        escalationReason:
          'Offline diagnosis is limited. Reconnect to the internet for a full AI report with medicine recommendations, or consult an expert.',
        additionalNotes: 'Generated offline using on-device AI (MobileNet v2).',
        _offline: true,
        _topPredictions: preds.map((p) => ({ className: p.className, probability: p.probability })),
      };
    } finally {
      setIsLoading(false);
      setProgress('idle');
    }
  }, [ensureModel]);

  const preload = useCallback(() => { ensureModel().catch(() => {}); }, [ensureModel]);

  return { analyze, preload, isLoading, isReady, progress };
}
