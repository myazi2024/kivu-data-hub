# Carte des circonscriptions : retirer les informations redondantes après sélection

## Analyse : ce qui s'affiche aujourd'hui dans le bloc carte après un clic
1. **Petite légende en bas à gauche** (province) : nom de zone + Certif. enreg., Titres dem., Litiges, Sup. moy., et « Quartiers © OSM / HDX ». Ces 4 chiffres sont exactement ceux du tableau situé juste en dessous : doublon. La mention « Quartiers » est hors sujet sur la carte des circonscriptions. Elle masque en plus une partie de la carte.
2. **Bande de détails en bas de carte** : nom de la circonscription (déjà écrit dans la carte), province (déjà en tête du tableau), badge SU/SR, nombre de parcelles. Seuls le badge et le nombre de parcelles apportent quelque chose.
3. **Ligne « date — filigrane » + logo** collée au bas de la carte : utile seulement pour l'image partagée, elle chevauche la bande de détails.
4. **Boutons ronds en bas à droite** (réinitialiser, partager, plein écran, info) : utiles, à conserver.

## Corrections proposées
- Supprimer la petite légende en bas à gauche sur la carte des circonscriptions (elle reste sur les autres vues : communes, quartiers, territoires, où le tableau n'est pas forcément le même).
- Bande de détails : retirer le nom et la province ; garder une seule ligne compacte « SU - Urbaine · Parcelles enregistrées : N » (et l'indicateur du graphique actif s'il y en a un).
- Ligne date/filigrane : la remonter au-dessus de la bande (ou la placer en bas à gauche, en plus petit) pour qu'elle ne chevauche plus rien.
- Sans sélection : rien ne change (légende « Survolez ou sélectionnez… »).

## Détails techniques
- `DRCInteractiveMap.tsx` : condition `mapView !== 'districts'` ajoutée à l'affichage de `MapScopeLegend` ; contenu de `renderDetails` réduit (badge + parcelles + métrique profil) ; pied filigrane repositionné.
- `LandDistrictMap.tsx` inchangé (aussi utilisé à l'Accueil).
- Aucun changement serveur ni données.

## Vérification
- Tests, contrôle TypeScript, compilation. Vérification visuelle à faire de votre côté (page réservée aux rôles autorisés).
