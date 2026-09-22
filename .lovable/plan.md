# Modifier une donnée CCC directement depuis l'espace utilisateur

## Constat vérifié

- Pour corriger une seule donnée (ex. « Matériaux de construction »), l'utilisateur doit rouvrir tout le formulaire CCC : `UserContributions.tsx` n'ouvre que `CadastralContributionDialog`, et uniquement pour les statuts `pending`/`returned`.
- Le bouton « Demander une correction » existant (`CorrectionRequestDialog.tsx`) est un formulaire libre : l'utilisateur tape le nom du champ et la valeur souhaitée en texte. Rien n'est structuré, rien n'est appliqué.
- Côté administration, `CCCDetailsDialog.tsx` n'affiche `changed_fields` que s'il s'agit d'un tableau de noms. Les demandes créées par le dialogue actuel (objet JSON) ne s'affichent donc pas : la demande part dans le vide.

## Ce qui sera construit

### 1. Catalogue des données modifiables

Un catalogue unique décrit chaque donnée du formulaire CCC : libellé, onglet d'origine (Général, Localisation, Construction, Location, Valeur marchande, Obligations), type de saisie (texte, nombre, date, oui/non, liste de choix) et dépendances de liste (type → nature → matériaux → standing → usage). Les listes de choix proviennent des mêmes réglages que le formulaire, donc aucune valeur figée en double.

### 2. Nouveau dialogue « Modifier mes données »

Sur une contribution approuvée, un bouton ouvre un dialogue en trois temps :

```text
1. Choisir les données     -> recherche + regroupement par onglet, cases à cocher
2. Saisir les valeurs      -> même contrôle que dans le formulaire (liste, nombre, date…)
                              valeur actuelle affichée à côté de la nouvelle
3. Motiver et envoyer      -> motif obligatoire, récapitulatif avant / après
```

Plusieurs données peuvent être corrigées en une seule demande. Les dépendances sont respectées : changer le type de construction propose les natures correspondantes et signale les données devenues incohérentes, qui sont alors ajoutées automatiquement à la demande.

### 3. Suivi de la demande

- Liste « Mes demandes de modification » dans l'espace utilisateur : données concernées, valeurs demandées, statut (en attente, approuvée, rejetée), motif de rejet, date.
- Annulation possible tant que la demande est en attente.
- Une seule demande en attente par contribution, pour éviter les corrections contradictoires.

### 4. Traitement côté administration

- Un onglet dédié liste les demandes en attente avec un tableau avant / après par donnée.
- À l'approbation, les nouvelles valeurs sont écrites automatiquement sur la contribution et sur la fiche de parcelle correspondante, dans une seule opération serveur, avec trace dans l'historique d'audit.
- Au rejet, motif obligatoire, notification à l'utilisateur.
- L'affichage des demandes de mise à jour dans la fiche de contribution est corrigé pour gérer aussi bien un tableau de noms qu'un détail avant / après.

## Notes techniques

- Nouvelle table `ccc_correction_requests` : `contribution_id`, `parcel_number`, `user_id`, `changes` (jsonb `[{field, label, old_value, new_value}]`), `reason`, `status` (`pending`/`approved`/`rejected`/`cancelled`), `reviewed_by`, `reviewed_at`, `rejection_reason`. GRANT explicites (`authenticated`, `service_role`), RLS : l'utilisateur voit et crée ses propres demandes, annule seulement les siennes en attente ; les administrateurs lisent tout via `has_role`. Index unique partiel sur `contribution_id` pour les demandes en attente.
- RPC `apply_ccc_correction_request(p_request_id, p_decision, p_rejection_reason)` en SECURITY DEFINER, `SET search_path = public`, réservée aux administrateurs : vérifie le rôle, applique les valeurs sur `cadastral_contributions` puis sur `cadastral_parcels` via une liste blanche de colonnes, écrit l'audit et le statut de manière atomique. Les valeurs ne sont jamais appliquées côté client.
- Liste blanche de colonnes partagée entre le catalogue front et la RPC : seules les colonnes déclarées modifiables peuvent être écrites, ce qui exclut le numéro de parcelle, les statuts, les scores de fraude et les champs d'approbation.
- Nouveaux fichiers : `src/lib/ccc/editableFieldsCatalog.ts`, `src/components/user/contributions/FieldCorrectionDialog/` (`index.tsx`, `FieldPickerStep.tsx`, `FieldValuesStep.tsx`, `ReviewStep.tsx`, `FieldInput.tsx`), `src/components/user/contributions/UserCorrectionRequests.tsx`, `src/hooks/useCorrectionRequests.ts`, `src/components/admin/ccc/CCCCorrectionRequestsPanel.tsx`.
- Les listes de choix réutilisent `useCCCFormPicklists` et les cascades existantes (`useConstructionCascade`), sans duplication de règles.
- `CorrectionRequestDialog.tsx` (saisie libre) est remplacé par le nouveau dialogue et supprimé.
- Validation identique au formulaire pour chaque donnée (bornes de hauteur, années, montants), plafond anti-abus sur le nombre de demandes par utilisateur et par jour.
- Couleurs et styles via jetons sémantiques Tailwind ; tests unitaires sur le catalogue, la détection des incohérences de cascade et la construction du diff.
