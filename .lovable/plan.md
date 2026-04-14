

# Fix: Selection impossible dans le SuggestivePicklist (Sources de bruit)

## Cause racine

Le dropdown du `SuggestivePicklist` est rendu via un **portal** directement dans `document.body`, donc **en dehors** du `DialogContent` de Radix. Quand l'utilisateur clique sur une option du dropdown, Radix Dialog intercepte cet evenement comme un "interact outside" (clic en dehors du contenu du dialog).

Le handler `onInteractOutside` (ligne 82-85 de `CadastralContributionDialog.tsx`) ne bloque cet evenement que pour le bouton WhatsApp. Pour tout le reste, il laisse passer, ce qui declenche `handleAttemptClose` (tentative de fermeture du dialog) et **empeche le `onClick` du bouton dropdown de s'executer**.

De plus, le dropdown utilise `onMouseDown={(e) => e.preventDefault()}` mais Radix utilise des **pointer events** (`pointerdown`), pas des mouse events. Le `preventDefault` sur `mousedown` n'a aucun effet sur le handler Radix.

## Corrections

### Fichier 1 : `src/components/cadastral/SuggestivePicklist.tsx`
- Ajouter un attribut `data-suggestive-dropdown="true"` sur le div portal du dropdown (ligne 167)
- Ajouter `onPointerDown={(e) => e.stopPropagation()}` sur ce meme div pour empecher la propagation vers Radix

### Fichier 2 : `src/components/cadastral/CadastralContributionDialog.tsx`
- Mettre a jour `onInteractOutside` pour aussi bloquer les clics sur les dropdowns portales :
```
onInteractOutside={(e) => {
  const target = e.target as HTMLElement;
  if (
    target.closest('[data-whatsapp-button="true"]') ||
    target.closest('[data-suggestive-dropdown="true"]')
  ) {
    e.preventDefault();
  }
}}
```

### Fichiers impactes
- `src/components/cadastral/SuggestivePicklist.tsx`
- `src/components/cadastral/CadastralContributionDialog.tsx`

