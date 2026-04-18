import { Crown, Shield, Briefcase, User as UserIcon, type LucideIcon } from 'lucide-react';

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

export interface RoleMeta {
  label: string;
  icon: LucideIcon;
  color: string; // gradient class
  badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline';
  description: string;
}

export const ROLE_CONFIG: Record<AppRole, RoleMeta> = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    badgeVariant: 'destructive',
    description: 'Tous les privilèges système',
  },
  admin: {
    label: 'Administrateur',
    icon: Shield,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    badgeVariant: 'destructive',
    description: 'Gestion des utilisateurs et contenus',
  },
  expert_immobilier: {
    label: 'Expert Immobilier',
    icon: UserIcon,
    color: 'bg-gradient-to-r from-amber-500 to-orange-500',
    badgeVariant: 'default',
    description: 'Expertises et certificats immobiliers',
  },
  mortgage_officer: {
    label: 'Agent Hypothécaire',
    icon: UserIcon,
    color: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    badgeVariant: 'default',
    description: 'Gestion des hypothèques',
  },
  notaire: {
    label: 'Notaire',
    icon: Briefcase,
    color: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    badgeVariant: 'default',
    description: 'Mutations et attestations notariées',
  },
  geometre: {
    label: 'Géomètre',
    icon: Shield,
    color: 'bg-gradient-to-r from-lime-500 to-green-500',
    badgeVariant: 'default',
    description: 'Bornage et lotissement',
  },
  urbaniste: {
    label: "Agent d'urbanisme",
    icon: Shield,
    color: 'bg-gradient-to-r from-rose-500 to-red-500',
    badgeVariant: 'default',
    description: 'Autorisations de bâtir',
  },
  partner: {
    label: 'Partenaire',
    icon: Briefcase,
    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    badgeVariant: 'default',
    description: 'Codes de remise et commissions',
  },
  user: {
    label: 'Utilisateur',
    icon: UserIcon,
    color: 'bg-gradient-to-r from-gray-500 to-slate-500',
    badgeVariant: 'secondary',
    description: 'Accès standard',
  },
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

/** Sensitive roles requiring extra UI guard for bulk assignment. */
export const SENSITIVE_ROLES: AppRole[] = ['super_admin', 'admin', 'notaire', 'geometre', 'urbaniste'];
