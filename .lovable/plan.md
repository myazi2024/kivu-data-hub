

# Audit du service de demande de mutation — Divergences et optimisations

## Problemes identifies

### 1. DONNEES CRITIQUES STOCKEES EN JSON DANS `proposed_changes` (majeur)

Le formulaire collecte des donnees financieres et documentaires importantes mais les stocke dans le champ JSON `proposed_changes` au lieu des colonnes DB dediees qui existent deja :

- `supporting_documents` — la colonne DB existe (`Json | null`) mais le formulaire ecrit les URLs dans `proposed_changes.supporting_documents` (L520-523). La colonne DB reste toujours `null`.
- `expertise_certificate_url` — stocke dans `proposed_changes` (L524) alors que la table n'a pas de colonne dediee mais a `beneficiary_id_document_url` et `requester_id_document_url` (inutilises).
- `market_value_usd`, `title_age`, `mutation_fees`, `late_fees` — tous dans `proposed_changes`.

**Consequence** : Les colonnes DB `supporting_documents`, `beneficiary_id_document_url`, `requester_id_document_url` sont des colonnes fantomes jamais peuplees. Les donnees financieres ne sont pas exploitables en SQL pour les analytics.

**Correction** : Migration DB pour ajouter les colonnes manquantes (`market_value_usd`, `expertise_certificate_url`, `expertise_certificate_date`, `title_age`, `mutation_fee_amount`, `bank_fee_amount`, `late_fee_amount`, `late_fee_days`). Ecrire `supporting_documents` dans la colonne existante au lieu du JSON. Mettre a jour le hook et l'admin pour lire depuis les colonnes.

### 2. TYPE `MutationRequest` DESALIGNE DU SCHEMA DB

Le type TypeScript dans `src/types/mutation.ts` ne reflete pas le schema reel :
- **Manquants** : `reviewed_at`, `reviewed_by`, `paid_at`, `payment_id`, `supporting_documents`, `beneficiary_id_document_url`, `requester_id_document_url`
- **Presents mais pas en DB** : le type a `profiles?` pour le join admin, mais ce n'est pas un champ DB.

Le code admin (L83) fait un cast `as unknown as MutationRequest[]` pour contourner le probleme.

**Correction** : Aligner le type `MutationRequest` sur le schema DB complet, et ajouter le type join separement.

### 3. REDONDANCE CCC : PROPRIETAIRE ACTUEL NON PRE-REMPLI

Le formulaire de mutation ne pre-remplit pas le nom du proprietaire actuel (`current_owner_name`) depuis les donnees CCC/parcelle, alors que cette information est disponible dans `parcelData`. L'utilisateur doit confirmer qu'il est le proprietaire mais le formulaire n'affiche meme pas le nom du proprietaire actuel pour verification.

**Correction** : Afficher le nom du proprietaire actuel (si disponible) dans la section info parcelle et dans le recapitulatif.

### 4. REDONDANCE CCC : `is_title_in_current_owner_name` NON EXPLOITE

Le formulaire CCC collecte `is_title_in_current_owner_name` (le titre est-il au nom du proprietaire actuel ?). Cette information est critique pour une mutation mais n'est pas utilisee dans le dialogue de mutation — ni pour avertir l'utilisateur, ni pour la validation.

**Correction** : Si `is_title_in_current_owner_name === false`, afficher un avertissement que le titre n'est pas au nom du proprietaire actuel (situation qui complique une mutation).

### 5. PAS D'ACTION "RENVOYER POUR CORRECTION" DANS L'ADMIN

Le dialogue de traitement admin n'offre que 3 actions : Approuver, Rejeter, Mettre en attente. Il manque l'action "Renvoyer pour correction" (`returned`) qui permettrait au demandeur de corriger sa demande sans la rejeter definitivement.

La memoire projet mentionne cette fonctionnalite comme exist

<lov-plan>

# Audit du service de demande de mutation — Divergences et optimisations

## Problemes identifies

### 1. DONNEES CRITIQUES STOCKEES EN JSON DANS `proposed_changes` (majeur)

Le formulaire collecte des donnees financieres et documentaires importantes mais les stocke dans le champ JSON `proposed_changes` au lieu des colonnes DB dediees :

- `supporting_documents` — la colonne DB existe (`Json | null`) mais le formulaire ecrit les URLs dans `proposed_changes.supporting_documents` (L520-523). La colonne DB reste toujours `null`.
- `expertise_certificate_url`, `expertise_certificate_date`, `market_value_usd`, `title_age`, `mutation_fees`, `late_fees` — tous dans `proposed_changes`.
- `beneficiary_id_document_url` et `requester_id_document_url` — colonnes DB existantes, jamais peuplees.

**Consequence** : Donnees financieres non exploitables en SQL pour les analytics. Colonnes fantomes en DB.

**Correction** : Migration DB ajoutant `market_value_usd`, `expertise_certificate_url`, `expertise_certificate_date`, `title_age`, `mutation_fee_amount`, `bank_fee_amount`, `late_fee_amount`, `late_fee_days`. Ecrire `supporting_documents` dans la colonne existante. Mettre a jour le hook `createMutationRequest` pour stocker en colonnes.

