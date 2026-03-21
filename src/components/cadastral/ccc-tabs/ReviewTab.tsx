import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import { MdRateReview } from 'react-icons/md';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { PROPERTY_TITLE_TYPES } from '../PropertyTitleTypeSelect';
import { CurrentOwner, BuildingPermit } from './GeneralTab';
import { PreviousOwner } from './HistoryTab';
import { TaxRecord, MortgageRecord } from './ObligationsTab';

interface ReviewTabProps {
  formData: CadastralContributionData;
  sectionType: 'urbaine' | 'rurale' | '';
  currentOwners: CurrentOwner[];
  previousOwners: PreviousOwner[];
  taxRecords: TaxRecord[];
  mortgageRecords: MortgageRecord[];
  hasMortgage: boolean | null;
  buildingPermits: BuildingPermit[];
  permitMode: 'existing' | 'request';
  ownerDocFile: File | null;
  titleDocFiles: File[];
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides: Array<{ name: string; length: string }>;
  leaseYears: number;
  customTitleName: string;
  // CCC value
  calculateCCCValue: { value: number };
  // Validation
  isFormValidForSubmission: () => boolean;
  getMissingFields: () => Array<{ label: string; tab: string }>;
  // Actions
  handleSubmit: () => void;
  handleTabChange: (tab: string) => void;
  saveFormDataToStorage: () => void;
  setShowQuickAuth: (v: boolean) => void;
  setPendingSubmission: (v: boolean) => void;
  // State
  loading: boolean;
  uploading: boolean;
  user: any;
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  formData, sectionType, currentOwners, previousOwners,
  taxRecords, mortgageRecords, hasMortgage,
  buildingPermits, permitMode, ownerDocFile, titleDocFiles,
  gpsCoordinates, parcelSides, leaseYears, customTitleName,
  calculateCCCValue, isFormValidForSubmission, getMissingFields,
  handleSubmit, handleTabChange, saveFormDataToStorage,
  setShowQuickAuth, setPendingSubmission,
  loading, uploading, user
}) => {
  return (
    <div className="space-y-3 py-3 max-w-[360px] mx-auto">
      {/* CCC Value header */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
              <MdRateReview className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Valeur CCC estimée</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">${calculateCCCValue.value.toFixed(2)}</span>
                <span className="text-xs text-amber-700 dark:text-amber-300">/ $5.00</span>
              </div>
            </div>
          </div>
          {calculateCCCValue.value < 5 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>Complétez plus de champs pour maximiser votre CCC</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Récapitulatif</h3>
      </div>

      {/* General info */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📋</span> Infos générales</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('general')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {formData.parcelNumber && <div><span className="font-medium">Parcelle:</span> {formData.parcelNumber}</div>}
            {formData.propertyTitleType && <div><span className="font-medium">Titre:</span> {formData.propertyTitleType}</div>}
            {formData.titleReferenceNumber && <div><span className="font-medium">Réf:</span> {formData.titleReferenceNumber}</div>}
            {currentOwners.some(o => o.lastName || o.firstName) && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Propriétaire(s):</div>
                {currentOwners.filter(o => o.lastName || o.firstName).map((owner, idx) => (
                  <div key={idx} className="ml-2 text-muted-foreground">• {owner.lastName} {owner.firstName}{owner.since && ` (${new Date(owner.since).toLocaleDateString('fr-FR')})`}</div>
                ))}
              </div>
            )}
            {formData.constructionType && (
              <div className="pt-1 border-t border-border/50">
                <span className="font-medium">Construction:</span> {formData.constructionType}
                {formData.constructionType === 'Terrain nu' && <span className="ml-2 text-xs text-muted-foreground italic">(permis non requis)</span>}
              </div>
            )}
            {formData.declaredUsage && <div><span className="font-medium">Usage:</span> {formData.declaredUsage}</div>}
            {formData.constructionType !== 'Terrain nu' && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Autorisation de bâtir:</div>
                {permitMode === 'existing' && buildingPermits.some(p => p.permitNumber) ? (
                  buildingPermits.filter(p => p.permitNumber).map((permit, idx) => (
                    <div key={idx} className="ml-2 text-muted-foreground">• N° {permit.permitNumber} ({permit.permitType === 'regularization' ? 'Régularisation' : 'Construction'})</div>
                  ))
                ) : permitMode === 'request' ? (
                  <div className="ml-2 text-muted-foreground flex items-center gap-1">
                    <span className="text-amber-600 dark:text-amber-400">⚠</span> Pas de permis
                    <span className="text-xs italic">(demande possible après soumission)</span>
                  </div>
                ) : (
                  <div className="ml-2 text-destructive text-xs italic">Non renseigné</div>
                )}
              </div>
            )}
            {(!formData.propertyTitleType && !currentOwners.some(o => o.lastName || o.firstName)) && (
              <div className="text-muted-foreground italic">Aucune info renseignée</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📍</span> Localisation</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('location')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {formData.province && <div><span className="font-medium">Province:</span> {formData.province}</div>}
            {sectionType && <div><span className="font-medium">Section:</span> {sectionType === 'urbaine' ? 'Urbaine' : 'Rurale'}</div>}
            {sectionType === 'urbaine' && (<>
              {formData.ville && <div><span className="font-medium">Ville:</span> {formData.ville}</div>}
              {formData.commune && <div><span className="font-medium">Commune:</span> {formData.commune}</div>}
              {formData.quartier && <div><span className="font-medium">Quartier:</span> {formData.quartier}</div>}
              {formData.avenue && <div><span className="font-medium">Avenue:</span> {formData.avenue}</div>}
            </>)}
            {sectionType === 'rurale' && (<>
              {formData.territoire && <div><span className="font-medium">Territoire:</span> {formData.territoire}</div>}
              {formData.collectivite && <div><span className="font-medium">Collectivité:</span> {formData.collectivite}</div>}
              {formData.village && <div><span className="font-medium">Village:</span> {formData.village}</div>}
            </>)}
            {formData.areaSqm && <div className="pt-1 border-t border-border/50"><span className="font-medium">Superficie:</span> {formData.areaSqm} m²</div>}
            {parcelSides.some(s => s.length) && (
              <div className="pt-1 border-t border-border/50">
                <div className="font-medium">Dimensions:</div>
                {parcelSides.filter(s => s.length).map((side, idx) => (
                  <span key={idx} className="text-muted-foreground mr-2">{side.name.replace('Côté ', '')}: {side.length}m</span>
                ))}
              </div>
            )}
            {gpsCoordinates.filter(g => g.lat && g.lng).length > 0 && (
              <div className="pt-1 border-t border-border/50"><span className="font-medium">GPS:</span> {gpsCoordinates.filter(g => g.lat && g.lng).length} borne(s)</div>
            )}
            {(!formData.province && !formData.areaSqm) && <div className="text-muted-foreground italic">Aucune localisation renseignée</div>}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📜</span> Historique</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('history')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-1 text-xs">
            {previousOwners.some(o => o.name) ? (
              previousOwners.filter(o => o.name).map((owner, idx) => (
                <div key={idx} className="border-l-2 border-primary/30 pl-2">
                  <div className="font-medium">Ancien #{idx + 1}: {owner.name}</div>
                  <div className="text-muted-foreground">
                    {owner.mutationType && `${owner.mutationType}`}
                    {owner.startDate && ` • ${new Date(owner.startDate).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
              ))
            ) : <div className="text-muted-foreground italic">Aucun historique</div>}
          </div>
        </CardContent>
      </Card>

      {/* Obligations */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>💼</span> Obligations</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('obligations')} className="text-xs h-6 px-2">Modifier</Button>
          </div>
          <div className="space-y-2 text-xs">
            <TaxSummary taxRecords={taxRecords} formData={formData} />
            <div className="pt-1 border-t border-border/50">
              <div className="font-medium">Hypothèque:</div>
              {hasMortgage === null ? (
                <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
              ) : hasMortgage === false ? (
                <div className="ml-2 text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aucune hypothèque - Parcelle libre</div>
              ) : mortgageRecords.some(m => m.mortgageAmount) ? (
                mortgageRecords.filter(m => m.mortgageAmount).map((mortgage, idx) => (
                  <div key={idx} className="ml-2 text-muted-foreground">• {mortgage.mortgageAmount} USD - {mortgage.creditorName} ({mortgage.mortgageStatus})</div>
                ))
              ) : (
                <div className="ml-2 text-amber-600">Hypothèque déclarée - détails à compléter</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>📎</span> Documents joints</h4>
          <div className="space-y-1 text-xs">
            <div className={ownerDocFile ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
              {ownerDocFile ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
              <span>{currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association' ? "Arrêté ministériel"
                : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société' ? "Certificat RCCM"
                : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession' ? "Titre de concession"
                : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation' ? "Acte d'affectation"
                : "Pièce d'identité"}: {ownerDocFile ? "✓" : "Non"}</span>
            </div>
            <div className={titleDocFiles.length > 0 ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
              {titleDocFiles.length > 0 ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
              <span>Titre: {titleDocFiles.length > 0 ? `${titleDocFiles.length} fichier(s)` : "Non"}</span>
            </div>
            {buildingPermits.some(p => p.attachmentFile) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Permis: {buildingPermits.filter(p => p.attachmentFile).length} fichier(s)</span>
              </div>
            )}
            {taxRecords.some(t => t.receiptFile) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Reçus taxes: {taxRecords.filter(t => t.receiptFile).length} fichier(s)</span>
              </div>
            )}
            {mortgageRecords.some(m => m.receiptFile) && (
              <div className="text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Hypothèques: {mortgageRecords.filter(m => m.receiptFile).length} fichier(s)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Title expiration notification */}
      <TitleExpirationNotice formData={formData} leaseYears={leaseYears} />

      {/* Motivation message */}
      {calculateCCCValue.value < 5 && (
        <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Complétez plus de champs pour maximiser votre CCC (5$)</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit button */}
      {user ? (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
          <Button type="button" size="lg" onClick={handleSubmit} disabled={loading || uploading || !isFormValidForSubmission()} className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 rounded-xl">
            {loading || uploading ? (<><Loader2 className="h-4 w-4 animate-spin" />{uploading ? "Téléchargement..." : "Envoi..."}</>) : (<><CheckCircle2 className="h-4 w-4" />Soumettre</>)}
          </Button>
          <MissingFieldsList isFormValidForSubmission={isFormValidForSubmission} getMissingFields={getMissingFields} handleTabChange={handleTabChange} />
          <p className="text-xs text-center text-muted-foreground mt-2">En soumettant, vous acceptez la vérification des données</p>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
          <div className="text-center mb-2">
            <p className="text-xs font-medium">Formulaire complété</p>
            <p className="text-xs text-muted-foreground">Connectez-vous pour soumettre</p>
          </div>
          <Button type="button" size="lg" onClick={() => { saveFormDataToStorage(); setShowQuickAuth(true); setPendingSubmission(true); }} disabled={!isFormValidForSubmission()} className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl">
            <CheckCircle2 className="h-4 w-4" /> Soumettre
          </Button>
          <MissingFieldsList isFormValidForSubmission={isFormValidForSubmission} getMissingFields={getMissingFields} handleTabChange={handleTabChange} />
        </div>
      )}
    </div>
  );
};

/* ─── Tax Summary ─── */
const TaxSummary: React.FC<{ taxRecords: TaxRecord[]; formData: CadastralContributionData }> = ({ taxRecords, formData }) => {
  const currentYear = new Date().getFullYear();
  const requiredYears = [currentYear - 1, currentYear - 2, currentYear - 3];
  const requiredTaxTypes = ['Impôt foncier annuel', ...(formData.declaredUsage === 'Location' ? ['Impôt sur les revenus locatifs'] : [])];
  
  const taxStatusByYearType: { year: number; taxType: string; paid: boolean; amount?: string; status?: string }[] = [];
  for (const year of requiredYears) {
    for (const taxType of requiredTaxTypes) {
      const found = taxRecords.find(t => t.taxYear === year.toString() && t.taxType === taxType && t.taxAmount);
      taxStatusByYearType.push({ year, taxType, paid: !!found, amount: found?.taxAmount, status: found?.paymentStatus });
    }
  }
  
  const unpaidItems = taxStatusByYearType.filter(t => !t.paid);
  const paidItems = taxStatusByYearType.filter(t => t.paid);
  
  return (
    <div className="space-y-2">
      <div className="font-medium">Bilan fiscal (3 dernières années) :</div>
      {paidItems.length > 0 && (
        <div className="space-y-0.5">
          {paidItems.map((item, idx) => (
            <div key={idx} className="ml-2 flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
              <span>{item.year} — {item.taxType}: {item.amount} USD ({item.status})</span>
            </div>
          ))}
        </div>
      )}
      {unpaidItems.length > 0 && (
        <div className="space-y-0.5">
          {unpaidItems.map((item, idx) => (
            <div key={idx} className="ml-2 flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>{item.year} — {item.taxType}: Non renseigné</span>
            </div>
          ))}
        </div>
      )}
      {unpaidItems.length > 0 && (
        <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{unpaidItems.length} taxe(s) non renseignée(s) sur les 3 dernières années. Les taxes non renseignées sont considérées comme non payées.</span>
          </p>
        </div>
      )}
      {unpaidItems.length === 0 && (
        <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-[11px] text-green-800 dark:text-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            <span>Conformité fiscale complète sur les 3 dernières années.</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Title Expiration Notice ─── */
const TitleExpirationNotice: React.FC<{ formData: CadastralContributionData; leaseYears: number }> = ({ formData, leaseYears }) => {
  const selectedTitle = PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType);
  if (!selectedTitle?.isRenewable || !formData.titleIssueDate || !leaseYears || leaseYears <= 0) return null;
  
  const issueDate = new Date(formData.titleIssueDate);
  const expirationDate = new Date(issueDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + leaseYears);
  const now = new Date();
  const remainingMs = expirationDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const remainingMonths = Math.round(remainingDays / 30.44);
  const isExpired = remainingDays <= 0;
  const isExpiringSoon = !isExpired && remainingMonths <= 3;
  const isInitial = formData.leaseType === 'initial' || !formData.leaseType;
  
  if (!isExpired && !isExpiringSoon) return null;

  const expirationDateStr = expirationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const guidanceText = "Pour soumettre une demande de titre foncier, rendez-vous dans le Cadastre numérique, puis cliquez sur le bouton « Demander un titre foncier » dans la barre de recherche cadastrale.";

  let message = '';
  if (isExpired && isInitial) {
    message = `D'après la date de délivrance et le délai accordé, votre titre foncier « ${formData.propertyTitleType} » a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement du titre foncier existant ou un titre définitif dans un bref délai, sous réserve que les conditions établies par le titre expiré aient été respectées. ${guidanceText}`;
  } else if (isExpired && formData.leaseType === 'renewal') {
    message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » est dépassé : ce titre a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai, sous réserve que toutes les conditions établies dans le titre expiré aient été respectées. ${guidanceText}`;
  } else if (isExpiringSoon && isInitial) {
    message = `Le délai légal de votre titre foncier « ${formData.propertyTitleType} » arrive bientôt à expiration (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement ou un titre définitif avant l'expiration, sous réserve que les conditions établies par le titre aient été respectées, afin d'éviter des complications administratives ou des frais complémentaires. ${guidanceText}`;
  } else if (isExpiringSoon && formData.leaseType === 'renewal') {
    message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » tend à expirer (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai avant l'expiration, sous réserve que toutes les conditions établies par ce titre actuel aient été respectées. ${guidanceText}`;
  }

  if (!message) return null;

  return (
    <Card className={`rounded-2xl shadow-sm ${isExpired ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isExpired ? 'text-amber-600' : 'text-blue-600'}`} />
          <p className={`text-xs leading-relaxed ${isExpired ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'}`}>{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Missing Fields List ─── */
const MissingFieldsList: React.FC<{
  isFormValidForSubmission: () => boolean;
  getMissingFields: () => Array<{ label: string; tab: string }>;
  handleTabChange: (tab: string) => void;
}> = ({ isFormValidForSubmission, getMissingFields, handleTabChange }) => {
  if (isFormValidForSubmission()) return null;
  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">Champs requis manquants :</p>
      <div className="flex flex-wrap gap-1.5">
        {getMissingFields().map((field, idx) => (
          <Button key={idx} type="button" variant="outline" size="sm" onClick={() => handleTabChange(field.tab)} className="h-6 px-2 text-xs font-normal text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg gap-1">
            {field.label} <ChevronRight className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReviewTab;
