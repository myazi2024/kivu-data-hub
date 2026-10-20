# Propriétaire ou contributeur : déclaration dans le CCC et revendication de propriété

## Analyse et optimisations proposées
Votre demande est solide. Ajustements proposés pour éviter les failles et simplifier :

1. **Déclaration = présomption, pas un droit acquis.** Cocher « Oui, je suis propriétaire » ne rend pas la parcelle « vôtre » tout de suite : elle le devient seulement quand l'administrateur approuve la contribution après avoir vu les justificatifs d'exploitation. Sans cela, n'importe qui pourrait se déclarer propriétaire.
2. **Justificatifs d'exploitation : au moins 1 obligatoire, 4 types proposés** (facture d'eau, facture d'électricité, note de perception, certificat de paiement), datés de moins de 6 mois, 10 Mo max chacun, PDF/images. Exiger les 4 bloquerait trop de vrais propriétaires (beaucoup n'ont pas d'eau courante). On recommande 2.
3. **Une seule parcelle = un seul propriétaire de compte.** Si une parcelle a déjà un propriétaire validé, un nouveau « Oui » dans le CCC est refusé et l'utilisateur est orienté vers la revendication.
4. **Message « non exploitant »** : ton bienveillant, explique la règle, propose deux choix : « Revenir à la carte cadastrale » et « Soumettre plutôt comme contributeur » (évite de perdre une donnée utile).
5. **Revendication : un seul formulaire qui s'adapte** au numéro choisi, au lieu de deux écrans séparés. La liste ne propose que les parcelles enregistrées et non déjà à vous ; recherche par numéro (pas une liste de milliers de lignes).
6. **Revendication d'une parcelle déjà « propriétaire » = contestation** : le propriétaire actuel est prévenu (sans voir vos documents), peut répondre ; la décision finale revient à l'administrateur. Si approuvée, la gestion est transférée et l'ancien propriétaire en est informé.
7. **Une seule revendication en cours par parcelle et par utilisateur**, annulable tant qu'elle n'est pas traitée. Refus toujours motivé et notifié.
8. **Contributions existantes** : toutes restent « contribution » par défaut (aucune n'avait de déclaration).

## Parcours dans le formulaire CCC
```text
Introduction -> "Êtes-vous propriétaire de cette parcelle ?"
   Non -> formulaire CCC (contribution)
   Oui -> "L'exploitez-vous actuellement ?"
           Oui -> dépôt des justificatifs (>=1) -> formulaire CCC (propriétaire déclaré)
           Non -> message bienveillant + [Revenir à la carte] [Soumettre comme contributeur]
```
La réponse est rappelée dans le récapitulatif et modifiable avant envoi.

## Espace utilisateur
- **Mes parcelles** (nouveau) : parcelles dont vous êtes propriétaire validé ; accès à « Demander une modification ».
- **Mes contributions** : badge « Contribution » ou « Propriétaire déclaré (en vérification) » ; pas de demande de modification pour les simples contributions (message : passer par la carte cadastrale).
- **Revendiquer une parcelle** (nouveau) :
  - Parcelle issue d'une contribution : pièce d'identité + bouton « Migrer la gestion de cette parcelle sur mon compte ».
  - Parcelle déjà déclarée par un propriétaire : questionnaire — pièce d'identité, preuve de droits (titre, contrat, décision de justice, autre), preuve d'exploitation (au moins une), courte explication.
  - Suivi : statut, motif de refus, annulation.
- **Admin** : nouvelle file « Revendications de propriété » (documents, approuver / refuser avec motif) ; la vérification CCC affiche la déclaration et les justificatifs.

## Détails techniques
- Migration :
  - `cadastral_contributions` : `submitter_role` ('contributor' | 'owner', défaut contributor), `owner_exploitation_proofs jsonb`.
  - `cadastral_parcels` : `owner_user_id uuid` (propriétaire de compte validé), index unique partiel.
  - Trigger d'insertion : refuse 'owner' sans au moins une preuve ou si la parcelle a déjà un `owner_user_id`.
  - `approve_ccc_contribution` : renseigne `owner_user_id` si `submitter_role='owner'`.
  - Table `parcel_ownership_claims` (parcel_id, user_id, claim_type contribution|contest, identity_doc, rights_docs, exploitation_docs, statement, status, rejection_reason, reviewed_by…) + GRANT + RLS (auteur et admins).
  - RPC `submit_ownership_claim` (type déduit côté serveur, anti-doublon), `cancel_ownership_claim`, `process_ownership_claim_decision` (transfert + `_notify` demandeur et ancien propriétaire, une transaction), `search_claimable_parcels(term)`, `get_my_owned_parcels`.
  - Demandes de modification (`ccc_correction_requests`) : réservées au `owner_user_id` côté serveur.
  - Bucket privé `ownership-proofs` (dossiers par utilisateur, `crypto.randomUUID()`), liens signés pour admin.
- Front : `CCCOwnershipGate.tsx` (étape entre `CCCIntroDialog` et le formulaire), champ dans l'état du formulaire et le récapitulatif ; `UserOwnedParcels.tsx`, `UserOwnershipClaims.tsx`, `AdminOwnershipClaims.tsx` ; badges dans `UserContributions.tsx`.
- Tests : règles « au moins une preuve », « non exploitant bloqué », « type de revendication selon la parcelle », « modification réservée au propriétaire ».
- Règle ajoutée dans `AGENTS.md` ; mémoire projet mise à jour.
