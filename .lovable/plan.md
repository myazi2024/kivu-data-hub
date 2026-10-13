# Empêcher la fermeture accidentelle du formulaire CCC

## Diagnostic (confirmé par lecture du code)

Le formulaire CCC (`CadastralContributionDialog.tsx`) est un dialogue Radix. Par défaut, un clic sur l'overlay (en dehors du formulaire) déclenche `onOpenChange(false)` → `handleAttemptClose`. Le code actuel :

1. `onInteractOutside` ne bloque que le cas du bouton WhatsApp ; tout autre clic dehors ferme le dialogue.
2. `handleAttemptClose` (`useCCCFormState.ts` ligne 1135) n'affiche la confirmation « Modifications non enregistrées » que si `formDirtyRef.current` est vrai. Or :
   - **Brouillon restauré** : `loadFormDataFromStorage` (`useFormPersistence.ts`) restaure les données sans jamais remettre `formDirtyRef` à `true`. L'utilisateur retrouve son formulaire rempli, clique dehors sans rien modifier → fermeture immédiate sans confirmation, et `handleClose` réinitialise tout l'état. Le brouillon reste en mémoire locale, mais à l'écran tout a disparu : perte de données perçue (et réelle si le brouillon a expiré ou changé de version).
   - **Pré-remplissage par numéro de titre** : `initialTitleReferenceNumber` remplit un champ sans marquer le formulaire comme modifié.
3. La touche Échap ferme aussi le dialogue (aucun `onEscapeKeyDown` géré), avec le même contournement possible de la confirmation.
4. En mode édition d'une contribution existante (`editingContributionId`), la sauvegarde de brouillon est désactivée, mais la boîte de confirmation affirme « Vos données ont été sauvegardées en brouillon » — message faux dans ce cas.

## Corrections (frontend uniquement)

Fichiers : `src/components/cadastral/CadastralContributionDialog.tsx`, `src/hooks/useCCCFormState.ts`, `src/hooks/ccc/useFormPersistence.ts`.

1. **Bloquer la fermeture par clic extérieur** : `onInteractOutside={(e) => e.preventDefault()}` sur le `DialogContent` du formulaire (supprime l'exception WhatsApp devenue inutile — le bouton reste cliquable car il est rendu hors du dialogue). La fermeture ne passe plus que par le bouton Fermer ou Échap, tous deux routés vers `handleAttemptClose`.
2. **Touche Échap** : `onEscapeKeyDown={(e) => { e.preventDefault(); state.handleAttemptClose(); }}` pour que Échap déclenche la même confirmation au lieu de fermer directement.
3. **Brouillon restauré = formulaire modifié** : après une restauration de brouillon contenant des données, appeler `markDirty()` (passé à `useFormPersistence`) afin que toute fermeture ultérieure demande confirmation.
4. **Message de confirmation exact** : dans le `AlertDialog` de sortie, afficher la phrase « Vos données ont été sauvegardées en brouillon… » uniquement hors mode édition ; en mode édition (`editingContributionId`), afficher « Vos modifications non enregistrées seront perdues. »
5. L'écran de succès conserve son comportement actuel (fermeture libre).

## Non modifié

- Aucune logique métier, validation ou base de données.
- Le contenu et l'ordre des onglets, la mécanique de brouillon (clé, TTL, schéma).

## Validation

- `npx tsgo --noEmit -p tsconfig.app.json` puis `bun run test`.
- Test unitaire ciblé : restauration de brouillon → `formDirtyRef` vrai → `handleAttemptClose` affiche la confirmation au lieu de fermer.
- Vérification visuelle impossible (formulaire derrière connexion, backend externe) : validation par code et tests.
