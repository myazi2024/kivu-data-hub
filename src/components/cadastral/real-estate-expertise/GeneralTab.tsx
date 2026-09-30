import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  MapPin, Building, Building2, Layers, FileText, X, FileCheck,
  Droplets, Zap, Wifi, Shield, Car, Trees, Fence, Warehouse, DoorOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import CadastralContextBlock from '../expertise/CadastralContextBlock';
import ExpertiseScopeSelector, { type ValuationTarget } from '../expertise/ExpertiseScopeSelector';
import ExpertiseTargetMap, { type ExpertiseSelectionMode, type MapBuilding } from '../expertise/ExpertiseTargetMap';
import BuildingTargetSelector, { type KnownBuilding } from '../expertise/BuildingTargetSelector';
import { BuildingPermitIssuingServiceSelect } from '../BuildingPermitIssuingServiceSelect';
import {
  PROPERTY_CATEGORY_OPTIONS, YEAR_OPTIONS, PROPERTY_CONDITION_OPTIONS,
  ACCESSIBILITY_OPTIONS, BUILDING_POSITION_OPTIONS, FACADE_ORIENTATION_OPTIONS,
} from './constants';

export interface GeneralTabProps {
  knownBuildings: KnownBuilding[];
  cadastralPrefill: any;
  expertiseScope: 'partial' | 'total';
  onScopeChange: (scope: 'partial' | 'total') => void;
  valuationTargets: ValuationTarget[];
  setValuationTargets: (v: ValuationTarget[]) => void;
  isBareLandParcel: boolean;
  selectionMode: ExpertiseSelectionMode;
  onSelectionModeChange: (mode: ExpertiseSelectionMode) => void;
  parcelVertices: { lat: number; lng: number }[];
  mapBuildings: MapBuilding[];
  selectedBuildingRefs: string[];
  drawnArea: { lat: number; lng: number }[] | null;
  setDrawnArea: (v: { lat: number; lng: number }[] | null) => void;
  toggleBuildingRef: (ref: string) => void;
  scopeSummary: string;
  selectedBuildingRef: string;
  lockedFromCadastre: Set<string>;
  cadastreDiscrepancies: string;
  setCadastreDiscrepancies: (v: string) => void;
  showBuildingBlocks: boolean;
  isMultiBuilding: boolean;
  buildingsToDescribe: { ref: string; label: string }[];
  activeFicheRef: string;
  handleSelectFiche: (ref: string) => void;
  propertyCategory: string;
  setPropertyCategory: (v: string) => void;
  availableConstructionTypes: string[];
  constructionType: string;
  setConstructionType: (v: string) => void;
  availableConstructionMaterials: string[];
  constructionMaterials: string;
  setConstructionMaterials: (v: string) => void;
  constructionNature: string;
  declaredUsage: string;
  setDeclaredUsage: (v: string) => void;
  availableDeclaredUsages: string[];
  availableStandings: string[];
  standing: string;
  setStanding: (v: string) => void;
  isTerrainNu: boolean;
  hasBuildingPermit: 'yes' | 'no' | null;
  setHasBuildingPermit: (v: 'yes' | 'no' | null) => void;
  buildingPermitType: 'construction' | 'regularization';
  setBuildingPermitType: (v: 'construction' | 'regularization') => void;
  buildingPermitNumber: string;
  setBuildingPermitNumber: (v: string) => void;
  buildingPermitIssueDate: string;
  setBuildingPermitIssueDate: (v: string) => void;
  constructionYear: string;
  buildingPermitIssuingService: string;
  setBuildingPermitIssuingService: (v: string) => void;
  buildingPermitFile: File | null;
  setBuildingPermitFile: (v: File | null) => void;
  permitFileInputRef: React.RefObject<HTMLInputElement>;
  propertyDescription: string;
  setPropertyDescription: (v: string) => void;
  setNumberOfFloors: (v: string) => void;
  numberOfFloors: string;
  totalBuiltAreaSqm: string;
  setTotalBuiltAreaSqm: (v: string) => void;
  numberOfRooms: string;
  setNumberOfRooms: (v: string) => void;
  numberOfBedrooms: string;
  setNumberOfBedrooms: (v: string) => void;
  numberOfBathrooms: string;
  setNumberOfBathrooms: (v: string) => void;
  propertyCondition: string;
  setPropertyCondition: (v: string) => void;
  isApartmentOrBuilding: boolean;
  floorNumber: string;
  setFloorNumber: (v: string) => void;
  totalBuildingFloors: string;
  setTotalBuildingFloors: (v: string) => void;
  accessibility: string;
  setAccessibility: (v: string) => void;
  apartmentNumber: string;
  setApartmentNumber: (v: string) => void;
  monthlyCharges: string;
  setMonthlyCharges: (v: string) => void;
  hasCommonAreas: boolean;
  setHasCommonAreas: (v: boolean) => void;
  buildingPosition: string;
  setBuildingPosition: (v: string) => void;
  facadeOrientation: string;
  setFacadeOrientation: (v: string) => void;
  distanceFromRoad: string;
  setDistanceFromRoad: (v: string) => void;
  handleNonNegativeChange: (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCornerPlot: boolean;
  setIsCornerPlot: (v: boolean) => void;
  hasDirectStreetAccess: boolean;
  setHasDirectStreetAccess: (v: boolean) => void;
  hasWaterSupply: boolean;
  setHasWaterSupply: (v: boolean) => void;
  hasElectricity: boolean;
  setHasElectricity: (v: boolean) => void;
  hasSewageSystem: boolean;
  setHasSewageSystem: (v: boolean) => void;
  hasInternet: boolean;
  setHasInternet: (v: boolean) => void;
  internetProvider: string;
  setInternetProvider: (v: string) => void;
  hasSecuritySystem: boolean;
  setHasSecuritySystem: (v: boolean) => void;
  hasGarden: boolean;
  setHasGarden: (v: boolean) => void;
  hasPool: boolean;
  setHasPool: (v: boolean) => void;
  hasAirConditioning: boolean;
  setHasAirConditioning: (v: boolean) => void;
  hasSolarPanels: boolean;
  setHasSolarPanels: (v: boolean) => void;
  hasGenerator: boolean;
  setHasGenerator: (v: boolean) => void;
  hasWaterTank: boolean;
  setHasWaterTank: (v: boolean) => void;
  hasBorehole: boolean;
  setHasBorehole: (v: boolean) => void;
  hasElectricFence: boolean;
  setHasElectricFence: (v: boolean) => void;
  hasGarage: boolean;
  setHasGarage: (v: boolean) => void;
  hasCellar: boolean;
  setHasCellar: (v: boolean) => void;
  hasAutomaticGate: boolean;
  setHasAutomaticGate: (v: boolean) => void;
  hasParking: boolean;
  setHasParking: (v: boolean) => void;
  parkingSpaces: string;
  setParkingSpaces: (v: string) => void;
  gardenAreaSqm: string;
  setGardenAreaSqm: (v: string) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = (props) => {
  const {
    knownBuildings, cadastralPrefill, expertiseScope, onScopeChange: handleScopeChange,
    valuationTargets, setValuationTargets, isBareLandParcel, selectionMode,
    onSelectionModeChange: handleSelectionModeChange, parcelVertices, mapBuildings,
    selectedBuildingRefs, drawnArea, setDrawnArea, toggleBuildingRef, scopeSummary,
    selectedBuildingRef, lockedFromCadastre, cadastreDiscrepancies, setCadastreDiscrepancies,
    showBuildingBlocks, isMultiBuilding, buildingsToDescribe, activeFicheRef, handleSelectFiche,
    propertyCategory, setPropertyCategory, availableConstructionTypes, constructionType,
    setConstructionType, availableConstructionMaterials, constructionMaterials,
    setConstructionMaterials, constructionNature, declaredUsage, setDeclaredUsage,
    availableDeclaredUsages, availableStandings, standing, setStanding, isTerrainNu,
    hasBuildingPermit, setHasBuildingPermit, buildingPermitType, setBuildingPermitType,
    buildingPermitNumber, setBuildingPermitNumber, buildingPermitIssueDate,
    setBuildingPermitIssueDate, constructionYear, buildingPermitIssuingService,
    setBuildingPermitIssuingService, buildingPermitFile, setBuildingPermitFile,
    permitFileInputRef, propertyDescription, setPropertyDescription, setNumberOfFloors,
    numberOfFloors, totalBuiltAreaSqm, setTotalBuiltAreaSqm, numberOfRooms, setNumberOfRooms,
    numberOfBedrooms, setNumberOfBedrooms, numberOfBathrooms, setNumberOfBathrooms,
    propertyCondition, setPropertyCondition, isApartmentOrBuilding, floorNumber, setFloorNumber,
    totalBuildingFloors, setTotalBuildingFloors, accessibility, setAccessibility,
    apartmentNumber, setApartmentNumber, monthlyCharges, setMonthlyCharges, hasCommonAreas,
    setHasCommonAreas, buildingPosition, setBuildingPosition, facadeOrientation,
    setFacadeOrientation, distanceFromRoad, setDistanceFromRoad, handleNonNegativeChange,
    isCornerPlot, setIsCornerPlot, hasDirectStreetAccess, setHasDirectStreetAccess,
    hasWaterSupply, setHasWaterSupply, hasElectricity, setHasElectricity, hasSewageSystem,
    setHasSewageSystem, hasInternet, setHasInternet, internetProvider, setInternetProvider,
    hasSecuritySystem, setHasSecuritySystem, hasGarden, setHasGarden, hasPool, setHasPool,
    hasAirConditioning, setHasAirConditioning, hasSolarPanels, setHasSolarPanels, hasGenerator,
    setHasGenerator, hasWaterTank, setHasWaterTank, hasBorehole, setHasBorehole,
    hasElectricFence, setHasElectricFence, hasGarage, setHasGarage, hasCellar, setHasCellar,
    hasAutomaticGate, setHasAutomaticGate, hasParking, setHasParking, parkingSpaces,
    setParkingSpaces, gardenAreaSqm, setGardenAreaSqm,
  } = props;

  return (
          <TabsContent value="general" className="space-y-3 pr-2 mt-0">
            {/* Notification importance des données exactes */}
            {/* Pre-fill indicator */}
            {knownBuildings.length > 0 && (
              <Alert className="border-primary/30 bg-primary/5 rounded-xl">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Certaines informations ont été pré-remplies depuis les données cadastrales de cette parcelle. Vous pouvez les modifier si nécessaire.
                </AlertDescription>
              </Alert>
            )}
            <CadastralContextBlock prefill={cadastralPrefill} />
            {/* Notification importance des données exactes */}
            <Alert className="border-amber-500/30 bg-amber-500/10 rounded-xl">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important :</strong> Les informations que vous fournissez serviront de base à l'expert pour définir les facteurs clés de l'évaluation et organiser la visite terrain de votre construction. Veillez à leur exactitude.
              </AlertDescription>
            </Alert>

            {/* Type d'expertise + valeurs à déterminer */}
            <ExpertiseScopeSelector
              scope={expertiseScope}
              onScopeChange={handleScopeChange}
              valuations={valuationTargets}
              onValuationsChange={setValuationTargets}
            />

            {/* Périmètre expertisé : carte + liste */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Périmètre concerné par l'expertise
                </h4>

                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'whole' as const, label: 'Toute la parcelle' },
                    { value: 'buildings' as const, label: 'Construction(s)' },
                    { value: 'area' as const, label: 'Zone tracée' },
                  ]).map((o) => {
                    const noBuildings = o.value === 'buildings' && isBareLandParcel;
                    const locked = (expertiseScope === 'total' && o.value !== 'whole') || noBuildings;
                    const lockReason = noBuildings
                      ? "Cette parcelle est enregistrée sans construction : il n'y a rien à cibler."
                      : 'Disponible uniquement pour une expertise partielle';
                    return (
                      <button
                        key={o.value}
                        type="button"
                        disabled={locked}
                        aria-disabled={locked}
                        title={locked ? lockReason : undefined}
                        onClick={() => handleSelectionModeChange(o.value)}
                        className={cn(
                          'px-2 py-1.5 rounded-xl border-2 text-[11px] font-medium transition-colors',
                          selectionMode === o.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50',
                          locked && 'opacity-40 cursor-not-allowed hover:border-border',
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                {expertiseScope === 'total' && (
                  <p className="text-[11px] text-muted-foreground">
                    Expertise totale : toute la parcelle est concernée. Choisissez « Expertise partielle » pour cibler une construction ou une zone.
                  </p>
                )}

                <ExpertiseTargetMap
                  parcelVertices={parcelVertices}
                  buildings={mapBuildings}
                  mode={selectionMode}
                  selectedRefs={selectedBuildingRefs}
                  drawnArea={drawnArea}
                  onToggleBuilding={toggleBuildingRef}
                  onDrawnAreaChange={setDrawnArea}
                />

                <p className="text-xs text-muted-foreground">{scopeSummary}</p>

                {selectionMode === 'buildings' && knownBuildings.length > 0 && (
                  <BuildingTargetSelector
                    buildings={knownBuildings}
                    selectedRefs={selectedBuildingRefs}
                    onToggle={toggleBuildingRef}
                  />
                )}

                {isBareLandParcel && (
                  <p className="text-[11px] text-muted-foreground">
                    Cette parcelle est enregistrée comme terrain sans construction : l'expertise porte sur le terrain (toute la parcelle ou une zone que vous tracez).
                  </p>
                )}

                {!isBareLandParcel && selectionMode === 'buildings' && knownBuildings.length === 0 && mapBuildings.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Aucune construction n'est encore enregistrée pour cette parcelle. Choisissez « Zone tracée » pour délimiter vous-même la partie à expertiser.
                  </p>
                )}


                {selectedBuildingRef !== 'new' && lockedFromCadastre.size > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cadastre-discrepancies" className="text-xs text-muted-foreground">
                      Avez-vous constaté un écart avec les données cadastrales ? (optionnel)
                    </Label>
                    <Textarea
                      id="cadastre-discrepancies"
                      value={cadastreDiscrepancies}
                      onChange={(e) => setCadastreDiscrepancies(e.target.value)}
                      placeholder="Ex : surface réelle différente, matériau modifié après rénovation…"
                      className="min-h-[50px] text-sm rounded-xl border-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Fiches par construction : chaque construction se décrit séparément */}
            {showBuildingBlocks && (
            <>
            {isMultiBuilding && (
              <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Fiche par construction
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Cette parcelle porte {buildingsToDescribe.length} constructions. Décrivez-les une par une : chaque fiche est enregistrée séparément.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {buildingsToDescribe.map((b, i) => (
                      <button
                        key={b.ref}
                        type="button"
                        onClick={() => handleSelectFiche(b.ref)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-medium transition-colors',
                          activeFicheRef === b.ref
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50',
                        )}
                      >
                        {i + 1}. {b.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Construction Block (CCC-aligned) */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  Construction
                  <SectionHelpPopover
                    title="Construction"
                    description="Sélectionnez la catégorie, le type, les matériaux et le standing de votre bien. Ces champs suivent la nomenclature cadastrale officielle."
                  />
                </h4>

                {/* Catégorie de bien */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Catégorie de bien</Label>
                  <Select value={propertyCategory} onValueChange={setPropertyCategory}>
                    <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                      <SelectValue placeholder="Sélectionner la catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type de construction & Matériaux */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type de construction</Label>
                    {availableConstructionTypes.length <= 1 ? (
                      <div className="h-10 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
                        {constructionType || (propertyCategory ? '—' : "Catégorie d'abord")}
                      </div>
                    ) : (
                      <Select value={constructionType} onValueChange={setConstructionType} disabled={!propertyCategory}>
                        <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                          <SelectValue placeholder={!propertyCategory ? "Catégorie d'abord" : "Sélectionner"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableConstructionTypes.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {availableConstructionMaterials.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Matériaux</Label>
                      <Select value={constructionMaterials} onValueChange={setConstructionMaterials} disabled={availableConstructionMaterials.length === 0}>
                        <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                          <SelectValue placeholder={!constructionType ? "Type d'abord" : "Sélectionner"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableConstructionMaterials.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : <div />}
                </div>

                {/* Nature (auto) & Usage */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nature</Label>
                    <div className="h-10 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
                      {constructionNature ? `Construction ${constructionNature.toLowerCase()}` : (constructionMaterials ? '—' : "Matériaux d'abord")}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Usage</Label>
                    <Select value={declaredUsage} onValueChange={setDeclaredUsage} disabled={!constructionType || !constructionNature}>
                      <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                        <SelectValue placeholder={!constructionType || !constructionNature ? "Type et nature d'abord" : "Sélectionner"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDeclaredUsages.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Standing */}
                {constructionNature && constructionNature !== 'Non bâti' && availableStandings.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Standing</Label>
                    <Select value={standing} onValueChange={setStanding}>
                      <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                        <SelectValue placeholder="Sélectionner le standing" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStandings.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Autorisation de bâtir - masqué pour Terrain nu et Appartement */}
                {!isTerrainNu && propertyCategory !== 'Appartement' && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Label className="text-xs font-semibold leading-tight">
                        Avez-vous une autorisation de bâtir pour ce bien ?
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setHasBuildingPermit('yes')} className={cn("flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all", hasBuildingPermit === 'yes' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Oui</button>
                      <button type="button" onClick={() => setHasBuildingPermit('no')} className={cn("flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all", hasBuildingPermit === 'no' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Non</button>
                    </div>

                    {hasBuildingPermit === 'yes' && (
                      <div className="space-y-3 animate-fade-in border-2 rounded-2xl p-3 border-border">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                          <FileCheck className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">Informations de l'autorisation</span>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => setBuildingPermitType('construction')} className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all", buildingPermitType === 'construction' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Bâtir</button>
                          <button type="button" onClick={() => setBuildingPermitType('regularization')} className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all", buildingPermitType === 'regularization' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Régularisation</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">N° de l'autorisation</Label>
                            <Input placeholder="PC-2024-001" value={buildingPermitNumber} onChange={(e) => setBuildingPermitNumber(e.target.value)} className="h-9 text-sm rounded-xl border-2" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Date</Label>
                              <SectionHelpPopover
                                title="Date de délivrance"
                                description={buildingPermitType === 'construction'
                                  ? "L'autorisation de bâtir est valable 3 ans en RDC. Sa date doit être dans les 3 ans précédant l'année de construction."
                                  : "L'autorisation de régularisation est délivrée après la construction. Sa date doit être postérieure ou égale à l'année de construction."}
                              />
                            </div>
                            <Input
                              type="date"
                              value={buildingPermitIssueDate}
                              max={buildingPermitType === 'regularization' ? new Date().toISOString().split('T')[0] : (constructionYear ? `${constructionYear}-12-31` : undefined)}
                              min={buildingPermitType === 'construction' && constructionYear ? `${parseInt(constructionYear) - 3}-01-01` : (buildingPermitType === 'regularization' && constructionYear ? `${constructionYear}-01-01` : undefined)}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (constructionYear && value) {
                                  const permitYear = new Date(value).getFullYear();
                                  const cYear = parseInt(constructionYear);
                                  if (buildingPermitType === 'construction') {
                                    if (permitYear > cYear) { toast.error(`L'autorisation de bâtir doit être antérieure ou égale à l'année de construction (${cYear}).`); return; }
                                    if (permitYear < cYear - 3) { toast.error(`L'autorisation est valable 3 ans. La date ne peut pas être antérieure à ${cYear - 3}.`); return; }
                                  } else {
                                    if (permitYear < cYear) { toast.error(`L'autorisation de régularisation doit être postérieure ou égale à l'année de construction (${cYear}).`); return; }
                                    if (new Date(value) > new Date()) { toast.error("La date ne peut pas être dans le futur."); return; }
                                  }
                                }
                                setBuildingPermitIssueDate(value);
                              }}
                              className={cn("h-9 text-sm rounded-xl border-2", (() => {
                                if (!buildingPermitIssueDate || !constructionYear) return false;
                                const py = new Date(buildingPermitIssueDate).getFullYear();
                                const cYear = parseInt(constructionYear);
                                if (buildingPermitType === 'construction') return py > cYear || py < cYear - 3;
                                return py < cYear || new Date(buildingPermitIssueDate) > new Date();
                              })() && "border-destructive")}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Service émetteur</Label>
                          <BuildingPermitIssuingServiceSelect
                            value={buildingPermitIssuingService}
                            onValueChange={setBuildingPermitIssuingService}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Document (optionnel)</Label>
                          {!buildingPermitFile ? (
                            <Input
                              ref={permitFileInputRef}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 10 MB)"); return; }
                                  setBuildingPermitFile(file);
                                }
                              }}
                              className="h-9 text-sm rounded-xl border-2"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-xs flex-1 truncate">{buildingPermitFile.name}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => { setBuildingPermitFile(null); if (permitFileInputRef.current) permitFileInputRef.current.value = ''; }} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {hasBuildingPermit === 'no' && (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-2.5 animate-fade-in">
                        <p className="text-xs text-green-800 dark:text-green-200 text-center">
                          ✓ Pas de souci ! Cette information sera prise en compte dans l'expertise.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Description du bien</Label>
                  <Textarea
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    placeholder="Décrivez brièvement le bien..."
                    className="min-h-[60px] text-sm rounded-xl border-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Infos construction - hidden for terrain nu */}
            {!isTerrainNu && <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Caractéristiques
                  <SectionHelpPopover
                    title="Caractéristiques"
                    description="Renseignez les données techniques de votre bien : année de construction, surface, nombre de pièces et état général. Ces informations sont essentielles pour estimer la valeur vénale."
                  />
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Année construction</Label>
                    <Select value={constructionYear} onValueChange={setConstructionYear}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {YEAR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre d'étages</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfFloors}
                      onChange={handleNonNegativeChange(setNumberOfFloors)}
                      placeholder="1"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Surface bâtie (m²)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={totalBuiltAreaSqm}
                    onChange={handleNonNegativeChange(setTotalBuiltAreaSqm)}
                    placeholder="Ex: 150"
                    className="h-9 text-sm rounded-xl border-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pièces</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfRooms}
                      onChange={handleNonNegativeChange(setNumberOfRooms)}
                      placeholder="5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chambres</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfBedrooms}
                      onChange={handleNonNegativeChange(setNumberOfBedrooms)}
                      placeholder="3"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SDB</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfBathrooms}
                      onChange={handleNonNegativeChange(setNumberOfBathrooms)}
                      placeholder="2"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">État du bien</Label>
                  <Select value={propertyCondition} onValueChange={setPropertyCondition}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_CONDITION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>}

            {/* Appartement / Immeuble - conditionnel */}
            {isApartmentOrBuilding && (
              <Card className="border rounded-xl border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
                <CardContent className="p-3 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Détails appartement/immeuble
                    <SectionHelpPopover
                      title="Détails appartement/immeuble"
                      description="Précisez l'étage, l'accessibilité et les charges mensuelles. Ces informations spécifiques aux copropriétés influencent directement la valeur estimée du bien."
                    />
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">N° d'étage</Label>
                      <Input
                        type="number"
                        value={floorNumber}
                        onChange={(e) => setFloorNumber(e.target.value)}
                        placeholder="Ex: 2"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Étages total</Label>
                      <Input
                        type="number"
                        value={totalBuildingFloors}
                        onChange={(e) => setTotalBuildingFloors(e.target.value)}
                        placeholder="Ex: 5"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Accessibilité</Label>
                    <Select value={accessibility} onValueChange={setAccessibility}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESSIBILITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">N° appartement</Label>
                      <Input
                        value={apartmentNumber}
                        onChange={(e) => setApartmentNumber(e.target.value)}
                        placeholder="Ex: A12"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Charges/mois ($)</Label>
                      <Input
                        type="number"
                        value={monthlyCharges}
                        onChange={(e) => setMonthlyCharges(e.target.value)}
                        placeholder="50"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasCommonAreas} onCheckedChange={(c) => setHasCommonAreas(c === true)} />
                    <span className="text-sm">Parties communes (hall, parking commun...)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emplacement */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Position sur la parcelle
                  <SectionHelpPopover
                    title="Position sur la parcelle"
                    description="Indiquez l'emplacement de la construction sur la parcelle, l'orientation de la façade et la distance par rapport à la route. La position influence la valeur (première position = meilleure accessibilité)."
                  />
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs">Emplacement construction</Label>
                  <Select value={buildingPosition} onValueChange={setBuildingPosition}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_POSITION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Orientation façade</Label>
                    <Select value={facadeOrientation} onValueChange={setFacadeOrientation}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FACADE_ORIENTATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Distance route (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={distanceFromRoad}
                      onChange={handleNonNegativeChange(setDistanceFromRoad)}
                      placeholder="Ex: 5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isCornerPlot} onCheckedChange={(c) => setIsCornerPlot(c === true)} />
                    <span className="text-sm">Parcelle d'angle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={hasDirectStreetAccess} onCheckedChange={(c) => setHasDirectStreetAccess(c === true)} />
                    <span className="text-sm">Accès direct rue</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Équipements */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Équipements & commodités
                  <SectionHelpPopover
                    title="Équipements & commodités"
                    description="Cochez tous les équipements présents dans votre propriété. Plus votre bien est équipé, plus sa valeur estimée sera élevée. Incluez les installations récentes."
                  />
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasWaterSupply} onCheckedChange={(c) => setHasWaterSupply(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      Eau courante
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasElectricity} onCheckedChange={(c) => setHasElectricity(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      Électricité
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSewageSystem} onCheckedChange={(c) => setHasSewageSystem(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets className="h-3.5 w-3.5 text-gray-500" />
                      Assainissement
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox checked={hasInternet} onCheckedChange={(c) => {
                        setHasInternet(c === true);
                        if (c !== true) setInternetProvider('');
                      }} />
                      <div className="flex items-center gap-1.5 text-sm">
                        <Wifi className="h-3.5 w-3.5 text-green-500" />
                        Internet
                      </div>
                    </div>
                    {hasInternet && (
                      <div className="ml-8">
                        <Select value={internetProvider} onValueChange={setInternetProvider}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Fournisseur d'accès internet" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="canalbox">Canalbox</SelectItem>
                            <SelectItem value="starlink">Starlink</SelectItem>
                            <SelectItem value="vodacom">Vodacom</SelectItem>
                            <SelectItem value="airtel">Airtel</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="vsat">V-Sat</SelectItem>
                            <SelectItem value="microcom">Microcom</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSecuritySystem} onCheckedChange={(c) => setHasSecuritySystem(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Shield className="h-3.5 w-3.5 text-red-500" />
                      Sécurité
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGarden} onCheckedChange={(c) => setHasGarden(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Trees className="h-3.5 w-3.5 text-green-600" />
                      Jardin
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasPool} onCheckedChange={(c) => setHasPool(c === true)} />
                    <span className="text-sm">Piscine</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasAirConditioning} onCheckedChange={(c) => setHasAirConditioning(c === true)} />
                    <span className="text-sm">Climatisation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSolarPanels} onCheckedChange={(c) => setHasSolarPanels(c === true)} />
                    <span className="text-sm">Panneaux solaires</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGenerator} onCheckedChange={(c) => setHasGenerator(c === true)} />
                    <span className="text-sm">Groupe électrogène</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasWaterTank} onCheckedChange={(c) => setHasWaterTank(c === true)} />
                    <span className="text-sm">Citerne d'eau</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasBorehole} onCheckedChange={(c) => setHasBorehole(c === true)} />
                    <span className="text-sm">Forage</span>
                  </div>
                </div>

                {/* Nouveaux équipements */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasElectricFence} onCheckedChange={(c) => setHasElectricFence(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Fence className="h-3.5 w-3.5 text-orange-500" />
                      Clôture électrique
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGarage} onCheckedChange={(c) => setHasGarage(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Warehouse className="h-3.5 w-3.5 text-slate-600" />
                      Garage
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasCellar} onCheckedChange={(c) => setHasCellar(c === true)} />
                    <span className="text-sm">Cave</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasAutomaticGate} onCheckedChange={(c) => setHasAutomaticGate(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <DoorOpen className="h-3.5 w-3.5 text-indigo-500" />
                      Portail auto.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={hasParking} onCheckedChange={(c) => setHasParking(c === true)} />
                  <div className="flex items-center gap-1.5 text-sm flex-1">
                    <Car className="h-3.5 w-3.5 text-slate-500" />
                    Parking
                  </div>
                  {hasParking && (
                    <Input
                      type="number"
                      min="0"
                      value={parkingSpaces}
                      onChange={handleNonNegativeChange(setParkingSpaces)}
                      placeholder="Places"
                      className="h-8 w-16 text-xs rounded-lg"
                    />
                  )}
                </div>

                {hasGarden && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="text-xs">Surface jardin (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={gardenAreaSqm}
                      onChange={handleNonNegativeChange(setGardenAreaSqm)}
                      placeholder="Ex: 50"
                      className="h-8 w-24 text-xs rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            </>
            )}
          </TabsContent>

          {/* === ONGLET MATÉRIAUX === */}
);
};

export default GeneralTab;
