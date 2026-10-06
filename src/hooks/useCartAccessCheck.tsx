import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { CadastralCartParcel } from '@/hooks/useCadastralCart';

/**
 * Pour chaque parcelle du panier, batch-check les services déjà payés/accessibles.
 * Source unique des « services déjà acquis » du panier (badges, totaux, exclusion du paiement).
 * Retourne { [parcelNumber]: { [serviceId]: expiresAt | null } } + helpers.
 *
 * Se rafraîchit automatiquement sur l'événement `cadastralPaymentCompleted`.
 */
export const useCartAccessCheck = (parcels: CadastralCartParcel[]) => {
  const { user } = useAuth();
  const [accessMap, setAccessMap] = useState<Record<string, Record<string, string | null>>>({});
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
      // Fix: 1 seule requête batch (au lieu de N requêtes parallèles)
      const parcelNumbers = parcels.map((p) => p.parcelNumber);
      const allServiceIds = Array.from(
        new Set(parcels.flatMap((p) => p.services.map((s) => s.id)))
      );
      const next: Record<string, Record<string, string | null>> = {};
      parcels.forEach((p) => { next[p.parcelNumber] = {}; });

      if (parcelNumbers.length > 0 && allServiceIds.length > 0) {
        const { data, error } = await supabase
          .from('cadastral_service_access')
          .select('parcel_number, service_type, expires_at')
          .eq('user_id', user.id)
          .in('parcel_number', parcelNumbers)
          .in('service_type', allServiceIds);

        if (!error && data) {
          const now = Date.now();
          for (const row of data) {
            if (row.expires_at && new Date(row.expires_at).getTime() <= now) continue;
            const owned = next[row.parcel_number];
            if (owned) owned[row.service_type] = row.expires_at ?? null;
          }
        }
      }
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
    (parcelNumber: string, serviceId: string) => !!accessMap[parcelNumber] && serviceId in accessMap[parcelNumber],
    [accessMap]
  );

  /** Date de fin d'accès d'un service acquis (null = accès sans limite). */
  const ownedUntil = useCallback(
    (parcelNumber: string, serviceId: string) => accessMap[parcelNumber]?.[serviceId] ?? null,
    [accessMap]
  );

  const allOwnedFor = useCallback(
    (parcel: CadastralCartParcel) =>
      parcel.services.length > 0 && parcel.services.every((s) => isOwned(parcel.parcelNumber, s.id)),
    [isOwned]
  );

  return { loading, refresh, isOwned, ownedUntil, allOwnedFor };
};
