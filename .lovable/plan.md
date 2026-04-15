

# Afficher le logo dynamique dans le footer + audit des emplacements

## Problème

Le footer affiche le logo dans la section haute mais pas à côté de "Tous droits réservés". De plus, plusieurs emplacements utilisent le logo statique (`/bic-logo.png` ou `Building2` icon) au lieu du logo configuré dynamiquement via Admin → Apparence.

## Audit des emplacements

| Emplacement | Fichier | Statut actuel | Action |
|-------------|---------|---------------|--------|
| **Footer "Tous droits réservés"** | `Footer.tsx` | ❌ Pas de logo | **Ajouter** le logo dynamique après la mention |
| **Page Auth (connexion)** | `Auth.tsx` L.261 | ❌ Icône `Building2` + nom hardcodé | **Remplacer** par logo dynamique + nom/tagline dynamiques |
| **Watermark charts analytics** | `ChartCard.tsx` L.96 | ❌ `src="/bic-logo.png"` statique | **Remplacer** par `logo_url` dynamique (fallback `/bic-logo.png`) |
| **Aperçu watermark admin** | `GlobalWatermarkConfig.tsx` L.78 | ❌ `src="/bic-logo.png"` statique | **Remplacer** par logo dynamique |
| **Page Pitch partenaires** | `PitchPartenaires.tsx` L.63 | ❌ Import statique `bic-logo.png` | **Remplacer** par logo dynamique |
| **PDF fiche cadastrale** | `pdf.ts` | ❌ Aucun logo dans le PDF | **Ajouter** le logo en en-tête du PDF (fetch + embed base64) |
| **Navigation** | `navigation.tsx` | ✅ Déjà dynamique | Aucune action |
| **Footer section haute** | `Footer.tsx` | ✅ Déjà dynamique | Aucune action |

## Modifications prévues

### 1. `src/components/Footer.tsx` — Logo après "Tous droits réservés"
Ajouter une petite image du logo (même taille que le texte xs, ~14px) avec `brightness-0 invert` après le texte copyright.

### 2. `src/pages/Auth.tsx` — Logo dynamique sur la page connexion
Remplacer l'icône `Building2` par le logo dynamique via `useAppAppearance`, et remplacer le nom/tagline hardcodés.

### 3. `src/components/visualizations/shared/ChartCard.tsx` — Watermark dynamique
Le composant `LogoWatermark` doit utiliser le logo dynamique. Ajouter le `logo_url` au `WatermarkConfigContext` et le propager depuis le parent.

### 4. `src/components/admin/analytics-config/GlobalWatermarkConfig.tsx` — Aperçu dynamique
Utiliser `useAppAppearance` pour afficher le vrai logo dans l'aperçu.

### 5. `src/pages/PitchPartenaires.tsx` — Logo dynamique
Remplacer l'import statique par `useAppAppearance`.

### 6. `src/lib/pdf.ts` — Logo en en-tête du PDF cadastral
Fetcher le logo (ou utiliser le fallback), le convertir en base64, et l'insérer dans l'en-tête du PDF à côté du nom BIC.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/Footer.tsx` | Ajouter logo après "Tous droits réservés" |
| `src/pages/Auth.tsx` | Logo + nom/tagline dynamiques |
| `src/components/visualizations/shared/ChartCard.tsx` | Watermark logo dynamique via context |
| `src/components/admin/analytics-config/GlobalWatermarkConfig.tsx` | Aperçu avec logo dynamique |
| `src/pages/PitchPartenaires.tsx` | Logo dynamique |
| `src/lib/pdf.ts` | Logo en en-tête PDF |

