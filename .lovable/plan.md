

# Audit Admin — Divergences, données fictives, redondances et irrégularités

## Divergences identifiées

### 1. `AdminAnalytics.tsx` — Code mort (295 lignes)

Ce composant n'est **importé dans aucune page**. Le dashboard admin utilise `AdminDashboardOverview` et la config graphiques utilise `AdminAnalyticsChartsConfig`. `AdminAnalytics.tsx` est un doublon obsolète qui requête les tables `payments` et `publication_downloads` indépendamment du système principal.

### 2. `AdminTerritorialZones.tsx` — Indicateurs locatifs/immobiliers fictifs (660 lignes)

Le composant gère 12 champs locatifs/immobiliers qui ne correspondent à **aucune donnée collectée par le CCC** :

| Champ fictif | Onglet |
|---|---|
| `prix_moyen_loyer` | Marché |
| `prix_moyen_vente_m2` | Marché |
| `taux_vacance_locative` | Marché |
| `taux_occupation_locatif` | Marché |
| `population_locative_estimee` | Marché |
| `duree_moyenne_mise_location_jours` | Marché |
| `volume_annonces_mois` | Marché |
| `nombre_transactions_estimees` | Marché |
| `recettes_locatives_theoriques_usd` | Financier |
| `variation_loyer_3mois_pct` | Financier |
| `indice_pression_locative` | Général |
| `densite_residentielle` | (pas affiché dans formulaire mais dans le type) |

Les onglets **"Marché"** et **"Financier"** sont entièrement composés de ces champs fictifs. Le tableau principal affiche "Prix Loyer", "Prix m²", "Taux Vacance", "Population" — toutes des données non collectées.

L'export CSV s'appelle `donnees_immobilieres_rdc.csv` (devrait être `donnees_foncieres_rdc.csv` — déjà identifié dans un audit précédent mais non corrigé).

### 3. `AdminSidebar.tsx` — Terminologie résiduelle

- Ligne 113 : `'Expertises Immob.'` → devrait être `'Expertises foncières'`

### 4. `AdminSystemHealth.tsx` — Indicateurs simulés

- `connectionPool: 85` hardcodé comme valeur initiale (ligne 25)
- `Edge Functions` : statut forcé à `'online'` sans vérification réelle (ligne 93)
- Le "Pool de Connexions" affiche une valeur **estimée** à partir de la latence, pas une mesure réelle

### 5. `PredictionsPanel.tsx` — "IA" sans avertissement

Le panneau "Prévisions IA" utilise une simple régression linéaire et un z-score pour la détection d'anomalies. Le label "IA" est trompeur sans disclaimer sur la méthode simpliste utilisée.

## Plan de correction

### Etape 1 : Supprimer `AdminAnalytics.tsx` (code mort)

### Etape 2 : Nettoyer `AdminTerritorialZones.tsx`

- **Supprimer les onglets "Marché" et "Financier"** du formulaire de création/édition (ne garder que "Général" et "Géographique")
- **Supprimer les colonnes fictives** du tableau : "Prix Loyer", "Prix m²", "Taux Vacance", "Population"
- **Remplacer** par des colonnes pertinentes : "Pression foncière", "Typologie", "Valeur foncière moy."
- **Supprimer les champs fictifs** du `formData`, `resetForm()`, `handleSave()` et du type `TerritorialZone`
- **Conserver** les champs pertinents : `name`, `zone_type`, `coordinates`, `typologie_dominante`, `indice_pression_fonciere`, `valeur_fonciere_moyenne_parcelle_usd`, `recettes_fiscales_estimees_usd`
- **Renommer** l'export CSV en `donnees_foncieres_rdc.csv` et nettoyer les colonnes exportées

### Etape 3 : Corriger `AdminSidebar.tsx`

- `'Expertises Immob.'` → `'Expertises foncières'`

### Etape 4 : Corriger `AdminSystemHealth.tsx`

- Remplacer le label "Pool de Connexions" par "Latence estimée" ou ajouter un disclaimer clair "Estimation basée sur la latence"
- Ajouter "(non vérifié)" à côté du statut Edge Functions

### Etape 5 : Ajouter un disclaimer au `PredictionsPanel.tsx`

- Remplacer "Prévisions IA" par "Prévisions statistiques"
- Ajouter une note : "Basé sur une régression linéaire simple — à titre indicatif uniquement"

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/admin/AdminAnalytics.tsx` | Supprimer |
| `src/components/admin/AdminTerritorialZones.tsx` | Retirer onglets/champs fictifs locatifs |
| `src/components/admin/AdminSidebar.tsx` | "Expertises Immob." → "Expertises foncières" |
| `src/components/admin/AdminSystemHealth.tsx` | Clarifier les valeurs estimées |
| `src/components/admin/dashboard/PredictionsPanel.tsx` | Disclaimer sur la méthode |

5 fichiers, dont 1 suppression et 4 corrections.

