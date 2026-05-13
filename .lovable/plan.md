
# Audit CCC (formulaire → réception Admin → traitement)

> Note : tu n'as pas encore collé le message d'erreur exact. J'ai listé ci-dessous les causes les plus probables d'après l'audit du code et de la base. Une fois le texte du toast/console reçu, j'isole le coupable précis avant de toucher au reste.

## A. Bugs bloquants identifiés

### A1. Triplon sur l'approbation → unique_violation `cadastral_parcels.parcel_number`
À l'approbation d'une contribution, **trois écritures concurrentes** créent la même parcelle :
1. Trigger BEFORE UPDATE `trigger_create_parcel_on_approval` → `create_parcel_from_approved_contribution()` (INSERT parcel + histories)
2. Trigger AFTER UPDATE `sync_contribution_to_parcel_trigger` → `sync_approved_contribution_to_parcel()` (INSERT ou UPDATE parcel)
3. Code front `AdminCCCContributions.handleApprove` (lignes 312-360) → INSERT parcel manuel

Conséquence : l'INSERT côté front (#3) lève `duplicate key value violates unique constraint`, l'admin reçoit "Erreur lors de l'approbation".

**Fix** : Supprimer l'INSERT/UPDATE parcel côté front (laisser uniquement les triggers). Garder côté front la notification + audit log + invalidation queries.

### A2. Trigger `normalize_contribution_empty_strings` enregistré DEUX fois
Présent sous `normalize_contribution_empty_strings_trg` ET `trigger_normalize_contribution_empty_strings`. Idempotent mais double coût et risque sur futurs side-effects.
**Fix** : `DROP TRIGGER IF EXISTS normalize_contribution_empty_strings_trg`.

### A3. Fonction `normalize_contribution_empty_strings` contient du code mort dangereux
`NEW.title_issue_date::text = ''` est impossible (colonne déjà DATE) ; en revanche les colonnes texte sont OK. Pas de bug actif mais à nettoyer.

### A4. Triggers de création parcel se chevauchent
`create_parcel_from_approved_contribution` (BEFORE) crée la parcelle + histories,
`sync_approved_contribution_to_parcel` (AFTER) recrée une parcelle si `original_parcel_id` est NULL → déjà mis par BEFORE, donc seul l'UPDATE branch tourne.
Risque d'incohérence si `contribution_type` n'est pas dans `('new','nouveau')` (par défaut `'new'` mais champ jamais set par le hook front → cf. A6).
**Fix** : Consolider en **une seule** RPC `approve_ccc_contribution(contribution_id)` SECURITY DEFINER qui :
- met `status='approved' + reviewed_by/at + verified_by/at`
- crée/maj la parcelle (INSERT … ON CONFLICT DO UPDATE sur `parcel_number`)
- réplique les histories (ownership/boundary/tax/mortgage/permits)
- déclenche la génération de code CCC
Puis supprimer les 2 triggers `BEFORE/AFTER UPDATE` redondants.
Le front Admin appelle simplement `supabase.rpc('approve_ccc_contribution', {p_id})`.

### A5. `contribution_type` jamais défini par le hook de soumission
`useCadastralContribution.submitContribution` n'envoie pas `contribution_type`. Il prend le DEFAULT (`'new'`). OK pour création, mais pour les contributions de mise à jour de parcelle existante (édition), il faut explicitement transmettre `'update'` + `original_parcel_id`. Vérifier `useCadastralContribution.updateContribution`.
**Fix** : Toujours envoyer `contribution_type` (`new` ou `update`) et `original_parcel_id` quand applicable.

### A6. Cause probable de l'erreur côté SOUMISSION utilisateur
Hypothèses, par ordre de fréquence :
- **a)** `RPC detect_suspicious_contribution` renvoie `is_suspicious=true, fraud_score≥80` → toast "Contribution suspecte" (silent block).
- **b)** Conflit unique `cadastral_contributions_user_parcel_active` (déjà une `pending`/`returned` pour la même parcelle) → toast "Contribution déjà en cours".
- **c)** Une contrainte CHECK ou trigger sur un nouveau champ (`is_occupied`, `rental_start_date`) qui rejette les valeurs vides → mais les helpers `blank()/blankDate()` semblent OK.
- **d)** RLS : politique INSERT existe et passe (`auth.uid() = user_id`) — si l'utilisateur n'est pas authentifié réellement (session expirée) → toast "Authentification requise".

