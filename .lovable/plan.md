

# Enrichir la liste des rôles selon les données collectées par l'application

## Analyse des services et données de l'application

L'application gère les services cadastraux suivants, chacun impliquant des acteurs métier spécifiques :

| Service | Acteurs métier impliqués | Rôle existant ? |
|---------|------------------------|-----------------|
| Expertise immobilière | Expert immobilier | ✅ `expert_immobilier` |
| Hypothèques | Agent hypothécaire | ✅ `mortgage_officer` |
| Mutations de propriété | Notaire (attestation notariée, acte de vente) | ❌ Manquant |
| Bornage / Lotissement | Géomètre (surveyor_name, PV de bornage) | ❌ Manquant |
| Autorisations de bâtir | Agent d'urbanisme (service émetteur, contrôle) | ❌ Manquant |
| Litiges fonciers | — (traité par admin) | — |
| Partenaires / Revendeurs | Partenaire commercial | ✅ `partner` |

## Rôles à ajouter

### 1. `notaire` — Notaire
- **Justification** : Les mutations référencent des "attestations notariées", "actes de vente notariés". Un notaire devrait pouvoir consulter et valider les demandes de mutation qui le concernent.
- **Permissions** : Consulter les mutations, valider les documents de mutation, accéder aux fiches parcellaires concernées.

### 2. `geometre` — Géomètre
- **Justification** : Les bornages collectent `surveyor_name`, `survey_date`, `pv_reference_number`. Les lotissements requièrent un géomètre agréé. Ce rôle permet au géomètre de consulter/soumettre ses PV de bornage.
- **Permissions** : Consulter les bornages, soumettre des PV, accéder aux lotissements assignés.

### 3. `urbaniste` — Agent d'urbanisme
- **Justification** : Les autorisations de bâtir référencent un `building_permit_issuing_service` (Mairie, Division de l'Urbanisme). Ce rôle permet à l'agent de traiter les demandes d'autorisation.
- **Permissions** : Consulter les demandes d'autorisation, valider/rejeter, accéder aux informations de construction.

## Plan technique

### 1. Migration SQL — ajouter les 3 valeurs à l'enum `app_role`

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'notaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'geometre';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'urbaniste';
```

Mettre à jour `get_user_highest_role` pour inclure les nouveaux rôles dans la hiérarchie (notaire = 5, geometre = 6, urbaniste = 7, les autres décalés).

Insérer les permissions par défaut pour chaque nouveau rôle dans `role_permissions`.

### 2. Mettre à jour `roleConfig` dans les 3 fichiers UI

Ajouter les 3 rôles avec icône, label, couleur et description dans :
- `AdminUserRolesEnhanced.tsx`
- `AdminUserRoles.tsx`
- `AdminPermissions.tsx`

### 3. Mettre à jour `types.ts`

Ajouter les 3 nouvelles valeurs à l'enum `app_role` dans le fichier de types Supabase.

## Fichiers modifiés

| Action | Fichier |
|--------|---------|
| Migration SQL | Enum + hiérarchie + permissions par défaut |
| Modifié | `src/components/admin/AdminUserRolesEnhanced.tsx` |
| Modifié | `src/components/admin/AdminUserRoles.tsx` |
| Modifié | `src/components/admin/AdminPermissions.tsx` |
| Modifié | `src/integrations/supabase/types.ts` |

