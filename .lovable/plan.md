

# Fix : Onglet "Global" (filigrane) invisible dans Config Graphiques

## Cause

Dans `src/hooks/useInitializedConfig.ts`, ligne 7, l'onglet `_global` est listé dans `EXCLUDED_SYSTEM_TABS`. La fonction `isChartsViewTab` (utilisee pour filtrer les onglets affichés dans la sidebar) appelle `isUserTab` qui exclut explicitement `_global`. Resultat : l'onglet "Global" contenant la configuration de la filigrane (opacite, taille, position) n'apparait jamais dans la liste.

## Correction

**Fichier : `src/hooks/useInitializedConfig.ts`**

Retirer `'_global'` de `EXCLUDED_SYSTEM_TABS` et l'ajouter a `CHARTS_ONLY_TABS` (comme `rdc-map`). Cela le rendra visible dans la vue "Charts" tout en le gardant hors des onglets utilisateur standard (analytics front-end).

```
Avant :
  const EXCLUDED_SYSTEM_TABS = ['_global'];
  const CHARTS_ONLY_TABS = ['rdc-map'];

Apres :
  const EXCLUDED_SYSTEM_TABS: string[] = [];
  const CHARTS_ONLY_TABS = ['rdc-map', '_global'];
```

Modification d'une seule ligne. Aucun autre fichier impacte.

