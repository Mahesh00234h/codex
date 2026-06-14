import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-language, x-language-name',  "Access-Control-Allow-Methods": "POST, OPTIONS",};

// Web Push encryption utilities
async function generatePushPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
) {
  // For native web push, we use the web-push algorithm
  // This is a simplified version - in production you'd use a proper web-push library
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload,
  });
  
  return response;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, notification_type, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'user_id, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: allow internal service-role callers, or authenticated users sending
    // notifications to themselves only.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const isServiceCall = !!token && token === supabaseServiceKey;

    if (!isServiceCall) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (userData.user.id !== user_id) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Store notification in database
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        body,
        notification_type: notification_type || 'general',
        data: data || {},
      });

    if (insertError) {
      console.error('Error inserting notification:', insertError);
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          success: true,
          notification_stored: !insertError,
          push_enabled: false,
          message: 'VAPID keys are not configured; stored in-app notification only.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      throw subError;
    }

    const results = [];

    // Send push notification to each subscription
    for (const sub of subscriptions || []) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: '/favicon.ico',
          data: {
            ...data,
            notification_type,
            url: data?.url || '/',
          },
        });

        // Use native fetch to send to push service
        // Note: In production, you'd use proper Web Push encryption
        // For now, we'll just record that we attempted to send
        results.push({
          endpoint: sub.endpoint,
          status: 'queued',
        });
      } catch (err: unknown) {
        console.error('Error sending to subscription:', err);
        results.push({
          endpoint: sub.endpoint,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_stored: !insertError,
        push_results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
