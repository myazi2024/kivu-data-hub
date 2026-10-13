# Ajouter « À propos de ce service » à la page d'introduction du formulaire CCC

## Objectif

La page d'introduction qui précède le formulaire CCC (`src/components/cadastral/CCCIntroDialog.tsx`) commence aujourd'hui par « Durée estimée » : aucune carte n'explique ce qu'est le service ni ce que deviennent les données envoyées. On y ajoute, en première position, une carte « À propos de ce service » rédigée en un seul paragraphe, qui met en avant la vérification : ce formulaire permet au propriétaire de s'assurer que sa parcelle ne figure pas déjà au cadastre numérique de la République Démocratique du Congo avant de la déclarer.

## Texte proposé

Le numéro réellement recherché est rappelé dans le paragraphe (il est déjà transmis au dialogue, mais inutilisé à ce jour). Quand le formulaire s'ouvre sans numéro saisi, la phrase bascule sur « votre parcelle ».

> **À propos de ce service**
>
> Ce formulaire permet d'abord de vérifier si votre parcelle figure déjà au cadastre numérique de la République Démocratique du Congo : si « **{numéro}** » y apparaît, son dossier s'ouvre et vous n'avez rien à déclarer. Si elle est introuvable, vous la décrivez ici avec vos documents ; après vérification par notre équipe, elle rejoint le registre national, où elle sera consultable par tous et vous ouvrira les autres démarches foncières (titre foncier, autorisation de bâtir, expertise, mutation).

Cette formulation reste fidèle au fonctionnement réel : la vérification d'existence est effectuée côté serveur au moment de la recherche, avant l'ouverture de cette page, et la contribution n'est publiée qu'après contrôle par l'équipe.

## Modifications

Fichier concerné : `src/components/cadastral/CCCIntroDialog.tsx` (frontend uniquement, aucune logique ni base de données touchée).

1. Récupérer la propriété `parcelNumber` dans les arguments du composant (elle figure dans `CCCIntroDialogProps` et est transmise par les deux écrans qui ouvrent ce dialogue, mais n'était pas lue), avec un `trim()`.
2. Insérer une carte « À propos de ce service » **avant** la carte « Durée estimée », dans la zone défilante : même structure que les cartes existantes (en-tête `h3` en `font-semibold text-sm`, texte `text-sm leading-relaxed text-foreground/80`), icône `Info` déjà importée, jetons sémantiques `primary` (aucune couleur codée en dur).
3. Le numéro de parcelle est mis en évidence en `text-foreground` et affiché tel quel, sans reformulation ni ajout de préfixe.
4. Les six cartes existantes (Durée estimée, Documents et informations à préparer, Constructions, Après la soumission, Appareil recommandé, Bon à savoir, Assistance disponible) gardent leur contenu et leur ordre ; seul le défilement s'allonge d'une carte.

## Validation

- Typecheck `tsgo --noEmit -p tsconfig.app.json` et tests `bun run test`.
- Contrôle visuel Playwright de la page d'introduction à 360 px et 1280 px : la carte « À propos de ce service » apparaît en premier, le numéro recherché y figure, le bouton « Commencer l'enregistrement » reste atteignable après défilement.
- `roadmap.md` mis à jour.
