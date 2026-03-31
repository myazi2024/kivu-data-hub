

# Audit du menu "Actions" de la carte cadastrale

## Architecture

```text
┌──────────────────────────────────┐
│ parcel_actions_config (Supabase) │
│ action_key, label, description,  │
│ is_active, is_visible, badge_*,  │
│ display_order, category, ...     │
└──────────┬───────────────────────┘
           │ Realtime sync
    ┌──────▼──────────────────┐
    │ useParcelActionsConfig  │
    │ (fetch, map, fallback)  │
    └──────┬──────────┬───────┘
           │          │
  ┌────────▼───┐  ┌───▼────────────────────┐
  │ CadastralMap│  │ AdminParcelActionsConfig│
  │ └─ ParcelActionsDropdown │             │
  └────────────┘  └────────────────────────┘
```

8 actions configurées : Expertise, Mutation, Hypothèque, Ajout autorisation, Taxe foncière, Demande autorisation, Lotissement, Litige foncier.

---

## Problèmes identifiés

### 1. CRITIQUE — `parcelData` non transmis au menu Actions
**Fichier** : `CadastralMap.tsx` lignes 1305-1310
**Problème** : Le composant `ParcelActionsDropdown` accepte une prop `parcelData` mais elle n'est **jamais passée** depuis `CadastralMap`. Le dropdown reçoit `parcelData={undefined}`.
**Impact** : Tous les dialogs enfants (MutationRequestDialog, TaxManagementDialog, BuildingPermitRequestDialog, etc.) reçoivent `parcelData={undefined}`. Les formulaires qui dépendent de ces données (type de construction, propriétaire, zone géographique) ne peuvent pas pré-remplir leurs champs. `BuildingPermitRequestDialog` reçoit aussi `hasExistingConstruction={false}` systématiquement.

### 2. MOYEN — `requiresAuth` déclaré mais jamais vérifié
**Fichiers** : `useParcelActionsConfig.tsx`, `ParcelActionsDropdown.tsx`
**Problème** : Chaque action a une propriété `requiresAuth: true` mais le dropdown ne vérifie jamais si l'utilisateur est authentifié avant d'autoriser le clic. Un utilisateur non connecté peut ouvrir les dialogs, puis échouer au moment de l'insertion en base.
**Impact** : Mauvaise UX — l'utilisateur remplit un formulaire complet avant de découvrir qu'il doit se connecter.

### 3. MOYEN — Catégorie "dispute" absente de la config admin
**Fichier** : `AdminParcelActionsConfig.tsx` ligne 30-37
**Problème** : La liste `CATEGORIES` ne contient que 6 valeurs (expertise, mutation, mortgage, permit, tax, subdivision). La catégorie `dispute` (utilisée par l'action "Litige foncier") est absente. Si un admin modifie cette action, il ne peut pas sélectionner sa catégorie correcte.
**Impact** : Risque de mauvais classement de l'action litige dans l'interface admin.

### 4. MOYEN — Pas de gestion des icônes
**Fichiers** : `useParcelActionsConfig.tsx` (champ `iconName`), `ParcelActionsDropdown.tsx`
**Problème** : Le schéma supporte un champ `icon_name` et le hook le mappe vers `iconName`, mais le dropdown ne l'utilise jamais. Aucune icône n'est affichée à côté des actions dans le menu.
**Impact** : Le menu est moins lisible — pas de repère visuel par action, juste du texte.

### 5. MINEUR — Descriptions identiques pour deux actions de permis
**Actions** : `permit_add` et `permit_request`
**Problème** : Les deux ont la description "Autorisation de bâtir ou de régularisation". Leurs libellés ("Ajouter une autorisation" vs "Demander une autorisation") sont proches, ce qui crée de la confusion.
**Impact** : L'utilisateur ne sait pas quelle action choisir.

### 6. MINEUR — `saveConfig` fait N requêtes séquentielles
**Fichier** : `useParcelActionsConfig.tsx` lignes 237-260
**Problème** : La sauvegarde itère sur chaque action avec un `await` dans une boucle `for`. Pour 8 actions, cela fait 8 requêtes HTTP séquentielles.
**Impact** : Sauvegarde lente (~2-3s). Un `Promise.all` ou un upsert batch serait plus efficace.

### 7. MINEUR — Ordre de tri appliqué deux fois
**Fichiers** : Le hook fetche avec `.order('display_order')`, puis le dropdown re-trie avec `.sort((a, b) => a.displayOrder - b.displayOrder)`.
**Impact** : Négligeable en performance, mais code redondant.

---

## Recommandations

### Corrections prioritaires

1. **Passer `parcelData` au `ParcelActionsDropdown`** dans `CadastralMap.tsx`. Les données de la parcelle sélectionnée existent déjà (`selectedParcel`) — il suffit de les transmettre.

2. **Vérifier l'authentification** avant d'ouvrir un dialog quand `requiresAuth` est true. Si l'utilisateur n'est pas connecté, afficher un toast avec un lien vers la connexion au lieu d'ouvrir le formulaire.

3. **Ajouter la catégorie `dispute`** dans la liste `CATEGORIES` de `AdminParcelActionsConfig.tsx`.

### Améliorations

4. **Afficher les icônes** dans le dropdown en mappant `iconName` vers les composants lucide-react correspondants.

5. **Différencier les descriptions** des deux actions de permis pour lever l'ambiguïté.

6. **Optimiser `saveConfig`** avec un `Promise.all` au lieu d'une boucle séquentielle.

