import * as Icons from 'lucide-react';
import { Building2, type LucideIcon } from 'lucide-react';

/**
 * Résout dynamiquement un nom d'icône lucide-react (ex: "FileText", "MapPin")
 * en composant React. Fallback sur Building2 si le nom est inconnu.
 *
 * Utilisé pour permettre aux configurations BD (cadastral_services_config.icon_name,
 * article_themes.icon_name, etc.) de piloter l'affichage sans hard-coder le mapping
 * dans chaque composant.
 */
export const resolveLucideIcon = (
  name: string | null | undefined,
  fallback: LucideIcon = Building2
): LucideIcon => {
  if (!name) return fallback;
  const Comp = (Icons as unknown as Record<string, LucideIcon>)[name];
  return Comp || fallback;
};
