import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate un montant en USD avec le format français.
 */
export const formatCurrency = (amount: number): string => {
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
