import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Building, CheckCircle2, DollarSign, ArrowLeft, Receipt, Home,
  Layers, Building2, Zap, Trees, FileText, Camera, AlertTriangle, Info
} from 'lucide-react';
import {
  CONSTRUCTION_TYPE_LABELS, QUALITY_LABELS, CONDITION_LABELS,
  ROAD_LABELS, WALL_LABELS, ROOF_LABELS, SOUND_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS
} from '@/constants/expertiseLabels';
import type { ExpertiseFormState, ParcelData } from './types';
import { getValidationErrors, getCompletionPercentage, getSelectedEquipments, getSelectedFinishes, getSelectedRisks } from './types';

interface ExpertiseSummaryStepProps {
  state: ExpertiseFormState;
  parcelNumber: string;
  parcelData?: ParcelData;
  constructionImages: File[];
  parcelDocuments: File[];
  additionalNotes: string;
  getTotalAmount: () => number;
  loadingFees: boolean;
  isPaymentValid: () => boolean;
  onBack: () => void;
  onProceedToPayment: () => void;
  onEditTab: (tab: string) => void;
}

const ExpertiseSummaryStep: React.FC<ExpertiseSummaryStepProps> = ({
  state, parcelNumber, parcelData, constructionImages, parcelDocuments,
  additionalNotes, getTotalAmount, loadingFees, isPaymentValid,
  onBack, onProceedToPayment, onEditTab
}) => {
  const isTerrainNu = state.constructionType === 'terrain_nu';
  const isApartmentOrBuilding = ['appartement', 'immeuble', 'duplex', 'studio'].includes(state.constructionType);
  const missingFields = getValidationErrors(state);
  // Add photo recommendation for non-terrain
  if (constructionImages.length === 0 && !isTerrainNu) {
    missingFields.push({ label: 'Photos de la construction', tab: 'documents', required: false });
  }
  const requiredMissing = missingFields.filter(f => f.required);
  const recommendedMissing = missingFields.filter(f => !f.required);
  const completionPercentage = getCompletionPercentage(state);
  const selectedEquipments = getSelectedEquipments(state);
  const selectedFinishes = getSelectedFinishes(state);
  const selectedRisks = getSelectedRisks(state);

  const SummaryRow = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={`flex justify-between text-xs py-1.5 ${className || ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );

  const SectionHeader = ({ icon, title, badge, tab }: { icon: React.ReactNode; title: string; badge?: React.ReactNode; tab: string }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-xs font-semibold">{title}</h4>
        {badge}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onEditTab(tab)} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">Modifier</Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="space-y-2 pb-2">
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl p-2.5 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight">Récapitulatif</h3>
              <p className="text-[10px] text-muted-foreground truncate">Vérifiez avant de continuer</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-base font-bold text-primary">{completionPercentage}%</div>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-1 mt-1.5">
            <div className={`h-1 rounded-full transition-all duration-500 ${completionPercentage >= 80 ? 'bg-green-500' : completionPercentage >= 50 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>

        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-lg py-2 px-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-300">
            Vérifiez les informations. Une fois soumise, la demande ne pourra plus être modifiée.
          </AlertDescription>
        </Alert>

        {requiredMissing.length > 0 && (
          <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-xs text-red-700 dark:text-red-300">
              <p className="font-medium mb-1.5">Données obligatoires manquantes ({requiredMissing.length}) :</p>
              <ul className="space-y-1">
                {requiredMissing.map((field, i) => (
                  <li key={i} className="flex items-center justify-between py-1 border-b border-red-200/50 last:border-0">
                    <span>• {field.label}</span>
                    <Button variant="outline" size="sm" onClick={() => onEditTab(field.tab)} className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-100">Compléter</Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {recommendedMissing.length > 0 && requiredMissing.length === 0 && (
          <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 rounded-xl">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
              <p className="font-medium mb-1.5">Recommandé ({recommendedMissing.length}) :</p>
              <ul className="space-y-1">
                {recommendedMissing.slice(0, 3).map((field, i) => (
                  <li key={i} className="flex items-center justify-between py-1 border-b border-orange-200/50 last:border-0">
                    <span>• {field.label}</span>
                    <Button variant="outline" size="sm" onClick={() => onEditTab(field.tab)} className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-100">Ajouter</Button>
                  </li>
                ))}
                {recommendedMissing.length > 3 && <li className="text-xs text-muted-foreground pt-1">Et {recommendedMissing.length - 3} autre(s)...</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2 pb-4">
        {/* Parcel */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-semibold">Parcelle</h4></div>
            <div className="divide-y divide-border/30">
              <SummaryRow label="Numéro de parcelle" value={<span className="font-mono font-bold text-primary">{parcelNumber}</span>} />
              {parcelData?.province && <SummaryRow label="Province" value={parcelData.province} />}
              {parcelData?.ville && <SummaryRow label="Ville" value={parcelData.ville} />}
              {parcelData?.commune && <SummaryRow label="Commune" value={parcelData.commune} />}
              {parcelData?.quartier && <SummaryRow label="Quartier" value={parcelData.quartier} />}
              {parcelData?.area_sqm && <SummaryRow label="Superficie parcelle" value={`${parcelData.area_sqm.toLocaleString()} m²`} />}
              {parcelData?.current_owner_name && <SummaryRow label="Propriétaire" value={parcelData.current_owner_name} />}
            </div>
          </CardContent>
        </Card>

        {/* Type de bien */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <SectionHeader icon={<Home className="h-4 w-4 text-green-600" />} title="Type de bien" tab="general" />
            <div className="divide-y divide-border/30">
              <SummaryRow label="Type de construction" value={CONSTRUCTION_TYPE_LABELS[state.constructionType] || state.constructionType} />
              {state.propertyDescription && <SummaryRow label="Description" value={<span className="text-right max-w-[60%] truncate">{state.propertyDescription}</span>} />}
            </div>
          </CardContent>
        </Card>

        {/* Construction details */}
        {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <SectionHeader icon={<Building className="h-4 w-4 text-green-600" />} title="Construction" badge={<Badge variant="outline" className="text-[10px] h-5">{[state.constructionYear, state.totalBuiltAreaSqm, state.numberOfFloors, state.propertyCondition, state.constructionQuality].filter(Boolean).length}/5</Badge>} tab="general" />
              <div className="divide-y divide-border/30">
                <SummaryRow label="Année de construction" value={state.constructionYear} />
                <SummaryRow label="Surface construite" value={state.totalBuiltAreaSqm ? `${state.totalBuiltAreaSqm} m²` : null} />
                <SummaryRow label="Nombre d'étages" value={state.numberOfFloors} />
                <SummaryRow label="Standing" value={QUALITY_LABELS[state.constructionQuality] || state.constructionQuality} />
                <SummaryRow label="État général" value={CONDITION_LABELS[state.propertyCondition] || state.propertyCondition} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Composition */}
        {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <SectionHeader icon={<Building2 className="h-4 w-4 text-purple-600" />} title="Composition" tab="general" />
              <div className="divide-y divide-border/30">
                <SummaryRow label="Nombre de pièces" value={state.numberOfRooms} />
                <SummaryRow label="Chambres" value={state.numberOfBedrooms} />
                <SummaryRow label="Salles de bain" value={state.numberOfBathrooms} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials */}
        {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <SectionHeader icon={<Layers className="h-4 w-4 text-amber-600" />} title="Matériaux de construction" tab="materiaux" />
              <div className="divide-y divide-border/30">
                <SummaryRow label="Murs / Élévation" value={WALL_LABELS[state.wallMaterial] || state.wallMaterial} />
                <SummaryRow label="Toiture" value={ROOF_LABELS[state.roofMaterial] || state.roofMaterial} />
                <SummaryRow label="Revêtement de sol" value={FLOOR_LABELS[state.floorMaterial] || state.floorMaterial} />
                <SummaryRow label="Type de fenêtres" value={WINDOW_LABELS[state.windowType] || state.windowType} />
              </div>
              {selectedFinishes.length > 0 && (
                <div className="pt-1.5">
                  <span className="text-xs text-muted-foreground">Finitions :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFinishes.map((f, i) => <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Position */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <SectionHeader icon={<MapPin className="h-4 w-4 text-cyan-600" />} title="Emplacement & Position" tab="general" />
            <div className="divide-y divide-border/30">
              <SummaryRow label="Position du bâtiment" value={<span className="text-right max-w-[55%]">{BUILDING_POSITION_LABELS[state.buildingPosition] || state.buildingPosition}</span>} />
              {state.facadeOrientation && <SummaryRow label="Orientation façade" value={FACADE_ORIENTATION_LABELS[state.facadeOrientation] || state.facadeOrientation} />}
              {state.distanceFromRoad && <SummaryRow label="Distance route" value={`${state.distanceFromRoad} m`} />}
              <SummaryRow label="Parcelle en coin" value={<Badge variant={state.isCornerPlot ? "default" : "secondary"} className="text-[10px]">{state.isCornerPlot ? 'Oui' : 'Non'}</Badge>} />
              <SummaryRow label="Accès direct rue" value={<Badge variant={state.hasDirectStreetAccess ? "default" : "secondary"} className="text-[10px]">{state.hasDirectStreetAccess ? 'Oui' : 'Non'}</Badge>} />
            </div>
          </CardContent>
        </Card>

        {/* Apartment */}
        {isApartmentOrBuilding && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <SectionHeader icon={<Building className="h-4 w-4 text-indigo-600" />} title="Détails Appartement / Immeuble" tab="general" />
              <div className="divide-y divide-border/30">
                {state.apartmentNumber && <SummaryRow label="N° Appartement" value={state.apartmentNumber} />}
                <SummaryRow label="Étage" value={state.floorNumber} />
                <SummaryRow label="Total étages immeuble" value={state.totalBuildingFloors} />
                <SummaryRow label="Accessibilité" value={ACCESSIBILITY_LABELS[state.accessibility] || state.accessibility} />
                <SummaryRow label="Parties communes" value={<Badge variant={state.hasCommonAreas ? "default" : "secondary"} className="text-[10px]">{state.hasCommonAreas ? 'Oui' : 'Non'}</Badge>} />
                {state.monthlyCharges && <SummaryRow label="Charges mensuelles" value={<span className="text-primary">{state.monthlyCharges} USD</span>} />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <SectionHeader icon={<Zap className="h-4 w-4 text-yellow-600" />} title="Équipements" badge={<Badge variant="outline" className="text-[10px] h-5">{selectedEquipments.length} sélectionné(s)</Badge>} tab="general" />
            {selectedEquipments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedEquipments.map((e, i) => <Badge key={i} variant="secondary" className="text-[10px]">{e}</Badge>)}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun équipement renseigné</p>
            )}
          </CardContent>
        </Card>

        {/* Environment */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <SectionHeader icon={<Trees className="h-4 w-4 text-green-600" />} title="Environnement & Accessibilité" tab="environnement" />
            <div className="divide-y divide-border/30">
              <SummaryRow label="Type de route" value={ROAD_LABELS[state.roadAccessType] || state.roadAccessType} />
              <SummaryRow label="Environnement sonore" value={
                <div className="flex items-center gap-1">
                  <span>{SOUND_LABELS[state.soundEnvironment] || state.soundEnvironment}</span>
                  {state.measuredDecibels !== null && <Badge variant="outline" className="text-[9px] ml-1">{state.measuredDecibels} dB</Badge>}
                </div>
              } />
              {state.nearbyNoiseSources.length > 0 && state.soundEnvironment !== 'tres_calme' && (
                <div className="py-1.5">
                  <span className="text-muted-foreground text-xs">Sources de bruit</span>
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {state.nearbyNoiseSources.map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
              )}
              {state.distanceToMainRoad && <SummaryRow label="Distance route principale" value={`${state.distanceToMainRoad} m`} />}
              {state.distanceToHospital && <SummaryRow label="Distance hôpital" value={`${state.distanceToHospital} km`} />}
              {state.distanceToSchool && <SummaryRow label="Distance école" value={`${state.distanceToSchool} km`} />}
              {state.distanceToMarket && <SummaryRow label="Distance marché" value={`${state.distanceToMarket} km`} />}
              {state.nearbyAmenities.length > 0 && (
                <div className="py-1.5">
                  <span className="text-muted-foreground text-xs">Commodités</span>
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {state.nearbyAmenities.map((a, i) => <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risks */}
        {selectedRisks.length > 0 && (
          <Card className="rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Zones à risque</h4></div>
              <div className="flex flex-wrap gap-1.5">
                {selectedRisks.map((r, i) => <Badge key={i} variant="outline" className="text-[10px] text-amber-700 border-amber-300">{r}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <SectionHeader icon={<FileText className="h-4 w-4 text-blue-600" />} title="Documents" tab="documents" />
            <div className="divide-y divide-border/30">
              <SummaryRow label="Documents parcelle" value={parcelDocuments.length > 0 ? (
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300"><FileText className="h-3 w-3 mr-1" />{parcelDocuments.length} fichier(s)</Badge>
              ) : 'Aucun'} />
              <SummaryRow label="Photos construction" value={constructionImages.length > 0 ? (
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300"><Camera className="h-3 w-3 mr-1" />{constructionImages.length} photo(s)</Badge>
              ) : <span className="text-orange-600 text-xs">⚠️ Recommandé</span>} />
            </div>
            {additionalNotes && (
              <div className="pt-1.5 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Notes additionnelles :</span>
                <p className="text-xs mt-1 bg-muted/30 p-2 rounded-lg">{additionalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="pt-2 space-y-2 border-t border-border/50 mt-1">
        <div className="flex items-center justify-between px-2 py-1.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Frais d'expertise</span>
          </div>
          <span className="text-base font-bold text-primary">{getTotalAmount()} USD</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1 h-10 rounded-xl text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />Modifier
          </Button>
          <Button onClick={onProceedToPayment} disabled={requiredMissing.length > 0 || loadingFees || !isPaymentValid()} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md text-sm">
            <DollarSign className="h-4 w-4 mr-1" />Payer
          </Button>
        </div>
        {requiredMissing.length === 0 && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 pb-0.5">
            <CheckCircle2 className="h-3.5 w-3.5" /><span className="font-medium">Prêt pour le paiement</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertiseSummaryStep;
