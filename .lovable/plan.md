# Revue du service « Expertise immobilière » (menu Actions, carte cadastrale)

## Constats vérifiés

### Critiques (paiement)
1. **Montant du paiement choisi par le navigateur.** La ligne de paiement d'expertise est créée par le navigateur avec le montant qu'il indique. Le serveur vérifie ensuite que le montant payé correspond à cette ligne… donc à ce que le navigateur a écrit. Un utilisateur peut payer 0,01 $ et voir sa demande passer « payée ». Le montant calculé par le serveur sur la demande n'est jamais imposé à la ligne de paiement.
2. **Prix d'accès au certificat calculé dans le navigateur.** Aucun frais « accès au certificat » n'est configuré : le navigateur prend 20 % du total des frais (28 $ aujourd'hui) ou 5 $ par défaut.
3. **Achat de l'accès au certificat inopérant.** Un autre utilisateur ne voit jamais le certificat existant d'une parcelle (règles d'accès : seul le demandeur ou un expert/admin), et même après paiement il ne pourrait pas l'ouvrir (la fonction d'ouverture refuse tout non-demandeur).

### Logique et code mort
4. **Fausse confirmation côté navigateur.** Après un paiement Mobile Money, le navigateur tente encore de marquer le paiement « réussi » lui-même (avec un identifiant `TXN-` horodaté). Le serveur le bloque déjà : appel inutile, erreur ignorée en silence.
5. **Frais lus deux fois.** Le formulaire charge toute la grille des frais en plus du devis serveur ; cette grille ne sert plus qu'au calcul local du prix d'accès (point 2) et à un repli d'affichage.
6. **Fonction serveur orpheline** `verify_expertise_certificate` : appelée nulle part, inaccessible aux utilisateurs.
7. **Règle d'accès admin obsolète** sur la grille des frais : elle lit le rôle dans le profil au lieu de la table des rôles (seul un ancien rôle « admin » de profil peut modifier les frais ; le super admin est ignoré).
8. **Formulaire trop long** : 2 230 lignes, au-delà de la règle de découpage du projet (1 000 lignes).

Déjà conformes (revue précédente vérifiée) : détection « Terrain nu », protection du statut de paiement de la demande, montant de la demande calculé par le serveur, certificat dans un espace privé avec lien signé.

## Corrections prévues

### Serveur
- Les lignes de paiement d'expertise ne sont plus créées par le navigateur : une fonction serveur crée la ligne avec le montant **lu sur la demande** (frais d'expertise) ou **lu dans la grille** (accès au certificat), après contrôle du propriétaire de la demande / de l'existence d'un certificat valide. Suppression de la permission de création directe.
- Nouveau frais « Accès au certificat d'expertise » administrable dans la grille des frais, exclu du devis de demande. Valeur initiale : **28 $** (le prix effectivement appliqué aujourd'hui) — à confirmer ou modifier depuis l'admin.
- Nouvelle fonction publique « certificat valide pour cette parcelle » : indique seulement l'existence, la référence, les dates de validité et le prix d'accès (pas de valeur vénale avant paiement).
- L'ouverture du certificat est autorisée au demandeur, aux experts/admins **et** à tout utilisateur ayant un paiement « accès au certificat » réussi pour ce certificat. La valeur vénale n'est montrée qu'à ces mêmes personnes.
- Suppression de `verify_expertise_certificate`.
- Règle d'accès admin de la grille des frais alignée sur la table des rôles (admin / super_admin).

### Navigateur
- Paiement d'expertise et paiement d'accès : appel à la nouvelle fonction serveur, puis paiement ; plus aucun montant envoyé depuis le navigateur.
- Écran « certificat existant » alimenté par la nouvelle fonction publique ; bouton d'achat avec le prix serveur ; ouverture du certificat après paiement.
- Retrait de la fausse confirmation Mobile Money, du chargement en double de la grille et du calcul local du prix d'accès.
- Admin : le frais d'accès au certificat apparaît dans une section distincte de la configuration des frais d'expertise.
- Découpage du formulaire : extraction du parcours « certificat existant / achat d'accès » et du parcours de paiement dans des fichiers dédiés, sans changement visible.

### Vérification
- Contrôle du code et tests automatisés ; tests ajoutés pour le montant imposé par le serveur et l'autorisation d'ouverture du certificat (requêtes SQL simulant un utilisateur).
- Compte rendu ajouté au rapport d'audit, règle d'architecture ajoutée à `AGENTS.md`.

## Détails techniques
- Migration :
  - `expertise_fees_config.fee_kind text not null default 'request' check in ('request','certificate_access')` ; `calculate_expertise_fees` filtre `fee_kind = 'request'` ; insertion du frais d'accès (28 $).
  - `create_expertise_payment(p_request_id uuid, p_kind text, p_method text, p_provider text, p_phone text) returns uuid` SECURITY DEFINER, `SET search_path = public` : `expertise_fee` → demande de l'appelant, `payment_status='pending'`, montant/`fee_items` = `total_amount_usd`/`computed_fee_items` ; `certificate_access` → demande `completed`, certificat non expiré, appelant ≠ demandeur, pas d'accès déjà payé, montant = frais `certificate_access` actif. Réutilise une ligne `pending` existante si identique.
  - `DROP POLICY "Users can create their own expertise payments"` ; `REVOKE INSERT` client.
  - `get_parcel_valid_expertise_certificate(p_parcel_number text)` (authenticated) → `id, reference_number, certificate_issue_date, certificate_expiry_date, access_fee_usd, has_access, market_value_usd` (valeur seulement si `has_access`).
  - `get_signed_expertise_certificate` : autorise aussi `EXISTS(expertise_payments where expertise_request_id = p_request_id and user_id = auth.uid() and status='completed')` pour un non-demandeur (statut de la demande `completed`).
  - `DROP FUNCTION verify_expertise_certificate(text)` ; policy admin `expertise_fees_config` → `has_role(admin) OR has_role(super_admin)`.
- `src/utils/expertisePaymentHelper.ts` : suppression de l'`update` client ; nouveau `createExpertisePayment()` via RPC.
- `RealEstateExpertiseRequestDialog.tsx` : retrait `fees`/`certificateAccessFee`/`checkExistingValidCertificate` local ; extraction `real-estate-expertise/ExistingCertificateBlock.tsx` + hook `useExpertiseCertificateAccess.ts`, et `useExpertisePaymentFlow.ts`.
- `useRealEstateExpertise.tsx` : `checkExistingValidCertificate` remplacé par la RPC.
- `AdminExpertiseFeesConfig.tsx` : section « Accès au certificat » (`fee_kind`).
- Edge functions `process-mobile-money-payment` / `create-payment` / `stripe-webhook` inchangées (elles lisent déjà le montant de la ligne serveur).
