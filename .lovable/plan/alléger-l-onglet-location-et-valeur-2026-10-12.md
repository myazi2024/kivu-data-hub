# Alléger l’onglet « Location et valeur »

## Résultat attendu

- Supprimer les quatre visuels suivants :
  - Prix de vente moyen par localité (top 10)
  - Loyer moyen par localité (top 10)
  - Top 10 biens les plus chers à la vente
  - Top 10 biens les plus chers à la location
- Supprimer les deux indicateurs suivants :
  - Biens recensés
  - Avec autorisation de bâtir
- Conserver tous les autres indicateurs et visuels de l’onglet, notamment le visuel combiné « Prix de vente et rendement par localité » et les analyses avec/sans autorisation.

## État vérifié

- Les six éléments sont actuellement déclarés dans le registre Analytics et rendus dans le bloc « Location et valeur ».
- Le bloc calcule encore quatre jeux de données exclusivement destinés aux visuels à retirer : prix et loyers moyens par localité, biens les plus chers à la vente et à la location.
- Les réglages enregistrés en base utilisent les clés `sale-by-location`, `rent-by-location`, `top-sale`, `top-rent`, `kpi-total` et `kpi-permit` pour cet onglet.
- La carte Analytics associée à l’onglet ne dépend d’aucun de ces six éléments.

## Mise en œuvre

1. Retirer les six éléments du registre Analytics afin qu’ils disparaissent aussi des réglages d’administration.
2. Retirer leur rendu, leurs calculs devenus inutiles et les imports associés dans le bloc « Location et valeur ».
3. Réordonner les éléments conservés pour maintenir une suite cohérente sans trous dans les réglages par défaut.
4. Supprimer uniquement les six réglages correspondants de cet onglet dans la base, sans toucher aux clés homonymes des autres onglets.
5. Vérifier qu’aucune référence orpheline ne reste, puis exécuter les tests Analytics et le contrôle du code.

## Détails techniques

- La suppression en base sera limitée à `tab_key = 'rental-market'` et aux six clés visées.
- Les fonctions d’agrégation partagées resteront disponibles si elles servent ailleurs ; seul le code mort propre à ce bloc sera retiré.
- Aucun calcul métier, filtre, contenu de carte ou autre onglet ne sera modifié.