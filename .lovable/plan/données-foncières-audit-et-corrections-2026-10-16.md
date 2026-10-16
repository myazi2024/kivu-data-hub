# Données foncières : audit et corrections

## Constats vérifiés
1. **Serveur — onglets retirés encore acceptés** : la fonction qui livre les données d'un onglet accepte encore 5 anciens onglets (`ownership`, `contributions`, `expertise`, `certificates`, `invoices`). Plus aucun écran ne les demande, mais ils restent appelables.
2. **Texte « Devenir Partenaire » trompeur** : il présente hypothèques, litiges et valeurs marchandes comme réservés aux partenaires, alors qu'ils se vendent aussi à l'unité, et qu'un partenaire a en réalité accès aux 8 onglets.
3. **Retour après paiement par carte** : on revient toujours sur la page catalogue séparée, même si l'achat a démarré depuis la carte (bouton flottant). L'accès est bien mis à jour, mais l'utilisateur perd sa page.
4. Pas de fichier ni d'export orphelin dans le module ; liste des 8 onglets cohérente entre menu, catalogue et administration.

## Corrections
1. **Migration** : retirer de la fonction de livraison les 5 anciens onglets ; tout onglet inconnu renvoie une erreur claire. Contrôles d'accès inchangés.
2. **Données importantes (pas exclusives)** :
   - Fenêtre de choix : Partenaire = accès complet aux 8 onglets sans achat à l'unité, avec mise en avant des données importantes (hypothèques, litiges, valeurs marchandes et leurs analyses croisées) et des profils visés : banques, institutions de microfinance, coopératives d'épargne et de crédit, assurances.
   - Catalogue : badge « Donnée importante » sur les onglets Hypothèque, Litiges fonciers et Location et valeur, avec un court lien « Accès complet ? Devenir Partenaire ». Ils restent vendus à l'unité.
3. **Retour de paiement par carte** : revenir sur la page d'origine (carte ou catalogue) avec le message de confirmation et la mise à jour de l'accès ; adresses de retour limitées au site.

## Vérifications
- Requête : un ancien onglet est refusé, un onglet actuel répond normalement.
- Tests mis à jour (fenêtre de choix, catalogue), contrôle des types, compilation.

## Détails techniques
- `get_analytics_tab_dataset` : suppression des branches CASE retirées, `RAISE` si `v_srcs IS NULL`.
- `AccessPlansDialog.tsx`, `AnalyticsCatalog.tsx` (liste `HIGHLIGHT_TABS = mortgages, disputes, rental-market`).
- `create-payment` : `return_path` relatif validé (commence par `/`, pas `//`), défaut `/donnees-foncieres/catalogue` ; gestion `?payment=` partagée dans un petit hook utilisé par `LandDataCatalog` et la page carte.
