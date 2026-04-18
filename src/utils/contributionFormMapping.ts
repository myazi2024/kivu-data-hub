/**
 * Pure mapping utilities for cadastral contributions.
 * Converts snake_case DB rows to the camelCase draft shape consumed by
 * `CadastralContributionDialog` (loaded via localStorage).
 *
 * Extracted from UserContributions.tsx for testability and to remove the
 * 30+ `as any` casts in the original 100-line inline mapping.
 */

export type FormType = 'ccc' | 'tax' | 'mortgage' | 'permit';

/** Minimal shape used here — accepts the loose DB row. */
export interface ContributionRow {
  id: string;
  parcel_number: string;
  source_form_type?: string | null;
  contribution_type?: string | null;
  property_title_type?: string | null;
  current_owner_name?: string | null;
  area_sqm?: number | null;
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  quartier?: string | null;
  avenue?: string | null;
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
  village?: string | null;
  title_reference_number?: string | null;
  title_issue_date?: string | null;
  lease_type?: string | null;
  declared_usage?: string | null;
  construction_nature?: string | null;
  construction_type?: string | null;
  construction_year?: number | null;
  whatsapp_number?: string | null;
  is_title_in_current_owner_name?: boolean | null;
  current_owner_legal_status?: string | null;
  current_owner_since?: string | null;
  current_owners_details?: any;
  ownership_history?: any;
  tax_history?: any;
  mortgage_history?: any;
  building_permits?: any;
  permit_request_data?: any;
  gps_coordinates?: any;
  parcel_sides?: any;
  parcel_type?: string | null;
  boundary_history?: any;
}

/**
 * Detect the original form type used to submit a contribution.
 * Prefers the persisted `source_form_type` column when available; falls back
 * to a content-based heuristic for legacy rows that pre-date the column.
 */
export function detectFormType(c: ContributionRow): FormType {
  if (c.source_form_type === 'ccc' || c.source_form_type === 'tax' ||
      c.source_form_type === 'mortgage' || c.source_form_type === 'permit') {
    return c.source_form_type;
  }
  // Legacy heuristic — kept for backward compatibility.
  const hasOwnerDetails = !!(c.current_owner_name && c.property_title_type);
  const hasTax = Array.isArray(c.tax_history) && c.tax_history.length > 0;
  const hasMortgage = Array.isArray(c.mortgage_history) && c.mortgage_history.length > 0;
  const hasPermit = Array.isArray(c.building_permits) && c.building_permits.length > 0;
  if (hasTax && !hasMortgage && !hasPermit && !hasOwnerDetails) return 'tax';
  if (hasMortgage && !hasTax && !hasPermit && !hasOwnerDetails) return 'mortgage';
  if (hasPermit && !hasTax && !hasMortgage && !hasOwnerDetails) return 'permit';
  return 'ccc';
}

/**
 * Convert a contribution DB row into the localStorage draft format expected
 * by CadastralContributionDialog's `loadFormDataFromStorage()`.
 */
