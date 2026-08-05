/**
 * Catalogue de règles de validation CCC côté admin.
 *
 * Chaque problème détecté est rattaché à un champ (identifiant + libellé), à un
 * onglet du dialogue de détails et à une sévérité, de façon à pouvoir afficher
 * la validation champ par champ et naviguer directement vers la section
 * concernée.
 *
 * Les messages renvoyés par la fonction serveur `validate_contribution_completeness`
 * (phrases libres) sont rattachés aux mêmes champs via `SERVER_MESSAGE_MAP`.
 */
import type { Contribution, ValidationResult } from './types';
import { parseRentalUnits, parseMarketListings, sumUnitsRent } from './cccConsistency';

export type CCCValidationSeverity = 'error' | 'warning';

export type CCCValidationTab =
  | 'general'
  | 'location'
  | 'environment'
  | 'market'
  | 'permits'
  | 'history'
  | 'obligations'
  | 'documents'
  | 'other';

export const TAB_LABELS: Record<CCCValidationTab, string> = {
  general: 'Général',
  location: 'Localisation',
  environment: 'Env. & Occup.',
  market: 'Valeur marchande',
  permits: 'Permis',
  history: 'Historiques',
  obligations: 'Obligations',
  documents: 'Documents',
  other: 'Autre',
};

export interface CCCValidationIssue {
  fieldId: string;
  fieldLabel: string;
  message: string;
  severity: CCCValidationSeverity;
  tab: CCCValidationTab;
  currentValue?: string | null;
  /** Origine du contrôle : serveur (RPC) ou client (cohérence locale). */
  source: 'server' | 'client';
}

interface ServerMapping {
  fieldId: string;
  fieldLabel: string;
  tab: CCCValidationTab;
  /** Message reformulé, plus explicite que la phrase serveur. */
  message: string;
  value?: (c: Contribution) => unknown;
}

/**
 * Correspondance message serveur → champ. La clé est un fragment recherché
 * (insensible à la casse) dans le message renvoyé par le RPC.
 */
export const SERVER_MESSAGE_MAP: Array<{ match: string } & ServerMapping> = [
  {
    match: 'numéro de parcelle',
    fieldId: 'parcel_number',
    fieldLabel: 'Numéro de parcelle',
    tab: 'general',
    message: 'Le numéro de parcelle est obligatoire pour identifier le bien.',
    value: (c) => c.parcel_number,
  },
  {
    match: 'type de titre',
    fieldId: 'property_title_type',
    fieldLabel: 'Type de titre foncier',
    tab: 'general',
    message: 'Sélectionnez le type de titre foncier (certificat, contrat de location, etc.).',
    value: (c) => c.property_title_type,
  },
  {
    match: 'propriétaire actuel',
    fieldId: 'current_owner_name',
    fieldLabel: 'Propriétaire actuel',
    tab: 'general',
    message: 'Le nom du propriétaire actuel est obligatoire.',
    value: (c) => c.current_owner_name,
  },
  {
    match: 'superficie',
    fieldId: 'area_sqm',
    fieldLabel: 'Superficie (m²)',
    tab: 'general',
    message: 'La superficie doit être renseignée et strictement positive.',
    value: (c) => c.area_sqm,
  },
  {
    match: 'province',
    fieldId: 'province',
    fieldLabel: 'Province',
    tab: 'location',
    message: 'La province est obligatoire pour localiser la parcelle.',
    value: (c) => c.province,
  },
  {
    match: 'document de titre foncier',
    fieldId: 'property_title_document_url',
    fieldLabel: 'Document du titre foncier',
    tab: 'documents',
    message: 'Aucune copie du titre foncier n’a été jointe.',
    value: (c) => c.property_title_document_url,
  },
  {
    match: 'identité du propriétaire',
    fieldId: 'owner_document_url',
    fieldLabel: 'Pièce d’identité du propriétaire',
    tab: 'documents',
    message: 'Aucune pièce d’identité du propriétaire n’a été jointe.',
    value: (c) => c.owner_document_url,
  },
  {
    match: 'coordonnées gps',
    fieldId: 'gps_coordinates',
    fieldLabel: 'Coordonnées GPS',
    tab: 'location',
    message: 'Les bornes GPS de la parcelle ne sont pas renseignées.',
    value: (c) => (Array.isArray(c.gps_coordinates) ? `${c.gps_coordinates.length} borne(s)` : null),
  },
  {
    match: 'historique de propriété',
    fieldId: 'ownership_history',
    fieldLabel: 'Historique de propriété',
    tab: 'history',
    message: 'Aucun propriétaire antérieur n’a été déclaré.',
    value: (c) => (Array.isArray(c.ownership_history) ? `${c.ownership_history.length} entrée(s)` : null),
  },
  {
    match: 'historique des bornages',
    fieldId: 'boundary_history',
    fieldLabel: 'Historique des bornages',
    tab: 'history',
    message: 'Aucun procès-verbal de bornage n’a été déclaré.',
    value: (c) => (Array.isArray(c.boundary_history) ? `${c.boundary_history.length} entrée(s)` : null),
  },
  {
    match: 'historique des taxes',
    fieldId: 'tax_history',
    fieldLabel: 'Historique des taxes',
    tab: 'obligations',
    message: 'Aucun exercice fiscal n’a été déclaré.',
    value: (c) => (Array.isArray(c.tax_history) ? `${c.tax_history.length} entrée(s)` : null),
  },
  {
    match: 'mode de mise en location',
    fieldId: 'rental_configuration',
    fieldLabel: 'Mode de mise en location',
    tab: 'environment',
    message: 'Usage déclaré « location » sans préciser un seul local ou plusieurs locaux.',
    value: (c) => c.rental_configuration,
  },
  {
    match: 'sans aucun local détaillé',
    fieldId: 'rental_units',
    fieldLabel: 'Locaux détaillés',
    tab: 'environment',
    message: 'Mode « plusieurs locaux » sélectionné mais aucun local n’a été détaillé.',
    value: () => '0 local',
  },
  {
    match: 'nombre de locaux déclaré',
    fieldId: 'rental_units_count',
    fieldLabel: 'Nombre de locaux',
    tab: 'environment',
    message: 'Le nombre de locaux déclaré ne correspond pas aux locaux détaillés.',
    value: (c) => c.rental_units_count,
  },
  {
    match: 'sans loyer mensuel valide',
    fieldId: 'rental_units.monthly_rent_usd',
    fieldLabel: 'Loyer mensuel par local',
    tab: 'environment',
    message: 'Au moins un local est déclaré sans loyer mensuel valide (> 0 USD).',
  },
  {
    match: 'loyer global déclaré',
    fieldId: 'monthly_rent_usd',
    fieldLabel: 'Loyer mensuel global',
    tab: 'environment',
    message: 'Le loyer global déclaré diffère de la somme des loyers des locaux.',
    value: (c) => (c.monthly_rent_usd != null ? `${c.monthly_rent_usd} USD` : null),
  },
  {
    match: 'sans date d’expertise',
    fieldId: 'appraisal_date',
    fieldLabel: 'Date d’expertise',
    tab: 'market',
    message: 'Une expertise récente est déclarée mais sa date est absente.',
    value: (c) => c.appraisal_date,
  },
  {
    match: 'postérieure à aujourd',
    fieldId: 'appraisal_date',
    fieldLabel: 'Date d’expertise',
    tab: 'market',
    message: 'La date d’expertise est dans le futur.',
    value: (c) => c.appraisal_date,
  },
  {
    match: 'photo de couverture',
    fieldId: 'market_listings.cover',
    fieldLabel: 'Photo de couverture d’annonce',
    tab: 'market',
    message: 'Une annonce publiée ne comporte aucune photo de couverture.',
  },
  {
    match: 'contact',
    fieldId: 'market_listings.contact',
    fieldLabel: 'Contact de l’annonce',
    tab: 'market',
    message: 'Une annonce publiée ne comporte aucune coordonnée de contact.',
  },
];

