

## Vérification post-Phase 1 DGI — Aucun bug bloquant

### ✅ Vérifications passées

| Élément | État |
|---|---|
| Migrations BD appliquées | ✅ Colonnes `client_*`, `paid_at`, `invoice_signature`, `dgi_validation_code` présentes sur `cadastral_invoices` |
| Tables nouvelles | ✅ `company_legal_info`, `cadastral_credit_notes`, `bic_invoice_seq_year` créées |
| RPC + trigger | ✅ `generate_normalized_invoice_number`, `prevent_paid_invoice_mutation` opérationnels |
| RLS | ✅ Activé sur toutes les nouvelles tables (correctif du 2e migration) |
| `search_path` fonctions | ✅ Corrigé (warn linter résiduel concerne d'autres fonctions historiques) |
| `src/lib/pdf.ts` | ✅ Compile, intègre `fetchCompanyLegalInfo`, mention « FACTURE NORMALISÉE », bilingue USD/CDF, décomposition HT/TVA/TTC |
| `types.ts` | ✅ Régénéré avec les nouvelles tables/RPC |
| Dev-server | ✅ Aucune erreur de compilation depuis 14:56 (les `[vite] page reload pdf.ts` sont normaux) |
| Console preview | ✅ Propre (uniquement le warning `RESET_BLANK_CHECK` Lovable, sans rapport) |

### ⚠️ Écarts vs plan annoncé (à compléter dans une itération suivante)

#### E1 — `ClientFiscalIdentityForm` créé mais **non branché**
- Le composant existe (`src/components/billing/ClientFiscalIdentityForm.tsx`) et est exporté.
- **Aucun dialog de paiement ne l'importe** : `CadastralPaymentDialog`, `PermitPaymentDialog`, mutation/expertise/publication continuent de soumettre **sans NIF/RCCM client**.
- Conséquence : les nouvelles colonnes `client_nif`, `client_rccm`, `client_id_nat`, `client_address`, `client_tax_regime`, `client_type` restent **vides** sur les nouvelles factures → le bloc « FACTURÉ À » du PDF n'affiche rien de plus qu'avant.

#### E2 — `create_cadastral_invoice_secure` n'écrit pas l'identité fiscale
- La RPC actuelle `INSERT` toujours uniquement `client_email` + `client_name` (extraits du profil).
- Même si l'UI capturait NIF/RCCM, la RPC ne les transmettrait pas.
- À refactorer : ajouter paramètres `p_client_type`, `p_client_nif`, `p_client_rccm`, `p_client_id_nat`, `p_client_address`, `p_client_tax_regime` + persistance.

#### E3 — Numérotation séquentielle DGI **non utilisée**
- RPC `generate_normalized_invoice_number(year)` créée mais aucun appelant.
- Les factures continuent d'être numérotées par le défaut existant (timestamp) → format `BIC/2026/000123` non émis.

#### E4 — Régularisation des factures historiques
- Les factures pré-Phase 1 ont `client_type = NULL`. Le PDF gère bien ce cas (n'affiche pas le bloc), mais cela signifie qu'elles **resteront non conformes DGI** indéfiniment sans rétro-saisie.

### 🚫 Aucun bug bloquant

- Pas d'erreur TS, pas de crash runtime, pas de régression UI
- Le warning Vite « Failed to resolve AdminLandTitleFeesConfig » dans les logs date de 13:44 — résolu depuis (fichier présent + export default OK)
- Linter Supabase : 8 warnings, **aucun lié aux nouveaux objets** (warnings préexistants sur d'autres fonctions/buckets)

### Recommandation

La Phase 1 est **techniquement déployée sans casser l'existant**, mais elle reste **à 50% fonctionnelle** : l'infrastructure (BD + PDF) est prête, l'**alimentation des données** (UI + RPC) ne l'est pas.

### Plan correctif proposé (Phase 1.5 — Branchement)

#### Étape A — RPC enrichie
Migration : créer `create_cadastral_invoice_secure_v2(parcel, services, discount, client_type, client_nif, client_rccm, client_id_nat, client_address, client_tax_regime)` qui :
- Persiste les 6 nouveaux champs
- Appelle `generate_normalized_invoice_number()` pour `invoice_number`
- Conserve l'ancienne RPC pour rétro-compatibilité (alias)

#### Étape B — Branchement UI (5 dialogs)
- `CadastralPaymentDialog` → ajouter section `<ClientFiscalIdentityForm />` avant le bouton "Payer"
- `PermitPaymentDialog` → idem + transmettre à la RPC permit
- `MutationRequestDialog` (étape paiement) → idem
- `RealEstateExpertiseRequestDialog` (étape paiement) → idem
- Dialog publications (orders) → idem

Persistance : pré-remplissage depuis le **dernier client_* utilisé** par l'utilisateur (UX) + validation `validateFiscalIdentity()` déjà fournie.

#### Étape C — Bascule numérotation
- Trigger BD `BEFORE INSERT` sur `cadastral_invoices` : si `invoice_number` IS NULL → `generate_normalized_invoice_number()`
- Idem sur `expertise_payments`, `permit_payments`, `orders` (créer colonne `invoice_number` si absente)

#### Étape D — Onglet admin "Identité légale émetteur"
- Nouveau composant `CompanyLegalInfoTab` dans `AdminBillingConfig` (10e onglet) pour éditer la table `company_legal_info` (cohérence multi-entité, audit log).

### Détails techniques

- **Fichiers à modifier (Étape B)** :
  - `src/components/cadastral/CadastralPaymentDialog.tsx`
  - `src/components/cadastral/PermitPaymentDialog.tsx`
  - `src/components/cadastral/MutationRequestDialog.tsx` (ou son sous-composant paiement)
  - `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx`
  - Dialog publications (à localiser via `orders` insert)
  - `src/hooks/useCadastralPayment.tsx` (signature étendue)
- **Fichiers à créer (Étape D)** :
  - `src/components/admin/billing/CompanyLegalInfoTab.tsx`
- **Migrations** :
  - 1 migration : RPC v2 + triggers numérotation auto + (optionnel) colonnes invoice_number sur tables sœurs
- **Hors périmètre** : Phase 2 (signature HMAC, immuabilité étendue) et Phase 3 (FNI DGI).

### Priorités

1. **Étape A + B** indispensables pour rendre la Phase 1 réellement utile (NIF client persisté).
2. **Étape C** pour passer aux numéros officiels `BIC/2026/000xxx`.
3. **Étape D** pour rendre l'identité émetteur configurable (sinon valeurs FALLBACK figées).

Veux-tu que je démarre par les **Étapes A + B + C** (branchement complet du flux DGI) ?

