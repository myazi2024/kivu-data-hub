import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, MapPin, Building2, Phone, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

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
}

export function UserBuildingPermits() {
  const [permits, setPermits] = useState<BuildingPermitRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "En attente", variant: "secondary" as const, icon: Clock },
      approved: { label: "Approuvé", variant: "default" as const, icon: CheckCircle2 },
      rejected: { label: "Rejeté", variant: "destructive" as const, icon: AlertCircle },
      verified: { label: "Vérifié", variant: "default" as const, icon: CheckCircle2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPermitTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      new: "Nouveau permis",
      renewal: "Renouvellement",
      modification: "Modification"
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (permits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune demande de permis de construire</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {permits.map((permit) => (
        <Card key={permit.id} className="overflow-hidden">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="text-sm md:text-base">Parcelle: {permit.parcel_number}</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Demandé le {format(new Date(permit.created_at), "dd MMM yyyy", { locale: fr })}
                </CardDescription>
              </div>
              {getStatusBadge(permit.status)}
            </div>
          </CardHeader>
          
          <CardContent className="p-3 md:p-6 pt-2 md:pt-3 space-y-3 md:space-y-4">
            {/* Permit Request Data */}
            {permit.permit_request_data && (
              <div className="space-y-2 md:space-y-3">
                <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  Informations de la demande
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm bg-muted/50 p-2 md:p-3 rounded-lg">
                  {permit.permit_request_data.requestType && (
                    <div>
                      <span className="text-muted-foreground text-[10px] md:text-xs">Type de demande:</span>
                      <p className="font-medium">{getPermitTypeLabel(permit.permit_request_data.requestType)}</p>
                    </div>
                  )}
                  {permit.permit_request_data.issuingService && (
                    <div>
                      <span className="text-muted-foreground text-[10px] md:text-xs">Service délivrant:</span>
                      <p className="font-medium">{permit.permit_request_data.issuingService}</p>
                    </div>
                  )}
                  {permit.permit_request_data.contactPerson && (
                    <div>
                      <span className="text-muted-foreground text-[10px] md:text-xs">Personne de contact:</span>
                      <p className="font-medium">{permit.permit_request_data.contactPerson}</p>
                    </div>
                  )}
                  {permit.permit_request_data.contactPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{permit.permit_request_data.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Building Permits */}
            {permit.building_permits && Array.isArray(permit.building_permits) && permit.building_permits.length > 0 && (
              <div className="space-y-2 md:space-y-3">
                <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
                  Permis délivrés
                </h4>
                <div className="space-y-2">
                  {permit.building_permits.map((bp: any, index: number) => (
                    <div key={index} className="bg-muted/50 p-2 md:p-3 rounded-lg space-y-1.5 md:space-y-2 text-xs md:text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] md:text-xs">{bp.permitNumber}</Badge>
                        {bp.isCurrent && <Badge className="text-[10px] md:text-xs bg-green-600">Actuel</Badge>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2 text-[10px] md:text-xs">
                        <div>
                          <span className="text-muted-foreground">Délivré le:</span>
                          <span className="ml-1 font-medium">
                            {format(new Date(bp.issueDate), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Validité:</span>
                          <span className="ml-1 font-medium">{bp.validityMonths} mois</span>
                        </div>
                        {bp.issuingService && (
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground">Service:</span>
                            <span className="ml-1 font-medium">{bp.issuingService}</span>
                          </div>
                        )}
                        {bp.administrativeStatus && (
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground">Statut:</span>
                            <span className="ml-1 font-medium">{bp.administrativeStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Permit Number */}
            {permit.previous_permit_number && (
              <div className="bg-muted/50 p-2 md:p-3 rounded-lg text-xs md:text-sm">
                <span className="text-muted-foreground">Ancien numéro de permis:</span>
                <span className="ml-2 font-medium">{permit.previous_permit_number}</span>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                Localisation
              </h4>
              <div className="bg-muted/50 p-2 md:p-3 rounded-lg">
                <p className="text-xs md:text-sm">
                  {[permit.province, permit.ville, permit.commune, permit.quartier, permit.avenue]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
