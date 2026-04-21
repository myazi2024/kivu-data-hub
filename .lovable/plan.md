

## Plan — Espace admin : Modèle de facture unifié

### Constat

La section `Admin → Facturation et commerce → Factures` (`AdminInvoices.tsx`) ne sait que **lister et exporter** les factures émises. Aucun écran ne permet de paramétrer **l'apparence et le contenu légal** de la facture utilisée par TOUTE l'application :

- catalogue de services cadastraux (`CadastralInvoice`, `CadastralResultCard`)
- paiement cadastral (`CadastralPaymentDialog`)
- dashboard client (`CadastralClientDashboard`)
- tous les PDF générés par `src/lib/pdf.ts → generateInvoicePDF()` (formats A4 + mini)

Or ces sorties consomment déjà :
- la table `company_legal_info` (identité émetteur, RCCM, NIF, TVA, IBAN, logo)
- la constante `TVA_RATE` (16%) figée dans `src/constants/billing.ts`
- des libellés DGI, formats de numéro et mentions codés en dur dans `pdf.ts`

→ Aucun admin ne peut éditer ces éléments aujourd'hui sans toucher au code.

### Objectif

Créer un nouvel onglet admin **« Modèle de facture »** dans `Facturation et commerce`, source unique de vérité pour la mise en page et les données légales de toutes les factures de l'application.

### Périmètre fonctionnel

#### 1. Identité émetteur (table `company_legal_info`)
- Raison sociale, nom commercial, forme juridique, capital
- RCCM, ID Nat, NIF, n° TVA, régime fiscal
- Adresse complète (ligne 1, ligne 2, ville, province, pays)
- Téléphone, email, site web
- Logo (upload via storage `app-assets`)
- Coordonnées bancaires (banque, IBAN, SWIFT)
- Toggle `is_active`

#### 2. Paramètres fiscaux et monétaires
- Taux de TVA (déplacer `TVA_RATE` de `constants/billing.ts` vers `system_settings` ou nouvelle table `invoice_template_config`)
- Devise principale + devises secondaires affichées
- Affichage HT/TVA/TTC obligatoire DGI on/off
- Mention « FACTURE NORMALISÉE » on/off
- Format de numérotation (préfixe, séquence)

#### 3. Mise en page du document
- Format par défaut : A4 / Mini reçu thermique
- Couleurs primaire/secondaire de l'en-tête
- Pied de page : mentions légales personnalisables
- Conditions de paiement (texte libre)
- Note de bas de facture (texte libre)
- Affichage QR de vérification on/off

#### 4. Aperçu en direct
- Mini-preview du rendu A4 et du rendu mini dans la modale
- Bouton « Générer un exemple PDF » qui appelle `generateInvoicePDF()` avec une facture fictive

### Architecture proposée

#### Nouveaux fichiers
- `src/components/admin/AdminInvoiceTemplate.tsx` — onglet principal avec sous-onglets Identité / Fiscalité / Mise en page / Aperçu
- `src/components/admin/invoice-template/CompanyLegalInfoForm.tsx` — édition `company_legal_info`
- `src/components/admin/invoice-template/InvoiceFiscalSettingsForm.tsx` — TVA, devises, mentions DGI
- `src/components/admin/invoice-template/InvoiceLayoutForm.tsx` — couleurs, pied de page, QR
- `src/components/admin/invoice-template/InvoicePreviewPanel.tsx` — aperçu live + bouton PDF démo
- `src/hooks/useInvoiceTemplateConfig.ts` — read/write paramètres (basé sur le pattern `useContributionConfig`)

#### Migration DB
Nouvelle table `invoice_template_config` (clé/valeur typée) :
```
config_key TEXT, config_value JSONB, description TEXT, is_active BOOLEAN
```
Avec seed initial pour : `tva_rate`, `tva_label`, `default_format`, `show_dgi_mention`, `header_color`, `footer_text`, `payment_terms`, `show_verification_qr`, `invoice_number_prefix`.

RLS : lecture publique, écriture admin/super_admin (pattern déjà utilisé pour `cadastral_contribution_config`).

#### Refactor `src/lib/pdf.ts`
- Lire `invoice_template_config` au début de `generateInvoicePDF()` (en plus de `fetchCompanyLegalInfo()`)
- Remplacer les valeurs codées en dur par les valeurs config
- `TVA_RATE` reste comme fallback dans `constants/billing.ts` mais devient secondaire

#### Intégration sidebar
- Ajouter une entrée `invoice-template` dans `src/components/admin/sidebarConfig.ts` sous catégorie « Facturation et commerce »
- Ajouter le mapping lazy dans `src/pages/Admin.tsx` :
  ```ts
  'invoice-template': lazy(() => import('@/components/admin/AdminInvoiceTemplate'))
  ```

### Sécurité
- RLS stricte : `has_role(auth.uid(), 'admin'|'super_admin')` pour UPDATE/INSERT
- `logAuditAction()` (utilitaire existant `supabaseConfigUtils.ts`) à chaque modification
- Upload logo via bucket existant `app-assets` avec `crypto.randomUUID()`

### Validation attendue

1. `Admin → Facturation et commerce → Modèle de facture` affiche les 4 sous-onglets
2. Modifier le RCCM → nouvelle facture PDF (catalogue services) reflète le changement
3. Modifier le taux de TVA à 18% → nouvelle facture A4 affiche 18%
4. Désactiver le QR → nouvelle facture A4 sans QR
5. Bouton « Aperçu PDF » génère un exemple avec la config courante
6. Audit log enregistre chaque modification
7. Non-régression : `CadastralInvoice` modale écran et impression continuent de fonctionner

### Hors périmètre

- Pas de refonte du moteur PDF (`pdf.ts` reste, on injecte juste la config)
- Pas de redesign d'`AdminInvoices` (liste des factures inchangée)
- Pas de templates multiples par type de service (un seul modèle global pour cette itération)
- Pas de gestion multi-établissements

### Détail technique

```text
État actuel
identité émetteur -> company_legal_info (DB) ✓ mais pas d'UI admin
TVA               -> constants/billing.ts (code) ✗ non éditable
mentions DGI      -> pdf.ts (code) ✗ non éditable
format A4/mini    -> choix utilisateur runtime ✗ pas de défaut admin
couleurs/pied     -> pdf.ts (code) ✗ non éditable

État cible
identité émetteur -> company_legal_info (DB) + UI AdminInvoiceTemplate
fiscalité/format  -> invoice_template_config (DB) + UI
mise en page      -> invoice_template_config (DB) + UI
pdf.ts            -> consomme les deux sources, fallback constants
```

