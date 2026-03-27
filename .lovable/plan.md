

# Fix du bouton "Quitter (X)" non visible

## Problème

Le bouton X (L86-93) est positionné en `absolute` à l'intérieur de la `Card` qui a `overflow-hidden`. Le contenu scrollable pousse le bouton hors de la zone visible, et `overflow-hidden` le masque.

## Solution — `CadastralResultsDialog.tsx`

Déplacer le bouton X **en dehors** de la `Card`, directement dans le `div.fixed` overlay. Il sera positionné en absolu par rapport à la Card via un wrapper `relative` autour de la Card, ou plus simplement en `fixed` avec un positionnement adaptatif :

- Sur mobile (plein écran) : `fixed top-3 right-3 z-[1502]`
- Sur desktop (Card centrée) : le bouton reste visuellement dans le coin haut-droit du catalogue

Concrètement :
1. Sortir le `<button>` de la `<Card>` et le placer comme enfant direct du `div.fixed` overlay
2. Lui donner `fixed top-3 right-3 z-[1502]` pour mobile
3. Sur desktop, ajuster avec `md:absolute` dans un wrapper `relative` englobant la Card, ou utiliser des classes responsive (`md:top-7 md:right-auto md:left-[calc(50%+theme(maxWidth.2xl)/2-2.5rem)]`) — la solution la plus simple étant d'envelopper Card + bouton dans un `div.relative` avec les mêmes classes de taille que la Card.

### Approche retenue (la plus propre)

Envelopper la `Card` dans un `div` avec `relative md:m-4 md:max-w-2xl md:mx-auto md:max-h-[90vh]`, retirer ces classes de la Card (qui garde juste `w-full h-full overflow-hidden bg-background flex flex-col md:rounded-2xl md:shadow-2xl`), et placer le bouton X dans ce wrapper `relative` en `absolute top-3 right-3 z-[1502]`.

