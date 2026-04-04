

# Ajout du service "Demander un titre foncier" dans le dropdown Actions

## Problème

Le service de demande de titre foncier existe déjà dans l'app (dialog `LandTitleRequestDialog` + `LandTitleTermsDialog`) mais n'est accessible que via le bouton flottant de notification sur la carte. Il manque en tant que raccourci dans le dropdown "Actions" de la parcelle sélectionnée.

## Solution

Ajouter une entrée `land_title_request` dans la configuration des actions et câbler le handler pour ouvrir le flux existant (termes → demande).

### Modifications

**1. `src/hooks/useParcelActionsConfig.tsx`**
- Ajouter une entrée dans `DEFAULT_ACTIONS` :
  - `key: 'land_title_request'`, label "Demander un titre foncier", description "Soumettre une demande de titre foncier", `displayOrder: 4`, `category: 'title'`, `badge: { type: 'none' }`
- Ajouter `ScrollText` dans les icônes par défaut

**2. `src/components/cadastral/ParcelActionsDropdown.tsx`**
- Ajouter une prop `onRequestLandTitle` (callback) au composant
- Ajouter `ScrollText` dans les imports Lucide
- Ajouter `land_title_request: ScrollText` dans `DEFAULT_ACTION_ICONS`
- Dans `getActionHandler`, mapper `'land_title_request'` vers `onRequestLandTitle`

**3. `src/pages/CadastralMap.tsx`**
- Passer la prop `onRequestLandTitle` au `ParcelActionsDropdown` qui déclenche `setShowLandTitleTermsDialog(true)` (le flux existant : termes d'abord, puis dialog de demande)

**4. Base de données** — Migration SQL
- Insérer la nouvelle action dans `parcel_actions_config` pour qu'elle soit persistée et configurable par l'admin

### Résultat
Le service apparaîtra dans le menu Actions entre "Gestion Hypothèque" et "Ajouter une autorisation", et ouvrira le même flux termes → demande de titre que le bouton existant.

