

# Rendre fonctionnelle la barre de recherche admin

## Probleme
L'input de recherche dans `AdminDashboardHeader.tsx` (ligne 100-104) est purement cosmétique : pas de state, pas de `onChange`, pas de logique de filtrage. Il ne fait rien quand on tape.

## Solution
Transformer cette barre en une recherche de navigation rapide qui filtre les sections/menus du panneau admin et permet d'y accéder directement.

## Modifications

### 1. `src/components/admin/AdminDashboardHeader.tsx`
- Ajouter un state `searchTerm` et un state `showResults` (dropdown de résultats)
- Importer la liste `menuItems` depuis `AdminSidebar.tsx` (l'exporter au préalable)
- Filtrer les items du menu selon le terme de recherche (sur `label` et `category`)
- Afficher un dropdown (Popover) sous l'input avec les résultats filtrés
- Au clic sur un résultat, naviguer vers `/admin?tab={value}` et fermer le dropdown
- Support clavier : Escape ferme, Enter sélectionne le premier résultat
- Fermer le dropdown quand l'input est vide ou quand on clique ailleurs

### 2. `src/components/admin/AdminSidebar.tsx`
- Exporter la constante `menuItems` pour qu'elle soit réutilisable par le header

### Comportement attendu
- L'utilisateur tape dans la barre de recherche
- Un dropdown apparait avec les sections admin correspondantes (icône + label + catégorie)
- Un clic ou Entrée navigue vers l'onglet sélectionné
- La recherche se vide après navigation

