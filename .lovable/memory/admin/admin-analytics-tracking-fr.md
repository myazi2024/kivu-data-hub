---
name: Admin analytics tracking
description: Helper centralisé useAdminAnalytics (trackEvent admin_action + invalidation queryKey unifiée par module) + page_view onglets via Admin.tsx
type: feature
---

## Page-view & accès

`src/pages/Admin.tsx` émet automatiquement :

- `admin_tab_view` `{ tab, sub }` à chaque changement d'onglet/sous-onglet (effet sur `[activeTab, subTab]`).
- `admin_tab_denied` `{ tab }` quand un onglet demandé est refusé par les permissions.

Inutile de tracer la navigation dans les sous-composants : c'est piloté par le shell.

## Actions critiques — `useAdminAnalytics`

Helper unique : `src/lib/adminAnalytics.ts`.

```ts
const { trackAdminAction } = useAdminAnalytics();
trackAdminAction({
  module: 'mortgage',
  action: 'approve',
  ref:  { request_id, parcel_number },
  meta: { reason },
});
```

- Émet `trackEvent('admin_action', { module, action, ...ref, ...meta })`.
- Invalide les queryKey listées dans `INVALIDATION_MAP[module]` (préfixe react-query).
- Toujours appelé **après** `toast.success` et **avant** `fetch…/setOpen(false)`.

### Modules instrumentés

`expertise`, `land_title`, `mutation`, `mortgage`, `land_dispute`, `ccc`
(approve/reject/return + bulk_approve/bulk_reject + escalate_stale + block_user/unblock_user pour `fraud`).

### Ajouter un nouveau module

1. Étendre l'union `AdminModule` et `INVALIDATION_MAP` dans `adminAnalytics.ts`
   avec les préfixes de queryKey à invalider (toujours inclure `['admin-pending-counts']`
   si le compteur sidebar est concerné).
2. Importer `useAdminAnalytics` dans le composant et appeler `trackAdminAction(...)`
   après chaque action critique (approve / reject / return / bulk / escalate / block …).

### Bonnes pratiques

- Ne pas appeler `trackEvent('admin_action', …)` directement — passer par le helper
  pour bénéficier de l'invalidation queryKey.
- Les payloads ne doivent jamais contenir de PII complète (email, téléphone) ; se
  limiter aux identifiants techniques (id, reference_number, parcel_number).
