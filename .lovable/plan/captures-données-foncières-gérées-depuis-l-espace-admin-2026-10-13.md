# Captures « Données foncières » gérées depuis l'espace admin

## Objectif
Permettre à un administrateur d'envoyer, remplacer ou retirer les deux captures (ordinateur et mobile) affichées sur la page de découverte des Données foncières, sans intervention dans le code.

## Côté admin (Apparence)
- Nouvelle section **« Page Données foncières »** dans l'écran Apparence existant.
- Deux zones d'envoi : **Capture ordinateur** (format paysage conseillé) et **Capture mobile** (format portrait conseillé), avec aperçu, bouton Remplacer et bouton Retirer (confirmation).
- Contrôle du fichier : image uniquement (PNG, JPG, WebP), 5 Mo maximum, nom de fichier unique.
- Rappel discret : ne pas utiliser de capture contenant des noms ou données personnelles.
- Enregistrement avec le bouton Enregistrer déjà présent, inscrit dans l'historique des modifications d'apparence.

## Côté page de découverte
- Si une capture est définie, elle remplace l'emplacement correspondant (proportions conservées, sans recadrage, texte alternatif « Aperçu des Données foncières »).
- Sinon, l'emplacement sobre actuel reste affiché.
- Ordinateur affiche la capture ordinateur, mobile la capture mobile ; si une seule existe, l'autre écran garde l'emplacement.

## Détails techniques
- Deux nouvelles clés dans `app_appearance_config` : `land_data_preview_desktop_url`, `land_data_preview_mobile_url` (même stockage public et même fonction d'envoi que le logo et l'image d'accueil ; écriture déjà réservée aux admins).
- `AdminAppearance.tsx` : chargement, envoi et sauvegarde des deux clés ; `useAppAppearance` : ajout des champs au type.
- `LandDataAccessGate.tsx` : lecture des deux clés via les réglages d'apparence chargés une fois, rendu `img` avec `object-contain`, chargement différé.
- Aucun changement des droits d'accès à la page Données foncières.
- Test mis à jour : emplacement affiché sans capture, image affichée quand l'URL est définie.

## Vérification
Typecheck, tests, build ; vérification visuelle admin signalée comme non possible sans session.
