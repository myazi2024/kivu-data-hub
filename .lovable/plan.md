

# Ajouter le QR code de vérification sur la fiche cadastrale

## Constat

Le système de vérification (`createDocumentVerification`) est appelé uniquement lors du téléchargement PDF dans `pdf.ts`. La fiche cadastrale affichée à l'écran n'a **aucun QR code ni code de vérification** — le `DocumentFooter` ne contient que le disclaimer.

## Solution

Générer un code de vérification au montage de la fiche et afficher un QR code + code textuel dans le footer du document à l'écran.

## Modifications

### 1. `CadastralDocumentView.tsx` — Générer le code au montage

- Appeler `createDocumentVerification({ documentType: 'report', parcelNumber })` via `useEffect` au premier rendu
- Stocker `{ verificationCode, verifyUrl }` dans un state
- Passer ces valeurs à `DocumentFooter`

### 2. `DocumentFooter.tsx` — Afficher QR code + code de vérification

- Ajouter une section visuelle au-dessus du disclaimer :
  - QR code généré via `qrcode` (librairie déjà utilisée dans `pdf.ts`)
  - Code de vérification en texte mono (`BIC-2026-XXXX`)
  - Lien cliquable vers `/verify/{code}`
- Layout : QR code à gauche, texte + disclaimer à droite
- Le QR code est visible à l'écran ET à l'impression (`print:block`)
- Si le code n'est pas encore chargé, afficher un skeleton/placeholder

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `cadastral-document/CadastralDocumentView.tsx` | +useEffect pour créer la vérification, +state, +props vers footer |
| `cadastral-document/DocumentFooter.tsx` | +QR code canvas, +code textuel, +layout redesign |

