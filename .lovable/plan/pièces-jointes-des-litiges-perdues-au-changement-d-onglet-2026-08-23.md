# Pièces jointes des litiges perdues au changement d'onglet

## Diagnostic (vérifié)

Dans le formulaire CCC, les onglets sont rendus avec `TabsContent` (Radix) : l'onglet quitté est **démonté**. Tous les fichiers du formulaire sont donc stockés dans l'état parent `useCCCFormState` pour survivre au démontage :

- document du propriétaire, documents de titre (`ownerDocFile`, `titleDocFiles`)
- reçus de taxes (`taxRecords[].receiptFile`)
- reçus d'hypothèque (`mortgageRecords[].receiptFile`)
- pièces jointes des autorisations de construire (`buildingPermits[].attachmentFile`)
- images de l'onglet Valeur : uploadées immédiatement dans Storage, donc conservées

**Seule exception** : le bloc Litiges. Le composant `LandDisputeReportForm` (embarqué dans l'onglet Obligations) garde ses fichiers dans son propre état local (`documents: File[]`). Au changement d'onglet, le composant est démonté et la liste est vidée — c'est exactement le symptôme décrit.

Conséquence supplémentaire confirmée : en mode embarqué, le callback `onDisputeDataChange` ne remonte que les champs texte. Les pièces jointes du litige ne sont donc **jamais envoyées** à la soumission du CCC (`dispute_data` part sans documents), même si l'utilisateur ne change pas d'onglet.

Aucun autre onglet n'est concerné : l'audit des états `File` du formulaire montre que tous les autres vivent dans le parent.

## Correctifs

1. **Remonter les fichiers du litige dans l'état du formulaire**
   - Ajouter `disputeDocuments: File[]` dans `useCCCFormState`, exposé via le contexte du dialogue.
   - `LandDisputeReportForm` accepte des props contrôlées optionnelles (`documents`, `onDocumentsChange`) ; en mode embarqué il les utilise au lieu de son état interne, sinon il garde son comportement actuel (usage hors CCC inchangé).

2. **Envoyer réellement les pièces jointes à la soumission**
   - À la soumission du CCC, uploader `disputeDocuments` avec l'utilitaire existant `uploadDisputeFiles` et joindre les URLs à `disputeData.documents`, avec rollback Storage en cas d'échec (même mécanique que les autres pièces jointes).

3. **Nettoyage cohérent**
   - Vider `disputeDocuments` quand « Y a-t-il un litige ? » passe à « Non » et à la réinitialisation du formulaire.

4. **Limite assumée (pas de régression)**
   - Comme pour toutes les autres pièces jointes, les fichiers ne sont pas sérialisables dans le brouillon localStorage : ils restent en mémoire pour la session. Le rechargement de page continue de demander de rejoindre les fichiers (comportement déjà indiqué à l'utilisateur dans les messages de sortie).

## Fichiers touchés

- `src/hooks/useCCCFormState.ts` — nouvel état `disputeDocuments`, upload à la soumission, reset
- `src/components/cadastral/LandDisputeReportForm.tsx` — props contrôlées pour les documents
- `src/components/cadastral/ccc-tabs/ObligationsTab.tsx` — passage des props
- `src/components/cadastral/CadastralContributionDialog.tsx` — câblage
