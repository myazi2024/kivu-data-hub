

# Audit visuel — Indicateurs fictifs et divergences

## Constat principal

Le type `ProvinceData` et plusieurs composants contiennent des **indicateurs immobiliers/locatifs fictifs** hérités d'un ancien concept de marché immobilier. Ces indicateurs ne sont pas collectés par le CCC et ne proviennent d'aucune source de données réelle. Ils sont soit hardcodés à `0`, soit "détournés" (`// repurposed`) pour stocker des données cadastrales réelles dans des champs au nom trompeur.

## Divergences et éléments fictifs identifiés

### 1. `ProvinceData` (type) — Champs fictifs jamais alimentés

Le type `src/types/province.ts` contient 15+ champs qui ne correspondent à aucune donnée collectée :

```text
FICTIF (toujours 0 ou vide)         DÉTOURNÉ (nom trompeur)
─────────────────────────────       ─────────────────────────────
variationLoyer3Mois: 0              prixMoyenLoyer → parcels count
typologieDominante: ''              prixMoyenVenteM2 → title requests
rendementLocatifBrut: 0             tauxOccupationLocatif → contributions
tauxCroissancePrixAnnuel: 0         dureeMoyenneMiseLocationJours → mutations
permisConstruireMois: 0             tauxVacanceLocative → disputes count
tauxAccessibiliteLogement: 0        volumeAnnoncesImmobilieres → certificates
repartitionTypologique: {0,0,0}     populationLocativeEstimee → expertises
region: 'Centre' (forcé)            nombreTransactionsEstimees → invoices
zone: 'Urbaine' (forcé)
historiquePrix: (jamais alimenté)
```

### 2. `ProvinceAnalytics.tsx` — Composant entièrement fictif (code mort)

- N'est importé nulle part dans l'application
- Affiche des graphiques basés sur les champs détournés avec des labels trompeurs ("Prix de loyer par province", "Population par province", "Prix Moyens Nationaux")
- Simule des évolutions de prix avec des formules arbitraires (lignes 42-72)

### 3. `ZoneDetailsPanel.tsx` — Indicateurs fictifs du marché immobilier

- **Mock data explicite** (ligne 65) : `generateMockTrendData()` génère de fausses tendances de prix
- Affiche des KPIs non collectés : "Prix moyen loyer", "Prix m² vente", "Taux vacance", "Variation 3 mois", "Population locative estimée", "Volume annonces/mois"
- Onglet "Tendances" entièrement basé sur des données simulées

### 4. `TerritorialMap.tsx` + `TerritorialFilters.tsx` — Filtres fictifs

- Filtre "Taux de vacance" (slider 0-100%) basé sur des données non collectées
- Les zones territoriales (`AdminTerritorialZones`) exposent des champs de saisie admin pour des indicateurs fictifs (prix loyer, prix vente m², taux vacance, volume annonces, population locative, durée mise en location)

### 5. `StandardizedZoneMetrics` — Interface fantôme

L'interface dans `province.ts` (lignes 50-69) définit des métriques de marché immobilier (`prixMoyenLoyer`, `tauxVacanceLocative`, `volumeAnnonces`, `populationLocative`) qui ne sont utilisées nulle part comme contrat de données.

### 6. `ServicesSection.tsx` + `Services.tsx` — Descriptions trompeuses

- "Estimation de population" → "Calcul de la population locative et superficie occupée" : l'application ne calcule pas de population locative
- "Recettes fiscales" → "Estimation des recettes fiscales locatives théoriques" : les recettes sont cadastrales, pas locatives
- "Cartographie dynamique" → "Visualisation des loyers et taux de vacance par zone" : l'app visualise des données cadastrales, pas des loyers

### Pas de divergence

- **Accueil** (HeroSection, Footer, TypewriterAnimation) : aucun indicateur fictif
- **Analytics** (13 blocs dans `visualizations/blocks/`) : tous alimentés par des données Supabase réelles via `useLandDataAnalytics`
- **DRCInteractiveMap** panneau de détail province : les labels affichés ("Parcelles", "Titres", "Contributions", etc.) sont corrects grâce au système `dt()` configurable par l'admin

## Plan de correction

### Etape 1 : Refactorer `ProvinceData` — Renommer les champs détournés

Remplacer les noms trompeurs par des noms sémantiquement corrects :
- `prixMoyenLoyer` → `parcelsCount`
- `prixMoyenVenteM2` → `titleRequestsCount`
- `tauxOccupationLocatif` → `contributionsCount`
- `dureeMoyenneMiseLocationJours` → `mutationsCount`
- `tauxVacanceLocative` → `disputesCount`
- `volumeAnnoncesImmobilieres` → `certificatesCount`
- `populationLocativeEstimee` → `expertisesCount`
- `nombreTransactionsEstimees` → `invoicesCount`
- `recettesLocativesUsd` → `revenueUsd`

Supprimer les champs purement fictifs : `variationLoyer3Mois`, `typologieDominante`, `rendementLocatifBrut`, `tauxCroissancePrixAnnuel`, `permisConstruireMois`, `tauxAccessibiliteLogement`, `repartitionTypologique`, `historiquePrix`, `StandardizedZoneMetrics`.

### Etape 2 : Supprimer `ProvinceAnalytics.tsx` (code mort)

### Etape 3 : Nettoyer `ZoneDetailsPanel.tsx`

Supprimer les KPIs et graphiques fictifs (prix loyer, prix vente, taux vacance, variation, mock trends). Ne garder que les métriques alimentées par la base (pression foncière, typologie, recettes).

### Etape 4 : Corriger les descriptions de services

- "Estimation de population" → description alignée sur les données réelles (cadastre, parcelles)
- "Recettes fiscales" → supprimer "locatives théoriques"
- "Cartographie dynamique" → description cadastrale

### Etape 5 : Mettre à jour tous les consommateurs

Propager les renommages de `ProvinceData` dans `DRCInteractiveMap.tsx`, `DRCMapWithTooltip`, `buildEmptyProvince()`, etc.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/types/province.ts` | Refactorer le type, supprimer `StandardizedZoneMetrics` |
| `src/components/DRCInteractiveMap.tsx` | Adapter aux nouveaux noms de champs |
| `src/components/charts/ProvinceAnalytics.tsx` | Supprimer (code mort) |
| `src/components/map/ZoneDetailsPanel.tsx` | Supprimer indicateurs fictifs et mock data |
| `src/components/ServicesSection.tsx` | Corriger descriptions |
| `src/pages/Services.tsx` | Corriger descriptions |
| Consommateurs de `ProvinceData` | Adapter aux renommages |

