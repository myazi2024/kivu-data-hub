

## Plan — 3 chantiers de modularisation lourde

Stratégie : **3 tours séparés**, du moins risqué au plus risqué, chacun isofonctionnel (zéro changement UX/comportement).

---

### Tour 1 — Extraction `MapLegendConfig` (le plus simple, débloque le Tour 2)

**Pourquoi en premier** : c'est un bloc déjà conceptuellement isolé (couplage fragile signalé dans l'audit), et son extraction allège mécaniquement `AdminContributionConfig` avant son propre découpage.

**Cible** : `src/components/admin/AdminContributionConfig.tsx` (1628L)

**Découpage** :
- Créer `src/components/admin/contribution-config/MapLegendConfig.tsx` — UI + logique d'édition de la légende carte (items, labels mobile, toggles enabled).
- Props : `value: LegendConfig`, `onChange: (next) => void`.
- `AdminContributionConfig` importe et délègue ; conserve uniquement l'orchestration save.

**Gain attendu** : ~250-350L retirées, couplage map-legend cassé.

---

### Tour 2 — Modularisation `AdminContributionConfig` (1628L → ~400L)

**Cible** : même fichier, post-Tour 1.

**Découpage** dans `src/components/admin/contribution-config/` :
- `GeneralSettingsSection.tsx` — toggles globaux, valeurs par défaut.
- `MarkerStyleSection.tsx` — couleurs/tailles markers + lignes + remplissage.
- `DimensionsSection.tsx` — affichage dimensions/labels côtés.
- `ConstraintsSection.tsx` — min/max surfaces, marqueurs, conflits.
- `RoadTypesSection.tsx` — éditeur tableau `roadTypes`.
- `useContributionConfigForm.ts` — state local + dirty tracking + save handler.
- `AdminContributionConfig.tsx` — shell : tabs/accordions + orchestration.

**Pattern** : identique à celui déjà appliqué (cf. `mem://admin/admin-component-modularization-fr`).

---

### Tour 3 — Modularisation `AdminCCCContributions` (1817L → ~450L)

**Cible** : `src/components/admin/AdminCCCContributions.tsx`

**Découpage** dans `src/components/admin/ccc-contributions/` :
- `CCCStatsCards.tsx` — cartes KPI haut de page.
- `CCCFilters.tsx` — filtres (statut, date, recherche, province).
- `CCCContributionsTable.tsx` — table + pagination + actions ligne.
- `CCCDetailDrawer.tsx` — panneau détail + workflow approve/reject.
- `CCCBulkActionsBar.tsx` — actions groupées admin.
- `useCCCContributionsData.ts` — fetch + filter + mutation hooks.
- `AdminCCCContributions.tsx` — shell d'orchestration.

**Pattern** : extraction Stats/Filters/Table/Detail déjà éprouvée.

---

### Garde-fous communs (3 tours)

1. **Zéro régression UI** : aucun changement visuel/comportemental ; juste de la réorganisation.
2. **Types stricts** : props typés, pas de `any`.
3. **Imports semantic tokens** préservés (pas de couleurs en dur).
4. **Smoke test après chaque tour** : ouvrir l'onglet admin concerné, vérifier rendu + 1 action critique (save config / approve contribution).
5. **Mémoire** : mettre à jour `mem://admin/admin-component-modularization-fr` après chaque tour avec les nouveaux dossiers.

---

### Recommandation d'enchaînement

Démarrer par **Tour 1** maintenant (petit, sûr, prépare le terrain). Valider en preview, puis enchaîner Tour 2, puis Tour 3. Dis-moi « go Tour 1 » pour lancer.

