

# Fix Undo/Redo — Two Root Causes

## Problem 1: `canUndo`/`canRedo` use stale state

Line 411 of `useSubdivisionForm.ts`:
```typescript
canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1
```
These use the React **state** variables, but `undo`/`redo` update the **refs** first. After an undo, `historyIndexRef` changes but `historyIndex` state may not have re-rendered yet, so the buttons stay disabled or get out of sync.

## Problem 2: Most lot mutations skip history

`setLots` is passed directly to `StepLotDesigner`, which calls it ~15 times for splitting, merging, dragging, annotations, edge-to-road conversion, etc. None of these calls go through `pushHistory`. So the history array stays nearly empty — there's nothing to undo.

Only `createInitialLot`, `updateLot`, and `deleteLot` from the hook push history, but StepLotDesigner doesn't use those — it uses raw `setLots`.

## Solution

### 1. Wrap `setLots` with automatic history tracking

Instead of exposing raw `setLots`, expose a `setLotsWithHistory` wrapper that automatically pushes to history on every call. Keep a raw `setLotsRaw` for undo/redo to avoid infinite loops.

```typescript
const setLotsWithHistory = useCallback((updater) => {
  setLots(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    pushHistory(next);
    return next;
  });
}, [pushHistory]);
```

### 2. Use refs for `canUndo`/`canRedo`

Replace state-derived booleans with a small state counter that gets bumped whenever refs change, forcing re-render:

```typescript
const [historyVersion, setHistoryVersion] = useState(0);

// In pushHistory, undo, redo — after updating refs:
setHistoryVersion(v => v + 1);

// Expose:
canUndo: historyIndexRef.current > 0,
canRedo: historyIndexRef.current < historyRef.current.length - 1,
```

### 3. Debounce drag operations

Vertex dragging calls `setLots` on every mouse move. Add a flag `skipHistoryRef` that the canvas sets during drag, and only push history on mouseUp (already handled by `onUpdateLot` in LotCanvas which fires on mouseUp).

## Files changed

| File | Change |
|------|--------|
| `useSubdivisionForm.ts` | Wrap `setLots` → `setLotsWithHistory`, add `historyVersion` state, expose `setLotsRaw` for undo/redo only, fix `canUndo`/`canRedo` |
| `StepLotDesigner.tsx` | No changes needed — it already receives `setLots` as prop, which will now be the history-aware wrapper |
| `LotCanvas.tsx` | For `onUpdateLot` (drag), distinguish drag-in-progress (no history) vs drag-end (with history) — use existing mouseUp handler |

