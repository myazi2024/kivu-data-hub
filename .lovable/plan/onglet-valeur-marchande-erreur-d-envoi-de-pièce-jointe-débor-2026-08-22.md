# Onglet « Valeur marchande » — erreur d'envoi de pièce jointe + débordement d'affichage

## 1. Erreur « new row violates row-level security policy » (bloquant)

Cause confirmée : le stockage privé `cadastral-documents` n'autorise l'écriture que si le **premier dossier du chemin est l'identifiant de l'utilisateur connecté**. Les trois zones d'envoi de l'onglet Valeur (photos de l'annonce de vente, rapport d'expertise, photos des locaux) enregistrent dans `sale-listings/…`, `appraisal-reports/…` et `market-listings/…` — sans ce préfixe. Chaque envoi est donc refusé.

Le reste du formulaire CCC (documents de propriété, reçus de taxe, autorisations de bâtir…) passe par un utilitaire qui ajoute correctement ce préfixe : l'onglet Valeur est le seul à ne pas le faire.

Deuxième problème lié : ces envois demandent une « adresse publique » alors que le stockage est privé. Même une fois l'enregistrement autorisé, les vignettes resteraient cassées.

Correctifs :
- Préfixer chaque chemin d'envoi de l'onglet Valeur par l'identifiant de l'utilisateur connecté, comme partout ailleurs dans le formulaire.
- Bloquer proprement l'envoi avec un message clair si la session a expiré, au lieu d'une erreur technique.
- Récupérer une adresse signée temporaire pour l'aperçu des images et du rapport, au lieu d'une adresse publique inopérante.
- Vérifier que la suppression d'une image (rollback) cible bien le nouveau chemin.

Aucune modification de base de données ni de règle de sécurité : les règles existantes sont correctes, c'est le code qui ne les respecte pas.

## 2. Le bas de l'onglet sort du cadre (affichage mobile)

En bas de l'onglet, les blocs « locaux proposés à la location » sont imbriqués sur plusieurs niveaux, chacun avec sa propre bordure et ses marges internes. Sur un écran étroit (360 px), la largeur cumulée dépasse le cadre du formulaire et provoque un débordement horizontal.

Correctifs :
- Réduire l'imbrication visuelle des blocs de locaux et alléger les marges internes sur petit écran.
- Autoriser la compression des colonnes (les conteneurs en ligne empêchent aujourd'hui le rétrécissement des champs et des libellés longs).
- Contenir le débordement au niveau du conteneur de l'onglet.
- Contrôle visuel après correction, en 360 px de large, pour confirmer l'absence de défilement horizontal.

## Détails techniques

- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` (l. 386-404, 651-664, 917-935) : passer `pathPrefix={`${user.id}/sale-listings`}` (idem `appraisal-reports`, `market-listings`), `isPublic={false}`, et résoudre l'aperçu via `createSignedUrl`.
- `src/components/shared/StorageFileUpload.tsx` : en mode privé, générer une adresse signée pour l'aperçu image plutôt que d'afficher le chemin brut ; garder le chemin comme valeur stockée.
- Vérifier la cohérence de `removeUploadedPath` / `trackUploadedPath` avec les nouveaux chemins.
- Mise en page : `min-w-0` sur les conteneurs flex des blocs locaux, padding `p-2 sm:p-3` au lieu de `p-2.5` cumulés, et suppression d'un niveau de carte imbriquée dans la section « locaux à louer ».

Note : les images d'annonces déjà envoyées avant ce correctif n'existent pas (tous les envois échouaient), aucune reprise de données n'est nécessaire.
