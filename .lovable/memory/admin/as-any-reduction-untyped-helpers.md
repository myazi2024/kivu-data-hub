---
name: as-any-reduction-untyped-helpers
description: Réduction `as any` admin via helper `untyped.ts` — pattern centralisé pour tables non générées dans Supabase types.ts (read-only)
type: feature
---

# L6 — Réduction `as any` dans l'admin

## Pattern adopté
Fichier central `src/integrations/supabase/untyped.ts` qui isole les `as any` à un point d'entrée unique pour les tables et RPC **non générées** dans `types.ts` (read-only).

```ts
import { untypedTables, untypedRpc, getSupabaseUrl } from '@/integrations/supabase/untyped';

// Au lieu de :  (supabase as any).from('partners')
const { data } = await untypedTables.partners().select('*');

// Au lieu de :  supabase.rpc('get_tva_declaration' as any, ...)
await untypedRpc.get_tva_declaration({ p_year, p_month });
```

## Bilan cumulé final
- **153 → 18 occurrences `as any`** dans `src/components/admin` (-88%)
- Lot 1 (10 fichiers) + Lot 2 (9 fichiers) + Lot 3 (28 fichiers) — tables/RPC déjà typées dans `types.ts` débarrassées de leur cast inutile, payloads `Json` typés strict (`Json`, `Partial<T>`, `Record<string, unknown>`).
- Bug latent corrigé : RPC `get_inactive_users` appelée avec `threshold_days` au lieu de `_threshold_days` (révélé en retirant `as any`).

## Reste — 18 occurrences strictement légitimes
- **API tierces privées** : `L.Icon.Default.prototype._getIconUrl`, `LucideIcons[name]` (index dynamique), `jsPDF.internal`
- **Cast volontaire TS2589** : `rollback.ts` (deep union inference, commenté)
- **`StatusBadge status={x as any}`** : prop souple voulue (5 fichiers)
- **Fixtures preview** : `InvoicePreviewPanel` (2 objets statiques)
- **Commentaire descriptif** : `cccHelpers.ts:15` (mention dans doc)
- **Champ étendu hors typage Supabase** : `parent_parcel_title_type` (RequestDetailsDialog), `kpis`/`dashFull` exportés vers util `ExportData { statistics: any }`, `revenue_by_day` cast vers `DayPoint[]`
- **Chaîne query Supabase** : `AdminCadastralMap:72` (cast en fin de chaîne)

## Future migration
Quand `types.ts` sera regénéré avec les tables ajoutées, remplacer `untypedTables.X()` par `supabase.from('X')` direct et supprimer l'entrée du helper. Pour réduire les derniers : typer `ExportData.statistics`, ajouter `parent_parcel_title_type` à `subdivision_requests`, et remplacer `StatusBadge status: any` par `string`.
