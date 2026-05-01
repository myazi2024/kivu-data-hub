import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics } from '@/lib/adminAnalytics';
import { generateAndUploadCertificate } from '@/utils/certificateService';
import { getMutationTypeLabel } from '@/components/cadastral/mutation/MutationConstants';
import type { MutationRequest } from '@/types/mutation';

export type MutationDecisionAction = 'approve' | 'reject' | 'hold' | 'return';

/**
 * Server-backed mutation admin actions.
 * - take_charge / escalate / decision delegate to SECURITY DEFINER RPCs.
 * - approve generates the PDF (browser fallback) THEN finalizes via RPC,
 *   storing only the relative path. Consumers fetch a signed URL via
 *   `resolveMutationCertificateUrl`.
 */
export function useMutationProcessing(refresh: () => void) {
  const { user } = useAuth();
  const { trackAdminAction } = useAdminAnalytics();
  const [processing, setProcessing] = useState(false);

  const takeCharge = useCallback(async (requestId: string) => {
    const { error } = await (supabase as any).rpc('take_charge_mutation_request', {
      p_request_id: requestId,
    });
    if (error) throw error;
    trackAdminAction({ module: 'mutation', action: 'take_charge', ref: { request_id: requestId } });
    refresh();
  }, [refresh, trackAdminAction]);

  const escalate = useCallback(async (requestId: string, reason?: string) => {
    const { error } = await (supabase as any).rpc('escalate_mutation_request', {
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (error) throw error;
    trackAdminAction({ module: 'mutation', action: 'escalate', ref: { request_id: requestId } });
    refresh();
  }, [refresh, trackAdminAction]);

  const processDecision = useCallback(async (
    request: MutationRequest,
    action: MutationDecisionAction,
    notes: string,
    rejectionReason: string,
  ) => {
    if (!user) throw new Error('Non authentifié');
    if (action === 'approve' && request.payment_status !== 'paid') {
      throw new Error('Impossible d\'approuver une demande non payée.');
    }
    if (action === 'reject' && !rejectionReason.trim()) {
      throw new Error('Veuillez indiquer un motif de rejet valide.');
    }

    setProcessing(true);
    try {
      let certificatePath: string | null = null;

      // Generate certificate FIRST so we can store its relative path atomically.
      if (action === 'approve') {
        toast.info('Génération automatique du certificat de mutation…');
        const certResult = await generateAndUploadCertificate(
          'mutation_fonciere',
          {
            referenceNumber: request.reference_number,
            recipientName: request.requester_name,
            recipientEmail: request.requester_email || undefined,
            parcelNumber: request.parcel_number,
            issueDate: new Date().toISOString(),
            approvedBy: 'Bureau d\'Information Cadastrale',
            additionalData: { requestId: request.id },
          },
          [
            { label: 'Type mutation:', value: getMutationTypeLabel(request.mutation_type) },
            { label: 'Bénéficiaire:', value: request.beneficiary_name || 'N/A' },
            { label: 'Montant payé:', value: `$${Number(request.total_amount_usd).toFixed(2)}` },
          ],
          user.id
        );
        if (!certResult) {
          throw new Error('Génération du certificat échouée');
        }
        certificatePath = certResult.path; // store relative path -> signed URL via RPC
      }

      const { error } = await (supabase as any).rpc('process_mutation_decision', {
        p_request_id: request.id,
        p_action: action,
        p_notes: notes.trim() || null,
        p_rejection_reason: action === 'reject' ? rejectionReason.trim() : null,
        p_certificate_url: certificatePath,
      });
      if (error) throw error;

      trackAdminAction({
        module: 'mutation',
        action,
        ref: { request_id: request.id, reference_number: request.reference_number },
      });

      toast.success('Demande traitée avec succès');
      refresh();
    } finally {
      setProcessing(false);
    }
  }, [user, trackAdminAction, refresh]);

  return { processing, takeCharge, escalate, processDecision };
}
