# Compléter la page d'introduction du formulaire CCC

## Contexte

Le dialogue d'introduction (`src/components/cadastral/CCCIntroDialog.tsx`) qui s'affiche avant l'ouverture du formulaire CCC liste aujourd'hui 4 rubriques seulement : « Informations générales (numéro cadastral, superficie, type de propriété) », « Localisation (dimensions des côtés, coordonnées GPS) », « Historique (propriétaires précédents) » et « Fiscalité (impôts fonciers et hypothèques) ».

Le formulaire réel comporte 6 onglets (Général, Localisation, Historique, Obligations, Location & Valeur, Révision) et demande beaucoup plus : documents du titre, pièce d'identité des propriétaires, circonscription foncière et adresse complète, tracé de la parcelle sur la carte, constructions principales et additionnelles (matériaux, standing, étages, année…), permis de construire, impôts par exercice, mise en location et valeur marchande. L'introduction ne permet donc pas de préparer les documents avant d'ouvrir le formulaire.

## Modifications (frontend uniquement)

Fichier concerné : `src/components/cadastral/CCCIntroDialog.tsx` — même dialogue latéral, même mécanique (défilement obligatoire, bouton « Commencer l'enregistrement », assistance). Le contenu des cartes est enrichi :

1. **Durée estimée** — révisée pour refléter la réalité du formulaire (aujourd'hui « 3 à 5 minutes », peu crédible compte tenu du nombre de champs) : environ 15 à 20 minutes, avec mention que la progression est sauvegardée automatiquement (brouillons conservés 30 jours, 5 brouillons maximum) et que le formulaire peut être repris plus tard.

2. **Documents et informations à préparer** — remplace la carte « Informations requises » par une liste par onglet, alignée sur ce que le formulaire demande réellement :
   - **Général** : type de titre foncier détenu et son numéro de référence ; scans ou photos du titre (jusqu'à 5 fichiers — JPEG, PNG, WebP ou PDF) ; pour chaque propriétaire : nom, coordonnées et pièce d'identité (photo ou PDF).
   - **Localisation** : circonscription foncière ( Province, territoire/commune/collectivité, quartier, avenue/rue) ; le numéro SU ou SR est déduit automatiquement ; relevé des côtés de la parcelle (longueurs en mètres) pour le tracé sur la carte ; côté(s) donnant sur la route ; servitudes éventuelles.
   - **Historique** : noms des propriétaires précédents dans l'ordre.
   - **Obligations** : impôts déjà payés (foncier, impôt sur le revenu locatif) avec leurs exercices/années ; hypothèques existantes éventuelles.
   - **Location & Valeur** : mise en location éventuelle (loyer mensuel, année de début) et valeur de revente estimée.

3. **Carte « Constructions » (nouvelle)** : si le terrain comporte des constructions, préparer pour chacune : type/nature, matériaux, usage, standing, année de construction, état (achevée / en cours), hauteur et nombre d'étages ; permis de construire et leur numéro si disponibles ; terrains vides : le champ « Construction » ne s'applique pas.

4. **Ce qui se passe après la soumission (nouvelle carte)** : les données sont vérifiées par notre équipe avant publication ; le suivi se fait depuis l'espace utilisateur ; une fois la contribution approuvée, des demandes de modification ciblées sont possibles depuis l'espace utilisateur (si le support backend est confirmé opérationnel au moment de l'implémentation, sinon cette phrase est omise).

5. **Appareil recommandé (carte conservée, précisée)** : mobile recommandé pour photographier les documents ; un ordinateur est plus confortable pour tracer la parcelle sur la carte.

6. **Assistance (carte conservée)** : inchangée (bulles d'aide, notifications, WhatsApp).

## Non modifiés

- Aucun changement de logique métier, de validation ni de base de données.
- Le dialogue du formulaire, l'ordre et le verrouillage des onglets restent inchangés.
- Les couleurs utilisées restent les classes sémantiques existantes (primary, accent, green-500, blue-500 déjà présentes dans ce composant).

## Validation

- `npx tsgo --noEmit -p tsconfig.app.json` puis `bun run test`.
- Vérification Playwright du dialogue à 360 px et 1280 px : défilement complet, bouton actif, lisibilité mobile.
