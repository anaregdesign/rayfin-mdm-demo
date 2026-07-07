import type {
  FlatNode,
  HasHierarchy,
  TreeNode,
} from '@/domain/models/hierarchy';

/**
 * Pure hierarchy rules for any 1:N parent/child master (Issue #7). Every
 * function is total, non-mutating, and **cycle-safe** — a corrupt `parentId`
 * loop can never hang the UI. Shared by customer relations and product
 * categories; kept free of SDK/React so it is exhaustively unit-testable.
 */

function indexById<T extends HasHierarchy>(
  records: readonly T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const r of records) map.set(r.id, r);
  return map;
}

/** Direct children of a node (input order preserved). */
export function childrenOf<T extends HasHierarchy>(
  records: readonly T[],
  id: string
): T[] {
  return records.filter((r) => r.parentId === id);
}

/**
 * Records with no parent, or whose declared parent is absent from the set
 * (dangling references are treated as roots so nothing is ever hidden).
 */
export function rootsOf<T extends HasHierarchy>(records: readonly T[]): T[] {
  const ids = new Set(records.map((r) => r.id));
  return records.filter((r) => !r.parentId || !ids.has(r.parentId));
}

/**
 * Ancestor chain from the nearest parent up to the root (excludes the node
 * itself). Cycle-safe: a loop stops at the first repeated id.
 */
export function ancestorsOf<T extends HasHierarchy>(
  records: readonly T[],
  id: string
): T[] {
  const map = indexById(records);
  const chain: T[] = [];
  const seen = new Set<string>([id]);
  let current = map.get(id)?.parentId;
  while (current && !seen.has(current)) {
    const parent = map.get(current);
    if (!parent) break;
    chain.push(parent);
    seen.add(current);
    current = parent.parentId;
  }
  return chain;
}

/** Set of descendant ids (excludes the node itself). Cycle-safe. */
export function descendantIds<T extends HasHierarchy>(
  records: readonly T[],
  id: string
): Set<string> {
  const result = new Set<string>();
  const stack: string[] = [id];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const child of records) {
      if (
        child.parentId === current &&
        child.id !== id &&
        !result.has(child.id)
      ) {
        result.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return result;
}

/**
 * The node id together with all of its descendants — the selection set for a
 * "this node and everything under it" rollup filter.
 */
export function subtreeIds<T extends HasHierarchy>(
  records: readonly T[],
  id: string
): Set<string> {
  const ids = descendantIds(records, id);
  ids.add(id);
  return ids;
}

/** Siblings that share the same parent (excludes the node itself). */
export function siblingsOf<T extends HasHierarchy>(
  records: readonly T[],
  id: string
): T[] {
  const self = records.find((r) => r.id === id);
  if (!self) return [];
  const parent = self.parentId ?? undefined;
  return records.filter(
    (r) => r.id !== id && (r.parentId ?? undefined) === parent
  );
}

/**
 * Would assigning `newParentId` as the parent of `nodeId` introduce a cycle?
 * True when the target is the node itself or one of its descendants. Selecting
 * "no parent" (undefined) is always safe.
 */
export function wouldCreateCycle<T extends HasHierarchy>(
  records: readonly T[],
  nodeId: string,
  newParentId: string | undefined
): boolean {
  if (!newParentId) return false;
  if (newParentId === nodeId) return true;
  return descendantIds(records, nodeId).has(newParentId);
}

/**
 * Valid parent options for a node: every record except the node itself and its
 * descendants (choosing any of those would create a cycle).
 */
export function parentCandidates<T extends HasHierarchy>(
  records: readonly T[],
  nodeId: string
): T[] {
  const banned = subtreeIds(records, nodeId);
  return records.filter((r) => !banned.has(r.id));
}

/** Build a depth-annotated forest (roots → nested children). Cycle-safe. */
export function buildForest<T extends HasHierarchy>(
  records: readonly T[]
): TreeNode<T>[] {
  const build = (node: T, depth: number, seen: Set<string>): TreeNode<T> => {
    const nextSeen = new Set(seen).add(node.id);
    const children = childrenOf(records, node.id)
      .filter((c) => !nextSeen.has(c.id))
      .map((c) => build(c, depth + 1, nextSeen));
    return { value: node, depth, children };
  };
  return rootsOf(records).map((r) => build(r, 0, new Set<string>()));
}

/**
 * Flatten a forest into a depth-first, depth-annotated list — the shape an
 * indented `<select>` / tree list renders directly.
 */
export function flattenForest<T extends HasHierarchy>(
  forest: TreeNode<T>[]
): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];
  const walk = (nodes: TreeNode<T>[]): void => {
    for (const n of nodes) {
      out.push({ value: n.value, depth: n.depth });
      walk(n.children);
    }
  };
  walk(forest);
  return out;
}