**Fix immédiat** : capturer `contributionError.message + .code + .details + .hint` dans le toast utilisateur (déjà partiel ; durcir + log dans `console.error` structuré + envoyer à un endpoint d'audit `client_errors`).

### A7. RLS Admin UPDATE : `WITH CHECK` manquant
La policy "Admins can update contributions" a `qual` mais `with_check IS NULL`. Postgres applique alors `qual` aussi pour `WITH CHECK`, donc fonctionnel ; mais à durcir explicitement.

## B. Manques fonctionnels côté Admin

- **Réception** : `AdminCCCContributions` ne propose pas d'export CSV des contributions filtrées.
- **Détails** : Aucune visualisation des `appeal_data` quand un demandeur fait appel d'un rejet.
- **Réception des nouveaux champs infrastructure** (canal/éclairage – cf. lotissement) — sans rapport CCC mais à mettre en cohérence si jamais réutilisés.
- **Bulk reject** ne déclenche pas la notification utilisateur (seul le single reject le fait).
- **Bulk approve** insère parcels ligne par ligne sans cohérence avec les triggers (cf. A1).
- **Statut `returned`** (renvoi pour correction) pas explicitement géré dans les compteurs `Stats`.
- **Audit log** : pas d'entrée lors d'un retour pour correction `returned` côté `logContributionAudit`.
- **`source_form_type`** colonne existe mais n'est jamais peuplée → impossible de tracer la provenance (CCC plein vs Quick).

## C. Optimisations / hardening

- **Helper unique `useApproveCCC`** (TanStack mutation) au lieu de 200 lignes inline dans `AdminCCCContributions.handleApprove`.
- **Idempotence approbation** : `ON CONFLICT (parcel_number) DO UPDATE` côté RPC.
- **Réduction des `as any`** : `useCadastralContribution.buildContributionPayload` retourne `any` ; typer via `Database['public']['Tables']['cadastral_contributions']['Insert']`.
- **Index** : ajouter `idx_cadastral_contributions_status_created` pour la pagination admin filtrée.
- **Trigger logging** : enrober `auto_generate_ccc_code` dans EXCEPTION→`RAISE LOG` + re-raise pour ne plus avaler les erreurs de génération de code.
- **Edge function `approve-ccc-contribution`** plutôt qu'une simple RPC : permet d'envoyer le mail/notification ET de logguer dans `admin_action` côté serveur.
- **Cleanup `localStorage`** : la clé `cadastral_contribution_${parcel}` est nettoyée mais pas l'image base64 brouillon liée.

## D. Plan d'exécution (séquentiel)

1. **Capturer l'erreur exacte** : durcir le toast (`code+message+details+hint`) + console.error structuré dans `useCadastralContribution.submitContribution`. (front)
2. **Migration SQL #1 — nettoyage triggers** :
   - `DROP TRIGGER normalize_contribution_empty_strings_trg`
   - `DROP TRIGGER trigger_create_parcel_on_approval` 
   - `DROP TRIGGER sync_contribution_to_parcel_trigger`
   - Création RPC unique `public.approve_ccc_contribution(p_id uuid)` SECURITY DEFINER avec UPSERT parcel + replay histories + appel `generate_cadastral_contributor_code`.
   - Création RPC `public.reject_ccc_contribution(p_id uuid, p_reason text)` SECURITY DEFINER.
   - Renforcer policy admin UPDATE : ajouter `WITH CHECK` explicite.
3. **Refactor `AdminCCCContributions`** :
   - Remplacer `handleApprove`, `handleReject`, `handleBulkApprove`, `handleBulkReject` par appels RPC.
   - Extraire un hook `useCCCAdminActions` (mutations + invalidations).
   - Ajouter export CSV + visualisation `appeal_data` + statut `returned` dans Stats.
4. **Hook front `useCadastralContribution`** :
   - Toujours peupler `contribution_type` + `original_parcel_id`.
   - Peupler `source_form_type = 'ccc_full' | 'quick'`.
   - Typer `buildContributionPayload` via `Database` types.
5. **Index + observabilité** : `idx_cadastral_contributions_status_created`, log structuré dans `auto_generate_ccc_code`.
6. **Mémoires** : MAJ `mem://admin/ccc-contributions-admin-audit-fr` avec le nouveau pattern RPC + suppression des INSERT parcel front.

## E. Détails techniques

```text
Triggers actuels (cadastral_contributions)              | Action après migration
--------------------------------------------------------|----------------------------
format_contribution_parcel_number_trigger    BEFORE INS | KEEP
trg_prevent_test_data_in_prod                BEFORE INS | KEEP
normalize_contribution_empty_strings_trg     BEFORE I/U | DROP (doublon)
trigger_normalize_contribution_empty_strings BEFORE I/U | KEEP
trigger_sync_owner_name                      BEFORE I/U | KEEP
enforce_rejection_reason_trigger             BEFORE I/U | KEEP
trg_enforce_mortgage_rejection_motive        BEFORE UPD | KEEP
trigger_create_parcel_on_approval            BEFORE UPD | DROP (déplacé en RPC)
sync_contribution_to_parcel_trigger          AFTER  UPD | DROP (déplacé en RPC)
trigger_auto_generate_ccc_code               AFTER  UPD | KEEP (idempotent)
update_cadastral_contributions_updated_at    BEFORE UPD | KEEP
```

Aucune modification destructive de données : seule la logique d'approbation est consolidée.
