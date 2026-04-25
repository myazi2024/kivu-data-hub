import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelGeoContext {
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  quartier?: string | null;
  avenue?: string | null;
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
  village?: string | null;
}

export interface ParentParcelData {
  id?: string;
  parcel_number?: string;
  area_sqm?: number | null;
  property_title_type?: string | null;
  title_issue_date?: string | null;
  gps_coordinates?: any[] | null;
  has_active_dispute?: boolean;
  has_active_mortgage?: boolean;
  has_pending_mutation?: boolean;
  has_pending_subdivision?: boolean;
}

export interface EligibilityIssue {
  code: string;
  message: string;
}

export interface EligibilityResult {
  loading: boolean;
  ruleApplied: boolean;
  matchedLocation: string | null;
  eligible: boolean;
  issues: EligibilityIssue[];
}

const REGISTERED_TITLE_KEYWORDS = ["enregistrement", "registered", "pleine propriété"];

/**
 * Vérifie en amont l'éligibilité de la parcelle-mère au lotissement,
 * selon les contraintes définies dans subdivision_zoning_rules.
 */
export const useParentParcelEligibility = (
  parcel: ParentParcelData | null | undefined,
  geo: ParcelGeoContext | null | undefined,
): EligibilityResult => {
  const [rule, setRule] = useState<any | null>(null);
  const [matchedLocation, setMatchedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Statuts dynamiques de la parcelle (litige, hypothèque, etc.)
  const [statusFlags, setStatusFlags] = useState({
    hasActiveDispute: false,
    hasActiveMortgage: false,
    hasPendingMutation: false,
    hasPendingSubdivision: false,
    statusLoaded: false,
  });

  const sectionType: 'urban' | 'rural' = useMemo(() => {
    if (!geo) return 'urban';
    return (geo.quartier || geo.commune || geo.ville) ? 'urban' : 'rural';
  }, [geo]);

  const candidates = useMemo<string[]>(() => {
    if (!geo) return ['*'];
    const list = sectionType === 'urban'
      ? [geo.avenue, geo.quartier, geo.commune, geo.ville]
      : [geo.village, geo.groupement, geo.collectivite, geo.territoire];
    const cleaned = list.map(v => (v || '').trim()).filter(Boolean);
    return [...cleaned, '*'];
  }, [geo, sectionType]);

  // Charger la règle applicable
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('subdivision_zoning_rules')
        .select('*')
        .eq('is_active', true)
        .eq('section_type', sectionType)
        .in('location_name', candidates);

      if (cancelled) return;
      const rows = (data as any[]) || [];
      const matched = candidates.find(c => rows.some(r => r.location_name === c)) || null;
      const found = matched ? rows.find(r => r.location_name === matched) ?? null : null;
      setRule(found);
      setMatchedLocation(matched);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sectionType, candidates.join('|')]);

  // Charger les statuts dynamiques (litige, hypothèque, etc.) depuis Supabase
  useEffect(() => {
    let cancelled = false;
    if (!parcel?.parcel_number && !parcel?.id) {
      setStatusFlags(s => ({ ...s, statusLoaded: true }));
      return;
    }
    (async () => {
      try {
        const parcelNumber = parcel.parcel_number;
        const parcelId = parcel.id;

        // Litiges actifs
        const disputeQ = (supabase as any)
          .from('land_disputes')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'pending', 'in_progress', 'submitted', 'En cours', 'Ouvert']);
        if (parcelNumber) disputeQ.eq('parcel_number', parcelNumber);
        const disputeRes = await disputeQ;

        // Hypothèques actives
        const mortgageQ = (supabase as any)
          .from('mortgages')
          .select('id', { count: 'exact', head: true })
          .in('status', ['active', 'inscribed', 'inscription_active', 'En cours']);
        if (parcelNumber) mortgageQ.eq('parcel_number', parcelNumber);
        const mortgageRes = await mortgageQ;

        // Mutations en cours
        const mutationQ = (supabase as any)
          .from('mutation_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'submitted', 'in_review', 'En cours']);
        if (parcelNumber) mutationQ.eq('parcel_number', parcelNumber);
        const mutationRes = await mutationQ;

        // Lotissements en cours
        const subQ = (supabase as any)
          .from('subdivision_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'submitted', 'in_review', 'En cours', 'pending_payment']);
        if (parcelNumber) subQ.eq('parcel_number', parcelNumber);
        const subRes = await subQ;

        if (cancelled) return;
        setStatusFlags({
          hasActiveDispute: (disputeRes?.count || 0) > 0 || !!parcel.has_active_dispute,
          hasActiveMortgage: (mortgageRes?.count || 0) > 0 || !!parcel.has_active_mortgage,
          hasPendingMutation: (mutationRes?.count || 0) > 0 || !!parcel.has_pending_mutation,
          hasPendingSubdivision: (subRes?.count || 0) > 0 || !!parcel.has_pending_subdivision,
          statusLoaded: true,
        });
      } catch {
        if (cancelled) return;
        setStatusFlags(s => ({ ...s, statusLoaded: true }));
      }
    })();
    return () => { cancelled = true; };
  }, [parcel?.parcel_number, parcel?.id]);

  const issues = useMemo<EligibilityIssue[]>(() => {
    if (!rule || !parcel) return [];
    const out: EligibilityIssue[] = [];
    const area = Number(parcel.area_sqm || 0);

    if (rule.parent_min_area_sqm > 0 && area < rule.parent_min_area_sqm) {
      out.push({
        code: 'PARENT_TOO_SMALL',
        message: `La superficie de la parcelle (${Math.round(area).toLocaleString()} m²) est inférieure au minimum requis de ${Number(rule.parent_min_area_sqm).toLocaleString()} m² pour autoriser un lotissement dans cette zone.`,
      });
    }
    if (rule.parent_max_area_sqm && area > rule.parent_max_area_sqm) {
      out.push({
        code: 'PARENT_TOO_LARGE',
        message: `La superficie de la parcelle (${Math.round(area).toLocaleString()} m²) dépasse le plafond autorisé de ${Number(rule.parent_max_area_sqm).toLocaleString()} m² ; une procédure d'aménagement est requise.`,
      });
    }

    // Titre enregistré
    const titleType = (parcel.property_title_type || '').toLowerCase();
    if (rule.require_registered_title) {
      const isRegistered = REGISTERED_TITLE_KEYWORDS.some(k => titleType.includes(k));
      if (!isRegistered) {
        out.push({
          code: 'TITLE_NOT_REGISTERED',
          message: `Un certificat d'enregistrement (titre de pleine propriété) est exigé pour cette zone. Le titre actuel (« ${parcel.property_title_type || 'non renseigné'} ») n'est pas conforme.`,
        });
      }
    }

    // Types exclus
    const excluded: string[] = rule.exclude_title_types || [];
    if (excluded.length > 0 && parcel.property_title_type) {
      const match = excluded.find(t => titleType.includes(t.toLowerCase()));
      if (match) {
        out.push({
          code: 'TITLE_TYPE_EXCLUDED',
          message: `Le type de titre « ${parcel.property_title_type} » n'autorise pas un lotissement dans cette zone.`,
        });
      }
    }

    // Âge du titre
    if (rule.min_title_age_years > 0 && parcel.title_issue_date) {
      const issued = new Date(parcel.title_issue_date);
      if (!isNaN(issued.getTime())) {
        const ageYears = (Date.now() - issued.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (ageYears < rule.min_title_age_years) {
          out.push({
            code: 'TITLE_TOO_RECENT',
            message: `Le titre foncier doit avoir au moins ${rule.min_title_age_years} an(s) ; l'ancienneté actuelle est de ${ageYears.toFixed(1)} an(s).`,
          });
        }
      }
    }

    // GPS
    const gpsCount = Array.isArray(parcel.gps_coordinates) ? parcel.gps_coordinates.length : 0;
    if (rule.require_gps_coordinates && gpsCount === 0) {
      out.push({
        code: 'GPS_MISSING',
        message: `Les coordonnées GPS de la parcelle sont obligatoires pour autoriser un lotissement dans cette zone.`,
      });
    }
    if (rule.min_gps_points > 0 && gpsCount > 0 && gpsCount < rule.min_gps_points) {
      out.push({
        code: 'GPS_INSUFFICIENT',
        message: `La parcelle ne compte que ${gpsCount} point(s) GPS ; le minimum requis est de ${rule.min_gps_points}.`,
      });
    }

    // Statuts dynamiques
    if (!rule.allow_if_active_dispute && statusFlags.hasActiveDispute) {
      out.push({
        code: 'ACTIVE_DISPUTE',
        message: `Un litige foncier actif est enregistré sur cette parcelle ; le lotissement est suspendu jusqu'à sa résolution.`,
      });
    }
    if (!rule.allow_if_active_mortgage && statusFlags.hasActiveMortgage) {
      out.push({
        code: 'ACTIVE_MORTGAGE',
        message: `Une hypothèque active grève cette parcelle ; sa radiation préalable est requise avant tout lotissement.`,
      });
    }
    if (!rule.allow_if_pending_mutation && statusFlags.hasPendingMutation) {
      out.push({
        code: 'PENDING_MUTATION',
        message: `Une demande de mutation est en cours sur cette parcelle ; veuillez attendre sa finalisation.`,
      });
    }
    if (!rule.allow_if_pending_subdivision && statusFlags.hasPendingSubdivision) {
      out.push({
        code: 'PENDING_SUBDIVISION',
        message: `Une demande de lotissement est déjà ouverte sur cette parcelle ; une seule procédure peut être traitée à la fois.`,
      });
    }

    return out;
  }, [rule, parcel, statusFlags]);

  return {
    loading: loading || !statusFlags.statusLoaded,
    ruleApplied: !!rule,
    matchedLocation,
    eligible: issues.length === 0,
    issues,
  };
};
