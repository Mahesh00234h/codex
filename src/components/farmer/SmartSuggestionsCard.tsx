import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

export default function SmartSuggestionsCard() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (DEMO_DATA_MODE) return;

    supabase
      .from('notification_preferences')
      .select('smart_suggestions')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (isMissingBackendError(error)) return;
        if (data) setEnabled(data.smart_suggestions);
      });
  }, [user]);

  const toggle = async (v: boolean) => {
    if (!user) return;
    if (DEMO_DATA_MODE) {
      setEnabled(v);
      toast.info('Smart suggestions will sync after Supabase tables are created.');
      return;
    }

    setEnabled(v);
    setLoading(true);
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id, smart_suggestions: v }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast.error('Failed to update preference');
      setEnabled(!v);
    } else {
      toast.success(v ? 'Smart suggestions on' : 'Smart suggestions off');
    }
  };

  const fetchNow = async () => {
    if (!user) return;
    if (DEMO_DATA_MODE) {
      toast.info('AI smart suggestions need the smart-suggestions Edge Function deployed.');
      return;
    }

    setFetching(true);
    const { error } = await supabase.functions.invoke('smart-suggestions', {
      body: { user_id: user.id },
    });
    setFetching(false);
    if (error) toast.error('Could not fetch suggestions');
    else toast.success('Personalized suggestions sent! Check your bell 🔔');
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Smart Suggestions</h3>
            <p className="text-xs text-muted-foreground">AI tips based on your farms, weather & orders</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={fetchNow} disabled={fetching || !enabled}>
        {fetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        Get suggestions now
      </Button>
    </div>
  );
}
