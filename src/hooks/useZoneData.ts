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

        // Transformer les données pour correspondre à l'interface ZoneData
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

          return {
            id: zone.id,
            name: zone.name,
            type: zone.zone_type as 'province' | 'ville' | 'commune' | 'quartier' | 'avenue',
            coordinates,
            prixmoyenloyer: Number(zone.prix_moyen_loyer) || 0,
            prixmoyenvente_m2: Number(zone.prix_moyen_vente_m2) || 0,
            tauxvacancelocative: Number(zone.taux_vacance_locative) || 0,
            densite_residentielle: zone.densite_residentielle || 0,
            populationlocativeestimee: zone.population_locative_estimee || 0,
            recetteslocativestheoriques_usd: Number(zone.recettes_locatives_theoriques_usd) || 0,
            variationloyer3mois_pct: Number(zone.variation_loyer_3mois_pct) || 0,
            volumeannoncesmois: zone.volume_annonces_mois || 0,
            typologie_dominante: zone.typologie_dominante || 'Usage mixte',
            indicepressionfonciere: zone.indice_pression_fonciere as 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé',
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