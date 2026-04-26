/**
 * BlockUnscopedRecordsContext — chaque bloc analytics peut exposer ici son
 * jeu de records *avant* application du filtre géographique (province, ville,
 * commune, quartier). Les autres filtres (période, type) restent appliqués.
 *
 * Utilisé par ProjectOnMapButton pour offrir le toggle « Étendre à toutes les
 * provinces » dans le bandeau « Mode visuel » de la carte RDC, lorsque
 * l'utilisateur a déjà sélectionné une province sur la carte.
 *
 * No-op si non fourni : le bouton retombe sur le comportement filtré.
 */
import React, { createContext, useContext } from 'react';

export const BlockUnscopedRecordsContext = createContext<Array<Record<string, unknown>> | null>(null);

export const BlockUnscopedRecordsProvider: React.FC<{
  records: Array<Record<string, unknown>> | null | undefined;
  children: React.ReactNode;
}> = ({ records, children }) => (
  <BlockUnscopedRecordsContext.Provider value={records ?? null}>
    {children}
  </BlockUnscopedRecordsContext.Provider>
);

export function useBlockUnscopedRecords(): Array<Record<string, unknown>> | null {
  return useContext(BlockUnscopedRecordsContext);
}
