## Fix : double fetch sur changement de filtre + reset de page

### Problème
Dans `src/components/admin/AdminSubdivisionRequests.tsx` (lignes 114–125), deux `useEffect` se chevauchent :
1. Effet « reset page » écoute les filtres et fait `setPage(1)` quand un filtre change.
2. Effet « fetch » écoute `[page, …filtres]` et appelle `fetchRequests()`.

Quand un filtre change pendant `page > 1`, les deux effets se déclenchent : un premier `fetch` part avec les nouveaux filtres + ancienne `page`, puis `setPage(1)` re-déclenche un second `fetch`. → 2 requêtes réseau, scintillement de liste, comptes faussés.

### Solution
Fusionner en **un seul effet** piloté par une clé de filtres mémorisée. Si la clé a changé et que `page > 1`, on se contente de `setPage(1)` (court-circuit, pas de fetch). Sinon (page change OU filtres changent avec page déjà = 1), on lance le fetch unique (debounce 300 ms quand la saisie de recherche est active).

### Modification

Fichier : `src/components/admin/AdminSubdivisionRequests.tsx`

Remplacer les lignes 114–125 par :

```tsx
// Fetch unique : reset page→1 sur changement de filtres SANS double fetch.
const filtersKey = `${statusFilter}|${dateFrom}|${dateTo}|${sortBy}|${searchQuery}`;
const lastFiltersKeyRef = useRef(filtersKey);
useEffect(() => {
  const filtersChanged = lastFiltersKeyRef.current !== filtersKey;
  lastFiltersKeyRef.current = filtersKey;
  if (filtersChanged && page !== 1) {
    setPage(1); // un seul fetch sera émis au prochain run (page=1, filtersChanged=false)
    return;
  }
  const t = setTimeout(() => { fetchRequests(); }, searchQuery ? 300 : 0);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, filtersKey]);
```

Ajouter `useRef` à l'import React existant (ligne 1) :
```tsx
import { useState, useEffect, useRef } from 'react';
```

### Vérification post-change
- Changer un filtre quand `page = 3` → un seul appel réseau visible dans l'onglet Network (range 0-9).
- Changer un filtre quand `page = 1` → un seul fetch debouncé.
- Paginer (page 1 → 2) sans toucher aux filtres → un seul fetch.
- L'export CSV (`handleExportCsv`) reste indépendant.

### Hors scope
Pas de changement comportemental (mêmes filtres, mêmes statuts, même payload). Uniquement déduplication d'effets.
