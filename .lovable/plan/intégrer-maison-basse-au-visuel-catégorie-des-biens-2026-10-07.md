# Intégrer « Maison basse » au visuel Catégorie des biens

## Correction

- Retirer le chiffre clé séparé **« Maisons basses »** : ce n’est pas un indicateur autonome.
- Alimenter le visuel **« Construction : Catégorie des biens »** avec la liste officielle du CCC, dans cet ordre :
  1. Appartement
  2. Villa
  3. Maison
  4. Maison basse
  5. Local commercial
  6. Immeuble/Bâtiment
  7. Entrepôt/Hangar
  8. Terrain nu
- Compter dans ce visuel les constructions principales et supplémentaires, conformément à la règle déjà retenue pour les graphiques par construction. « Terrain nu » reste compté depuis la parcelle principale, puisqu’une construction supplémentaire ne peut pas être un terrain nu.
- Conserver les filtres Analytics, les variables croisées, le titre et la configuration administrable du visuel.

## État vérifié

- « Maison basse » existe déjà dans la liste officielle des catégories du CCC.
- Le visuel actuel compte uniquement la catégorie principale des parcelles et exclut explicitement « Terrain nu ».
- Un chiffre clé séparé « Maisons basses » a été ajouté dans l’onglet Construction ; il sera supprimé de l’écran et de la configuration admin.

## Vérification

- Ajouter un test couvrant les huit catégories, leur ordre, les constructions supplémentaires et l’absence du chiffre clé séparé.
- Exécuter les tests Analytics ciblés, puis la suite complète et le contrôle du code.
