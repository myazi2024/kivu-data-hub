import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import BlockResetButton from '../BlockResetButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, ChevronRight, ChevronLeft, Ruler, Volume2, Mic, MicOff, AlertTriangle } from 'lucide-react';
import { MdLocationOn } from 'react-icons/md';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { getAllProvinces } from '@/lib/geographicData';
import { ParcelMapPreview } from '../ParcelMapPreview';
import SuggestivePicklist from '../SuggestivePicklist';
import SectionHelpPopover from '../SectionHelpPopover';
import { SOUND_LABELS } from '@/constants/expertiseLabels';

interface LocationTabProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  sectionType: 'urbaine' | 'rurale' | '';
  sectionTypeAutoDetected: boolean;
  handleSectionTypeChange: (type: 'urbaine' | 'rurale') => void;
  // Geographic dropdowns
  availableVilles: string[];
  availableCommunes: string[];
  availableTerritoires: string[];
  availableCollectivites: string[];
  availableQuartiers: string[];
  availableAvenues: string[];
  // GPS & map
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string; mode?: 'auto' | 'manual'; detected?: boolean; detecting?: boolean }>;
  onCoordinatesUpdate: (coords: any[]) => void;
  mapConfig: any;
  parcelNumber: string;
  roadSides: any[];
  onRoadSidesChange: (sides: any[]) => void;
  parcelSides: Array<{ name: string; length: string }>;
  onParcelSidesUpdate: (sides: Array<{ name: string; length: string }>) => void;
  servitude: { hasServitude: boolean; width?: number };
  onServitudeChange: (s: { hasServitude: boolean; width?: number }) => void;
  buildingShapes: any[];
  onBuildingShapesChange: (shapes: any[]) => void;
  // Sound environment
  soundEnvironment: string;
  onSoundEnvironmentChange: (v: string) => void;
  nearbySoundSources: string;
  onNearbySoundSourcesChange: (v: string) => void;
  // Construction linking
  constructionMode?: 'unique' | 'multiple';
  additionalConstructions?: any[];
  // Navigation
  handleTabChange: (tab: string) => void;
  handleNextTab: (current: string, next: string) => void;
  resetLocationBlock: () => void;
}

