import type { MortgageFee } from '@/components/cadastral/mortgage-cancellation/types';

export const DEFAULT_MORTGAGE_CANCELLATION_FEES: MortgageFee[] = [
  { id: 'dossier', name: "Frais d'ouverture de dossier", amount_usd: 50, is_mandatory: true, description: 'Frais administratifs de constitution du dossier' },
  { id: 'radiation', name: 'Droit de radiation', amount_usd: 100, is_mandatory: true, description: 'Droit de radiation au registre des titres fonciers' },
  { id: 'certificat', name: 'Certificat de radiation', amount_usd: 35, is_mandatory: true, description: 'Délivrance du certificat officiel de mainlevée' },
  { id: 'timbre', name: 'Droit de timbre', amount_usd: 15, is_mandatory: true, description: 'Timbre fiscal légal' },
  { id: 'conservation', name: 'Frais de conservation', amount_usd: 25, is_mandatory: true, description: 'Mise à jour du livre foncier' },
  { id: 'verification', name: 'Vérification complémentaire', amount_usd: 20, is_mandatory: false, description: 'Vérification approfondie des documents' },
];

export function normalizeMortgageFees(value: unknown): MortgageFee[] {
  if (!Array.isArray(value)) return DEFAULT_MORTGAGE_CANCELLATION_FEES;
  const fees = value
    .filter((fee): fee is Record<string, unknown> => !!fee && typeof fee === 'object')
    .map((fee) => ({
      id: typeof fee.id === 'string' ? fee.id : '',
      name: typeof fee.name === 'string' ? fee.name : '',
      amount_usd: Number(fee.amount_usd),
      description: typeof fee.description === 'string' ? fee.description : undefined,
      is_mandatory: fee.is_mandatory === true,
    }))
    .filter((fee) => fee.id && fee.name && Number.isFinite(fee.amount_usd) && fee.amount_usd >= 0);

  return fees.length > 0 ? fees : DEFAULT_MORTGAGE_CANCELLATION_FEES;
}

export function calculateMortgageFees(fees: MortgageFee[], selectedIds: string[]): number {
  const selected = new Set(selectedIds);
  return Math.round(fees.reduce((total, fee) => (
    fee.is_mandatory || selected.has(fee.id) ? total + fee.amount_usd : total
  ), 0) * 100) / 100;
}
