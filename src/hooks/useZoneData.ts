import { useState, useEffect } from 'react';
import type { ZoneData } from '@/components/TerritorialMap';

// Mock data pour les zones géographiques avec indicateurs
const mockZoneData: ZoneData[] = [
  {
    id: 'goma-1',
    name: 'Quartier Katindo',
    type: 'quartier',
    coordinates: [
      [-1.6672, 29.2248],
      [-1.6682, 29.2348],
      [-1.6772, 29.2348],
      [-1.6772, 29.2248]
    ],
    prixmoyenloyer: 280,
    prixmoyenvente_m2: 650,
    tauxvacancelocative: 26.6,
    densite_residentielle: 320,
    populationlocativeestimee: 2100,
    recetteslocativestheoriques_usd: 35840,
    variationloyer3mois_pct: 4.2,
    volumeannoncesmois: 96,
    typologie_dominante: 'Appartements modernes',
    indicepressionfonciere: 'Élevé'
  },
  {
    id: 'goma-2',
    name: 'Quartier Himbi',
    type: 'quartier',
    coordinates: [
      [-1.6772, 29.2248],
      [-1.6782, 29.2348],
      [-1.6872, 29.2348],
      [-1.6872, 29.2248]
    ],
    prixmoyenloyer: 180,
    prixmoyenvente_m2: 420,
    tauxvacancelocative: 8.3,
    densite_residentielle: 450,
    populationlocativeestimee: 3200,
    recetteslocativestheoriques_usd: 28800,
    variationloyer3mois_pct: 2.1,
    volumeannoncesmois: 142,
    typologie_dominante: 'Maisons individuelles',
    indicepressionfonciere: 'Modéré'
  },
  {
    id: 'goma-3',
    name: 'Quartier Ndosho',
    type: 'quartier',
    coordinates: [
      [-1.6572, 29.2148],
      [-1.6582, 29.2248],
      [-1.6672, 29.2248],
      [-1.6672, 29.2148]
    ],
    prixmoyenloyer: 450,
    prixmoyenvente_m2: 890,
    tauxvacancelocative: 15.2,
    densite_residentielle: 280,
    populationlocativeestimee: 1800,
    recetteslocativestheoriques_usd: 48600,
    variationloyer3mois_pct: 6.8,
    volumeannoncesmois: 78,
    typologie_dominante: 'Immeubles résidentiels',
    indicepressionfonciere: 'Très élevé'
  },
  {
    id: 'goma-4',
    name: 'Quartier Majengo',
    type: 'quartier',
    coordinates: [
      [-1.6872, 29.2248],
      [-1.6882, 29.2348],
      [-1.6972, 29.2348],
      [-1.6972, 29.2248]
    ],
    prixmoyenloyer: 120,
    prixmoyenvente_m2: 280,
    tauxvacancelocative: 42.1,
    densite_residentielle: 620,
    populationlocativeestimee: 4500,
    recetteslocativestheoriques_usd: 19800,
    variationloyer3mois_pct: -1.2,
    volumeannoncesmois: 203,
    typologie_dominante: 'Usage mixte',
    indicepressionfonciere: 'Faible'
  },
  {
    id: 'goma-5',
    name: 'Quartier Kahembe',
    type: 'quartier',
    coordinates: [
      [-1.6472, 29.2048],
      [-1.6482, 29.2148],
      [-1.6572, 29.2148],
      [-1.6572, 29.2048]
    ],
    prixmoyenloyer: 320,
    prixmoyenvente_m2: 720,
    tauxvacancelocative: 18.7,
    densite_residentielle: 390,
    populationlocativeestimee: 2600,
    recetteslocativestheoriques_usd: 41280,
    variationloyer3mois_pct: 3.5,
    volumeannoncesmois: 89,
    typologie_dominante: 'Appartements modernes',
    indicepressionfonciere: 'Élevé'
  },
  // Zones pour Kinshasa
  {
    id: 'kinshasa-1',
    name: 'Commune de Gombe',
    type: 'commune',
    coordinates: [
      [-4.4319, 15.2563],
      [-4.4329, 15.2663],
      [-4.4419, 15.2663],
      [-4.4419, 15.2563]
    ],
    prixmoyenloyer: 850,
    prixmoyenvente_m2: 1800,
    tauxvacancelocative: 12.4,
    densite_residentielle: 180,
    populationlocativeestimee: 85000,
    recetteslocativestheoriques_usd: 2890000,
    variationloyer3mois_pct: 8.2,
    volumeannoncesmois: 456,
    typologie_dominante: 'Immeubles de bureaux',
    indicepressionfonciere: 'Très élevé'
  },
  {
    id: 'kinshasa-2',
    name: 'Commune de Kalamu',
    type: 'commune',
    coordinates: [
      [-4.4419, 15.2563],
      [-4.4429, 15.2663],
      [-4.4519, 15.2663],
      [-4.4519, 15.2563]
    ],
    prixmoyenloyer: 220,
    prixmoyenvente_m2: 480,
    tauxvacancelocative: 28.9,
    densite_residentielle: 890,
    populationlocativeestimee: 340000,
    recetteslocativestheoriques_usd: 1456000,
    variationloyer3mois_pct: 1.8,
    volumeannoncesmois: 789,
    typologie_dominante: 'Maisons populaires',
    indicepressionfonciere: 'Modéré'
  }
];

export const useZoneData = (zoomLevel: string) => {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchZoneData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simuler un délai d'API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Filtrer les données selon le niveau de zoom
        let filteredZones = mockZoneData;
        
        switch (zoomLevel) {
          case 'province':
            filteredZones = mockZoneData.filter(zone => zone.type === 'province');
            break;
          case 'ville':
            filteredZones = mockZoneData.filter(zone => zone.type === 'ville' || zone.type === 'commune');
            break;
          case 'commune':
            filteredZones = mockZoneData.filter(zone => zone.type === 'commune');
            break;
          case 'quartier':
            filteredZones = mockZoneData.filter(zone => zone.type === 'quartier');
            break;
          case 'avenue':
            filteredZones = mockZoneData.filter(zone => zone.type === 'avenue');
            break;
          default:
            filteredZones = mockZoneData;
        }
        
        setZones(filteredZones);
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