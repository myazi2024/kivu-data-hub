/**
 * Logique d'approbation d'une contribution CCC partagée entre l'approbation
 * unitaire et l'approbation en masse, afin que les deux chemins produisent
 * exactement les mêmes données (statut + parcelle + historiques + hypothèques).
 *
 * Les inserts sont groupés (un appel par table) pour limiter les allers-retours
 * et éviter les échecs partiels ligne par ligne.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  OwnershipHistoryEntry, BoundaryHistoryEntry, BuildingPermitEntry, MortgageHistoryEntry,
} from './cccHelpers';
import { readField as rr } from './cccHelpers';
import type { ValidationResult } from './types';

export interface ApproveOutcome {
  ok: boolean;
  isUpdateContribution: boolean;
  /** Erreurs non bloquantes (historiques partiellement insérés). */
  warnings: string[];
  error?: string;
}

const asArray = (v: unknown): any[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];

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
  let targetParcelId: string;

  if (isUpdateContribution) {
    // La parcelle existante est synchronisée par le trigger DB.
    targetParcelId = updated.original_parcel_id as string;
  } else {
    // La parcelle est créée par le trigger DB ; on récupère son id.
    const { data: createdParcel, error: parcelFetchError } = await supabase
      .from('cadastral_parcels')
      .select('id')
      .eq('parcel_number', updated.parcel_number)
      .maybeSingle();

    if (parcelFetchError || !createdParcel) {
      return {
        ok: false,
        isUpdateContribution,
        warnings,
        error: 'Contribution approuvée mais parcelle introuvable.',
      };
    }
    targetParcelId = createdParcel.id;

    const ownershipRows = asArray(updated.ownership_history).map((raw: OwnershipHistoryEntry) => ({
      parcel_id: targetParcelId,
      owner_name: raw.owner_name,
      legal_status: raw.legal_status,
      ownership_start_date: raw.ownership_start_date,
      ownership_end_date: raw.ownership_end_date,
      mutation_type: raw.mutation_type,
      ownership_document_url: raw.ownership_document_url,
    }));
    if (ownershipRows.length > 0) {
      const { error: e } = await supabase.from('cadastral_ownership_history').insert(ownershipRows);
      if (e) { console.error('Erreur historique propriété:', e); warnings.push('propriété'); }
    }

    const boundaryRows = asArray(updated.boundary_history).map((raw: BoundaryHistoryEntry) => ({
      parcel_id: targetParcelId,
      pv_reference_number: raw.pv_reference_number,
      boundary_purpose: raw.boundary_purpose,
      surveyor_name: raw.surveyor_name,
      survey_date: raw.survey_date,
      boundary_document_url: raw.boundary_document_url,
    }));
    if (boundaryRows.length > 0) {
      const { error: e } = await supabase.from('cadastral_boundary_history').insert(boundaryRows);
      if (e) { console.error('Erreur historique bornage:', e); warnings.push('bornage'); }
    }

    const taxRows = asArray(updated.tax_history).map((h: any) => ({
      parcel_id: targetParcelId,
      tax_year: Number(rr(h, 'tax_year', 'taxYear')),
      amount_usd: Number(rr(h, 'amount_usd', 'amountUsd')) || 0,
      payment_status: rr(h, 'payment_status', 'paymentStatus') || 'En attente',
      payment_date: rr(h, 'payment_date', 'paymentDate'),
      receipt_document_url: rr(h, 'receipt_document_url', 'receiptDocumentUrl'),
    }));
    if (taxRows.length > 0) {
      const { error: e } = await supabase.from('cadastral_tax_history').insert(taxRows);
      if (e) { console.error('Erreur historique taxes:', e); warnings.push('taxes'); }
    }

    const permitRows = asArray(updated.building_permits).map((p: BuildingPermitEntry) => ({
      parcel_id: targetParcelId,
      permit_number: p.permit_number,
      issuing_service: p.issuing_service,
      issue_date: p.issue_date,
      validity_period_months: p.validity_period_months,
      administrative_status: p.administrative_status,
      is_current: p.is_current,
      issuing_service_contact: p.issuing_service_contact,
      permit_document_url: p.permit_document_url,
    }));
    if (permitRows.length > 0) {
      const { error: e } = await supabase.from('cadastral_building_permits').insert(permitRows);
      if (e) { console.error('Erreur autorisations de bâtir:', e); warnings.push('permis'); }
    }
  }

  // Hypothèques : nouvelles contributions ET mises à jour
  const mortgageRows = asArray(updated.mortgage_history).map((h: MortgageHistoryEntry) => ({
    parcel_id: targetParcelId,
    mortgage_amount_usd: h.mortgage_amount_usd || h.mortgageAmountUsd || 0,
    duration_months: h.duration_months || h.durationMonths || 0,
    creditor_name: h.creditor_name || h.creditorName || 'Non spécifié',
    creditor_type: h.creditor_type || h.creditorType || 'Banque',
    contract_date: h.contract_date || h.contractDate || new Date().toISOString().split('T')[0],
    mortgage_status: (h.mortgage_status || h.mortgageStatus || 'active').toLowerCase(),
  }));
  if (mortgageRows.length > 0) {
    const { error: e } = await supabase.from('cadastral_mortgages').insert(mortgageRows);
    if (e) { console.error('Erreur hypothèques:', e); warnings.push('hypothèques'); }
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
