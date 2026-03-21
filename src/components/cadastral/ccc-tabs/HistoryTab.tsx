import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { MdEventNote } from 'react-icons/md';
import BlockResetButton from '../BlockResetButton';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import SuggestivePicklist from '../SuggestivePicklist';
import { CurrentOwner } from './GeneralTab';

export interface PreviousOwner {
  name: string;
  legalStatus: string;
  entityType: string;
  entitySubType: string;
  entitySubTypeOther: string;
  stateExploitedBy: string;
  startDate: string;
  endDate: string;
  mutationType: string;
}

interface HistoryTabProps {
  formData: CadastralContributionData;
  currentOwners: CurrentOwner[];
  previousOwners: PreviousOwner[];
  updatePreviousOwner: (index: number, field: string | Record<string, string>, value?: string) => void;
  addPreviousOwner: () => void;
  removePreviousOwner: (index: number) => void;
  highlightIncompletePreviousOwner: boolean;
  showCurrentOwnerRequiredWarning: boolean;
  showPreviousOwnerWarning: boolean;
  getPicklistOptions: (key: string) => string[];
  handleTabChange: (tab: string) => void;
  handleNextTab: (current: string, next: string) => void;
  toast: (opts: any) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  formData, currentOwners, previousOwners,
  updatePreviousOwner, addPreviousOwner, removePreviousOwner,
  highlightIncompletePreviousOwner, showCurrentOwnerRequiredWarning, showPreviousOwnerWarning,
  getPicklistOptions, handleTabChange, handleNextTab, toast
}) => {
  return (
    <div className="space-y-3 mt-4 animate-fade-in">
      {/* Previous owners card */}
      <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                <MdEventNote className="h-3.5 w-3.5 text-primary" />
              </div>
              <Label className="text-sm font-semibold">Anciens propriétaires</Label>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                  <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 rounded-xl" align="end">
                <div className="space-y-2 text-xs">
                  <h4 className="font-semibold text-sm">Historique des propriétaires</h4>
                  <p className="text-muted-foreground">Documentez les anciens propriétaires pour établir la chaîne de propriété complète.</p>
                  <p className="text-muted-foreground"><strong>💡</strong> Ordonnez du plus récent au plus ancien.</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {previousOwners.map((owner, index) => (
            <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${
              highlightIncompletePreviousOwner && index === previousOwners.length - 1 && !owner.name 
                ? 'ring-2 ring-primary border-primary animate-pulse' : 'border-border'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-sm font-semibold text-foreground">Ancien #{index + 1}</span>
                {previousOwners.length > 1 && index > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePreviousOwner(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Legal status */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Statut</Label>
                <Select value={owner.legalStatus} onValueChange={(value) => updatePreviousOwner(index, { legalStatus: value, entityType: '', entitySubType: '', entitySubTypeOther: '', stateExploitedBy: '' })}>
                  <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getPicklistOptions('picklist_legal_status').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Fields based on legal status */}
              {owner.legalStatus === 'Personne morale' ? (
                <PreviousOwnerPersonneMorale owner={owner} index={index} updatePreviousOwner={updatePreviousOwner} getPicklistOptions={getPicklistOptions} />
              ) : owner.legalStatus === 'État' ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Exploitée par</Label>
                    <SuggestivePicklist picklistKey="state_agencies_drc" label="" placeholder="Rechercher un service de l'État..." maxSelection={1} selectedValues={owner.stateExploitedBy ? [owner.stateExploitedBy] : []} onSelectionChange={(values) => { const val = values[0] || ''; updatePreviousOwner(index, { stateExploitedBy: val, name: val }); }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Nom complet</Label>
                  <Input placeholder="ex: Jean Mukendi" value={owner.name} onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)} className="h-10 text-sm rounded-xl" />
                </div>
              )}

              {/* Mutation */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Mutation</Label>
                <Select value={owner.mutationType} onValueChange={(value) => updatePreviousOwner(index, 'mutationType', value)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getPicklistOptions('picklist_mutation_type').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm font-medium">Date début</Label>
                    {formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && index === 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full"><Info className="h-3 w-3 text-amber-600 dark:text-amber-400" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 rounded-xl text-xs">
                          <p className="text-muted-foreground">
                            <strong>⚠️ Règle :</strong> Le renouvellement d'un titre foncier suppose que la parcelle appartenait déjà au même propriétaire. La date de début doit donc être antérieure ou égale à la date de {formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'} ({formData.titleIssueDate ? new Date(formData.titleIssueDate).toLocaleDateString('fr-FR') : 'non définie'}).
                          </p>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <Input
                    type="date"
                    max={formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && index === 0 
                      ? formData.titleIssueDate 
                      : (owner.endDate || (index === 0 ? currentOwners[0]?.since : previousOwners[index - 1]?.startDate) || new Date().toISOString().split('T')[0])}
                    value={owner.startDate}
                    onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                    className="h-10 text-sm rounded-xl"
                  />
                  {formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && owner.startDate && index === 0 && new Date(owner.startDate) > new Date(formData.titleIssueDate) && (
                    <p className="text-xs text-destructive">⚠️ Date invalide : doit être ≤ {new Date(formData.titleIssueDate).toLocaleDateString('fr-FR')}</p>
                  )}
                  {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                    <p className="text-xs text-destructive">Début avant fin</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Date fin</Label>
                  <Input
                    type="date"
                    min={owner.startDate || undefined}
                    max={index === 0 ? (currentOwners[0]?.since || new Date().toISOString().split('T')[0]) : (previousOwners[index - 1]?.startDate || new Date().toISOString().split('T')[0])}
                    value={owner.endDate}
                    onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                    disabled={true}
                    className="h-10 text-sm rounded-xl cursor-not-allowed opacity-70"
                    onClick={() => toast({ title: "Auto-calculée", description: "Date basée sur le propriétaire suivant.", variant: "default" })}
                  />
                </div>
              </div>

              {index === 0 && currentOwners[0]?.since && (
                <p className="text-xs text-muted-foreground">💡 Fin: {new Date(currentOwners[0].since).toLocaleDateString('fr-FR')}</p>
              )}
              {index > 0 && previousOwners[index - 1]?.startDate && (
                <p className="text-xs text-muted-foreground">💡 Fin: {new Date(previousOwners[index - 1].startDate).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          ))}

          {showCurrentOwnerRequiredWarning && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2">
              <p className="text-xs text-destructive">⚠️ Ajoutez d'abord un propriétaire actuel (onglet Général).</p>
            </div>
          )}

          {showPreviousOwnerWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">⚠️ Complétez le propriétaire actuel avant d'ajouter.</p>
            </div>
          )}

          <Button type="button" variant="outline" onClick={addPreviousOwner} className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all">
            <Plus className="h-4 w-4" /> Ajouter ancien propriétaire
          </Button>
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 px-1 -mx-1">
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => handleTabChange('location')} className="gap-2 rounded-xl h-10 text-sm">
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button type="button" onClick={() => handleNextTab('history', 'obligations')} className="gap-2 rounded-xl h-10 text-sm shadow-md hover:shadow-lg transition-all">
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Previous Owner Personne Morale fields ─── */
const PreviousOwnerPersonneMorale: React.FC<{
  owner: PreviousOwner; index: number;
  updatePreviousOwner: (i: number, f: string | Record<string, string>, v?: string) => void;
  getPicklistOptions: (key: string) => string[];
}> = ({ owner, index, updatePreviousOwner, getPicklistOptions }) => (
  <div className="space-y-2">
    <div className="space-y-1">
      <Label className="text-sm font-medium">Type d'entreprise *</Label>
      <Select value={owner.entityType || ''} onValueChange={(value) => updatePreviousOwner(index, { entityType: value, entitySubType: '', entitySubTypeOther: '' })}>
        <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="Société">Société</SelectItem>
          <SelectItem value="Association">Association</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {owner.entityType === 'Société' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Forme juridique *</Label>
        <Select value={owner.entitySubType || ''} onValueChange={(value) => updatePreviousOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {['Entreprise individuelle (Ets)', 'Société en Participation (SEP)', 'Société à Responsabilité Limitée (SARL)', 'Société Anonyme (SA)', 'Société par Actions Simplifiée (SAS)', 'Société en Nom Collectif (SNC)', 'Société en Commandite Simple (SCS)', "Groupement d'Intérêt Économique (GIE)", 'Autre'].map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {owner.entitySubType === 'Autre' && (
          <Input placeholder="Précisez la forme juridique" value={owner.entitySubTypeOther || ''} onChange={(e) => updatePreviousOwner(index, 'entitySubTypeOther', e.target.value)} className="h-10 text-sm rounded-xl mt-1" />
        )}
      </div>
    )}

    {owner.entityType === 'Association' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Type d'association *</Label>
        <Select value={owner.entitySubType || ''} onValueChange={(value) => updatePreviousOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {getPicklistOptions('picklist_entity_subtype_association').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
        {owner.entitySubType === 'Autre' && (
          <Input placeholder="Précisez le type d'association" value={owner.entitySubTypeOther || ''} onChange={(e) => updatePreviousOwner(index, 'entitySubTypeOther', e.target.value)} className="h-10 text-sm rounded-xl mt-1" />
        )}
      </div>
    )}

    {owner.entityType && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">{owner.entityType === 'Association' ? 'Dénomination' : 'Raison sociale'}</Label>
        <Input placeholder={owner.entityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"} value={owner.name} onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)} className="h-10 text-sm rounded-xl" />
      </div>
    )}
  </div>
);

export default HistoryTab;
