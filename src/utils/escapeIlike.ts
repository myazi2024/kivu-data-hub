/**
 * Escapes a value before using it inside a Supabase `.ilike()` / `.or()` filter.
 * Prevents wildcard injection (%, _) and `.or()` parser breakage (commas, parentheses).
 */
export function escapeIlike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, ' ')
    .replace(/\(/g, ' ')
    .replace(/\)/g, ' ')
    .trim();
}
