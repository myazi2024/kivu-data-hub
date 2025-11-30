import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';
import { getAllProvinces, getVillesForProvince, getCommunesForVille } from '@/lib/geographicData';

interface CadastralSearchFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  compact?: boolean;
}

const CadastralSearchFilters: React.FC<CadastralSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  compact = false
}) => {
  const [villes, setVilles] = useState<string[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);

  useEffect(() => {
    if (filters.province) {
      setVilles(getVillesForProvince(filters.province));
    } else {
      setVilles([]);
      setCommunes([]);
    }
  }, [filters.province]);

  useEffect(() => {
    if (filters.province && filters.ville) {
      setCommunes(getCommunesForVille(filters.province, filters.ville));
    } else {
      setCommunes([]);
    }
  }, [filters.province, filters.ville]);

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const textSize = compact ? 'text-[10px]' : 'text-xs';
  const inputSize = compact ? 'h-7 text-xs' : 'h-8 text-sm';

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <Label className={`font-semibold ${textSize}`}>Filtres avancés</Label>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
          <X className="h-3 w-3 mr-1" />
          Effacer
        </Button>
      </div>

      {/* Filtres géographiques */}
      <div className="space-y-1.5">
        <Label className={textSize}>Localisation</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <Label className={textSize}>Province</Label>
            <Select value={filters.province || ''} onValueChange={(v) => updateFilter('province', v)}>
              <SelectTrigger className={inputSize}>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                {getAllProvinces().map(prov => (
                  <SelectItem key={prov} value={prov} className="text-xs">{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={textSize}>Ville</Label>
            <Select value={filters.ville || ''} onValueChange={(v) => updateFilter('ville', v)} disabled={!filters.province}>
              <SelectTrigger className={inputSize}>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                {villes.map(ville => (
                  <SelectItem key={ville} value={ville} className="text-xs">{ville}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={textSize}>Commune</Label>
            <Select value={filters.commune || ''} onValueChange={(v) => updateFilter('commune', v)} disabled={!filters.ville}>
              <SelectTrigger className={inputSize}>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                {communes.map(commune => (
                  <SelectItem key={commune} value={commune} className="text-xs">{commune}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={textSize}>Quartier</Label>
            <Input
              placeholder="Quartier"
              value={filters.quartier || ''}
              onChange={(e) => updateFilter('quartier', e.target.value)}
              className={inputSize}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Filtres de propriété */}
      <div className="space-y-1.5">
        <Label className={textSize}>Propriétaire</Label>
        <Input
          placeholder="Nom du propriétaire"
          value={filters.owner || ''}
          onChange={(e) => updateFilter('owner', e.target.value)}
          className={inputSize}
        />
      </div>

      {/* Filtres de superficie */}
      <div className="space-y-1.5">
        <Label className={textSize}>Superficie (m²)</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minArea || ''}
            onChange={(e) => updateFilter('minArea', e.target.value ? Number(e.target.value) : undefined)}
            className={inputSize}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxArea || ''}
            onChange={(e) => updateFilter('maxArea', e.target.value ? Number(e.target.value) : undefined)}
            className={inputSize}
          />
        </div>
      </div>

      <Separator />

      {/* Filtres de type */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <Label className={textSize}>Type parcelle</Label>
            <Select value={filters.parcelType || ''} onValueChange={(v) => updateFilter('parcelType', v)}>
              <SelectTrigger className={inputSize}>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urbain" className="text-xs">Urbain</SelectItem>
                <SelectItem value="rural" className="text-xs">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={textSize}>Type titre</Label>
            <Select value={filters.titleType || ''} onValueChange={(v) => updateFilter('titleType', v)}>
              <SelectTrigger className={inputSize}>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Certificat d'enregistrement" className="text-xs">Certificat</SelectItem>
                <SelectItem value="Titre de propriété" className="text-xs">Titre</SelectItem>
                <SelectItem value="Concession" className="text-xs">Concession</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Filtres de statut */}
      <div className="space-y-1.5">
        <Label className={textSize}>Statut</Label>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className={textSize}>Avec permis de construire</Label>
            <Switch
              checked={filters.hasPermit === true}
              onCheckedChange={(checked) => updateFilter('hasPermit', checked ? true : undefined)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className={textSize}>Avec hypothèque</Label>
            <Switch
              checked={filters.hasMortgage === true}
              onCheckedChange={(checked) => updateFilter('hasMortgage', checked ? true : undefined)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className={textSize}>Arriérés d'impôts</Label>
            <Switch
              checked={filters.hasTaxArrears === true}
              onCheckedChange={(checked) => updateFilter('hasTaxArrears', checked ? true : undefined)}
            />
          </div>
        </div>
      </div>

      {/* Filtre de proximité */}
      {filters.proximityLat && filters.proximityLng && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className={textSize}>Rayon de proximité (m)</Label>
            <Input
              type="number"
              placeholder="Rayon en mètres"
              value={filters.proximityRadius || 1000}
              onChange={(e) => updateFilter('proximityRadius', e.target.value ? Number(e.target.value) : undefined)}
              className={inputSize}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default CadastralSearchFilters;
