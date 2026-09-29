# Affiner l’Accueil et afficher les indicateurs BIC

## Résultat attendu
- Retirer « BIC · Informations cadastrales en RDC » ainsi que la ligne et les libellés « Territoire · RDC » et « 26 provinces » au-dessus de la carte. Remonter le contenu dans l’espace libéré.
- Remplacer les trois repères de la référence (Communes, Parcelles, Millésime) par **Parcelles enregistrées**, **Services délivrés** (nombre) et **Litiges fonciers répertoriés**. Conserver la charte BIC, la carte provinciale interactive et les liens existants.
- Afficher pour chacun une valeur de présentation réglable dans **Admin > Apparence** tant que son total réel ne dépasse pas **10 000** ; au-delà, afficher automatiquement son total réel. Le basculement est indépendant pour chaque indicateur. Aucune mention spéciale sur les chiffres de présentation, conformément au choix retenu.
- Sur téléphone, rendre la carte, le texte, les actions, les indicateurs et la sélection de province lisibles et faciles à utiliser, notamment sur les écrans courts, sans débordement horizontal.

## Mise en œuvre technique
- Ajouter trois valeurs numériques configurables aux réglages existants de l’Accueil dans `app_appearance_config`, avec contrôles entiers non négatifs dans l’administration et lecture sur l’Accueil. Ne pas ouvrir l’accès aux données sensibles pour obtenir les totaux.
- Vérifier les sources et les règles d’accès actuelles avant de compter les parcelles, les services réellement délivrés et les litiges répertoriés ; utiliser des agrégats publics limités aux nombres, sans détails personnels ni données de test. Établir une définition cohérente de « service délivré » à partir des enregistrements réellement finalisés, et ne pas confondre consultations, commandes ou factures impayées avec des prestations délivrées. Le seuil s’applique aux totaux réels, strictement supérieurs à 10 000. Si la lecture échoue, garder la valeur réglée, sans annoncer un faux total réel.
- Rééquilibrer seulement la première section de l’Accueil : supprimer les éléments nommés, resserrer les espacements et ajuster les tailles selon l’écran. Ne pas modifier les autres sections ni les règles des services.
- Vérifier les valeurs administrées et le basculement de chaque indicateur au seuil, l’affichage mobile/intermédiaire/ordinateur, le choix des provinces, les liens et les tests de régression.
