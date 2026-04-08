import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ClipboardCheck, CreditCard, FileText, Home, MapPin, User } from "lucide-react";
import type { LandTitleRequestData } from "@/hooks/useLandTitleRequest";

type DeducedTitle = { label: string; description?: string } | null;

export interface LandTitleReviewTabProps {
  formData: LandTitleRequestData;
  propertyCategory?: string;
  constructionType: string;
  constructionNature: string;
  constructionMaterials?: string;
  declaredUsage: string;
  standing?: string;
  floorNumber?: string;
  constructionYear?: string;
  nationality: string;
  hasBuildingPermit?: boolean;
  valorisationValidated: boolean;
  deducedTitleType: DeducedTitle;
  requesterIdFile: File | null;
  ownerIdFile: File | null;
  proofOfOwnershipFile: File | null;
  procurationFile?: File | null;
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides: Array<{ name: string; length: string }>;
  totalAmount: number;
  loading?: boolean;
  requestType?: string;
  selectedParcelNumber?: string;
  hasPermitUpdate?: string;
  permitUpdateType?: string;
  permitUpdateNumber?: string;
  permitUpdateDate?: string;
  permitUpdateService?: string;
  onEditTab: (tabId: string) => void;
  onProceedToPayment: () => void;
}

const formatSectionType = (type: string) => {
  if (type === "urbaine") return "Section Urbaine (SU)";
  if (type === "rurale") return "Section Rurale (SR)";
  return "";
};

const formatNationality = (nat: string) => {
  if (nat === "congolais") return "Congolais(e)";
  if (nat === "etranger") return "Étranger(ère)";
  return "";
};



const formatFloorNumber = (floor: string) => {
  if (floor === '0') return 'Rez-de-chaussée';
  if (floor === '4+') return 'R+4 ou plus';
  if (floor) return `R+${floor}`;
  return '';
};

