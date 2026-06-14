import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, ScanLine, CloudSun, ShoppingBag, Stethoscope, Bell, MapPin,
  ChevronRight, ChevronLeft, X, Check, Globe, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { languages } from '@/i18n';
import { cn } from '@/lib/utils';
import { safeLocalStorage } from '@/lib/safeStorage';

const STORAGE_KEY = 'farmaline_native_tutorial_v1';

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor native
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // Installed PWA (APK-like standalone) — also benefits from tutorial
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS standalone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  fallbackTitle: string;
  fallbackDesc: string;
  color: string;
}

const steps: Step[] = [
  {
    icon: Sprout,
    titleKey: 'tutorial.welcome.title',
    descKey: 'tutorial.welcome.desc',
    fallbackTitle: 'Welcome to Farmaline',
    fallbackDesc: 'Your all-in-one farming companion. Let us walk you through the key features in just a minute.',
    color: 'text-primary',
  },
  {
    icon: ScanLine,
    titleKey: 'tutorial.disease.title',
    descKey: 'tutorial.disease.desc',
    fallbackTitle: 'Detect Crop Diseases',
    fallbackDesc: 'Take a photo of any plant leaf. Our AI will identify diseases and suggest treatments — even works offline.',
    color: 'text-emerald-600',
  },
  {
    icon: CloudSun,
    titleKey: 'tutorial.weather.title',
    descKey: 'tutorial.weather.desc',
    fallbackTitle: 'Weather & Crop Advice',
    fallbackDesc: 'Get hyper-local weather, irrigation reminders, and crop recommendations tailored to your farm.',
    color: 'text-sky-600',
  },
  {
    icon: ShoppingBag,
    titleKey: 'tutorial.market.title',
    descKey: 'tutorial.market.desc',
    fallbackTitle: 'Sell & Buy Produce',
    fallbackDesc: 'List your harvest, find bulk buyers, or shop fresh produce directly from local farms — Cash on Delivery available.',
    color: 'text-orange-600',
  },
  {
    icon: Stethoscope,
    titleKey: 'tutorial.vet.title',
    descKey: 'tutorial.vet.desc',
    fallbackTitle: 'Talk to a Veterinarian',
    fallbackDesc: 'Book consultations with verified vets, chat 1-on-1, and find nearby doctors on the map.',
    color: 'text-rose-600',
  },
  {
    icon: Sparkles,
    titleKey: 'tutorial.ai.title',
    descKey: 'tutorial.ai.desc',
    fallbackTitle: 'Your AI Assistant',
    fallbackDesc: 'Tap the floating Sparkles button anywhere to ask questions, get smart suggestions, and shortcuts.',
    color: 'text-violet-600',
  },
  {
    icon: Bell,
    titleKey: 'tutorial.notif.title',
    descKey: 'tutorial.notif.desc',
    fallbackTitle: 'Smart Notifications',
    fallbackDesc: 'We learn what you care about and notify you about prices, weather alerts, and orders that matter to you.',
    color: 'text-amber-600',
  },
];

export default function NativeTutorial() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'language' | 'tour'>('language');
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (!isNativeApp()) return;
    try {
      if (safeLocalStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // ignore
    }
    // Slight delay so the app paints first
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    try {
      safeLocalStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const pickLanguage = (code: string) => {
    i18n.changeLanguage(code);
    try {
      safeLocalStorage.setItem('i18nextLng', code);
    } catch {
      // ignore
    }
    setPhase('tour');
  };

  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  if (!open) return null;

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Sprout className="h-5 w-5" />
            <span className="font-bold">Farmaline</span>
          </div>
          <button
            aria-label="Skip tutorial"
            onClick={finish}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === 'language' ? (
          <div className="px-5 pb-6 overflow-y-auto">
            <div className="text-center mb-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Globe className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Choose your language</h2>
              <p className="text-sm text-muted-foreground mt-1">
                अपनी भाषा चुनें · तुमची भाषा निवडा · మీ భాషను ఎంచుకోండి
              </p>
            </div>
            <div className="grid gap-2">
              {languages.map((lang) => {
                const active = i18n.language?.startsWith(lang.code);
                return (
                  <button
                    key={lang.code}
                    onClick={() => pickLanguage(lang.code)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-4 rounded-xl border transition-all text-left touch-target',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{lang.nativeName}</p>
                      <p className="text-xs text-muted-foreground">{lang.name}</p>
                    </div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Step content */}
            <div className="px-5 pb-2 overflow-y-auto flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-6"
                >
                  <div className={cn('mx-auto w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5', step.color)}>
                    <Icon className="h-10 w-10" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{tr(step.titleKey, step.fallbackTitle)}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    {tr(step.descKey, step.fallbackDesc)}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 py-3">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === stepIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-card">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => (stepIdx === 0 ? setPhase('language') : setStepIdx(stepIdx - 1))}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {stepIdx === 0 ? 'Language' : 'Back'}
              </Button>
              <Button
                size="lg"
                onClick={() => (isLast ? finish() : setStepIdx(stepIdx + 1))}
                className="flex-1"
              >
                {isLast ? (
                  <>
                    Get Started
                    <Check className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
