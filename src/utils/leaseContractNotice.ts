import { supabase } from '@/integrations/supabase/client';

interface LeaseContractCheckData {
  isRented?: boolean;
  rentalConfiguration?: 'single' | 'multi';
  isOccupied?: boolean;
  leaseContractUrl?: string;
  parcelNumber?: string;
  rentalUnits?: Array<{ label?: string; isOccupied?: boolean; leaseContractUrl?: string }>;
}

/** Nombre de locaux occupés dont le contrat de location n'a pas été joint. */
function countMissingLeaseContracts(data: LeaseContractCheckData): number {
  if (!data?.isRented) return 0;
  if (data.rentalConfiguration === 'multi') {
    return (data.rentalUnits || []).filter((u) => u?.isOccupied === true && !u?.leaseContractUrl).length;
  }
  return data.isOccupied === true && !data.leaseContractUrl ? 1 : 0;
}

/**
 * Crée une notification invitant l'utilisateur à déposer plus tard
 * le(s) contrat(s) de location manquant(s). Ne bloque jamais la soumission.
 */
export async function notifyMissingLeaseContract(data: LeaseContractCheckData): Promise<void> {
  try {
    const missing = countMissingLeaseContracts(data);
    if (missing === 0) return;

    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return;

    const parcel = data.parcelNumber ? ` (parcelle ${data.parcelNumber})` : '';
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title: 'Contrat de location à ajouter',
      message: missing > 1
        ? `${missing} locaux occupés${parcel} n'ont pas encore de contrat de location. Vous pouvez les ajouter depuis votre espace utilisateur.`
        : `Le contrat de location${parcel} n'a pas encore été joint. Vous pouvez l'ajouter depuis votre espace utilisateur.`,
      action_url: '/user-dashboard?tab=contributions',
    });
  } catch (e) {
    console.error('Notification contrat de location :', e);
  }
}
