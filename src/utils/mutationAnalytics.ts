import { getMutationTypeLabel } from '@/components/cadastral/mutation/MutationConstants';

/** Nombre de parcelles distinctes par type de mutation (libellés CCC), trié décroissant. */
export function mutationTypeParcelData(
  records: { parcel_id?: string | null; mutation_type?: string | null }[],
): { name: string; value: number }[] {
  const map = new Map<string, Set<string>>();
  records.forEach((r, i) => {
    const t = (r.mutation_type || '').trim();
    if (!t) return;
    const label = getMutationTypeLabel(t.toLowerCase());
    if (!map.has(label)) map.set(label, new Set());
    map.get(label)!.add(r.parcel_id || `__row_${i}`);
  });
  return Array.from(map.entries())
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value);
}
