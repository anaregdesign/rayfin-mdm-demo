/** A reference to one side of a potential duplicate pair. */
export interface DuplicateRef {
  id: string;
  label: string;
}

/**
 * A candidate duplicate pair produced by the matching policy. `score` is a
 * 0..100 similarity estimate and `reasons` explains why the pair matched.
 */
export interface DuplicatePair {
  /** Stable key (`${leftId}|${rightId}`) for React lists and de-duping. */
  key: string;
  left: DuplicateRef;
  right: DuplicateRef;
  score: number;
  reasons: string[];
}
