

# Audit du bloc "Environnement sonore" — Bugs, manques et optimisations

## Bugs identifies

### 1. Fuite memoire microphone (critique)
Le composant `SoundEnvironmentBlock` demarre un `AudioContext`, un `MediaStream` et une boucle `requestAnimationFrame` mais **ne les arrete jamais au demontage**. Si l'utilisateur change d'onglet pendant l'enregistrement, le micro reste actif en arriere-plan. Il manque un `useEffect` de cleanup qui appelle `stopMeasurement()` au unmount.

### 2. `resetLocationBlock` ne reinitialise pas l'environnement sonore
La fonction reset (ligne 1486) remet a zero la province, GPS, bornes, servitudes, constructions, mais **oublie** `setSoundEnvironment('')` et `setNearbySoundSources('')`. Apres un reset, les anciennes valeurs sonores persistent.

### 3. Redondance labels dans ReviewTab
Le `ReviewTab` (ligne 333) duplique un dictionnaire inline `{ 'tres_calme': 'Tres calme', ... }` au lieu d'utiliser `SOUND_LABELS` deja importe dans le fichier. Risque de desynchronisation si les labels changent.

### 4. Mesure dB imprecise — echelle lineaire au lieu de logarithmique
La conversion `(avg / 255) * 100` (ligne 657) mappe lineairement les amplitudes brutes sur 0-100 "dB". Ce n'est pas une echelle decibel reelle. Les vrais dB utilisent `20 * log10(rms / reference)`. Le resultat actuel est trompeur : un environnement a 60 dB reels sera categorise incorrectement.

### 5. Le dropdown du SuggestivePicklist se ferme au clic hors container mais le portal est hors du container
Le listener `mousedown` (ligne 150) verifie `containerRef.current.contains(e.target)`. Or le dropdown est rendu via portal dans `document.body`, donc hors du container. Un clic sur une option du dropdown pourrait fermer le dropdown avant que le clic ne soit traite. Le `onMouseDown={(e) => e.preventDefault()}` (ligne 170) compense partiellement, mais c'est fragile.

## Fonctionnalites absentes

### 6. Pas de validation des sources de bruit quand obligatoire
Quand le niveau n'est pas "tres_calme", les sources de bruit sont affichees mais **jamais validees** dans `getMissingFields`. L'utilisateur peut avancer sans les renseigner.

### 7. L'etat "sur place" (isOnSite) n'est pas persiste
`isOnSite` est un `useState` local au composant. Si l'utilisateur navigue vers un autre onglet et revient, il perd son choix et la mesure micro. Il devrait etre sauvegarde dans le localStorage via `useCCCFormState`.

## Optimisations

### 8. `SOUND_ENVIRONMENT_OPTIONS` utilise un cast inutile
`(SOUND_LABELS as Record<string, string>).tres_calme` — `SOUND_LABELS` est deja de type `Record<string, string>`, le cast est superflu.

## Plan de corrections

### Fichier 1 : `src/components/cadastral/ccc-tabs/LocationTab.tsx`
- Ajouter un `useEffect` de cleanup dans `SoundEnvironmentBlock` pour appeler `stopMeasurement()` au demontage
- Retirer les casts `as Record<string, string>` inutiles sur `SOUND_LABELS`
- Ameliorer la formule dB : utiliser `20 * Math.log10(rms / 1)` borne entre 0-100, avec les memes seuils

### Fichier 2 : `src/hooks/useCCCFormState.ts`
- Ajouter `setSoundEnvironment(''); setNearbySoundSources('');` dans `resetLocationBlock`
- (Optionnel) Ajouter une validation `nearbySoundSources` obligatoire quand `soundEnvironment` n'est pas `tres_calme`

### Fichier 3 : `src/components/cadastral/ccc-tabs/ReviewTab.tsx`
- Remplacer le dictionnaire inline par `SOUND_LABELS[formData.soundEnvironment]`

### Fichier 4 : `src/components/cadastral/SuggestivePicklist.tsx`
- Ajouter le noeud portal dans la verification `contains()` du outside-click listener pour eviter les fermetures intempestives

