import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { contribution_id } = await req.json();

    // Récupérer la contribution
    const { data: contrib, error: fetchError } = await supabaseClient
      .from('cadastral_contributions')
      .select('*')
      .eq('id', contribution_id)
      .single();

    if (fetchError) throw fetchError;
    if (contrib.status !== 'approved') throw new Error('La contribution doit être approuvée');

    // Vérifier si la parcelle existe déjà
    const { data: existingParcel } = await supabaseClient
      .from('cadastral_parcels')
      .select('id')
      .eq('parcel_number', contrib.parcel_number)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingParcel) {
      return new Response(JSON.stringify({ parcel_id: existingParcel.id, message: 'Parcelle déjà existante' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construire la localisation
    const location = [contrib.province, contrib.ville, contrib.commune, contrib.quartier, contrib.avenue]
      .filter(Boolean).join(', ');

    // Extraire lat/lng du premier point GPS
    const lat = contrib.gps_coordinates?.[0]?.lat || null;
    const lng = contrib.gps_coordinates?.[0]?.lng || null;

    // Créer la parcelle
    const { data: parcel, error: insertError } = await supabaseClient
      .from('cadastral_parcels')
      .insert({
        parcel_number: contrib.parcel_number,
        parcel_type: 'urbain',
        property_title_type: contrib.property_title_type || 'Certificat d\'enregistrement',
        title_reference_number: contrib.title_reference_number,
        current_owner_name: contrib.current_owner_name || 'Non spécifié',
        current_owner_legal_status: contrib.current_owner_legal_status || 'Personne physique',
        current_owner_since: contrib.current_owner_since || new Date().toISOString().split('T')[0],
        area_sqm: contrib.area_sqm || 0,
        location,
        province: contrib.province,
        ville: contrib.ville,
        commune: contrib.commune,
        quartier: contrib.quartier,
        avenue: contrib.avenue,
        territoire: contrib.territoire,
        collectivite: contrib.collectivite,
        groupement: contrib.groupement,
        village: contrib.village,
        circonscription_fonciere: contrib.circonscription_fonciere || 'Circonscription Foncière de Goma',
        gps_coordinates: contrib.gps_coordinates,
        latitude: lat,
        longitude: lng,
        nombre_bornes: contrib.gps_coordinates?.length || 3,
        parcel_sides: contrib.parcel_sides,
        surface_calculee_bornes: contrib.area_sqm,
        construction_type: contrib.construction_type,
        construction_nature: contrib.construction_nature,
        declared_usage: contrib.declared_usage,
        lease_type: contrib.lease_type,
        whatsapp_number: contrib.whatsapp_number,
        owner_document_url: contrib.owner_document_url,
        property_title_document_url: contrib.property_title_document_url
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Mettre à jour la contribution
    await supabaseClient
      .from('cadastral_contributions')
      .update({ original_parcel_id: parcel.id })
      .eq('id', contribution_id);

    return new Response(JSON.stringify({ parcel_id: parcel.id, message: 'Parcelle créée avec succès' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});