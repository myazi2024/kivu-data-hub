# Revue de l'espace utilisateur : anomalies vérifiées et corrections

## Constats vérifiés

1. **« Modifier mes données » ne fonctionne pas du tout.** L'écran des contributions propose de demander la correction d'une donnée, mais la table et la fonction serveur correspondantes n'existent pas dans la base (vérifié par interrogation directe). Toute demande envoyée échoue, et côté administration aucune décision ne peut être appliquée.

2. **Autorisations de bâtir : deux actions font semblant de fonctionner.** Dans la fiche d'une autorisation, l'envoi de documents et la messagerie affichent « envoyé avec succès » alors que rien n'est enregistré : les fichiers et les messages disparaissent au rechargement. La messagerie affiche en plus un faux message du « Service Urbanisme » écrit en dur.

3. **Compteurs de contributions faux au-delà de 25 lignes.** Les cases « En attente / Validées / Rejetées » ne comptent que la page affichée, alors que le total est calculé sur l'ensemble. Les chiffres se contredisent dès qu'il y a plusieurs pages.

4. **Échecs de chargement invisibles.** Si les notifications ou les chiffres du tableau de bord ne se chargent pas, l'écran affiche « aucune notification » et des zéros, sans signaler la panne.

5. **Écran orphelin.** L'écran des codes CCC utilisateur n'est relié à aucune rubrique : il n'est jamais affiché.

## Corrections prévues

### 1. Rendre opérationnelles les demandes de modification
Création en base de la table des demandes avec droits d'accès explicites et règles de sécurité (chacun voit et crée ses propres demandes, les annule tant qu'elles sont en attente ; l'administration voit tout), une seule demande en attente par contribution, plus la fonction serveur qui applique ou rejette la demande de façon atomique en écrivant la trace d'audit. Aucun changement d'écran : l'interface existante sera simplement fonctionnelle.

### 2. Autorisations de bâtir : plus de fausses réussites
Le dépôt de documents enregistre réellement les fichiers dans l'espace de stockage privé de la demande et les rattache à celle-ci ; en cas d'échec, un message d'erreur clair remplace le message de succès. La messagerie, qui n'a aucun support serveur et n'est pas prévue au périmètre, est retirée de la fiche avec son faux message d'accueil, plutôt que de laisser croire à l'utilisateur qu'il dialogue avec un agent.

### 3. Compteurs cohérents
Les compteurs par statut sont calculés sur l'ensemble des contributions de l'utilisateur, comme le total, et non sur la page affichée.

### 4. Pannes de chargement visibles
Les notifications et les chiffres du tableau de bord distinguent « rien à afficher » de « chargement impossible », avec un message discret et la possibilité de réessayer.

### 5. Écran des codes CCC
L'écran est rattaché à la rubrique des factures et codes, où il a sa place, plutôt que de rester inaccessible.

### Hors périmètre, signalé
Les paiements (expertise, autorisation, transactions) sont aujourd'hui créés depuis le navigateur, ce qui permet en théorie à un utilisateur d'inscrire lui-même un paiement. Le corriger suppose de refondre le circuit de paiement côté serveur : c'est un chantier distinct, à traiter séparément.

## Notes techniques

- Migration : `ccc_correction_requests` (`contribution_id`, `parcel_number`, `user_id`, `changes` jsonb, `reason`, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`), `GRANT` explicites `authenticated`/`service_role`, RLS par `auth.uid()` + `has_role`, index unique partiel `ccc_correction_requests_one_pending` sur `contribution_id where status='pending'` (nom déjà attendu par `FieldCorrectionDialog/index.tsx:146`).
- RPC `apply_ccc_correction_request(p_request_id, p_decision, p_rejection_reason)` en `SECURITY DEFINER`, `SET search_path = public`, réservée aux administrateurs, liste blanche de colonnes appliquées à `cadastral_contributions` puis `cadastral_parcels`, écriture de l'audit et du statut dans la même transaction, motif obligatoire au rejet.
- `DocumentUploadSection.tsx` : upload réel via Supabase Storage, chemins en `crypto.randomUUID()`, suppression du `TODO` et du succès simulé ; `PermitMessaging.tsx` supprimé et son montage retiré de `PermitCard.tsx:320`.
- `UserContributions.tsx:103-112` : compteurs alimentés par des agrégats serveur (count par statut) exposés par `useUserContributions`, au lieu du filtrage sur `contributions`.
- `useNotifications.tsx` : exposer `error`, toasts cohérents sur les 4 opérations ; `useUserDashboardStats.tsx` : propager `isError` et l'afficher dans `UserOverview.tsx`.
- `UserCCCCodes.tsx` : monté dans `CadastralDashboardTabs`.
- Validation : `npx tsgo --noEmit -p tsconfig.app.json` puis `npx vitest run` (166 tests actuels), plus tests ajoutés sur le calcul des compteurs.
