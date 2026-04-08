

# Rendre le numéro de parcelle obligatoire et validé pour toutes les demandes

## Constat

Actuellement, le formulaire pose des questions intermédiaires :
- Pour `initial`/`conversion` : "Avez-vous une fiche parcellaire ?" (oui/non)
- Pour `renouvellement` : "Connaissez-vous le numéro SU/SR ?" (oui/non)

Si l'utilisateur répond "non", le formulaire est bloqué avec un message d'erreur. Si "oui", il doit chercher et sélectionner un numéro dans la base.

Le comportement souhaité est plus simple : **toujours exiger un numéro de parcelle valide** (existant en base) pour pouvoir avancer. Les questions intermédiaires deviennent inutiles.

## Modifications

### Fichier : `src/components/cadastral/LandTitleRequestDialog.tsx`

**a) Supprimer les questions intermédiaires** :
- Retirer les RadioGroup "Avez-vous une fiche parcellaire ?" (~L1149-1181)
- Retirer les RadioGroup "Connaissez-vous le numéro SU/SR ?" (~L1185-1217)
- Le champ de recherche de parcelle (~L1221) s'affiche dès qu'un `requestType` est sélectionné (plus besoin de `isParcelLinkedMode` comme condition)

**b) Simplifier `isParcelLinkedMode`** :
- Actuellement : `(renouvellement && knowsParcelNumber=yes) || ((initial||conversion) && hasFicheParcellaire=yes)`
- Nouveau : `true` dès qu'un `requestType` est sélectionné (ou simplement supprimer ce flag et toujours considérer le mode parcel-linked actif)
- Concrètement : `const isParcelLinkedMode = !!requestType;`

**c) Simplifier `isFormBlocked`** :
- Actuellement : bloqué si l'utilisateur dit "non" aux questions
- Nouveau : `const isFormBlocked = !requestType || !parcelValidated;`
- Les onglets Localisation, Mise en valeur, Documents, Frais, Envoi restent désactivés tant qu'aucune parcelle valide n'est sélectionnée

**d) Simplifier `isFormValid`** :
- Retirer les conditions sur `hasFicheParcellaire` et `knowsParcelNumber` (~L672-675)
- Remplacer par : `if (!parcelValidated) return false;`

**e) Adapter le label du champ de recherche** :
- Dynamique selon le type : "Numéro de la parcelle (SU ou SR) *" pour tous les types

**f) Nettoyer les states inutilisés** :
- `hasFicheParcellaire` et `knowsParcelNumber` ne sont plus nécessaires dans le formulaire (conserver dans le state pour compatibilité draft si besoin, ou nettoyer complètement)

### Message quand la parcelle n'est pas trouvée

Le message existant (~L1439-1470) qui s'affiche quand `parcelSearchResults.length === 0` reste pertinent. Il informe l'utilisateur que la parcelle n'existe pas en base et propose de contribuer via le formulaire CCC. Ce message bloque de facto l'avancement puisque `parcelValidated` reste `false`.

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/components/cadastral/LandTitleRequestDialog.tsx` | Suppression questions radio, simplification logique |

**Impact** : ~50 lignes supprimées, ~10 lignes modifiées dans 1 fichier. Aucune migration.

