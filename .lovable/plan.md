# Lever le verrou occupants / capacité d'accueil

Dans l'onglet Localisation, bloc Construction (mode « Divisé en plusieurs locaux »), saisir un nombre d'occupants supérieur à la capacité d'accueil affiche un message d'erreur en rouge et bloque le passage à l'onglet suivant. Ces deux données doivent rester libres : elles servent aux mesures de densité et de taux d'occupation dans Analytics.

## Ce qui change

- Suppression du message « Le nombre d'occupants ne peut pas dépasser la capacité d'accueil du local ».
- Le champ et son libellé ne passent plus en rouge à cause de ce dépassement.
- Le dépassement ne fait plus partie des éléments manquants qui bloquent la navigation entre onglets et la soumission.
- Ce qui reste inchangé : occupants obligatoire si le local est occupé, capacité d'accueil obligatoire, minimum 1.

## Détails techniques

- `src/components/cadastral/RentalConfigurationFields.tsx` : retirer le calcul `occupantsOverCapacity` (l. 274-275) et ses usages dans le libellé, la classe du champ et le paragraphe d'erreur (l. 360-375).
- `src/hooks/ccc/useFormValidation.ts` : supprimer les branches `else if (... occupantCount > hostingCapacity)` pour la construction principale (l. 134-136) et les constructions additionnelles (l. 192-194), en conservant le contrôle « occupants renseigné ».

Aucun changement de base de données ni de structure de données.
