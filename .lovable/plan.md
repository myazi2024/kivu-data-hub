# Nettoyage et stabilisation de l'application

Revue complète du code (interface et serveur) pour corriger les défauts réels, supprimer ce qui ne sert plus, puis retester. Portée retenue : bugs et zones sensibles (parcours CCC, carte, paiements, espace administration). Suppression directe du code inutilisé. Rapport livré comme document séparé dans vos fichiers.

## Constats vérifiés

Ces points ont été confirmés en lisant le code :

- **Deux erreurs sont avalées en silence.** À la déconnexion, si la fermeture de session côté serveur échoue, l'application affiche quand même « déconnecté » alors que la session peut rester ouverte. Sur l'aperçu cartographique d'une parcelle, une erreur d'import de tracé est ignorée sans aucun message.
- **Deux actions annoncent un succès sans rien faire.** Le remboursement renvoie « en cours de traitement » sans jamais contacter le prestataire de paiement. Le rappel de facture renvoie « envoyé » alors qu'il se contente d'écrire une ligne de journal.
- **Le permis de construire a deux écrans en maquette.** Les pièces jointes ajoutées ne sont jamais enregistrées (et utilisent un identifiant aléatoire non fiable) ; les messages envoyés dans le fil de discussion ne partent pas.
- **Le numéro de téléphone est validé par cinq règles différentes** selon le formulaire : un même numéro est accepté ici et refusé là.
- **La date est reformatée à la main dans huit fichiers**, avec des variantes.
- **20 fichiers ne sont utilisés nulle part** (composants, deux hooks, trois fichiers de test laissés hors dossier de tests).
- **Six cartes de la RDC quasi identiques** (~1 900 lignes) ne diffèrent que par le niveau administratif affiché.
- Le contrôle qualité remonte 155 listes de dépendances React incomplètes et 64 désactivations explicites de ce contrôle, très concentrées sur les hooks du formulaire CCC.
- Les tests actuels passent (160 tests, 9 fichiers) et le projet compile sans erreur de type.

## Corrections prévues

**1. Fiabilité (priorité haute)**
- Journaliser et remonter à l'utilisateur les deux erreurs actuellement ignorées ; forcer un état de déconnexion cohérent en cas d'échec serveur.
- Remboursement : soit brancher réellement le prestataire, soit renvoyer un statut explicite « non pris en charge » au lieu d'un faux succès, et refléter ce statut en base.
- Rappel de facture : envoyer réellement l'email via le service déjà utilisé ailleurs dans le projet, sinon renvoyer un échec explicite.
- Permis de construire : enregistrer réellement les pièces jointes (stockage privé, nom de fichier `crypto.randomUUID()`) et enregistrer réellement les messages ; à défaut d'une table existante, désactiver visiblement l'écran plutôt que de simuler.

**2. Cohérence et doublons**
- Une seule règle de validation du téléphone (format RDC), utilisée par tous les formulaires, avec tests.
- Un seul utilitaire de formatage de date, réutilisé partout.
- Fusion des cartes RDC communes/territoires/quartiers en un composant paramétré.

**3. Suppression du code mort**
- Retrait des 20 fichiers inutilisés, après une vérification finale par recherche globale et compilation.

**4. Zones sensibles**
- Reprise des dépendances React manquantes et des désactivations de contrôle sur les parcours critiques uniquement (formulaire CCC, carte cadastrale, paiements, administration), en conservant le comportement actuel — chaque hook touché est couvert par un test avant modification.
- Vérification du nettoyage des écouteurs d'événements dans le gestionnaire de balayage tactile.

## Tests

- Compilation et contrôle qualité complets.
- Suite de tests existante (160) plus nouveaux tests : validation téléphone, formatage de date, hooks de cascade CCC modifiés.
- Parcours navigateur automatisé sur l'application locale : page d'accueil, carte cadastrale et recherche, ouverture du formulaire CCC, navigation entre onglets, relevé des erreurs de console.

## Détails techniques

- Nouveau `src/utils/phone.ts` (regex unique `^(\+?243|0)(8[1-9]|9[0-9])\d{7}$`) remplaçant les règles de `disputeUploadUtils.ts`, `useLandTitleRequest.tsx`, `building-permit-request/types.ts`, `RealEstateExpertiseRequestDialog.tsx`, `PermitValidationScore.tsx`.
- `formatDate` centralisé dans `src/utils/formatters.ts` ; suppression des copies dans `lib/pdf.ts`, `CadastralInvoice.tsx` et les sections `cadastral-document/*`.
- `DRCCommunesMap/DRCTerritoiresMap/DRCQuartiersMap` → composant unique paramétré par `level`.
- Edge functions concernées : `process-refund`, `send-invoice-reminder`.
- Fichiers supprimés : `CadastralStatsCounter`, `ServicesSection`, `InvoiceSourceLink`, `RequestAuditTimeline`, `UserSearchSelect`, `LockedServiceOverlay`, `PermitPaymentDialog`, `VerificationButton`, `shared/DataTable`, `AdminStatisticsCharts`, `UserStatisticsCharts`, `UserCCCCodes`, `UserProfileHeader`, `PermitRequestCard`, `UserContributionsStats`, `usePersistentPagination`, `useUserResourceList`, `testAreaHectaresValidation`, `testCadastralReport`, `testUserBuildingPermits`.
- Le typage relâché généralisé (~1 850 `any`) n'est pas repris en masse, conformément à la portée choisie.

## Livrable

Rapport détaillé (problèmes trouvés et corrigés, tests exécutés et résultats, confirmation du bon fonctionnement des composants) déposé dans vos fichiers.
