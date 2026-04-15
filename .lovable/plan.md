

# Audit de configuration graphique Analytics

## Résumé des anomalies trouvées

### 1. Variables croisées orphelines dans `parcels-titled` (crossVariables.ts)

Après la migration "Parcelle → Construction", 4 entrées de variables croisées restent dans `CROSS_VARIABLE_REGISTRY['parcels-titled']` pour des graphiques **qui n'existent plus** dans cet onglet :

| Clé orpheline | Anciennement | Statut |
|---|---|---|
| `legal-status` (ligne 22) | Déplacé vers title-requests | **À supprimer** |
| `gender` (ligne 23) | Déplacé vers title-requests | **À supprimer** |
| `subdivided` (ligne 32) | Déplacé vers title-requests | **À supprimer** |
| `surface` (ligne 33) | Déplacé vers title-requests | **À supprimer** |

Ces entrées sont inoffensives (jamais lues car les charts correspondants n'existent plus dans `parcels-titled`) mais polluent la config admin.

### 2. Variables croisées manquantes dans `title-requests`

Le graphique `subdivided` a été ajouté dans `TitleRequestsBlock` avec `cx('subdivided')`, mais **aucune entrée `subdivided`** n'existe dans `CROSS_VARIABLE_REGISTRY['title-requests']`. Résultat : le picklist de variables croisées est vide pour ce graphique.

### 3. Aucune autre incohérence détectée

- **Registry ↔ Blocks** : tous les `item_key` dans `analyticsTabsRegistry.ts` ont un `chartDef` correspondant dans les blocs.
- **Tabs système** (`_global`, `rdc-map`) : correctement exclus par `isUserTab` / `isChartsViewTab`.
- **Filtres** : `buildFilterDefaults` couvre tous les onglets utilisateur.
- **Terminologie** : "Autorisation" utilisé partout (pas de "Permis" résiduel).

---

## Plan de correction

### Fichier : `src/config/crossVariables.ts`

**A. Supprimer les 4 entrées orphelines** de `parcels-titled` :
- Retirer `legal-status`, `gender`, `subdivided`, `surface`

**B. Ajouter l'entrée manquante** dans `title-requests` :
```ts
'subdivided': [{ label: 'Province', field: 'province' }, { label: 'Type titre', field: 'property_title_type' }],
```

Un seul fichier modifié, 5 lignes changées.

