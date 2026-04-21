

## Fix — Impression de la facture du catalogue de services

### Cause racine

Le composant `CadastralInvoice.tsx` (modal qui s'ouvre après paiement avec le bouton « Imprimer ») appelle bien `window.print()` (ligne 187 et 419), mais **la sortie est entièrement blanche**.

Pourquoi : `src/index.css` (ligne 472-498) contient une règle d'impression globale très agressive :

```css
@media print {
  body * { visibility: hidden; }
  #review-print-area,
  #review-print-area * { visibility: visible !important; }
  #review-print-area { position: absolute; top: 0; left: 0; ... }
}
```

Cette règle a été conçue pour l'onglet `ReviewTab` du formulaire CCC, mais elle s'applique **à tout le site**. Conséquence : quand l'utilisateur clique « Imprimer » dans la facture cadastrale, **tout le `body` devient invisible** et seule la zone `#review-print-area` (qui n'existe pas dans la modale facture) reste visible → page blanche.

Symptôme additionnel : même en l'absence de cette règle, la modale a une racine `fixed inset-0 bg-black/80 backdrop-blur-sm` non scopée pour l'impression → le fond noir s'imprimerait sur toute la page.

### Périmètre touché

Tous les flux qui appellent `window.print()` hors de `ReviewTab` sont cassés de la même manière :

| Composant | Ligne | État impression |
|---|---|---|
| `CadastralInvoice.tsx` | 187, 419 | ❌ blanc |
| `cadastral-document/DocumentToolbar.tsx` | 52 | ❌ blanc (la fiche parcellaire aussi !) |
| `ccc-tabs/ReviewTab.tsx` | 105 | ✅ OK (scope `#review-print-area`) |

Donc **deux bugs identiques** sont corrigés par la même solution.

### Correctif

#### 1. Scoper la règle existante au seul `ReviewTab`

Dans `src/index.css`, remplacer le sélecteur racine `body *` par une portée conditionnelle activée uniquement quand un attribut `data-print-scope="review"` est présent sur `<html>`. Plus simple : encapsuler **toutes** les règles `#review-print-area` dans une nouvelle classe activable.

Approche retenue (minimaliste, sans toucher au comportement de `ReviewTab`) :

- `body.print-review-only *` au lieu de `body *`
- `ReviewTab` ajoute `document.body.classList.add('print-review-only')` avant `window.print()` et le retire après (`onafterprint`)

#### 2. Ajouter un scope d'impression propre pour la modale facture

Dans `CadastralInvoice.tsx` :
- ajouter un wrapper `id="invoice-print-area"` autour de `<Card>`
- ajouter dans `index.css` un bloc `@media print` dédié :
  - masquer `body > *:not(.invoice-print-host)` 
  - rendre la modale en flux normal (sans `fixed`, sans backdrop noir)
  - cacher boutons / barre fermeture

#### 3. Ajouter un scope d'impression pour la fiche parcellaire

Dans `cadastral-document/CadastralDocumentView.tsx` :
- ajouter `id="cadastral-doc-print-area"` sur le wrapper racine `.cadastral-document`
- règle CSS similaire à la facture
- le `print:hidden` déjà présent sur `DocumentToolbar` continuera à fonctionner

#### 4. Pattern unifié recommandé

Plutôt que de répéter la même mécanique 3 fois, créer un petit hook `usePrintScope(scopeId)` qui :
- ajoute une classe `print-scope-active` au `body`
- définit une variable CSS `--print-scope-id` lue par une règle générique
- gère `beforeprint` / `afterprint` pour nettoyer

Une seule règle CSS générique :
```css
@media print {
  body.print-scope-active > *:not([data-print-host]) { display: none !important; }
  body.print-scope-active [data-print-host] { position: static; background: white; ... }
}
```

Chaque composant imprimable ajoute juste `data-print-host` sur sa racine et appelle `usePrintScope()` au lieu de `window.print()` direct.

### Validation attendue

1. Catalogue de services → payer un service → modale facture → bouton Imprimer
   - Aperçu d'impression affiche la facture sur fond blanc, sans backdrop noir, sans boutons
2. Fiche parcellaire → bouton Imprimer dans toolbar
   - Aperçu affiche le document complet, toolbar masquée, croquis SVG conservé
3. Formulaire CCC → onglet Envoi → bouton Imprimer
   - Comportement inchangé (régression à éviter)
4. Vérification : `Ctrl+P` n'importe où ailleurs ne déclenche aucun masquage parasite

### Fichiers à modifier

- `src/index.css` (refonte du bloc `@media print`)
- `src/components/cadastral/CadastralInvoice.tsx` (wrapper + hook)
- `src/components/cadastral/cadastral-document/CadastralDocumentView.tsx` (wrapper + hook)
- `src/components/cadastral/ccc-tabs/ReviewTab.tsx` (migration vers le hook)
- `src/hooks/usePrintScope.ts` (nouveau, ~20 lignes)

### Hors périmètre

- Pas de modification du PDF généré (`generateInvoicePDF` / `generateCadastralReport`) — le bouton Télécharger PDF fonctionne déjà, c'est uniquement l'impression navigateur qui est cassée
- Pas de refonte de la modale `CadastralInvoice` (déjà fonctionnelle visuellement)
- Pas de changement sur `CadastralResultsDialog` (n'a pas de bouton Imprimer propre)

