

# Suppression de l'onglet "Fraude" des Analytics

## Constat

L'onglet "Fraude" dans les données foncières affiche des données issues de la table `fraud_attempts`, mais ces données ne proviennent d'aucun formulaire utilisateur. Elles sont uniquement générées par le système anti-fraude interne et les données de test. L'onglet doit être retiré du dashboard Analytics.

**Note** : La table `fraud_attempts` et la logique de détection de fraude dans `AdminFraudDetection.tsx` et `useCadastralContribution.tsx` restent intactes — seul l'onglet Analytics est supprimé.

## Modifications

### 1. Supprimer le composant `FraudAttemptsBlock`
- **Supprimer** le fichier `src/components/visualizations/blocks/FraudAttemptsBlock.tsx`

### 2. `ProvinceDataVisualization.tsx`
- Retirer l'import de `FraudAttemptsBlock`
- Retirer l'icône `ShieldAlert` de `ICON_MAP`
- Retirer l'entrée `'fraud'` de `BLOCK_MAP`

### 3. `useAnalyticsChartsConfig.ts`
- Retirer l'entrée `'fraud'` du `TAB_FILTER_CONFIG`
- Retirer le bloc `'fraud'` du `ANALYTICS_TABS_REGISTRY`

### 4. `useLandDataAnalytics.tsx`
- Retirer `fraudAttempts` de l'interface `LandAnalyticsData`
- Retirer la requête `fetchAll('fraud_attempts', ...)` du `Promise.all`
- Retirer `fraudAttempts` de l'objet retourné

### 5. `crossVariables.ts`
- Retirer le bloc `'fraud'` du registre de croisements

### 6. Migration SQL
- Supprimer les entrées `analytics_charts_config` existantes pour `tab_key = 'fraud'` (nettoyage DB)

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/FraudAttemptsBlock.tsx` | Supprimer |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Retirer import + map entries |
| `src/hooks/useAnalyticsChartsConfig.ts` | Retirer config fraud |
| `src/hooks/useLandDataAnalytics.tsx` | Retirer fetch + type |
| `src/config/crossVariables.ts` | Retirer bloc fraud |
| Migration SQL | DELETE analytics_charts_config WHERE tab_key='fraud' |

