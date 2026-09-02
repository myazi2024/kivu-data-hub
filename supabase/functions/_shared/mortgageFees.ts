/**
 * Barème serveur des frais de radiation d'hypothèque.
 *
 * Le client ne fait que proposer un montant : c'est cette source qui fait foi.
 * Le barème est éditable dans l'espace Admin (clé `mortgage_cancellation_fees`
 * de `cadastral_contribution_config`).
 */
export interface MortgageFee {
  id: string;
  name: string;
  amount_usd: number;
  description?: string;
  is_mandatory: boolean;
}

export const DEFAULT_MORTGAGE_CANCELLATION_FEES: MortgageFee[] = [
  { id: 'dossier', name: "Frais d'ouverture de dossier", amount_usd: 50, is_mandatory: true, description: 'Frais administratifs de constitution du dossier' },
  { id: 'radiation', name: 'Droit de radiation', amount_usd: 100, is_mandatory: true, description: 'Droit de radiation au registre des titres fonciers' },
  { id: 'certificat', name: 'Certificat de radiation', amount_usd: 35, is_mandatory: true, description: 'Délivrance du certificat officiel de mainlevée' },
  { id: 'timbre', name: 'Droit de timbre', amount_usd: 15, is_mandatory: true, description: 'Timbre fiscal légal' },
  { id: 'conservation', name: 'Frais de conservation', amount_usd: 25, is_mandatory: true, description: 'Mise à jour du livre foncier' },
  { id: 'verification', name: 'Vérification complémentaire', amount_usd: 20, is_mandatory: false, description: 'Vérification approfondie des documents' },
];

function isValidFee(value: unknown): value is MortgageFee {
  const fee = value as MortgageFee;
  return !!fee
    && typeof fee.id === 'string'
    && typeof fee.name === 'string'
    && Number.isFinite(Number(fee.amount_usd));
}

/** Charge le barème configuré, avec repli sur le barème par défaut. */
export async function loadMortgageCancellationFees(supabase: any): Promise<MortgageFee[]> {
  try {
    const { data } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'mortgage_cancellation_fees')
      .eq('is_active', true)
      .maybeSingle();

    const configured = data?.config_value;
    if (Array.isArray(configured)) {
      const parsed = configured.filter(isValidFee).map((fee) => ({
        ...fee,
        amount_usd: Number(fee.amount_usd),
        is_mandatory: fee.is_mandatory === true,
      }));
      if (parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error('loadMortgageCancellationFees error:', error);
  }
  return DEFAULT_MORTGAGE_CANCELLATION_FEES;
}

/**
 * Montant dû = tous les frais obligatoires + les frais optionnels réellement
 * choisis par le demandeur et enregistrés dans sa demande.
 */
export function computeMortgageCancellationDue(
  fees: MortgageFee[],
  selectedFeeIds: string[],
): number {
  const selected = new Set(selectedFeeIds);
  const total = fees.reduce((sum, fee) => {
    const included = fee.is_mandatory || selected.has(fee.id);
    return included ? sum + Number(fee.amount_usd || 0) : sum;
  }, 0);
  return Math.round(total * 100) / 100;
}
