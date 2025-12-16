import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, X, ChevronDown, MapPin, Home, FileText, AlertCircle } from 'lucide-react';
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

  const padding = isCompact ? 'p-1.5' : 'p-3';
  const textSize = isCompact ? 'text-[10px]' : 'text-xs';
  const inputHeight = isCompact ? 'h-7' : 'h-8';
  const gap = isCompact ? 'gap-1' : 'gap-1.5';

  return (
    <Card className={`${padding} bg-white/95 backdrop-blur-sm shadow-lg`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={`w-full justify-between ${inputHeight} ${textSize} font-semibold px-2`}
          >
            <div className="flex items-center gap-1.5">
              <Filter className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              <span>Filtres avancés</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <ChevronDown className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className={`space-y-2 pt-2 ${isCompact ? 'mt-1' : 'mt-1.5'}`}>
          {/* Filtres géographiques */}
          <div className={`space-y-${isCompact ? '1' : '1.5'}`}>
            <div className="flex items-center gap-1">
              <MapPin className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              <Label className={`${textSize} font-semibold`}>Localisation</Label>
            </div>
            <div className={`grid grid-cols-2 ${gap}`}>
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Province</Label>
                <Select value={filters.province || '_all'} onValueChange={(v) => onFiltersChange({ province: v === '_all' ? undefined : v })}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
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
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Ville</Label>
                <Select value={filters.ville || '_all'} onValueChange={(v) => onFiltersChange({ ville: v === '_all' ? undefined : v })} disabled={!filters.province}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
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
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Commune</Label>
                <Select value={filters.commune || '_all'} onValueChange={(v) => onFiltersChange({ commune: v === '_all' ? undefined : v })} disabled={!filters.ville}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
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
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Quartier</Label>
                <Select value={filters.quartier || '_all'} onValueChange={(v) => onFiltersChange({ quartier: v === '_all' ? undefined : v })} disabled={!filters.commune}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
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
          <div className={`space-y-${isCompact ? '1' : '1.5'}`}>
            <div className="flex items-center gap-1">
              <Home className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              <Label className={`${textSize} font-semibold`}>Critères</Label>
            </div>
            <div>
              <Label className={`${textSize} text-muted-foreground`}>Propriétaire</Label>
              <Input
                placeholder="Nom du propriétaire..."
                value={filters.ownerName || ''}
                onChange={(e) => onFiltersChange({ ownerName: e.target.value })}
                className={`${inputHeight} ${textSize}`}
              />
            </div>
            <div className={`grid grid-cols-2 ${gap}`}>
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Surface min (m²)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.areaSqmMin || ''}
                  onChange={(e) => onFiltersChange({ areaSqmMin: Number(e.target.value) })}
                  className={`${inputHeight} ${textSize}`}
                />
              </div>
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Surface max (m²)</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.areaSqmMax || ''}
                  onChange={(e) => onFiltersChange({ areaSqmMax: Number(e.target.value) })}
                  className={`${inputHeight} ${textSize}`}
                />
              </div>
            </div>
            <div className={`grid grid-cols-2 ${gap}`}>
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Type de parcelle</Label>
                <Select value={filters.parcelType || '_all'} onValueChange={(v) => onFiltersChange({ parcelType: v === '_all' ? undefined : v })}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tous</SelectItem>
                    <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                    <SelectItem value="Terrain bâti">Terrain bâti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={`${textSize} text-muted-foreground`}>Type de titre</Label>
                <Select value={filters.titleType || '_all'} onValueChange={(v) => onFiltersChange({ titleType: v === '_all' ? undefined : v })}>
                  <SelectTrigger className={`${inputHeight} ${textSize}`}>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tous</SelectItem>
                    <SelectItem value="Certificat d'enregistrement">Certificat d'enregistrement</SelectItem>
                    <SelectItem value="Titre foncier">Titre foncier</SelectItem>
                    <SelectItem value="Concession">Concession</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Filtres de statut */}
          <div className={`space-y-${isCompact ? '1' : '1.5'}`}>
            <div className="flex items-center gap-1">
              <AlertCircle className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              <Label className={`${textSize} font-semibold`}>Statut</Label>
            </div>
            <div className={`space-y-${isCompact ? '0.5' : '1'}`}>
              <div className="flex items-center gap-1.5">
                <Checkbox 
                  id="permit" 
                  checked={filters.hasBuildingPermit || false}
                  onCheckedChange={(checked) => onFiltersChange({ hasBuildingPermit: checked as boolean })}
                  className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                />
                <Label htmlFor="permit" className={`${textSize} cursor-pointer`}>Avec permis de construire</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox 
                  id="mortgage" 
                  checked={filters.hasMortgage || false}
                  onCheckedChange={(checked) => onFiltersChange({ hasMortgage: checked as boolean })}
                  className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                />
                <Label htmlFor="mortgage" className={`${textSize} cursor-pointer`}>Avec hypothèque</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox 
                  id="tax" 
                  checked={filters.hasTaxArrears || false}
                  onCheckedChange={(checked) => onFiltersChange({ hasTaxArrears: checked as boolean })}
                  className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                />
                <Label htmlFor="tax" className={`${textSize} cursor-pointer`}>Avec arriérés fiscaux</Label>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className={`flex ${gap} pt-1`}>
            <Button onClick={onSearch} className={`flex-1 ${inputHeight} ${textSize} font-semibold`} size="sm">
              <Filter className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
              Appliquer
            </Button>
            <Button onClick={onClear} variant="outline" className={`flex-1 ${inputHeight} ${textSize} font-semibold`} size="sm">
              <X className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
              Réinitialiser
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdvancedSearchFilters;
