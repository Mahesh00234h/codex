import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  Bell, 
  Zap, 
  CheckCircle2,
  Share,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: 'Lightning Fast', description: 'Instant loading, even on slow networks' },
    { icon: Wifi, title: 'Works Offline', description: 'Access key features without internet' },
    { icon: Bell, title: 'Push Notifications', description: 'Get alerts for orders and updates' },
    { icon: Smartphone, title: 'Native Feel', description: 'Full-screen experience like a real app' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          KrishiConnect
        </Link>
        <Link to="/login">
          <Button variant="outline" size="sm">Login</Button>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center">
            <img 
              src="/pwa-icon-192.png" 
              alt="KrishiConnect" 
              className="w-20 h-20 rounded-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold mb-3">Install KrishiConnect</h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </motion.div>

        {/* Install Status */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-success/10 border border-success/20 rounded-2xl p-6 text-center mb-8"
          >
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">Already Installed!</h2>
            <p className="text-muted-foreground mb-4">
              KrishiConnect is ready to use on your device
            </p>
            <Link to="/">
              <Button className="gap-2">
                Open App <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Install Button (Android/Desktop) */}
            {deferredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Button 
                  onClick={handleInstall}
                  size="lg"
                  className="w-full gap-3 h-14 text-lg"
                >
                  <Download className="h-5 w-5" />
                  Install App
                </Button>
              </motion.div>
            )}

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 mb-8"
              >
                <h2 className="font-semibold mb-4">Install on iPhone/iPad</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Tap the</span>
                      <Share className="h-5 w-5 text-primary" />
                      <span>Share button</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Scroll and tap</span>
                      <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <span>Tap "Add" to install</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Android Instructions (fallback) */}
            {isAndroid && !deferredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 mb-8"
              >
                <h2 className="font-semibold mb-4">Install on Android</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Open the browser menu (three dots) and tap "Install app" or "Add to Home Screen"
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Features */}
        <div className="space-y-4 mb-8">
          <h2 className="font-semibold text-center">Why Install?</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <feature.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Continue without installing */}
        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Continue in browser →
          </Link>
        </div>
      </main>
    </div>
  );
}
