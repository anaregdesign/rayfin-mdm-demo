/**
 * Clone helper for the in-memory (demo-mode) repositories. Every read/write
 * returns a deep copy so callers can never mutate a repository's internal
 * array state by holding onto a returned reference — mirroring the isolation a
 * real database round-trip provides.
 */
export const clone = <T>(value: T): T => structuredClone(value);
