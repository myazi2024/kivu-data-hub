## Problème

Le drapeau `parcel.has_dispute` est affiché publiquement à deux endroits sans paiement, alors que la consultation des litiges est un service payant du catalogue (`land_disputes`, géré par `LockedSection` dans `CadastralDocumentView`) :

1. **Carte cadastrale** (`src/hooks/useLeafletMap.tsx`, lignes 207, 216, 222, 234‑242) : étiquette « ⚠ Litige » sur la parcelle + couleur orange + contour pointillé spécifique. Visible par n'importe quel visiteur naviguant sur la carte.
2. **En‑tête de la fiche cadastrale** (`src/components/cadastral/cadastral-document/DocumentHeader.tsx`, lignes 55‑60) : badge rouge « ⚠ Litige » affiché dès l'ouverture du document, avant tout paiement de la section Litiges.

Ces deux signaux révèlent gratuitement une information sensible (existence d'un contentieux) qui doit être réservée aux utilisateurs ayant payé le service `land_disputes`. C'est une fuite de valeur business **et** un risque réputationnel pour le propriétaire de la parcelle (ex : faux signalement visible publiquement).

Le champ `is_subdivided` (« Lotie ») n'est pas concerné : c'est une information administrative publique et non un service payant.

## Correctifs

### 1. `src/hooks/useLeafletMap.tsx`

- **Retirer la sélection** de `has_dispute` côté requête (`useCadastralMapData.tsx`, ligne 27) — le champ ne doit plus quitter le serveur pour les consommateurs publics de la carte.
- Dans `renderLayers` :
  - Supprimer la variable `hasDispute` et la branche de styling spécifique litige (couleur orange `#f97316`, dashArray `8 4`, opacité 0.15).
  - Supprimer le `L.marker` du label « ⚠ Litige » (lignes 234‑242).
  - Conserver uniquement la logique `isSubdivided` (label « Lotie ») dans le bloc `if (isSubdivided || hasDispute)` → réduire à `if (isSubdivided)`.
- Nettoyer le commentaire d'architecture (`cadastral-map-architecture-fr.md` mentionne "has_dispute désormais sélectionné → overlay litige fonctionnel" — à inverser).

### 2. `src/components/cadastral/cadastral-document/DocumentHeader.tsx`

- Supprimer le bloc `{parcel.has_dispute && (...)}` (lignes 55‑60).
- Retirer l'import inutilisé `AlertTriangle`.

L'information « la parcelle a un litige » restera accessible **uniquement** dans la section Litiges du document, qui est déjà correctement gardée par `LockedSection` (`CadastralDocumentView.tsx` ligne 124) et débloquée via `paidServices.includes('land_disputes')`.

### 3. Vérifier les autres surfaces (rapide)

- `useCadastralMapData.tsx` : retirer `has_dispute` du `select(...)`.
- `src/hooks/useCadastralSearch.tsx` et `useAdvancedCadastralSearch.tsx` : confirmer (via `rg`) qu'ils ne renvoient pas `has_dispute` aux résultats publics ; si oui, retirer.
- `CadastralResultCard` (résultats de recherche) : vérifier qu'aucun badge "Litige" n'y est affiché avant paiement.

### 4. Mémoire

- Mettre à jour `mem://features/cadastral-map-architecture-fr` pour retirer la mention "has_dispute → overlay litige" et documenter la règle.
- Ajouter une mémoire `constraint` : « L'existence d'un litige (`has_dispute`) ne doit jamais être révélée hors de la section payante Litiges (`land_disputes`). Pas d'étiquette carte, pas de badge en‑tête, pas d'indicateur dans les résultats de recherche. »

## Hors périmètre

- La section payante Litiges et son `LockedSection` restent inchangées.
- Les workflows internes (admin, formulaire de signalement, processus de levée) qui ont légitimement besoin de `has_dispute` ne sont pas touchés — la colonne BD reste, seules les surfaces publiques cessent de la sélectionner/afficher.
