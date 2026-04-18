
## Test étape 1 (fix 3.5 + 3.8) en preview

L'utilisateur veut valider manuellement les deux fixes appliqués dans `useCCCFormState.ts` avant d'enchaîner avec l'extraction des sous-hooks.

### Scénarios à exécuter dans la preview

**Scénario A — Fix 3.5 : guard sync `currentOwners` → `previousOwners[last].endDate`**
1. Ouvrir le formulaire CCC (depuis /cadastral-map ou catalogue Actions).
2. Aller à l'onglet **Propriété**.
3. Ajouter un propriétaire précédent (previousOwner) avec une `endDate` vide.
4. Renseigner `currentOwners[0].since` = `2020-01-15` → vérifier que `previousOwners[last].endDate` se remplit automatiquement avec cette date.
5. Modifier `currentOwners[0].firstName` plusieurs fois (taper du texte) → **résultat attendu** : `previousOwners[last].endDate` reste à `2020-01-15` et n'est PAS ré-écrasée à chaque frappe.
6. Si l'utilisateur a manuellement édité `endDate` à une autre valeur, elle doit être préservée tant que `since` ne change pas.

**Scénario B — Fix 3.8 : memoization de `getMissingFields`**
1. Ouvrir React DevTools → Profiler.
2. Démarrer un enregistrement, taper plusieurs caractères dans un champ texte (ex : `firstName`).
3. Arrêter l'enregistrement → vérifier que le hook `useCCCFormState` ne déclenche pas de recalculs lourds redondants. La liste des champs manquants doit être stable entre frappes ne touchant pas aux deps.
4. Naviguer entre onglets → `isTabComplete` / `isTabAccessible` doivent rester réactifs (les onglets passent au vert dès qu'ils sont complétés).

**Scénario C — Non-régression globale**
1. Remplir les 5 onglets de bout en bout, soumettre.
2. Recharger en cours de saisie → brouillon restauré (TTL/version OK, héritage Lot A).
3. Cascade géographique : changer Province → City/Municipality/Quartier se vident.
4. Cascade construction : changer Type → Nature/Usage se vident, Location injecté si éligible.

### Comment je procède
- `browser--navigate_to_sandbox` sur `/cadastral-map` (viewport 875×623 conservé).
- `browser--observe` pour identifier le bouton d'ouverture du formulaire CCC.
- `browser--act` pour : ouvrir le formulaire, naviguer aux onglets, remplir les champs des scénarios A et C.
- `browser--screenshot` après chaque scénario pour confirmer visuellement.
- Lecture des `browser--read_console_logs` à la fin pour repérer warnings/erreurs.

### Limites connues
- Le scénario B (Profiler React DevTools) ne peut pas être validé via l'automation : je vérifierai indirectement que les transitions UI restent fluides et que `isFormValidForSubmission` se met bien à jour quand un champ requis bascule.
- Si un blocage auth apparaît, je m'arrête et préviens l'utilisateur.

### Si un bug est détecté
- Je m'arrête immédiatement, documente la repro et propose un fix avant de toucher au code.

### Fichiers
- Aucun changement de code prévu — test uniquement.
