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

/* ─── Sound Environment Block ───────────────────────────────── */

const SOUND_ENVIRONMENT_OPTIONS = [
  { value: 'tres_calme', label: SOUND_LABELS.tres_calme + ' (< 40 dB)', minDb: 0, maxDb: 40 },
  { value: 'calme', label: SOUND_LABELS.calme + ' (40-55 dB)', minDb: 40, maxDb: 55 },
  { value: 'modere', label: SOUND_LABELS.modere + ' (55-70 dB)', minDb: 55, maxDb: 70 },
  { value: 'bruyant', label: SOUND_LABELS.bruyant + ' (70-85 dB)', minDb: 70, maxDb: 85 },
  { value: 'tres_bruyant', label: SOUND_LABELS.tres_bruyant + ' (> 85 dB)', minDb: 85, maxDb: 200 },
];

interface SoundEnvironmentBlockProps {
  soundEnvironment: string;
  onSoundEnvironmentChange: (v: string) => void;
  nearbySoundSources: string;
  onNearbySoundSourcesChange: (v: string) => void;
}

const SoundEnvironmentBlock: React.FC<SoundEnvironmentBlockProps> = ({
  soundEnvironment, onSoundEnvironmentChange,
  nearbySoundSources, onNearbySoundSourcesChange,
}) => {
  const [isOnSite, setIsOnSite] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [measuredDb, setMeasuredDb] = useState<number | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup microphone on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const getSoundLevel = useCallback((db: number): string => {
    const match = SOUND_ENVIRONMENT_OPTIONS.find(o => db >= o.minDb && db < o.maxDb);
    return match?.value || 'modere';
  }, []);

  const startMeasurement = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setIsRecording(true);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const measure = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        // Calculate RMS for proper logarithmic dB scale
        let sumSquares = 0;
        for (let i = 0; i < buf.length; i++) {
          const normalized = (buf[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / buf.length);
        const db = Math.round(Math.max(0, Math.min(100, 20 * Math.log10(rms + 1e-10) + 100)));
        setMeasuredDb(db);
        onSoundEnvironmentChange(getSoundLevel(db));
        animFrameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch {
      setMicError("Impossible d'accéder au microphone. Vérifiez les autorisations.");
      setIsOnSite(false);
    }
  };

  const stopMeasurement = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    setIsRecording(false);
  };

  // Parse nearbyNoiseSources string to array
  const sourcesArray = nearbySoundSources ? nearbySoundSources.split(', ').filter(Boolean) : [];

  return (
    <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Volume2 className="h-4 w-4 text-primary" />
          </div>
          <Label className="text-sm font-semibold">Environnement sonore</Label>
          <SectionHelpPopover
            title="Environnement sonore"
            description="Évaluez le niveau de bruit autour du bien. Si vous êtes sur place, utilisez le microphone pour une mesure automatique."
          />
        </div>

        {/* On site? */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Êtes-vous actuellement sur la parcelle ?</Label>
          <RadioGroup
            value={isOnSite === null ? '' : isOnSite ? 'yes' : 'no'}
            onValueChange={(v) => { setIsOnSite(v === 'yes'); if (v === 'no') { stopMeasurement(); setMeasuredDb(null); } }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="ccc-onsite-yes" />
              <Label htmlFor="ccc-onsite-yes" className="text-sm cursor-pointer">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="ccc-onsite-no" />
              <Label htmlFor="ccc-onsite-no" className="text-sm cursor-pointer">Non</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Microphone measurement */}
        {isOnSite === true && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Mesure du bruit ambiant</span>
                </div>
                {measuredDb !== null && <Badge variant="secondary" className="text-xs">~{measuredDb} dB</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Activez le microphone pour mesurer le niveau sonore en temps réel.</p>
              {micError && (
                <Alert className="bg-red-50 border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-xs text-red-700">{micError}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button type="button" variant="outline" onClick={startMeasurement} className="flex-1 h-9 text-sm rounded-xl border-blue-300 text-blue-700 hover:bg-blue-100">
                    <Mic className="h-4 w-4 mr-2" /> Démarrer la mesure
                  </Button>
                ) : (
                  <Button type="button" variant="destructive" onClick={stopMeasurement} className="flex-1 h-9 text-sm rounded-xl">
                    <MicOff className="h-4 w-4 mr-2" /> Arrêter la mesure
                  </Button>
                )}
              </div>
              {isRecording && measuredDb !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Niveau mesuré:</span>
                    <span className="font-bold text-blue-700">{measuredDb} dB</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${measuredDb < 40 ? 'bg-green-500' : measuredDb < 55 ? 'bg-lime-500' : measuredDb < 70 ? 'bg-yellow-500' : measuredDb < 85 ? 'bg-orange-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, measuredDb)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center font-medium text-blue-700">
                    Niveau détecté: {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === soundEnvironment)?.label}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual picklist */}
        {(isOnSite === false || isOnSite === null) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Niveau sonore estimé</Label>
            <Select value={soundEnvironment} onValueChange={(v) => { onSoundEnvironmentChange(v); if (v === 'tres_calme') onNearbySoundSourcesChange(''); }}>
              <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {SOUND_ENVIRONMENT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Show result after measurement */}
        {isOnSite === true && measuredDb !== null && !isRecording && (
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
            <span className="text-sm">Niveau sonore mesuré:</span>
            <Badge className="bg-green-600 text-white">
              {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === soundEnvironment)?.label} ({measuredDb} dB)
            </Badge>
          </div>
        )}

        {/* Noise sources */}
        {soundEnvironment && soundEnvironment !== 'tres_calme' && (
          <SuggestivePicklist
            picklistKey="noise_sources"
            label="Sources de bruit à proximité"
            placeholder="Rechercher ou ajouter une source..."
            selectedValues={sourcesArray}
            onSelectionChange={(vals) => onNearbySoundSourcesChange(vals.join(', '))}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default LocationTab;
