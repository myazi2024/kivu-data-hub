# Audit — Onglets « Historique » et « Obligations » du formulaire CCC

Revue de `HistoryTab.tsx`, `ObligationsTab.tsx`, des handlers de `useCCCFormState.ts` et des règles de `useFormValidation.ts`. Anomalies confirmées par lecture du code, classées par gravité.

## Onglet Historique — anomalies confirmées

1. **Chaînage des dates de fin inversé (bug de logique)**
   L'interface indique que l'ancien #1 (le plus récent) se termine à la date d'entrée du propriétaire actuel. Mais l'effet de synchronisation remplit la date de fin du **dernier** ancien propriétaire de la liste, pas du premier. Dès qu'il y a 2 anciens ou plus, la mauvaise ligne est remplie et l'ancien #1 reste sans date de fin.

2. **Pas de re-chaînage après suppression**
   Supprimer un ancien propriétaire au milieu de la liste laisse les dates de fin des voisins pointant vers un propriétaire qui n'existe plus → trou/incohérence dans la chaîne de propriété.

3. **Ancien #1 non supprimable**
   Le bouton corbeille n'apparaît que pour `index > 0`. Impossible de corriger une première saisie erronée autrement qu'en réinitialisant tout le bloc.

4. **Propriétaire silencieusement perdu à la soumission**
   La validation n'exige qu'un `name`, mais l'enregistrement ne conserve que les propriétaires ayant **name ET startDate**. Un ancien sans date de début passe la validation puis disparaît sans avertissement.

5. **Incohérences chronologiques non bloquantes**
   « Début après fin », chevauchement de périodes entre deux anciens, ou date postérieure à l'entrée du propriétaire actuel : affichés en rouge dans l'UI mais n'empêchent pas la soumission (sauf le cas titre foncier/ancien #1).

6. **Champs marqués `*` sans validation**
   Pour « Personne morale » : type d'entreprise, forme juridique / type d'association et « Autre — préciser » portent un astérisque mais aucune règle ne les vérifie au moment de soumettre.

7. **Clés de liste basées sur l'index** (`key={index}`) : suppression ou insertion peut faire migrer les valeurs saisies d'une carte à l'autre.

## Onglet Obligations — anomalies confirmées

8. **Reçus annoncés « optionnel » mais en réalité obligatoires**
   Les libellés indiquent « Reçu (optionnel) » et « Justificatif (optionnel) », alors que la validation bloque la soumission tant qu'un fichier n'est pas joint dès que le montant est saisi (taxes et hypothèques). Contradiction directe avec le message affiché.

9. **Statuts de paiement incomplets**
   Seuls « Payé » et « Payé partiellement » existent. Impossible de déclarer une taxe **impayée ou en retard**, alors que la fiche cadastrale et le document public affichent bien un statut « En retard / En attente ».

10. **Doublons de taxes partiellement bloqués**
    Le blocage année+type ne s'applique que si l'autre ligne est « Payé ». Deux lignes « Payé partiellement » identiques (même type, même année) restent possibles.

11. **Montant restant : erreur affichée mais non bloquante**
    Le message « le montant restant ne peut pas dépasser le montant payé » n'est associé à aucune règle de validation ; la soumission passe.

12. **Cohérence date de paiement / année fiscale absente**
    Aucune vérification que la date de paiement corresponde à l'année déclarée (on peut payer 2019 avec une date 2026). Pas de garde-fou non plus sur les montants négatifs ou nuls.

13. **IRL : pas de contrôle de cohérence avec les loyers déclarés**
    L'encadré récapitule bien le loyer annuel estimé, mais aucun rapprochement n'est fait avec le montant d'IRL saisi, et rien ne signale un IRL déclaré pour une année antérieure à la mise en location.

14. **Hypothèque : champs manquants**
    Aucune date d'échéance (elle pourrait être déduite de date de contrat + durée), et aucune date d'extinction demandée lorsque le statut passe à « Éteinte / Radiée » — alors que le document cadastral affiche ce statut.

15. **Hypothèque : contrôles de saisie absents**
    Montant et durée acceptent 0 ou des valeurs négatives ; la date de contrat n'est bornée que côté UI, pas à la soumission.

16. **Basculement Oui → Non → Oui destructif**
    Répondre « Non » réinitialise immédiatement toutes les hypothèques saisies, y compris les pièces jointes, sans confirmation.

17. **Litiges : données non purgées et non validées**
    Passer « Oui » puis « Non » conserve les données du litige déjà saisies, qui partent quand même à l'enregistrement. Inversement, « Oui » sans remplir le formulaire de litige n'est bloqué par aucune règle.

## Correctifs proposés

**Historique**
- Corriger le chaînage : la date de fin de l'ancien #1 suit l'entrée du propriétaire actuel ; chaque ancien suivant suit la date de début du précédent. Recalculer la chaîne après toute suppression.
- Autoriser la suppression de l'ancien #1 dès qu'il en existe plus d'un.
- Rendre la date de début obligatoire (même règle que l'enregistrement) et faire remonter la chaîne incomplète dans les erreurs de l'onglet.
- Bloquer à la soumission : début > fin, chevauchement de périodes, champs `*` de personne morale vides.
- Clés de liste stables (identifiant généré) à la place de l'index.

**Obligations**
- Aligner les libellés sur la règle réelle : marquer reçu et justificatif comme requis (ou rendre la règle conditionnelle si le caractère optionnel est voulu — à confirmer).
- Ajouter les statuts « Impayé » et « En retard », avec masquage du champ « montant restant » et de la date de paiement quand ils s'appliquent.
- Étendre le blocage des doublons type+année à tous les statuts.
- Rendre bloquants : montant restant ≥ montant payé, montants ≤ 0, date de paiement incohérente avec l'année fiscale.
- IRL : avertissement si le montant s'écarte fortement du loyer annuel déclaré, et si l'année déclarée précède la mise en location.
- Hypothèque : échéance calculée automatiquement (contrat + durée, en lecture seule) et date d'extinction obligatoire pour les statuts éteint/radié ; bornes sur montant et durée.
- Confirmation avant l'effacement des hypothèques saisies lors du passage à « Non ».
- Litiges : purge des données quand on repasse à « Non », et validation minimale du formulaire de litige quand « Oui » est sélectionné.

## Détails techniques

Fichiers concernés : `src/components/cadastral/ccc-tabs/HistoryTab.tsx`, `src/components/cadastral/ccc-tabs/ObligationsTab.tsx`, `src/hooks/useCCCFormState.ts` (handlers `updatePreviousOwner`, `removePreviousOwner`, effet de synchronisation `firstOwnerSince`, `setHasDispute`, `updateTaxRecord`, `updateMortgageRecord`), `src/hooks/ccc/useFormValidation.ts` (sections HISTORY / OBLIGATIONS).

Aucune migration de base n'est nécessaire pour les correctifs de chaînage, de validation et de purge. Les deux nouveaux statuts de taxe et la date d'extinction d'hypothèque sont stockables dans les colonnes existantes (`payment_status`, historique hypothécaire) — à vérifier avant implémentation, une migration légère pourrait s'imposer pour la date d'extinction.
