import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildingPermitRequestBody {
  userId: string;
  userEmail: string;
  parcelNumber: string;
  requestType: 'new' | 'regularization';
  hasExistingConstruction: boolean;
  
  // Construction info
  constructionType?: string;
  constructionNature?: string;
  proposedUsage?: string;
  estimatedSurface?: number;
  numberOfFloors?: number;
  estimatedBudget?: number;
  constructionDescription?: string;
  
  // Applicant info
  applicantFullName: string;
  applicantLegalStatus: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  
  // Payment info
  paymentMethod?: string;
  paymentProvider?: string;
  phoneNumber?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: BuildingPermitRequestBody = await req.json();
    console.log('Building permit request received:', {
      parcelNumber: requestBody.parcelNumber,
      requestType: requestBody.requestType,
      userId: requestBody.userId
    });

    // Validation
    if (!requestBody.parcelNumber || !requestBody.applicantFullName || !requestBody.applicantPhone) {
      return new Response(
        JSON.stringify({ error: 'Informations requises manquantes' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Créer une notification pour les admins
    const notificationTitle = `Nouvelle demande de permis - ${requestBody.parcelNumber}`;
    const notificationMessage = `${requestBody.applicantFullName} a soumis une demande de ${
      requestBody.requestType === 'new' ? 'nouveau permis' : 'régularisation'
    } pour la parcelle ${requestBody.parcelNumber}. Contact: ${requestBody.applicantPhone}`;

    // Récupérer tous les admins
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminError && adminRoles) {
      // Créer une notification pour chaque admin
      const notifications = adminRoles.map(admin => ({
        user_id: admin.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'building_permit_request',
        action_url: '/admin?tab=building-permits'
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating admin notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} admin notifications`);
      }
    }

    // Créer une notification pour l'utilisateur
    const { error: userNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: requestBody.userId,
        title: 'Demande de permis reçue',
        message: `Votre demande de permis de construire pour la parcelle ${requestBody.parcelNumber} a été reçue. Un administrateur la traitera prochainement.`,
        type: 'info',
        action_url: '/myazi'
      });

    if (userNotifError) {
      console.error('Error creating user notification:', userNotifError);
    }

    // Sauvegarder les détails de la demande dans un log d'audit
    const requestDetails = {
      request_type: 'building_permit_request',
      parcel_number: requestBody.parcelNumber,
      request_data: requestBody
    };

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: requestBody.userId,
        action: 'building_permit_request_submitted',
        table_name: 'building_permit_requests',
        new_values: requestDetails
      });

    if (auditError) {
      console.error('Error logging audit:', auditError);
    }

    const requestId = crypto.randomUUID();

    return new Response(
      JSON.stringify({ 
        success: true,
        requestId,
        message: 'Demande de permis soumise avec succès'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in submit-building-permit-request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
