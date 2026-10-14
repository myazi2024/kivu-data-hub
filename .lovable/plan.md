# « Demander l'accès » : deux options — Accès à la demande ou Devenir Partenaire

## Objectif
Au clic sur **« Demander l'accès »** (page de découverte Données foncières), ne plus ouvrir directement le catalogue : présenter d'abord **deux options** :

1. **Accès à la demande** (équivalent français de « Pay as you go ») — ouvre le catalogue des données existant : l'utilisateur choisit et paie uniquement les visuels de base mis à sa disposition.
2. **Devenir Partenaire** — renvoie vers la page **Partenariat** (`/partnership`) pour introduire une demande expresse auprès de BIC ; le partenariat donne, en plus des données de base, l'accès aux données foncières critiques (analyses des hypothèques, litiges fonciers, valeurs marchandes des biens).

## Refonte prévue

1. **Fenêtre de choix**
   - Nouveau dialogue accessible `AccessChoiceDialog` (dans `src/components/access/`), ouvert par le bouton « Demander l'accès ».
   - Deux cartes côte à côte sur ordinateur, empilées sur mobile, chacune avec icône, titre, courte description et bouton :
     - **Accès à la demande** : « Choisissez les visuels qui vous intéressent et ne payez que ce dont vous avez besoin. » → ouvre le catalogue des données (fenêtre existante, empilée au-dessus).
     - **Devenir Partenaire** : « En plus des données de base, accédez aux analyses des hypothèques, aux litiges fonciers et aux valeurs marchandes des biens. » → navigation vers `/partnership`.
   - Fermeture : bouton Fermer et Échap uniquement (pas de clic extérieur), focus géré, retour du focus sur « Demander l'accès ».
   - La mention existante « Choisissez les visuels… ne payez que ce dont vous avez besoin » est déplacée dans la carte « Accès à la demande » ; sous le bouton principal, une phrase neutre : « Deux formules au choix, selon vos besoins. »

2. **Enchaînement**
   - « Accès à la demande » ferme la fenêtre de choix et ouvre `AnalyticsCatalogDialog` (état contrôlé existant) ; à la fermeture du catalogue, on revient à la page de découverte.
   - « Devenir Partenaire » ferme la fenêtre et navigue vers `/partnership` (parcours de demande existant, inchangé).

3. **Périmètre inchangé**
   - Aucun changement serveur : tables, tarifs, règles d'accès, `LAND_DATA_ROLES`, catalogue et paiement restent tels quels.
   - Le bouton flottant « Acheter d'autres visuels » (profils avec achats) continue d'ouvrir directement le catalogue, sans passer par le choix.
   - Page de découverte toujours sur un seul écran ; classes sémantiques uniquement.

## Détails techniques
- `src/components/access/AccessChoiceDialog.tsx` (nouveau) : dialogue contrôlé, deux cartes, props `onSelectCatalog` / navigation `/partnership`.
- `src/components/access/LandDataAccessGate.tsx` : `LandDataAccessDenied` remplace le `trigger` direct par l'ouverture du choix ; état local `choiceOpen` / `catalogOpen`.
- Tests : étendre `LandDataAccessGate.test.tsx` (le bouton ouvre le choix, les deux options sont présentes, le lien Partenariat pointe vers `/partnership`) ; adapter le test existant qui attendait l'ouverture directe du catalogue.

## Vérification
- Ordinateur et mobile : ouverture du choix, les deux cartes lisibles, fermeture Échap/Fermer, focus correct.
- « Accès à la demande » ouvre le catalogue au-dessus de la page ; « Devenir Partenaire » mène à `/partnership`.
- Tests unitaires et typecheck ; contrôles authentifiés impossibles (Supabase externe) signalés comme non vérifiés.
