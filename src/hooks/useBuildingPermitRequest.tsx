import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BuildingPermitRequestData {
  parcelNumber: string;
  requestType: 'new' | 'regularization';
  hasExistingConstruction: boolean;
  
  // Informations sur la construction
  constructionType?: string;
  constructionNature?: string;
  proposedUsage?: string;
  estimatedSurface?: number;
  numberOfFloors?: number;
  estimatedBudget?: number;
  constructionDescription?: string;
  
  // Informations du demandeur
  applicantFullName: string;
  applicantLegalStatus: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  
  // Informations de paiement
  paymentMethod?: string;
  paymentProvider?: string;
  phoneNumber?: string;
}

export interface BuildingPermitRequestResponse {
  success: boolean;
  requestId?: string;
  message?: string;
  error?: string;
}

export const useBuildingPermitRequest = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const submitRequest = async (
    requestData: BuildingPermitRequestData
  ): Promise<BuildingPermitRequestResponse> => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour soumettre une demande de permis",
        variant: "destructive"
      });
      return { success: false, error: "User not authenticated" };
    }

    try {
      setLoading(true);

      // Appeler l'edge function pour traiter la demande
      const { data, error } = await supabase.functions.invoke('submit-building-permit-request', {
        body: {
          userId: user.id,
          userEmail: user.email,
          ...requestData
        }
      });

      if (error) {
        console.error('Error submitting building permit request:', error);
        toast({
          title: "Erreur lors de la soumission",
          description: "Une erreur s'est produite lors de l'envoi de votre demande",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      toast({
        title: "Demande envoyée avec succès",
        description: "Votre demande de permis de construire a été transmise. Vous recevrez une notification une fois traitée.",
      });

      return {
        success: true,
        requestId: data?.requestId,
        message: "Demande soumise avec succès"
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erreur inattendue",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  return {
    submitRequest,
    loading
  };
};
