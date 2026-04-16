

# Ajout des visuels "Titre au nom du propriétaire" dans l'onglet Titres fonciers

## Contexte

Le formulaire CCC collecte `is_title_in_current_owner_name` (booléen) qui indique si le titre de propriété est au nom du propriétaire actuel. Ce champ existe en base (tables `cadastral_parcels` et `cadastral_contributions`) mais n'est **ni récupéré ni exploité** dans les analytics.

Combiné avec `title_issue_date` et `owner.since`, on peut déduire :
- Titres **concordants** (au nom du propriétaire) vs **discordants** (pas au nom du propriétaire)
- Parmi les discordants : ceux **dans le délai légal** de mutation (≤ 20 jours depuis acquisition) vs **hors délai** (pénalités de retard applicables)

## Modifications prévues

### 1. Fetch de données — `src/hooks/useLandDataAnalytics.tsx`
Ajouter `is_title_in_current_owner_name` au SELECT de `cadastral_parcels` et `cadastral_contributions`.

### 2. Types — `src/types/landAnalytics.ts`
Ajouter `is_title_in_current_owner_name?: boolean | null` à `ParcelRecord` et `ContributionRecord`.

### 3. Bloc de visualisation — `src/components/visualizations/blocks/TitleRequestsBlock.tsx`

Ajouter **3 nouveaux charts** et **1 KPI** :

- **KPI `kpi-discordants`** : Nombre (et %) de titres dont le nom ne correspond pas au propriétaire actuel
- **Chart `title-owner-match`** (donut) : Répartition "Au nom du propriétaire" vs "Pas au nom du propriétaire" vs "Non renseigné"
- **Chart `mutation-urgency`** (bar-h) : Parmi les discordants, répartition "Dans le délai légal (≤ 20j)" vs "Hors délai (pénalités)" — calculé via `owner.since` par rapport à aujourd'hui, ou `title_issue_date`
- **Chart `mismatch-by-title-type`** (bar-v) : Discordants ventilés par type de titre (Certificat d'enregistrement, Contrat de location, etc.)

Logique de calcul du délai :
```text
Si is_title_in_current_owner_name === false :
  - Si owner.since existe : jours = (aujourd'hui - owner.since)
  - Si jours ≤ 20 → "Dans le délai"
  - Si jours > 20 → "Hors délai (pénalités)"
  - Si owner.since absent → "Délai inconnu"
```

### 4. Registry — `src/config/analyticsTabsRegistry.ts`
Ajouter les 3 nouveaux charts et le KPI dans la section `title-requests`.

### 5. Données test — `src/components/admin/test-mode/testDataGenerators.ts`
Vérifier que `is_title_in_current_owner_name` est déjà généré (✓ confirmé : `idx % 3 !== 0`). S'assurer que `owner.since` est suffisamment varié pour produire des cas dans/hors délai.

### Fichiers modifiés (5)
- `src/hooks/useLandDataAnalytics.tsx`
- `src/types/landAnalytics.ts`
- `src/components/visualizations/blocks/TitleRequestsBlock.tsx`
- `src/config/analyticsTabsRegistry.ts`
- `src/components/admin/test-mode/testDataGenerators.ts` (si ajustement nécessaire sur `since`)

