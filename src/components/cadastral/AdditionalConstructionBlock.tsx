import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Trash2, X } from 'lucide-react';
import { MdInsertDriveFile } from 'react-icons/md';
import { cn } from '@/lib/utils';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import { useToast } from '@/hooks/use-toast';

export interface AdditionalConstructionPermit {
  permitType: 'construction' | 'regularization';
  permitNumber: string;
  issueDate: string;
  issuingService: string;
  attachmentFile?: File | null;
}

export interface AdditionalConstruction {
  propertyCategory: string;
  constructionType: string;
  constructionNature: string;
  constructionMaterials: string;
  declaredUsage: string;
  standing: string;
  constructionYear?: number;
  apartmentNumber?: string;
  floorNumber?: string;
  // Autorisation de bâtir
  permitMode?: 'existing' | 'request';
  permit?: AdditionalConstructionPermit;
}

const PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN = [
  'Appartement', 'Villa', 'Maison', 'Local commercial',
  'Immeuble/Bâtiment', 'Entrepôt/Hangar',
];

const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
  'Appartement': ['Résidentielle'],
  'Villa': ['Résidentielle'],
  'Maison': ['Résidentielle'],
  'Local commercial': ['Commerciale'],
  'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
  'Entrepôt/Hangar': ['Industrielle', 'Agricole'],
};

const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
  'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
  Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
};

const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Haut standing', 'Moyen standing', 'Économique'],
  'Semi-durable': ['Moyen standing', 'Économique'],
  Précaire: ['Économique'],
};

interface Props {
  index: number;
  data: AdditionalConstruction;
  onChange: (index: number, data: AdditionalConstruction) => void;
  onRemove: (index: number) => void;
  getPicklistDependentOptions: (key: string) => Record<string, string[]>;
}

