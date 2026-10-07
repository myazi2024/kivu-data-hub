import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelExpertiseCertificate {
  id: string;
  reference_number: string;
  certificate_issue_date: string;
  certificate_expiry_date: string;
  /** Prix d'accès fixé dans la grille admin (null si non configuré). */
  access_fee_usd: number | null;
  /** L'utilisateur est le demandeur de cette expertise. */
  is_owner: boolean;
  /** Demandeur, expert/admin ou acheteur de l'accès. */
  has_access: boolean;
  /** Valeur vénale : renvoyée par le serveur uniquement si has_access. */
  market_value_usd: number | null;
}

export const parcelCertificateQueryKey = (parcelNumber: string) =>
  ['parcel-valid-expertise-certificate', parcelNumber] as const;

/**
 * Certificat d'expertise valide d'une parcelle, calculé par le serveur
 * (`get_parcel_valid_expertise_certificate`). Aucune donnée sensible n'est
 * renvoyée avant l'achat de l'accès.
 */
export function useParcelExpertiseCertificate(parcelNumber: string, enabled: boolean) {
  return useQuery({
    queryKey: parcelCertificateQueryKey(parcelNumber),
    enabled: enabled && !!parcelNumber,
    staleTime: 30_000,
    queryFn: async (): Promise<ParcelExpertiseCertificate | null> => {
      const { data, error } = await (supabase as any).rpc('get_parcel_valid_expertise_certificate', {
        p_parcel_number: parcelNumber,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) return null;
      return {
        id: row.id,
        reference_number: row.reference_number,
        certificate_issue_date: row.certificate_issue_date,
        certificate_expiry_date: row.certificate_expiry_date,
        access_fee_usd: row.access_fee_usd == null ? null : Number(row.access_fee_usd),
        is_owner: Boolean(row.is_owner),
        has_access: Boolean(row.has_access),
        market_value_usd: row.market_value_usd == null ? null : Number(row.market_value_usd),
      };
    },
  });
}

/** Jours restants avant expiration (0 si expiré). */
export function certificateDaysRemaining(expiryDate: string, now: Date = new Date()): number {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return 0;
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000));
}
