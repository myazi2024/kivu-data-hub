import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Building2, Phone, AlertCircle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { format, differenceInBusinessDays } from "date-fns";
import { fr } from "date-fns/locale";

interface PermitCardProps {
  permit: any;
  onAppealClick?: () => void;
}

export function PermitCard({ permit, onAppealClick }: PermitCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "En attente", variant: "secondary" as const, icon: Clock },
      approved: { label: "Délivré", variant: "default" as const, icon: CheckCircle2 },
      rejected: { label: "Refusé", variant: "destructive" as const, icon: AlertCircle },
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

  const getAppealStatusBadge = (appealStatus: string) => {
    const statusConfig = {
      pending: { label: "Recours en cours", variant: "secondary" as const },
      accepted: { label: "Recours accepté", variant: "default" as const },
      rejected: { label: "Recours rejeté", variant: "destructive" as const },
    };
    const config = statusConfig[appealStatus as keyof typeof statusConfig];
    if (!config) return null;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculer si le délai de recours est dépassé (10 jours ouvrables)
  const canAppeal = () => {
    if (!permit.rejection_date || permit.appeal_submitted) return false;
    const businessDays = differenceInBusinessDays(new Date(), new Date(permit.rejection_date));
    return businessDays <= 10;
  };

  const getAppealDeadlineInfo = () => {
    if (!permit.rejection_date) return null;
    const businessDays = differenceInBusinessDays(new Date(), new Date(permit.rejection_date));
    const remainingDays = 10 - businessDays;
    
    if (remainingDays > 0) {
      return {
        canAppeal: true,
        message: `${remainingDays} jour${remainingDays > 1 ? 's' : ''} ouvrable${remainingDays > 1 ? 's' : ''} restant${remainingDays > 1 ? 's' : ''}`
      };
    }
    return {
      canAppeal: false,
      message: "Délai de recours dépassé"
    };
  };

  const requestType = permit.permit_request_data?.requestType;
  const isRegularization = requestType === 'regularization';

  return (
    <Card className="overflow-hidden">
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
          <div className="flex flex-col gap-1.5">
            {getStatusBadge(permit.status)}
            {permit.appeal_status !== 'none' && getAppealStatusBadge(permit.appeal_status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 md:p-6 pt-2 md:pt-3 space-y-3 md:space-y-4">
        {/* Type de demande */}
        {requestType && (
          <div className="bg-muted/50 p-2 md:p-3 rounded-lg">
            <span className="text-xs text-muted-foreground">Type de demande:</span>
            <p className="font-medium text-sm">
              {isRegularization ? "Permis de régularisation" : "Permis de construire"}
            </p>
          </div>
        )}

        {/* Informations de la demande */}
        {permit.permit_request_data && (
          <div className="space-y-2 md:space-y-3">
            <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              Informations de la demande
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm bg-muted/50 p-2 md:p-3 rounded-lg">
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

        {/* Raisons de refus */}
        {permit.status === 'rejected' && permit.rejection_reasons && permit.rejection_reasons.length > 0 && (
          <div className="space-y-2 bg-destructive/10 p-3 rounded-lg border border-destructive/20">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Raisons du refus
            </h4>
            <ul className="text-sm space-y-1">
              {permit.rejection_reasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {permit.rejection_date && (
              <p className="text-xs text-muted-foreground mt-2">
                Refusé le {format(new Date(permit.rejection_date), "dd MMMM yyyy", { locale: fr })}
              </p>
            )}

            {/* Bouton de recours */}
            {permit.status === 'rejected' && !permit.appeal_submitted && (
              <div className="pt-2 mt-2 border-t border-destructive/20">
                {(() => {
                  const appealInfo = getAppealDeadlineInfo();
                  if (!appealInfo) return null;

                  if (appealInfo.canAppeal) {
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {appealInfo.message}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={onAppealClick}
                        >
                          Soumettre un recours
                        </Button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-muted p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">
                          ⏱️ {appealInfo.message}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {/* Statut du recours */}
            {permit.appeal_submitted && (
              <div className="pt-2 mt-2 border-t border-destructive/20">
                <p className="text-xs text-muted-foreground">
                  Recours soumis le {format(new Date(permit.appeal_submission_date), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Permis délivrés */}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Localisation */}
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
  );
}
