import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    
    console.log('Demande de permis reçue:', {
      parcelNumber: requestData.parcelNumber,
      requestType: requestData.requestType,
      userId: requestData.userId
    });

    // Enregistrer dans audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: requestData.userId,
        action: 'building_permit_request_submitted',
        table_name: 'building_permit_requests',
        new_values: requestData
      });

    if (auditError) {
      console.error('Erreur audit_logs:', auditError);
      throw auditError;
    }

    // Notification admin
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin']);

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map(admin => ({
        user_id: admin.user_id,
        title: 'Nouvelle demande de permis',
        message: `Demande de ${requestData.requestType === 'new' ? 'nouveau permis' : 'régularisation'} pour la parcelle ${requestData.parcelNumber}`,
        type: 'info',
        action_url: '/admin'
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Notification utilisateur
    await supabase.from('notifications').insert({
      user_id: requestData.userId,
      title: 'Demande enregistrée',
      message: `Votre demande de permis pour la parcelle ${requestData.parcelNumber} a été enregistrée`,
      type: 'success'
    });

    console.log('Demande traitée avec succès');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
