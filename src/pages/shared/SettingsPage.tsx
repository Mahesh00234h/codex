import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Globe, LogOut, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '@/lib/safeStorage';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications();

  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'off'>('daily');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (DEMO_DATA_MODE) {
      setLoaded(true);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setSmartSuggestions(data.smart_suggestions);
        setFrequency((data.frequency as any) ?? 'daily');
      }
      setLoaded(true);
    })();
  }, [user]);

  const savePrefs = async (next: { smart_suggestions?: boolean; frequency?: string }) => {
    if (!user) return;
    if (DEMO_DATA_MODE) {
      toast.success('Demo preferences saved locally');
      return;
    }

    const payload = {
      user_id: user.id,
      smart_suggestions: next.smart_suggestions ?? smartSuggestions,
      frequency: next.frequency ?? frequency,
    };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) toast.error(error.message);
    else toast.success('Preferences saved');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    safeLocalStorage.setItem('language', lng);
    toast.success('Language updated');
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account & preferences">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/profile">Edit profile</Link>
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-base">Push notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {!isSupported ? 'Not supported in this browser' :
                    permission === 'denied' ? 'Blocked in browser settings' :
                    isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                disabled={!isSupported || permission === 'denied' || pushLoading}
                onCheckedChange={(v) => (v ? subscribe() : unsubscribe())}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-base">Smart suggestions</Label>
                <p className="text-xs text-muted-foreground">Personalized AI tips based on your activity</p>
              </div>
              <Switch
                checked={smartSuggestions}
                disabled={!loaded}
                onCheckedChange={(v) => { setSmartSuggestions(v); savePrefs({ smart_suggestions: v }); }}
              />
            </div>

            <div className="space-y-2">
              <Label>Suggestion frequency</Label>
              <Select value={frequency} onValueChange={(v) => { setFrequency(v as any); savePrefs({ frequency: v }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Language</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="mr">मराठी</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