### 2. TYPE `MutationRequest` DESALIGNE DU SCHEMA DB

Le type TypeScript dans `src/types/mutation.ts` ne contient pas : `reviewed_at`, `reviewed_by`, `paid_at`, `payment_id`, `supporting_documents`, `beneficiary_id_document_url`, `requester_id_document_url`. Le code admin fait un cast `as unknown as MutationRequest[]` pour contourner.

**Correction** : Aligner le type sur le schema DB complet.

### 3. REDONDANCE CCC : PROPRIETAIRE ACTUEL NON AFFICHE

Le nom du proprietaire actuel (`current_owner_name`) est disponible dans `parcelData` mais n'est pas affiche dans le formulaire de mutation ni dans le recapitulatif. L'utilisateur ne peut pas verifier visuellement que la parcelle affiche le bon proprietaire.

**Correction** : Afficher `current_owner_name` dans la Card info parcelle et dans le preview.

### 4. `is_title_in_current_owner_name` NON EXPLOITE

Le CCC collecte ce champ (le titre est-il au nom du proprietaire actuel ?). Cette info est critique pour une mutation mais n'est ni affichee ni utilisee pour la validation.

**Correction** : Si `false`, afficher un avertissement dans le formulaire indiquant que le titre n'est pas au nom du proprietaire actuel.

### 5. PAS D'ACTION "RENVOYER POUR CORRECTION" DANS L'ADMIN

Le dialogue de traitement admin n'offre que 3 actions : Approuver, Rejeter, Mettre en attente. Il manque "Renvoyer pour correction" (`returned`) qui permettrait au demandeur de modifier sa demande sans rejet definitif. La memoire projet mentionne cette fonctionnalite comme existante, mais le code ne l'implemente pas.

**Correction** : Ajouter l'option `returned` dans le Select du process dialog et envoyer une notification adequate.

### 6. AUCUNE DONNEE FICTIVE DETECTEE

Les frais sont charges depuis `mutation_fees_config` (DB). Les graphiques analytics (`MutationBlock.tsx`) sont construits sur des donnees Supabase reelles. Pas de donnees simulees.

### 7. ANALYTICS MUTATIONS SOUS-EXPLOITEES

`MutationBlock.tsx` n'a aucun graphique pour :
- Repartition par valeur venale (tranches de prix)
- Frais de retard (nombre de demandes avec retard vs sans retard)
- Anciennete du titre (< 10 ans vs >= 10 ans)

Ces donnees sont dans `proposed_changes` JSON, donc inexploitables. Une fois les colonnes DB ajoutees (point 1), ces graphiques deviennent possibles.

**Correction** : Apres la migration, ajouter 2-3 graphiques dans `MutationBlock.tsx` et les enregistrer dans `ANALYTICS_TABS_REGISTRY['mutations']`.

### 8. FICHIER MONOLITHIQUE (1411 LIGNES)

`MutationRequestDialog.tsx` melange ~30 variables d'etat, logique metier, 4 vues (form, preview, payment, confirmation). Contrairement a l'expertise et au CCC (deja modularises), ce dialogue n'a pas ete decoupe.

**Correction** : Reporter pour un audit ulterieur de modularisation. Priorite basse par rapport aux corrections de donnees.

---

## Plan d'implementation

### Etape 1 — Migration DB
Ajouter 8 colonnes a `mutation_requests` : `market_value_usd` (numeric), `expertise_certificate_url` (text), `expertise_certificate_date` (date), `title_age` (text), `mutation_fee_amount` (numeric), `bank_fee_amount` (numeric), `late_fee_amount` (numeric), `late_fee_days` (integer).

### Etape 2 — Aligner le type TypeScript
Mettre a jour `MutationRequest` dans `src/types/mutation.ts` avec tous les champs DB.

### Etape 3 — Stocker en colonnes au lieu du JSON
Modifier `createMutationRequest` dans le hook pour ecrire les nouvelles colonnes + `supporting_documents`. Conserver `proposed_changes` comme backup/description.

### Etape 4 — Exploiter les donnees CCC
Afficher `current_owner_name` et avertissement `is_title_in_current_owner_name` dans le formulaire.

### Etape 5 — Action "Renvoyer pour correction" admin
Ajouter l'option `returned` dans `AdminMutationRequests.tsx`.

### Etape 6 — Enrichir les analytics
Ajouter graphiques valeur venale, retard, anciennete titre dans `MutationBlock.tsx` + registre config.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | Nouvelle migration |
| `src/types/mutation.ts` | Aligner sur schema DB |
| `src/hooks/useMutationRequest.tsx` | Stocker en colonnes |
| `src/components/cadastral/MutationRequestDialog.tsx` | Afficher CCC, avertissement titre |
| `src/components/admin/AdminMutationRequests.tsx` | Action "returned", lire colonnes |
| `src/components/visualizations/blocks/MutationBlock.tsx` | Nouveaux graphiques |
| `src/hooks/useAnalyticsChartsConfig.ts` | Registre mutations enrichi |

7 fichiers modifies + 1 migration.

