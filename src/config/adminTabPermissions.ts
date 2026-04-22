/**
 * Mapping onglet admin → permission requise (resource + action).
 *
 * - `super_admin` bypass tout (vérifié côté hook).
 * - `admin` doit posséder la permission listée ici. Si l'onglet n'est pas
 *   listé, il est considéré comme accessible à tout admin (cas par défaut).
 * - Liste alignée sur la table `permissions` côté Supabase ; ajouter une
 *   nouvelle entrée ici si le besoin émerge (la permission doit exister en DB).
 *
 * Convention : on couvre uniquement les onglets sensibles (sécurité, paramètres
 * système, audit, comptabilité, mode test) pour éviter les faux blocages.
 */
export interface TabPermission {
  resource: string;
  action: string;
}

export const ADMIN_TAB_PERMISSIONS: Record<string, TabPermission> = {
  // --- Sécurité & utilisateurs ---
  'roles': { resource: 'roles', action: 'manage' },
  'permissions': { resource: 'permissions', action: 'manage' },
  'fraud': { resource: 'security', action: 'view' },
  'security-hub': { resource: 'security', action: 'view' },
  'audit-logs': { resource: 'audit_logs', action: 'view' },

  // --- Paramètres système ---
  'system-settings': { resource: 'system_settings', action: 'manage' },
  'system-health': { resource: 'system', action: 'view' },
  'system-hub': { resource: 'system', action: 'view' },
  'test-mode': { resource: 'test_mode', action: 'manage' },
  'appearance': { resource: 'appearance', action: 'manage' },

  // --- Comptabilité avancée ---
  'fec-export': { resource: 'accounting', action: 'export' },
  'accounting-journal': { resource: 'accounting', action: 'view' },
  'tva-reporting': { resource: 'accounting', action: 'view' },
  'fiscal-periods': { resource: 'accounting', action: 'manage' },

  // --- RH ---
  'hr': { resource: 'hr', action: 'manage' },
};

/** Onglets jamais bloqués (toujours visibles pour un admin authentifié). */
export const ALWAYS_ACCESSIBLE_TABS = new Set<string>([
  'dashboard',
  'analytics',
  'notifications',
]);
