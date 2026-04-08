
## Audit ciblé — pourquoi l’utilisateur ne voit pas les analytics test

Le hook analytics n’est plus le problème principal :
- `DRCInteractiveMap.tsx` lit bien `isTestRoute`
- `useLandDataAnalytics(isTestRoute)` est déjà branché sur `/test/map`
- la route miroir `/test/map` existe déjà dans `App.tsx`

Le vrai blocage est le parcours utilisateur :
- dans `AdminTestMode.tsx`, le lien générique “Accéder à l’environnement de test” ouvre `/test/cadastral-map`, pas l’écran analytics
- ensuite, la navigation globale (`src/components/ui/navigation.tsx`) reste câblée en dur vers `/map`, `/cadastral-map` et `/mon-compte`
- donc dès que l’utilisateur clique “Données foncières” depuis l’environnement test, il sort de `/test/*` et revient en production, ce qui masque les données `TEST-*`

## Plan de correction

### 1. Rendre la navigation sensible au contexte test
**Fichier :** `src/components/ui/navigation.tsx`

- utiliser `useTestEnvironment()`
- construire les liens de navigation avec préfixe `/test` quand `isTestRoute === true`
- couvrir au minimum :
  - `Données foncières` → `/test/map`
  - `Carte cadastrale` → `/test/cadastral-map`
  - `Mon compte` → `/test/mon-compte`
- laisser `Accueil` et `Admin` inchangés

Effet attendu :
- depuis n’importe quelle page test, le menu conserve l’utilisateur dans l’environnement test
- les visuels analytics continuent donc à consommer les données `TEST-*`

### 2. Corriger le point d’entrée depuis l’admin
**Fichier :** `src/components/admin/AdminTestMode.tsx`

- remplacer le lien unique actuel par une entrée plus claire
- faire de `/test/map` le point d’entrée principal pour tester les visuels analytics
- conserver un accès explicite à `/test/cadastral-map` si on veut aussi tester la recherche cadastrale

Recommandation UX :
- soit renommer le lien actuel en “Ouvrir Analytics (test)”
- soit afficher 2 liens :
  - `Analytics / Données foncières (test)`
  - `Carte cadastrale (test)`

### 3. Harmoniser le guide du mode test
**Fichier :** `src/components/admin/test-mode/TestModeGuide.tsx`

- mettre en avant `/test/map` comme écran principal pour vérifier les graphiques, KPIs et filtres
- garder `/test/cadastral-map` comme second parcours de test
- expliciter que les visuels analytics test ne sont visibles que dans `/test/*`

## Détails techniques

### Fichiers concernés
- `src/components/ui/navigation.tsx`
- `src/components/admin/AdminTestMode.tsx`
- `src/components/admin/test-mode/TestModeGuide.tsx`

### Ce qu’on ne change pas
- pas de migration SQL
- pas de changement RLS
- pas de retouche du hook `useLandDataAnalytics` sauf si une vérification finale révèle un cas résiduel

## Résultat attendu après implémentation

1. L’admin active le mode test
2. Il clique sur l’accès test depuis l’admin
3. Il arrive sur `/test/map`
4. Les KPIs, graphiques et filtres analytics affichent les données `TEST-*`
5. S’il navigue ensuite avec le menu, il reste dans `/test/*`
6. La production `/map` continue d’exclure les données test

## Vérifications à faire

- depuis `/admin?tab=test-mode`, ouvrir l’environnement test et vérifier que l’entrée principale mène à `/test/map`
- sur `/test/map`, confirmer la présence de la bannière test et de visuels alimentés par les données générées
- depuis `/test/cadastral-map`, cliquer “Données foncières” et vérifier qu’on arrive bien sur `/test/map`
- depuis `/test/map`, cliquer “Carte cadastrale” et vérifier qu’on reste sur `/test/cadastral-map`
- vérifier enfin que `/map` hors test n’affiche toujours aucune donnée `TEST-*`
