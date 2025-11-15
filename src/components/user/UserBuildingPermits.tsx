import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { PermitSection } from "./building-permits/PermitSection";
import { AppealDialog } from "./building-permits/AppealDialog";
import { PermitStatistics } from "./building-permits/PermitStatistics";
import { PermitRenewalAlert } from "./building-permits/PermitRenewalAlert";

interface BuildingPermitRequest {
  id: string;
  parcel_number: string;
  contribution_type: string;
  status: string;
  created_at: string;
  permit_request_data: any;
  building_permits: any;
  previous_permit_number: string | null;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  avenue: string | null;
  rejection_reasons: any;
  rejection_date: string | null;
  appeal_submitted: boolean;
  appeal_data: any;
  appeal_submission_date: string | null;
  appeal_status: string;
}

export function UserBuildingPermits() {
  const [permits, setPermits] = useState<BuildingPermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<BuildingPermitRequest | null>(null);

  useEffect(() => {
    fetchBuildingPermits();
  }, []);

  const fetchBuildingPermits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('*')
        .eq('user_id', user.id)
        .not('permit_request_data', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error) {
      console.error('Error fetching building permits:', error);
      toast.error("Erreur lors du chargement des demandes de permis");
    } finally {
      setLoading(false);
    }
  };

  const handleAppealClick = (permit: BuildingPermitRequest) => {
    setSelectedPermit(permit);
    setAppealDialogOpen(true);
  };

  const handleAppealSuccess = () => {
    fetchBuildingPermits();
  };

  // Filtrer les permis par type
  const constructionPermits = permits.filter(
    p => p.permit_request_data?.requestType !== 'regularization'
  );
  const regularizationPermits = permits.filter(
    p => p.permit_request_data?.requestType === 'regularization'
  );

  // Fonction pour organiser les permis par statut
  const organizePermitsByStatus = (permitsList: BuildingPermitRequest[]) => {
    return {
      pending: permitsList.filter(p => p.status === 'pending'),
      approved: permitsList.filter(p => p.status === 'approved' || p.status === 'verified'),
      rejected: permitsList.filter(p => p.status === 'rejected')
    };
  };

  const constructionByStatus = organizePermitsByStatus(constructionPermits);
  const regularizationByStatus = organizePermitsByStatus(regularizationPermits);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertes de renouvellement */}
      <PermitRenewalAlert permits={permits} />
      
      {/* Statistiques */}
      <PermitStatistics permits={permits} />
      
      <Tabs defaultValue="construction" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="construction" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span>Permis de construire</span>
            <span className="text-xs">({constructionPermits.length})</span>
          </TabsTrigger>
          <TabsTrigger value="regularization" className="gap-2">
            <FileEdit className="h-4 w-4" />
            <span>Permis de régularisation</span>
            <span className="text-xs">({regularizationPermits.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="construction" className="space-y-6 mt-4">
          <PermitSection
            title="En attente"
            permits={constructionByStatus.pending}
            emptyMessage="Aucune demande en attente"
          />
          <PermitSection
            title="Délivrés"
            permits={constructionByStatus.approved}
            emptyMessage="Aucun permis délivré"
          />
          <PermitSection
            title="Refusés"
            permits={constructionByStatus.rejected}
            emptyMessage="Aucun permis refusé"
            onAppealClick={handleAppealClick}
          />
        </TabsContent>

        <TabsContent value="regularization" className="space-y-6 mt-4">
          <PermitSection
            title="En attente"
            permits={regularizationByStatus.pending}
            emptyMessage="Aucune demande en attente"
          />
          <PermitSection
            title="Délivrés"
            permits={regularizationByStatus.approved}
            emptyMessage="Aucun permis délivré"
          />
          <PermitSection
            title="Refusés"
            permits={regularizationByStatus.rejected}
            emptyMessage="Aucun permis refusé"
            onAppealClick={handleAppealClick}
          />
        </TabsContent>
      </Tabs>

      {selectedPermit && (
        <AppealDialog
          open={appealDialogOpen}
          onOpenChange={setAppealDialogOpen}
          contributionId={selectedPermit.id}
          parcelNumber={selectedPermit.parcel_number}
          rejectionReasons={selectedPermit.rejection_reasons || []}
          onSuccess={handleAppealSuccess}
        />
      )}
    </div>
  );
}
