import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, X, ChevronDown, MapPin, Home, AlertCircle } from 'lucide-react';
import { SearchFilters } from '@/hooks/useAdvancedCadastralSearch';
import { supabase } from '@/integrations/supabase/client';

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
  const [provinces, setProvinces] = useState<string[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [quartiers, setQuartiers] = useState<string[]>([]);

  // Charger les options géographiques dynamiquement
  useEffect(() => {
    const loadGeographicOptions = async () => {
      const { data } = await supabase
        .from('cadastral_parcels')
        .select('province, ville, commune, quartier')
        .not('province', 'is', null);
      
      if (data) {
        const uniqueProvinces = [...new Set(data.map(d => d.province).filter(Boolean))] as string[];
        setProvinces(uniqueProvinces);
      }
    };
    
    loadGeographicOptions();
  }, []);

  // Charger villes quand province change
  useEffect(() => {
    if (filters.province) {
      const loadVilles = async () => {
        const { data } = await supabase
          .from('cadastral_parcels')
          .select('ville')
          .eq('province', filters.province)
          .not('ville', 'is', null);
        
        if (data) {
          const uniqueVilles = [...new Set(data.map(d => d.ville).filter(Boolean))] as string[];
          setVilles(uniqueVilles);
        }
      };
      loadVilles();
    } else {
      setVilles([]);
    }
  }, [filters.province]);

  // Charger communes quand ville change
  useEffect(() => {
    if (filters.ville) {
      const loadCommunes = async () => {
        const { data } = await supabase
          .from('cadastral_parcels')
          .select('commune')
          .eq('ville', filters.ville)
          .not('commune', 'is', null);
        
        if (data) {
          const uniqueCommunes = [...new Set(data.map(d => d.commune).filter(Boolean))] as string[];
          setCommunes(uniqueCommunes);
        }
      };
      loadCommunes();
    } else {
      setCommunes([]);
    }
  }, [filters.ville]);

  // Charger quartiers quand commune change
  useEffect(() => {
    if (filters.commune) {
      const loadQuartiers = async () => {
        const { data } = await supabase
          .from('cadastral_parcels')
          .select('quartier')
          .eq('commune', filters.commune)
          .not('quartier', 'is', null);
        
        if (data) {
          const uniqueQuartiers = [...new Set(data.map(d => d.quartier).filter(Boolean))] as string[];
          setQuartiers(uniqueQuartiers);
        }
      };
      loadQuartiers();
    } else {
      setQuartiers([]);
    }
  }, [filters.commune]);

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
          <ScrollArea className="h-[280px] pr-3">
            <div className="space-y-4">
              {/* Filtres géographiques */}
              <div className="p-3 rounded-xl bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Label className="text-sm font-semibold">Localisation</Label>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Province</Label>
                    <Select value={filters.province || '_all'} onValueChange={(v) => onFiltersChange({ province: v === '_all' ? undefined : v })}>
                      <SelectTrigger className="h-10 text-sm rounded-xl">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Toutes</SelectItem>
                        {provinces.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Ville</Label>
                    <Select value={filters.ville || '_all'} onValueChange={(v) => onFiltersChange({ ville: v === '_all' ? undefined : v })} disabled={!filters.province}>
                      <SelectTrigger className="h-10 text-sm rounded-xl">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Toutes</SelectItem>
                        {villes.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Commune</Label>
                    <Select value={filters.commune || '_all'} onValueChange={(v) => onFiltersChange({ commune: v === '_all' ? undefined : v })} disabled={!filters.ville}>
                      <SelectTrigger className="h-10 text-sm rounded-xl">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Toutes</SelectItem>
                        {communes.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Quartier</Label>
                    <Select value={filters.quartier || '_all'} onValueChange={(v) => onFiltersChange({ quartier: v === '_all' ? undefined : v })} disabled={!filters.commune}>
                      <SelectTrigger className="h-10 text-sm rounded-xl">
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Tous</SelectItem>
                        {quartiers.map(q => (
                          <SelectItem key={q} value={q}>{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
