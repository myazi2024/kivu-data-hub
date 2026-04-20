

## Audit — Conformité Facture Normalisée DGI (RDC)

### Référentiel DGI (rappel des exigences)

La facture normalisée DGI repose sur **4 piliers** :
1. **Identification fiscale** complète émetteur **et** client (NIF, RCCM, ID-NAT, adresse)
2. **Mentions légales obligatoires** (« Facture normalisée », régime fiscal, devise officielle CDF, taux TVA 16% explicite avec base HT/TTC séparées)
3. **Sécurité & traçabilité** (numérotation séquentielle non réinitialisable, signature électronique, code de vérification DGI, QR sécurisé)
4. **Archivage** (conservation 10 ans, immuabilité post-émission, journal d'audit)

---

### État actuel — Constats

#### ✅ Points conformes

| # | Élément | État |
|---|---|---|
| 1 | QR code de vérification | ✅ Présent (`createDocumentVerification` + URL publique) |
| 2 | Numérotation unique | ✅ `invoice_number` unique, format préfixé |
| 3 | Identité émetteur (BIC) | ✅ RCCM, ID-NAT, N° Impôt, N° TVA présents dans `BIC_COMPANY_INFO` |
| 4 | Devise CDF supportée | ✅ Colonnes `currency_code`, `exchange_rate_used` en BD |
| 5 | TVA 16% calculée | ✅ Conforme au taux DGI (constante `TVA_RATE`) |
| 6 | Audit / immuabilité | ⚠️ Partiel (pas de verrou explicite post-émission) |

#### 🔴 Non-conformités majeures

| # | Manquement | Gravité | Impact DGI |
|---|---|---|---|
| **N1** | **NIF client absent** de `cadastral_invoices` (pas de colonne `client_nif`, `client_rccm`, `client_id_nat`, `client_address`) | 🔴 Critique | Une facture sans NIF client B2B est **rejetée** par la DGI |
| **N2** | **Mention « Facture normalisée »** absente du PDF (titre actuel : « Justificatif de paiement ») | 🔴 Critique | Document non reconnu comme facture fiscale |
| **N3** | **TVA appliquée sur le total après remise mais affichage trompeur** : prix services présentés TTC ? HT ? jamais explicité. Sous-total HT, base imposable, TVA et TTC doivent apparaître **séparément** | 🔴 Critique | Violation art. règles facturation DGI |
| **N4** | **Devise CDF non affichée sur le PDF** : tout le PDF est en USD seulement, sans contre-valeur CDF (devise officielle obligatoire en RDC) | 🔴 Critique | Facture en devise étrangère sans équivalence CDF non recevable |
| **N5** | **Aucun code de validation DGI / FNI** (Facturation Normalisée Intégrée) — pas d'intégration au système télédéclaratif | 🔴 Critique | Hors-circuit DGI 2024+ |
| **N6** | **Signature électronique absente** : QR pointe vers vérification interne BIC, pas signature cryptographique du document | 🟠 Élevé | Intégrité non prouvable juridiquement |
| **N7** | **Numérotation non séquentielle stricte** : format `TEST-INV-{timestamp36}-{i}` ou ad-hoc, pas de séquence annuelle continue (ex. `BIC/2026/000123`) | 🟠 Élevé | Exigence séquentialité non respectée |
| **N8** | **Champs émetteur hardcodés** dans `src/lib/pdf.ts` (RCCM, NIF, etc.) au lieu d'une table `company_legal_info` configurable et auditée | 🟡 Moyen | Maintenance + conformité multi-entité |
| **N9** | **Pas d'archivage immuable** : aucun trigger empêchant l'`UPDATE` d'une facture `paid` (modification possible post-émission) | 🟠 Élevé | Violation principe d'immuabilité |
| **N10** | **Mode de paiement & date de règlement** mentionnés mais pas formellement structurés (DGI demande date facturation + date paiement distinctes) | 🟡 Moyen | Champ `paid_at` absent du schéma |
| **N11** | **Aucune gestion d'avoir / facture rectificative** (table `credit_notes`, lien `original_invoice_id`) | 🟡 Moyen | Annulation = suppression silencieuse, non conforme |
| **N12** | **Régime fiscal de l'émetteur** (réel / forfaitaire / IPR) non mentionné sur le PDF | 🟡 Moyen | Mention obligatoire DGI |

---

### Plan de mise en conformité (priorisé)

#### 🔴 Phase 1 — Conformité minimale DGI (bloquant)

**P1.1 — Identification fiscale du client**
- Migration BD : ajout colonnes sur `cadastral_invoices` (et `expertise_payments`, `permit_payments`, `orders`) :
  - `client_nif text`, `client_rccm text`, `client_id_nat text`, `client_address text`, `client_tax_regime text`
- Ajout des champs dans tous les dialogs de paiement (`CadastralPaymentDialog`, mutation, expertise, autorisation, publication) avec :
  - Toggle « Particulier / Entreprise »
  - Si entreprise → NIF/RCCM **obligatoires** avec validation (`validateNIF` déjà existant)
  - Si particulier → ID national ou pièce d'identité

**P1.2 — Mentions légales DGI sur PDF**
- Renommer titre : `JUSTIFICATIF DE PAIEMENT` → **`FACTURE NORMALISÉE`**
- Ajouter bloc « Émetteur » avec : Dénomination, RCCM, ID-NAT, NIF, Régime fiscal, Adresse complète
- Ajouter bloc « Client » miroir
- Décomposition fiscale obligatoire :
  ```
  Sous-total HT      : X,XX USD / Y,YY CDF
  Remise commerciale : -...
  Base imposable     : ...
  TVA 16%            : ...
  Total TTC          : ...
  ```
- Mention pied de page : « Facture normalisée — Direction Générale des Impôts (DGI) — Code de vérification : XXXX »

**P1.3 — Affichage bilingue USD/CDF**
- Utiliser `currency_config` + `exchange_rate_used` déjà en BD
- Afficher chaque montant en USD **et** CDF (équivalence au taux du jour de facturation, fixée à l'émission)

**P1.4 — Numérotation séquentielle continue**
- Création séquence Postgres : `bic_invoice_seq` (annuelle, non réinitialisable)
- RPC `generate_normalized_invoice_number(year)` retournant `BIC/2026/000001`
- Refactor `create_cadastral_invoice_secure` + générateurs autres services pour utiliser la RPC unique

#### 🟠 Phase 2 — Intégrité & immuabilité

**P2.1 — Verrou post-émission**
- Trigger `BEFORE UPDATE` sur `cadastral_invoices` : si `OLD.status = 'paid'` → bloquer toute modification sauf champs whitelist (`updated_at`, audit fields)
- Idem sur tables sœurs (orders, expertise_payments, permit_payments)

**P2.2 — Signature électronique**
- Edge function `sign-invoice` : SHA-256(invoice payload) + signature HMAC avec secret serveur
- Stockage `invoice_signature text`, `signature_algorithm text`, `signed_at timestamptz`
- Affichage hash tronqué + QR sur PDF

**P2.3 — Avoirs / factures rectificatives**
- Table `cadastral_credit_notes` : `id`, `original_invoice_id` (FK), `reason`, `amount_usd`, `created_by`
- Remplacer toute logique « cancel » par création d'avoir lié

**P2.4 — Date de paiement**
- Ajout colonne `paid_at timestamptz` (déjà partiellement reflété par `payment_transactions`)
- Renseigné par trigger lors de passage `pending` → `paid`

#### 🟡 Phase 3 — Configuration & gouvernance

**P3.1 — Table émetteur configurable**
- `company_legal_info` : 1 ligne par entité émettrice, audit log, lecture par `src/lib/pdf.ts` au lieu de constante hardcodée
- Onglet admin « Identité légale émetteur » dans `AdminBillingConfig`

**P3.2 — Préparation FNI/DGI**
- Champ `dgi_validation_code text nullable` sur factures
- Edge function stub `submit-to-dgi` (placeholder API DGI quand disponible)
- Rapport admin « Factures non transmises DGI »

**P3.3 — Archivage 10 ans**
- Politique RLS : empêcher `DELETE` sur factures > 0j post-émission (déjà partiel)
- Job cron : snapshot mensuel JSON archivable

---

### Détails techniques

**Migrations BD nécessaires** :
1. Colonnes client fiscales sur 4 tables de facturation
2. Séquence + RPC `generate_normalized_invoice_number`
3. Trigger immuabilité post-paid
4. Tables `company_legal_info`, `cadastral_credit_notes`
5. Colonnes `invoice_signature`, `paid_at`, `dgi_validation_code`

**Fichiers à modifier** :
- `src/lib/pdf.ts` — refonte complète bloc émetteur/client + mentions DGI + bilingue
- `src/components/cadastral/CadastralPaymentDialog.tsx` (+ équivalents expertise/mutation/permit/publication) — capture identité fiscale client
- `src/components/admin/billing/CompanyLegalInfoTab.tsx` (nouveau)
- `src/components/admin/billing/CreditNotesTab.tsx` (nouveau)

**Edge functions** :
- `sign-invoice` (signature HMAC)
- `submit-to-dgi` (stub interopérabilité future)

**Hors périmètre immédiat** :
- Intégration réelle API FNI DGI (nécessite agrément officiel + certificat fiscal)
- Module e-tax recouvrement

### Recommandation

L'application présente la **structure technique** (TVA, CDF, QR, audit) mais **manque les éléments réglementaires** clés : NIF client, mention « facture normalisée », bilingue USD/CDF, immuabilité, séquence officielle. La **Phase 1 (P1.1 → P1.4)** est indispensable avant toute commercialisation B2B en RDC.

Veux-tu que je démarre par la **Phase 1 complète** (4 chantiers, ~1 migration + refonte PDF + capture identité client sur tous les dialogs de paiement) ?

