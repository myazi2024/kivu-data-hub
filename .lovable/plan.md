

# Fix Undo/Redo (Annuler/Retablir) — Stale Closure Bug

## Problem

The `undo` and `redo` functions in `useSubdivisionForm.ts` suffer from **stale closure** issues. Both `pushHistory` and `undo`/`redo` capture `history` and `historyIndex` from their closure, but these values are outdated by the time the callbacks execute because React state updates are asynchronous.

For example, `pushHistory` reads `historyIndex` at closure time, but `setHistoryIndex` has already been called without the state having updated yet. Similarly, `undo` reads `history[historyIndex - 1]` but both values may be stale.

## Solution

Use **refs** (`useRef`) to track `history` and `historyIndex` so that callbacks always read the latest values, while keeping the state variables for re-rendering.

## Changes — single file

**`src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts`**

1. Add `historyRef` and `historyIndexRef` (useRef) that mirror the state values
2. Keep state in sync via `useEffect` or by updating refs alongside state
3. Rewrite `pushHistory`, `undo`, `redo` to read from refs instead of closures
4. Remove `history`/`historyIndex` from dependency arrays (use refs instead)

```typescript
// Add refs
const historyRef = useRef<SubdivisionLot[][]>([]);
const historyIndexRef = useRef(-1);

// pushHistory writes to both ref and state
const pushHistory = useCallback((newLots: SubdivisionLot[]) => {
  const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
  newHistory.push(JSON.parse(JSON.stringify(newLots)));
  historyRef.current = newHistory;
  historyIndexRef.current = newHistory.length - 1;
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
}, []);

// undo/redo read from refs
const undo = useCallback(() => {
  if (historyIndexRef.current > 0) {
    historyIndexRef.current -= 1;
    setHistoryIndex(historyIndexRef.current);
    setLots(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  }
}, []);

const redo = useCallback(() => {
  if (historyIndexRef.current < historyRef.current.length - 1) {
    historyIndexRef.current += 1;
    setHistoryIndex(historyIndexRef.current);
    setLots(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
  }
}, []);
```

This eliminates stale closures entirely — `pushHistory` has no dependencies, and `undo`/`redo` always read the current history from the ref.

