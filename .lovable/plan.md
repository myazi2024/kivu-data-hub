

# Audit complet — Personnalisation logo dans toute l'application

## Résultat de l'audit

### A. Emplacements SANS logo dynamique (à corriger)

| # | Emplacement | Fichier | Statut actuel | Action |
|---|-------------|---------|---------------|--------|
| 1 | **PDF Facture A4** — en-tête | `src/lib/pdf.ts` L.191 | ❌ Texte "BIC" hardcodé, pas de logo | Fetch logo depuis `app_appearance_config`, embed en base64 dans l'en-tête |
| 2 | **PDF Facture Mini** — en-tête | `src/lib/pdf.ts` L.86 | ❌ Texte "BIC" hardcodé | Ajouter le logo au-dessus du texte (petit format ~6mm) |
| 3 | **PDF Autorisation de bâtir** | `src/utils/generatePermitPDF.ts` L.26-37 | ❌ Aucun logo | Fetch logo + embed en haut à gauche de l'en-tête |
| 4 | **PDF Reçu hypothécaire** | `src/utils/generateMortgageReceiptPDF.ts` L.36-47 | ❌ Aucun logo | Fetch logo + embed en haut à gauche |
| 5 | **Page Vérification document** | `src/pages/VerifyDocument.tsx` | ❌ Aucun logo/branding | Ajouter logo dynamique dans l'en-tête de la page |
| 6 | **Page 404 (NotFound)** | `src/pages/NotFound.tsx` | ❌ Aucun logo | Ajouter logo dynamique au-dessus du "404" |
| 7 | **Page Erreur (ErrorBoundary)** | `src/components/ErrorBoundary.tsx` | ❌ Icône AlertTriangle seule | Ajouter logo dynamique au-dessus du message d'erreur |

### B. Emplacements DÉJÀ dynamiques (aucune action)

| Emplacement | Fichier | Statut |
|-------------|---------|--------|
| Navigation | `navigation.tsx` | ✅ `useAppAppearance` |
| Footer (section haute + copyright) | `Footer.tsx` | ✅ |
| Page Auth | `Auth.tsx` | ✅ |
| Watermark analytics | `ChartCard.tsx` | ✅ via context |
| Watermark carte RDC | `DRCInteractiveMap.tsx` | ✅ |
| Aperçu admin watermark | `GlobalWatermarkConfig.tsx` | ✅ |
| Pitch partenaires | `PitchPartenaires.tsx` | ✅ |
| PDF Rapport cadastral | `pdf.ts` L.449-452 | ✅ `addPageHeader` avec logo |
| PDF Certificat | `generateCertificatePDF.ts` L.45 | ✅ `template.logo_url` |

## Stratégie technique

Pour les PDFs (items 1-4), créer une **fonction utilitaire partagée** `fetchAppLogo()` dans `src/utils/pdfLogoHelper.ts` qui :
1. Query `app_appearance_config` pour `logo_url`
2. Fetch l'image et la convertit en base64
3. Retourne `string | null`

Cela évite la duplication du code de fetch dans chaque générateur PDF.

Pour les pages React (items 5-7), utiliser `useAppAppearance()` pour récupérer `logo_url`.

Note : `ErrorBoundary` est un class component — il ne peut pas utiliser de hook directement. On ajoutera le logo via un sous-composant fonctionnel interne.

## Modifications prévues

### 1. Nouveau fichier `src/utils/pdfLogoHelper.ts`
Fonction `fetchAppLogo(): Promise<string | null>` — fetch + base64 conversion.

### 2. `src/lib/pdf.ts` — Factures A4 et Mini
- **A4** (L.188-195) : Appeler `fetchAppLogo()`, insérer `doc.addImage` avant "BIC"
- **Mini** (L.84-87) : Insérer le logo au-dessus du texte "BIC" (6x6mm)

### 3. `src/utils/generatePermitPDF.ts` — Autorisation
- Appeler `fetchAppLogo()`, insérer logo à gauche de l'en-tête (avant "RDC")

### 4. `src/utils/generateMortgageReceiptPDF.ts` — Reçu hypothécaire
- Appeler `fetchAppLogo()`, insérer logo à gauche de l'en-tête

### 5. `src/pages/VerifyDocument.tsx` — Page vérification
- Importer `useAppAppearance`, afficher logo + nom app en haut de la page

### 6. `src/pages/NotFound.tsx` — Page 404
- Importer `useAppAppearance`, afficher logo au-dessus du "404"

### 7. `src/components/ErrorBoundary.tsx` — Page erreur
- Créer un composant fonctionnel `ErrorFallback` interne qui utilise `useAppAppearance` pour afficher le logo

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/utils/pdfLogoHelper.ts` | **Nouveau** — utilitaire fetch logo base64 |
| `src/lib/pdf.ts` | Logo dans factures A4 + Mini |
| `src/utils/generatePermitPDF.ts` | Logo en-tête autorisation |
| `src/utils/generateMortgageReceiptPDF.ts` | Logo en-tête reçu hypothécaire |
| `src/pages/VerifyDocument.tsx` | Logo + branding en-tête page |
| `src/pages/NotFound.tsx` | Logo au-dessus du 404 |
| `src/components/ErrorBoundary.tsx` | Logo dans le fallback erreur |

