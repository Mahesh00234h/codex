import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, Sprout, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VerifyOtpPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') || '';
  const next = params.get('next') || '/login';
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | undefined>();

  const sendCode = async () => {
    if (!email) {
      toast.error('Missing email');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-otp', {
        body: { email, purpose: 'signup' },
      });
      if (error) throw error;
      setDevCode((data as any)?.devCode);
      toast.success((data as any)?.message || 'Code sent');
      setCooldown(45);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, code, purpose: 'signup' },
      });
      if (error) throw error;
      if (!(data as any)?.verified) throw new Error((data as any)?.error || 'Verification failed');
      toast.success('Email verified! You can sign in now.');
      navigate(next, { state: { message: 'Email verified. Please sign in.' } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (email) sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
          <Sprout className="h-8 w-8" /> Farmaline
        </Link>

        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Verify your email</h1>
          <p className="text-muted-foreground">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{email || 'your email'}</span>
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {devCode && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 text-left p-4 text-sm">
            <p className="font-medium mb-1">Email delivery not configured yet</p>
            <p className="text-muted-foreground">
              Use this dev code to continue: <span className="font-mono font-bold text-foreground">{devCode}</span>
            </p>
          </div>
        )}

        <Button onClick={verify} size="lg" className="w-full" disabled={code.length !== 6 || verifying}>
          {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
          Verify & continue
        </Button>

        <Button variant="outline" onClick={sendCode} disabled={sending || cooldown > 0} className="w-full">
          {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </Button>

        <p className="text-sm text-muted-foreground">
          Wrong email? <Link to="/register" className="text-primary font-medium hover:underline">Start over</Link>
        </p>
      </motion.div>
    </div>
  );
}