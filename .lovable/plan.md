
## Plan : imposer hauteur ≥ 3 m pour chaque construction tracée

### Modification ciblée
Fichier : `src/components/cadastral/ParcelMapPreview.tsx` (bloc input Hauteur, l. 2801-2819)

1. **Input** : passer `min={3}`, garder `step={0.1}`, placeholder `"≥ 3"`.
2. **Validation visuelle** : `border-destructive` si `heightM == null || heightM < 3` (au lieu du seul `!shape.heightM`).
3. **Message d'aide** : afficher sous l'input `<p className="text-[10px] text-destructive">Hauteur minimale : 3 m</p>` quand invalide.
4. **Soumission** : repérer la validation existante du formulaire CCC (LocationTab/useCCCFormState) qui bloque l'étape suivante si une construction n'a pas de hauteur, et étendre la condition à `heightM < 3`. Si la règle de blocage n'existe pas encore au niveau soumission, l'ajouter dans le validator de l'onglet Localisation pour empêcher de passer à l'étape suivante.
5. **Cohérence admin/review** : aucun changement nécessaire (affichage seulement) — la donnée reste un nombre.

### Validation E2E
- Tracer une construction → saisir `2` → bordure rouge + message + bouton "Suivant" bloqué.
- Saisir `3` ou plus → champ valide, étape suivante autorisée.
- Vérifier que les constructions existantes avec hauteur < 3 m s'affichent en rouge à la réouverture.

### Fichiers
- `src/components/cadastral/ParcelMapPreview.tsx`
- Validator de soumission de l'onglet Localisation (à confirmer lors de l'implémentation : `ccc-tabs/LocationTab.tsx` ou `useCCCFormState`).
