

## Plan — Aperçu visuel réaliste de la facture dans l'admin

### Constat

L'onglet `Aperçu` du module `Modèle de facture` existe déjà (`InvoicePreviewPanel.tsx`) mais propose seulement :
- une mini-vignette HTML compacte qui ne ressemble pas au PDF final
- deux boutons qui forcent le téléchargement d'un PDF (sans visualisation directe)

→ L'utilisateur ne peut pas **voir** la facture en conditions réelles avant qu'un client ne la reçoive. Il doit télécharger le PDF, l'ouvrir dans un autre logiciel, puis revenir corriger la config. Boucle inefficace.

### Objectif

Offrir dans l'onglet `Aperçu` un **rendu fidèle** des deux formats de facture (A4 + Mini reçu thermique), affiché en pleine page comme un vrai document, qui se met à jour en direct dès qu'on modifie la config dans les autres onglets.

### Périmètre fonctionnel

#### 1. Sélecteur de format
Boutons-onglets en haut du panneau :
- `A4` (par défaut) — rendu pleine page 210×297 mm à l'échelle
- `Mini reçu` — rendu vertical étroit 80 mm thermique

#### 2. Aperçu A4 réaliste
Un cadre simulant une feuille A4 (proportions 1:√2, ombre portée, fond blanc) contenant :
- en-tête couleur (`header_color`) avec logo réel + identité émetteur complète (raison sociale, forme juridique, capital, RCCM, ID Nat, NIF, n° TVA, adresse complète, téléphone, email, site)
- bandeau titre `FACTURE NORMALISÉE` ou `FACTURE` selon `show_dgi_mention`
- numéro avec préfixe configuré + dates émission/paiement
- bloc client + bloc référence parcelle/zone
- tableau des prestations (2 services exemples) avec couleur secondaire
- bloc totaux (Sous-total, Remise, Base HT, TVA libellée, TTC)
- conditions de paiement + mentions de pied configurées
- IBAN/SWIFT/banque émetteur si renseignés
- vignette QR de vérification si `show_verification_qr` activé
- numéro DGI fictif

#### 3. Aperçu Mini reçu réaliste
Cadre vertical étroit (~280px de large) avec :
- en-tête condensé (logo + raison sociale)
- titre + numéro
- liste services (sans tableau)
- totaux empilés
- pied de page court
- QR si activé

#### 4. Aperçu réactif
- Lit `useInvoiceTemplateConfig()` et `useCompanyLegalInfo()` en direct
- Toute modif dans les onglets Identité / Fiscalité / Mise en page se reflète instantanément
- Bouton « Rafraîchir » pour forcer le rechargement

#### 5. Génération PDF d'exemple (conservé)
Les deux boutons existants (Aperçu PDF A4 / Mini) restent disponibles en bas, comme **validation finale** du rendu réel produit par `generateInvoicePDF()`.

### Architecture

#### Refonte d'un seul fichier
- `src/components/admin/invoice-template/InvoicePreviewPanel.tsx`
  - Ajouter un state `format: 'a4' | 'mini'`
  - Extraire deux sous-composants internes :
    - `<InvoicePreviewA4 config info />` 
    - `<InvoicePreviewMini config info />`
  - Conserver `buildSampleInvoice()` / `buildSampleServices()` pour cohérence avec le PDF réel
  - Ajouter un wrapper visuel « feuille » avec ombre, ratio A4, échelle responsive (`transform: scale()` adaptatif viewport)

#### Aucun changement DB / hook / PDF
- Pas de migration
- Pas de modification de `useInvoiceTemplateConfig` ni `useCompanyLegalInfo`
- Pas de modification de `src/lib/pdf.ts`
- Pas de nouvelle entrée sidebar

### Validation attendue

1. `Admin → Facturation et commerce → Modèle de facture → Aperçu`
2. L'aperçu A4 s'affiche par défaut, à l'échelle, lisible sans télécharger de PDF
3. Bascule `Mini reçu` → rendu vertical étroit visible
4. Modifier la couleur d'en-tête dans `Mise en page` → l'aperçu se met à jour immédiatement à la bascule d'onglet
5. Modifier le RCCM dans `Identité` → visible dans l'aperçu
6. Désactiver le QR → la vignette QR disparaît de l'aperçu
7. Changer le taux de TVA → la ligne TVA et le calcul HT changent
8. Boutons « Aperçu PDF A4/Mini » continuent de produire un PDF téléchargeable identique

### Hors périmètre

- Pas de modification du moteur PDF
- Pas d'aperçu pixel-perfect rendu via PDF.js (trop coûteux ; le rendu HTML reste une simulation très fidèle, et le bouton PDF couvre la vérification finale)
- Pas d'édition WYSIWYG dans l'aperçu (la config se fait dans les autres onglets)
- Pas d'aperçu multi-langues / multi-devises

### Détail technique

```text
État actuel
Onglet Aperçu -> mini-vignette HTML compacte 1 format unique
              -> 2 boutons téléchargement PDF

État cible
Onglet Aperçu -> sélecteur A4 / Mini
              -> rendu fidèle pleine page, fond feuille, échelle responsive
              -> tous les champs config + identité visibles
              -> 2 boutons téléchargement PDF conservés en bas
```

