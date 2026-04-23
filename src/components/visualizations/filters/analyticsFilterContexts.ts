/**
 * Bidirectional contexts for the analytics filters ↔ map drilldown sync.
 * Extracted from AnalyticsFilters.tsx to keep the orchestrator small.
 */
import { createContext } from 'react';

export const ProvinceFilterContext = createContext<((province: string | undefined) => void) | null>(null);
export const MapProvinceContext = createContext<string | null>(null);

export const VilleFilterContext = createContext<string | null>(null);
export const VilleChangeContext = createContext<((ville: string | undefined) => void) | null>(null);

export const CommuneFilterContext = createContext<string | null>(null);
export const CommuneChangeContext = createContext<((commune: string | undefined) => void) | null>(null);

export const QuartierFilterContext = createContext<string | null>(null);
export const QuartierChangeContext = createContext<((quartier: string | undefined) => void) | null>(null);

export const TerritoireFilterContext = createContext<string | null>(null);
export const TerritoireChangeContext = createContext<((territoire: string | undefined) => void) | null>(null);

export const SectionTypeContext = createContext<string | null>(null);
export const SectionTypeChangeContext = createContext<((sectionType: string) => void) | null>(null);
