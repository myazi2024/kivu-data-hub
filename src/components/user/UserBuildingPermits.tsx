import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileEdit, Plus } from "lucide-react";
import { toast } from "sonner";
import { PermitSection } from "./building-permits/PermitSection";
import { AppealDialog } from "./building-permits/AppealDialog";
import { PermitStatistics } from "./building-permits/PermitStatistics";
import { PermitRenewalAlert } from "./building-permits/PermitRenewalAlert";
import { PermitRequestCard } from "./building-permits/PermitRequestCard";

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
  const { user } = useAuth();
  const [permits, setPermits] = useState<BuildingPermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<BuildingPermitRequest | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'requests' | 'new'>('requests');

  useEffect(() => {
    if (user) {
      fetchBuildingPermits();
    }
  }, [user]);

  const fetchBuildingPermits = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

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
    <div className="space-y-3 md:space-y-4">
      {/* Onglets principaux : Mes demandes / Nouvelle demande */}
      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as 'requests' | 'new')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 max-w-[360px] mx-auto rounded-2xl">
          <TabsTrigger value="requests" className="gap-1.5 py-2.5 rounded-xl text-xs md:text-sm">
            <FileEdit className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Mes demandes</span>
            {permits.length > 0 && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">
                {permits.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1.5 py-2.5 rounded-xl text-xs md:text-sm">
            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Nouvelle demande</span>
          </TabsTrigger>
        </TabsList>

        {/* Contenu : Mes demandes */}
        <TabsContent value="requests" className="mt-4 space-y-3 md:space-y-4">
          {/* Alertes de renouvellement */}
          <PermitRenewalAlert permits={permits} />
          
          {/* Statistiques */}
          <PermitStatistics permits={permits} />
          
          {permits.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                <FileEdit className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Aucune demande de permis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Commencez par créer une nouvelle demande
                </p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="construction" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto p-1 max-w-[360px] mx-auto">
                <TabsTrigger value="construction" className="gap-1.5 md:gap-2 py-2.5 md:py-2">
                  <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm font-medium">Construire</span>
                  <span className="text-[10px] md:text-xs bg-muted px-1.5 py-0.5 rounded-full">({constructionPermits.length})</span>
                </TabsTrigger>
                <TabsTrigger value="regularization" className="gap-1.5 md:gap-2 py-2.5 md:py-2">
                  <FileEdit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm font-medium">Régulariser</span>
                  <span className="text-[10px] md:text-xs bg-muted px-1.5 py-0.5 rounded-full">({regularizationPermits.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="construction" className="space-y-3 md:space-y-6 mt-3 md:mt-4">
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

              <TabsContent value="regularization" className="space-y-3 md:space-y-6 mt-3 md:mt-4">
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
          )}
        </TabsContent>

        {/* Contenu : Nouvelle demande */}
        <TabsContent value="new" className="mt-4">
          <PermitRequestCard />
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
