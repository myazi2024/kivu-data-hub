

# Réécriture des cartes de la page Services

## Résumé

Réécrire le contenu statique des cartes dans `src/pages/Services.tsx` pour refléter les vrais services numériques de BIC : consultation cadastrale en ligne, carte interactive, rapports fonciers, etc.

## Modifications

**Fichier unique : `src/pages/Services.tsx`**

Remplacer les 8 services actuels (cartographie dynamique, analyse cadastrale, recettes fiscales, etc.) par des services correspondant à ce que l'application propose réellement :

| Icone | Titre | Description |
|-------|-------|-------------|
| Search | Recherche cadastrale | Recherchez n'importe quelle parcelle en RDC par numéro, propriétaire ou localisation |
| Map | Carte interactive | Visualisez les parcelles et données foncières sur une carte dynamique |
| FileText | Fiche parcellaire | Consultez les informations détaillées d'une parcelle : propriétaire, superficie, titre |
| Scale | Litiges fonciers | Accédez aux informations sur les litiges enregistrés sur une parcelle |
| Receipt | Contributions cadastrales | Historique des paiements et contributions liés à une parcelle |
| ShieldCheck | Certificat cadastral | Obtenez un certificat officiel avec les données cadastrales vérifiées |

Mise à jour du texte d'introduction :
- Titre : "Nos Services"
- Description : "Accédez aux informations cadastrales de n'importe quelle propriété en RDC. Nos services numériques vous permettent de consulter, vérifier et documenter les données foncières en quelques clics."

