/**
 * Location row of AnalyticsFilters: Pays › Province › Section › urban OR rural cascade.
 *
 * Pure presentational — receives precomputed cascade lists from useAnalyticsCascade.
 */
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { AnalyticsFilter } from '@/utils/analyticsHelpers';

const selectCls = 'h-6 text-[10px] w-auto min-w-[70px]';
const sep = <span className="text-[10px] text-muted-foreground">›</span>;

interface Props {
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  // Cascade-derived lists
  provinces: string[];
  villes: string[];
  communesFinal: string[];
  quartiersFinal: string[];
  avenuesFinal: string[];
  territoiresFinal: string[];
  collectivitesFinal: string[];
  groupements: string[];
  villages: string[];
  hasUrbanData: boolean;
  hasRuralData: boolean;
  // Side-effect handlers shared with the map
  onProvinceFilter: (province: string | undefined) => void;
  onVilleChange: (ville: string | undefined) => void;
  onCommuneChange: (commune: string | undefined) => void;
  onQuartierChange: (quartier: string | undefined) => void;
  onTerritoireChange: (territoire: string | undefined) => void;
  onSectionTypeChange?: (sectionType: string) => void;
}

export const AnalyticsLocationRow: React.FC<Props> = ({
  filter, onChange,
  provinces, villes, communesFinal, quartiersFinal, avenuesFinal,
  territoiresFinal, collectivitesFinal, groupements, villages,
  hasUrbanData, hasRuralData,
  onProvinceFilter, onVilleChange, onCommuneChange, onQuartierChange, onTerritoireChange,
  onSectionTypeChange,
}) => {
  const showUrbanSub =
    filter.sectionType === 'urbaine' || (filter.sectionType === 'all' && hasUrbanData && !hasRuralData);
  const showRuralSub =
    filter.sectionType === 'rurale' || (filter.sectionType === 'all' && hasRuralData && !hasUrbanData);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0">
        <MapPin className="h-2.5 w-2.5" /> Lieu
      </Badge>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
        Rép. Dém. du Congo
      </Badge>

      {sep}
      <Select
        value={filter.province || '__all__'}
        onValueChange={(v) => {
          const newProvince = v === '__all__' ? undefined : v;
          onChange({
            ...filter,
            province: newProvince,
            sectionType: 'all',
            ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
            territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
          });
          onProvinceFilter(newProvince);
          onVilleChange(undefined);
          onCommuneChange(undefined);
        }}
      >
        <SelectTrigger className={selectCls}><SelectValue placeholder="Province" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les provinces</SelectItem>
          {provinces.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
        </SelectContent>
      </Select>

      {sep}
      <Select
        value={filter.sectionType}
        onValueChange={(v) => {
          onChange({
            ...filter,
            sectionType: v as any,
            ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
            territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
          });
          onVilleChange(undefined);
          onCommuneChange(undefined);
          onSectionTypeChange?.(v);
        }}
      >
        <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les sections</SelectItem>
          <SelectItem value="urbaine">Urbaine</SelectItem>
          <SelectItem value="rurale">Rurale</SelectItem>
        </SelectContent>
      </Select>

      {showUrbanSub && (
        <>
          {villes.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.ville || '__all__'}
                onValueChange={(v) => {
                  const newVille = v === '__all__' ? undefined : v;
                  onChange({ ...filter, ville: newVille, commune: undefined, quartier: undefined, avenue: undefined });
                  onVilleChange(newVille);
                  onCommuneChange(undefined);
                  onQuartierChange(undefined);
                }}
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Ville" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les villes</SelectItem>
                  {villes.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.ville && communesFinal.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.commune || '__all__'}
                onValueChange={(v) => {
                  const newCommune = v === '__all__' ? undefined : v;
                  onChange({ ...filter, commune: newCommune, quartier: undefined, avenue: undefined });
                  onCommuneChange(newCommune);
                  onQuartierChange(undefined);
                }}
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Commune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les communes</SelectItem>
                  {communesFinal.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.commune && quartiersFinal.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.quartier || '__all__'}
                onValueChange={(v) => {
                  const newQuartier = v === '__all__' ? undefined : v;
                  onChange({ ...filter, quartier: newQuartier, avenue: undefined });
                  onQuartierChange(newQuartier);
                }}
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Quartier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les quartiers</SelectItem>
                  {quartiersFinal.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.quartier && avenuesFinal.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.avenue || '__all__'}
                onValueChange={(v) =>
                  onChange({ ...filter, avenue: v === '__all__' ? undefined : v })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Avenue" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les avenues</SelectItem>
                  {avenuesFinal.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}
        </>
      )}

      {showRuralSub && (
        <>
          {sep}
          <Select
            value={filter.territoire || '__all__'}
            onValueChange={(v) => {
              const newTerritoire = v === '__all__' ? undefined : v;
              onChange({
                ...filter,
                territoire: newTerritoire,
                collectivite: undefined, groupement: undefined, villageFilter: undefined,
              });
              onTerritoireChange(newTerritoire);
            }}
          >
            <SelectTrigger className={selectCls}><SelectValue placeholder="Territoire" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les territoires</SelectItem>
              {territoiresFinal.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
            </SelectContent>
          </Select>

          {filter.territoire && collectivitesFinal.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.collectivite || '__all__'}
                onValueChange={(v) =>
                  onChange({
                    ...filter,
                    collectivite: v === '__all__' ? undefined : v,
                    groupement: undefined, villageFilter: undefined,
                  })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Collectivité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les collectivités</SelectItem>
                  {collectivitesFinal.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.collectivite && groupements.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.groupement || '__all__'}
                onValueChange={(v) =>
                  onChange({
                    ...filter,
                    groupement: v === '__all__' ? undefined : v,
                    villageFilter: undefined,
                  })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Groupement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les groupements</SelectItem>
                  {groupements.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {filter.groupement && villages.length > 0 && (
            <>
              {sep}
              <Select
                value={filter.villageFilter || '__all__'}
                onValueChange={(v) =>
                  onChange({ ...filter, villageFilter: v === '__all__' ? undefined : v })
                }
              >
                <SelectTrigger className={selectCls}><SelectValue placeholder="Village" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les villages</SelectItem>
                  {villages.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}
        </>
      )}
    </div>
  );
};