const LocationTab: React.FC<LocationTabProps> = ({
  formData, handleInputChange,
  sectionType, sectionTypeAutoDetected, handleSectionTypeChange,
  availableVilles, availableCommunes, availableTerritoires, availableCollectivites, availableQuartiers, availableAvenues,
  gpsCoordinates, onCoordinatesUpdate, mapConfig, parcelNumber,
  roadSides, onRoadSidesChange, parcelSides, onParcelSidesUpdate,
  servitude, onServitudeChange, buildingShapes, onBuildingShapesChange,
  soundEnvironment, onSoundEnvironmentChange, nearbySoundSources, onNearbySoundSourcesChange,
  constructionMode = 'unique', additionalConstructions = [],
  handleTabChange, handleNextTab, resetLocationBlock
}) => {
  const isTerrainNu = formData.propertyCategory === 'Terrain nu' || formData.constructionType === 'Terrain nu';
  const requiredBuildingCount = isTerrainNu ? 0 : (constructionMode === 'multiple' ? 1 + additionalConstructions.length : 1);
  
  // Build labels for each construction
  const constructionLabels = React.useMemo(() => {
    if (isTerrainNu) return [];
    const labels: string[] = [formData.propertyCategory || 'Construction principale'];
    if (constructionMode === 'multiple') {
      additionalConstructions.forEach((c: any, i: number) => {
        labels.push(c.propertyCategory || `Construction ${i + 2}`);
      });
    }
    return labels;
  }, [isTerrainNu, formData.propertyCategory, constructionMode, additionalConstructions]);
  return (
    <div className="space-y-3 md:space-y-6 mt-4 md:mt-6 animate-fade-in">
      {/* Localisation de la parcelle */}
      <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MdLocationOn className="h-4 w-4 text-primary" />
              </div>
              <Label className="text-sm font-semibold">Localisation de la parcelle</Label>
            </div>
            <BlockResetButton blockName="Localisation" onReset={resetLocationBlock} />
          </div>

          {/* Province */}
          <div className="space-y-1.5">
            <Label htmlFor="province" className="text-sm">Province *</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => handleInputChange('province', value)}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl border">
                <SelectValue placeholder="Sélectionner la province" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-48 overflow-y-auto w-56">
                {getAllProvinces().map(province => (
                  <SelectItem key={province} value={province} className="text-sm py-2 rounded-lg">{province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone urbaine ou rurale */}
          {formData.province && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Zone urbaine ou Zone rurale ? *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10 rounded-full">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm rounded-xl">
                    <h4 className="font-semibold mb-1.5 text-sm">Section cadastrale</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      SU (Urbain): Ville → Commune → Quartier<br />
                      SR (Rural): Territoire → Collectivité → Village
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !sectionTypeAutoDetected && handleSectionTypeChange('urbaine')}
                  disabled={sectionTypeAutoDetected}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    sectionType === 'urbaine'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    sectionTypeAutoDetected && 'cursor-not-allowed opacity-70'
                  )}
                >
                  SU - Urbaine
                </button>
                <button
                  type="button"
                  onClick={() => !sectionTypeAutoDetected && handleSectionTypeChange('rurale')}
                  disabled={sectionTypeAutoDetected}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    sectionType === 'rurale'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    sectionTypeAutoDetected && 'cursor-not-allowed opacity-70'
                  )}
                >
                  SR - Rurale
                </button>
              </div>
              {sectionTypeAutoDetected && (
                <p className="text-xs text-primary flex items-center gap-1 justify-center">
                  <CheckCircle2 className="h-3 w-3" />
                  Type auto-détecté depuis le numéro
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Urbaine (SU) */}
      {sectionType === 'urbaine' && formData.province && (
        <UrbanSection
          formData={formData}
          handleInputChange={handleInputChange}
          availableVilles={availableVilles}
          availableCommunes={availableCommunes}
          availableQuartiers={availableQuartiers}
        />
      )}

      {/* Section Rurale (SR) */}
      {sectionType === 'rurale' && formData.province && (
        <RuralSection
          formData={formData}
          handleInputChange={handleInputChange}
          availableTerritoires={availableTerritoires}
          availableCollectivites={availableCollectivites}
        />
      )}

      {/* Map preview (non-apartment) */}
      {sectionType && formData.propertyCategory !== 'Appartement' && (
        <div className="space-y-3 pt-4 border-t relative z-0">
          <ParcelMapPreview
            coordinates={gpsCoordinates}
            onCoordinatesUpdate={onCoordinatesUpdate}
            config={mapConfig}
            currentParcelNumber={parcelNumber}
            
            roadSides={roadSides}
            onRoadSidesChange={onRoadSidesChange}
            parcelSides={parcelSides}
            onParcelSidesUpdate={onParcelSidesUpdate}
            enableDrawingMode={true}
            onSurfaceChange={(surface) => {
              handleInputChange('areaSqm', String(surface));
            }}
            servitude={servitude}
            onServitudeChange={onServitudeChange}
            buildingShapes={buildingShapes}
            onBuildingShapesChange={onBuildingShapesChange}
            isTerrainNu={isTerrainNu}
            requiredBuildingCount={requiredBuildingCount}
            constructionLabels={constructionLabels}
          />
        </div>
      )}

      {/* Sound environment block — after map/limits */}
      {sectionType && (
        <SoundEnvironmentBlock
          soundEnvironment={soundEnvironment}
          onSoundEnvironmentChange={onSoundEnvironmentChange}
          nearbySoundSources={nearbySoundSources}
          onNearbySoundSourcesChange={onNearbySoundSourcesChange}
        />
      )}

      {/* Apartment measurements */}
      {sectionType && formData.propertyCategory === 'Appartement' && (
        <ApartmentMeasurements formData={formData} handleInputChange={handleInputChange} />
      )}

      {/* Navigation buttons */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 px-1 -mx-1">
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleTabChange('general')}
            className="gap-2 rounded-xl h-10 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button
            type="button"
            onClick={() => handleNextTab('location', 'history')}
            className="gap-2 rounded-xl h-10 text-sm shadow-md hover:shadow-lg transition-all"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ────────────────────────────────────────── */

interface UrbanSectionProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  availableVilles: string[];
  availableCommunes: string[];
  availableQuartiers: string[];
}

