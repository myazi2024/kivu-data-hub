

# Audit du formulaire de demande d'expertise immobiliere

## Bugs identifies

### 1. `handleClose` ne reinitialise pas le building permit (majeur)
Lignes 927-1035 : `handleClose` oublie de reinitialiser `hasBuildingPermit`, `buildingPermitType`, `buildingPermitNumber`, `buildingPermitIssueDate`, `buildingPermitIssuingService` et `buildingPermitFile`. Apres fermeture et reouverture pour une autre parcelle, les anciennes valeurs d'autorisation de batir persistent.

### 2. `constructionType` valide par `getMissingFields` mais pas `propertyCategory` (logique)
Ligne 2154 : la validation verifie `constructionType` mais pas `propertyCategory`, alors que `propertyCategory` est le champ parent obligatoire dont depend toute la cascade. Un utilisateur peut ne pas selectionner de categorie et passer au recapitulatif.

### 3. `isTerrainNu` compare `constructionType` avec `'Terrain nu'` alors que c'est une valeur de `propertyCategory` (bug logique)
Ligne 1038 : `const isTerrainNu = propertyCategory === 'Terrain nu' || constructionType === 'Terrain nu'`. Or `CATEGORY_TO_CONSTRUCTION_TYPES['Terrain nu']` vaut `['Terrain nu']`, donc `constructionType` sera bien `'Terrain nu'`. Cependant, si l'utilisateur selectionne "Terrain nu" comme categorie mais que la cascade n'a pas encore rempli `constructionType`, le deuxieme test echoue. Ce n'est pas critique mais c'est fragile — seul le test sur `propertyCategory` devrait suffire.

### 4. `formData` ne contient pas `propertyCategory`, `constructionType`, `constructionNature`, `declaredUsage` (critique)
Lignes 675-744 : `handleProceedToPayment` construit `formData` mais omet les champs CCC :
- `propertyCategory` n'est pas envoye
- `constructionType` n'est pas envoye (seul `construction_quality: standing` est envoye, ce qui est faux — `standing` n'est pas `construction_quality`)
- `constructionNature` n'est pas envoye
- `declaredUsage` n'est pas envoye

Le `wall_material` est mappe a `constructionMaterials` (ligne 705), mais le schema DB attend probablement les materiaux de murs, pas les materiaux de construction CCC. C'est une confusion semantique.

### 5. Pas de validation du numero de telephone au format standard avant envoi (mineur)
Lignes 757-761 : le regex `^(\+?243|0)(8[1-9]|9[0-9])\d{7}$` est correct pour la RDC mais n'accepte pas les numeros avec indicatifs d'autres pays. Pas un bug mais une limitation.

### 6. `prefillDoneRef` n'est pas reinitialise a la fermeture via `onOpenChange(false)` direct (mineur)
Ligne 1034 : `handleClose` reinitialise `prefillDoneRef.current = false`, mais si le dialog est ferme via le bouton X (qui appelle `onOpenChange(false)` via la ligne 3248), `handleClose` est bien appele. OK — pas un bug.

### 7. `building_permit_document_url` ignore dans le recapitulatif
Le recapitulatif (section Documents, lignes 2776-2819) n'affiche pas le document d'autorisation de batir. L'utilisateur ne voit pas qu'il a joint un document de permis.

### 8. Duplication code paiement certificat vs paiement expertise
Les blocs de paiement Mobile Money + Stripe sont dupliques entre `renderPayment` (lignes 2864-2993) et le paiement d'acces au certificat (lignes 3156-3226). Meme pattern, meme UI, meme logique.

## Problemes de logique

### 9. `computeCompletion` compte les booleens dans `equipFields` (faux)
Ligne 2183-2190 : `equipFields` contient des booleens (`hasWaterSupply`, etc.). `filter(Boolean)` comptera `true` comme rempli et `false` comme non rempli. Mais `false` est une reponse valide (l'utilisateur a explicitement dit non). Le score penalise l'utilisateur qui n'a pas d'equipement.

### 10. `certificate_expiry_date` non utilise dans `renderExistingCertificateBlock`
Ligne 3072 : `checkCertificateValidity(existingCertificate.certificate_issue_date)` ne passe pas `certificate_expiry_date`, alors que le hook supporte le parametre. Le calcul de validite utilise le fallback +6 mois au lieu de la date reelle.

## Fonctionnalites absentes

### 11. Aucune validation des champs numeriques negatifs pour distances
Les champs `distanceToHospital`, `distanceToSchool`, `distanceToMarket` (lignes 1877-1911) utilisent `onChange={(e) => setX(e.target.value)}` sans le helper `handleNonNegativeChange`, contrairement aux autres champs numeriques. Un utilisateur peut entrer des valeurs negatives.

### 12. Pas de capture mobile pour les photos
Le champ photos de construction (ligne 2024) accepte `image/*` mais ne propose pas `capture="environment"` pour activer directement l'appareil photo sur mobile.

## Plan de corrections

| # | Severite | Action |
|---|----------|--------|
| 1 | Majeur | Ajouter reset building permit dans `handleClose` |
| 2 | Moyen | Ajouter `propertyCategory` dans `getMissingFields` obligatoires |
| 4 | Critique | Ajouter `propertyCategory`, `constructionType`, `constructionNature`, `declaredUsage` dans `formData` + verifier le mapping `wall_material` vs `constructionMaterials` |
| 7 | Mineur | Afficher le document de permis dans le recapitulatif |
| 9 | Moyen | Corriger `computeCompletion` pour compter les equipements differemment (ex: chaque checkbox = toujours 1 point rempli car repondu) |
| 10 | Mineur | Passer `certificate_expiry_date` dans `checkCertificateValidity` |
| 11 | Mineur | Utiliser `handleNonNegativeChange` pour les champs distance |
| 12 | Mineur | Ajouter `capture="environment"` sur l'input photo |

### Fichier impacte
- `src/components/cadastral/RealEstateExpertiseRequestDialog.tsx`

