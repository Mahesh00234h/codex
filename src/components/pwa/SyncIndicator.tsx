import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { isOnline, pendingCount, isSyncing, manualSync } = useOfflineSync();
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (pendingCount === 0 && isOnline && !isSyncing) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, isOnline, isSyncing]);

  // Don't show anything if online with no pending items
  if (isOnline && pendingCount === 0 && !showSynced) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-20 left-4 z-50"
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full shadow-lg backdrop-blur-sm text-sm font-medium",
            isOnline
              ? pendingCount > 0
                ? "bg-warning/90 text-warning-foreground"
                : "bg-success/90 text-success-foreground"
              : "bg-muted/90 text-muted-foreground"
          )}
        >
          {!isOnline ? (
            <>
              <CloudOff className="h-4 w-4" />
              <span>Offline{pendingCount > 0 && ` • ${pendingCount} pending`}</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Cloud className="h-4 w-4" />
              <span>{pendingCount} to sync</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={manualSync}
              >
                Sync now
              </Button>
            </>
          ) : showSynced ? (
            <>
              <Check className="h-4 w-4" />
              <span>All synced</span>
            </>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
