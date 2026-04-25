import { useEffect, useMemo, useState, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';

export interface SubdivisionRequiredDocument {
  id: string;
  doc_key: string;
  label: string;
  help_text: string | null;
  is_required: boolean;
  requester_types: string[];
  accepted_mime_types: string[];
  max_size_mb: number;
  display_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

// Hardcoded fallback (matches the legacy DOC_CONFIG) so the form keeps working
// if the configuration table is empty/unreachable.
const FALLBACK: SubdivisionRequiredDocument[] = [
  {
    id: 'fallback-requester_id_document',
    doc_key: 'requester_id_document',
    label: "Pièce d'identité du demandeur",
    help_text: "Carte d'électeur, passeport ou permis de conduire (recto/verso si nécessaire).",
    is_required: true,
    requester_types: [],
    accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    max_size_mb: 5,
    display_order: 10,
    is_active: true,
    metadata: {},
  },
  {
    id: 'fallback-proof_of_ownership',
    doc_key: 'proof_of_ownership',
    label: 'Preuve de propriété',
    help_text: "Certificat d'enregistrement, contrat de location, ou autre titre foncier valide.",
    is_required: true,
    requester_types: [],
    accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    max_size_mb: 5,
    display_order: 20,
    is_active: true,
    metadata: {},
  },
  {
    id: 'fallback-subdivision_sketch',
    doc_key: 'subdivision_sketch',
    label: 'Croquis annexe (optionnel)',
    help_text: 'Schéma manuscrit ou plan annexe complémentaire.',
    is_required: false,
    requester_types: [],
    accepted_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    max_size_mb: 5,
    display_order: 30,
    is_active: true,
    metadata: {},
  },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: SubdivisionRequiredDocument[]; ts: number } | null = null;
let inflight: Promise<SubdivisionRequiredDocument[]> | null = null;

const fetchAll = async (): Promise<SubdivisionRequiredDocument[]> => {
  const { data, error } = await untypedTables
    .subdivision_required_documents()
    .select('*')
    .order('display_order');
  if (error || !data) return [];
  return data as SubdivisionRequiredDocument[];
};

export const invalidateSubdivisionRequiredDocsCache = () => {
  cache = null;
  inflight = null;
};

/**
 * Fetch the configured required documents list (admin-driven), filtered by
 * requester type when provided. Falls back to the legacy hardcoded list.
 */
export const useSubdivisionRequiredDocuments = (requesterType?: string) => {
  const [all, setAll] = useState<SubdivisionRequiredDocument[] | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(!cache);

  const load = useCallback(async () => {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      setAll(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    inflight = inflight ?? fetchAll();
    const data = await inflight;
    inflight = null;
    cache = { data, ts: Date.now() };
    setAll(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const documents = useMemo<SubdivisionRequiredDocument[]>(() => {
    const list = all && all.length > 0 ? all.filter(d => d.is_active) : FALLBACK;
    if (requesterType) {
      return list.filter(d => d.requester_types.length === 0 || d.requester_types.includes(requesterType));
    }
    return list;
  }, [all, requesterType]);

  return { documents, loading, reload: load };
};
