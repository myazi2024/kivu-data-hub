

# Audit detaille — Barre de recherche admin (Header)

## Etat actuel

La barre de recherche dans `AdminDashboardHeader.tsx` (lignes 141-176) fonctionne comme un simple filtre textuel sur les labels des entrees de la sidebar (`menuItems`). Elle ne recherche que les **noms de menus** et leurs **categories**.

### Lacunes identifiees

**1. Recherche limitee aux menus uniquement**
La barre ne cherche que dans les ~50 labels de navigation (ex: "Utilisateurs", "Dashboard"). Elle ne recherche pas dans le contenu reel : utilisateurs, parcelles, factures, contributions, codes CCC, etc. Un admin qui tape "dupont@email.com" ou "AB-1234" n'obtient aucun resultat.

**2. Pas de raccourcis clavier**
Aucun shortcut pour ouvrir la recherche rapidement (ex: `Ctrl+K` ou `/`). L'admin doit cliquer manuellement dans le champ.

**3. Pas de recherche par mots-cles / synonymes**
Taper "paiement" ne trouve pas "Factures" ni "Revenus". Aucun mapping de termes equivalents.

**4. Pas d'historique de recherche**
Les recherches precedentes ne sont pas memorisees. Pas de suggestions recentes.

**5. Dropdown basique sans categories visuelles**
Les resultats sont affiches dans une liste plate sans regroupement par categorie, sans highlighting du terme recherche, et sans icones distinctives pour les types de resultats.

**6. Pas de recherche multi-entites**
Impossible de chercher directement un utilisateur, une parcelle ou une facture depuis la barre — il faut d'abord naviguer vers le module puis utiliser le filtre local.

**7. Navigation clavier incomplete**
Seul `Enter` selectionne le premier resultat et `Escape` ferme. Pas de navigation avec fleches haut/bas pour parcourir la liste.

**8. Pas de debounce**
Le filtrage se fait a chaque frappe sans delai. Pour une recherche locale sur ~50 items c'est negligeable, mais si on ajoute des requetes Supabase ce sera problematique.

**9. Responsive insuffisant**
Sur mobile (360px, viewport actuel), le champ de recherche occupe tout l'espace mais le dropdown de resultats peut deborder.

---

## Plan d'optimisation

### Phase 1 — UX et navigation (sans backend)

**Fichier : `src/components/admin/AdminDashboardHeader.tsx`**

- **Raccourci clavier `Ctrl+K`** : Ouvrir/focus la barre de recherche avec un shortcut global. Afficher un badge `⌘K` dans le placeholder.
- **Navigation clavier complete** : Ajouter un `selectedIndex` pour naviguer avec les fleches haut/bas dans les resultats, `Enter` pour valider la selection courante.
- **Highlighting du terme** : Mettre en surbrillance la partie du texte qui correspond a la recherche dans chaque resultat.
- **Regroupement par categorie** : Afficher les resultats groupes par leur `category` avec des headers de section.
- **Mots-cles / synonymes** : Ajouter un champ `keywords` aux items de menu (ex: "Factures" → `['paiement', 'invoice', 'argent']`) pour elargir la recherche.
- **Historique recent** : Stocker les 5 dernieres recherches dans `localStorage`, les afficher quand le champ est vide et focus.

### Phase 2 — Recherche multi-entites (avec Supabase)

**Nouveau fichier : `src/hooks/useAdminGlobalSearch.ts`**

Hook qui, au-dela de 2 caracteres, lance des requetes paralleles (avec debounce 300ms) sur :
- `profiles` (nom, email) → resultats "Utilisateurs"
- `parcels` (numero) → resultats "Parcelles"  
- `invoices` (numero, client) → resultats "Factures"
- `ccc_contributions` (numero parcelle) → resultats "Contributions"

Chaque resultat inclut un type, un label, une icone et une URL de navigation directe.

**Fichier : `src/components/admin/AdminDashboardHeader.tsx`**

Fusionner les resultats menu + resultats Supabase dans le dropdown, regroupes par type avec un indicateur de chargement.

### Phase 3 — Composant Command Palette

Remplacer le dropdown custom par le composant `Command` (cmdk) deja installe dans le projet (`src/components/ui/command.tsx`), affiche dans un dialog modal (`CommandDialog`). Cela donne automatiquement :
- Navigation clavier native
- Groupes de resultats
- Animation et style coherent avec le design system
- Meilleure accessibilite (ARIA)

---

## Section technique

**Fichiers crees** :
- `src/hooks/useAdminGlobalSearch.ts` — hook de recherche multi-entites

**Fichiers modifies** :
- `src/components/admin/AdminDashboardHeader.tsx` — remplacement du search par CommandDialog, raccourci Ctrl+K, historique
- `src/components/admin/AdminSidebar.tsx` — ajout de `keywords` sur les `menuItems`

**Dependances** : Aucune nouvelle — `cmdk` et `useDebounce` sont deja disponibles.

