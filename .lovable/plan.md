

# Corriger la valeur par défaut du choix "Autorisation de bâtir" dans le formulaire CCC

## Problème

Dans l'onglet Infos du formulaire CCC, le bouton "Oui" (autorisation de bâtir) est coché par défaut car `permitMode` est initialisé à `'existing'` dans `useCCCFormState.ts`. L'utilisateur doit pouvoir choisir lui-même.

## Modifications

**Fichier** : `src/hooks/useCCCFormState.ts`

1. **Ligne 122** — Changer le type et la valeur initiale :
   ```
   useState<'existing' | 'request'>('existing')
   →
   useState<'existing' | 'request' | null>(null)
   ```

2. **Ligne 1028** (resetForm) — Réinitialiser à `null` au lieu de `'existing'`.

3. **Ligne 723** (getMissingFields) — Ajuster la condition pour ne vérifier les permis que si `permitMode === 'existing'` (inchangé, fonctionne déjà).

4. **Lignes 934/941** (submitForm) — Les conditions `=== 'existing'` et `=== 'request'` excluent déjà `null`, pas de changement nécessaire.

**Fichier** : `src/components/cadastral/ccc-tabs/GeneralTab.tsx`

5. **Lignes 1094-1097** — Les boutons utilisent déjà une comparaison stricte (`permitMode === 'existing'`), donc quand `permitMode` est `null`, aucun bouton ne sera mis en surbrillance. Aucun changement nécessaire ici.

**Impact** : 2 lignes modifiées dans 1 fichier (`useCCCFormState.ts`).

