import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BuildingPermitRequestData {
  parcelNumber: string;
  requestType: 'new' | 'regularization';
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
  plannedArea: string;
  numberOfFloors: string;
  estimatedCost: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  projectDescription: string;
  startDate?: string;
  estimatedDuration?: string;
  constructionDate?: string;
  currentState?: string;
  complianceIssues?: string;
}

export const useBuildingPermitRequest = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submitRequest = async (data: BuildingPermitRequestData, paymentId?: string) => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase.functions.invoke('submit-building-permit-request', {
        body: {
          ...data,
          userId: userData.user.id,
          userEmail: userData.user.email,
          paymentId
        }
      });

      if (error) throw error;

      toast({
        title: "Demande soumise",
        description: "Votre demande de permis a été enregistrée avec succès",
      });

      return true;
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre la demande",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitRequest, loading };
};