const fmt = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
};

const mapServerMessage = (
  msg: string,
  severity: CCCValidationSeverity,
  contribution: Contribution,
): CCCValidationIssue => {
  const lower = msg.toLowerCase();
  const rule = SERVER_MESSAGE_MAP.find((r) => lower.includes(r.match.toLowerCase()));
  if (!rule) {
    return {
      fieldId: 'unknown',
      fieldLabel: 'Contrôle serveur',
      message: msg,
      severity,
      tab: 'other',
      source: 'server',
      currentValue: null,
    };
  }
  return {
    fieldId: rule.fieldId,
    fieldLabel: rule.fieldLabel,
    message: rule.message,
    severity,
    tab: rule.tab,
    source: 'server',
    currentValue: rule.value ? fmt(rule.value(contribution)) : null,
  };
};

/** Contrôles de cohérence évalués côté client, champ par champ. */
export const buildClientIssues = (c: Contribution | null): CCCValidationIssue[] => {
  if (!c) return [];
  const issues: CCCValidationIssue[] = [];
  const units = parseRentalUnits(c.rental_units);
  const listings = parseMarketListings(c.market_listings);

  const push = (i: Omit<CCCValidationIssue, 'source'>) => issues.push({ ...i, source: 'client' });

  if (c.declared_usage === 'location' && !c.rental_configuration) {
    push({
      fieldId: 'rental_configuration',
      fieldLabel: 'Mode de mise en location',
      message: 'Usage déclaré « location » sans préciser un seul local ou plusieurs locaux.',
      severity: 'warning',
      tab: 'environment',
      currentValue: null,
    });
  }

  if (c.rental_configuration === 'multi') {
    if (units.length === 0) {
      push({
        fieldId: 'rental_units',
        fieldLabel: 'Locaux détaillés',
        message: 'Mode « plusieurs locaux » sélectionné mais aucun local n’a été détaillé.',
        severity: 'warning',
        tab: 'environment',
        currentValue: '0 local',
      });
    } else {
      if (c.rental_units_count && Number(c.rental_units_count) !== units.length) {
        push({
          fieldId: 'rental_units_count',
          fieldLabel: 'Nombre de locaux',
          message: `Nombre déclaré (${c.rental_units_count}) différent du nombre de locaux détaillés (${units.length}).`,
          severity: 'warning',
          tab: 'environment',
          currentValue: `${c.rental_units_count} déclaré(s)`,
        });
      }
      units.forEach((u, i) => {
        if (!u.monthlyRentUsd || u.monthlyRentUsd <= 0) {
          push({
            fieldId: `rental_units[${i}].monthly_rent_usd`,
            fieldLabel: `Loyer — local ${u.label || `#${i + 1}`}`,
            message: 'Loyer mensuel absent ou nul : renseignez un montant en USD supérieur à 0.',
            severity: 'warning',
            tab: 'environment',
            currentValue: fmt(u.monthlyRentUsd),
          });
        }
      });
      const total = sumUnitsRent(units);
      const declared = Number(c.monthly_rent_usd ?? 0);
      if (declared > 0 && Math.abs(declared - total) > 0.5) {
        push({
          fieldId: 'monthly_rent_usd',
          fieldLabel: 'Loyer mensuel global',
          message: `Loyer global déclaré (${declared} USD) différent de la somme des locaux (${total} USD).`,
          severity: 'warning',
          tab: 'environment',
          currentValue: `${declared} USD`,
        });
      }
    }
  }

  if (c.rental_configuration === 'single' && units.length > 0) {
    push({
      fieldId: 'rental_units',
      fieldLabel: 'Locaux détaillés',
      message: 'Mode « un seul local » mais des locaux détaillés subsistent (donnée résiduelle à purger).',
      severity: 'warning',
      tab: 'environment',
      currentValue: `${units.length} local/locaux`,
    });
  }

  if (c.has_recent_appraisal && !c.appraisal_date) {
    push({
      fieldId: 'appraisal_date',
      fieldLabel: 'Date d’expertise',
      message: 'Une expertise récente est déclarée mais sa date est absente.',
      severity: 'warning',
      tab: 'market',
      currentValue: null,
    });
  }

  if (c.appraisal_date && new Date(c.appraisal_date).getTime() > Date.now()) {
    push({
      fieldId: 'appraisal_date',
      fieldLabel: 'Date d’expertise',
      message: 'La date d’expertise est postérieure à aujourd’hui.',
      severity: 'warning',
      tab: 'market',
      currentValue: c.appraisal_date,
    });
  }

  if (c.would_sell_if_offered === true && !c.resale_price_usd) {
    push({
      fieldId: 'resale_price_usd',
      fieldLabel: 'Prix de revente estimé',
      message: 'Disposition à vendre déclarée sans prix de revente estimé.',
      severity: 'warning',
      tab: 'market',
      currentValue: null,
    });
  }

  listings.forEach((l, i) => {
    const name = l.unitLabel || `#${i + 1}`;
    if (l.listForRent && l.coverImageUrls.length === 0) {
      push({
        fieldId: `market_listings[${i}].coverImageUrls`,
        fieldLabel: `Photo de couverture — annonce ${name}`,
        message: 'Annonce publiée sans photo de couverture : elle sera peu visible.',
        severity: 'warning',
        tab: 'market',
        currentValue: '0 photo',
      });
    }
    if (l.listForRent && !l.contactValue) {
      push({
        fieldId: `market_listings[${i}].contactValue`,
        fieldLabel: `Contact — annonce ${name}`,
        message: 'Annonce publiée sans coordonnée de contact.',
        severity: 'warning',
        tab: 'market',
        currentValue: null,
      });
    }
  });

  return issues;
};

