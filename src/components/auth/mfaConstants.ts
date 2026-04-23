import type { AppRole } from '@/constants/roles';

/** Roles for which MFA enrollment is mandatory. */
export const SENSITIVE_ADMIN_ROLES: AppRole[] = ['admin', 'super_admin'];

export const SENSITIVE_ROLES_LABEL_REQUIRED = 'Obligatoire pour les rôles administrateurs';

export function isAdminRole(role?: AppRole | null): boolean {
  if (!role) return false;
  return (SENSITIVE_ADMIN_ROLES as string[]).includes(role);
}
