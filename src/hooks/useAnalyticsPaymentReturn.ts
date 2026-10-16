import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Retour du paiement par carte (?payment=success|cancelled) : message + mise à jour des accès. */
export function useAnalyticsPaymentReturn() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const payment = params.get('payment');
  useEffect(() => {
    if (payment !== 'success' && payment !== 'cancelled') return;
    if (payment === 'success') {
      toast.success('Paiement reçu', { description: 'Vos visuels seront disponibles dès la confirmation.' });
      void qc.invalidateQueries({ queryKey: ['my-analytics-access'] });
    } else toast.info('Paiement annulé');
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('payment'); return next; }, { replace: true });
  }, [payment, qc, setParams]);
}
