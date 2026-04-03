

# Animations et transitions pour la Présentation BIC

## Problème

Actuellement, le changement de slide est instantané (`<CurrentSlide />` est simplement remplacé). Aucune transition entre slides, aucune animation d'entrée sur les éléments internes (titres, cartes, icônes). La présentation manque de dynamisme.

## Solution

Deux systèmes complémentaires :

### 1. Transitions entre slides (slide-level)

Ajouter une transition de type **fade + slide horizontal** lors du changement de slide. L'approche :

- Tracker la **direction** de navigation (avant/arrière) via un state `direction`
- Utiliser une **clé React** (`key={current}`) sur un wrapper de transition pour déclencher le re-mount
- Appliquer des classes CSS d'animation : le slide entrant glisse depuis la droite (ou la gauche selon la direction) avec un fade-in, durée ~400ms

Implémentation CSS pure (pas de librairie) :
- Deux keyframes : `slide-in-from-right` et `slide-in-from-left`
- Le wrapper du slide reçoit dynamiquement la classe selon `direction`

### 2. Animations d'éléments internes (element-level)

Ajouter des animations d'apparition progressive aux éléments clés à l'intérieur de chaque slide, déclenchées à l'entrée du slide :

- **Titres** : fade-in + slide-up avec un léger délai
- **Sous-titres/descriptions** : même animation, délai +100ms
- **Cartes/grilles** : apparition échelonnée (staggered), chaque carte arrive avec un délai incrémental de 100ms
- **Icônes principales** (ServiceSlideLayout) : scale-in avec léger rebond
- **Statistiques/chiffres** : fade-in depuis le bas

Approche : créer un composant utilitaire `AnimateIn` qui wrape un élément et applique une animation CSS avec un `delay` configurable. Utiliser `animation-fill-mode: both` pour maintenir l'état initial (invisible) avant le délai.

### Détails techniques

**Fichier modifié : `src/pages/PitchPartenaires.tsx`**

1. **Nouveau composant `AnimateIn`** (~10 lignes) : wrapper qui applique une classe d'animation avec un `style={{ animationDelay }}`. Variantes : `fade-up`, `fade-in`, `scale-in`, `slide-left`, `slide-right`.

2. **Nouveau composant `SlideTransition`** (~15 lignes) : wrapper autour de `<CurrentSlide />` avec `key={current}` et classe d'animation directionnelle.

3. **State `direction`** : ajouté au composant principal, mis à jour dans `goTo()` selon si l'index cible est supérieur ou inférieur au courant.

4. **Keyframes CSS dans tailwind.config.ts** : ajouter `slide-in-right`, `slide-in-left` et `stagger-fade-up`.

5. **Application dans les slides** : wrapper les titres, descriptions, grilles et icônes dans `<AnimateIn>` avec des délais échelonnés. Principalement dans :
   - `SlideWrapper` (titre/sous-titre génériques)
   - `ServiceSlideLayout` (icône + features)
   - Les slides à grilles (SlideContext, SlideServices, SlidePricing, etc.)

**Fichier modifié : `tailwind.config.ts`**
- Ajout de 4 keyframes et animations correspondantes

### Résultat attendu

- Transition fluide de glissement horizontal entre les slides
- Les éléments de chaque slide apparaissent progressivement (titres d'abord, puis contenu, puis cartes échelonnées)
- Aucune dépendance externe ajoutée — CSS pur + React key trick

