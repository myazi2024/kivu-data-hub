import { createContext, useContext } from 'react';

/**
 * Onglet analytics propriétaire — utilisé par ChartCard pour construire
 * automatiquement un payload de projection sur la carte RDC.
 *
 * Fourni par ProvinceDataVisualization avec la clé de l'onglet actif.
 */
export const ProjectionTabContext = createContext<string | null>(null);

export const useProjectionTab = () => useContext(ProjectionTabContext);
