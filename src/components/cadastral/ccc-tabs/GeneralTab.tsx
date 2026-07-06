import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Info, X, ChevronRight } from 'lucide-react';
import { MdInsertDriveFile } from 'react-icons/md';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES, getEffectiveTitleName } from '../PropertyTitleTypeSelect';

import { InputWithPopover } from '../InputWithPopover';
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
  // Permit type (kept because BuildingPermit interface below is exported for validation)
  // Validation highlights
  highlightRequiredFields: boolean;
  // Picklists
  getPicklistOptions: (key: string) => string[];
  // Navigation
  handleNextTab: (current: string, next: string) => void;
  // Reset handlers
  resetTitleBlock: () => void;
  resetOwnersBlock: () => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  formData, handleInputChange,
  customTitleName, setCustomTitleName, leaseYears, setLeaseYears,
  titleDocFiles, handleFileChange, removeFile,
  currentOwners, setCurrentOwners, ownershipMode, setOwnershipMode,
  ownerDocFile, updateCurrentOwner, addCurrentOwner, removeCurrentOwner,
  showOwnerWarning, highlightIncompleteOwner,
  highlightRequiredFields,
  getPicklistOptions,
  handleNextTab,
  resetTitleBlock, resetOwnersBlock
}) => {


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

export default GeneralTab;
