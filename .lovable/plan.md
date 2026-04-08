

# Rendre la gestion des KPIs plus visible dans Config Graphique

## Constat

Les KPIs **sont** deja configurables dans le mode "Graphiques" de Config Graphique. Quand on selectionne un onglet (ex: "Titres fonciers"), une section "Indicateurs KPI (6)" apparait en haut du panneau de droite, avec :
- Toggle visibilite (afficher/masquer chaque KPI)
- Edition du titre personnalise
- Reordonnancement (fleches haut/bas)
- Boutons "Tout afficher" / "Tout masquer"

Le probleme : cette section est noyee dans la vue "Graphiques", sans indication claire dans l'interface qu'elle existe. L'utilisateur doit d'abord passer en mode "Graphiques", puis selectionner un onglet, puis scroller pour voir les KPIs.

## Proposition

Ajouter un **5e mode "KPIs"** dans la barre de modes de Config Graphique (a cote de Onglets / Graphiques / Filtres / Croisements) qui offre une vue dediee a la gestion des KPIs de tous les onglets.

### Fichier : `src/components/admin/AdminAnalyticsChartsConfig.tsx`

1. Ajouter le bouton "KPIs" dans la barre de modes (entre "Onglets" et "Graphiques")
2. Creer une vue `viewMode === 'kpis'` qui affiche :
   - Un selecteur d'onglet a gauche (comme pour les graphiques)
   - A droite, uniquement les KPIs de l'onglet selectionne, avec les memes controles existants (visibilite, titre, ordre)
   - Un apercu visuel montrant les 6 cases telles qu'elles apparaissent dans Analytics
3. Conserver les KPIs dans la vue "Graphiques" egalement (pas de regression)

### Detail technique

- Le state `viewMode` passe de `'tabs' | 'charts' | 'filters' | 'cross'` a `'tabs' | 'kpis' | 'charts' | 'filters' | 'cross'`
- La vue KPIs reutilise les memes composants (`ItemEditor`, `toggleAll('kpi', ...)`) deja utilises dans la section KPI du mode Graphiques
- L'apercu utilise le composant `KpiGrid` existant pour montrer un rendu fidele

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/admin/AdminAnalyticsChartsConfig.tsx` | Modifie — ajout mode KPIs |

**Impact** : ~60 lignes ajoutees dans 1 fichier. Aucune migration, aucun changement fonctionnel sur le rendu Analytics.

