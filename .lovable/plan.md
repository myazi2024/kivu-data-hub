

# Corrections formulaire CCC : Permis obligatoire + Picklist sonore + Validation sonore

## Problemes identifies

1. **Permis de batir non obligatoire** : `permitMode` (OUI/NON) n'est verifie dans `getMissingFields` que si `permitMode === 'existing'`. Il manque une regle pour forcer la reponse quand `permitMode === null` (pas encore repondu).

2. **Picklist "Sources de bruit" invisible** : Le dropdown du `SuggestivePicklist` utilise `z-[9999]` mais il est a l'interieur d'un conteneur avec `overflow-y-auto` (le `DialogContent`). Le navigateur clippe le dropdown meme si le z-index est eleve. Il faut utiliser un portail (React Portal) pour le rendre hors du conteneur scrollable.

3. **Environnement sonore non obligatoire** : `soundEnvironment` n'est pas verifie dans `getMissingFields`, donc l'utilisateur peut avancer sans remplir ce champ.

## Modifications

### 1. `src/hooks/useCCCFormState.ts` — getMissingFields (2 ajouts)

**Permis obligatoire** (apres ligne 731, avant le bloc BUILDING PERMITS existant) :
```typescript
if (!isTerrainNu && !isAppartement && formData.constructionType !== 'Terrain nu' && permitMode === null) {
  missing.push({ field: 'permitMode', label: "Avez-vous obtenu une autorisation de bâtir ?", tab: 'general' });
}
```

**Environnement sonore obligatoire** (apres le bloc LOCATION existant, avant BUILDING PERMITS) :
```typescript
if (!soundEnvironment || soundEnvironment.trim() === '') {
  missing.push({ field: 'soundEnvironment', label: 'Environnement sonore', tab: 'location' });
}
```
Ajouter `soundEnvironment` aux dependances du useCallback.

### 2. `src/components/cadastral/SuggestivePicklist.tsx` — Portal pour le dropdown

Remplacer le dropdown `<div className="absolute z-[9999] ...">` par un rendu via `ReactDOM.createPortal` positionne dynamiquement sous l'input :
- Utiliser un `ref` sur l'input pour calculer `getBoundingClientRect()`
- Rendre le dropdown dans `document.body` via `createPortal`
- Positionner avec `position: fixed` + coordonnees calculees
- Garder le `z-[10001]` pour passer au-dessus du dialog

### Fichiers modifies
- `src/hooks/useCCCFormState.ts` (2 regles de validation)
- `src/components/cadastral/SuggestivePicklist.tsx` (portal dropdown)

