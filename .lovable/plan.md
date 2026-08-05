# Validation CCC détaillée, champ par champ, dans le dialogue admin

Aujourd'hui la validation d'une contribution CCC ne produit qu'un toast (« ⚠ 3 erreur(s) trouvée(s) ») : le résultat (`validationResult`) est stocké dans `AdminCCCContributions.tsx` mais n'est jamais affiché dans `CCCDetailsDialog`. Les messages de la fonction serveur `validate_contribution_completeness` sont des phrases libres, sans nom de champ ni rattachement à une section. L'admin ne sait donc pas quoi corriger ni où regarder.

## Ce qui sera ajouté

### 1. Un catalogue de règles avec identité de champ
Un nouveau module associe à chaque contrôle : un identifiant de champ, un libellé lisible, la sévérité (bloquant / avertissement), l'onglet du dialogue concerné, et la valeur actuelle du champ.

Il couvre :
- les 5 contrôles bloquants serveur (numéro de parcelle, type de titre, propriétaire actuel, superficie, province) ;
- les avertissements documentaires (titre, pièce d'identité, GPS, historiques propriété / bornage / taxes) ;
- les contrôles locatifs et valeur marchande déjà présents dans `cccConsistency.ts` (mode locatif, locaux, loyers, capacité, expertise, annonces sans photo / sans contact).

Les messages issus du RPC serveur sont rattachés à ces mêmes champs via une table de correspondance, pour que serveur et client parlent le même langage. Un message serveur inconnu reste affiché tel quel, classé « Autre ».

### 2. Un panneau « Validation » dans le dialogue de détails
Nouvel onglet « Validation » dans `CCCDetailsDialog`, avec un badge indiquant le nombre d'erreurs bloquantes. Le panneau affiche :
- une synthèse : statut valide / invalide, score de complétude, nombre d'erreurs et d'avertissements ;
- les problèmes regroupés par section (Général, Localisation, Env. & Occup., Valeur, Permis, Historiques, Obligations, Documents) ;
- pour chaque ligne : icône de sévérité, libellé du champ, message clair, valeur actuelle (ou « Non renseigné »), et un bouton « Voir » qui ouvre l'onglet concerné du dialogue et met la section en surbrillance brièvement.

Un bouton « Revalider » relance la validation serveur directement depuis le panneau.

### 3. Signalement en tête de dialogue
La bannière d'incohérences existante devient un résumé cliquable : « N erreur(s) bloquante(s), M avertissement(s) — Voir le détail » qui bascule sur l'onglet Validation, au lieu de la liste brute actuelle.

### 4. Refus d'approbation plus explicite
Quand l'approbation est refusée pour cause de validation, au lieu du toast générique, le dialogue ouvre l'onglet Validation et le toast liste les 3 premiers champs bloquants.

## Détails techniques

- Nouveau `src/components/admin/ccc/cccValidationRules.ts` : type `CCCValidationIssue { fieldId, fieldLabel, message, severity, tab, currentValue }`, fonction `buildValidationIssues(contribution, serverResult)` qui fusionne règles client + messages serveur mappés, et `SERVER_MESSAGE_MAP`.
- Nouveau `src/components/admin/ccc/CCCValidationPanel.tsx` : rendu groupé par onglet, badges sémantiques, bouton « Voir » (`onNavigate(tab)`) et « Revalider ».
- `CCCDetailsDialog.tsx` : `Tabs` passe en mode contrôlé (`value` / `onValueChange` via state local) pour permettre la navigation depuis le panneau ; ajout du `TabsTrigger`/`TabsContent` « Validation » ; nouvelles props `validationResult`, `onValidate`.
- `AdminCCCContributions.tsx` : transmet `validationResult` et `onValidate` au dialogue ; en cas d'échec d'approbation, message enrichi.
- `cccConsistency.ts` : `detectCCCInconsistencies` est refactorée pour retourner des `CCCValidationIssue` typées ; un wrapper conserve la sortie `string[]` pour l'export CSV existant.
- Aucune migration : la fonction SQL reste inchangée, le mapping se fait côté client.
