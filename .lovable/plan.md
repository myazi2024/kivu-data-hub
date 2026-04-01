

# Fix 404 — Route "Codes Promo"

## Probleme

Le lien dans le menu Media pointe vers `/discount-codes` mais la route dans `App.tsx` est `/about-discount-codes`. D'ou le 404.

## Solution

Ajouter une route `/discount-codes` dans `App.tsx` qui redirige vers `/about-discount-codes` (via `<Navigate>`), et corriger le lien dans la navigation pour pointer directement vers `/about-discount-codes`.

| Fichier | Modification |
|---|---|
| `src/components/ui/navigation.tsx` (ligne 29) | Changer `href: '/discount-codes'` → `href: '/about-discount-codes'` |
| `src/App.tsx` | Ajouter `<Route path="/discount-codes" element={<Navigate to="/about-discount-codes" replace />} />` pour couvrir les anciens liens |

