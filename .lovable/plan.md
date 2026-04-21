

## Audit conformité WYSIWYG — Aperçu de la facture (résiduel)

### Verdict

La structure macro (en-tête bicolonne, tableau HT/TTC, bandeau total, mentions DGI 5 lignes, conditions+banque, QR bas-droite) est désormais **alignée** entre l'aperçu HTML et le PDF. Mais **12 divergences résiduelles** subsistent, principalement sur les **données affichées** : l'aperçu HTML utilise des constantes en dur même quand une vraie facture est chargée, ce qui casse le principe WYSIWYG dès qu'on quitte le sample.

### Divergences résiduelles (preview ↔ PDF)

| # | Élément | Aperçu HTML | PDF généré | Impact |
|---|---|---|---|---|
| R1 | **Source du logo** | `info.logo_url` (CompanyLegalInfo) | `fetchAppLogo()` (app_appearance_config) | Logos potentiellement différents |
| R2 | **Taille logo A4** | 53×53 px (≈14mm flou via scale) | 14×14 mm strict | Rendu visuel différent |
| R3 | **N° de facture** | toujours `${prefix}-PREVIEW-0001` | `invoice.invoice_number` (vrai N°) | Vraie facture mal numérotée dans l'aperçu |
| R4 | **Données client** | hardcodées `Jean Mukendi`/`SARL Mukendi & Frères` | `invoice.client_*` | Client réel jamais reflété |
| R5 | **Liste prestations** | 2 services fixes en dur | `selected_services` joints au catalogue | Aperçu ≠ contenu réel facture |
| R6 | **Taux de change** | `SAMPLE_EXCHANGE_RATE = 2800` constant | `invoice.exchange_rate_used` | Conversion CDF erronée pour vraie facture |
| R7 | **Date facturation** | `new Date()` du jour | `invoice.search_date` (date de la facture) | Date du jour vs date d'émission |
| R8 | **Statut couleurs** | pending=`#e74c3c` failed=`#c0392b` | pending et failed = RGB(231,76,60) | Codes couleur désynchronisés |
| R9 | **QR vérification** | damier décoratif fixe | QR réel encodant verifyUrl | Impossible de QA visuellement le QR |
| R10 | **Position mentions DGI** | `position:absolute; bottom:18mm` (fixe) | `Math.max(cursorY, pageHeight-50)` (flux) | Si contenu déborde, le PDF pousse, l'aperçu chevauche |
| R11 | **Mode paiement** | sélecteur exposé mais jamais affiché | jamais affiché | Sélecteur trompeur (no-op) |
| R12 | **Adresse client preview** | « Avenue de la Paix 12, Kinshasa » en dur | wrap auto via `splitTextToSize` | Lignes longues ne wrappent pas pareil |

### Cause racine

Lorsqu'une **vraie facture** est chargée via le combobox, seul `effectiveVariants` est dérivé (clientType, status, discountPct, paymentMethod). Les composants `InvoicePreviewA4` et `InvoicePreviewMini` reçoivent `variants` mais **jamais l'objet `invoice` ni `services`** : ils continuent à rendre le sample hardcodé. Le mode "facture réelle" n'a donc d'effet que sur le téléchargement PDF, pas sur l'aperçu HTML.

### Plan de correction

#### Étape 1 — Faire descendre la facture & les services dans les composants preview

Ajouter aux props :
```ts
{ config, info, variants, invoice?, services?, verificationCodePreview? }
```

- Si `invoice` fourni : rendre tous les champs depuis `invoice` (numéro, dates, client_name/email/nif/rccm/id_nat/address, parcel_number, geographical_zone, exchange_rate_used, dgi_validation_code).
- Si non fourni : conserver la logique sample actuelle.
- Idem pour `services` : itérer sur `selected_services` joints au catalogue chargé en parallèle.

#### Étape 2 — Unifier la source du logo

Modifier `InvoicePreviewA4` et `InvoicePreviewMini` pour appeler `fetchAppLogo()` (même source que le PDF) au lieu de `info.logo_url`. Stocker dans un state local + passer en prop. Préserver la mise en cache existante du helper.

