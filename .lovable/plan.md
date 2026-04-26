# Audit — Admin / Contenu / Partenaires

## Périmètre
- `src/components/admin/AdminPartners.tsx` (283 lignes)
- `src/components/PartnersSection.tsx` (rendu public sur `/`)
- Table `public.partners` + bucket Storage `partners`
- Sidebar entrée `partners` (Handshake), Hub `AdminContentHub` (KPI "Partenaires actifs")

## Constats — Forces
- Soft-delete via `deleted_at` (préservé côté lecture publique et admin).
- RLS conforme : lecture publique restreinte aux actifs non supprimés, écriture admin/super_admin (migration du 26/04).
- Réordonnancement double : drag-drop + flèches ↑/↓ avec verrou `reordering` (UX mobile correcte sur 360px).
- Upload nommé via `crypto.randomUUID()` (conforme `mem://security/file-storage-naming-standard-fr`).
- Audit trigger `trg_audit_partners` actif (INSERT/UPDATE/DELETE).
- KPI `active_partners` exposé dans `content_hub_stats` et lié au Hub Contenu.

## Constats — Problèmes & dette

### 1. Validation URL absente (BUG donnée réelle)
Le partenaire « Institut National de la statistique » a `website_url = "Insrdc.cd"` — sans schéma. Dans `PartnersSection.tsx`, `<a href="Insrdc.cd">` est interprété comme chemin relatif (`/Insrdc.cd`), le clic casse la navigation. Aucune validation côté formulaire.

### 2. Pas de validation/limite de fichier logo
- Aucun contrôle de taille (un PNG 5 Mo passe).
- Aucun contrôle MIME réel (juste `accept="image/*"` côté input, contournable).
- Pas de feedback de prévisualisation avant upload.

### 3. Orphelins Storage à la suppression / remplacement
- `handleDelete` fait un soft-delete mais ne touche pas au logo dans le bucket.
- Lors d'un changement de logo (`handleSave`), l'ancien fichier reste orphelin dans `partners/`. Pas de mécanisme de purge.

### 4. Pas de restauration depuis la corbeille
Le toast indique « supprimé (corbeille) » mais aucune UI ne liste/restaure les partenaires `deleted_at IS NOT NULL`. Le soft-delete est en pratique une suppression définitive côté UX.

### 5. Réordonnancement N+1
`persistOrder` lance N `UPDATE` en parallèle (acceptable à 6 lignes, mais pas atomique : si une échoue, l'ordre est incohérent jusqu'au refetch). Pas de RPC `reorder_partners(uuid[])` comme on le voit ailleurs dans l'admin.

### 6. Accessibilité & UX mineurs
- Pas de `aria-label` sur les boutons icônes (Pencil, Trash, ↑, ↓) → lecteurs d'écran annoncent « bouton ».
- Champ « Ordre d'affichage » exposé dans le dialogue alors que le drag-drop+flèches gère déjà l'ordre → source de confusion (deux sources de vérité).
- `confirm()` natif pour la suppression → pas cohérent avec le reste de l'admin qui utilise `AlertDialog` shadcn.
- Pas de recherche/filtre actif/inactif (négligeable à 6 lignes, à anticiper).

### 7. Pas de bulk activate/deactivate
Pratique courante ailleurs dans l'admin (cf. `mem://admin/admin-component-modularization-fr`).

### 8. Pas d'événement analytics admin
`mem://admin/admin-analytics-tracking-fr` recommande `admin_action` sur create/update/delete/reorder. Non émis ici.

### 9. Pas d'analytics public
`PartnersSection.tsx` track `partner_logo_click` ✅ — mais pas d'`partner_impression`. (Optionnel.)

## Recommandations (priorisées)

### P0 — Correctifs immédiats
1. **Validation `website_url`** dans `handleSave` : forcer un préfixe `https://` si absent, valider avec `URL()` ; message d'erreur clair.
2. **Migration data** : corriger la ligne « Insrdc.cd » → `https://www.ins-rdc.org/` (à confirmer avec l'utilisateur).
3. **Validation logo** : refuser >2 Mo, MIME `image/png|jpeg|webp|svg+xml`, prévisualisation avant upload.

### P1 — Hygiène stockage
4. **Purge Storage** : 
   - Lors d'un remplacement de logo : supprimer l'ancien fichier (parser le path depuis `logo_url`).
   - Lors d'un soft-delete : marquer le fichier orphelin (option : conserver pour restauration, purger via cron mensuel sur `deleted_at < now() - 90 days`).

### P1 — UX
5. **Onglet « Corbeille »** dans le composant : liste les `deleted_at IS NOT NULL`, bouton « Restaurer » (set `deleted_at = NULL`) et « Supprimer définitivement » (hard delete + purge logo).
6. **Retirer le champ « Ordre d'affichage »** du dialog (laisser le drag-drop+flèches uniquement).
7. **Remplacer `confirm()`** par `AlertDialog` shadcn (cohérence visuelle).
8. **Ajouter `aria-label`** sur tous les boutons icônes ("Modifier {nom}", "Supprimer {nom}", "Monter", "Descendre").

### P2 — Robustesse & analytics
9. **RPC `reorder_partners(ids uuid[])`** : transaction atomique pour l'ordre.
10. **`trackEvent('admin_action', { entity:'partner', action:'create|update|delete|reorder', id })`** dans chaque mutation.
11. **Bulk actions** : sélection multiple + activer/désactiver/supprimer en lot.

## Détails techniques

### Diff conceptuel — validation URL
```ts
const normalizeUrl = (raw: string): string | null => {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { new URL(withScheme); return withScheme; }
  catch { throw new Error('URL du site web invalide'); }
};
```

### Purge logo lors d'un remplacement
```ts
const extractStoragePath = (publicUrl: string): string | null => {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/partners\/(.+)$/);
  return m?.[1] ?? null;
};
// Avant l'update si logo remplacé :
const oldPath = editing?.logo_url ? extractStoragePath(editing.logo_url) : null;
if (oldPath) await supabase.storage.from('partners').remove([oldPath]);
```

### Corbeille — requête
```ts
const { data } = await untypedTables.partners()
  .select('*').not('deleted_at', 'is', null)
  .order('deleted_at', { ascending: false });
```

### RPC réordonnancement (migration)
```sql
CREATE OR REPLACE FUNCTION public.reorder_partners(_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'super_admin')
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.partners p SET display_order = ord.idx - 1
  FROM unnest(_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id;
END $$;
```

## État BD actuel (snapshot)
- 6 partenaires, tous actifs, aucun supprimé, tous avec logo.
- 1 ligne avec URL invalide (Insrdc.cd).

## Fichiers impactés (implémentation)
- `src/components/admin/AdminPartners.tsx` (refactor : validation, AlertDialog, a11y, corbeille tab, retrait champ ordre)
- `src/lib/partnerValidation.ts` *(nouveau)* : `normalizeUrl`, `validateLogoFile`, `extractStoragePath`
- `supabase/migrations/...` : `reorder_partners(uuid[])` RPC + UPDATE data fix Insrdc
- `src/lib/analytics.ts` : événements `admin_action` (déjà présent, juste à appeler)

## Question avant implémentation
Souhaitez-vous tout (P0+P1+P2) ou seulement P0+P1 ? Et confirmez-vous l'URL correcte pour « Institut National de la statistique » (`https://www.ins-rdc.org/` ou autre) ?
