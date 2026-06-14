import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth, roleLabels } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, User as UserIcon } from 'lucide-react';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
      setAvatarUrl(user.avatar ?? '');
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (DEMO_DATA_MODE) {
        updateUser({ name: name.trim(), phone: phone.trim() || undefined, avatar: avatarUrl.trim() || undefined });
        toast.success('Demo profile updated locally');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), phone: phone.trim() || null, avatar_url: avatarUrl.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      updateUser({ name: name.trim(), phone: phone.trim() || undefined, avatar: avatarUrl.trim() || undefined });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase();

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your personal information">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.name} /> : null}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{roleLabels[user.role]}</p>
                <p>{user.email}</p>
                <p className="text-xs mt-1">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
