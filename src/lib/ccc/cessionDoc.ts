/** Libellé de l'acte de cession exigé selon le type de mutation de l'ancien propriétaire. */
export function getCessionDocLabel(mutationType?: string | null): string {
  const m = (mutationType || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (m.startsWith('vente') || m.startsWith('achat')) return 'Acte de vente';
  if (m.startsWith('donation')) return 'Acte de donation';
  if (m.startsWith('succession') || m.startsWith('heritage')) return "Jugement / certificat d'hérédité";
  if (m.startsWith('expropriation')) return "Arrêté d'expropriation";
  if (m.startsWith('echange')) return "Acte d'échange";
  return 'Acte de cession';
}
