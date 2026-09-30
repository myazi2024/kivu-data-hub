import { useQuery } from '@tanstack/react-query';

export interface HomeBicCountsResponse {
  parcels_count?: number;
  services_count?: number;
  disputes_count?: number;
  parcels_by_district?: Record<string, number>;
  services_by_district?: Record<string, number>;
  disputes_by_district?: Record<string, number>;
}

/** Single shared fetch of the public home aggregates (map + footer). */
export function useHomeBicCounts() {
  return useQuery({
    queryKey: ['home-bic-counts'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }): Promise<HomeBicCountsResponse> => {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!baseUrl || !publicKey) throw new Error('Configuration manquante');
      const response = await fetch(`${baseUrl}/functions/v1/home-bic-counts`, { signal, headers: { apikey: publicKey } });
      if (!response.ok) throw new Error('Compteurs indisponibles');
      return response.json();
    },
  });
}
