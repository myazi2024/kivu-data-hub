# Compléter la carte des circonscriptions foncières sur l’Accueil

## Résultat attendu
- Lorsqu’une circonscription est sélectionnée et que la carte zoome, afficher dans la carte « Circonscription foncière de [nom] ». Garder le libellé lisible sans masquer le bouton de retour ni empêcher les interactions avec la carte.
- Dans la zone d’informations sous la carte, conserver la province et le nombre de parcelles et ajouter, pour cette circonscription, le nombre de **services cadastraux et fonciers délivrés** et de **litiges fonciers répertoriés**. Afficher ces trois valeurs au survol, au focus et après sélection.
- Conserver les limites déjà identifiées, les zones grisées, le zoom et la disposition compacte de l’Accueil.

## Mise en œuvre technique
- Étendre les agrégats par circonscription côté serveur, sans transmettre de données de parcelles, de personnes ou de litiges au navigateur. Attribuer les services et litiges à une circonscription par la parcelle liée ; limiter les services aux accès délivrés liés à une facture payée, conformément au compteur actuel de l’Accueil, et exclure les données de test. Vérifier les jointures et les cas de parcelle introuvable avant d’établir les requêtes finales ; ne pas attribuer arbitrairement ces cas.
- Exposer uniquement les trois dictionnaires de nombres dans la réponse publique existante. Conserver les fonctions de comptage privées au rôle serveur ; signaler « indisponible » lorsqu’un agrégat échoue, sans présenter un zéro inventé.
- Adapter la carte pour afficher le nom à l’intérieur de la zone cartographique seulement pendant le zoom, et réorganiser la ligne d’informations sans débordement sur téléphone ni augmentation inutile de la hauteur sur ordinateur.
- Vérifier les comptes sur quelques circonscriptions, dont celles à zéro, ainsi que les états indisponibles ; tester survol, clavier, clic/retour et affichage mobile et ordinateur.
