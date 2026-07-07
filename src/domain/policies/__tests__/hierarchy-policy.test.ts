import { describe, expect, it } from 'vitest';

import type { HasHierarchy } from '@/domain/models/hierarchy';
import {
  ancestorsOf,
  buildForest,
  childrenOf,
  descendantIds,
  flattenForest,
  parentCandidates,
  rootsOf,
  siblingsOf,
  subtreeIds,
  wouldCreateCycle,
} from '@/domain/policies/hierarchy-policy';

interface Node extends HasHierarchy {
  name: string;
}

/**
 *   a (root)              x (root)
 *   ├─ b                  └─ y
 *   │  ├─ d
 *   │  └─ e
 *   └─ c
 */
const tree: Node[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B', parentId: 'a' },
  { id: 'c', name: 'C', parentId: 'a' },
  { id: 'd', name: 'D', parentId: 'b' },
  { id: 'e', name: 'E', parentId: 'b' },
  { id: 'x', name: 'X' },
  { id: 'y', name: 'Y', parentId: 'x' },
];

describe('childrenOf', () => {
  it('returns only direct children', () => {
    expect(childrenOf(tree, 'a').map((n) => n.id)).toEqual(['b', 'c']);
    expect(childrenOf(tree, 'b').map((n) => n.id)).toEqual(['d', 'e']);
    expect(childrenOf(tree, 'd')).toEqual([]);
  });
});

describe('rootsOf', () => {
  it('returns nodes with no parent', () => {
    expect(rootsOf(tree).map((n) => n.id)).toEqual(['a', 'x']);
  });

  it('treats a dangling parent reference as a root', () => {
    const orphan: Node[] = [{ id: 'o', name: 'O', parentId: 'missing' }];
    expect(rootsOf(orphan).map((n) => n.id)).toEqual(['o']);
  });
});

describe('ancestorsOf', () => {
  it('walks from nearest parent up to the root', () => {
    expect(ancestorsOf(tree, 'd').map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('returns empty for a root', () => {
    expect(ancestorsOf(tree, 'a')).toEqual([]);
  });

  it('is cycle-safe', () => {
    const cyclic: Node[] = [
      { id: 'p', name: 'P', parentId: 'q' },
      { id: 'q', name: 'Q', parentId: 'p' },
    ];
    // Must terminate rather than loop forever.
    expect(ancestorsOf(cyclic, 'p').map((n) => n.id)).toEqual(['q']);
  });
});

describe('descendantIds', () => {
  it('collects the whole subtree, excluding the node', () => {
    expect([...descendantIds(tree, 'a')].sort()).toEqual(['b', 'c', 'd', 'e']);
    expect([...descendantIds(tree, 'b')].sort()).toEqual(['d', 'e']);
    expect([...descendantIds(tree, 'd')]).toEqual([]);
  });

  it('is cycle-safe', () => {
    const cyclic: Node[] = [
      { id: 'p', name: 'P', parentId: 'q' },
      { id: 'q', name: 'Q', parentId: 'p' },
    ];
    expect([...descendantIds(cyclic, 'p')]).toEqual(['q']);
  });
});

describe('subtreeIds', () => {
  it('includes the node itself plus descendants', () => {
    expect([...subtreeIds(tree, 'b')].sort()).toEqual(['b', 'd', 'e']);
  });
});

describe('siblingsOf', () => {
  it('returns nodes sharing the same parent', () => {
    expect(siblingsOf(tree, 'b').map((n) => n.id)).toEqual(['c']);
    expect(siblingsOf(tree, 'd').map((n) => n.id)).toEqual(['e']);
  });

  it('treats roots as siblings of each other', () => {
    expect(siblingsOf(tree, 'a').map((n) => n.id)).toEqual(['x']);
  });

  it('returns empty for an unknown id', () => {
    expect(siblingsOf(tree, 'nope')).toEqual([]);
  });
});

describe('wouldCreateCycle', () => {
  it('rejects self-parenting', () => {
    expect(wouldCreateCycle(tree, 'a', 'a')).toBe(true);
  });

  it('rejects choosing a descendant as parent', () => {
    expect(wouldCreateCycle(tree, 'a', 'd')).toBe(true);
    expect(wouldCreateCycle(tree, 'b', 'e')).toBe(true);
  });

  it('allows a non-descendant parent', () => {
    expect(wouldCreateCycle(tree, 'c', 'b')).toBe(false);
    expect(wouldCreateCycle(tree, 'y', 'a')).toBe(false);
  });

  it('allows clearing the parent (undefined)', () => {
    expect(wouldCreateCycle(tree, 'b', undefined)).toBe(false);
  });
});

describe('parentCandidates', () => {
  it('excludes the node itself and its descendants', () => {
    expect(parentCandidates(tree, 'b').map((n) => n.id)).toEqual([
      'a',
      'c',
      'x',
      'y',
    ]);
  });
});

describe('buildForest / flattenForest', () => {
  it('builds a depth-annotated forest', () => {
    const forest = buildForest(tree);
    expect(forest.map((n) => n.value.id)).toEqual(['a', 'x']);
    const a = forest[0];
    expect(a.depth).toBe(0);
    expect(a.children.map((n) => n.value.id)).toEqual(['b', 'c']);
    expect(a.children[0].depth).toBe(1);
    expect(a.children[0].children.map((n) => n.value.id)).toEqual(['d', 'e']);
  });

  it('flattens depth-first with depth preserved', () => {
    const flat = flattenForest(buildForest(tree));
    expect(flat.map((n) => `${n.value.id}@${n.depth}`)).toEqual([
      'a@0',
      'b@1',
      'd@2',
      'e@2',
      'c@1',
      'x@0',
      'y@1',
    ]);
  });

  it('does not infinite-loop on a cyclic graph', () => {
    const cyclic: Node[] = [
      { id: 'p', name: 'P', parentId: 'q' },
      { id: 'q', name: 'Q', parentId: 'p' },
    ];
    // Both reference each other, so neither is a root → empty forest, no hang.
    expect(buildForest(cyclic)).toEqual([]);
  });
});