const LandTitleReviewTab: React.FC<LandTitleReviewTabProps> = ({
  formData,
  propertyCategory,
  constructionType,
  constructionNature,
  constructionMaterials,
  declaredUsage,
  standing,
  floorNumber,
  constructionYear,
  nationality,
  hasBuildingPermit,
  valorisationValidated,
  deducedTitleType,
  requesterIdFile,
  ownerIdFile,
  proofOfOwnershipFile,
  procurationFile,
  gpsCoordinates,
  parcelSides,
  totalAmount,
  loading,
  requestType,
  selectedParcelNumber,
  hasPermitUpdate,
  permitUpdateType,
  permitUpdateNumber,
  permitUpdateDate,
  permitUpdateService,
  onEditTab,
  onProceedToPayment,
}) => {
  const hasGPSCoordinates = gpsCoordinates.some((c) => c.lat && c.lng);
  const hasParcelSides = parcelSides.some((s) => s.length);

  const requesterComplete =
    !!requestType &&
    (
      (formData.requesterType === 'owner' && !!selectedParcelNumber) ||
      (!!formData.requesterLastName && !!formData.requesterFirstName && !!formData.requesterPhone)
    ) &&
    (formData.requesterType !== "representative" || (!!formData.ownerLastName && !!formData.ownerFirstName)) &&
    (requestType === 'initial' || !!selectedParcelNumber);

  const locationComplete =
    !!formData.sectionType &&
    !!formData.province &&
    ((formData.sectionType === "urbaine" && !!formData.ville && !!formData.commune && !!formData.quartier) ||
      (formData.sectionType === "rurale" && !!formData.territoire && !!formData.collectivite));

  const valorisationComplete = valorisationValidated;
  const documentsComplete = !!requesterIdFile;

  const allComplete = requesterComplete && locationComplete && valorisationComplete && documentsComplete;

  return (
    <div className="space-y-3 py-3 max-w-[360px] mx-auto">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-sm flex-shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold">Récapitulatif</h3>
              <p className="text-xs text-muted-foreground">Vérifiez vos informations avant le paiement.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
            <div className="text-xs text-muted-foreground">Total à payer</div>
            <div className="text-base font-bold text-primary">${totalAmount}</div>
          </div>

          <div
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full w-fit",
              allComplete
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            {allComplete ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Formulaire complet
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Formulaire incomplet
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demandeur */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Demandeur
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditTab("requester")} className="text-xs h-6 px-2">
              Modifier
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            {requestType && (
              <div className="pb-1 mb-1 border-b border-border/50">
                <span className="font-medium">Type de demande :</span>{" "}
                {requestType === 'initial' ? 'Demande initiale' : requestType === 'renouvellement' ? 'Renouvellement' : 'Conversion'}
                {selectedParcelNumber && (
                  <div className="text-muted-foreground mt-0.5">Parcelle : {selectedParcelNumber}</div>
                )}
              </div>
            )}
            <div>
              <span className="font-medium">Nom:</span> {formData.requesterLastName || <span className="italic text-muted-foreground">Non renseigné</span>}
            </div>
            <div>
              <span className="font-medium">Prénom:</span> {formData.requesterFirstName || <span className="italic text-muted-foreground">Non renseigné</span>}
            </div>
            <div>
              <span className="font-medium">Téléphone:</span> {formData.requesterPhone || <span className="italic text-muted-foreground">Non renseigné</span>}
            </div>
            {formData.requesterEmail && (
              <div>
                <span className="font-medium">Email:</span> {formData.requesterEmail}
              </div>
            )}
            {formData.requesterType === "representative" && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Propriétaire:</div>
                <div className="text-muted-foreground">
                  {formData.ownerLastName} {formData.ownerFirstName}
                </div>
              </div>
            )}
            {!requesterComplete && (
              <button
                type="button"
                onClick={() => onEditTab("requester")}
                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer text-left"
              >
                Champs requis manquants →
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Localisation */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Localisation
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditTab("location")} className="text-xs h-6 px-2">
              Modifier
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-medium">Section:</span> {formatSectionType(formData.sectionType) || <span className="italic text-muted-foreground">Non renseignée</span>}
            </div>
            <div>
              <span className="font-medium">Province:</span> {formData.province || <span className="italic text-muted-foreground">Non renseignée</span>}
            </div>

            {formData.sectionType === "urbaine" && (
              <div className="pt-1 border-t border-border/50">
                {formData.ville && <div><span className="font-medium">Ville:</span> {formData.ville}</div>}
                {formData.commune && <div><span className="font-medium">Commune:</span> {formData.commune}</div>}
                {formData.quartier && <div><span className="font-medium">Quartier:</span> {formData.quartier}</div>}
                {formData.avenue && <div><span className="font-medium">Avenue:</span> {formData.avenue}</div>}
              </div>
            )}

            {formData.sectionType === "rurale" && (
              <div className="pt-1 border-t border-border/50">
                {formData.territoire && <div><span className="font-medium">Territoire:</span> {formData.territoire}</div>}
                {formData.collectivite && <div><span className="font-medium">Collectivité:</span> {formData.collectivite}</div>}
                {formData.groupement && <div><span className="font-medium">Groupement:</span> {formData.groupement}</div>}
                {formData.village && <div><span className="font-medium">Village:</span> {formData.village}</div>}
              </div>
            )}

            {formData.areaSqm && (
              <div className="pt-1 border-t border-border/50">
                <span className="font-medium">Superficie:</span> {formData.areaSqm} m²
              </div>
            )}

            {(hasGPSCoordinates || hasParcelSides) && (
              <div className="pt-1 border-t border-border/50 text-muted-foreground">
                {hasGPSCoordinates && <div>GPS: renseigné</div>}
                {hasParcelSides && <div>Dimensions: renseignées</div>}
              </div>
            )}

            {!locationComplete && (
              <button
                type="button"
                onClick={() => onEditTab("location")}
                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer text-left"
              >
                Champs requis manquants →
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mise en valeur */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" /> Mise en valeur
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditTab("valorisation")} className="text-xs h-6 px-2">
              Modifier
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            {propertyCategory && (
              <div>
                <span className="font-medium">Catégorie:</span> {propertyCategory}
              </div>
            )}
            <div>
              <span className="font-medium">Type:</span> {constructionType || <span className="italic text-muted-foreground">Non renseigné</span>}
            </div>
            <div>
              <span className="font-medium">Nature:</span> {constructionNature || <span className="italic text-muted-foreground">Non renseignée</span>}
            </div>
            {constructionMaterials && (
              <div>
                <span className="font-medium">Matériaux:</span> {constructionMaterials}
              </div>
            )}
            <div>
              <span className="font-medium">Usage:</span> {declaredUsage || <span className="italic text-muted-foreground">Non renseigné</span>}
            </div>
            {standing && (
              <div>
                <span className="font-medium">Standing:</span> {standing}
              </div>
            )}
            {floorNumber && propertyCategory !== 'Appartement' && (
              <div>
                <span className="font-medium">Étages:</span> {formatFloorNumber(floorNumber)}
              </div>
            )}
            {constructionYear && (
              <div>
                <span className="font-medium">Année de construction:</span> {constructionYear}
              </div>
            )}
            {nationality && (
              <div className="pt-1 border-t border-border/50 text-muted-foreground">
                <div>Nationalité: {formatNationality(nationality)}</div>
                <div>Autorisation de bâtir: {hasBuildingPermit ? 'Oui' : 'Non'}</div>
              </div>
            )}
            {deducedTitleType?.label && (
              <div className="pt-1 border-t border-border/50">
                <span className="font-medium">Titre déduit:</span> {deducedTitleType.label}
              </div>
            )}

            {/* Proposed building permit update */}
            {hasPermitUpdate === 'yes' && permitUpdateNumber && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium text-muted-foreground mb-0.5">Autorisation de bâtir proposée</div>
                <div><span className="font-medium">Type:</span> {permitUpdateType === 'construction' ? 'Autorisation de bâtir' : 'Régularisation'}</div>
                <div><span className="font-medium">N°:</span> {permitUpdateNumber}</div>
                {permitUpdateDate && <div><span className="font-medium">Date:</span> {new Date(permitUpdateDate).toLocaleDateString('fr-FR')}</div>}
                {permitUpdateService && <div><span className="font-medium">Service:</span> {permitUpdateService}</div>}
              </div>
            )}

            {!valorisationComplete && (
              <button
                type="button"
                onClick={() => onEditTab("valorisation")}
                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer text-left"
              >
                Veuillez valider l'éligibilité →
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Documents
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditTab("documents")} className="text-xs h-6 px-2">
              Modifier
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-medium">Pièce d'identité (demandeur):</span>{" "}
              {requesterIdFile ? requesterIdFile.name : <span className="italic text-muted-foreground">Non jointe</span>}
            </div>
            {formData.requesterType === "representative" && (
              <div>
                <span className="font-medium">Pièce d'identité (propriétaire):</span>{" "}
                {ownerIdFile ? ownerIdFile.name : <span className="italic text-muted-foreground">Non jointe</span>}
              </div>
            )}
            <div>
              <span className="font-medium">Preuve de propriété:</span>{" "}
              {proofOfOwnershipFile ? proofOfOwnershipFile.name : <span className="italic text-muted-foreground">Non jointe</span>}
            </div>
            {formData.requesterType === "representative" && (
              <div>
                <span className="font-medium">Procuration:</span>{" "}
                {procurationFile ? procurationFile.name : <span className="italic text-amber-600 dark:text-amber-400">Non jointe (requise)</span>}
              </div>
            )}
            {!documentsComplete && (
              <button
                type="button"
                onClick={() => onEditTab("documents")}
                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer text-left"
              >
                Pièce d'identité du demandeur requise →
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Frais */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Frais
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditTab("payment")} className="text-xs h-6 px-2">
              Modifier
            </Button>
          </div>
          <div className="text-xs">
            <span className="font-medium">Total:</span> ${totalAmount}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      {!allComplete && (
        <Card className="rounded-2xl shadow-sm border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Complétez les sections marquées comme incomplètes avant de procéder au paiement.</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onEditTab("payment")} className="flex-1 h-9 text-xs rounded-lg">
            Retour
          </Button>
          <Button
            type="button"
            onClick={onProceedToPayment}
            disabled={!!loading || !allComplete}
            className="flex-1 h-9 text-xs rounded-lg gap-2"
          >
            {loading ? (
              "Chargement…"
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Payer
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2">En procédant au paiement, vous confirmez l'exactitude des informations.</p>
      </div>
    </div>
  );
};

export default LandTitleReviewTab;
