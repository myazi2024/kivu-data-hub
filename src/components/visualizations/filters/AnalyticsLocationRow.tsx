/**
 * Location row of AnalyticsFilters: Pays › Province › Circonscription › urban OR rural cascade.
 *
 * Pure presentational — receives precomputed cascade lists from useAnalyticsCascade.
 */
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { AnalyticsFilter } from '@/utils/analyticsHelpers';
import { getSectionTypeForLandDistrict } from '@/lib/geographicData';

const selectCls = 'h-6 text-[10px] w-auto min-w-[70px]';
const sep = <span className="text-[10px] text-muted-foreground">›</span>;

interface Props {
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  // Cascade-derived lists
  provinces: string[];
  landDistricts: string[];
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
  onLandDistrictChange?: (district: string | undefined) => void;
}

export const AnalyticsLocationRow: React.FC<Props> = ({
  filter, onChange,
  provinces, landDistricts, villes, communesFinal, quartiersFinal, avenuesFinal,
  territoiresFinal, collectivitesFinal, groupements, villages,
  hasUrbanData, hasRuralData,
  onProvinceFilter, onVilleChange, onCommuneChange, onQuartierChange, onTerritoireChange,
  onSectionTypeChange, onLandDistrictChange,
}) => {
  // Même logique que l'onglet Localisation du CCC :
  // Province → Circonscription → zone (déduite, sinon choisie) → niveaux urbains OU ruraux.
  void hasUrbanData; void hasRuralData;
  const districtZone = filter.landDistrict ? getSectionTypeForLandDistrict(filter.landDistrict) : '';
  const needsManualZone = !!filter.landDistrict && !districtZone;
  const showUrbanSub = filter.sectionType === 'urbaine' && (!!filter.landDistrict || !!filter.ville);
  const showRuralSub = filter.sectionType === 'rurale' && (!!filter.landDistrict || !!filter.territoire);
  const clearSub = {
    ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
    territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
  };

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
            landDistrict: undefined,
            ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
            territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
          });
          onProvinceFilter(newProvince);
          onLandDistrictChange?.(undefined);
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
        value={filter.landDistrict || '__all__'}
        onValueChange={(v) => {
          const district = v === '__all__' ? undefined : v;
          const zone = district ? getSectionTypeForLandDistrict(district) : '';
          const sectionType = (zone || 'all') as AnalyticsFilter['sectionType'];
          onChange({
            ...filter,
            landDistrict: district,
            sectionType,
            ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
            territoire: undefined, collectivite: undefined, groupement: undefined, villageFilter: undefined,
          });
          onVilleChange(undefined);
          onCommuneChange(undefined);
          onSectionTypeChange?.(sectionType);
          onLandDistrictChange?.(district);
        }}
      >
        <SelectTrigger className={selectCls} aria-label="Circonscription foncière" disabled={!filter.province}>
          <SelectValue placeholder={filter.province ? 'Circonscription' : "Province d'abord"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les circonscriptions</SelectItem>
          {landDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
        </SelectContent>
      </Select>

      {filter.landDistrict && districtZone && (
        <>
          {sep}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium" aria-label="Zone auto-détectée depuis la circonscription">
            {districtZone === 'urbaine' ? 'SU - Urbaine' : 'SR - Rurale'}
          </Badge>
          <span className="text-[9px] text-muted-foreground italic">auto-détecté</span>
        </>
      )}

      {needsManualZone && (
        <>
          {sep}
          <Select
            value={filter.sectionType === 'all' ? '__none__' : filter.sectionType}
            onValueChange={(v) => {
              const sectionType = (v === '__none__' ? 'all' : v) as AnalyticsFilter['sectionType'];
              onChange({ ...filter, sectionType, ...clearSub });
              onVilleChange(undefined);
              onCommuneChange(undefined);
              onSectionTypeChange?.(sectionType);
            }}
          >
            <SelectTrigger className={selectCls} aria-label="Zone"><SelectValue placeholder="Zone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Zone</SelectItem>
              <SelectItem value="urbaine">Urbaine</SelectItem>
              <SelectItem value="rurale">Rurale</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {showUrbanSub && (
        <>
          {(
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
                <SelectTrigger className={selectCls} disabled={villes.length === 0}><SelectValue placeholder={villes.length ? 'Ville' : 'Aucune ville'} /></SelectTrigger>
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
            <SelectTrigger className={selectCls} disabled={territoiresFinal.length === 0}><SelectValue placeholder={territoiresFinal.length ? 'Territoire' : 'Aucun territoire'} /></SelectTrigger>
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
