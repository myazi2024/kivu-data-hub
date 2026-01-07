import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, X, ChevronDown, MapPin, Home, AlertCircle, Info } from 'lucide-react';
import { SearchFilters } from '@/hooks/useAdvancedCadastralSearch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  getAllProvinces, 
  getVillesForProvince, 
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire
} from '@/lib/geographicData';

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onSearch: () => void;
  onClear: () => void;
  isCompact?: boolean;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Options géographiques basées sur la structure hiérarchique
  const provinces = getAllProvinces();
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);

  // Charger villes et territoires quand province change
  useEffect(() => {
    if (filters.province) {
      setAvailableVilles(getVillesForProvince(filters.province));
      setAvailableTerritoires(getTerritoiresForProvince(filters.province));
    } else {
      setAvailableVilles([]);
      setAvailableTerritoires([]);
    }
  }, [filters.province]);

  // Charger communes quand ville change
  useEffect(() => {
    if (filters.province && filters.ville) {
      setAvailableCommunes(getCommunesForVille(filters.province, filters.ville));
    } else {
      setAvailableCommunes([]);
    }
  }, [filters.province, filters.ville]);

  // Charger collectivités quand territoire change
  useEffect(() => {
    if (filters.province && filters.territoire) {
      setAvailableCollectivites(getCollectivitesForTerritoire(filters.province, filters.territoire));
    } else {
      setAvailableCollectivites([]);
    }
  }, [filters.province, filters.territoire]);

  // Handler pour changer le type de section
  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    // Réinitialiser les champs de l'autre section
    if (type === 'urbaine') {
      onFiltersChange({ 
        sectionType: type,
        territoire: undefined,
        collectivite: undefined,
        groupement: undefined,
        village: undefined
      });
    } else {
      onFiltersChange({ 
        sectionType: type,
        ville: undefined,
        commune: undefined,
        quartier: undefined,
        avenue: undefined
      });
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <Card className="p-3 bg-background/95 backdrop-blur-md shadow-lg rounded-2xl border border-border/50 max-w-[360px]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-10 text-sm font-semibold px-3 rounded-xl hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <span>Filtres avancés</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <ScrollArea className="h-[340px] pr-3">
            <div className="space-y-4">
              {/* Localisation de la parcelle - Aligné avec CadastralContributionDialog */}
              <div className="p-3 rounded-xl bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Label className="text-sm font-semibold">Localisation de la parcelle</Label>
                </div>

                {/* Province - toujours visible en premier */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Province</Label>
                  <Select 
                    value={filters.province || '_all'} 
                    onValueChange={(v) => onFiltersChange({ 
                      province: v === '_all' ? undefined : v,
                      sectionType: undefined,
                      ville: undefined,
                      commune: undefined,
                      quartier: undefined,
                      avenue: undefined,
                      territoire: undefined,
                      collectivite: undefined,
                      groupement: undefined,
                      village: undefined
                    })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-xl">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-48">
                      <SelectItem value="_all">Toutes</SelectItem>
                      {provinces.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zone urbaine ou rurale - visible après province */}
                {filters.province && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Zone</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10 rounded-full">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-sm rounded-xl">
                          <h4 className="font-semibold mb-1.5 text-sm">Section cadastrale</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            SU (Urbain): Ville → Commune → Quartier<br/>
                            SR (Rural): Territoire → Collectivité → Village
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSectionTypeChange('urbaine')}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                          filters.sectionType === 'urbaine'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-background text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        SU - Urbaine
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSectionTypeChange('rurale')}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                          filters.sectionType === 'rurale'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-background text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        SR - Rurale
                      </button>
                    </div>
                  </div>
                )}

                {/* Section Urbaine (SU) */}
                {filters.sectionType === 'urbaine' && filters.province && (
                  <div className="space-y-2.5 pt-2 border-t border-border/30 animate-fade-in">
                    <Label className="text-xs font-semibold text-primary">Section Urbaine (SU)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Ville</Label>
                        <Select 
                          value={filters.ville || '_all'} 
                          onValueChange={(v) => onFiltersChange({ 
                            ville: v === '_all' ? undefined : v,
                            commune: undefined,
                            quartier: undefined,
                            avenue: undefined
                          })}
                          disabled={availableVilles.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue placeholder={availableVilles.length === 0 ? "Aucune" : "Toutes"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="_all">Toutes</SelectItem>
                            {availableVilles.map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Commune</Label>
                        <Select 
                          value={filters.commune || '_all'} 
                          onValueChange={(v) => onFiltersChange({ 
                            commune: v === '_all' ? undefined : v,
                            quartier: undefined,
                            avenue: undefined
                          })}
                          disabled={!filters.ville || availableCommunes.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue placeholder={!filters.ville ? "Ville d'abord" : "Toutes"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="_all">Toutes</SelectItem>
                            {availableCommunes.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quartier</Label>
                        <Input
                          placeholder="Saisir..."
                          value={filters.quartier || ''}
                          onChange={(e) => onFiltersChange({ quartier: e.target.value || undefined })}
                          className="h-8 text-xs rounded-xl"
                          disabled={!filters.commune}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Avenue</Label>
                        <Input
                          placeholder="Saisir..."
                          value={filters.avenue || ''}
                          onChange={(e) => onFiltersChange({ avenue: e.target.value || undefined })}
                          className="h-8 text-xs rounded-xl"
                          disabled={!filters.quartier}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Rurale (SR) */}
                {filters.sectionType === 'rurale' && filters.province && (
                  <div className="space-y-2.5 pt-2 border-t border-border/30 animate-fade-in">
                    <Label className="text-xs font-semibold text-primary">Section Rurale (SR)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Territoire</Label>
                        <Select 
                          value={filters.territoire || '_all'} 
                          onValueChange={(v) => onFiltersChange({ 
                            territoire: v === '_all' ? undefined : v,
                            collectivite: undefined,
                            groupement: undefined,
                            village: undefined
                          })}
                          disabled={availableTerritoires.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue placeholder={availableTerritoires.length === 0 ? "Aucun" : "Tous"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="_all">Tous</SelectItem>
                            {availableTerritoires.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Collectivité</Label>
                        <Select 
                          value={filters.collectivite || '_all'} 
                          onValueChange={(v) => onFiltersChange({ 
                            collectivite: v === '_all' ? undefined : v,
                            groupement: undefined,
                            village: undefined
                          })}
                          disabled={!filters.territoire || availableCollectivites.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue placeholder={!filters.territoire ? "Territoire d'abord" : "Toutes"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="_all">Toutes</SelectItem>
                            {availableCollectivites.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Groupement</Label>
                        <Input
                          placeholder="Optionnel"
                          value={filters.groupement || ''}
                          onChange={(e) => onFiltersChange({ groupement: e.target.value || undefined })}
                          className="h-8 text-xs rounded-xl"
                          disabled={!filters.collectivite}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Village</Label>
                        <Input
                          placeholder="Optionnel"
                          value={filters.village || ''}
                          onChange={(e) => onFiltersChange({ village: e.target.value || undefined })}
                          className="h-8 text-xs rounded-xl"
                          disabled={!filters.collectivite}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Critères de recherche */}
              <div className="p-3 rounded-xl bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Home className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Label className="text-sm font-semibold">Critères</Label>
                </div>
                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Propriétaire</Label>
                    <Input
                      placeholder="Nom du propriétaire..."
                      value={filters.ownerName || ''}
                      onChange={(e) => onFiltersChange({ ownerName: e.target.value })}
                      className="h-10 text-sm rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Surface min (m²)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.areaSqmMin || ''}
                        onChange={(e) => onFiltersChange({ areaSqmMin: Number(e.target.value) })}
                        className="h-10 text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Surface max (m²)</Label>
                      <Input
                        type="number"
                        placeholder="∞"
                        value={filters.areaSqmMax || ''}
                        onChange={(e) => onFiltersChange({ areaSqmMax: Number(e.target.value) })}
                        className="h-10 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Type parcelle</Label>
                      <Select value={filters.parcelType || '_all'} onValueChange={(v) => onFiltersChange({ parcelType: v === '_all' ? undefined : v })}>
                        <SelectTrigger className="h-10 text-sm rounded-xl">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Tous</SelectItem>
                          <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                          <SelectItem value="Terrain bâti">Terrain bâti</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Type titre</Label>
                      <Select value={filters.titleType || '_all'} onValueChange={(v) => onFiltersChange({ titleType: v === '_all' ? undefined : v })}>
                        <SelectTrigger className="h-10 text-sm rounded-xl">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Tous</SelectItem>
                          <SelectItem value="Certificat d'enregistrement">Certificat</SelectItem>
                          <SelectItem value="Titre foncier">Titre foncier</SelectItem>
                          <SelectItem value="Concession">Concession</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtres de statut */}
              <div className="p-3 rounded-xl bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Label className="text-sm font-semibold">Statut</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background/50 hover:bg-background/80 cursor-pointer transition-colors">
                    <Checkbox 
                      id="permit" 
                      checked={filters.hasBuildingPermit || false}
                      onCheckedChange={(checked) => onFiltersChange({ hasBuildingPermit: checked as boolean })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="permit" className="text-sm cursor-pointer flex-1">Avec permis de construire</Label>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background/50 hover:bg-background/80 cursor-pointer transition-colors">
                    <Checkbox 
                      id="mortgage" 
                      checked={filters.hasMortgage || false}
                      onCheckedChange={(checked) => onFiltersChange({ hasMortgage: checked as boolean })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mortgage" className="text-sm cursor-pointer flex-1">Avec hypothèque</Label>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background/50 hover:bg-background/80 cursor-pointer transition-colors">
                    <Checkbox 
                      id="tax" 
                      checked={filters.hasTaxArrears || false}
                      onCheckedChange={(checked) => onFiltersChange({ hasTaxArrears: checked as boolean })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="tax" className="text-sm cursor-pointer flex-1">Avec arriérés fiscaux</Label>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Boutons d'action */}
          <div className="flex gap-2.5 pt-3 mt-3 border-t border-border/50">
            <Button onClick={onSearch} className="flex-1 h-10 text-sm font-semibold rounded-xl shadow-md" size="sm">
              <Filter className="h-4 w-4 mr-1.5" />
              Appliquer
            </Button>
            <Button onClick={onClear} variant="outline" className="flex-1 h-10 text-sm font-semibold rounded-xl" size="sm">
              <X className="h-4 w-4 mr-1.5" />
              Réinitialiser
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdvancedSearchFilters;
