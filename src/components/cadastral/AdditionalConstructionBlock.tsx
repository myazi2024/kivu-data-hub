import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Trash2 } from 'lucide-react';

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
  const update = (field: keyof AdditionalConstruction, value: any) => {
    onChange(index, { ...data, [field]: value });
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
          <Label className="text-sm font-medium">Usage</Label>
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
          <Label className="text-sm font-medium">Standing</Label>
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
    </div>
  );
};

export default AdditionalConstructionBlock;
