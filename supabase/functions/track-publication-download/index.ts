import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth client (anon) for verifying user identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non authentifié' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const publicationId: string | undefined = body?.publication_id;
    if (!publicationId || typeof publicationId !== 'string') {
      return new Response(JSON.stringify({ error: 'publication_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service client for privileged operations
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: pub, error: pubErr } = await admin
      .from('publications')
      .select('id, file_url, price_usd, status, deleted_at')
      .eq('id', publicationId)
      .maybeSingle();

    if (pubErr || !pub || pub.deleted_at || pub.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Publication introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!pub.file_url) {
      return new Response(JSON.stringify({ error: 'Aucun fichier disponible' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier paiement si publication payante
    let paymentId: string | null = null;
    if ((pub.price_usd ?? 0) > 0) {
      const { data: payment } = await admin
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .contains('metadata', { publication_id: publicationId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!payment) {
        return new Response(JSON.stringify({ error: 'Achat requis pour télécharger ce document' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      paymentId = payment.id;
    }

    // Générer URL signée (60s)
    const filePath = pub.file_url.replace(/^.*\/publications\//, '');
    const { data: signed, error: signErr } = await admin.storage
      .from('publications')
      .createSignedUrl(filePath, 60);
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Génération du lien signé impossible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Logger le téléchargement (la fonction trigger incrémente download_count automatiquement)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await admin.from('publication_downloads').insert({
      user_id: user.id,
      publication_id: publicationId,
      payment_id: paymentId,
      ip_address: ip,
    });

    return new Response(JSON.stringify({ signed_url: signed.signedUrl, expires_in: 60 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('track-publication-download error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
