

# Adaptation mobile de la Présentation BIC

## Problème

Les slides sont rendus dans un conteneur à hauteur fixe (`h-[calc(100dvh-4rem)]`) avec `overflow-hidden` sur le `SlideWrapper`. Sur mobile (390px), le contenu déborde et est coupé : textes, grilles et cartes sont invisibles. De plus, les 29 points de navigation débordent horizontalement.

## Solution

Deux axes : (1) rendre les slides scrollables sur mobile, (2) adapter la navigation.

### 1. SlideWrapper — scroll mobile

Remplacer `overflow-hidden` par `overflow-y-auto` sur mobile pour permettre le défilement vertical du contenu de chaque slide :

```
// Avant
<div className="relative w-full h-full flex flex-col overflow-hidden">

// Après  
<div className="relative w-full h-full flex flex-col overflow-y-auto md:overflow-hidden">
```

### 2. Navigation bottom bar — dots → compteur sur mobile

Remplacer les 29 dots par un simple compteur texte sur mobile (les dots restent visibles sur `md+`) :

- Masquer les dots avec `hidden md:flex`
- Le compteur `{current+1}/{slides.length}` est déjà affiché — il suffira sur mobile

### 3. Réductions typographiques et padding sur mobile

Ajuster les slides les plus denses pour que le contenu tienne mieux sur petit écran :

- `ServiceSlideLayout` : réduire l'icône de `w-40 h-40` à `w-24 h-24` sur mobile, et passer le layout en colonne inversée (icône en haut, texte en dessous)
- Réduire les `py-10` en `py-4` et `px-6` en `px-4` sur les slides les plus denses
- Réduire les titres `text-3xl` en `text-xl` sur mobile

### 4. Boutons de navigation latéraux

Augmenter la zone de touche (44px minimum) et ajuster le positionnement pour ne pas chevaucher le contenu sur mobile.

### Fichier modifié

- **`src/pages/PitchPartenaires.tsx`** : SlideWrapper, ServiceSlideLayout, navigation bar, et ajustements de padding/taille sur les slides les plus denses.

