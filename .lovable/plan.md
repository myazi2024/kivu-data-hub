# Analyse et correction du formulaire CCC (de la saisie au traitement)

## Objectif
Vérifier qu'une contribution CCC part bien depuis le formulaire, qu'elle est enregistrée sans erreur, puis que son traitement (approbation, rejet, recours, retrait, demande de modification) aboutit. Corriger tout ce qui bloque, sans ajouter de fonctionnalités.

## Étapes

1. **Revue onglet par onglet (écran)**
   Général, Localisation, Historique, Obligations, Valeur marchande, Récapitulatif : champs collectés mais jamais envoyés, champs obligatoires mal signalés, validations incohérentes entre l'onglet et le récapitulatif, morceaux de code jamais utilisés.

2. **Correspondance formulaire → enregistrement**
   Comparer chaque donnée envoyée avec les colonnes réellement présentes dans la table des contributions (114 colonnes) : nom erroné, format incorrect, valeur refusée par une règle de la base, donnée perdue.

3. **Vérification réelle de la soumission**
   - Lire les journaux récents de la base et des services pour repérer les soumissions échouées.
   - Rejouer une soumission complète de test côté serveur (contribution marquée TEST) et contrôler : enregistrement, code CCC généré, contrôle anti-fraude, notification.
   - Rejouer le traitement : approbation (création/mise à jour de la parcelle et des historiques), rejet motivé, recours, retrait, demande de modification. Puis supprimer les données de test.

4. **Corrections** des problèmes trouvés, dans le formulaire et/ou côté serveur (migration si nécessaire).

5. **Contrôle final** : contrôle automatique du code, tests existants (185) plus tests ajoutés pour chaque bug corrigé, nouvelle soumission de test de bout en bout.

## Limite connue
Le navigateur de contrôle ne peut pas ouvrir de session sur votre site : le clic final sur « Soumettre » dans l'écran sera vérifié par rejeu côté serveur et par les tests, pas visuellement. Je vous indiquerai ce qu'il reste à cliquer dans votre aperçu.

## Détails techniques
- Fichiers : `src/components/cadastral/ccc-tabs/*`, `useCCCFormState.ts`, `useCadastralContribution.tsx` (validateContributionData, insertion), `useFormValidation.ts`, `src/lib/ccc/*`.
- Base : triggers sur `cadastral_contributions` (auto_generate_ccc_code, detect_suspicious_contribution, check_contribution_abuse), RPC `approve_ccc_contribution`, `reject_ccc_contribution`, `process_ccc_appeal`, `withdraw_ccc_contribution`, `apply_ccc_correction_request`.
- Rejeu via requêtes SQL en transaction annulée (ROLLBACK) quand possible, sinon données préfixées TEST puis purge.
