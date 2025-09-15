import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CadastralService {
  service_id: string;
  name: string;
  price_usd: number;
  description: string;
}

interface InvoiceCreationRequest {
  parcel_number: string;
  selected_services: string[];
  discount_code?: string;
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

    // GET /cadastral-services?action=get-services - Récupérer la liste des services
    if (req.method === 'GET' && action === 'get-services') {
      const { data: services, error } = await supabaseClient
        .from('cadastral_services_config')
        .select('service_id, name, price_usd, description')
        .eq('is_active', true)
        .order('service_id');

      if (error) {
        console.error('Error fetching services:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch services' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ services }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /cadastral-services?action=create-invoice - Créer une facture sécurisée
    if (req.method === 'POST' && action === 'create-invoice') {
      const body: InvoiceCreationRequest = await req.json();
      
      // Validation des données d'entrée
      if (!body.parcel_number || !body.selected_services || body.selected_services.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Données manquantes ou invalides' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Appeler la fonction sécurisée de la base de données
      const { data, error } = await supabaseClient.rpc('create_cadastral_invoice_secure', {
        parcel_number_param: body.parcel_number,
        selected_services_param: body.selected_services,
        discount_code_param: body.discount_code || null
      });

      if (error) {
        console.error('Error creating invoice:', error);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création de la facture' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = data[0];
      
      if (result.error_message) {
        return new Response(
          JSON.stringify({ error: result.error_message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          invoice: {
            id: result.invoice_id,
            invoice_number: result.invoice_number,
            total_amount_usd: result.total_amount_usd,
            original_amount_usd: result.original_amount_usd,
            discount_amount_usd: result.discount_amount_usd,
            discount_code_used: result.discount_code_used,
            services: result.services_data,
            status: 'pending'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /cadastral-services?action=validate-access - Valider l'accès à un service
    if (req.method === 'POST' && action === 'validate-access') {
      const { parcel_number, service_type } = await req.json();

      if (!parcel_number || !service_type) {
        return new Response(
          JSON.stringify({ error: 'Paramètres manquants' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier l'accès utilisateur dans la base de données
      const { data: user } = await supabaseClient.auth.getUser();
      if (!user.user) {
        return new Response(
          JSON.stringify({ hasAccess: false, error: 'Utilisateur non authentifié' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: access, error } = await supabaseClient
        .from('cadastral_service_access')
        .select('expires_at')
        .eq('user_id', user.user.id)
        .eq('parcel_number', parcel_number)
        .eq('service_type', service_type)
        .maybeSingle();

      if (error) {
        console.error('Error checking access:', error);
        return new Response(
          JSON.stringify({ hasAccess: false, error: 'Erreur de vérification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let hasAccess = false;
      if (access) {
        // Si pas d'expiration ou pas encore expiré
        hasAccess = !access.expires_at || new Date(access.expires_at) > new Date();
      }

      return new Response(
        JSON.stringify({ hasAccess }),
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