

## Audit — Facturation & Commerce (admin)

### Verdict global

**Aucune régression critique** introduite par les derniers changements (Modèle de facture, Aperçu visuel, refonte facture catalogue). L'application reste fonctionnelle, le routage est correct, la base de données est cohérente. Quelques **dettes mineures de cohérence** subsistent et méritent un correctif léger.

### État du module

| Élément | Statut | Notes |
|---|---|---|
| Routage `tab=invoice-template` | OK | `Admin.tsx` ligne 37, lazy chargé |
| Entrée sidebar | OK | sidebarConfig ligne 78, keywords riches |
| Table `invoice_template_config` | OK | 10 clés seed actives, types JSONB corrects |
| RLS lecture/écriture admin | OK | Pattern standard appliqué |
| `pdf.ts` consomme la config | OK | tva_rate dynamique avec fallback constante |
| `CompanyLegalInfoForm` upload logo | OK | bucket `app-assets` public, `crypto.randomUUID()` |
| Aperçu réactif A4/Mini | OK | scale responsive, refetch manuel disponible |
| Téléchargement facture catalogue | OK | corrigé précédemment (await + toast) |
| Impression facture catalogue | OK | corrigé précédemment (visibility hidden + portal) |
| Linter Supabase | OK module | 8 warns globaux préexistants (non liés) |

### Bugs mineurs identifiés (non-bloquants)

#### B1 — TVA encore en dur dans 2 composants UI
`src/components/cadastral/CadastralInvoice.tsx` (lignes 11, 153, 364) et `src/components/cadastral/billing/BillingTotals.tsx` (lignes 9, 96-114) importent toujours `TVA_RATE` depuis `constants/billing.ts`.  
→ Conséquence : si l'admin change le taux à 18% dans la config, le **PDF se met à jour** mais la facture **affichée à l'écran** (modale + totaux du panier) continue d'afficher 16%.  
→ Source de vérité non respectée (cf. plan initial).

#### B2 — `default_format` ignoré côté écran utilisateur
La config admin permet de choisir A4 / Mini par défaut, mais seul l'aperçu admin lit cette valeur. Les composants client (`CadastralResultCard`, `CadastralInvoice`) n'utilisent pas `config.default_format` lors du téléchargement.  
→ Le réglage admin est partiellement décoratif.

#### B3 — `payment_method` affichage figé
Dans `InvoicePreviewPanel` l'aperçu écrit toujours « Mobile Money » en dur (ligne 98), même si l'utilisateur veut visualiser un autre mode. Acceptable pour un sample fixe, mais incohérent avec le reste de l'aperçu qui se met à jour en direct.

#### B4 — `secondary_color` utilisée uniquement pour l'en-tête de tableau
La couleur secondaire n'apparaît qu'à un seul endroit (ligne 105 `InvoicePreviewA4`). Le PDF réel pourrait l'utiliser à plus d'emplacements pour valoriser le réglage. Faible priorité.

#### B5 — Doublon sémantique sidebar
Deux entrées coexistent dans la même catégorie :
- `Config Facturation` (`billing-config`) — frais permis/mutation/lotissement/expertise/hypothèques
- `Modèle de facture` (`invoice-template`) — identité, TVA, mise en page

Le label `Config Facturation` peut induire en erreur l'admin qui cherche le modèle. Renommage recommandé : `Frais & Tarifs` ou `Tarification services`.

### Plan de correction proposé

#### Étape 1 — Centraliser le taux TVA côté écran
- créer un hook léger `useTvaRate()` qui lit `useInvoiceTemplateConfig()` et retourne `{ rate, label }` avec fallback `TVA_RATE`
- remplacer les imports `TVA_RATE` dans :
  - `src/components/cadastral/CadastralInvoice.tsx`
  - `src/components/cadastral/billing/BillingTotals.tsx`
- conserver `constants/billing.ts` comme **fallback uniquement** (commentaire explicite)

#### Étape 2 — Respecter `default_format` côté client
- dans `CadastralResultCard.handleDownloadPDF()`, lire `config.default_format` via le hook et le passer à `generateInvoicePDF()`
- garder un sélecteur si plusieurs formats restent proposés à l'utilisateur final

#### Étape 3 — Renommer l'entrée sidebar
- `sidebarConfig.ts` ligne 77 : `Config Facturation` → `Frais & Tarifs services`
- ajouter keywords : `tarif`, `frais`, `prix`

#### Étape 4 — Polish aperçu
- exposer un sélecteur `payment_method` dans `InvoicePreviewPanel` (Mobile Money / Carte / Virement) qui modifie uniquement le sample
- élargir l'usage de `secondary_color` (bordure de tableau, séparateurs)

### Hors périmètre

- Pas de refonte de `AdminBillingConfig` (frais services) — fonctionne, séparation logique justifiée
- Pas d'intervention sur les 8 warnings Supabase (préexistants, non liés au module)
- Pas de migration DB nécessaire
- Pas de modification du moteur PDF

### Validation attendue

1. Modifier TVA à 18% → modale `CadastralInvoice` ET totaux panier ET PDF affichent 18%
2. Choisir `Mini` comme format par défaut → bouton « Télécharger » du catalogue produit un Mini
3. Sidebar : `Frais & Tarifs services` distinct de `Modèle de facture`
4. Aperçu admin : sample avec mode paiement variable
5. Non-régression : impression facture, téléchargement PDF, identité émetteur, audit log

