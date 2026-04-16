

# Refonte de l'onglet "Titres fonciers" — Données CCC uniquement

## Problème

L'onglet "Titres fonciers" est alimenté par `data.titleRequests` (formulaire de demande de titre). Il doit refléter les **titres déjà délivrés** via les données collectées par le formulaire CCC :
- Bloc "Type de titre de propriété" → `data.parcels` / `data.contributions`
- Bloc "Propriétaire actuel" → JSONB `current_owners_details` dans `data.contributions`
- Historique des propriétaires → `data.ownershipHistory`

## Sources de données disponibles

| Source | Table | Champs clés |
|--------|-------|-------------|
| Type de titre | `cadastral_parcels` | `property_title_type`, `lease_type`, `lease_years`, `title_issue_date` |
| Propriétaire actuel | `cadastral_contributions` | `current_owners_details` (JSONB: legalStatus, gender, nationality, entityType, since, rightType) |
| Propriétaire actuel (flat) | `cadastral_parcels` | `current_owner_legal_status` |
| Historique propriétaires | `cadastral_ownership_history` | `legal_status`, `mutation_type`, `ownership_start_date`, `ownership_end_date` |

## Nouveaux visuels (17 charts + 6 KPIs)

### KPIs
1. **Total parcelles titrées** — `parcels.length`
2. **Urbaine** / **Rurale** — section type
3. **% Congolais** — extraction nationalité depuis `contributions.current_owners_details`
4. **Ancienneté moy.** — durée moyenne de détention (owner.since → aujourd'hui)
5. **Nb mutations** — `ownershipHistory.length`

### Charts issus du bloc "Type de titre de propriété"
1. **Type de titre** — `property_title_type` normalisé (bar-h)
2. **Type de bail** — `lease_type` : initial vs renouvellement (pie)
3. **Durée de bail** — distribution `lease_years` (bar-v)
4. **Année de délivrance** — `title_issue_date` groupé par année (bar-v)
5. **Évolution des titres** — `title_issue_date` par mois (area, colSpan 2)

### Charts issus du bloc "Propriétaire actuel"
6. **Statut juridique** — `legalStatus` extrait du JSONB (donut)
7. **Genre des propriétaires** — `gender` pour Personne physique (pie avec ColorMap)
8. **Nationalité** — Congolais (RD) vs Étranger (pie)
9. **Type d'entité** — `entityType` pour Personne morale (bar-h)
10. **Droit de l'État** — `rightType` pour État : Concession vs Affectation (pie)
11. **Ancienneté de détention** — distribution par tranches d'années depuis `since` (bar-v)

### Charts issus de l'Historique des propriétaires
12. **Type de mutation** — `mutation_type` : Vente, Succession, Donation... (bar-h)
13. **Statut juridique (anciens)** — `legal_status` des anciens propriétaires (donut)
14. **Durée de détention (anciens)** — `ownership_end_date - ownership_start_date` par tranches (bar-v)
15. **Nb de transferts par parcelle** — distribution du nombre de propriétaires successifs (bar-v)

### Géographie
16. **Carte géographique** — GeoCharts sur `parcels`

## Modifications

### 1. `src/components/visualizations/blocks/TitleRequestsBlock.tsx` — Réécriture complète

- Changer la source de `data.titleRequests` vers `data.parcels` + `data.contributions` + `data.ownershipHistory`
- Le `useBlockFilter` s'appliquera sur `data.parcels` (filtre principal)
- Extraire les champs JSONB de `current_owners_details` depuis `data.contributions` en créant un tableau dénormalisé d'owners liés aux parcelles
- Supprimer tous les charts liés aux demandes (request_type, requester_type, payment, deduced_title, processing_comparison, revenue_trend, owner-same)
- Créer les 16 nouveaux chartDefs + KPIs

### 2. `src/config/analyticsTabsRegistry.ts`

- Remplacer entièrement la section `title-requests` charts et KPIs avec les nouvelles définitions

### 3. `src/config/crossVariables.ts`

- Remplacer les cross-variables de `title-requests` avec les nouveaux champs pertinents

### 4. `src/types/landAnalytics.ts` — Optionnel

- Ajouter `title_issue_date` et `title_reference_number` au `ParcelRecord` si non présents (vérifier le SELECT dans le fetch)

### 5. `src/hooks/useLandDataAnalytics.tsx`

- Ajouter `title_issue_date, title_reference_number, lease_years` au SELECT de `cadastral_parcels` (si manquant)
- Vérifier que `current_owners_details` est bien récupéré dans les contributions

### Fichiers modifiés (4-5)
- `src/components/visualizations/blocks/TitleRequestsBlock.tsx` (réécriture)
- `src/config/analyticsTabsRegistry.ts`
- `src/config/crossVariables.ts`
- `src/types/landAnalytics.ts` (si besoin)
- `src/hooks/useLandDataAnalytics.tsx` (si besoin)

