

## Audit — Page Carte Cadastrale (`/cadastral-map`)

### Périmètre

| Fichier | LOC | État |
|---|---|---|
| `src/pages/CadastralMap.tsx` | **1615** | Critique : monolithe à découper |
| `src/components/cadastral/CadastralMap.tsx` | 274 | **Orphelin** (zéro import) |
| `src/components/cadastral/AdvancedSearchFilters.tsx` | 530 | À auditer |
| `src/components/cadastral/ParcelActionsDropdown.tsx` | 219 | OK |
| `src/hooks/useAdvancedCadastralSearch.tsx` | 240 | OK avec dette test/prod |
| `src/hooks/useCadastralSearch.tsx` | 200 | OK |

---

### Lot 1 — Bugs / cohérence (haute priorité)

1. **Limite dure 500 parcelles** (