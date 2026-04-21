import { useInvoiceTemplateConfig } from './useInvoiceTemplateConfig';
import { TVA_RATE, TVA_LABEL } from '@/constants/billing';

/**
 * Source de vérité unifiée pour le taux de TVA côté écran.
 * Lit la config admin (`invoice_template_config`) et retombe sur les
 * constantes statiques uniquement si la config n'est pas encore chargée.
 */
export const useTvaRate = () => {
  const { config, loading } = useInvoiceTemplateConfig();
  return {
    rate: typeof config?.tva_rate === 'number' ? config.tva_rate : TVA_RATE,
    label: config?.tva_label || TVA_LABEL,
    loading,
  };
};

export default useTvaRate;
