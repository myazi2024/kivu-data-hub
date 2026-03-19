import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Definitions of all static picklist keys used in the CCC form.
 * Each entry includes a human-readable label and the hardcoded fallback values.
 */
export const CCC_STATIC_PICKLIST_REGISTRY: Record<string, {
  label: string;
  description: string;
  fallback: string[] | Record<string, string[]>;
}> = {
  picklist_legal_status: {
    label: 'Statut juridique',
    description: 'Statuts juridiques des propriétaires',
    fallback: ['Personne physique', 'Personne morale', 'État'],
  },
  picklist_gender: {
    label: 'Genre',
    description: 'Options de genre pour les personnes physiques',
    fallback: ['Masculin', 'Féminin'],
  },
  picklist_entity_type: {
    label: "Type d'entité",
    description: 'Types d\'entités pour les personnes morales',
    fallback: ['Société', 'Association'],
  },
  picklist_entity_subtype_societe: {
    label: 'Forme juridique (Société)',
    description: 'Formes juridiques des sociétés',
    fallback: [
      'Entreprise individuelle (Ets)',
      'Société en Participation (SEP)',
      'Société à Responsabilité Limitée (SARL)',
      'Société Anonyme (SA)',
      'Société par Actions Simplifiée (SAS)',
      'Société en Nom Collectif (SNC)',
      'Société en Commandite Simple (SCS)',
      "Groupement d'Intérêt Économique (GIE)",
      'Autre',
    ],
  },
  picklist_entity_subtype_association: {
    label: "Type d'association",
    description: 'Types d\'associations',
    fallback: ['Association sans but lucratif (ASBL)', "Établissement d'Utilité Publique (EUP)", 'Autre'],
  },
  picklist_right_type: {
    label: 'Type de droit (État)',
    description: 'Types de droits pour les parcelles de l\'État',
    fallback: ['Concession', 'Affectation'],
  },
  picklist_construction_type: {
    label: 'Type de construction',
    description: 'Types de construction',
    fallback: ['Résidentielle', 'Commerciale', 'Industrielle', 'Agricole', 'Terrain nu'],
  },
  picklist_construction_nature: {
    label: 'Nature de construction',
    description: 'Natures de construction par type (dépendant du type)',
    fallback: {
      Résidentielle: ['Durable', 'Semi-durable', 'Précaire'],
      Commerciale: ['Durable', 'Semi-durable', 'Précaire'],
      Industrielle: ['Durable', 'Semi-durable', 'Précaire'],
      Agricole: ['Durable', 'Semi-durable', 'Précaire', 'Non bâti'],
      'Terrain nu': ['Non bâti'],
    },
  },
  picklist_construction_materials: {
    label: 'Matériaux de construction',
    description: 'Matériaux de construction',
    fallback: ['Béton armé', 'Briques cuites', 'Briques adobes', 'Parpaings', 'Bois', 'Tôles', 'Semi-dur', 'Mixte', 'Autre'],
  },
  picklist_declared_usage: {
    label: 'Usage déclaré',
    description: 'Usages déclarés par type+nature de construction (dépendant)',
    fallback: {
      'Non bâti': ['Terrain vacant', 'Agriculture', 'Parking'],
      'Résidentielle_Durable': ['Habitation', 'Usage mixte'],
      'Résidentielle_Semi-durable': ['Habitation', 'Usage mixte'],
      'Résidentielle_Précaire': ['Habitation'],
      'Commerciale_Durable': ['Commerce', 'Bureau', 'Usage mixte', 'Entrepôt'],
      'Commerciale_Semi-durable': ['Commerce', 'Bureau', 'Entrepôt'],
      'Commerciale_Précaire': ['Commerce'],
      'Industrielle_Durable': ['Industrie', 'Entrepôt'],
      'Industrielle_Semi-durable': ['Industrie', 'Entrepôt'],
      'Industrielle_Précaire': ['Industrie'],
      'Agricole_Non bâti': ['Agriculture'],
      'Agricole_Durable': ['Agriculture', 'Habitation'],
      'Agricole_Semi-durable': ['Agriculture', 'Habitation'],
      'Agricole_Précaire': ['Agriculture', 'Habitation'],
      'Terrain nu_Non bâti': ['Terrain vacant', 'Agriculture', 'Parking'],
    },
  },
  picklist_mutation_type: {
    label: 'Type de mutation',
    description: 'Types de mutation/transfert de propriété',
    fallback: ['Vente', 'Donation', 'Succession', 'Expropriation', 'Échange'],
  },
  picklist_tax_type: {
    label: 'Type de taxe',
    description: 'Types de taxes foncières',
    fallback: [
      'Impôt foncier annuel',
      'Impôt sur les revenus locatifs',
      'Taxe de bâtisse',
      'Taxe de superficie',
      "Taxe de plus-value immobilière",
      "Taxe d'habitation",
      'Autre taxe',
    ],
  },
  picklist_tax_payment_status: {
    label: 'Statut paiement taxe',
    description: 'Statuts de paiement des taxes',
    fallback: ['Payé', 'Payé partiellement', 'En attente', 'En retard'],
  },
  picklist_creditor_type: {
    label: 'Type de créancier',
    description: 'Types de créanciers hypothécaires',
    fallback: ['Banque', 'Microfinance', 'Coopérative', 'Particulier', 'Autre institution'],
  },
  picklist_mortgage_status: {
    label: 'Statut hypothèque',
    description: 'Statuts des hypothèques',
    fallback: ['Active', 'En défaut', 'Renégociée'],
  },
  picklist_permit_admin_status: {
    label: 'Statut admin permis',
    description: 'Statuts administratifs des permis de construire',
    fallback: ['En attente', 'Approuvé', 'Rejeté', 'Expiré'],
  },
};

