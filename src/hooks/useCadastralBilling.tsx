/**
 * @deprecated Ce fichier est maintenu uniquement pour les types exportés.
 * Utilisez useCadastralCart + useCadastralPayment + useCadastralServices à la place.
 * L'ancien hook useCadastralBilling a été supprimé car il dupliquait
 * toute la logique déjà présente dans les hooks modernes.
 */

import { CadastralService } from '@/hooks/useCadastralServices';

// Re-export type for backward compatibility
export type { CadastralService };

export interface CadastralInvoice {
  id: string;
  parcel_number: string;
  search_date: string;
  selected_services: any;
  total_amount_usd: number;
  status: string;
  invoice_number: string;
  client_name?: string | null;
  client_email: string;
  client_organization?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
}