Alternative : faire pointer le PDF sur `company_legal_info.logo_url` (mais ce champ n'existe pas → choix 1 retenu).

#### Étape 3 — Aligner les dimensions du logo

Logo A4 : passer de 53×53px à un cadre `width:14mm; height:14mm` (équivalent strict PDF). Logo Mini : déjà 22×22px ≈ 6mm, conserver.

#### Étape 4 — Synchroniser les codes couleur du statut

Aligner `STATUS_COLORS` du preview sur la logique du PDF :
- paid → RGB(39,174,96) = `#27ae60` ✅
- pending → RGB(231,76,60) = `#e74c3c` ✅
- failed → utiliser **la même couleur que pending** dans le PDF (R8) OU corriger le PDF pour distinguer (recommandé : couleur plus sombre pour failed). Choix : harmoniser preview ET PDF avec un mapping commun exporté depuis `src/lib/pdf.ts`.

#### Étape 5 — Mentions DGI en flux normal

Retirer `position:absolute; bottom:18mm` de la section MENTIONS LÉGALES dans `InvoicePreviewA4`. Les placer en fin de flux comme dans le PDF, avec `marginTop: auto` (flexbox column) ou simplement à la suite. Garder le QR positionné absolu dans le coin bas-droit (cohérent PDF).

#### Étape 6 — QR code réel dans l'aperçu

Quand une vraie facture est chargée, générer côté preview un vrai QR via la même librairie `qrcode` (déjà dépendance) avec l'URL `verifyUrl` que le PDF utilisera. Pour le sample, conserver un placeholder mais avec une note "QR généré à l'émission".

#### Étape 7 — Retirer le sélecteur Mode paiement (ou l'utiliser)

Choix simple : **retirer** le sélecteur de la barre Variantes puisqu'il n'apparaît ni dans le HTML ni dans le PDF (R11).
Choix riche : ajouter une ligne `Mode de règlement : <method>` dans la section CONDITIONS DE PAIEMENT, dans HTML **et** PDF. Recommandation : retirer (plus simple, métier non demandeur).

#### Étape 8 — Fixer prefix preview lorsque facture réelle

Dans `InvoicePreviewA4`/`Mini`, si `invoice` fourni : `N° {invoice.invoice_number}`. Sinon : `N° {config.invoice_number_prefix}-PREVIEW-0001`.

### Détail technique

```text
Avant
preview                                           PDF
─────                                             ───
clientName  : "Jean Mukendi" (hardcoded)          → invoice.client_name
N°          : "{prefix}-PREVIEW-0001" (hardcoded) → invoice.invoice_number
date        : new Date() (today)                  → invoice.search_date
exchangeRate: 2800 (constant)                     → invoice.exchange_rate_used
services    : 2 mocks                             → catalogue.filter(selected)
logo        : info.logo_url                       → fetchAppLogo()

Après (facture réelle chargée)
preview      = PDF       (même logo, mêmes données, même N°, mêmes prestations)
preview ≠ PDF (sample)   = OK, sample sert à simuler

WYSIWYG vrai = preview(invoice) === PDF(invoice) cellule par cellule
```

### Critères de validation

1. Charger facture réelle X dans le combobox → aperçu affiche le **vrai N°**, le **vrai client**, la **vraie date**, le **vrai taux**, les **vraies prestations**
2. Logo identique (même fichier, même taille équivalente) entre aperçu et PDF téléchargé
3. Statut "failed" : même couleur dans aperçu et PDF
4. Mentions DGI : pas de chevauchement avec le contenu (flux naturel)
5. QR : visuellement identique (même contenu encodé) entre aperçu et PDF
6. Sélecteur "Mode paiement" retiré OU effectivement affiché dans les deux sorties
7. Sample (sans facture réelle) reste fonctionnel et représentatif
8. Bouton "Comparer ↔ PDF" : ouverture côte à côte → zéro divergence visible champ par champ

### Hors périmètre

- Pas de refonte du moteur jsPDF (toujours impératif)
- Pas de migration de `app_appearance_config.logo_url` vers `company_legal_info` (séparation conservée, juste unification de la source côté preview)
- Pas d'éditeur de mise en page admin
- Pas de support multi-page A4 dans l'aperçu (sample tient sur 1 page)

