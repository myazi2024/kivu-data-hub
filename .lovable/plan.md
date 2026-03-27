

# Optimisation du catalogue de services — Corrections et améliorations

## Problemes identifies

### 1. "Mode développement" n'existe pas cote utilisateur
Le terme "Mode développement" apparait dans la banniere du catalogue (`CadastralBillingPanel` L278), dans les toasts (`L196`, `useCadastralPayment L138`). Cote admin (`AdminPaymentMode`), c'est un terme technique interne (bypass). Cote utilisateur, seul le "Mode test" existe (`AdminTestMode`). La banniere doit etre renommee.

### 2. Bouton Retour (ArrowLeft) ne fonctionne pas
Dans `CadastralResultsDialog` L106-114, le bouton `ArrowLeft` appelle `navigate('/cadastral-map')`, ce qui recharge la page et perd le contexte. Puisque le catalogue est deja un overlay sur la carte, ce bouton est inutile. L'utilisateur demande un bouton "Quitter (X)" a la place, qui est deja present en haut a droite (L95-102). Le bouton `ArrowLeft` doit etre supprime.

### 3. Largeur trop grande sur ordinateur
`CadastralResultsDialog` utilise `md:max-w-4xl` (896px) — trop large. Reduire a `md:max-w-2xl` (672px) pour un catalogue plus compact sur desktop.

### 4. Divergences supplementaires detectees

| Divergence | Fichier | Detail |
|-----------|---------|--------|
| Double bouton fermer | `CadastralResultsDialog` | Le header a le bouton X (L95) ET `CadastralResultCard` a aussi un bouton fermer (L439-447). Redundant. |
| Toast "mode developpement" dans createInvoice | `useCadastralPayment.tsx` L138 | Meme probleme de terminologie |
| Toast "mode developpement" dans handleProceedToPayment | `CadastralBillingPanel.tsx` L196 | Idem |
| Indicateur "Parcelle avec hypotheque active" toujours affiche | `CadastralResultCard` L1178 | S'affiche meme si toutes les hypotheques sont eteintes (le filtre `isActive` est dans la boucle, pas avant l'indicateur) |
| "Aucun historique disponible" generique | Plusieurs onglets | Le meme texte vague est utilise pour bornage (L950), historique (L1064), taxes (L1159). Devrait etre specifique. |

---

## Plan de corrections

### Correction 1 — Renommer "Mode developpement" en "Mode test" (3 fichiers)

| Fichier | Action |
|---------|--------|
| `CadastralBillingPanel.tsx` L278 | Changer le texte en "Mode test — Acces gratuit aux services" et unifier le style avec la banniere test existante (L283-289) |
| `CadastralBillingPanel.tsx` L196 | Toast : "Services debloques avec succes (mode test)" |
| `useCadastralPayment.tsx` L138 | Toast : "Acces accorde (mode test)" |

### Correction 2 — Supprimer le bouton Retour, garder uniquement le X (1 fichier)

| Fichier | Action |
|---------|--------|
| `CadastralResultsDialog.tsx` | Supprimer le bloc `fromMap && ArrowLeft` (L106-114), supprimer la prop `fromMap`, supprimer `handleBackToMap` et l'import `ArrowLeft`. Le bouton X en haut a droite (L95-102) reste le seul moyen de fermer. |

### Correction 3 — Reduire la largeur desktop du catalogue (1 fichier)

| Fichier | Action |
|---------|--------|
| `CadastralResultsDialog.tsx` L93 | Remplacer `md:max-w-4xl` par `md:max-w-2xl` |

### Correction 4 — Corriger l'indicateur d'hypotheque active (1 fichier)

| Fichier | Action |
|---------|--------|
| `CadastralResultCard.tsx` L1177-1183 | Conditionner l'affichage de "Parcelle avec hypotheque active" a la presence effective d'au moins une hypotheque active : `mortgage_history.some(m => ['active', 'Active', 'En cours'].includes(m.mortgage_status))` |

### Correction 5 — Supprimer le bouton fermer duplique dans CadastralResultCard (1 fichier)

| Fichier | Action |
|---------|--------|
| `CadastralResultCard.tsx` L439-447 | Supprimer le bouton `XCircle` dans le header de la carte de resultats, car `CadastralResultsDialog` a deja un bouton X global |

### Correction 6 — Messages "aucun historique" specifiques (1 fichier)

| Fichier | Action |
|---------|--------|
| `CadastralResultCard.tsx` | Remplacer les 3 occurrences de "Aucun historique disponible" par des textes specifiques : "Aucun bornage enregistre" (L950), "Aucun ancien proprietaire enregistre" (L1064), "Aucune taxe fonciere enregistree" (L1159) |

---

## Resume

| Type | Nombre | Fichiers |
|------|--------|----------|
| Terminologie | 3 corrections | `CadastralBillingPanel.tsx`, `useCadastralPayment.tsx` |
| UI/UX | 3 corrections | `CadastralResultsDialog.tsx`, `CadastralResultCard.tsx` |
| Logique | 1 correction | `CadastralResultCard.tsx` |
| **Total** | **7 corrections** | **3 fichiers** |

