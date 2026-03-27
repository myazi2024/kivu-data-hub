import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate un montant en USD avec le format français.
 */
export const formatCurrency = (amount: number, currency: 'USD' | 'CDF' = 'USD'): string => {
  if (currency === 'CDF') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CDF', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
};

/**
 * Formate une date ISO en format lisible français (ex: "15 mars 2025").
 */
export const formatDateFr = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};
