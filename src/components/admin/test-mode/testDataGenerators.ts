/**
 * Backwards-compatible barrel: the original 1324-LOC monolith was split into
 * `./generators/*` for maintainability. Existing imports from this path keep working.
 */
export * from './generators';
