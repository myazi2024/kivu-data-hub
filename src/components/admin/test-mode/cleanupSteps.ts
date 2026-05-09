/**
 * Single source of truth for cleanup step ordering.
 * Re-exports from the edge-function shared module so the UI cannot drift
 * from the server-side `cleanup-test-data-batch` function.
 */
// Path resolves at build time via Vite — file is plain TS with no Deno deps.
export { CLEANUP_STEPS, type CleanupStep } from '../../../../supabase/functions/_shared/cleanupSteps';