const AdditionalConstructionBlock: React.FC<Props> = ({
  index, data, onChange, onRemove, getPicklistDependentOptions,
}) => {
  const { toast } = useToast();

  const update = (field: keyof AdditionalConstruction, value: any) => {
    onChange(index, { ...data, [field]: value });
  };

  const permit = data.permit || { permitType: 'construction', permitNumber: '', issueDate: '', issuingService: '' };
  const permitMode = data.permitMode || 'existing';

  const updatePermitField = (field: keyof AdditionalConstructionPermit, value: any) => {
    onChange(index, { ...data, permit: { ...permit, [field]: value } });
  };

  // Cascade: category -> construction types
  const availableTypes = useMemo(() => {
    if (!data.propertyCategory) return [];
    return CATEGORY_TO_CONSTRUCTION_TYPES[data.propertyCategory] || [];
  }, [data.propertyCategory]);

  // Cascade: type -> natures
  const availableNatures = useMemo(() => {
    if (!data.constructionType) return [];
    const natureMap = getPicklistDependentOptions('picklist_construction_nature');
    return natureMap[data.constructionType] || [];
  }, [data.constructionType, getPicklistDependentOptions]);

  // Cascade: type + nature -> usages
  const availableUsages = useMemo(() => {
    if (!data.constructionType || !data.constructionNature) return [];
    const usageMap = getPicklistDependentOptions('picklist_declared_usage');
    const specificKey = `${data.constructionType}_${data.constructionNature}`;
    return usageMap[specificKey] || usageMap[data.constructionNature] || [];
  }, [data.constructionType, data.constructionNature, getPicklistDependentOptions]);

  // Cascade: nature -> materials
  const availableMaterials = useMemo(() => {
    if (!data.constructionNature || data.constructionNature === 'Non bâti') return [];
    const dbMap = getPicklistDependentOptions('picklist_construction_materials');
    return (Object.keys(dbMap).length > 0 ? dbMap[data.constructionNature] : MATERIALS_BY_NATURE_FALLBACK[data.constructionNature]) || [];
  }, [data.constructionNature, getPicklistDependentOptions]);

  // Cascade: nature -> standings
  const availableStandings = useMemo(() => {
    if (!data.constructionNature || data.constructionNature === 'Non bâti') return [];
    const dbMap = getPicklistDependentOptions('picklist_standing');
    return (Object.keys(dbMap).length > 0 ? dbMap[data.constructionNature] : STANDING_BY_NATURE_FALLBACK[data.constructionNature]) || [];
  }, [data.constructionNature, getPicklistDependentOptions]);

  // Auto-select single option for construction type
  useEffect(() => {
    if (availableTypes.length === 1 && data.constructionType !== availableTypes[0]) {
      update('constructionType', availableTypes[0]);
    } else if (data.constructionType && !availableTypes.includes(data.constructionType)) {
      onChange(index, { ...data, constructionType: '', constructionNature: '', constructionMaterials: '', declaredUsage: '', standing: '' });
    }
  }, [data.propertyCategory]);

  // Reset nature when type changes
  useEffect(() => {
    if (data.constructionNature && availableNatures.length > 0 && !availableNatures.includes(data.constructionNature)) {
      onChange(index, { ...data, constructionNature: '', constructionMaterials: '', declaredUsage: '', standing: '' });
    }
  }, [data.constructionType]);

  // Permit type restrictions (simplified for additional block)
  const getPermitTypeRestrictions = () => {
    const restrictions = {
      blockedInExisting: null as 'construction' | 'regularization' | null,
    };
    if (data.constructionNature === 'Précaire') {
      restrictions.blockedInExisting = 'regularization';
    }
    return restrictions;
  };

  const isNotTerrainNu = data.propertyCategory && data.propertyCategory !== 'Terrain nu' && data.constructionType !== 'Terrain nu';
  const showBuildingPermit = isNotTerrainNu && data.propertyCategory !== 'Appartement';

  return (
    <div className="border-2 border-border rounded-2xl p-4 space-y-3 bg-card shadow-sm animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <span className="text-sm font-semibold text-foreground">Construction {index + 2}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Catégorie de bien */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Catégorie de bien</Label>
        <Select value={data.propertyCategory} onValueChange={(v) => update('propertyCategory', v)}>
          <SelectTrigger className="h-10 rounded-xl text-sm">
            <SelectValue placeholder="Sélectionner la catégorie" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {PROPERTY_CATEGORY_OPTIONS_NO_TERRAIN.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type et Nature */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Type de construction</Label>
          {availableTypes.length <= 1 ? (
            <div className="h-10 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
              {data.constructionType || (data.propertyCategory ? '—' : "Catégorie d'abord")}
            </div>
          ) : (
            <Select value={data.constructionType} onValueChange={(v) => update('constructionType', v)} disabled={!data.propertyCategory}>
              <SelectTrigger className="h-10 rounded-xl text-sm">
                <SelectValue placeholder={!data.propertyCategory ? "Catégorie d'abord" : "Sélectionner"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableTypes.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Nature</Label>
          <Select value={data.constructionNature} onValueChange={(v) => update('constructionNature', v)} disabled={!data.constructionType}>
            <SelectTrigger className="h-10 rounded-xl text-sm">
              <SelectValue placeholder={!data.constructionType ? "Type d'abord" : "Sélectionner"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableNatures.map(n => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matériaux et Usage */}
      <div className="grid grid-cols-2 gap-2">
        {data.constructionNature && data.constructionNature !== 'Non bâti' ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Matériaux</Label>
            <Select value={data.constructionMaterials} onValueChange={(v) => update('constructionMaterials', v)} disabled={availableMaterials.length === 0}>
              <SelectTrigger className="h-10 rounded-xl text-sm">
                <SelectValue placeholder={availableMaterials.length === 0 ? "Nature d'abord" : "Sélectionner"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableMaterials.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : <div />}

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium">Usage</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl text-xs">
                <p className="text-muted-foreground">
                  Utilisation effective ou prévue du bien, conforme aux règles d'urbanisme.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={data.declaredUsage} onValueChange={(v) => update('declaredUsage', v)} disabled={!data.constructionType || !data.constructionNature}>
            <SelectTrigger className="h-10 rounded-xl text-sm">
              <SelectValue placeholder={!data.constructionType || !data.constructionNature ? "Type et nature d'abord" : "Sélectionner"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableUsages.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Appartement fields */}
        {data.propertyCategory === 'Appartement' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Numéro de l'appartement</Label>
              <Input
                value={data.apartmentNumber || ''}
                onChange={(e) => update('apartmentNumber', e.target.value)}
                placeholder="Ex: A12, 3B..."
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Numéro de l'étage</Label>
              <Input
                value={data.floorNumber || ''}
                onChange={(e) => update('floorNumber', e.target.value)}
                placeholder="Ex: RDC, 1, 2..."
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Standing */}
      {data.constructionNature && data.constructionNature !== 'Non bâti' && availableStandings.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium">Standing</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl text-xs">
                <p className="text-muted-foreground">
                  Niveau de finition de la construction : haut standing, moyen standing ou économique.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={data.standing} onValueChange={(v) => update('standing', v)}>
            <SelectTrigger className="h-10 rounded-xl text-sm">
              <SelectValue placeholder="Sélectionner le standing" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableStandings.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Année de construction */}
      {isNotTerrainNu && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Année de construction</Label>
          <Select
            value={data.constructionYear?.toString() || ''}
            onValueChange={(v) => update('constructionYear', parseInt(v))}
          >
            <SelectTrigger className="h-10 rounded-xl text-sm">
              <SelectValue placeholder="Sélectionner l'année" />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Section Autorisation de bâtir */}
      {showBuildingPermit && (
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
                {data.constructionNature ? `, ${data.constructionNature}` : ''}
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
                  <h4 className="font-semibold text-sm">À propos du permis</h4>
                  <p className="text-muted-foreground">
                    Si vous avez déjà un permis, renseignez-le ici. Sinon, vous pourrez faire une demande depuis votre espace personnel après la soumission de votre contribution.
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

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Service émetteur de l'autorisation</Label>
                  <BuildingPermitIssuingServiceSelect
                    value={permit.issuingService}
                    onValueChange={(value) => updatePermitField('issuingService', value)}
                  />
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
      )}
    </div>
  );
};

export default AdditionalConstructionBlock;
