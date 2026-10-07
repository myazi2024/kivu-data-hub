/** Vrai si la parcelle déclare réellement une servitude (CCC : { hasServitude: true, width }). */
export function hasDeclaredServitude(record: { servitude_data?: unknown } | null | undefined): boolean {
  const sd: any = record?.servitude_data;
  if (!sd) return false;
  if (Array.isArray(sd)) return sd.length > 0;
  if (typeof sd !== 'object') return false;
  if ('hasServitude' in sd) return sd.hasServitude === true;
  if (Array.isArray(sd.servitudes)) return sd.servitudes.length > 0;
  if (Array.isArray(sd.items)) return sd.items.length > 0;
  return Object.keys(sd).length > 0;
}

/** Répartition « Grevées » / « Libres » (catégories vides omises). */
export function encumberedDistribution(records: Array<{ servitude_data?: unknown }>): { name: string; value: number }[] {
  const e = records.filter(hasDeclaredServitude).length;
  const free = records.length - e;
  return [
    ...(e > 0 ? [{ name: 'Grevées', value: e }] : []),
    ...(free > 0 ? [{ name: 'Libres', value: free }] : []),
  ];
}
