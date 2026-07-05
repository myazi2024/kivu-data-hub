import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Info, X, ChevronRight, Users } from 'lucide-react';
import { MdDashboard, MdLocationOn, MdInsertDriveFile } from 'react-icons/md';
import BlockResetButton from '../BlockResetButton';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import RentalStartDateField from '../RentalStartDateField';
import { RentalConfigurationSelector, MonthlyRentFields } from '../RentalConfigurationFields';
import { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES, getEffectiveTitleName } from '../PropertyTitleTypeSelect';

import { InputWithPopover } from '../InputWithPopover';
import SuggestivePicklist from '../SuggestivePicklist';
import AdditionalConstructionBlock, { AdditionalConstruction } from '../AdditionalConstructionBlock';
import { BuildingPermitIssuingServiceSelect } from '../BuildingPermitIssuingServiceSelect';
import { CurrentOwnersSection } from './general/CurrentOwnersSection';

// Types for owner, permit, etc.
export interface CurrentOwner {
  lastName: string;
  middleName: string;
  firstName: string;
  legalStatus: string;
  gender: string;
  entityType: string;
  entitySubType: string;
  entitySubTypeOther: string;
  stateExploitedBy: string;
  rightType: string;
  since: string;
  nationality: string;
  previousTitleType?: string;
  previousTitleCustomName?: string;
}

export interface BuildingPermit {
  permitType: 'construction' | 'regularization';
  permitNumber: string;
  issueDate: string;
  validityMonths: string;
  administrativeStatus: string;
  issuingService: string;
  attachmentFile: File | null;
  existingAttachmentUrl?: string;
}

