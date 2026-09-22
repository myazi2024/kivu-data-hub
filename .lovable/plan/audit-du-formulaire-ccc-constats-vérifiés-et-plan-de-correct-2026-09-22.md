# Audit du formulaire CCC — constats vérifiés et plan de corrections

Audit réalisé sur le formulaire (écrans, hooks, utilitaires) et sur la base de données réelle
(triggers, règles d'accès, colonnes, contraintes interrogés en direct).

## Ce que j'ai trouvé

### Bloquants (vérifiés en base)

1. **L'approbation d'une contribution portant sur une parcelle déjà existante échoue.**
   Le mécanisme d'approbation tente de recopier le champ « numéro d'autorisation précédente »
   vers la fiche parcelle, mais cette donnée n'existe pas sur la fiche parcelle. L'opération
   lève une erreur et l'approbation est interrompue.

2. **« État de la construction » (achevée / en cours) n'arrive jamais sur la fiche parcelle.**
   Deux fonctions portent presque le même nom : celle qui contient le champ n'est reliée à rien,
   celle qui tourne réellement ne le contient pas. La donnée reste bloquée dans la contribution.

3. **Pour une nouvelle parcelle, l'usage réel, la capacité d'exploitation et le contrat de
   location sont perdus à l'approbation.** Ces champs ne sont recopiés que lorsque la
   contribution met à jour une parcelle existante ; à la création, ils sont ignorés.

4. **Les codes contributeur (CCC) sont falsifiables.** Un utilisateur connecté peut créer un code
   à son nom avec la valeur qu'il veut, et modifier ensuite la valeur ou le statut d'un code
   existant : les règles d'accès ne contrôlent que le propriétaire, jamais le contenu.

### Bugs du formulaire

5. **Perte de saisie à la modification d'une contribution** : à la réouverture, l'usage réel,
   la précision « autre », la capacité d'exploitation et le contrat de location reviennent vides
   alors qu'ils sont enregistrés — et risquent d'être écrasés à la resoumission.

6. **Constructions supplémentaires incohérentes** : la validation et l'enregistrement attendent
   l'usage réel et la capacité d'exploitation, mais aucune question ne les demande à l'écran.

7. **Appui prolongé sur la carte** : les minuteries lancées sur les points de la carte ne sont pas
   annulées quand le croquis est redessiné ; une fenêtre d'édition peut s'ouvrir sur un côté qui
   n'existe plus ou a été renuméroté.

### Code mort et confort

8. Un panneau complet (« côtés bordant une route ») n'est plus affiché nulle part ; seuls ses
   petits utilitaires servent encore.
9. Le panneau des côtés (plus de 900 lignes) recalcule tout à chaque mouvement de carte, sans
   mise en cache.

## Corrections proposées, par étapes

**Étape A — Intégrité des données à l'approbation (migration)**
- Ajouter le champ manquant sur la fiche parcelle et débloquer l'approbation.
- Fusionner les deux fonctions jumelles en une seule, reliée au bon déclencheur, incluant
  l'état de la construction.
- Faire recopier l'usage réel, la capacité d'exploitation, le contrat de location et l'état de la
  construction aussi bien à la création qu'à la mise à jour d'une parcelle.
- Rattrapage : reporter ces valeurs pour les contributions déjà approuvées.

**Étape B — Verrouillage des codes contributeur (migration)**
- Retirer la création et la modification directes par l'utilisateur ; ne laisser passer que le
  processus d'approbation et l'administration. Lecture de ses propres codes inchangée.

**Étape C — Restauration complète en modification**
- Recharger usage réel, précision « autre », capacité d'exploitation, unité et contrat de
  location, avec conservation du contrat déjà téléversé (même logique que les autres pièces).

**Étape D — Constructions supplémentaires alignées**
- Ajouter les questions « usage réel » et « capacité d'exploitation » sur chaque construction
  supplémentaire, avec les mêmes règles que la construction principale.

**Étape E — Fiabilité carte et nettoyage**
- Annuler les minuteries d'appui prolongé au redessin et au démontage.
- Supprimer le panneau devenu inutilisé en conservant ses utilitaires.
- Mettre en cache les calculs par côté dans le panneau des limites.

Vérification après chaque étape : contrôle de types et suite de tests complète.

## Détails techniques

- Trigger `zz_sync_contribution_extra_fields` → exécute `sync_contribution_extra_fields_to_parcel()`
  (sans `construction_status`, avec `previous_permit_number` inexistant sur `cadastral_parcels`) ;
  `zz_sync_contribution_extra_fields()` (avec `construction_status`) n'est attachée à aucun trigger.
- Branche `INSERT` de `sync_approved_contribution_to_parcel()` : colonnes `actual_usage`,
  `actual_usage_other`, `operational_capacity`, `operational_capacity_unit`, `lease_contract_url`,
  `construction_status` absentes de la liste.
- `cadastral_contributor_codes` : policy INSERT `WITH CHECK (auth.uid() = user_id)` et policy UPDATE
  `USING (auth.uid() = user_id OR admin)` sans `WITH CHECK`.
- Front : `useCCCFormState.ts:1211-1263` (restauration), `AdditionalConstructionBlock.tsx`
  (UI manquante vs `useFormValidation.ts:242-253`), `ParcelMapPreview.tsx:890,1159,1727` (timers),
  `RoadBorderingSidesPanel.tsx:86` (composant mort), `ParcelSidesDimensionsPanel.tsx` (mémoïsation).
