import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Building2, Phone, AlertCircle, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInBusinessDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PermitValidationScore } from "./PermitValidationScore";
import { PermitTimeline } from "./PermitTimeline";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { PermitMessaging } from "./PermitMessaging";
import { PermitPaymentTracker } from "./PermitPaymentTracker";
import { PermitLocationMap } from "./PermitLocationMap";
import { PermitDownloadButton } from "./PermitDownloadButton";

interface PermitCardProps {
  permit: any;
  onAppealClick?: () => void;
}

export function PermitCard({ permit, onAppealClick }: PermitCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
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

  // Determine request type from permit_request_data or building_permits
  const requestType = permit.permit_request_data?.requestType 
    || (Array.isArray(permit.building_permits) && permit.building_permits[0]?.permitType) 
    || 'construction';
  const isRegularization = requestType === 'regularization';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-3 md:p-6 pb-2 md:pb-3 space-y-2 md:space-y-3">
        <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
              <Building2 className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary shrink-0" />
              <span className="text-sm md:text-base truncate">Parcelle: {permit.parcel_number}</span>
            </CardTitle>
            <CardDescription className="text-[10px] md:text-sm">
              Demandé le {format(new Date(permit.created_at), "dd MMM yyyy", { locale: fr })}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 md:gap-1.5 shrink-0">
            {getStatusBadge(permit.status)}
            {permit.appeal_status !== 'none' && getAppealStatusBadge(permit.appeal_status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 md:p-6 pt-2 md:pt-3 space-y-3 md:space-y-4">
        {/* Type de demande */}
        {requestType && (
          <div className="bg-muted/50 p-2 md:p-3 rounded-lg">
            <span className="text-[10px] md:text-xs text-muted-foreground">Type de demande:</span>
            <p className="font-medium text-xs md:text-sm mt-0.5">
              {isRegularization ? "Autorisation de régularisation" : "Autorisation de bâtir"}
            </p>
          </div>
        )}

        {/* Informations de la demande - from permit_request_data OR building_permits */}
        {(() => {
          const prd = permit.permit_request_data;
          const bp = Array.isArray(permit.building_permits) && permit.building_permits[0];
          const issuingService = prd?.issuingService || bp?.issuingService || bp?.issuing_service;
          const contact = prd?.contactPerson || bp?.issuingServiceContact || bp?.issuing_service_contact;
          const contactPhone = prd?.contactPhone;

          if (!issuingService && !contact && !contactPhone) return null;

          return (
            <div className="space-y-1.5 md:space-y-2">
              <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1 md:gap-1.5">
                <FileText className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                Informations de la demande
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm bg-muted/50 p-2 md:p-3 rounded-lg">
                {issuingService && (
                  <div>
                    <span className="text-muted-foreground text-[10px] md:text-xs block mb-0.5">Service délivrant:</span>
                    <p className="font-medium text-xs md:text-sm">{issuingService}</p>
                  </div>
                )}
                {contact && (
                  <div>
                    <span className="text-muted-foreground text-[10px] md:text-xs block mb-0.5">Contact:</span>
                    <p className="font-medium text-xs md:text-sm">{contact}</p>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-xs md:text-sm">{contactPhone}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Raisons de refus */}
        {permit.status === 'rejected' && permit.rejection_reasons && permit.rejection_reasons.length > 0 && (
          <div className="space-y-1.5 md:space-y-2 bg-destructive/10 p-2 md:p-3 rounded-lg border border-destructive/20">
            <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1 md:gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
              Raisons du refus
            </h4>
            <ul className="text-xs md:text-sm space-y-1">
              {permit.rejection_reasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5 md:gap-2">
                  <span className="text-destructive mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
            {permit.rejection_date && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2">
                Refusé le {format(new Date(permit.rejection_date), "dd MMMM yyyy", { locale: fr })}
              </p>
            )}

            {/* Bouton de recours */}
            {permit.status === 'rejected' && !permit.appeal_submitted && (
              <div className="pt-1.5 md:pt-2 mt-1.5 md:mt-2 border-t border-destructive/20">
                {(() => {
                  const appealInfo = getAppealDeadlineInfo();
                  if (!appealInfo) return null;

                  if (appealInfo.canAppeal) {
                    return (
                      <div className="space-y-1.5 md:space-y-2">
                        <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {appealInfo.message}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs md:text-sm"
                          onClick={onAppealClick}
                        >
                          Soumettre un recours
                        </Button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-muted p-1.5 md:p-2 rounded text-center">
                        <p className="text-[10px] md:text-xs text-muted-foreground">
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
              <div className="pt-1.5 md:pt-2 mt-1.5 md:mt-2 border-t border-destructive/20">
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Recours soumis le {format(new Date(permit.appeal_submission_date), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Permis délivrés */}
        {permit.building_permits && Array.isArray(permit.building_permits) && permit.building_permits.length > 0 && (
          <div className="space-y-1.5 md:space-y-2">
            <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1 md:gap-1.5">
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
              Autorisations délivrées
            </h4>
            <div className="space-y-2">
              {permit.building_permits.map((bp: any, index: number) => {
                // Support both camelCase and snake_case keys for backward compatibility
                const permitNum = bp.permitNumber || bp.permit_number || 'N/A';
                const issDate = bp.issueDate || bp.issue_date;
                const validMonths = bp.validityMonths || bp.validity_period_months || 12;
                const current = bp.isCurrent || bp.is_current;

                return (
                  <div key={index} className="bg-muted/50 p-2 md:p-3 rounded-lg space-y-1.5 md:space-y-2 text-xs md:text-sm">
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                      <Badge variant="outline" className="text-[10px] md:text-xs">{permitNum}</Badge>
                      {current && <Badge className="text-[10px] md:text-xs bg-green-600">Actuelle</Badge>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2 text-[10px] md:text-xs">
                      <div>
                        <span className="text-muted-foreground">Délivré le:</span>
                        <span className="ml-1 font-medium">
                          {issDate ? format(new Date(issDate), "dd/MM/yyyy") : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Validité:</span>
                        <span className="ml-1 font-medium">{validMonths} mois</span>
                      </div>
                    </div>
                    {/* Document link */}
                    {(bp.documentUrl || bp.document_url) && (
                      <a
                        href={bp.documentUrl || bp.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] md:text-xs text-primary underline hover:no-underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Voir le document
                      </a>
                    )}
                    <PermitDownloadButton permit={permit} className="w-full" />
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* Localisation */}
        <div className="space-y-1.5 md:space-y-2">
          <h4 className="text-xs md:text-sm font-semibold flex items-center gap-1 md:gap-1.5">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            Localisation
          </h4>
          <div className="bg-muted/50 p-2 md:p-3 rounded-lg">
            <p className="text-xs md:text-sm leading-relaxed">
              {[permit.province, permit.ville, permit.commune, permit.quartier, permit.avenue]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>

        {/* Section détails extensible */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails} className="pt-2 border-t">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between text-xs md:text-sm px-2 md:px-4">
              <span className="font-medium">Plus de détails</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 md:space-y-4 pt-3 md:pt-4">
            {/* Score de validation */}
            {permit.status === "pending" && (
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <PermitValidationScore
                  permitData={permit.permit_request_data}
                  requestType={permit.permit_request_data?.requestType || "construction"}
                />
                <PermitPaymentTracker
                  contributionId={permit.id}
                  permitType={permit.permit_request_data?.requestType || "construction"}
                  status={permit.status}
                />
              </div>
            )}

            {/* Localisation */}
            <PermitLocationMap permit={permit} />

            {/* Messagerie */}
            <PermitMessaging
              contributionId={permit.id}
              parcelNumber={permit.parcel_number}
            />

            {/* Documents */}
            <DocumentUploadSection
              contributionId={permit.id}
              existingDocuments={[]}
            />

            {/* Timeline */}
            <PermitTimeline permit={permit} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