interface GeneralTabProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  // Title
  customTitleName: string;
  setCustomTitleName: (v: string) => void;
  leaseYears: number;
  setLeaseYears: (v: number) => void;
  titleDocFiles: File[];
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => void;
  removeFile: (type: 'owner' | 'title', index?: number) => void;
  // Owner
  currentOwners: CurrentOwner[];
  setCurrentOwners: React.Dispatch<React.SetStateAction<CurrentOwner[]>>;
  ownershipMode: 'unique' | 'multiple';
  setOwnershipMode: (v: 'unique' | 'multiple') => void;
  ownerDocFile: File | null;
  updateCurrentOwner: (index: number, field: string | Record<string, string>, value?: string) => void;
  addCurrentOwner: () => void;
  removeCurrentOwner: (index: number) => void;
  showOwnerWarning: boolean;
  highlightIncompleteOwner: boolean;
  // Construction
  PROPERTY_CATEGORY_OPTIONS: string[];
  availableConstructionTypes: string[];
  availableConstructionNatures: string[];
  availableConstructionMaterials: string[];
  availableDeclaredUsages: string[];
  availableStandings: string[];
  constructionMode: 'unique' | 'multiple';
  setConstructionMode: (v: 'unique' | 'multiple') => void;
  additionalConstructions: AdditionalConstruction[];
  setAdditionalConstructions: React.Dispatch<React.SetStateAction<AdditionalConstruction[]>>;
  /** Provided by useCCCFormState — reindexes IRL taxRecords and marketListings. */
  removeAdditionalConstruction?: (index: number) => void;
  // Permit
  permitMode: 'existing' | 'request';
  setPermitMode: (v: 'existing' | 'request') => void;
  buildingPermits: BuildingPermit[];
  updateBuildingPermit: (index: number, field: string, value: string) => void;
  updateBuildingPermitFile: (index: number, file: File | null) => void;
  removeBuildingPermitFile: (index: number) => void;
  getPermitTypeRestrictions: () => { blockedInExisting?: string };
  showPermitWarning: boolean;
  highlightIncompletePermit: boolean;
  // Validation highlights
  highlightRequiredFields: boolean;
  setHighlightRequiredFields: (v: boolean) => void;
  // Picklists
  getPicklistOptions: (key: string) => string[];
  getPicklistDependentOptions: any; // Accepts both signatures used by parent and AdditionalConstructionBlock
  // Navigation
  handleNextTab: (current: string, next: string) => void;
  // Toast
  toast: (opts: any) => void;
  // Reset handlers
  resetTitleBlock: () => void;
  resetOwnersBlock: () => void;
  resetConstructionBlock: () => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  formData, handleInputChange,
  customTitleName, setCustomTitleName, leaseYears, setLeaseYears,
  titleDocFiles, handleFileChange, removeFile,
  currentOwners, setCurrentOwners, ownershipMode, setOwnershipMode,
  ownerDocFile, updateCurrentOwner, addCurrentOwner, removeCurrentOwner,
  showOwnerWarning, highlightIncompleteOwner,
  PROPERTY_CATEGORY_OPTIONS,
  availableConstructionTypes, availableConstructionNatures, availableConstructionMaterials,
  availableDeclaredUsages, availableStandings,
  constructionMode, setConstructionMode,
  additionalConstructions, setAdditionalConstructions, removeAdditionalConstruction,
  permitMode, setPermitMode, buildingPermits,
  updateBuildingPermit, updateBuildingPermitFile, removeBuildingPermitFile,
  getPermitTypeRestrictions, showPermitWarning, highlightIncompletePermit,
  highlightRequiredFields, setHighlightRequiredFields,
  getPicklistOptions, getPicklistDependentOptions,
  handleNextTab, toast,
  resetTitleBlock, resetOwnersBlock, resetConstructionBlock
}) => {
  // Agrégation auto : en mode multi-locaux, la capacité d'accueil globale = Σ capacités des locaux.
  // Dépendance sur la somme des capacités (dérivée stable) au lieu de JSON.stringify (coûteux à chaque frappe).
  const rentalUnitsCapacitySum = React.useMemo(() => {
    if (formData.rentalConfiguration !== 'multi') return 0;
    return (formData.rentalUnits || []).reduce(
      (s, u: any) => s + (Number(u?.hostingCapacity) || 0),
      0,
    );
  }, [formData.rentalConfiguration, formData.rentalUnits]);

  React.useEffect(() => {
    if (formData.declaredUsage === 'Location' && formData.rentalConfiguration === 'multi') {
      const next = rentalUnitsCapacitySum > 0 ? rentalUnitsCapacitySum : undefined;
      if (next !== formData.hostingCapacity) {
        handleInputChange('hostingCapacity', next);
      }
    }
  }, [formData.declaredUsage, formData.rentalConfiguration, rentalUnitsCapacitySum, formData.hostingCapacity, handleInputChange]);

  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 animate-fade-in">
      <PropertyTitleTypeSelect 
        value={formData.propertyTitleType || ''}
        onValueChange={(value) => {
          handleInputChange('propertyTitleType', value);
          if (value !== 'Autre') setCustomTitleName('');
        }}
        leaseType={formData.leaseType}
        onLeaseTypeChange={(type) => handleInputChange('leaseType', type)}
        leaseYears={leaseYears}
        onLeaseYearsChange={setLeaseYears}
        customTitleName={customTitleName}
        onCustomTitleNameChange={setCustomTitleName}
      />

      {/* Title reference card (non-Autre) */}
      {formData.propertyTitleType && formData.propertyTitleType !== 'Autre' && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden animate-fade-in">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="titleReference" className="text-sm font-medium">
                  N° {formData.propertyTitleType ? (() => {
                    const titleType = formData.propertyTitleType;
                    const abbreviations: Record<string, string> = {
                      "Certificat d'enregistrement": "Cert. d'enreg.",
                      "Contrat de location (Contrat d'occupation provisoire)": "Contr. de loc.",
                      "Fiche parcellaire": "Fiche parcel."
                    };
                    return abbreviations[titleType] || titleType;
                  })() : "de référence"}
                </Label>
                <InputWithPopover
                  id="titleReference"
                  placeholder={PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}
                  value={formData.titleReferenceNumber || ''}
                  onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                  helpTitle="Référence"
                  helpText={`Format : ${PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}`}
                  className="h-9 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="titleIssueDate" className="text-sm font-medium">
                  {formData.leaseType === 'renewal' ? 'Date renouvellement' : 'Date délivrance'}
                </Label>
                <Input
                  id="titleIssueDate"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.titleIssueDate || ''}
                  onChange={(e) => handleInputChange('titleIssueDate', e.target.value)}
                  className="h-9 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Title document upload */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="titleDoc" className="text-sm font-medium">
                  Images ou pdf du {getEffectiveTitleName(formData.propertyTitleType, customTitleName)?.toLowerCase() || 'titre de propriété'} <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">{titleDocFiles.length}/5</span>
              </div>
              
              {titleDocFiles.length > 0 && (
                <div className="space-y-1.5">
                  {titleDocFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-xl overflow-hidden min-w-0">
                      <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs flex-1 truncate overflow-hidden min-w-0">{file.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('title', index)} className="h-6 w-6 p-0">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {titleDocFiles.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('titleDoc')?.click()} className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2">
                  <Plus className="h-4 w-4" />
                  Ajouter fichier
                </Button>
              )}
              
              <Input id="titleDoc" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => handleFileChange(e, 'title')} className="hidden" />
              <p className="text-xs text-muted-foreground text-center">JPG, PNG, PDF • Max 10 MB</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card for "Autre" title type */}
      {formData.propertyTitleType === 'Autre' && customTitleName?.trim() && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden animate-fade-in">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="titleReference" className="text-sm font-medium">
                  N° {customTitleName.length > 15 ? customTitleName.substring(0, 15) + '…' : customTitleName}
                </Label>
                <InputWithPopover
                  id="titleReference"
                  placeholder="Numéro de référence"
                  value={formData.titleReferenceNumber || ''}
                  onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                  helpTitle="Référence"
                  helpText="Numéro figurant sur votre document"
                  className="h-9 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="titleIssueDate" className="text-sm font-medium">Date délivrance</Label>
                <Input id="titleIssueDate" type="date" max={new Date().toISOString().split('T')[0]} value={formData.titleIssueDate || ''} onChange={(e) => handleInputChange('titleIssueDate', e.target.value)} className="h-9 text-sm rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Is title in current owner name? */}
      {formData.titleReferenceNumber && formData.titleReferenceNumber.trim() !== '' && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Ce titre de type "{getEffectiveTitleName(formData.propertyTitleType, customTitleName) || 'non sélectionné'}" est-il au nom du propriétaire actuel ?
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                    <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 rounded-xl text-xs">
                  <p className="text-muted-foreground">
                    Votre réponse nous permet de déterminer si nous pouvons vous recommander un service de mutation foncière, afin de sécuriser davantage le droit foncier qui couvre cette parcelle.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleInputChange('isTitleInCurrentOwnerName', true);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  formData.isTitleInCurrentOwnerName === true
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-background text-muted-foreground hover:bg-background/80 border border-border'
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('isTitleInCurrentOwnerName', false)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  formData.isTitleInCurrentOwnerName === false
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-background text-muted-foreground hover:bg-background/80 border border-border'
                }`}
              >
                Non
              </button>
            </div>
            {formData.isTitleInCurrentOwnerName === false && (() => {
              const ownerSinceDate = currentOwners[0]?.since;
              if (!ownerSinceDate) return null;
              const daysDiff = Math.floor((new Date().getTime() - new Date(ownerSinceDate).getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff >= 20) {
                return <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Hors délai légal de mutation (De 1 à 20 jours après acquisition).</p>;
              } else {
                return <p className="text-xs text-green-700 dark:text-green-400">✓ Pensez à faire la mutation dès que possible, vous êtes encore dans le délai légal (De 1 à 20 jours après acquisition).</p>;
              }
            })()}
          </CardContent>
        </Card>
      )}

      {/* Current owners section */}
      <CurrentOwnersSection
        formData={formData}
        handleInputChange={handleInputChange}
        customTitleName={customTitleName}
        currentOwners={currentOwners}
        setCurrentOwners={setCurrentOwners}
        ownershipMode={ownershipMode}
        setOwnershipMode={setOwnershipMode}
        ownerDocFile={ownerDocFile}
        updateCurrentOwner={updateCurrentOwner}
        addCurrentOwner={addCurrentOwner}
        removeCurrentOwner={removeCurrentOwner}
        showOwnerWarning={showOwnerWarning}
        highlightIncompleteOwner={highlightIncompleteOwner}
        highlightRequiredFields={highlightRequiredFields}
        handleFileChange={handleFileChange}
        removeFile={removeFile}
        getPicklistOptions={getPicklistOptions}
        resetOwnersBlock={resetOwnersBlock}
      />

      {/* Construction section */}
      <ConstructionSection
        formData={formData}
        handleInputChange={handleInputChange}
        PROPERTY_CATEGORY_OPTIONS={PROPERTY_CATEGORY_OPTIONS}
        availableConstructionTypes={availableConstructionTypes}
        availableConstructionNatures={availableConstructionNatures}
        availableConstructionMaterials={availableConstructionMaterials}
        availableDeclaredUsages={availableDeclaredUsages}
        availableStandings={availableStandings}
        constructionMode={constructionMode}
        setConstructionMode={setConstructionMode}
        additionalConstructions={additionalConstructions}
        setAdditionalConstructions={setAdditionalConstructions}
        removeAdditionalConstruction={removeAdditionalConstruction}
        permitMode={permitMode}
        setPermitMode={setPermitMode}
        buildingPermits={buildingPermits}
        updateBuildingPermit={updateBuildingPermit}
        updateBuildingPermitFile={updateBuildingPermitFile}
        removeBuildingPermitFile={removeBuildingPermitFile}
        getPermitTypeRestrictions={getPermitTypeRestrictions}
        showPermitWarning={showPermitWarning}
        highlightIncompletePermit={highlightIncompletePermit}
        highlightRequiredFields={highlightRequiredFields}
        setHighlightRequiredFields={setHighlightRequiredFields}
        getPicklistDependentOptions={getPicklistDependentOptions}
        toast={toast}
        resetConstructionBlock={resetConstructionBlock}
      />

      {/* Navigation */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 px-1 -mx-1">
        <div className="flex justify-end">
          <Button type="button" onClick={() => handleNextTab('general', 'location')} className="gap-2 rounded-xl h-10 text-sm shadow-md hover:shadow-lg transition-all">
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* CurrentOwnersSection, PersonneMoraleFields et EtatFields ont été extraits
 * dans ./general/CurrentOwnersSection.tsx (modularisation P1). */


/* ─── Construction Section ────────────────────────────────── */

interface ConstructionSectionProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  PROPERTY_CATEGORY_OPTIONS: string[];
  availableConstructionTypes: string[];
  availableConstructionNatures: string[];
  availableConstructionMaterials: string[];
  availableDeclaredUsages: string[];
  availableStandings: string[];
  constructionMode: 'unique' | 'multiple';
  setConstructionMode: (v: 'unique' | 'multiple') => void;
  additionalConstructions: AdditionalConstruction[];
  setAdditionalConstructions: React.Dispatch<React.SetStateAction<AdditionalConstruction[]>>;
  removeAdditionalConstruction?: (index: number) => void;
  permitMode: 'existing' | 'request';
  setPermitMode: (v: 'existing' | 'request') => void;
  buildingPermits: BuildingPermit[];
  updateBuildingPermit: (index: number, field: string, value: string) => void;
  updateBuildingPermitFile: (index: number, file: File | null) => void;
  removeBuildingPermitFile: (index: number) => void;
  getPermitTypeRestrictions: () => { blockedInExisting?: string };
  showPermitWarning: boolean;
  highlightIncompletePermit: boolean;
  highlightRequiredFields: boolean;
  setHighlightRequiredFields: (v: boolean) => void;
  getPicklistDependentOptions: any;
  toast: (opts: any) => void;
  resetConstructionBlock: () => void;
}

const ConstructionSection: React.FC<ConstructionSectionProps> = ({
  formData, handleInputChange,
  PROPERTY_CATEGORY_OPTIONS,
  availableConstructionTypes, availableConstructionNatures, availableConstructionMaterials,
  availableDeclaredUsages, availableStandings,
  constructionMode, setConstructionMode,
  additionalConstructions, setAdditionalConstructions, removeAdditionalConstruction,
  permitMode, setPermitMode, buildingPermits,
  updateBuildingPermit, updateBuildingPermitFile, removeBuildingPermitFile,
  getPermitTypeRestrictions, showPermitWarning, highlightIncompletePermit,
  highlightRequiredFields, setHighlightRequiredFields,
  getPicklistDependentOptions, toast,
  resetConstructionBlock
}) => (
  <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
    <CardContent className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
            <MdLocationOn className="h-3.5 w-3.5 text-primary" />
          </div>
          <Label className="text-sm font-semibold">Construction</Label>
        </div>
        <div className="flex items-center gap-1">
          <BlockResetButton blockName="Construction" onReset={resetConstructionBlock} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl" align="end">
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-sm">Construction</h4>
                <p className="text-muted-foreground">Ces informations nous permettent de savoir si cette parcelle est mise en valeur, afin de vous recommander le service foncier le mieux adapté pour renforcer la sécurité de vos droits sur celle-ci.</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Property category */}
      <div className={`space-y-1.5 ${highlightRequiredFields && !formData.propertyCategory ? 'ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse' : ''}`}>
        <Label className="text-sm font-medium flex items-center gap-1">
          Catégorie de bien
          {highlightRequiredFields && !formData.propertyCategory && <span className="text-destructive text-xs font-semibold">*</span>}
        </Label>
        <Select value={formData.propertyCategory || ''} onValueChange={(value) => { handleInputChange('propertyCategory', value); setHighlightRequiredFields(false); }}>
          <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Sélectionner la catégorie" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {PROPERTY_CATEGORY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Type & Matériaux */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`space-y-1.5 ${highlightRequiredFields && !formData.constructionType ? 'ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse' : ''}`}>
          <Label className="text-sm font-medium flex items-center gap-1">
            Type de construction
            {highlightRequiredFields && !formData.constructionType && <span className="text-destructive text-xs font-semibold">*</span>}
          </Label>
          {availableConstructionTypes.length <= 1 ? (
            <div className="h-10 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
              {formData.constructionType || (formData.propertyCategory ? '—' : "Catégorie d'abord")}
            </div>
          ) : (
            <Select value={formData.constructionType || ''} onValueChange={(value) => { handleInputChange('constructionType', value); setHighlightRequiredFields(false); }} disabled={!formData.propertyCategory}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder={!formData.propertyCategory ? "Catégorie d'abord" : "Sélectionner"} /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableConstructionTypes.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {availableConstructionMaterials.length > 0 ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Matériaux</Label>
            <Select value={formData.constructionMaterials || ''} onValueChange={(value) => handleInputChange('constructionMaterials', value)} disabled={availableConstructionMaterials.length === 0}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder={!formData.constructionType ? "Type d'abord" : "Sélectionner"} /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableConstructionMaterials.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : <div />}
      </div>

      {/* Nature (auto-remplie) & Usage */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`space-y-1.5 ${highlightRequiredFields && !formData.constructionNature ? 'ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse' : ''}`}>
          <Label className="text-sm font-medium flex items-center gap-1">
            Nature
            {highlightRequiredFields && !formData.constructionNature && <span className="text-destructive text-xs font-semibold">*</span>}
          </Label>
          <div className="h-10 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
            {formData.constructionNature ? `Construction ${formData.constructionNature.toLowerCase()}` : (formData.constructionMaterials ? '—' : "Matériaux d'abord")}
          </div>
        </div>

        <div className={`space-y-1.5 ${highlightRequiredFields && !formData.declaredUsage ? 'ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse' : ''}`}>
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium flex items-center gap-1">
              Usage
              {highlightRequiredFields && !formData.declaredUsage && <span className="text-destructive text-xs font-semibold">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-muted-foreground" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl text-xs">
                <p className="text-muted-foreground">Utilisation effective ou prévue du bien, conforme aux règles d'urbanisme.</p>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={formData.declaredUsage || ''} onValueChange={(value) => {
            handleInputChange('declaredUsage', value);
            // Vider rentalStartDate et la config locative si on quitte "Location"
            if (value !== 'Location') {
              if (formData.rentalStartDate) handleInputChange('rentalStartDate', undefined);
              if (formData.rentalConfiguration) handleInputChange('rentalConfiguration', undefined);
              if (formData.rentalUnitsCount) handleInputChange('rentalUnitsCount', undefined);
              if (formData.monthlyRentUsd) handleInputChange('monthlyRentUsd', undefined);
              if (formData.rentalUnits) handleInputChange('rentalUnits', undefined);
            }
            setHighlightRequiredFields(false);
          }} disabled={!formData.constructionType || !formData.constructionNature}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder={!formData.constructionType || !formData.constructionNature ? "Type et nature d'abord" : "Sélectionner"} /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableDeclaredUsages.map(usage => <SelectItem key={usage} value={usage}>{usage}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Apartment fields */}
        {formData.propertyCategory === 'Appartement' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Numéro de l'appartement</Label>
              <Input value={formData.apartmentNumber || ''} onChange={(e) => handleInputChange('apartmentNumber', e.target.value)} placeholder="Ex: A12, 3B..." className="h-10 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Numéro de l'étage</Label>
              <Input value={formData.floorNumber || ''} onChange={(e) => handleInputChange('floorNumber', e.target.value)} placeholder="Ex: RDC, 1, 2..." className="h-10 rounded-xl text-sm" />
            </div>
          </>
        )}
      </div>

      {/* Standing + Nombre d'étages */}
      {formData.constructionNature && formData.constructionNature !== 'Non bâti' && availableStandings.length > 0 && (
        <div className={`grid gap-3 ${formData.propertyCategory !== 'Appartement' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">Standing</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-muted-foreground" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 rounded-xl text-xs">
                  <p className="text-muted-foreground">Niveau de finition de la construction : haut standing, moyen standing ou économique.</p>
                </PopoverContent>
              </Popover>
            </div>
            <Select value={formData.standing || ''} onValueChange={(value) => handleInputChange('standing', value)}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Sélectionner le standing" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableStandings.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {formData.propertyCategory !== 'Appartement' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-medium">Nombre d'étages</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-muted-foreground" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 rounded-xl text-xs">
                    <p className="text-muted-foreground">Nombre de niveaux de la construction (0 = rez-de-chaussée uniquement).</p>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                type="number"
                min={0}
                max={200}
                value={formData.floorNumber || ''}
                onChange={(e) => handleInputChange('floorNumber', e.target.value)}
                placeholder="Ex: 2"
                className="h-10 rounded-xl text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Construction year */}
      {formData.propertyCategory && formData.propertyCategory !== 'Terrain nu' && formData.constructionType && formData.constructionType !== 'Terrain nu' && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Année de construction</Label>
          <Select value={formData.constructionYear?.toString() || ''} onValueChange={(value) => {
            const y = parseInt(value);
            handleInputChange('constructionYear', y);
            // Règle : rentalStartDate doit être ≥ 01/01/constructionYear
            // Si la date saisie devient antérieure à l'année de construction, l'effacer
            if (formData.rentalStartDate && y) {
              const min = new Date(y, 0, 1);
              if (new Date(formData.rentalStartDate) < min) handleInputChange('rentalStartDate', undefined);
            }
          }}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Sélectionner l'année" /></SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date de mise en location — UNIQUEMENT en mode single (le mode multi gère par local) */}
      {formData.declaredUsage === 'Location' && formData.rentalConfiguration !== 'multi' && (
        <RentalStartDateField
          value={formData.rentalStartDate}
          onChange={(v) => handleInputChange('rentalStartDate', v)}
          constructionYear={formData.constructionYear}
          highlightRequired={highlightRequiredFields}
        />
      )}

      {/* Configuration locative : mono-local vs multi-locaux */}
      {formData.declaredUsage === 'Location' && (
        <RentalConfigurationSelector
          state={{
            rentalConfiguration: formData.rentalConfiguration,
            rentalUnitsCount: formData.rentalUnitsCount,
            monthlyRentUsd: formData.monthlyRentUsd,
            rentalUnits: formData.rentalUnits,
          }}
          onPatch={(patch) => {
            Object.entries(patch).forEach(([k, v]) => handleInputChange(k as any, v));
          }}
          propertyCategory={formData.propertyCategory}
          constructionType={formData.constructionType}
          highlightRequired={highlightRequiredFields}
        />
      )}

      {/* Hosting capacity sub-block — MASQUÉ en mode multi (saisi par local) */}
      {formData.propertyCategory && formData.propertyCategory !== 'Terrain nu' && formData.constructionType && formData.constructionType !== 'Terrain nu' && !(formData.declaredUsage === 'Location' && formData.rentalConfiguration === 'multi') && (
        <>
          <div className="border-t border-border/50 my-2" />
          <div className="flex items-start gap-2 mb-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <Label className="text-sm font-semibold leading-tight">Capacité d'accueil</Label>
          </div>

          <div className="space-y-3 pl-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Votre {formData.propertyCategory?.toLowerCase() || 'bien'} est-il habité ?</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { handleInputChange('isOccupied', true); }} className={cn("flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all", formData.isOccupied === true ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Oui</button>
                <button type="button" onClick={() => { handleInputChange('isOccupied', false); handleInputChange('occupantCount', undefined); }} className={cn("flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all", formData.isOccupied === false ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Non</button>
              </div>
            </div>

            {formData.isOccupied === true && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Combien de personnes y vivent ?</Label>
                <Input type="number" min={1} value={formData.occupantCount || ''} onChange={(e) => handleInputChange('occupantCount', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Nombre de personnes" className="h-10 rounded-xl text-sm" />
              </div>
            )}

            {formData.isOccupied !== undefined && formData.isOccupied !== null && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Quelle est sa capacité d'accueil ?</Label>
                <Input type="number" min={1} value={formData.hostingCapacity || ''} onChange={(e) => handleInputChange('hostingCapacity', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Nombre de personnes" className="h-10 rounded-xl text-sm" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Loyer mensuel — après Capacité d'accueil, conditionnel si Location */}
      {formData.declaredUsage === 'Location' && (
        <>
          <div className="border-t border-border/50 my-2" />
          <MonthlyRentFields
            state={{
              rentalConfiguration: formData.rentalConfiguration,
              rentalUnitsCount: formData.rentalUnitsCount,
              monthlyRentUsd: formData.monthlyRentUsd,
              rentalUnits: formData.rentalUnits,
            }}
            onPatch={(patch) => {
              Object.entries(patch).forEach(([k, v]) => handleInputChange(k as any, v));
            }}
            propertyCategory={formData.propertyCategory}
            constructionType={formData.constructionType}
            highlightRequired={highlightRequiredFields}
            numberOfFloors={formData.floorNumber ? parseInt(formData.floorNumber, 10) : undefined}
            constructionYear={formData.constructionYear}
          />
        </>
      )}

      {/* Building permit section */}
      {formData.propertyCategory !== 'Terrain nu' && formData.propertyCategory !== 'Appartement' && formData.constructionType !== 'Terrain nu' && (<>
        <div className="border-t border-border/50 my-2" />
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MdInsertDriveFile className="h-3.5 w-3.5 text-primary" />
            </div>
            <Label className="text-sm font-semibold leading-tight">
              Avez-vous obtenu une autorisation de bâtir pour votre {formData.propertyCategory || 'bien'}
              {formData.constructionType ? `, de type ${formData.constructionType}` : ''}
              {formData.constructionNature ? `, construction ${formData.constructionNature.toLowerCase()}` : ''}
              {formData.constructionMaterials ? `, construit avec des ${formData.constructionMaterials}` : ''}
              {formData.declaredUsage ? `, et qui est utilisé comme ${formData.declaredUsage}` : ''} ?
            </Label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl" align="end">
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-sm">À propos de l'autorisation</h4>
                <p className="text-muted-foreground">Si vous avez déjà une autorisation de bâtir, renseignez-la ici. Sinon, vous pourrez faire une demande depuis votre espace personnel après la soumission de votre contribution.</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setPermitMode('existing')} className={cn("flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all", permitMode === 'existing' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Oui</button>
          <button type="button" onClick={() => setPermitMode('request')} className={cn("flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all", permitMode === 'request' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>Non</button>
        </div>

        {/* Existing permit */}
        {permitMode === 'existing' && (
          <div className="space-y-4 animate-fade-in">
            {buildingPermits.map((permit, index) => (
              <div key={index} className={cn("border-2 rounded-2xl p-4 space-y-4 bg-card shadow-md", highlightIncompletePermit && index === buildingPermits.length - 1 && (!permit.permitNumber || !permit.issueDate) ? 'ring-2 ring-primary border-primary animate-pulse' : 'border-border')}>
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MdInsertDriveFile className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Dernière autorisation de bâtir ou de régularisation délivrée</span>
                  </div>
                </div>

                {/* Permit type toggle */}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { const r = getPermitTypeRestrictions(); if (r.blockedInExisting !== 'construction') updateBuildingPermit(index, 'permitType', 'construction'); }} disabled={getPermitTypeRestrictions().blockedInExisting === 'construction'} className={cn("flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all", permit.permitType === 'construction' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80', getPermitTypeRestrictions().blockedInExisting === 'construction' && 'opacity-50 cursor-not-allowed')}>Bâtir</button>
                  <button type="button" onClick={() => { const r = getPermitTypeRestrictions(); if (r.blockedInExisting !== 'regularization') updateBuildingPermit(index, 'permitType', 'regularization'); }} disabled={getPermitTypeRestrictions().blockedInExisting === 'regularization'} className={cn("flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all", permit.permitType === 'regularization' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80', getPermitTypeRestrictions().blockedInExisting === 'regularization' && 'opacity-50 cursor-not-allowed')}>Régularisation</button>
                </div>

                {/* Permit fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">N° de l'autorisation</Label>
                    <Input placeholder="PC-2024-001" value={permit.permitNumber} onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)} className="h-10 text-sm rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium text-foreground">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary transition-colors">
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 rounded-xl text-xs" align="start" sideOffset={5}>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-sm">Date de délivrance</h4>
                            <p className="text-muted-foreground leading-relaxed">
                              {permit.permitType === 'construction'
                                ? <>L'autorisation de bâtir est valable <strong>3 ans</strong> en RDC. Sa date doit être dans les 3 ans précédant l'année de construction.</>
                                : <>L'autorisation de régularisation est délivrée <strong>après</strong> la construction. Sa date doit être postérieure ou égale à l'année de construction.</>
                              }
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      type="date"
                      value={permit.issueDate}
                      max={permit.permitType === 'regularization' ? new Date().toISOString().split('T')[0] : formData.constructionYear ? `${formData.constructionYear}-12-31` : undefined}
                      min={permit.permitType === 'construction' && formData.constructionYear ? `${formData.constructionYear - 3}-01-01` : permit.permitType === 'regularization' && formData.constructionYear ? `${formData.constructionYear}-01-01` : undefined}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (formData.constructionYear && value) {
                          const permitYear = new Date(value).getFullYear();
                          if (permit.permitType === 'construction') {
                            if (permitYear > formData.constructionYear) { toast({ title: "Date invalide", description: `L'autorisation de bâtir doit être antérieure ou égale à l'année de construction (${formData.constructionYear}).`, variant: "destructive" }); return; }
                            if (permitYear < formData.constructionYear - 3) { toast({ title: "Date invalide", description: `L'autorisation de bâtir est valable 3 ans en RDC. La date ne peut pas être antérieure à ${formData.constructionYear - 3}.`, variant: "destructive" }); return; }
                          } else {
                            if (permitYear < formData.constructionYear) { toast({ title: "Date invalide", description: `L'autorisation de régularisation doit être postérieure ou égale à l'année de construction (${formData.constructionYear}).`, variant: "destructive" }); return; }
                            if (new Date(value) > new Date()) { toast({ title: "Date invalide", description: "La date ne peut pas être dans le futur.", variant: "destructive" }); return; }
                          }
                        }
                        updateBuildingPermit(index, 'issueDate', value);
                      }}
                      className={cn("h-10 text-sm rounded-xl", (() => {
                        if (!permit.issueDate || !formData.constructionYear) return false;
                        const py = new Date(permit.issueDate).getFullYear();
                        if (permit.permitType === 'construction') return py > formData.constructionYear || py < formData.constructionYear - 3;
                        return py < formData.constructionYear || new Date(permit.issueDate) > new Date();
                      })() && "border-destructive")}
                    />
                    {permit.issueDate && formData.constructionYear && (() => {
                      const py = new Date(permit.issueDate).getFullYear();
                      if (permit.permitType === 'construction') {
                        if (py > formData.constructionYear) return <p className="text-[10px] text-destructive">Doit être ≤ {formData.constructionYear}</p>;
                        if (py < formData.constructionYear - 3) return <p className="text-[10px] text-destructive">Doit être ≥ {formData.constructionYear - 3} (validité 3 ans)</p>;
                      } else {
                        if (py < formData.constructionYear) return <p className="text-[10px] text-destructive">Doit être ≥ {formData.constructionYear}</p>;
                        if (new Date(permit.issueDate) > new Date()) return <p className="text-[10px] text-destructive">Ne peut pas être dans le futur</p>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Service émetteur */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Service émetteur</Label>
                  <BuildingPermitIssuingServiceSelect
                    value={permit.issuingService}
                    onValueChange={(value) => updateBuildingPermit(index, 'issuingService', value)}
                  />
                </div>

                {/* Document */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Document (optionnel)</Label>
                  {!permit.attachmentFile ? (
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (file) { if (file.size > 10 * 1024 * 1024) { toast({ title: "Fichier trop volumineux", description: "Max 10 MB", variant: "destructive" }); return; } updateBuildingPermitFile(index, file); } }} className="h-10 text-sm rounded-xl" />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                      <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{permit.attachmentFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeBuildingPermitFile(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {showPermitWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">⚠️ Complétez les informations de l'autorisation.</p>
              </div>
            )}
          </div>
        )}

        {permitMode === 'request' && (
          <div className="animate-fade-in">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <p className="text-sm text-green-800 dark:text-green-200 text-center">
                ✓ Pas de souci ! Vous pourrez faire une demande d'<strong>autorisation de régularisation</strong> pour votre construction plus tard, dès que votre parcelle sera ajoutée au cadastre numérique.
              </p>
            </div>
          </div>
        )}
      </>)}

      {/* Multiple constructions */}
      {formData.propertyCategory && formData.propertyCategory !== 'Terrain nu' && formData.propertyCategory !== 'Appartement' && (() => {
        const isFirstConstructionComplete = !!(formData.constructionType && formData.constructionNature && formData.declaredUsage);
        return (
          <>
            <div className="border-t border-border/50 my-2" />
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nombre de constructions sur la parcelle</Label>
              {!isFirstConstructionComplete && (
                <p className="text-xs text-muted-foreground italic">Renseignez d'abord la construction principale (type, nature, usage) avant d'ajouter d'autres constructions.</p>
              )}
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="constructionMode" checked={constructionMode === 'unique'} onChange={() => { setConstructionMode('unique'); setAdditionalConstructions([]); }} className="accent-primary h-4 w-4" />
                  <span className="text-sm">Construction unique</span>
                </label>
                <label className={`flex items-center gap-2 ${isFirstConstructionComplete ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input type="radio" name="constructionMode" checked={constructionMode === 'multiple'} onChange={() => isFirstConstructionComplete && setConstructionMode('multiple')} disabled={!isFirstConstructionComplete} className="accent-primary h-4 w-4" />
                  <span className="text-sm">Plusieurs constructions</span>
                </label>
              </div>
            </div>

            {constructionMode === 'multiple' && (
              <div className="space-y-3 animate-fade-in">
                {additionalConstructions.map((construction, idx) => (
                  <AdditionalConstructionBlock
                    key={idx} index={idx} data={construction}
                    onChange={(i, updated) => { const copy = [...additionalConstructions]; copy[i] = updated; setAdditionalConstructions(copy); }}
                    onRemove={(i) => {
                      if (removeAdditionalConstruction) {
                        removeAdditionalConstruction(i);
                      } else {
                        setAdditionalConstructions(prev => prev.filter((_, j) => j !== i));
                      }
                    }}
                    getPicklistDependentOptions={getPicklistDependentOptions}
                  />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setAdditionalConstructions(prev => [...prev, { propertyCategory: '', constructionType: '', constructionNature: '', constructionMaterials: '', declaredUsage: '', standing: '' }])} className="w-full rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Ajouter une construction
                </Button>
              </div>
            )}
          </>
        );
      })()}
    </CardContent>
  </Card>
);

export default GeneralTab;
