import { useEffect, type MutableRefObject } from 'react';
import {
  getVillesForProvince,
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier,
} from '@/lib/geographicData';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';

interface Params {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  isLoadingFromDbRef: MutableRefObject<boolean>;
  setAvailableVilles: (v: string[]) => void;
  setAvailableCommunes: (v: string[]) => void;
  setAvailableTerritoires: (v: string[]) => void;
  setAvailableCollectivites: (v: string[]) => void;
  setAvailableQuartiers: (v: string[]) => void;
  setAvailableAvenues: (v: string[]) => void;
}

/**
 * Geographic cascade: Province → Ville/Territoire → Commune/Collectivité → Quartier → Avenue.
 * Pure side-effects hook — no return value.
 */
export function useGeographicCascade({
  formData,
  handleInputChange,
  isLoadingFromDbRef,
  setAvailableVilles,
  setAvailableCommunes,
  setAvailableTerritoires,
  setAvailableCollectivites,
  setAvailableQuartiers,
  setAvailableAvenues,
}: Params): void {
  // Province → Villes / Territoires
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province) {
      setAvailableVilles(getVillesForProvince(formData.province));
      setAvailableTerritoires(getTerritoiresForProvince(formData.province));
      if (!getVillesForProvince(formData.province).includes(formData.ville || '')) {
        handleInputChange('ville', undefined);
        setAvailableCommunes([]);
        handleInputChange('commune', undefined);
      }
      if (!getTerritoiresForProvince(formData.province).includes(formData.territoire || '')) {
        handleInputChange('territoire', undefined);
        setAvailableCollectivites([]);
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableVilles([]);
      setAvailableCommunes([]);
      setAvailableTerritoires([]);
      setAvailableCollectivites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.province]);

  // Ville → Communes
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville) {
      const communes = getCommunesForVille(formData.province, formData.ville);
      setAvailableCommunes(communes);
      if (!communes.includes(formData.commune || '')) {
        handleInputChange('commune', undefined);
        setAvailableQuartiers([]);
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableCommunes([]);
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.province, formData.ville]);

  // Commune → Quartiers
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville && formData.commune) {
      const quartiers = getQuartiersForCommune(formData.province, formData.ville, formData.commune);
      setAvailableQuartiers(quartiers);
      if (!quartiers.includes(formData.quartier || '')) {
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.province, formData.ville, formData.commune]);

  // Quartier → Avenues
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      const avenues = getAvenuesForQuartier(
        formData.province,
        formData.ville,
        formData.commune,
        formData.quartier,
      );
      setAvailableAvenues(avenues);
      if (!avenues.includes(formData.avenue || '')) handleInputChange('avenue', undefined);
    } else {
      setAvailableAvenues([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  // Territoire → Collectivités
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.territoire) {
      const collectivites = getCollectivitesForTerritoire(formData.province, formData.territoire);
      setAvailableCollectivites(collectivites);
      if (!collectivites.includes(formData.collectivite || '')) handleInputChange('collectivite', undefined);
    } else {
      setAvailableCollectivites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.province, formData.territoire]);
}
