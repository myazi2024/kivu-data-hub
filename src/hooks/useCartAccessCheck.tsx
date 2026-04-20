import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { checkMultipleServiceAccess } from '@/utils/checkServiceAccess';
import type { CadastralCartParcel } from '@/hooks/useCadastralCart';

/**
 * Pour chaque parcelle du panier, batch-check les services déjà payés/accessibles.
 * Retourne une map { [parcelNumber]: Set<serviceId> } + helpers.
 *
 * Se rafraîchit automatiquement sur l'événement `cadastralPaymentCompleted`.
 */
export const useCartAccessCheck = (parcels: CadastralCartParcel[]) => {
  const { user } = useAuth();
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Signature stable des parcelles + services pour éviter les re-fetch inutiles.
  const signature = useMemo(
    () =>
      parcels
        .map((p) => `${p.parcelNumber}:${p.services.map((s) => s.id).sort().join(',')}`)
        .sort()
        .join('|'),
    [parcels]
  );

  const refresh = useCallback(async () => {
    if (!user || parcels.length === 0) {
      setAccessMap({});
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        parcels.map(async (p) => {
          const ids = p.services.map((s) => s.id);
          if (ids.length === 0) return [p.parcelNumber, [] as string[]] as const;
          const owned = await checkMultipleServiceAccess(user.id, p.parcelNumber, ids);
          return [p.parcelNumber, owned] as const;
        })
      );
      const next: Record<string, string[]> = {};
      for (const [pn, owned] of results) next[pn] = owned;
      setAccessMap(next);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, signature]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('cadastralPaymentCompleted', handler);
    return () => window.removeEventListener('cadastralPaymentCompleted', handler);
  }, [refresh]);

  const isOwned = useCallback(
    (parcelNumber: string, serviceId: string) =>
      (accessMap[parcelNumber] || []).includes(serviceId),
    [accessMap]
  );

  const ownedCountFor = useCallback(
    (parcelNumber: string) => (accessMap[parcelNumber] || []).length,
    [accessMap]
  );

  const allOwnedFor = useCallback(
    (parcel: CadastralCartParcel) => {
      const owned = accessMap[parcel.parcelNumber] || [];
      return parcel.services.length > 0 && parcel.services.every((s) => owned.includes(s.id));
    },
    [accessMap]
  );

  return { accessMap, loading, refresh, isOwned, ownedCountFor, allOwnedFor };
};
