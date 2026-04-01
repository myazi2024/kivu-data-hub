

# Refonte complète — Fiche Cadastrale

## Objectif

Reconstruire `CadastralDocumentView.tsx` from scratch avec une architecture modulaire, un design moderne type document officiel, et une meilleure lisibilité à l'écran et à l'impression.

## Problèmes actuels

- **Fichier monolithique** (636 lignes, tout dans un seul composant)
- **Design générique** : tableaux HTML bruts stylisés via `<style>` inline, pas d'identité visuelle forte
- **Styles inline** : bloc `<style>` de 40 lignes injecté dans le JSX au lieu de CSS/Tailwind
- **Pas de structure modulaire** : sections non extraites en sous-composants
- **Compteur mutable** (`let sectionNumber = 0; ++sectionNumber`) — anti-pattern React

## Nouveau design

### Identité visuelle "Document officiel"

```text
┌──────────────────────────────────────────┐
│ ══ TOOLBAR (sticky, print:hidden) ══     │
├──────────────────────────────────────────┤
│  ┌─ HEADER ──────────────────────────┐   │
│  │  🏛  RÉPUBLIQUE DÉMOCRATIQUE      │   │
│  │      DU CONGO                     │   │
│  │  Bureau d'Informations Cadastrales│   │
│  │  ─────────────────────────────    │   │
│  │  FICHE CADASTRALE                 │   │
│  │  Parcelle N° XX/XXXX             │   │
│  │  Section Urbaine | Générée le ... │   │
│  └───────────────────────────────────┘   │
│                                          │
│  ┌─ Section Card ────────────────────┐   │
│  │ ▌1. IDENTIFICATION               │   │
│  │  ┌────────┬───────────────────┐   │   │
│  │  │ Label  │ Valeur            │   │   │
│  │  ├────────┼───────────────────┤   │   │
│  │  │ ...    │ ...               │   │   │
│  │  └────────┴───────────────────┘   │   │
│  └───────────────────────────────────┘   │
│                                          │
│  ┌─ Section Card ────────────────────┐   │
│  │ ▌2. PROPRIÉTAIRE ACTUEL          │   │
│  │  ...                              │   │
│  └───────────────────────────────────┘   │
│  ...                                     │
│  ┌─ FOOTER ──────────────────────────┐   │
│  │  Code de vérification: BIC-XXXX  │   │
│  │  QR Code  |  Disclaimer          │   │
│  └───────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Changements de design clés

- **Header officiel** : titre "République Démocratique du Congo", sous-titre BIC, filigrane subtil, bordure dorée/primaire en haut
- **Section cards** : chaque section dans une carte avec bordure gauche colorée (accent bar), titre avec numéro intégré, fond légèrement différencié
- **Tableaux modernisés** : lignes alternées via Tailwind (`even:bg-muted/20`), pas de `<style>` inline
- **Alertes visuelles améliorées** : hypothèques actives, litiges — icônes + couleurs sémantiques cohérentes
- **Footer avec code de vérification** : intégration du système de vérification existant (`documentVerification.ts`)
- **Print-first** : styles d'impression via classes Tailwind `print:*` uniquement, pas de `<style>` block

## Architecture modulaire

### Nouveaux fichiers

| Fichier | Contenu |
|---|---|
| `cadastral-document/CadastralDocumentView.tsx` | Composant principal (orchestrateur ~150 lignes) |
| `cadastral-document/DocumentHeader.tsx` | Header officiel avec titre RDC, parcelle, date |
| `cadastral-document/DocumentToolbar.tsx` | Barre d'actions (Catalogue, PDF, Imprimer) |
| `cadastral-document/DocumentFooter.tsx` | Disclaimer + code de vérification |
| `cadastral-document/sections/IdentificationSection.tsx` | Parcelle + titre + construction |
| `cadastral-document/sections/OwnerSection.tsx` | Propriétaire actuel |
| `cadastral-document/sections/LocationSection.tsx` | Localisation + carte + bornage |
| `cadastral-document/sections/HistorySection.tsx` | Historique de propriété |
| `cadastral-document/sections/ObligationsSection.tsx` | Taxes + hypothèques |
| `cadastral-document/sections/DisputesSection.tsx` | Litiges fonciers |
| `cadastral-document/sections/LegalSection.tsx` | Vérification juridique |
| `cadastral-document/primitives.tsx` | `SectionCard`, `DataField`, `DocTable`, `LockedSection`, `StatusAlert` |

### Composants primitifs réutilisables

- **`SectionCard`** : wrapper avec bordure gauche accent, numéro, icône, titre — remplace `SectionTitle` + table brut
- **`DataField`** : remplace `DataRow` — affichage label/valeur en grille CSS responsive (2 colonnes desktop, 1 mobile) au lieu de `<table>`
- **`DocTable`** : wrapper table avec styles Tailwind intégrés (alternance, hover, responsive)
- **`LockedSection`** : placeholder amélioré avec bouton "Débloquer" qui callback vers le catalogue
- **`StatusAlert`** : alerte verte (aucun litige/hypothèque) ou orange (alerte active)

### Calcul des sections

Remplacer le compteur mutable `let sectionNumber = 0` par un tableau déclaratif de sections visibles :

```typescript
const visibleSections = [
  hasParcelData && 'identification',
  hasParcelData && 'owner',
  hasParcelData && hasConstruction && 'construction',
  // ...
].filter(Boolean);

// Chaque section reçoit son index via props
<IdentificationSection number={visibleSections.indexOf('identification') + 1} />
```

## Fichiers impactés

| Action | Fichier |
|---|---|
| **Supprimer** | `src/components/cadastral/CadastralDocumentView.tsx` (ancien monolithe) |
| **Créer** | `src/components/cadastral/cadastral-document/` (12 fichiers ci-dessus) |
| **Modifier** | `src/components/cadastral/CadastralResultCard.tsx` (import path) |

L'ancien `CadastralDocumentView.tsx` est remplacé par un réexport depuis le nouveau dossier pour ne casser aucun import externe.

