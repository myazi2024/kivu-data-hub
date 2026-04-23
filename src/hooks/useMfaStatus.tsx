import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
}

export interface MfaStatus {
  loading: boolean;
  /** AAL courant de la session: 'aal1' (mot de passe) ou 'aal2' (MFA validé) */
  currentLevel: 'aal1' | 'aal2' | null;
  /** AAL maximal possible pour ce user (a-t-il un facteur vérifié ?) */
  nextLevel: 'aal1' | 'aal2' | null;
  /** True si au moins un facteur TOTP est vérifié */
  hasVerifiedFactor: boolean;
  factors: MfaFactor[];
  refresh: () => Promise<void>;
}

/**
 * Hook centralisant l'état MFA Supabase pour le user courant.
 * Combine `getAuthenticatorAssuranceLevel` et `listFactors`.
 */
export function useMfaStatus(): MfaStatus {
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [nextLevel, setNextLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [factors, setFactors] = useState<MfaFactor[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: aalData }, { data: factorsData }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      setCurrentLevel((aalData?.currentLevel as any) ?? null);
      setNextLevel((aalData?.nextLevel as any) ?? null);

      const totp = (factorsData?.totp ?? []) as MfaFactor[];
      const all = (factorsData?.all ?? []) as MfaFactor[];
      // Prefer the curated TOTP list when provided, otherwise fall back to all
      setFactors(totp.length > 0 ? totp : all.filter((f) => f.factor_type === 'totp'));
    } catch (err) {
      console.error('useMfaStatus error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const hasVerifiedFactor = factors.some((f) => f.status === 'verified');

  return { loading, currentLevel, nextLevel, hasVerifiedFactor, factors, refresh };
}
