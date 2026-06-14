import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function trySendEmail(to: string, code: string): Promise<boolean> {
  // Try transactional email if configured
  try {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        to,
        subject: 'Your Farmaline verification code',
        html: `<div style="font-family:system-ui;padding:24px"><h2>Your Farmaline code</h2><p>Use this 6-digit code to verify your email. It expires in 10 minutes.</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px;background:#f5f5f5;border-radius:12px;text-align:center">${code}</div></div>`,
      }),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, purpose = 'signup' } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the user id by email
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: 'No account for that email' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_hash = await sha256(code);

    // Invalidate older codes for this purpose
    await admin
      .from('email_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('purpose', purpose)
      .is('consumed_at', null);

    // Insert new code
    const { error: insErr } = await admin.from('email_otps').insert({
      user_id: user.id,
      email,
      otp_hash,
      purpose,
    });
    if (insErr) throw insErr;

    const sent = await trySendEmail(email, code);

    // Never return the OTP in the HTTP response. If email delivery is not configured,
    // log it only in the server-side console for developer-only access.
    if (!sent) {
      console.log(`[send-email-otp][DEV] user=${user.id} purpose=${purpose} code=${code}`);
    } else {
      console.log(`[send-email-otp] user=${user.id} purpose=${purpose} sent=true`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        delivered: sent,
        message: sent
          ? 'Verification code sent to your email.'
          : 'Email provider not configured. Ask an administrator to check the server logs.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('send-email-otp error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