const UrbanSection: React.FC<UrbanSectionProps> = ({
  formData, handleInputChange, availableVilles, availableCommunes, availableQuartiers
}) => (
  <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 animate-fade-in">
    <CardContent className="p-3 space-y-3">
      <Label className="text-sm font-semibold">Section Urbaine (SU)</Label>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="ville" className="text-sm">Ville *</Label>
          <Select
            value={formData.ville}
            onValueChange={(value) => handleInputChange('ville', value)}
            disabled={!formData.province || availableVilles.length === 0}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl border">
              <SelectValue placeholder={
                !formData.province ? "Province d'abord"
                  : availableVilles.length === 0 ? "Aucune ville"
                    : "Sélectionner"
              } />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableVilles.map(v => (
                <SelectItem key={v} value={v} className="text-sm py-2">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="commune" className="text-sm">Commune *</Label>
          <Select
            value={formData.commune}
            onValueChange={(value) => handleInputChange('commune', value)}
            disabled={!formData.ville || availableCommunes.length === 0}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl border">
              <SelectValue placeholder={
                !formData.ville ? "Ville d'abord"
                  : availableCommunes.length === 0 ? "Aucune commune"
                    : "Sélectionner"
              } />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableCommunes.map(c => (
                <SelectItem key={c} value={c} className="text-sm py-2">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="quartier" className="text-sm">Quartier *</Label>
          <Select
            value={formData.quartier}
            onValueChange={(value) => handleInputChange('quartier', value)}
            disabled={!formData.commune || availableQuartiers.length === 0}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl border">
              <SelectValue placeholder={
                !formData.commune ? "Commune d'abord"
                  : availableQuartiers.length === 0 ? "Saisie manuelle"
                    : "Sélectionner"
              } />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableQuartiers.map(q => (
                <SelectItem key={q} value={q} className="text-sm py-2">{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableQuartiers.length === 0 && formData.commune && (
            <Input
              className="h-9 text-sm rounded-xl mt-1"
              placeholder="Saisir quartier"
              value={formData.quartier || ''}
              onChange={(e) => handleInputChange('quartier', e.target.value)}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avenue" className="text-sm">Avenue</Label>
          <Input
            id="avenue"
            className="h-9 text-sm rounded-xl"
            placeholder="Nom de l'avenue"
            value={formData.avenue || ''}
            onChange={(e) => handleInputChange('avenue', e.target.value)}
            disabled={!formData.quartier}
          />
          <p className="text-xs text-muted-foreground">
            {!formData.quartier ? "Quartier d'abord" : ""}
          </p>
        </div>
      </div>

      {/* N° de la maison */}
      {formData.avenue && formData.avenue.trim() !== '' && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-1">
            <Label htmlFor="houseNumber" className="text-sm">N° de la maison</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl text-xs">
                <p className="text-muted-foreground">
                  Il s'agit du numéro placardé devant la parcelle, près de l'entrée, utilisé pour faciliter la localisation de la maison dans le découpage administratif de la ville.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            id="houseNumber"
            className="h-9 text-sm rounded-xl"
            placeholder="ex: 12, 45B"
            value={formData.houseNumber || ''}
            onChange={(e) => handleInputChange('houseNumber', e.target.value)}
          />
        </div>
      )}
    </CardContent>
  </Card>
);

interface RuralSectionProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  availableTerritoires: string[];
  availableCollectivites: string[];
}

const RuralSection: React.FC<RuralSectionProps> = ({
  formData, handleInputChange, availableTerritoires, availableCollectivites
}) => (
  <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 animate-fade-in">
    <CardContent className="p-3 space-y-3">
      <Label className="text-sm font-semibold">Section Rurale (SR)</Label>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="territoire" className="text-sm">Territoire *</Label>
          <Select
            value={formData.territoire}
            onValueChange={(value) => handleInputChange('territoire', value)}
            disabled={!formData.province || availableTerritoires.length === 0}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl border">
              <SelectValue placeholder={
                !formData.province ? "Province d'abord"
                  : availableTerritoires.length === 0 ? "Aucun territoire"
                    : "Sélectionner"
              } />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableTerritoires.map(t => (
                <SelectItem key={t} value={t} className="text-sm py-2">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="collectivite" className="text-sm">Collectivité *</Label>
          <Select
            value={formData.collectivite}
            onValueChange={(value) => handleInputChange('collectivite', value)}
            disabled={!formData.territoire || availableCollectivites.length === 0}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl border">
              <SelectValue placeholder={
                !formData.territoire ? "Territoire d'abord"
                  : availableCollectivites.length === 0 ? "Aucune collectivité"
                    : "Sélectionner"
              } />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableCollectivites.map(c => (
                <SelectItem key={c} value={c} className="text-sm py-2">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="groupement" className="text-sm">Groupement</Label>
          <Input
            id="groupement"
            className="h-9 text-sm rounded-xl"
            placeholder="ex: Katoyi"
            value={formData.groupement || ''}
            onChange={(e) => handleInputChange('groupement', e.target.value)}
            disabled={!formData.collectivite}
          />
          <p className="text-xs text-muted-foreground">
            {!formData.collectivite ? "Collectivité d'abord" : "Optionnel"}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="village" className="text-sm">Village</Label>
          <Input
            id="village"
            className="h-9 text-sm rounded-xl"
            placeholder="ex: Mushaki"
            value={formData.village || ''}
            onChange={(e) => handleInputChange('village', e.target.value)}
            disabled={!formData.collectivite}
          />
          <p className="text-xs text-muted-foreground">
            {!formData.collectivite ? "Collectivité d'abord" : "Optionnel"}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface ApartmentMeasurementsProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
}

const ApartmentMeasurements: React.FC<ApartmentMeasurementsProps> = ({ formData, handleInputChange }) => (
  <div className="space-y-4">
    <div className="p-4 border border-border/50 rounded-xl bg-muted/30 text-center space-y-1">
      <p className="text-sm font-medium text-muted-foreground">
        Le croquis de parcelle n'est pas applicable pour un appartement.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Les informations de localisation (étage, n° appartement) sont renseignées dans l'onglet Infos.
      </p>
    </div>

    <div className="p-4 border border-border/50 rounded-xl bg-background space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        Mesures et orientation de l'appartement
      </h4>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Longueur (m)</Label>
          <Input
            type="number" min="0" step="0.1" placeholder="Ex: 12"
            value={formData.apartmentLength || ''}
            onChange={(e) => handleInputChange('apartmentLength', parseFloat(e.target.value) || undefined)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Largeur (m)</Label>
          <Input
            type="number" min="0" step="0.1" placeholder="Ex: 8"
            value={formData.apartmentWidth || ''}
            onChange={(e) => handleInputChange('apartmentWidth', parseFloat(e.target.value) || undefined)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hauteur (m)</Label>
          <Input
            type="number" min="0" step="0.1" placeholder="Ex: 3"
            value={formData.apartmentHeight || ''}
            onChange={(e) => handleInputChange('apartmentHeight', parseFloat(e.target.value) || undefined)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {formData.apartmentLength && formData.apartmentWidth && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Superficie</p>
            <p className="text-lg font-bold text-primary">
              {(formData.apartmentLength * formData.apartmentWidth).toFixed(1)} m²
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Périmètre</p>
            <p className="text-lg font-bold text-primary">
              {(2 * (formData.apartmentLength + formData.apartmentWidth)).toFixed(1)} m
            </p>
          </div>
        </div>
      )}

      {formData.apartmentLength && formData.apartmentWidth && formData.apartmentHeight && (
        <div className="p-3 rounded-lg bg-accent/30 border border-accent/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</p>
          <p className="text-lg font-bold text-accent-foreground">
            {(formData.apartmentLength * formData.apartmentWidth * formData.apartmentHeight).toFixed(1)} m³
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium">Orientation de l'appartement</Label>
        <Select
          value={formData.apartmentOrientation || ''}
          onValueChange={(value) => handleInputChange('apartmentOrientation', value)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Sélectionner l'orientation" />
          </SelectTrigger>
          <SelectContent>
            {['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'].map((o) => (
              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

export default LocationTab;
