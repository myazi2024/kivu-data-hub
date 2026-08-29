/**
 * Logique d'approbation d'une contribution CCC partagée entre l'approbation
 * unitaire et l'approbation en masse, afin que les deux chemins produisent
 * exactement les mêmes données.
 *
 * La parcelle et les historiques normalisés sont écrits par le trigger DB
 * `sync_approved_contribution_to_parcel` : ce module se limite au changement
 * de statut et au contrôle de cohérence.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ValidationResult } from './types';

export interface ApproveOutcome {
  ok: boolean;
  isUpdateContribution: boolean;
  /** Erreurs non bloquantes (historiques partiellement insérés). */
  warnings: string[];
  error?: string;
}

export const approveContributionCore = async (
  contributionId: string,
  userId: string,
): Promise<ApproveOutcome> => {
  const warnings: string[] = [];

  const { data: updated, error } = await supabase
    .from('cadastral_contributions')
    .update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      verified_by: userId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', contributionId)
    .select()
    .single();

  if (error || !updated) {
    return {
      ok: false,
      isUpdateContribution: false,
      warnings,
      error: [error?.message, error?.details, error?.hint].filter(Boolean).join(' — ') || 'Échec de l\'approbation',
    };
  }

  const isUpdateContribution = updated.contribution_type === 'update' && !!updated.original_parcel_id;

  // Les historiques normalisés (propriété, bornage, taxes, hypothèques,
  // autorisations de bâtir) sont insérés par le trigger DB
  // `sync_approved_contribution_to_parcel`, avec gardes anti-doublon.
  // Ne rien réinsérer ici sous peine de doublons.
  if (!isUpdateContribution) {
    const { data: createdParcel, error: parcelFetchError } = await supabase
      .from('cadastral_parcels')
      .select('id')
      .eq('parcel_number', updated.parcel_number)
      .is('deleted_at', null)
      .maybeSingle();

    if (parcelFetchError || !createdParcel) {
      return {
        ok: false,
        isUpdateContribution,
        warnings,
        error: 'Contribution approuvée mais parcelle introuvable.',
      };
    }
  }

  return { ok: true, isUpdateContribution, warnings };
};

/** Valide une contribution côté serveur avant approbation. */
export const validateContribution = async (contributionId: string): Promise<ValidationResult> => {
  const { data, error } = await supabase.rpc('validate_contribution_completeness', {
    contribution_id: contributionId,
  });
  if (error) throw error;
  return data as unknown as ValidationResult;
};
