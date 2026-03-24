

# Suppression des données et indicateurs simulés dans l'espace admin

## Composants concernés

### 1. `PredictionsPanel.tsx` — Prédictions simulées (entier composant)

Le panneau "Prévisions statistiques" génère des prédictions à 7 jours via une régression linéaire naïve, détecte des "anomalies" par z-score, et produit des "recommandations" hardcodées. Tout est calculé côté client sans aucun modèle entraîné. C'est un simulateur, pas un outil analytique fiable. A supprimer.

### 2. `AdminSystemHealth.tsx` — Indicateurs simulés

- **"Pool de connexions"** : valeur estimée à partir de la latence (pas une mesure réelle du pool Supabase)
- **Edge Functions** : statut forcé à `'online'` sans aucune vérification
- **Score santé en %** : formule arbitraire basée sur la latence

Les mesures réelles (latence DB, latence Auth, latence Storage) sont utiles. Ce qui est simulé doit être supprimé.

### 3. `AdminDashboardOverview.tsx` — Onglet "Prédictions IA"

- L'onglet `"Prédictions IA"` référence `PredictionsPanel` et `SmartAlerts`
- Le label dit encore "Prédictions IA" (ligne 340)

### 4. `SmartAlerts.tsx` — Alertes associées aux prédictions

Consommé uniquement dans l'onglet Prédictions. Si les prédictions sont supprimées, les alertes perdent leur contexte.

## Plan de correction

### Etape 1 : Supprimer `PredictionsPanel.tsx`

Fichier entièrement simulé — aucune donnée réelle.

### Etape 2 : Nettoyer `AdminSystemHealth.tsx`

- Supprimer la carte "Santé estimée (latence)" (le bloc `connectionPool` avec sa `Progress` bar)
- Supprimer la métrique "Pool" de la grille de stats (3e carte)
- Changer le statut Edge Functions : afficher `'Statut non vérifié'` au lieu de `'online'`
- Conserver : latence DB, latence Auth, latence Storage, compteurs Tables/Enregistrements

### Etape 3 : Nettoyer `AdminDashboardOverview.tsx`

- Supprimer l'onglet "Prédictions IA" et son `TabsContent`
- Supprimer l'import de `PredictionsPanel` et `SmartAlerts`

### Etape 4 : Supprimer `SmartAlerts.tsx`

Plus utilisé après suppression de l'onglet Prédictions.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/admin/dashboard/PredictionsPanel.tsx` | Supprimer |
| `src/components/admin/dashboard/SmartAlerts.tsx` | Supprimer |
| `src/components/admin/AdminSystemHealth.tsx` | Retirer pool simulé + corriger Edge Functions |
| `src/components/admin/AdminDashboardOverview.tsx` | Retirer onglet Prédictions + imports |

4 fichiers : 2 suppressions, 2 nettoyages.

