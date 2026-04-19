

## Mise à jour du popover d'aide du picklist « Type de titre de propriété »

### Cible
`src/components/cadastral/PropertyTitleTypeSelect.tsx`, lignes 102-113 (popover déclenché par l'icône `Info` à côté du label « Type de titre de propriété »).

### Contenu actuel
- Titre : « Titres de propriété en RDC »
- Texte : « Titre officiel délivré par les services cadastraux (pas un acte de vente/donation). »

### Nouveau contenu (reformulé pro)
- Titre : « Titre de propriété »
- Texte : « Le choix effectué indique quel document administratif ou titre foncier couvre cette parcelle dans les registres du service du cadastre de la zone concernée. »

Reformulation : « Le choix effectué indique » (plus neutre que « permet de savoir »), « du service du cadastre » (formulation administrative correcte en RDC), « de la zone concernée » (plus précis que « de la zone »).

### Hors scope
- Aucun changement aux popovers détaillés par type de titre (icône `Info` dans chaque ligne du select).
- Aucun changement à la consigne sous le picklist (déjà mise à jour précédemment).
- Aucune modification de logique, de types ou d'autres composants.

