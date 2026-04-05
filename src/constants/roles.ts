export const ROLE_HIERARCHY = [
  'super_admin',
  'admin',
  'expert_immobilier',
  'mortgage_officer',
  'notaire',
  'geometre',
  'urbaniste',
  'partner',
  'user',
] as const;

export type AppRole = (typeof ROLE_HIERARCHY)[number];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  expert_immobilier: 'Expert Immobilier',
  mortgage_officer: 'Agent Hypothécaire',
  notaire: 'Notaire',
  geometre: 'Géomètre',
  urbaniste: 'Urbaniste',
  partner: 'Partenaire',
  user: 'Utilisateur',
};

/**
 * Returns the highest role from a list of roles based on ROLE_HIERARCHY.
 */
export function getHighestRole(roles: string[]): AppRole {
  for (const hierarchyRole of ROLE_HIERARCHY) {
    if (roles.includes(hierarchyRole)) {
      return hierarchyRole;
    }
  }
  return 'user';
}
