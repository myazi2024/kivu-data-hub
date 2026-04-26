# Audit — Projection des visuels analytics sur la carte RDC

Fonctionnalité (Lot F) qui permet, depuis chaque visuel analytics du menu **Données foncières**, de recolorer la carte RDC selon la métrique du graphique via le bouton **« Afficher sur la carte »**.

## 1. Architecture en place

```text
Map.tsx
 └─ <MapProjectionProvider>          ← scope éphémère, page /map uniquement
     └─ DRCInteractiveMap            ← consommateur (recoloration + bandeau + légende)
         └─ ProvinceDataVisualization
             └─ <ProjectionTabContext value={activeTab}>   ← onglet courant
                 └─ <BlockComponent>
                     └─ ChartCard (rawRecords, projectionTab)
                         └─ <ProjectOnMapButton>           ← émetteur
```

| Élément | Rôle |
|---|---|
| `MapProjectionContext` | État global `{ id, sourceTab, label, byProvince, unit?, palette? }` |
| `ProjectOnMapButton` | Bouton 🗺️ dans l'en-tête de chaque ChartCard, agrège `rawRecords` par `province` |
| `ProjectionTabContext` | Injecte la clé d'onglet courant à chaque ChartCard pour identifier la source |
| `DRCInteractiveMap` | (a) override de `getProvinceColor` (b) bandeau « Mode visuel » (c) légende dédiée (d) auto-reset au changement d'onglet |

## 2. Points forts

- **Provider correctement scopé** à `/map` — n'impacte pas Admin / Dashboard utilisateur.
- **Hook `useMapProjection` safe-fail** : retourne un no-op si le provider est absent → `ChartCard` reste réutilisable hors carte (Admin Stats, Reseller, etc.).
- **Auto-reset robuste** : `DRCInteractiveMap` vide la projection dès que `activeAnalyticsTab` change — conforme à la spec validée.
- **Tiers adaptatifs** : `computeAdaptiveTiers` recalcule des paliers cohérents même quand les valeurs varient de 1 à 1000.
- **Palette HSL semantic-aware** : la projection utilise `hsl(var(--primary))` avec opacités, donc le thème (clair/sombre/admin) est respecté.
- **Bouton conditionnel** : si aucun record n'a de champ `province`, le bouton ne s'affiche pas → pas de faux clic.
- **Toggle natif** : recliquer sur un visuel actif quitte la projection (en plus du `✕` du bandeau).

## 3. Anomalies confirmées

### A. Couverture incomplète des cartes (HAUTE)
Seul `ChartCard` (variantes `bar-h/bar-v/pie/donut/area`) intègre `ProjectOnMapButton`. Les **3 autres cartes partagées n'ont pas le bouton** :
- `StackedBarCard.tsx` (utilisé entre autres dans Mortgages, Disputes, Subdivision)
- `MultiAreaChartCard.tsx`
- `ColorMappedPieCard.tsx` (utilisé pour le Genre dans TitleRequests)

Vérifié : `rg "ProjectOnMapButton" src/.../shared/StackedBarCard.tsx … → 0 hit`.

Conséquence : la spec « tous les visuels de tous les blocs » n'est pas respectée. Selon les blocs, l'utilisateur voit le bouton sur certains graphiques et pas d'autres → expérience incohérente.

### B. Mismatch clé province (MOYENNE)
- `ProjectOnMapButton` normalise via `s.trim().toLowerCase()`.
- `DRCInteractiveMap.getProvinceColor` lit `(province.name || '').trim().toLowerCase()`.

Cela fonctionne tant que `province` côté record ≡ `province.name` côté carte. Mais les records analytiques contiennent souvent `Kinshasa`, `Nord-Kivu`, etc. issus de la table parcelle, alors que la carte stocke ses noms dans le SVG (`Kinshasa`, `Nord-Kivu`, `Sud-Ubangi`...). **Aucune normalisation accents/tirets** : « Kasaï-Oriental » vs « Kasai-Oriental » → mismatch silencieux ⇒ province colorée NO_DATA.

À mutualiser avec un helper `normalizeProvinceName` (probablement déjà présent dans `src/lib/mapProjection.ts`).

### C. Filtrage pré-projection ambigu (MOYENNE)
`ChartCard` reçoit `rawRecords={filtered}` (post-filtre block), pas la totalité. Or quand l'utilisateur sélectionne déjà une province sur la carte, `useBlockFilter` filtre les records à cette province → la projection résultante n'a qu'**1 seule province colorée**, le bandeau « Mode visuel » paraît alors faux.

Comportement attendu (à clarifier) : projeter sur **toutes les provinces** quel que soit le filtre map, ou avertir l'utilisateur ?

### D. ID de projection fragile (FAIBLE)
`projectionId = ${effectiveTab}::${title}`. Si deux ChartCards ont le même titre dans un même onglet (ex. avant/après i18n), le toggle « actif » se confondrait. Préférer une `key` stable du registre charts.

### E. Bouton très petit (FAIBLE — UX/Accessibilité)
`h-5 w-5` + icône `h-3 w-3` ⇒ cible tactile sous le minimum recommandé (44 px). Sur mobile c'est difficile à viser, surtout cohabitant avec le picker cross-variables et `ShareButton`.

### F. Aucun feedback en cas de zéro province match (FAIBLE)
Si tous les records ont une `province` non reconnue par la carte, la projection est appliquée mais aucune province ne se colore (tout NO_DATA). Aucun toast n'avertit l'utilisateur. À ajouter dans `DRCInteractiveMap` ou en amont.

### G. Couplage ProvinceDataVisualization manquant (FAIBLE)
`ProjectionTabContext` est bien injecté **uniquement autour du `BlockComponent`**, mais pas du KPI-grid : si à terme on veut aussi projeter un KPI, il faudra l'étendre.

### H. Aucun test (FAIBLE)
Aucun test unitaire / e2e ne couvre la projection (toggle, auto-reset, mismatch province). Régressions silencieuses possibles.

## 4. Recommandations (ordre de priorité)

1. **Étendre le bouton à `StackedBarCard`, `MultiAreaChartCard`, `ColorMappedPieCard`** — tâche mécanique : ajouter `projectionTab/projectionSource` + bouton dans l'en-tête, mêmes props que `ChartCard`.
2. **Normaliser les noms de provinces** via `src/lib/mapProjection.ts` (accents, tirets, casse) côté émetteur ET récepteur.
3. **Décider du comportement vs filtre province** : soit projeter sur la totalité (`data.parcels`/`data.contributions` non filtrés), soit bloquer le bouton avec tooltip « Désélectionnez la province pour projeter ».
4. **Toast d'avertissement** si la projection a 0 province reconnue par la carte.
5. **Stabiliser `projectionId`** avec la `key` du registre chart au lieu du titre.
6. **Agrandir la cible tactile** du bouton (au moins `h-7 w-7` sur mobile).
7. **Ajouter 2-3 tests** : (a) toggle, (b) auto-reset au changement d'onglet, (c) hors provider (no-op).

## 5. Verdict

Implémentation **fonctionnelle et bien architecturée** (provider scopé, hook safe-fail, auto-reset, tiers adaptatifs, légende dédiée). Trois lacunes à combler en priorité : **couverture des cartes (A)**, **normalisation des noms (B)** et **comportement vs filtre province (C)**. Le reste relève du polish / accessibilité.

Souhaitez-vous que je corrige ces points dans l'ordre proposé, ou seulement A+B+C en priorité ?