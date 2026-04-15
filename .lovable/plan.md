

# Déplacer le visuel "Type de bail" vers l'onglet Titres fonciers

## Contexte

Le champ `lease_type` (type de bail) est lié au type de titre de propriété collecté dans le formulaire CCC. Il appartient logiquement à l'onglet **Titres fonciers** (`title-requests`) et non à **Parcelles** (`parcels-titled`).

Le graphique doit exploiter les données de `data.parcels` (où `lease_type` existe) tout en étant affiché dans le `TitleRequestsBlock`.

## Modifications

### 1. `TitleRequestsBlock.tsx` — Ajouter le graphique lease-type

- Importer `KeyRound` de lucide-react
- Ajouter `const byLeaseType = useMemo(() => countBy(data.parcels, 'lease_type'), [data.parcels]);`
- Ajouter l'entrée `lease-type` dans `chartDefs` avec `data.parcels` comme `rawRecords`

### 2. `ParcelsWithTitleBlock.tsx` — Retirer lease-type

- Supprimer l'entrée `lease-type` de `chartDefs`
- Retirer `charts.byLeaseType` du calcul `useMemo` des charts
- Nettoyer la référence dans les dépendances

### 3. `analyticsTabsRegistry.ts` — Déplacer l'entrée de config

- **Retirer** de `parcels-titled.charts` : `{ tab_key: 'parcels-titled', item_key: 'lease-type', ... }`
- **Ajouter** dans `title-requests.charts` : `{ tab_key: 'title-requests', item_key: 'lease-type', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Type de bail', chart_type: 'bar-h' }`
- Renuméroter les `display_order` dans `parcels-titled` si nécessaire

### 4. `crossVariables.ts` — Déplacer les croisements

- **Retirer** `'lease-type'` de `parcels-titled`
- **Ajouter** dans `title-requests` : `'lease-type': [{ label: 'Province', field: 'province' }, { label: 'Type titre', field: 'property_title_type' }]`

### 5. `ContributionsBlock.tsx` — Conserver tel quel

Le graphique `lease-type` dans Contributions reste en place car il montre les baux déclarés dans les contributions (source différente).

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/TitleRequestsBlock.tsx` | +chart lease-type (données parcels) |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | −chart lease-type |
| `src/config/analyticsTabsRegistry.ts` | Déplacer entrée parcels→title-requests |
| `src/config/crossVariables.ts` | Déplacer croisement parcels→title-requests |

