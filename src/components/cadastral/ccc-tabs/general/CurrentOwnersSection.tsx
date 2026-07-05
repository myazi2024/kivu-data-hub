/**
 * Section « Propriétaires actuels » extraite de GeneralTab.tsx (modularisation P1).
 * Contient CurrentOwnersSection + les 2 sous-composants dédiés
 * (PersonneMoraleFields, EtatFields). Aucun changement de logique métier.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Info, X } from 'lucide-react';
import { MdDashboard, MdInsertDriveFile } from 'react-icons/md';
import BlockResetButton from '../../BlockResetButton';
import SuggestivePicklist from '../../SuggestivePicklist';
import { PROPERTY_TITLE_TYPES, getEffectiveTitleName } from '../../PropertyTitleTypeSelect';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';
import type { CurrentOwner } from '../GeneralTab';

export interface CurrentOwnersSectionProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  customTitleName: string;
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
  highlightRequiredFields: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => void;
  removeFile: (type: 'owner' | 'title', index?: number) => void;
  getPicklistOptions: (key: string) => string[];
  resetOwnersBlock: () => void;
}

/* ─── Personne Morale fields ────────────────────────────────── */
const PersonneMoraleFields: React.FC<{
  owner: CurrentOwner; index: number;
  updateCurrentOwner: (i: number, f: string | Record<string, string>, v?: string) => void;
  getPicklistOptions: (key: string) => string[];
}> = ({ owner, index, updateCurrentOwner, getPicklistOptions }) => (
  <div className="space-y-2">
    <div className="space-y-1">
      <Label className="text-sm font-medium">Type d'entreprise *</Label>
      <Select value={owner.entityType || ''} onValueChange={(value) => updateCurrentOwner(index, { entityType: value, entitySubType: '', entitySubTypeOther: '' })}>
        <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          {getPicklistOptions('picklist_entity_type').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    {owner.entityType === 'Société' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Forme juridique *</Label>
        <Select value={owner.entitySubType || ''} onValueChange={(value) => updateCurrentOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {getPicklistOptions('picklist_entity_subtype_societe').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
        {owner.entitySubType === 'Autre' && (
          <Input placeholder="Précisez la forme juridique" value={owner.entitySubTypeOther || ''} onChange={(e) => updateCurrentOwner(index, 'entitySubTypeOther', e.target.value)} className="h-10 text-sm rounded-xl mt-1" />
        )}
      </div>
    )}

    {owner.entityType === 'Association' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Type d'association *</Label>
        <Select value={owner.entitySubType || ''} onValueChange={(value) => updateCurrentOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {getPicklistOptions('picklist_entity_subtype_association').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
        {owner.entitySubType === 'Autre' && (
          <Input placeholder="Précisez le type d'association" value={owner.entitySubTypeOther || ''} onChange={(e) => updateCurrentOwner(index, 'entitySubTypeOther', e.target.value)} className="h-10 text-sm rounded-xl mt-1" />
        )}
      </div>
    )}

    {owner.entityType && (
      <div className="space-y-2 animate-fade-in">
        <div className="space-y-1">
          <Label className="text-sm font-medium">{owner.entityType === 'Association' ? 'Dénomination *' : 'Raison sociale *'}</Label>
          <Input placeholder={owner.entityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"} value={owner.lastName} onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)} className="h-10 text-sm rounded-xl" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">{owner.entityType === 'Association' ? "Numéro d'Arrêté ministériel d'autorisation *" : "N° d'identification (RCCM) *"}</Label>
          <Input placeholder={owner.entityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"} value={owner.firstName} onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)} className="h-10 text-sm rounded-xl" />
        </div>
      </div>
    )}
  </div>
);

/* ─── État fields ────────────────────────────────── */
const EtatFields: React.FC<{
  owner: CurrentOwner; index: number;
  updateCurrentOwner: (i: number, f: string | Record<string, string>, v?: string) => void;
  getPicklistOptions: (key: string) => string[];
}> = ({ owner, index, updateCurrentOwner, getPicklistOptions }) => (
  <div className="space-y-2">
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">Type de droit *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-muted-foreground" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 rounded-xl text-xs">
            <p className="text-muted-foreground">Il s'agit de déterminer la nature du droit d'exploitation que détient l'occupant de cette parcelle.</p>
          </PopoverContent>
        </Popover>
      </div>
      <Select value={owner.rightType || ''} onValueChange={(value) => updateCurrentOwner(index, 'rightType', value)}>
        <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          {getPicklistOptions('picklist_right_type').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-sm font-medium">Exploitée par *</Label>
      <SuggestivePicklist
        picklistKey="state_agencies_drc"
        label=""
        placeholder="Rechercher un service ou agence de l'État..."
        maxSelection={1}
        selectedValues={owner.stateExploitedBy ? [owner.stateExploitedBy] : []}
        onSelectionChange={(values) => {
          const val = values[0] || '';
          updateCurrentOwner(index, { stateExploitedBy: val, lastName: val, firstName: 'État' });
        }}
      />
    </div>
  </div>
);

/* ─── Section principale ────────────────────────────────── */
export const CurrentOwnersSection: React.FC<CurrentOwnersSectionProps> = ({
  formData, handleInputChange, customTitleName,
  currentOwners, setCurrentOwners, ownershipMode, setOwnershipMode,
  ownerDocFile, updateCurrentOwner, addCurrentOwner, removeCurrentOwner,
  showOwnerWarning, highlightIncompleteOwner, highlightRequiredFields,
  handleFileChange, removeFile, getPicklistOptions,
  resetOwnersBlock,
}) => (
  <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
    <CardContent className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
            <MdDashboard className="h-3.5 w-3.5 text-primary" />
          </div>
          <Label className="text-sm font-semibold">
            {formData.isTitleInCurrentOwnerName === true
              ? `Ajouter le/la propriétaire figurant sur le ${getEffectiveTitleName(formData.propertyTitleType, customTitleName) || 'titre de propriété'}`
              : formData.isTitleInCurrentOwnerName === false
              ? "Veuillez indiquer le nom du propriétaire actuel tel qu'il apparaît sur tout document attestant de son droit sur cette parcelle."
              : "Propriétaire(s) actuel(s)"}
          </Label>
        </div>
        <div className="flex items-center gap-1">
          <BlockResetButton blockName="Propriétaires" onReset={resetOwnersBlock} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl" align="end">
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-sm">Nom différent du document ?</h4>
                <p className="text-muted-foreground">Vous pouvez indiquer votre nom si vous détenez un acte de transfert (vente, donation, succession).</p>
                <p className="text-muted-foreground"><strong>💡</strong> Ajoutez ce document dans la section "Document du titre".</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {currentOwners.map((owner, index) => (
        <div key={index} className={`border-2 rounded-2xl p-3 space-y-3 bg-card shadow-sm transition-all duration-300 ${
          highlightIncompleteOwner && index === currentOwners.length - 1 && (!owner.lastName || !owner.firstName)
            ? 'ring-2 ring-primary border-primary animate-pulse'
            : 'border-border'
        }`}>
          <div className="flex items-center justify-between">
            {ownershipMode === 'multiple' && (
              <span className="text-sm font-semibold text-primary">Copropriétaire {index + 1}</span>
            )}
            {currentOwners.length > 1 && index > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeCurrentOwner(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl ml-auto">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Legal status */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Statut juridique</Label>
            {index > 0 ? (
              <Input value="Personne physique" readOnly className="h-10 text-sm rounded-xl bg-muted cursor-not-allowed" />
            ) : (
              <Select
                value={owner.legalStatus}
                onValueChange={(value) => {
                  updateCurrentOwner(index, {
                    legalStatus: value, entityType: '', entitySubType: '', entitySubTypeOther: '',
                    stateExploitedBy: '', rightType: '', gender: '',
                    ...(value !== 'Personne physique' ? { middleName: '' } : {}),
                  });
                  if (value !== 'Personne physique' && index === 0) {
                    setOwnershipMode('unique');
                    if (currentOwners.length > 1) {
                      setCurrentOwners(prev => [prev[0]]);
                    }
                  }
                }}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {getPicklistOptions('picklist_legal_status').map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Gender for Personne physique */}
          {owner.legalStatus === 'Personne physique' && (
            <div className="space-y-1 animate-fade-in">
              <Label className="text-sm font-medium">Genre *</Label>
              <Select value={owner.gender || ''} onValueChange={(value) => updateCurrentOwner(index, { gender: value })}>
                <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner le genre" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {getPicklistOptions('picklist_gender').map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fields based on legal status */}
          {owner.legalStatus === 'Personne morale' ? (
            <PersonneMoraleFields owner={owner} index={index} updateCurrentOwner={updateCurrentOwner} getPicklistOptions={getPicklistOptions} />
          ) : owner.legalStatus === 'État' ? (
            <EtatFields owner={owner} index={index} updateCurrentOwner={updateCurrentOwner} getPicklistOptions={getPicklistOptions} />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Nom *</Label>
                <Input placeholder="Nom de famille" value={owner.lastName} onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)} className="h-10 text-sm rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Post-nom</Label>
                  <Input placeholder="Post-nom" value={owner.middleName} onChange={(e) => updateCurrentOwner(index, 'middleName', e.target.value)} className="h-10 text-sm rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Prénom *</Label>
                  <Input placeholder="Prénom" value={owner.firstName} onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)} className="h-10 text-sm rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {/* Owner since date */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">
                {owner.legalStatus === 'État' && owner.rightType === 'Concession' ? 'Concédé depuis'
                  : owner.legalStatus === 'État' && owner.rightType === 'Affectation' ? 'Affecté depuis'
                  : 'Propriétaire depuis'}
              </Label>
              {formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && index === 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                      <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 rounded-xl text-xs">
                    <p className="text-muted-foreground">
                      <strong>⚠️ Règle de cohérence :</strong> Le propriétaire actuel a acquis la parcelle après la délivrance du titre à l'ancien propriétaire. Cette date doit donc être postérieure ou égale à la date de délivrance du titre ({formData.titleIssueDate ? new Date(formData.titleIssueDate).toLocaleDateString('fr-FR') : 'non définie'}).
                    </p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              min={formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && index === 0 ? formData.titleIssueDate : undefined}
              value={index > 0 && ownershipMode === 'multiple' ? currentOwners[0]?.since || '' : owner.since}
              onChange={(e) => {
                updateCurrentOwner(index, 'since', e.target.value);
                if (formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && index === 0) {
                  if (!e.target.value || new Date(e.target.value) >= new Date(formData.titleIssueDate)) {
                    updateCurrentOwner(index, 'previousTitleType', '');
                  }
                }
              }}
              className={`h-10 text-sm rounded-xl ${
                index > 0 && ownershipMode === 'multiple' ? 'cursor-not-allowed opacity-70 bg-muted' : ''
              } ${
                formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && owner.since && index === 0 && new Date(owner.since) < new Date(formData.titleIssueDate)
                  ? 'border-destructive ring-1 ring-destructive' : ''
              }`}
              disabled={index > 0 && ownershipMode === 'multiple'}
              title={index > 0 && ownershipMode === 'multiple' ? 'Date synchronisée avec le copropriétaire 1' : undefined}
            />
            {index > 0 && ownershipMode === 'multiple' && (
              <p className="text-xs text-muted-foreground">Synchronisée avec le copropriétaire 1</p>
            )}
            {formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && owner.since && index === 0 && new Date(owner.since) < new Date(formData.titleIssueDate) && (
              <p className="text-xs text-destructive">⚠️ Date invalide : doit être ≥ {new Date(formData.titleIssueDate).toLocaleDateString('fr-FR')}</p>
            )}

            {formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && owner.since && index === 0 && new Date(owner.since) < new Date(formData.titleIssueDate) && (
              <div className="space-y-1 pt-1 animate-fade-in">
                <Label className="text-sm font-medium">
                  Titre de propriété antérieur <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  La date d'acquisition est antérieure à la délivrance du titre actuel. Quel titre détenait le propriétaire avant ?
                </p>
                <Select
                  value={owner.previousTitleType || ''}
                  onValueChange={(val) => {
                    updateCurrentOwner(index, 'previousTitleType', val);
                    if (val !== 'Autre') {
                      updateCurrentOwner(index, 'previousTitleCustomName', '');
                    }
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Sélectionner le titre antérieur" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PROPERTY_TITLE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Aucun">Aucun titre antérieur</SelectItem>
                  </SelectContent>
                </Select>

                {owner.previousTitleType === 'Autre' && (
                  <div className="space-y-1 animate-fade-in">
                    <Label className="text-sm font-medium">
                      Nom du titre antérieur <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Livret de logeur, Attestation de propriété..."
                      value={owner.previousTitleCustomName || ''}
                      onChange={(e) => updateCurrentOwner(index, 'previousTitleCustomName', e.target.value)}
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nationalité */}
          <div className="space-y-1.5">
            <Label className={cn("text-sm font-medium", highlightRequiredFields && !owner.nationality && "text-destructive")}>
              Nationalité <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={owner.nationality || ''}
              onValueChange={(value) => updateCurrentOwner(index, 'nationality', value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Congolais (RD)" id={`nationality-congolais-${index}`} />
                <Label htmlFor={`nationality-congolais-${index}`} className="text-sm cursor-pointer">Congolais (RD)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Étranger" id={`nationality-etranger-${index}`} />
                <Label htmlFor={`nationality-etranger-${index}`} className="text-sm cursor-pointer">Étranger</Label>
              </div>
            </RadioGroup>
          </div>

          {/* ID document */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                  ? "Arrêté ministériel d'autorisation de fonctionnement"
                  : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                    ? "Certificat d'immatriculation au RCCM"
                    : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                      ? "Titre de concession"
                      : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                        ? "Acte d'affectation"
                        : "Pièce d'identité (optionnel)"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-muted-foreground" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 rounded-xl text-xs">
                  <p className="text-muted-foreground">
                    {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                      ? "Joignez une copie de l'arrêté ministériel autorisant le fonctionnement de l'association."
                      : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                        ? "Joignez une copie du certificat d'immatriculation au RCCM."
                        : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                          ? "Joignez une copie du titre de concession."
                          : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                            ? "Joignez une copie de l'acte d'affectation."
                            : "La pièce d'identité renforce la crédibilité de votre contribution."}
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            {!ownerDocFile ? (
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('ownerDoc')?.click()} className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2 hover:bg-primary/5">
                <Plus className="h-4 w-4" />
                {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                  ? "Ajouter l'arrêté ministériel"
                  : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                    ? "Ajouter le certificat RCCM"
                    : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                      ? "Ajouter le titre de concession"
                      : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                        ? "Ajouter l'acte d'affectation"
                        : "Ajouter la pièce d'identité"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{ownerDocFile.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('owner')} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Input id="ownerDoc" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => handleFileChange(e, 'owner')} className="hidden" />
          </div>
        </div>
      ))}

      {showOwnerWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">⚠️ Complétez le propriétaire actuel avant d'en ajouter un nouveau.</p>
        </div>
      )}

      {currentOwners[0]?.legalStatus === 'Personne physique' && (
        <div className="space-y-2">
          <RadioGroup value={ownershipMode} onValueChange={(value: 'unique' | 'multiple') => {
            setOwnershipMode(value);
            if (value === 'unique' && currentOwners.length > 1) setCurrentOwners(prev => [prev[0]]);
          }} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unique" id="ownership-unique" />
              <Label htmlFor="ownership-unique" className="text-sm cursor-pointer">Unique propriétaire</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multiple" id="ownership-multiple" />
              <Label htmlFor="ownership-multiple" className="text-sm cursor-pointer">Plusieurs propriétaires</Label>
            </div>
          </RadioGroup>
          {ownershipMode === 'multiple' && (
            <Button type="button" variant="outline" onClick={addCurrentOwner} className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all">
              <Plus className="h-4 w-4" /> Ajouter un copropriétaire
            </Button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default CurrentOwnersSection;
