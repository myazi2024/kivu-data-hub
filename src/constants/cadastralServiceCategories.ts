/**
 * Source unique pour les catégories de services cadastraux.
 * Utilisé par `ServiceListItem` (panneau facturation), `CadastralCartButton`
 * (drawer panier) et `AdminCadastralServices` (admin) pour garantir une
 * apparence et un libellé identiques partout.
 */
export const CADASTRAL_SERVICE_CATEGORIES = ['consultation', 'fiscal', 'juridique'] as const;

export type CadastralServiceCategory = (typeof CADASTRAL_SERVICE_CATEGORIES)[number];

export interface CategoryMeta {
  label: string;
  className: string;
}

export const CADASTRAL_SERVICE_CATEGORY_META: Record<CadastralServiceCategory, CategoryMeta> = {
  consultation: { label: 'Consultation', className: 'bg-muted text-muted-foreground border-border' },
  fiscal: { label: 'Fiscal', className: 'bg-accent/20 text-accent-foreground border-accent/30' },
  juridique: { label: 'Juridique', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export const getCadastralCategoryMeta = (category?: string | null): CategoryMeta => {
  if (!category) return CADASTRAL_SERVICE_CATEGORY_META.consultation;
  return (
    CADASTRAL_SERVICE_CATEGORY_META[category as CadastralServiceCategory] ?? {
      label: category,
      className: 'bg-muted text-muted-foreground border-border',
    }
  );
};

export const isValidCadastralServiceCategory = (
  value: unknown
): value is CadastralServiceCategory =>
  typeof value === 'string' &&
  (CADASTRAL_SERVICE_CATEGORIES as readonly string[]).includes(value);
