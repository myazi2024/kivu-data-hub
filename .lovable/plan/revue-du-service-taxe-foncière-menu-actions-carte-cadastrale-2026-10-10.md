# Revue du service « Taxe foncière » (menu Actions, carte cadastrale)

## Constats confirmés à la lecture du code
1. **Montants fixés par le navigateur** : Impôt foncier, Taxe de bâtisse et IRL calculent le total à l'écran puis l'enregistrent tel quel dans la contribution (`amount_usd`, pénalités, frais). Un montant falsifié peut être enregistré.
2. **Anti-doublon côté navigateur** : vérifié avec une lecture directe ; contournable et différent entre les écrans (« Ajouter un paiement » a sa propre version).
3. **Notifications créées par le navigateur** dans les quatre parcours (falsifiables, contraire à la règle du projet).
4. **Nom du propriétaire pré-rempli** depuis les données de la parcelle (`current_owner_name`) dans le dialogue principal, Bâtisse et IRL, alors que ce nom n'est visible qu'après paiement ailleurs dans l'application.
5. **Libellés incohérents** : l'IRL enregistre « Impôt sur le revenu locatif » alors que l'admin et l'espace utilisateur attendent « Impôt sur les revenus locatifs » → déclarations IRL mal classées (alerte « bien en location sans IRL » erronée).
6. **Redondances** : état du contribuable dupliqué (`useSharedTaxpayer` + états locaux `localOwnerName` dans Bâtisse et IRL) ; trois logiques d'envoi quasi identiques ; taux de repli codés en dur dans le hook de calcul.
7. **Statut de paiement en français** (« En attente ») écrit dans l'historique fiscal, contraire au standard EN.

## Corrections prévues
**Serveur**
- Nouvelle fonction `submit_tax_declaration` : vérifie la connexion, recalcule le montant à partir du barème `property_tax_rates_config` (foncier, bâtisse, IRL : base, pénalités de retard, frais), applique l'anti-doublon unique (parcelle + type + exercice + construction, tous statuts sauf rejeté/renvoyé), crée la contribution `pending` et la notification, journalise.
- Déclencheur sur les contributions de type taxe : refuse toute insertion directe d'historique fiscal par le navigateur hors de cette fonction (comme pour les radiations).
- « Ajouter un paiement » (paiement antérieur avec reçu) passe par la même fonction, en mode `declared_payment` : montant saisi conservé comme déclaratif, statut `pending` de vérification, reçu stocké sous le dossier de l'utilisateur.
- Normalisation : `payment_status` en EN (`pending`/`paid`), libellé IRL unifié ; lecture admin/espace utilisateur tolérante aux anciennes valeurs.

**Écran**
- Les trois calculateurs gardent le calcul comme simple aperçu, envoient les saisies à la fonction serveur et affichent le montant retourné (avertissement si différent).
- Suppression du pré-remplissage du nom du propriétaire ; le contribuable saisit son nom une seule fois (état partagé seul, états locaux retirés).
- Suppression des insertions de notifications et des anti-doublons navigateur ; constantes de types de taxe partagées.
- Pièces jointes : chemin `user_id/…` avec `crypto.randomUUID()` et suppression en cas d'échec.

**Qualité**
- Tests unitaires : miroir du barème (foncier, bâtisse, IRL, pénalités), normalisation des libellés/statuts.
- Compte rendu ajouté au rapport d'audit de la carte cadastrale ; règle ajoutée dans `src/components/cadastral/AGENTS.md`.

## Détails techniques
- Fichiers : `PropertyTaxCalculator.tsx`, `BuildingTaxCalculator.tsx`, `IRLCalculator.tsx`, `TaxFormDialog.tsx`, `TaxManagementDialog.tsx`, `useSharedTaxpayer.ts`, `taxSharedUtils.ts`, `usePropertyTaxCalculator.tsx`, `taxDeclarationTypes.ts`, `TaxObligationsPanel.tsx`/`useUserAssets`.
- Migration : fonction SECURITY DEFINER avec `SET search_path = public`, contrôle `auth.uid()`, EXECUTE pour `authenticated` uniquement ; déclencheur BEFORE INSERT sur `cadastral_contributions`.
- Vérification : typecheck, vitest, build ; parcours connecté non testable à l'écran sans session.
