

# Fix: `require is not defined` crash in Config Graphiques

## Root Cause

Two files use `require()` (CommonJS) inside ES modules, which crashes in the browser:

1. **`src/hooks/useAnalyticsChartsConfig.ts` line 114**: `require('@/config/analyticsTabsRegistry')` — even though `ANALYTICS_TABS_REGISTRY` is already re-exported via ES import on line 7.
2. **`src/hooks/useBlockFilter.ts` line 62**: `require('@/config/crossVariables')` — even though `getCrossVariablesWithOverrides` is already imported at line 4 of `useAnalyticsChartsConfig.ts` (and `getCrossVariables` is imported at line 5 of this file).

## Fix

### File 1: `src/hooks/useAnalyticsChartsConfig.ts`
- Line 114: Replace `const { ANALYTICS_TABS_REGISTRY: reg } = require(...)` with a standard import.
- Add `import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';` at the top (it's already re-exported on line 7, so we can use that binding directly).
- Replace `ANALYTICS_TABS_REGISTRY_LOCAL` references in the function with `ANALYTICS_TABS_REGISTRY`.
- Remove lines 114-115.

### File 2: `src/hooks/useBlockFilter.ts`
- Line 62: Replace `require('@/config/crossVariables')` with the already-available `getCrossVariablesWithOverrides` import.
- Add `getCrossVariablesWithOverrides` to the existing import from `@/config/crossVariables` on line 5.
- Remove the `require()` call.

Both fixes are mechanical — replace `require()` with the ES import that already exists or can be trivially added. No behavior change.

