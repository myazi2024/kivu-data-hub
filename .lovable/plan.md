# Revue du catalogue de services et du panier (carte cadastrale)

## Objectif
Aligner le catalogue des services et le panier de la carte cadastrale avec les données que le formulaire CCC collecte aujourd'hui, et avec les règles en vigueur dans l'application (paiement serveur, accès payé, terminologie « Autorisation », statuts). Aucune nouvelle fonctionnalité.

## Parties examinées une par une
1. **Catalogue** : liste des services, catégories, prix, descriptions, icônes, ordre d'affichage, mises à jour en direct.
2. **Conditions de disponibilité** : pour chaque service, la règle « données requises » doit pointer vers des informations que le CCC collecte vraiment (historique des propriétaires, taxes, hypothèques, autorisations, constructions, litiges, localisation SU/SR). Les règles qui pointent vers d'anciens champs seront corrigées.
3. **Fiche de résultat et panneau de facturation** : services marqués disponibles / indisponibles, bouton « Tout ajouter / Compléter le dossier », affichage des prix dans la devise choisie.
4. **Panier** : ajout, retrait, purge à changement de parcelle, codes de remise, services déjà payés (ne pas les refacturer), synchronisation des prix quand l'admin modifie le catalogue, services retirés du catalogue encore présents dans le panier.
5. **Paiement et accès** : création de facture, paiement test et réel, ouverture des documents payés (historique propriétaires/taxes via le serveur), montants toujours recalculés côté serveur.
6. **Document cadastral et PDF** : chaque service payé affiche les bonnes sections, avec les données issues du CCC actuel.
7. **Admin du catalogue** : formulaire de règles, validation, corbeille, cohérence avec ce que voit l'utilisateur.

## Pour chaque partie, on recherche
- Bugs, erreurs console, dépendances cassées ou en double
- Incohérences avec le CCC (noms de champs, statuts, libellés, « Permis »)
- Montants ou droits calculés dans le navigateur au lieu du serveur
- Code mort ou orphelin

## Corrections
- Appliquées au fil de la revue, sans changer l'apparence ni les parcours
- Paiements, factures et accès payés restent exclusivement serveur
- Descriptions stockées en base contenant encore « permis » corrigées si l'accès le permet, sinon signalées

## Vérification
- Contrôle de code et tests automatiques ; tests ajoutés pour les règles de disponibilité et le panier
- Scénarios serveur (facture, paiement test, accès) testés dans des transactions annulées
- Limite : les parcours connectés ne peuvent pas être cliqués dans le navigateur de contrôle ; je vous indiquerai quoi tester

## Livrable
Section ajoutée au rapport d'audit de la carte cadastrale : problèmes trouvés, corrections, points ouverts.

## Détails techniques
- Front : `useCadastralServices`, `serviceAvailability.ts`, `cadastralServiceRules.ts`, `CadastralBillingPanel`, `ServiceListItem`, `CadastralCartButton`, `useCadastralCart`, `useCartDiscounts`, `useCartAccessCheck`, `useCadastralPayment`, `CadastralDocumentView`, `lib/pdf.ts`, `invoiceDownload.ts`, `AdminCadastralServices`
- Comparer les chemins utilisés dans `required_data_fields` (lus en base) avec la forme réelle du résultat de recherche et les champs CCC
- Back : `cadastral_services_config` (données et politiques), `create_cadastral_invoice_safe`, `mark_cadastral_invoice_paid_safe`, `get_parcel_paid_history`, `record-test-payment`, droits d'exécution
- Vérifier le Realtime du catalogue récemment modifié (application locale des changements, tri, services désactivés)
