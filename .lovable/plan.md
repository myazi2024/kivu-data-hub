

# Plan : Ajouter "Présentation BIC" dans l'espace admin (Contenu)

## Objectif

Ajouter un nouvel onglet **"Présentation BIC"** dans la catégorie **Contenu** de la sidebar admin, permettant de :
1. Voir la liste des 21 slides (ordre, titre, statut activé/désactivé)
2. Réordonner les slides par drag ou boutons haut/bas
3. Activer/désactiver des slides individuellement
4. Modifier les textes clés de chaque slide (titre, sous-titre, accroche pédagogique)
5. Consulter les demandes de partenaires reçues via le formulaire (table `partner_inquiries`)
6. Lien direct pour prévisualiser la présentation

## Modifications

### 1. Sidebar admin — Ajouter l'entrée

Dans `src/components/admin/AdminSidebar.tsx`, ajouter dans la catégorie **Contenu** :
```
{ icon: Presentation, label: 'Présentation BIC', value: 'pitch-config', badge: null }
```

### 2. Nouveau composant `AdminPitchConfig`

Créer `src/components/admin/AdminPitchConfig.tsx` avec deux onglets internes :

**Onglet "Slides"** :
- Tableau listant les 21 slides (ordre, titre, statut on/off)
- Toggle pour activer/désactiver chaque slide
- Boutons de réordonnancement (monter/descendre)
- Bouton "Prévisualiser" ouvrant `/pitch-partenaires` dans un nouvel onglet
- Les données de configuration seront stockées dans une table Supabase `pitch_slides_config`

**Onglet "Demandes partenaires"** :
- Tableau des entrées de `partner_inquiries` (nom, organisation, email, type, message, date)
- Filtres par type de partenariat et statut
- Possibilité de marquer comme "lu" / "traité"

### 3. Migration SQL

Créer la table `pitch_slides_config` :
- `id` (uuid, PK)
- `slide_id` (text, unique) — correspond aux IDs des slides
- `title` (text)
- `subtitle` (text, nullable)
- `enabled` (boolean, default true)
- `sort_order` (integer)
- `updated_at` (timestamptz)

Ajouter une colonne `status` (text, default 'new') à `partner_inquiries` pour le suivi.

RLS : lecture/écriture restreinte aux admins via `has_role`.

### 4. Brancher dans Admin.tsx

Ajouter le lazy import et le case `'pitch-config'` dans le switch du rendu des onglets.

## Fichiers concernés

| Fichier | Action |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Ajouter entrée menu |
| `src/components/admin/AdminPitchConfig.tsx` | Nouveau composant (2 onglets) |
| `src/pages/Admin.tsx` | Import + case switch |
| Migration SQL | Tables `pitch_slides_config` + colonne `status` sur `partner_inquiries` |
| `src/integrations/supabase/types.ts` | Mise à jour types |

