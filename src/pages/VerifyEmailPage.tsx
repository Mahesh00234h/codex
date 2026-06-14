import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Loader2, RefreshCw, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Get email from query params or session
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if coming back from email verification link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'signup') {
      setIsVerifying(true);
      // Supabase will automatically verify the session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsVerified(true);
          setIsVerifying(false);
          toast.success('Email verified successfully!');
          // Redirect after a delay
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      });
    }
  }, [searchParams, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      toast.success('Verification email sent!');
      setResendCooldown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend email';
      toast.error(message);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
          >
            <CheckCircle className="h-10 w-10 text-success" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground">Email Verified!</h1>
          <p className="text-muted-foreground">
            Your email has been verified successfully. Redirecting you to login...
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
          <Sprout className="h-8 w-8" />
          Farmaline
        </Link>

        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
        >
          {isVerifying ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          ) : (
            <Mail className="h-12 w-12 text-primary" />
          )}
        </motion.div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {isVerifying ? 'Verifying...' : 'Check your email'}
          </h1>
          <p className="text-muted-foreground">
            {isVerifying ? (
              'Please wait while we verify your email address.'
            ) : (
              <>
                We've sent a verification link to{' '}
                {email ? (
                  <span className="font-medium text-foreground">{email}</span>
                ) : (
                  'your email address'
                )}
                . Click the link to verify your account.
              </>
            )}
          </p>
        </div>

        {/* Instructions */}
        {!isVerifying && (
          <div className="bg-muted/50 rounded-xl p-6 text-left space-y-3">
            <h3 className="font-semibold text-foreground">Next steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open the email we just sent you</li>
              <li>Click the verification link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>
        )}

        {/* Actions */}
        {!isVerifying && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || !email}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Didn't receive it? Resend"}
            </Button>

            <p className="text-sm text-muted-foreground">
              Already verified?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Tips */}
        {!isVerifying && (
          <p className="text-xs text-muted-foreground">
            Check your spam folder if you don't see the email in your inbox.
          </p>
        )}
      </motion.div>
    </div>
  );
}
