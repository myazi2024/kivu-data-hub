/**
 * MapProjectionContext — éphémère, scopé à la page Données foncières (/map).
 *
 * Permet à n'importe quel visuel analytique d'envoyer un jeu de données agrégé
 * par province à la carte RDC, qui alors recolore son choroplèthe, met à jour
 * sa légende et ses KPIs, et affiche un bandeau « Mode visuel : X ».
 *
 * Auto-reset au changement d'onglet analytique (géré dans DRCInteractiveMap).
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ProjectionScope = 'filtered' | 'global';

export interface MapProjection {
  /** Identifiant stable du visuel (utile pour le toggle actif côté bouton) */
  id: string;
  /** Onglet analytics d'origine (utilisé pour l'auto-reset) */
  sourceTab: string;
  /** Libellé court à afficher dans le bandeau et la légende */
  label: string;
  /** Unité optionnelle (ex: "demandes", "USD", "litiges") */
  unit?: string;
  /** Source de données (table SQL principale) — affichée dans le popover info */
  dataSource?: string;
  /** Map<provinceName normalisée, valeur numérique> — dataset filtré (post filtres bloc) */
  byProvince: Record<string, number>;
  /** Optionnel : map<provinceName normalisée, valeur> sans filtre géographique
   *  (province/ville/commune/quartier ignorés). Active le toggle « Étendre à
   *  toutes les provinces » dans le bandeau Mode visuel. */
  byProvinceGlobal?: Record<string, number>;
  /** Indique si le bloc émetteur avait un filtre géographique actif */
  hasGeoFilter?: boolean;
  /** Palette HSL optionnelle [light → dark] pour les 4 tiers adaptatifs */
  palette?: [string, string, string, string];
}

interface MapProjectionContextValue {
  projection: MapProjection | null;
  scope: ProjectionScope;
  setScope: (s: ProjectionScope) => void;
  setProjection: (p: MapProjection | null) => void;
  clearProjection: () => void;
}

const MapProjectionContext = createContext<MapProjectionContextValue | null>(null);

export const MapProjectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projection, setProjectionState] = useState<MapProjection | null>(null);
  const [scope, setScopeState] = useState<ProjectionScope>('filtered');

  const setProjection = useCallback((p: MapProjection | null) => {
    setProjectionState(p);
    // Au (re)changement de projection, repartir sur le scope filtré par défaut.
    setScopeState('filtered');
  }, []);

  const setScope = useCallback((s: ProjectionScope) => setScopeState(s), []);

  const clearProjection = useCallback(() => {
    setProjectionState(null);
    setScopeState('filtered');
  }, []);

  const value = useMemo(
    () => ({ projection, scope, setScope, setProjection, clearProjection }),
    [projection, scope, setScope, setProjection, clearProjection],
  );

  return (
    <MapProjectionContext.Provider value={value}>{children}</MapProjectionContext.Provider>
  );
};

/**
 * Hook safe : ne lève pas si le provider n'est pas monté (ex: dashboard admin).
 * Retourne un no-op pour que les visuels restent réutilisables hors carte RDC.
 */
export function useMapProjection(): MapProjectionContextValue {
  const ctx = useContext(MapProjectionContext);
  if (!ctx) {
    return {
      projection: null,
      scope: 'filtered',
      setScope: () => undefined,
      setProjection: () => undefined,
      clearProjection: () => undefined,
    };
  }
  return ctx;
}
