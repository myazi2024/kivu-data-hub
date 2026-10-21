import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ClaimType, ProofDoc } from '@/lib/ownership';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

export interface OwnedParcel {
  id: string;
  parcel_number: string;
  province: string | null;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
  area_sqm: number | null;
  owner_linked_at: string | null;
  contribution_id: string | null;
}

export interface OwnershipClaim {
  id: string;
  parcel_number: string;
  claim_type: ClaimType;
  identity_docs: ProofDoc[];
  rights_docs: ProofDoc[];
  exploitation_docs: ProofDoc[];
  statement: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_id: string;
}

export interface ClaimableParcel {
  parcel_number: string;
  province: string | null;
  ville: string | null;
  commune: string | null;
  claim_type: ClaimType;
}

export function useOwnedParcels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owned-parcels', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<OwnedParcel[]> => {
      const { data, error } = await rpc('get_my_owned_parcels');
      if (error) throw error;
      return (data ?? []) as OwnedParcel[];
    },
  });
}

export function useMyOwnershipClaims() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ownership-claims', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OwnershipClaim[]> => {
      const { data, error } = await (supabase.from as any)('parcel_ownership_claims')
        .select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as OwnershipClaim[];
    },
  });
}

export async function searchClaimableParcels(term: string): Promise<ClaimableParcel[]> {
  const { data, error } = await rpc('search_claimable_parcels', { p_term: term });
  if (error) throw error;
  return (data ?? []) as ClaimableParcel[];
}

export function useOwnershipClaimActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['ownership-claims'] });
  const submit = useMutation({
    mutationFn: async (args: { parcelNumber: string; identity: ProofDoc[]; rights: ProofDoc[]; exploitation: ProofDoc[]; statement: string }) => {
      const { data, error } = await rpc('submit_ownership_claim', {
        p_parcel_number: args.parcelNumber,
        p_identity_docs: args.identity,
        p_rights_docs: args.rights,
        p_exploitation_docs: args.exploitation,
        p_statement: args.statement,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc('cancel_ownership_claim', { p_id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { submit, cancel };
}

export function useAdminOwnershipClaims(status: string) {
  return useQuery({
    queryKey: ['admin-ownership-claims', status],
    queryFn: async (): Promise<OwnershipClaim[]> => {
      let q = (supabase.from as any)('parcel_ownership_claims').select('*').order('created_at', { ascending: false }).limit(200);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OwnershipClaim[];
    },
  });
}

export async function decideOwnershipClaim(id: string, action: 'in_review' | 'approve' | 'reject', reason?: string) {
  const { error } = await rpc('process_ownership_claim_decision', { p_id: id, p_action: action, p_reason: reason ?? null });
  if (error) throw error;
}

export const CLAIM_STATUS_LABELS: Record<OwnershipClaim['status'], string> = {
  pending: 'En attente',
  in_review: 'En examen',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};
