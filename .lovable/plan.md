

# Ajouter des slides "Livrables Data" a la Presentation BIC

## Constat

La presentation couvre les services (collecte, recherche, titres, etc.) mais ne montre pas ce que l'application **produit** a partir des donnees collectees. Le module Analytics ("Donnees foncieres") offre 14 onglets avec des graphiques riches (tendances, comparaisons, cartographie choroplethe, KPIs derives) — aucun de ces livrables n'est presente aux partenaires.

## Slides a ajouter

Trois nouvelles slides, inserees apres "Programme CCC" (slide 18) et avant "Impact & Objectifs" (slide 19) :

### Slide A : "Cartographie des donnees foncieres"
- Titre : "Cartographie interactive des donnees foncieres"
- Visuel : grille de 4 cartes avec icones representant les couches (parcelles, titres, litiges, taxes)
- Points cles : carte choroplethe multi-niveaux (Province → Quartier), filtrage geographique, attenuation des zones hors perimetre, export des donnees spatiales
- Style : fond gradient avec illustration carte

### Slide B : "Tendances & Evolution"
- Titre : "Suivi des tendances en temps reel"
- Visuel : mockup de graphiques area/line montrant les courbes d'evolution
- Points cles : evolution temporelle par onglet (titres, parcelles, contributions, etc.), KPIs derives (surface moyenne, densite, taux de recouvrement), filtrage par periode et localisation
- Style : grille de 4-6 cards avec icones TrendingUp, BarChart3, Activity, Gauge

### Slide C : "Comparaison & Croisement"
- Titre : "Analyse comparative multi-variables"
- Visuel : representation de croisements (ex: Type x Statut, Genre x Usage)
- Points cles : croisement de variables configurable, comparaison entre zones geographiques, 14 domaines d'analyse (titres, parcelles, taxes, litiges, hypotheques, etc.), tableaux de bord personnalisables via l'admin
- Style : grille de 3 colonnes avec exemples concrets

## Modifications

### Fichier : `src/pages/PitchPartenaires.tsx`

- Ajouter 3 composants slides (~80 lignes chacun) : `SlideDataCartography`, `SlideDataTrends`, `SlideDataComparison`
- Les inserer dans le tableau `slides` apres `ccc` (index 17) avec les ids `data-cartography`, `data-trends`, `data-comparison`
- Style coherent avec les slides existantes (AnimateIn, SlideWrapper, icones Lucide, grilles cards)

### Fichier : `src/components/admin/AdminPitchConfig.tsx`

- Ajouter les 3 nouvelles entrees dans `DEFAULT_SLIDES` avec les bons `sort_order` (decaler les suivants de +3)

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/pages/PitchPartenaires.tsx` | +3 slides (~240 lignes), mise a jour du tableau slides |
| `src/components/admin/AdminPitchConfig.tsx` | +3 entrees dans DEFAULT_SLIDES, decalage sort_order |

**Impact** : ~250 lignes ajoutees dans 2 fichiers. Aucune migration.