/**
 * Fusionne les contrôles serveur (RPC) et client, en supprimant les doublons
 * (même champ + même sévérité), le serveur faisant foi.
 */
export const buildValidationIssues = (
  contribution: Contribution | null,
  serverResult: ValidationResult | null,
): CCCValidationIssue[] => {
  if (!contribution) return [];
  const serverIssues: CCCValidationIssue[] = [];

  if (serverResult) {
    (serverResult.errors || []).forEach((m) =>
      serverIssues.push(mapServerMessage(String(m), 'error', contribution)),
    );
    (serverResult.warnings || []).forEach((m) =>
      serverIssues.push(mapServerMessage(String(m), 'warning', contribution)),
    );
  }

  const seen = new Set(serverIssues.map((i) => `${i.fieldId}|${i.severity}`));
  const clientIssues = buildClientIssues(contribution).filter(
    (i) => !seen.has(`${i.fieldId}|${i.severity}`),
  );

  const all = [...serverIssues, ...clientIssues];
  // Erreurs d'abord, puis avertissements, en conservant l'ordre par section.
  return all.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
};

export const groupIssuesByTab = (
  issues: CCCValidationIssue[],
): Array<{ tab: CCCValidationTab; label: string; items: CCCValidationIssue[] }> => {
  const order: CCCValidationTab[] = [
    'general', 'location', 'environment', 'market', 'permits', 'history', 'obligations', 'documents', 'other',
  ];
  return order
    .map((tab) => ({ tab, label: TAB_LABELS[tab], items: issues.filter((i) => i.tab === tab) }))
    .filter((g) => g.items.length > 0);
};
