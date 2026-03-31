

# Audit détaillé — Système de Notifications

## Architecture actuelle

```text
┌─────────────────────────────────────────────────────────┐
│  BASE DE DONNÉES (Supabase)                             │
│  Table: public.notifications                            │
│  Colonnes: id, user_id, title, message, type,           │
│            is_read, action_url, created_at, read_at     │
│  RLS: SELECT/UPDATE own, INSERT authenticated,          │
│       Admin SELECT/UPDATE/DELETE all                    │
│  Index: idx_notifications_user_id (WHERE is_read=false) │
│         idx_notifications_created_at (DESC)             │
│  Trigger: validate_notification_user (avant INSERT/UPD) │
│  Cleanup: cleanup_old_data() supprime notifs lues > 30j │
└───────────┬─────────────────────────┬───────────────────┘
            │                         │
   ┌────────▼────────┐      ┌────────▼────────────┐
   │ FRONT-END USER  │      │ FRONT-END ADMIN     │
   │ NotificationBell│      │ AdminNotifications   │
   │ useNotifications│      │ (envoi, historique,  │
   │ (fetch, read,   │      │  suppression, CSV)   │
   │  realtime, del) │      │                      │
   └─────────────────┘      └──────────────────────┘
```

## Points émetteurs de notifications (24 fichiers)

| Module | Événement | Type |
|---|---|---|
| BuildingPermitRequestDialog | Demande soumise | success |
| PropertyTaxCalculator | Déclaration impôt | info |
| BuildingTaxCalculator | Déclaration taxe bâtisse | info |
| IRLCalculator | Déclaration IRL | info |
| MortgageFormDialog | Enregistrement hypothèque | info |
| MortgageCancellationDialog | Radiation hypothèque | info |
| RealEstateExpertiseRequestDialog | Demande expertise | success |
| LandDisputeReportForm | Litige signalé | success |
| LandDisputeLiftingForm | Levée litige | success |
| AdminCCCContributions | Rejet/retour contribution | error/warning |
| AdminTaxDeclarations | Approbation/rejet/correction déclaration | success/error/warning |
| AdminSubdivisionRequests | Approbation/rejet/retour subdivision | success/error/info |
| AdminLandTitleRequests | Traitement titre foncier | success/error/info |
| AdminMutationRequests | Traitement mutation | success/error/info/warning |
| AdminLandDisputes | Mise à jour litige | success |
| PermitRequestDialog (admin) | Traitement permis | success/error/warning |
| AppealManagementDialog | Acceptation/rejet appel | success/error |
| UserDetailsDialog | Note/action sur utilisateur | account |
| useBulkUserActions | Actions groupées | account |
| usePermitPayment | Paiement permis confirmé | success |
| Triggers SQL (CCC) | Code CCC généré | success |
| notifyAdminsAboutDispute | Alerte admin litiges | info |

---

## Problèmes identifiés

### 1. CRITIQUE — Type "account" non supporté par le schéma
**Fichiers** : `UserDetailsDialog.tsx`, `useBulkUserActions.tsx`
**Problème** : Ces composants insèrent `type: 'account'`, mais le hook `useNotifications` et `NotificationBell` ne gèrent que 4 types (`info`, `success`, `warning`, `error`). Le type "account" n'a pas de couleur définie → il tombe dans le `default` (bleu), mais le typage TypeScript est incohérent.
**Impact** : Pas de crash, mais incohérence de typage et comportement visuel non explicite.

### 2. CRITIQUE — `action_url` pointe vers des routes obsolètes
**Fichiers** : Multiples (BuildingPermitRequestDialog, etc.)
**Problème** : Certaines notifications utilisent `action_url: '/user-dashboard?tab=...'`. Le `NotificationBell` a un `resolveActionUrl` qui ne mappe que `/user-dashboard` → `/mon-compte`. Si d'autres routes changent, le mapping sera silencieusement cassé.
**Impact** : Les clics sur les notifications peuvent mener vers des pages 404 ou incorrectes.

### 3. MOYEN — Utilisation de `as any` pour contourner le typage
**Fichier** : `disputeUploadUtils.ts`
**Problème** : `supabase.from('notifications' as any).insert(...)` contourne la vérification de type. Si la structure de la table change, aucune erreur ne sera détectée à la compilation.
**Impact** : Risque de bugs silencieux.

### 4. MOYEN — Pas de politique RLS pour DELETE côté utilisateur
**Migration** : `20251009114328` ne définit que SELECT et UPDATE pour les utilisateurs. La politique DELETE n'existe que pour les admins (`20251117162917`).
**Problème** : Le hook `useNotifications` a une fonction `deleteNotification` qui sera bloquée par RLS pour les utilisateurs non-admin.
**Impact** : Le bouton corbeille dans `NotificationBell` ne fonctionne pas — l'utilisateur reçoit une erreur silencieuse.

### 5. MOYEN — Aucune limite sur le fetch admin
**Fichier** : `AdminNotifications.tsx` ligne 122-125
**Problème** : Le fetch admin n'a aucun `.limit()`. Avec le temps, cela charge toutes les notifications de tous les utilisateurs en mémoire.
**Impact** : Dégradation de performance progressive.

### 6. MINEUR — Fire-and-forget sans await
**Fichiers** : `PropertyTaxCalculator.tsx`, `BuildingTaxCalculator.tsx`, `IRLCalculator.tsx`
**Problème** : L'insertion est faite sans `await` (`supabase.from('notifications').insert(...)` sans `await`). Si ça échoue, aucune trace, aucun log.
**Impact** : Notifications potentiellement perdues sans trace.

### 7. MINEUR — Channel Realtime non unique
**Fichier** : `useNotifications.tsx` ligne 58
**Problème** : Le nom du channel `'user-notifications'` est hardcodé. Si le hook est instancié deux fois (rare mais possible), deux subscriptions se chevauchent.
**Impact** : Doublons de notifications dans l'interface.

### 8. MINEUR — Nettoyage automatique incomplet
**Migration** : `cleanup_old_data()` supprime les notifs lues > 30 jours, mais aucun cron/pg_cron n'est configuré pour l'exécuter.
**Impact** : La fonction existe mais n'est jamais appelée automatiquement.

---

## Recommandations

### Corrections prioritaires

1. **Ajouter une politique RLS DELETE pour les utilisateurs** sur leurs propres notifications — sans cela le bouton supprimer du `NotificationBell` est non fonctionnel.

2. **Standardiser les types de notification** : soit ajouter `'account'` au type union partout (hook, bell, admin), soit remplacer par `'info'` dans les composants qui utilisent `'account'`.

3. **Centraliser la création de notifications** dans une fonction utilitaire unique (ex: `createNotification()`) pour éviter la duplication dans 24+ fichiers et garantir la cohérence des types, action_url et gestion d'erreurs.

### Améliorations recommandées

4. **Ajouter `.limit(500)` au fetch admin** et/ou implémenter une pagination côté serveur.

5. **Supprimer les `as any`** dans `disputeUploadUtils.ts` — utiliser le client typé.

6. **Ajouter `await`** aux insertions fire-and-forget ou au minimum un `.then(null, console.warn)`.

7. **Configurer pg_cron** pour exécuter `cleanup_old_data()` périodiquement.

8. **Rendre le mapping `resolveActionUrl` dynamique** ou supprimer les routes obsolètes des `action_url` à la source.

