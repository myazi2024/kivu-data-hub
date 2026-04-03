

# Audit & Refonte du PDF de la Fiche Cadastrale

## Constat de l'audit

La fiche cadastrale affichée à l'écran (`CadastralDocumentView`) est riche et bien structurée avec 7 sections modulaires. En revanche, le PDF généré par `generateCadastralReport` dans `src/lib/pdf.ts` est significativement appauvri :

| Donnée | Écran | PDF |
|--------|-------|-----|
| Type de titre + référence + date émission | Oui | Partiel (type seulement) |
| Adresse textuelle (location) | Oui | Non |
| Usage déclaré, bail, standing | Oui | Non |
| Subdivision | Oui | Non |
| Surface mesurée GPS + variance | Oui | Non |
| Propriétaire WhatsApp | Oui | Non |
| Statut juridique propriétaire | Oui | Non |
| Construction (type, nature, matériaux, année) | Oui | Non |
| Autorisations de bâtir (tableau complet) | Oui | 1 ligne seulement |
| Localisation complète (avenue, n° maison, village...) | Oui | Partiel |
| Dimensions des côtés + orientation | Oui | Non |
| Croquis SVG du terrain | Oui | Non |
| Historique bornage (tableau) | Oui | 1 ligne seulement |
| Taxes foncières (tableau détaillé) | Oui | Résumé 1 ligne |
| Hypothèques (tableau détaillé) | Oui | Résumé 1 ligne |
| Litiges fonciers | Oui | Absent |
| Documents joints (titre, PV, reçus) | Oui | Absent |
| En-tête RDC officiel | Oui | Basique |
| Badge litige | Oui | Absent |
| Disclaimer complet | Oui | Minimal |

## Plan de refonte

### 1. Restructurer `generateCadastralReport` en sections miroir de l'écran

Réécrire la fonction pour produire un PDF professionnel multi-pages avec toutes les sections :

**Page 1 — Couverture**
- En-tête officiel RDC + BIC (logo Landmark, même style que `DocumentHeader`)
- Titre "FICHE CADASTRALE" + N° parcelle + date
- Badge type (Section Urbaine/Rurale) + badge litige si applicable
- QR code de vérification

**Page 2 — Identification & Propriétaire**
- Section 1 : Identification complète (type titre, référence, date émission, adresse, superficie déclarée + mesurée avec variance, usage, bail, standing, subdivision)
- Section 2 : Propriétaire actuel (nom, statut juridique, depuis, WhatsApp)

**Page 3 — Construction, Localisation & Bornage**
- Section 3 : Construction (type, nature, matériaux, année) + tableau autorisations de bâtir complet
- Section 4 : Localisation complète (province, ville/territoire, commune/collectivité, quartier, avenue, n° maison, GPS) + tableau des côtés avec dimensions/orientations + historique de bornage

**Page 4 — Historique & Obligations**
- Section 5 : Historique de propriété (tableau complet, pas limité à 3)
- Section 6 : Obligations financières — taxes foncières (tableau) + hypothèques (tableau avec statuts)

**Page 5 — Litiges & Authentification**
- Section 7 : Litiges fonciers (tableau complet si payé)
- Section 8 : Services inclus dans l'achat
- Bloc d'authentification (ID unique + QR code + date)
- Disclaimer complet (même texte que `DocumentFooter`)

### 2. Améliorations techniques du PDF

- Utiliser `autoTable` pour tous les tableaux (taxes, hypothèques, permis, bornage, litiges, historique) au lieu de texte brut
- Ajouter un en-tête et pied de page cohérents sur chaque page (numérotation dynamique basée sur le nombre réel de pages)
- Gestion automatique des sauts de page quand le contenu dépasse
- Sections verrouillées : afficher "Section non incluse dans votre achat" pour les services non payés (comme à l'écran)
- Inclure les coordonnées GPS complètes (toutes les bornes, pas limité à 4)

### 3. Fichiers modifiés

- **`src/lib/pdf.ts`** : Réécriture complète de `generateCadastralReport` (~300 lignes) avec les nouvelles sections structurées, tableaux `autoTable`, en-tête officiel, et footer avec disclaimer

Aucun autre fichier ne nécessite de modification — le bouton "Télécharger PDF" dans `DocumentToolbar` appelle déjà `onDownloadReport` qui déclenche `generateCadastralReport`.

