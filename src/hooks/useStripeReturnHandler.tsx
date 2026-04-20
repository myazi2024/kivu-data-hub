import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

/**
 * Handles Stripe payment return URLs (?payment=success&type=...&session_id=...)
 * Polls Supabase until the webhook syncs the payment, then notifies the user.
 * Exposes `polling` so callers can show a progress indicator instead of a frozen UI.
 */
export const useStripeReturnHandler = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [polling, setPolling] = useState(false);
  const [pollProgress, setPollProgress] = useState(0);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentType = searchParams.get('type');
    const sessionId = searchParams.get('session_id');
    if (!paymentStatus) return;

    const clearPaymentParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('type');
      next.delete('session_id');
      setSearchParams(next, { replace: true });
    };

    const handle = async () => {
      if (paymentStatus === 'cancelled') {
        toast.error('Le paiement a été annulé.');
        clearPaymentParams();
        return;
      }
      if (paymentStatus !== 'success' || !sessionId) return;

      setPolling(true);
      setPollProgress(0);

      try {
        if (paymentType === 'certificate_access') {
          let completed: { expertise_request_id: string } | null = null;
          for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            setPollProgress((i + 1) / POLL_MAX_ATTEMPTS);
            const { data: payment } = await supabase
              .from('expertise_payments')
              .select('status, expertise_request_id')
              .eq('transaction_id', sessionId)
              .maybeSingle();
            if (payment?.status === 'completed' && payment.expertise_request_id) {
              completed = { expertise_request_id: payment.expertise_request_id };
              break;
            }
            if (payment?.status === 'failed') throw new Error('Le paiement du certificat a échoué.');
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          }
          if (!completed) {
            toast.message('Paiement confirmé, synchronisation en cours. Réessayez dans quelques secondes.');
            return;
          }
          const { data: req } = await supabase
            .from('real_estate_expertise_requests')
            .select('certificate_url')
            .eq('id', completed.expertise_request_id)
            .maybeSingle();
          if (req?.certificate_url) {
            window.open(req.certificate_url, '_blank', 'noopener,noreferrer');
            toast.success('Paiement réussi ! Le certificat a été ouvert.');
          } else {
            toast.success('Paiement réussi ! Le certificat sera disponible dès sa publication.');
          }
        } else if (paymentType === 'expertise_fee') {
          let isCompleted = false;
          for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            setPollProgress((i + 1) / POLL_MAX_ATTEMPTS);
            const { data: payment } = await supabase
              .from('expertise_payments')
              .select('status')
              .eq('transaction_id', sessionId)
              .maybeSingle();
            if (payment?.status === 'completed') { isCompleted = true; break; }
            if (payment?.status === 'failed') throw new Error('Le paiement de la demande d\u2019expertise a échoué.');
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          }
          if (isCompleted) toast.success('Paiement réussi ! Votre demande d\u2019expertise a été enregistrée.');
          else toast.message('Paiement confirmé, synchronisation en cours. Réessayez dans quelques secondes.');
        } else if (paymentType === 'mutation_request') {
          let mutationPayment: { status: string; invoice_id: string | null } | null = null;
          for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            setPollProgress((i + 1) / POLL_MAX_ATTEMPTS);
            const { data: tx } = await supabase
              .from('payment_transactions')
              .select('status, invoice_id')
              .eq('transaction_reference', sessionId)
              .maybeSingle();
            if (tx?.status === 'completed') { mutationPayment = tx; break; }
            if (tx?.status === 'failed') throw new Error('Le paiement de la mutation a échoué.');
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          }
          if (mutationPayment?.invoice_id) {
            const { data: mutationRequest } = await supabase
              .from('mutation_requests')
              .select('reference_number, payment_status')
              .eq('id', mutationPayment.invoice_id)
              .maybeSingle();
            if (mutationRequest?.payment_status === 'paid') {
              toast.success(`Paiement réussi ! Demande ${mutationRequest.reference_number} en cours d'examen.`);
            } else {
              toast.message('Paiement confirmé, synchronisation en cours. Vérifiez dans votre tableau de bord.');
            }
          } else {
            toast.message('Paiement confirmé, synchronisation en cours. Vérifiez dans votre tableau de bord.');
          }
        } else if (paymentType === 'cadastral_service') {
          // Poll la facture cadastrale pour détecter la mise à jour par le webhook
          let invoiceData: { id: string; parcel_number: string; selected_services: any; total_amount_usd: number } | null = null;
          for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            setPollProgress((i + 1) / POLL_MAX_ATTEMPTS);
            const { data: tx } = await supabase
              .from('payment_transactions')
              .select('status, invoice_id')
              .eq('transaction_reference', sessionId)
              .maybeSingle();
            if (tx?.status === 'completed' && tx.invoice_id) {
              const { data: inv } = await supabase
                .from('cadastral_invoices')
                .select('id, parcel_number, selected_services, total_amount_usd')
                .eq('id', tx.invoice_id)
                .maybeSingle();
              if (inv) { invoiceData = inv as any; break; }
            }
            if (tx?.status === 'failed') throw new Error('Le paiement cadastral a échoué.');
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          }
          if (invoiceData) {
            const services = Array.isArray(invoiceData.selected_services)
              ? invoiceData.selected_services as string[]
              : [];
            trackEvent('cadastral_service_purchase', {
              parcel_number: invoiceData.parcel_number,
              invoice_id: invoiceData.id,
              service_ids: services,
              service_count: services.length,
              total_usd: invoiceData.total_amount_usd,
              payment_method: 'STRIPE',
            });
            toast.success('Paiement réussi ! Vos services sont accessibles.');
            window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
          } else {
            toast.message('Paiement confirmé, synchronisation en cours.');
          }
        } else {
          toast.success('Paiement réussi.');
        }
      } catch (e: any) {
        console.error('Stripe return error:', e);
        toast.error(e?.message || 'Erreur lors de la vérification du paiement.');
      } finally {
        setPolling(false);
        setPollProgress(0);
        clearPaymentParams();
      }
    };

    void handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { polling, pollProgress };
};
