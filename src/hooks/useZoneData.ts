import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ZoneData } from '@/components/TerritorialMap';

export const useZoneData = (zoomLevel: string) => {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchZoneData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Construire la requête selon le niveau de zoom
        let query = supabase
          .from('territorial_zones')
          .select('*');

        // Filtrer par type de zone selon le niveau de zoom
        if (zoomLevel !== 'all') {
          if (zoomLevel === 'ville') {
            query = query.in('zone_type', ['ville', 'commune']);
          } else {
            query = query.eq('zone_type', zoomLevel);
          }
        }

        const { data, error: fetchError } = await query.order('name');

        if (fetchError) {
          throw fetchError;
        }

        // Transformer les données avec validation et cohérence
        const transformedZones: ZoneData[] = (data || []).map(zone => {
          // Validation et parsing des coordonnées
          let coordinates: number[][] = [];
          try {
            if (zone.coordinates && Array.isArray(zone.coordinates)) {
              coordinates = zone.coordinates as number[][];
            }
          } catch (error) {
            console.warn(`Erreur parsing coordonnées pour ${zone.name}:`, error);
          }

          // Validation et normalisation des données numériques
          const prixLoyer = Math.max(0, Number(zone.prix_moyen_loyer) || 0);
          const prixVente = Math.max(0, Number(zone.prix_moyen_vente_m2) || 0);
          const tauxVacance = Math.min(100, Math.max(0, Number(zone.taux_vacance_locative) || 0));
          const variation = Number(zone.variation_loyer_3mois_pct) || 0;
          const population = Math.max(0, Number(zone.population_locative_estimee) || 0);
          const recettes = Math.max(0, Number(zone.recettes_locatives_theoriques_usd) || 0);
          const volume = Math.max(0, Number(zone.volume_annonces_mois) || 0);
          const densite = Math.max(0, Number(zone.densite_residentielle) || 0);

          // Validation de la cohérence des données
          const recettesCalculees = prixLoyer * population * 12 * (1 - tauxVacance / 100);
          const recettesFinal = recettes > 0 ? recettes : recettesCalculees;

          // Validation de l'indice de pression
          const pressionValide = ['Faible', 'Modéré', 'Élevé', 'Très élevé'].includes(zone.indice_pression_fonciere) 
            ? zone.indice_pression_fonciere 
            : 'Modéré';

          return {
            id: zone.id,
            name: zone.name || 'Zone inconnue',
            type: zone.zone_type as 'province' | 'ville' | 'commune' | 'quartier' | 'avenue',
            coordinates,
            prixmoyenloyer: prixLoyer,
            prixmoyenvente_m2: prixVente,
            tauxvacancelocative: tauxVacance,
            densite_residentielle: densite,
            populationlocativeestimee: population,
            recetteslocativestheoriques_usd: recettesFinal,
            variationloyer3mois_pct: variation,
            volumeannoncesmois: volume,
            typologie_dominante: zone.typologie_dominante || 'Usage mixte',
            indicepressionfonciere: pressionValide as 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé',
            parent_id: zone.parent_zone_id
          };
        });
        
        setZones(transformedZones);
      } catch (err) {
        setError('Erreur lors du chargement des données territoriales');
        console.error('Erreur zone data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchZoneData();
  }, [zoomLevel]);

  return { zones, loading, error };
};