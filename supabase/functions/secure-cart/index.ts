import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  cover_image_url?: string;
  description?: string;
  period?: string;
  zone?: string;
  pages?: number;
}

interface CartValidationRequest {
  items: CartItem[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // POST /secure-cart?action=validate-cart - Valider le panier côté serveur
    if (req.method === 'POST' && action === 'validate-cart') {
      const body: CartValidationRequest = await req.json();
      
      if (!body.items || !Array.isArray(body.items)) {
        return new Response(
          JSON.stringify({ error: 'Format de panier invalide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validatedItems: CartItem[] = [];
      let totalAmount = 0;

      // Valider chaque item du panier contre la base de données
      for (const item of body.items) {
        try {
          // Vérifier que la publication existe et récupérer le prix officiel
          const { data: publication, error } = await supabaseClient
            .from('publications')
            .select('id, title, price_usd, cover_image_url, description, status')
            .eq('id', item.id)
            .eq('status', 'published')
            .single();

          if (error || !publication) {
            console.warn(`Publication non trouvée ou non publiée: ${item.id}`);
            continue; // Ignorer les items non valides
          }

          // Utiliser le prix officiel de la base de données (pas celui du client)
          const validatedItem: CartItem = {
            id: publication.id,
            title: publication.title,
            price: publication.price_usd, // Prix sécurisé depuis la DB
            cover_image_url: publication.cover_image_url,
            description: publication.description,
            period: item.period, // Métadonnées conservées
            zone: item.zone,
            pages: item.pages
          };

          validatedItems.push(validatedItem);
          totalAmount += publication.price_usd;

        } catch (err) {
          console.error(`Erreur lors de la validation de l'item ${item.id}:`, err);
          continue;
        }
      }

      return new Response(
        JSON.stringify({
          validatedItems,
          totalAmount,
          itemCount: validatedItems.length,
          message: validatedItems.length !== body.items.length 
            ? 'Certains articles non valides ont été supprimés du panier'
            : 'Panier validé avec succès'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /secure-cart?action=calculate-total - Calculer le total sécurisé
    if (req.method === 'POST' && action === 'calculate-total') {
      const { itemIds } = await req.json();
      
      if (!Array.isArray(itemIds)) {
        return new Response(
          JSON.stringify({ error: 'Liste d\'IDs invalide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer les prix officiels depuis la base de données
      const { data: publications, error } = await supabaseClient
        .from('publications')
        .select('id, price_usd')
        .in('id', itemIds)
        .eq('status', 'published');

      if (error) {
        console.error('Erreur lors du calcul du total:', error);
        return new Response(
          JSON.stringify({ error: 'Erreur lors du calcul du total' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const total = (publications || []).reduce((sum, pub) => sum + pub.price_usd, 0);

      return new Response(
        JSON.stringify({ 
          total,
          validItemCount: publications?.length || 0,
          requestedItemCount: itemIds.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint non trouvé' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})