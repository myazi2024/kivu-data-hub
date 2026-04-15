

# Ajout du sous-bloc "Capacite d'accueil" + Audit CCC

## Fonctionnalite demandee

Apres "Annee de construction" dans l'onglet Infos > Construction, ajouter un sous-bloc **Capacite d'accueil** visible si la categorie de bien n'est PAS "Terrain nu". Ce bloc contient :

- **"Est-il habite ?"** (Oui / Non)
- Si **Oui** :
  1. "Combien de personnes y vivent ?" (champ numerique)
  2. "Quelle est sa capacite d'accueil ?" (champ numerique)
- Si **Non** :
  1. "Quelle est sa capacite d'accueil ?" (champ numerique)

## Plan d'implementation

### 1. Migration Supabase
Ajouter 3 colonnes sur `cadastral_contributions` et `cadastral_parcels` :
- `is_occupied` (boolean, nullable)
- `occupant_count` (integer, nullable)
- `hosting_capacity` (integer, nullable)

### 2. Interface de donnees (`useCadastralContribution.tsx`)
- Ajouter `isOccupied?: boolean`, `occupantCount?: number`, `hostingCapacity?: number` dans `CadastralContributionData`
- Ajouter le mapping snake_case dans `buildContributionPayload`

### 3. Etat du formulaire (`useCCCFormState.ts`)
- Reinitialiser les 3 champs dans `handleClose` et `resetConstructionBlock`
- Charger depuis la DB en mode edition (`fetchContribution`)
- Persister dans `saveFormDataToStorage` / `loadFormDataFromStorage`
- Inclure dans `dataToSubmit`
- Ajouter au scoring `calculateCCCValue` (1 point pour `isOccupied` repondu, 1 point bonus si occupantCount ou hostingCapacity rempli)

### 4. UI dans GeneralTab (`GeneralTab.tsx`)
- Apres le Select "Annee de construction" (ligne 1061), inserer le sous-bloc conditionnel avec :
  - Un separateur visuel et un titre "Capacite d'accueil" avec icone
  - Boutons Oui/Non pour "Est-il habite ?"
  - Champs numeriques conditionnels (min=1)

### 5. Recapitulatif (`ReviewTab.tsx`)
- Afficher "Habite : Oui/Non", "Occupants : X", "Capacite d'accueil : X personnes" dans la section Construction

### 6. Propagation admin (trigger d'approbation)
- Verifier/ajouter la propagation de `is_occupied`, `occupant_count`, `hosting_capacity` vers `cadastral_parcels` dans le trigger d'approbation existant

## Audit CCC (a joindre apres implementation)

Un audit complet du formulaire CCC sera realise apres l'ajout de cette fonctionnalite.

## Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `supabase/migrations/new.sql` | 3 colonnes sur 2 tables |
| `src/hooks/useCadastralContribution.tsx` | Interface + payload |
| `src/hooks/useCCCFormState.ts` | State, reset, load, save, scoring, submit |
| `src/components/cadastral/ccc-tabs/GeneralTab.tsx` | UI du sous-bloc |
| `src/components/cadastral/ccc-tabs/ReviewTab.tsx` | Affichage recapitulatif |