type PicklistData = Record<string, string[] | Record<string, string[]>>;

/**
 * Hook that fetches all static picklist options from cadastral_contribution_config.
 * Falls back to hardcoded defaults if DB values are not available.
 */
export const useCCCFormPicklists = () => {
  const [data, setData] = useState<PicklistData>({});
  const [loading, setLoading] = useState(true);

  const fetchPicklists = useCallback(async () => {
    try {
      const keys = Object.keys(CCC_STATIC_PICKLIST_REGISTRY);
      const { data: rows, error } = await supabase
        .from('cadastral_contribution_config')
        .select('config_key, config_value, is_active')
        .in('config_key', keys);

      if (error) throw error;

      const result: PicklistData = {};
      for (const key of keys) {
        const row = rows?.find(r => r.config_key === key && r.is_active);
        result[key] = row ? (row.config_value as any) : CCC_STATIC_PICKLIST_REGISTRY[key].fallback;
      }
      setData(result);
    } catch (err) {
      console.error('Error fetching CCC picklists:', err);
      // Use all fallbacks
      const result: PicklistData = {};
      for (const [key, def] of Object.entries(CCC_STATIC_PICKLIST_REGISTRY)) {
        result[key] = def.fallback;
      }
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPicklists();
  }, [fetchPicklists]);

  /** Get a simple string[] picklist */
  const getOptions = useCallback((key: string): string[] => {
    const val = data[key];
    if (Array.isArray(val)) return val;
    const fallback = CCC_STATIC_PICKLIST_REGISTRY[key]?.fallback;
    return Array.isArray(fallback) ? fallback : [];
  }, [data]);

  /** Get a dependent picklist map */
  const getDependentOptions = useCallback((key: string): Record<string, string[]> => {
    const val = data[key];
    if (val && !Array.isArray(val)) return val as Record<string, string[]>;
    const fallback = CCC_STATIC_PICKLIST_REGISTRY[key]?.fallback;
    return (!Array.isArray(fallback) && fallback) ? fallback : {};
  }, [data]);

  return { loading, getOptions, getDependentOptions, refetch: fetchPicklists };
};
