

# Redesign test environment banner — subtle bottom-right indicator

## Current state

`TestEnvironmentBanner` displays as a full-width sticky banner at the top:
- `bg-amber-500 text-amber-950` — high contrast, eye-catching
- `text-sm font-medium py-1.5` — prominent size
- Icon + long text: "Environnement de test — les données affichées sont fictives"

## Target state

Subtle indicator in bottom-right corner:
- **Position**: Fixed bottom-right (`fixed bottom-2 right-2`)
- **Text**: Shortened to "Environnement test"
- **Size**: Very small (`text-[10px]` or `text-xs`)
- **Colors**: Muted/opaque (`bg-muted/30 text-muted-foreground/60 border border-border/30`)
- **Icon**: Removed or kept minimal
- **Z-index**: Low but above content (`z-40`)

## Implementation

Transform `TestEnvironmentBanner.tsx` from a prominent banner to a subtle pill/badge in the bottom-right corner.

