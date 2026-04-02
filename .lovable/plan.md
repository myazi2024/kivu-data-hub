

# Page Pitch Partenaires — sous Media > Ressources

## Résumé

Créer une page `/pitch-partenaires` présentant l'application BIC aux partenaires d'affaires, avec 6 sections : hero/pitch, problème & solution, fonctionnalités clés, valeur ajoutée (chiffres/graphiques), business model, et appel à l'action avec formulaire de contact. Ajoutée au menu Media > Ressources et au routeur.

## Modifications

### 1. Nouvelle page `src/pages/PitchPartenaires.tsx`

Page complète avec Navigation + Footer, contenant :

- **Hero** : logo BIC + pitch one-liner + badge "Présentation Partenaires"
- **Problème & Solution** : deux colonnes (problème à gauche, solution à droite) avec icônes illustratives (AlertTriangle, CheckCircle2) et un schéma visuel simplifié (avant/après)
- **Fonctionnalités clés** : grille 3 colonnes avec icônes Lucide (Map, Search, Shield, FileText, BarChart3, Globe) — 6 fonctionnalités principales
- **Valeur ajoutée** : chiffres clés en cartes (parcelles numérisées, réduction litiges, temps de vérification) + section témoignages partenaires actuels
- **Business model / Opportunités** : 3 colonnes présentant les modèles (accès API, licence institutionnelle, co-développement) avec avantages partenaires
- **Appel à l'action** : bouton "Accéder à l'environnement test" (lien vers `/test/map`), bouton "Nous contacter" (mailto:contact@bic.cd), + formulaire de contact intégré (nom, email, organisation, message) avec validation
- **Zone vidéo** : placeholder avec icône Play pour intégrer une démo vidéo (iframe-ready)

Design : palette existante (primary/secondary du projet), typographie cohérente, responsive via Tailwind grid.

### 2. Route dans `src/App.tsx`

- Ajouter lazy import `PitchPartenaires`
- Ajouter `<Route path="/pitch-partenaires" element={<PitchPartenaires />} />`

### 3. Lien dans le menu Media > Ressources (`src/components/ui/navigation.tsx`)

- Ajouter dans `mediaColumns[1].items` (Ressources) : `{ name: 'Présentation BIC', href: '/pitch-partenaires', icon: Briefcase, description: 'Pitch pour partenaires d\'affaires' }`

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/pages/PitchPartenaires.tsx` | Créer |
| `src/App.tsx` | Ajouter route + lazy import |
| `src/components/ui/navigation.tsx` | Ajouter lien dans Ressources |

