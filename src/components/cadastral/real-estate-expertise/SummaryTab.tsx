import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Building, Zap, Trees, AlertTriangle, FileText, Image, CheckCircle2,
  ArrowLeft, Receipt, DollarSign, Home, Layers, Building2, Camera, Info, FileCheck,
} from 'lucide-react';
import type { ExpertiseBuildingDetail } from '@/types/expertise';
import {
  CONDITION_LABELS,
  ROAD_LABELS, ROOF_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS,
} from '@/constants/expertiseLabels';

export interface SummaryTabProps {
  parcelNumber: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    area_sqm?: number;
    current_owner_name?: string;
  };

  // Navigation helpers
  setActiveTab: (tab: string) => void;
  setStep: (step: 'form' | 'summary' | 'payment' | 'confirmation') => void;
  buildAllBuildingDetails: () => ExpertiseBuildingDetail[];

  // General / construction
  isTerrainNu: boolean;
  isApartmentOrBuilding: boolean;
  propertyCategory: string;
  constructionType: string;
  constructionMaterials: string;
  constructionNature: string;
  declaredUsage: string;
  standing: string;
  constructionYear: string;
  totalBuiltAreaSqm: string;
  numberOfFloors: string;
  propertyCondition: string;
  propertyDescription: string;

  // Pièces
  numberOfRooms: string;
  numberOfBedrooms: string;
  numberOfBathrooms: string;

  // Matériaux
  roofMaterial: string;
  floorMaterial: string;
  windowType: string;
  hasPlaster: boolean;
  hasPainting: boolean;
  hasCeiling: boolean;
  hasDoubleGlazing: boolean;

  // Emplacement
  buildingPosition: string;
  facadeOrientation: string;
  distanceFromRoad: string;
  isCornerPlot: boolean;
  hasDirectStreetAccess: boolean;

  // Appartement
  apartmentNumber: string;
  floorNumber: string;
  totalBuildingFloors: string;
  accessibility: string;
  hasCommonAreas: boolean;
  monthlyCharges: string;

  // Équipements
  hasWaterSupply: boolean;
  hasElectricity: boolean;
  hasSewageSystem: boolean;
  hasInternet: boolean;
  internetProvider: string;
  hasSecuritySystem: boolean;
  hasParking: boolean;
  parkingSpaces: string;
  hasGarden: boolean;
  gardenAreaSqm: string;
  hasPool: boolean;
  hasAirConditioning: boolean;
  hasSolarPanels: boolean;
  hasWaterTank: boolean;
  hasGenerator: boolean;
  hasBorehole: boolean;
  hasElectricFence: boolean;
  hasGarage: boolean;
  hasCellar: boolean;
  hasAutomaticGate: boolean;

  // Environnement
  roadAccessType: string;
  distanceToMainRoad: string;
  distanceToHospital: string;
  distanceToSchool: string;
  distanceToMarket: string;
  nearbyAmenities: string[];
  floodRiskZone: boolean;
  erosionRiskZone: boolean;

  // Autorisation de bâtir
  hasBuildingPermit: 'yes' | 'no' | null;
  buildingPermitType: 'construction' | 'regularization';
  buildingPermitNumber: string;
  buildingPermitIssueDate: string;
  buildingPermitIssuingService: string;
  buildingPermitFile: File | null;

  // Documents
  parcelDocuments: File[];
  constructionImages: File[];
  additionalNotes: string;

  // Paiement
  loadingFees: boolean;
  getTotalAmount: () => number;
  isPaymentValid: () => boolean;
  handleProceedToPayment: () => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  parcelNumber,
  parcelData,
  setActiveTab,
  setStep,
  buildAllBuildingDetails,
  isTerrainNu,
  isApartmentOrBuilding,
  propertyCategory,
  constructionType,
  constructionMaterials,
  constructionNature,
  declaredUsage,
  standing,
  constructionYear,
  totalBuiltAreaSqm,
  numberOfFloors,
  propertyCondition,
  propertyDescription,
  numberOfRooms,
  numberOfBedrooms,
  numberOfBathrooms,
  roofMaterial,
  floorMaterial,
  windowType,
  hasPlaster,
  hasPainting,
  hasCeiling,
  hasDoubleGlazing,
  buildingPosition,
  facadeOrientation,
  distanceFromRoad,
  isCornerPlot,
  hasDirectStreetAccess,
  apartmentNumber,
  floorNumber,
  totalBuildingFloors,
  accessibility,
  hasCommonAreas,
  monthlyCharges,
  hasWaterSupply,
  hasElectricity,
  hasSewageSystem,
  hasInternet,
  internetProvider,
  hasSecuritySystem,
  hasParking,
  parkingSpaces,
  hasGarden,
  gardenAreaSqm,
  hasPool,
  hasAirConditioning,
  hasSolarPanels,
  hasWaterTank,
  hasGenerator,
  hasBorehole,
  hasElectricFence,
  hasGarage,
  hasCellar,
  hasAutomaticGate,
  roadAccessType,
  distanceToMainRoad,
  distanceToHospital,
  distanceToSchool,
  distanceToMarket,
  nearbyAmenities,
  floodRiskZone,
  erosionRiskZone,
  hasBuildingPermit,
  buildingPermitType,
  buildingPermitNumber,
  buildingPermitIssueDate,
  buildingPermitIssuingService,
  buildingPermitFile,
  parcelDocuments,
  constructionImages,
  additionalNotes,
  loadingFees,
  getTotalAmount,
  isPaymentValid,
  handleProceedToPayment,
}) => {
  // Use imported centralized labels (no local duplicates)
  const POSITION_LABELS = BUILDING_POSITION_LABELS;

  // Validation des champs obligatoires et importants
  const getMissingFields = () => {
    const missing: Array<{ label: string; tab: string; required: boolean }> = [];
    const fiches = buildAllBuildingDetails();
    const multi = fiches.length > 1;

    if (fiches.length === 0) {
      // Terrain nu / zone tracée : aucune fiche de construction à compléter
      if (!propertyCategory) missing.push({ label: 'Catégorie de bien', tab: 'general', required: true });
    } else {
      fiches.forEach((f) => {
        const p = multi ? `${f.label} — ` : '';
        const bare = f.property_category === 'Terrain nu';
        if (!f.property_category) missing.push({ label: `${p}Catégorie de bien`, tab: 'general', required: true });
        if (!f.construction_type) missing.push({ label: `${p}Type de construction`, tab: 'general', required: true });
        if (!bare) {
          if (!f.construction_year) missing.push({ label: `${p}Année de construction`, tab: 'general', required: true });
          if (!f.total_built_area_sqm) missing.push({ label: `${p}Surface construite`, tab: 'general', required: true });
          if (!f.number_of_rooms) missing.push({ label: `${p}Nombre de pièces`, tab: 'general', required: false });
        }
      });
    }

    if (!roadAccessType) missing.push({ label: 'Type d\'accès routier', tab: 'environnement', required: true });
    if (constructionImages.length === 0 && !isTerrainNu && fiches.length > 0) {
      missing.push({ label: 'Photos de la construction', tab: 'documents', required: false });
    }

    return missing;
  };

  const missingFields = getMissingFields();
  const requiredMissing = missingFields.filter(f => f.required);
  const recommendedMissing = missingFields.filter(f => !f.required);

  // Comptage dynamique de la complétion
  const computeCompletion = () => {
    const baseFields = [propertyCategory, constructionType, roadAccessType];
    const builtFields = isTerrainNu ? [] : [
      constructionYear, standing, numberOfFloors, totalBuiltAreaSqm,
      propertyCondition, numberOfRooms, numberOfBedrooms, numberOfBathrooms,
      constructionMaterials, roofMaterial, windowType, floorMaterial, buildingPosition,
    ];
    // Equipment booleans: any defined response (true or false) counts as filled
    const equipCount = 7; // water, electricity, sewage, internet, security, parking, garden
    const filledEquip = equipCount; // All are always answered (initialized with defaults)
    const docScore = (parcelDocuments.length > 0 ? 1 : 0) + (constructionImages.length > 0 && !isTerrainNu ? 1 : 0);
    const filledBase = baseFields.filter(Boolean).length;
    const filledBuilt = builtFields.filter(Boolean).length;
    const totalPossible = baseFields.length + builtFields.length + equipCount + (isTerrainNu ? 1 : 2);
    return Math.round(((filledBase + filledBuilt + filledEquip + docScore) / totalPossible) * 100);
  };
  const completionPercentage = computeCompletion();

  // Liste des équipements sélectionnés (incluant les nouveaux)
  const selectedEquipments = [
    hasWaterSupply && 'Eau courante',
    hasElectricity && 'Électricité',
    hasSewageSystem && 'Assainissement',
    hasInternet && `Internet${internetProvider ? ` (${internetProvider === 'vsat' ? 'V-Sat' : internetProvider.charAt(0).toUpperCase() + internetProvider.slice(1)})` : ''}`,
    hasSecuritySystem && 'Système de sécurité',
    hasParking && `Parking${parkingSpaces ? ` (${parkingSpaces} places)` : ''}`,
    hasGarden && `Jardin${gardenAreaSqm ? ` (${gardenAreaSqm} m²)` : ''}`,
    hasPool && 'Piscine',
    hasAirConditioning && 'Climatisation',
    hasSolarPanels && 'Panneaux solaires',
    hasWaterTank && 'Citerne d\'eau',
    hasGenerator && 'Groupe électrogène',
    hasBorehole && 'Forage',
    hasElectricFence && 'Clôture électrique',
    hasGarage && 'Garage',
    hasCellar && 'Cave',
    hasAutomaticGate && 'Portail automatique'
  ].filter(Boolean) as string[];

  // Finitions sélectionnées
  const selectedFinishes = [
    hasPlaster && 'Crépissage',
    hasPainting && 'Peinture',
    hasCeiling && 'Plafond',
    hasDoubleGlazing && 'Double vitrage'
  ].filter(Boolean) as string[];

  // Risques
  const selectedRisks = [
    floodRiskZone && 'Zone inondable',
    erosionRiskZone && 'Zone d\'érosion'
  ].filter(Boolean) as string[];

  // Use centralized labels (no local duplicate)

  return (
    <div className="space-y-2">
      {/* En-tête compact */}
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
            <div 
              className={`h-1 rounded-full transition-all duration-500 ${
                completionPercentage >= 80 ? 'bg-green-500' : completionPercentage >= 50 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Avertissement - compact on mobile */}
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-lg py-2 px-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-300">
            Vérifiez les informations. Une fois soumise, la demande ne pourra plus être modifiée.
          </AlertDescription>
        </Alert>

        {/* Erreurs de validation obligatoires */}
        {requiredMissing.length > 0 && (
          <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-xs text-red-700 dark:text-red-300">
              <p className="font-medium mb-1.5">Données obligatoires manquantes ({requiredMissing.length}) :</p>
              <ul className="space-y-1">
                {requiredMissing.map((field, index) => (
                  <li key={index} className="flex items-center justify-between py-1 border-b border-red-200/50 last:border-0">
                    <span>• {field.label}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setActiveTab(field.tab); setStep('form'); }}
                      className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-100"
                    >
                      Compléter
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommandations */}
        {recommendedMissing.length > 0 && requiredMissing.length === 0 && (
          <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 rounded-xl">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
              <p className="font-medium mb-1.5">Recommandé pour une expertise plus précise ({recommendedMissing.length}) :</p>
              <ul className="space-y-1">
                {recommendedMissing.slice(0, 3).map((field, index) => (
                  <li key={index} className="flex items-center justify-between py-1 border-b border-orange-200/50 last:border-0">
                    <span>• {field.label}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setActiveTab(field.tab); setStep('form'); }}
                      className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-100"
                    >
                      Ajouter
                    </Button>
                  </li>
                ))}
                {recommendedMissing.length > 3 && (
                  <li className="text-xs text-muted-foreground pt-1">
                    Et {recommendedMissing.length - 3} autre(s)...
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Contenu */}
        <div className="space-y-2 pb-4">
          {/* Section Parcelle */}
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-semibold">Parcelle</h4>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Numéro de parcelle</span>
                  <span className="font-mono font-bold text-primary">{parcelNumber}</span>
                </div>
                {parcelData?.province && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Province</span>
                    <span className="font-medium">{parcelData.province}</span>
                  </div>
                )}
                {parcelData?.ville && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{parcelData.ville}</span>
                  </div>
                )}
                {parcelData?.commune && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Commune</span>
                    <span className="font-medium">{parcelData.commune}</span>
                  </div>
                )}
                {parcelData?.quartier && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Quartier</span>
                    <span className="font-medium">{parcelData.quartier}</span>
                  </div>
                )}
                {parcelData?.area_sqm && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Superficie parcelle</span>
                    <span className="font-medium">{parcelData.area_sqm.toLocaleString()} m²</span>
                  </div>
                )}
                {parcelData?.current_owner_name && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Propriétaire</span>
                    <span className="font-medium">{parcelData.current_owner_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Construction - hidden for terrain_nu */}
          {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-green-600" />
                  <h4 className="text-xs font-semibold">Construction</h4>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {(() => {
                      const fiches = buildAllBuildingDetails();
                      const per = 6;
                      const filled = fiches.reduce((n, f) => n + [f.property_category, f.construction_type, f.construction_materials, f.construction_nature, f.standing, f.construction_year].filter(Boolean).length, 0);
                      return `${filled}/${Math.max(per, fiches.length * per)}`;
                    })()}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Catégorie</span>
                  <span className="font-medium">{propertyCategory || <span className="text-orange-600">Non renseigné</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Type de construction</span>
                  <span className="font-medium">{constructionType || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Matériaux</span>
                  <span className="font-medium">{constructionMaterials || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Nature</span>
                  <span className="font-medium">{constructionNature ? `Construction ${constructionNature.toLowerCase()}` : <span className="text-muted-foreground">—</span>}</span>
                </div>
                {declaredUsage && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium">{declaredUsage}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Standing</span>
                  <span className="font-medium">{standing || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Année de construction</span>
                  <span className="font-medium">{constructionYear || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Surface construite</span>
                  <span className="font-medium">{totalBuiltAreaSqm ? `${totalBuiltAreaSqm} m²` : <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Nombre d'étages</span>
                  <span className="font-medium">{numberOfFloors || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">État général</span>
                  <span className="font-medium">{CONDITION_LABELS[propertyCondition] || propertyCondition}</span>
                </div>
                {propertyDescription && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{propertyDescription}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Section Autorisation de bâtir - summary */}
          {!isTerrainNu && propertyCategory !== 'Appartement' && hasBuildingPermit !== null && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-semibold">Autorisation de bâtir</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Possède une autorisation</span>
                    <Badge variant={hasBuildingPermit === 'yes' ? "default" : "secondary"} className="text-[10px]">
                      {hasBuildingPermit === 'yes' ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                  {hasBuildingPermit === 'yes' && (
                    <>
                      <div className="flex justify-between text-xs py-1.5">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{buildingPermitType === 'construction' ? 'Bâtir' : 'Régularisation'}</span>
                      </div>
                      {buildingPermitNumber && (
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-muted-foreground">N° autorisation</span>
                          <span className="font-medium font-mono">{buildingPermitNumber}</span>
                        </div>
                      )}
                      {buildingPermitIssueDate && (
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-muted-foreground">Date de délivrance</span>
                          <span className="font-medium">{new Date(buildingPermitIssueDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {buildingPermitIssuingService && (
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-muted-foreground">Service émetteur</span>
                          <span className="font-medium text-right max-w-[55%] truncate">{buildingPermitIssuingService}</span>
                        </div>
                      )}
                      {buildingPermitFile && (
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-muted-foreground">Document</span>
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                            <FileText className="h-3 w-3 mr-1" />
                            {buildingPermitFile.name}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Pièces - hidden for terrain_nu */}
          {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <h4 className="text-xs font-semibold">Composition</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Nombre de pièces</span>
                  <span className="font-medium">{numberOfRooms || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Chambres</span>
                  <span className="font-medium">{numberOfBedrooms || <span className="text-muted-foreground">—</span>}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Salles de bain</span>
                  <span className="font-medium">{numberOfBathrooms || <span className="text-muted-foreground">—</span>}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Section Matériaux - hidden for terrain_nu */}
          {!isTerrainNu && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-semibold">Matériaux de construction</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('materiaux'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Toiture</span>
                  <span className="font-medium">{ROOF_LABELS[roofMaterial] || roofMaterial}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Revêtement de sol</span>
                  <span className="font-medium">{FLOOR_LABELS[floorMaterial] || floorMaterial}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Type de fenêtres</span>
                  <span className="font-medium">{WINDOW_LABELS[windowType] || windowType}</span>
                </div>
              </div>
              {selectedFinishes.length > 0 && (
                <div className="pt-1.5">
                  <span className="text-xs text-muted-foreground">Finitions :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFinishes.map((finish, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">{finish}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Section Emplacement */}
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  <h4 className="text-xs font-semibold">Emplacement & Position</h4>
                </div>
                 <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Position du bâtiment</span>
                  <span className="font-medium text-right max-w-[55%]">{POSITION_LABELS[buildingPosition] || buildingPosition}</span>
                </div>
                {facadeOrientation && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Orientation façade</span>
                    <span className="font-medium">{FACADE_ORIENTATION_LABELS[facadeOrientation] || facadeOrientation}</span>
                  </div>
                )}
                {distanceFromRoad && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Distance route</span>
                    <span className="font-medium">{distanceFromRoad} m</span>
                  </div>
                )}
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Parcelle en coin</span>
                  <Badge variant={isCornerPlot ? "default" : "secondary"} className="text-[10px]">
                    {isCornerPlot ? 'Oui' : 'Non'}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Accès direct rue</span>
                  <Badge variant={hasDirectStreetAccess ? "default" : "secondary"} className="text-[10px]">
                    {hasDirectStreetAccess ? 'Oui' : 'Non'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Appartement (si applicable) */}
          {isApartmentOrBuilding && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-xs font-semibold">Détails Appartement / Immeuble</h4>
                  </div>
                   <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  {apartmentNumber && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">N° Appartement</span>
                      <span className="font-medium">{apartmentNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Étage</span>
                    <span className="font-medium">{floorNumber || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Total étages immeuble</span>
                    <span className="font-medium">{totalBuildingFloors || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Accessibilité</span>
                    <span className="font-medium">{ACCESSIBILITY_LABELS[accessibility] || accessibility}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Parties communes</span>
                    <Badge variant={hasCommonAreas ? "default" : "secondary"} className="text-[10px]">
                      {hasCommonAreas ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                  {monthlyCharges && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Charges mensuelles</span>
                      <span className="font-medium text-primary">{monthlyCharges} USD</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Équipements */}
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <h4 className="text-xs font-semibold">Équipements</h4>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {selectedEquipments.length} sélectionné(s)
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              {selectedEquipments.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEquipments.map((equip, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">{equip}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun équipement renseigné</p>
              )}
            </CardContent>
          </Card>

          {/* Section Environnement */}
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trees className="h-4 w-4 text-green-600" />
                  <h4 className="text-xs font-semibold">Environnement & Accessibilité</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('environnement'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Type de route</span>
                  <span className="font-medium">{ROAD_LABELS[roadAccessType] || roadAccessType}</span>
                </div>
                {/* Sound environment removed — now in CCC */}
                {distanceToMainRoad && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Distance route principale</span>
                    <span className="font-medium">{distanceToMainRoad} m</span>
                  </div>
                )}
                {distanceToHospital && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Distance hôpital</span>
                    <span className="font-medium">{distanceToHospital} km</span>
                  </div>
                )}
                {distanceToSchool && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Distance école</span>
                    <span className="font-medium">{distanceToSchool} km</span>
                  </div>
                )}
                {distanceToMarket && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Distance marché</span>
                    <span className="font-medium">{distanceToMarket} km</span>
                  </div>
                )}
                {nearbyAmenities.length > 0 && (
                  <div className="py-1.5">
                    <span className="text-muted-foreground text-xs">Commodités</span>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      {nearbyAmenities.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Risques */}
          {selectedRisks.length > 0 && (
            <Card className="rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Zones à risque</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRisks.map((risk, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] text-amber-700 border-amber-300">{risk}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Documents */}
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-semibold">Documents</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('documents'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                  Modifier
                </Button>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Documents parcelle</span>
                  {parcelDocuments.length > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                      <FileText className="h-3 w-3 mr-1" />
                      {parcelDocuments.length} fichier(s)
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Aucun</span>
                  )}
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-muted-foreground">Photos construction</span>
                  {constructionImages.length > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                      <Camera className="h-3 w-3 mr-1" />
                      {constructionImages.length} photo(s)
                    </Badge>
                  ) : (
                    <span className="text-orange-600 text-xs">⚠️ Recommandé</span>
                  )}
                </div>
                {hasBuildingPermit === 'yes' && buildingPermitFile && (
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Document permis</span>
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                      <FileCheck className="h-3 w-3 mr-1" />
                      {buildingPermitFile.name}
                    </Badge>
                  </div>
                )}
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

      {/* Pied */}
      <div className="pt-2 space-y-2 border-t border-border/50 mt-1">
        {/* Montant total */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Frais d'expertise</span>
          </div>
          <span className="text-base font-bold text-primary">{getTotalAmount()} USD</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep('form')}
            className="flex-1 h-10 rounded-xl text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Modifier
          </Button>
          <Button
            onClick={handleProceedToPayment}
            disabled={requiredMissing.length > 0 || loadingFees || !isPaymentValid()}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md text-sm"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Payer
          </Button>
        </div>

        {requiredMissing.length === 0 && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 pb-0.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium">Prêt pour le paiement</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTab;
