import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MortgageFee } from '@/components/cadastral/mortgage-cancellation/types';

// Fix #21: Re-export MortgageFee from the canonical types file
export type { MortgageFee };

const DEFAULT_FEES: MortgageFee[] = [
  { id: 'dossier', name: "Frais d'ouverture de dossier", amount_usd: 50, is_mandatory: true, description: 'Frais administratifs de constitution du dossier' },
  { id: 'radiation', name: 'Droit de radiation', amount_usd: 100, is_mandatory: true, description: 'Droit de radiation au registre des titres fonciers' },
  { id: 'certificat', name: 'Certificat de radiation', amount_usd: 35, is_mandatory: true, description: 'Délivrance du certificat officiel de mainlevée' },
  { id: 'timbre', name: 'Droit de timbre', amount_usd: 15, is_mandatory: true, description: 'Timbre fiscal légal' },
  { id: 'conservation', name: 'Frais de conservation', amount_usd: 25, is_mandatory: true, description: 'Mise à jour du livre foncier' },
  { id: 'verification', name: 'Vérification complémentaire', amount_usd: 20, is_mandatory: false, description: 'Vérification approfondie des documents' },
];

export const useMortgageFees = () => {
  const [fees, setFees] = useState<MortgageFee[]>(DEFAULT_FEES);
  const [loadingFees, setLoadingFees] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const { data, error } = await supabase
          .from('cadastral_contribution_config')
          .select('config_value')
          .eq('config_key', 'mortgage_cancellation_fees')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data?.config_value) {
          const configFees = data.config_value as unknown as MortgageFee[];
          if (Array.isArray(configFees) && configFees.length > 0) {
            setFees(configFees);
          }
        }
      } catch (e) {
        console.warn('Failed to load mortgage fees config, using defaults:', e);
      } finally {
        setLoadingFees(false);
      }
    };

    fetchFees();
  }, []);

  return { fees, loadingFees };
};
