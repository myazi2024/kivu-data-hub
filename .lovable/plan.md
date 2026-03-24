

# Audit — Accueil, Données foncières, Carte RDC : Divergences et code mort

## Divergences identifiées

### 1. `TerritorialMap.tsx` et ses sous-composants — Code mort avec indicateurs fictifs

Le composant `TerritorialMap` et ses dépendances (`ZoneIndicators`, `ZoneDetailsPanel`, `TerritorialFilters`) ne sont **importés dans aucune page**. C'est du code mort.

Plus grave, ces composants affichent des **indicateurs fictifs immobiliers/locatifs** provenant de la table `territorial_zones` :

| Composant | Indicateurs fictifs affichés |
|-----------|------------------------------|
| `ZoneData` (type, ligne 36-48) | `prixmoyenloyer`, `prixmoyenvente_m2`, `tauxvacancelocative`, `variationloyer3mois_pct`, `populationlocativeestimee`, `volumeannoncesmois`, `recetteslocativestheoriques_usd` |
| `ZoneIndicators.tsx` | "Loyer moyen", "Taux vacance moyen", "Population totale", "Variation moyenne", "Recettes théoriques" |
| `ZoneDetailsPanel.tsx` | "Recettes théoriques", "Densité résidentielle" |
| `TerritorialFilters.tsx` | Filtre "Taux de vacance" (slider 0-100%) |
| `TerritorialMap.tsx` popup (lignes 354-391) | "Prix loyer", "Prix vente m²", "Taux vacance", "Variation 3M", "Population" |

Aucune de ces données n'est collectée par le CCC. Elles viennent de la table `territorial_zones` qui contient des champs locatifs/immobiliers hérités.

### 2. `useZoneData.ts` — Hook associé au code mort

Ce hook charge les données de `territorial_zones` et calcule des "recettes locatives théoriques" avec la formule `prixLoyer * population * 12 * (1 - tauxVacance / 100)` (ligne 59). Formule purement fictive.

### 3. Terminologie résiduelle "immobilier"

| Fichier | Texte | Correction |
|---------|-------|------------|
| `ServicesSection.tsx` ligne 50 | "Projets **immobiliers**" | → "Projets fonciers" |
| `Services.tsx` ligne 63 | "Projets **immobiliers**" | → "Projets fonciers" |
| `Services.tsx` ligne 64 | "Appui aux projets **immobiliers**" | → "Appui aux projets fonciers" |
| `Auth.tsx` ligne 260 | "Bureau de l'**Immobilier** du Congo" | Nom officiel — conserver tel quel |

**Note** : "Bureau de l'Immobilier du Congo" est le nom légal de l'organisation (Footer, Navigation, Legal, About, Contact, Invoice). Ce n'est pas une divergence, c'est la dénomination sociale.

Le terme "expertise immobilière" dans les services (Mutation, Expertise) désigne un acte juridique réel (évaluation vénale d'un bien). Ce n'est pas un indicateur fictif — il est correct.

### 4. Redondance potentielle : `parcel_type` filtrage

Dans `ParcelsWithTitleBlock.tsx` (ligne 100-101), les parcelles urbaines sont filtrées par `parcel_type === 'SU'` et rurales par `parcel_type === 'SR'`. Or le CCC utilise `parcel_type` avec les valeurs `'Terrain bâti'` et `'Terrain nu'`, pas `'SU'`/`'SR'`. Si la base ne contient que des valeurs CCC, ces compteurs seront toujours à 0.

## Plan de correction

### Etape 1 : Supprimer le code mort `TerritorialMap`

Supprimer les fichiers suivants (jamais importés dans aucune route) :
- `src/components/TerritorialMap.tsx`
- `src/components/map/ZoneIndicators.tsx`
- `src/components/map/ZoneDetailsPanel.tsx`
- `src/components/map/TerritorialFilters.tsx`
- `src/hooks/useZoneData.ts`

### Etape 2 : Corriger la terminologie "Projets immobiliers"

- `ServicesSection.tsx` : "Projets immobiliers" → "Projets fonciers"
- `Services.tsx` : idem + description

### Etape 3 : Vérifier le filtrage `SU`/`SR` dans ParcelsWithTitleBlock

Aligner les valeurs de filtrage sur celles réellement utilisées dans la base. Si la base utilise `'Terrain bâti'`/`'Terrain nu'`, corriger les conditions (lignes 100-101).

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/TerritorialMap.tsx` | Supprimer |
| `src/components/map/ZoneIndicators.tsx` | Supprimer |
| `src/components/map/ZoneDetailsPanel.tsx` | Supprimer |
| `src/components/map/TerritorialFilters.tsx` | Supprimer |
| `src/hooks/useZoneData.ts` | Supprimer |
| `src/components/ServicesSection.tsx` | "immobiliers" → "fonciers" |
| `src/pages/Services.tsx` | "immobiliers" → "fonciers" |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Vérifier filtrage SU/SR |

