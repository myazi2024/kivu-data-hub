

# Fix: Layout titre Config Graphiques + lien "Voir dans Analytics" cassé

## Problème 1 — Layout titre/sous-titre
Le titre "Configuration des graphiques Analytics" et sa description sont actuellement dans un `flex` horizontal (`items-center justify-between`) à côté des onglets de mode. Il faut restructurer pour que le titre/description soient au-dessus de la barre d'onglets, pas à côté.

## Problème 2 — Lien "Voir dans Analytics" → 404
Le bouton navigue vers `/analytics` (ligne 249), mais cette route n'existe pas dans `App.tsx`. Analytics est un onglet interne de la page Admin (`/admin` avec tab `analytics`). Le lien correct doit être `/admin?tab=analytics` (ou utiliser le mécanisme de tabs interne de la page Admin).

## Modifications

### Fichier : `src/components/admin/AdminAnalyticsChartsConfig.tsx`

**Layout (lignes 220-257)** : Restructurer le `CardHeader` pour empiler verticalement :
1. Titre + description (pleine largeur)
2. Barre d'onglets + boutons d'action (en dessous)

**Lien Analytics (ligne 249)** : Remplacer :
```
navigate(`/analytics${...}`)
```
par :
```
navigate(`/admin?tab=analytics`)
```

Cela redirigera vers la page Admin avec l'onglet Analytics pré-sélectionné.