export function mapContributionToFormDraft(c: ContributionRow) {
  const ownersFromDetails = Array.isArray(c.current_owners_details) ? c.current_owners_details : [];
  return {
    formData: {
      parcelNumber: c.parcel_number,
      propertyTitleType: c.property_title_type ?? '',
      province: c.province ?? '',
      ville: c.ville ?? '',
      commune: c.commune ?? '',
      quartier: c.quartier ?? '',
      avenue: c.avenue ?? '',
      territoire: c.territoire ?? '',
      collectivite: c.collectivite ?? '',
      groupement: c.groupement ?? '',
      village: c.village ?? '',
      areaSqm: c.area_sqm ?? undefined,
      titleReferenceNumber: c.title_reference_number ?? '',
      titleIssueDate: c.title_issue_date ?? '',
      leaseType: c.lease_type ?? '',
      declaredUsage: c.declared_usage ?? '',
      constructionNature: c.construction_nature ?? '',
      constructionType: c.construction_type ?? '',
      constructionYear: c.construction_year ?? undefined,
      whatsappNumber: c.whatsapp_number ?? '',
      isTitleInCurrentOwnerName: c.is_title_in_current_owner_name,
    },
    currentOwners: ownersFromDetails.length > 0
      ? ownersFromDetails.map((o: any) => ({
          lastName: o.lastName || '',
          middleName: o.middleName || '',
          firstName: o.firstName || '',
          legalStatus: o.legalStatus || 'Personne physique',
          gender: o.gender || '',
          entityType: o.entityType || '',
          entitySubType: o.entitySubType || '',
          entitySubTypeOther: o.entitySubTypeOther || '',
          stateExploitedBy: o.stateExploitedBy || '',
          rightType: o.rightType || '',
          since: o.since || '',
        }))
      : [{
          lastName: c.current_owner_name?.split(' ')[0] ?? '',
          middleName: '',
          firstName: c.current_owner_name?.split(' ').slice(1).join(' ') ?? '',
          legalStatus: c.current_owner_legal_status ?? 'Personne physique',
          gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '',
          stateExploitedBy: '', rightType: '',
          since: c.current_owner_since ?? '',
        }],
    previousOwners: Array.isArray(c.ownership_history)
      ? c.ownership_history.map((o: any) => ({
          name: o.owner_name || o.ownerName || '',
          legalStatus: o.legal_status || o.legalStatus || 'Personne physique',
          entityType: '', entitySubType: '', entitySubTypeOther: '', stateExploitedBy: '',
          startDate: o.ownership_start_date || o.startDate || '',
          endDate: o.ownership_end_date || o.endDate || '',
          mutationType: o.mutation_type || o.mutationType || 'Vente',
        }))
      : [],
    taxRecords: Array.isArray(c.tax_history)
      ? c.tax_history.map((t: any) => ({
          taxType: t.tax_type || t.taxType || 'Taxe foncière',
          taxYear: String(t.tax_year || t.taxYear || ''),
          taxAmount: String(t.amount_usd || t.amountUsd || ''),
          paymentStatus: t.payment_status || t.paymentStatus || 'Non payée',
          paymentDate: t.payment_date || t.paymentDate || '',
          receiptFile: null,
        }))
      : [],
    mortgageRecords: Array.isArray(c.mortgage_history)
      ? c.mortgage_history.map((m: any) => ({
          mortgageAmount: String(m.mortgage_amount_usd || m.mortgageAmountUsd || ''),
          duration: String(m.duration_months || m.durationMonths || ''),
          creditorName: m.creditor_name || m.creditorName || '',
          creditorType: m.creditor_type || m.creditorType || 'Banque',
          contractDate: m.contract_date || m.contractDate || '',
          mortgageStatus: m.mortgage_status || m.mortgageStatus || 'Active',
          receiptFile: null,
        }))
      : [],
    buildingPermits: Array.isArray(c.building_permits)
      ? c.building_permits.map((p: any) => ({
          permitType: p.permit_type || p.permitType || 'construction',
          permitNumber: p.permit_number || p.permitNumber || '',
          issuingService: p.issuing_service || p.issuingService || '',
          issueDate: p.issue_date || p.issueDate || '',
          validityMonths: String(p.validity_period_months || p.validityMonths || '12'),
          administrativeStatus: p.administrative_status || p.administrativeStatus || 'En attente',
          issuingServiceContact: p.issuing_service_contact || p.issuingServiceContact || '',
          attachmentFile: null,
        }))
      : [],
    gpsCoordinates: c.gps_coordinates ?? [],
    parcelSides: c.parcel_sides ?? [],
    sectionType: c.parcel_type === 'SR' ? 'rurale' : c.parcel_type === 'SU' ? 'urbaine' : '',
    timestamp: new Date().toISOString(),
    editingContributionId: c.id,
  };
}
