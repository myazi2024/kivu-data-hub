import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, X } from 'lucide-react';
import { MdInsertDriveFile } from 'react-icons/md';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { AdditionalConstruction, AdditionalConstructionPermit } from './types';

interface Props {
  data: AdditionalConstruction;
  permit: AdditionalConstructionPermit;
  permitMode: 'existing' | 'request';
  update: (field: keyof AdditionalConstruction, value: any) => void;
  updatePermitField: (field: keyof AdditionalConstructionPermit, value: any) => void;
}

/** Section « Autorisation de bâtir » d'une construction additionnelle. */
export default function BuildingPermitSection({ data, permit, permitMode, update, updatePermitField }: Props) {
  const { toast } = useToast();
  // Une construction précaire ne peut pas déclarer une autorisation de régularisation existante.
  const getPermitTypeRestrictions = () => ({
    blockedInExisting: (data.constructionNature === 'Précaire' ? 'regularization' : null) as 'construction' | 'regularization' | null,
  });

  return (
  <>
    <div className="border-t border-border/50 my-2" />
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MdInsertDriveFile className="h-3.5 w-3.5 text-primary" />
        </div>
        <Label className="text-sm font-semibold leading-tight">
          Avez-vous obtenu une autorisation de bâtir pour votre {data.propertyCategory || 'bien'}
          {data.constructionType ? `, de type ${data.constructionType}` : ''}
          {data.constructionNature ? `, construction ${data.constructionNature.toLowerCase()}` : ''}
          {data.constructionMaterials ? `, construit avec des ${data.constructionMaterials}` : ''}
          {data.declaredUsage ? `, et qui est utilisé comme ${data.declaredUsage}` : ''} ?
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
            <p className="text-muted-foreground">
              Si vous avez déjà une autorisation de bâtir, renseignez-la ici. Sinon, vous pourrez faire une demande depuis votre espace personnel après la soumission de votre contribution.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    {/* Toggle Oui / Non */}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => update('permitMode', 'existing')}
        className={cn(
          "flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all",
          permitMode === 'existing'
            ? 'bg-primary text-primary-foreground shadow-lg'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Oui
      </button>
      <button
        type="button"
        onClick={() => update('permitMode', 'request')}
        className={cn(
          "flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all",
          permitMode === 'request'
            ? 'bg-primary text-primary-foreground shadow-lg'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Non
      </button>
    </div>

    {/* Mode: J'ai déjà un permis */}
    {permitMode === 'existing' && (
      <div className="space-y-4 animate-fade-in">
        <div className="border-2 border-border rounded-2xl p-4 space-y-4 bg-card shadow-md">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
              <MdInsertDriveFile className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Dernière autorisation de bâtir ou de régularisation délivrée</span>
          </div>

          {/* Type de permis */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (getPermitTypeRestrictions().blockedInExisting !== 'construction') {
                  updatePermitField('permitType', 'construction');
                }
              }}
              disabled={getPermitTypeRestrictions().blockedInExisting === 'construction'}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                permit.permitType === 'construction'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                getPermitTypeRestrictions().blockedInExisting === 'construction' && 'opacity-50 cursor-not-allowed'
              )}
            >
              Bâtir
            </button>
            <button
              type="button"
              onClick={() => {
                if (getPermitTypeRestrictions().blockedInExisting !== 'regularization') {
                  updatePermitField('permitType', 'regularization');
                }
              }}
              disabled={getPermitTypeRestrictions().blockedInExisting === 'regularization'}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                permit.permitType === 'regularization'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                getPermitTypeRestrictions().blockedInExisting === 'regularization' && 'opacity-50 cursor-not-allowed'
              )}
            >
              Régularisation
            </button>
          </div>

          {/* Champs du formulaire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">N° de l'autorisation</Label>
              <Input
                placeholder="PC-2024-001"
                value={permit.permitNumber}
                onChange={(e) => updatePermitField('permitNumber', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
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
                max={permit.permitType === 'regularization'
                  ? new Date().toISOString().split('T')[0]
                  : data.constructionYear ? `${data.constructionYear}-12-31` : undefined
                }
                min={permit.permitType === 'construction' && data.constructionYear
                  ? `${data.constructionYear - 3}-01-01`
                  : permit.permitType === 'regularization' && data.constructionYear
                    ? `${data.constructionYear}-01-01`
                    : undefined
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (data.constructionYear && value) {
                    const permitYear = new Date(value).getFullYear();
                    if (permit.permitType === 'construction') {
                      if (permitYear > data.constructionYear) {
                        toast({ title: "Date invalide", description: `L'autorisation de bâtir doit être antérieure ou égale à l'année de construction (${data.constructionYear}).`, variant: "destructive" });
                        return;
                      }
                      if (permitYear < data.constructionYear - 3) {
                        toast({ title: "Date invalide", description: `L'autorisation de bâtir est valable 3 ans en RDC. La date ne peut pas être antérieure à ${data.constructionYear - 3}.`, variant: "destructive" });
                        return;
                      }
                    } else {
                      if (permitYear < data.constructionYear) {
                        toast({ title: "Date invalide", description: `L'autorisation de régularisation doit être postérieure ou égale à l'année de construction (${data.constructionYear}).`, variant: "destructive" });
                        return;
                      }
                      if (new Date(value) > new Date()) {
                        toast({ title: "Date invalide", description: "La date ne peut pas être dans le futur.", variant: "destructive" });
                        return;
                      }
                    }
                  }
                  updatePermitField('issueDate', value);
                }}
                className={cn("h-10 text-sm rounded-xl", (() => {
                  if (!permit.issueDate || !data.constructionYear) return false;
                  const py = new Date(permit.issueDate).getFullYear();
                  if (permit.permitType === 'construction') return py > data.constructionYear || py < data.constructionYear - 3;
                  return py < data.constructionYear || new Date(permit.issueDate) > new Date();
                })() && "border-destructive")}
              />
              {permit.issueDate && data.constructionYear && (() => {
                const py = new Date(permit.issueDate).getFullYear();
                if (permit.permitType === 'construction') {
                  if (py > data.constructionYear) return <p className="text-[10px] text-destructive">Doit être ≤ {data.constructionYear}</p>;
                  if (py < data.constructionYear - 3) return <p className="text-[10px] text-destructive">Doit être ≥ {data.constructionYear - 3} (validité 3 ans)</p>;
                } else {
                  if (py < data.constructionYear) return <p className="text-[10px] text-destructive">Doit être ≥ {data.constructionYear}</p>;
                  if (new Date(permit.issueDate) > new Date()) return <p className="text-[10px] text-destructive">Ne peut pas être dans le futur</p>;
                }
                return null;
              })()}
            </div>
          </div>

          {/* Document */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Document (optionnel)</Label>
            {!permit.attachmentFile ? (
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast({ title: "Fichier trop volumineux", description: "Max 10 MB", variant: "destructive" });
                      return;
                    }
                    updatePermitField('attachmentFile', file);
                  }
                }}
                className="h-10 text-sm rounded-xl"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{permit.attachmentFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePermitField('attachmentFile', null)}
                  aria-label="Retirer la pièce jointe du permis"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Mode: Pas de permis */}
    {permitMode === 'request' && (
      <div className="animate-fade-in">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
          <p className="text-sm text-green-800 dark:text-green-200 text-center">
            ✓ Pas de souci ! Vous pourrez faire une demande d'<strong>autorisation de régularisation</strong> pour votre construction plus tard, dès que votre parcelle sera ajoutée au cadastre numérique.
          </p>
        </div>
      </div>
    )}
  </>
  );
}
