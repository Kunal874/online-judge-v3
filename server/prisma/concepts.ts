/**
 * The concept graph.
 *
 * Slugs match the tags used on problems, which is how a solve becomes
 * evidence for a concept — no separate mapping table to drift out of sync.
 * Concepts with no problems yet are still worth listing: an unreachable
 * node is honest about what the catalogue doesn't cover.
 *
 * `requires` names prerequisites. Keep the edges genuine — a route is only
 * worth computing if the arrows mean something. "You cannot understand
 * lazy propagation before segment trees" is a real claim; "chapter 7 comes
 * after chapter 6" is not.
 */
export interface SeedConcept {
  slug: string;
  name: string;
  blurb: string;
  requires?: string[];
}

export const concepts: SeedConcept[] = [
  // ── Foundations ───────────────────────────────────────────────────────
  {
    slug: "implementation",
    name: "Implementation",
    blurb: "Translating a stated procedure into code without inventing anything.",
  },
  {
    slug: "arrays",
    name: "Arrays",
    blurb: "Indexed sequences, and the habit of thinking in positions rather than values.",
  },
  {
    slug: "strings",
    name: "Strings",
    blurb: "Arrays whose elements happen to be characters — plus the traps that adds.",
  },
  {
    slug: "math",
    name: "Elementary maths",
    blurb: "Integer arithmetic, overflow, parity, and knowing when a formula beats a loop.",
  },

  // ── First derivations ─────────────────────────────────────────────────
  {
    slug: "sorting",
    name: "Sorting",
    blurb: "Ordering as a preprocessing step that makes later questions cheap.",
    requires: ["arrays"],
  },
  {
    slug: "hashing",
    name: "Hashing",
    blurb: "Trading memory for constant-time membership and counting.",
    requires: ["arrays"],
  },
  {
    slug: "prefix-sums",
    name: "Prefix sums",
    blurb: "Precomputing cumulative totals so any range answers in constant time.",
    requires: ["arrays"],
  },
  {
    slug: "two-pointers",
    name: "Two pointers",
    blurb: "Two indices moving monotonically, turning a nested loop into a single pass.",
    requires: ["arrays"],
  },
  {
    slug: "stacks",
    name: "Stacks",
    blurb: "Last in, first out — the structure behind matching, nesting and undo.",
    requires: ["arrays"],
  },
  {
    slug: "queues",
    name: "Queues",
    blurb: "First in, first out, and the basis of level-by-level traversal.",
    requires: ["arrays"],
  },
  {
    slug: "recursion",
    name: "Recursion",
    blurb: "Solving a problem in terms of a smaller copy of itself, and trusting the smaller copy.",
    requires: ["implementation"],
  },
  {
    slug: "number-theory",
    name: "Number theory",
    blurb: "Divisibility, primes and the structure of the integers.",
    requires: ["math"],
  },

  // ── Second layer ──────────────────────────────────────────────────────
  {
    slug: "binary-search",
    name: "Binary search",
    blurb: "Halving a sorted space — and the harder trick of searching over the answer itself.",
    requires: ["arrays", "sorting"],
  },
  {
    slug: "greedy",
    name: "Greedy",
    blurb: "Taking the locally best option, and proving that it doesn't cost you later.",
    requires: ["sorting"],
  },
  {
    slug: "sliding-window",
    name: "Sliding window",
    blurb: "A two-pointer range maintained under an invariant as it moves.",
    requires: ["two-pointers", "prefix-sums"],
  },
  {
    slug: "monotonic-stack",
    name: "Monotonic stack",
    blurb: "A stack kept sorted, answering 'next greater element' in one pass.",
    requires: ["stacks"],
  },
  {
    slug: "dynamic-programming",
    name: "Dynamic programming",
    blurb: "Recursion with the repeated work removed, once you can name the state.",
    requires: ["recursion", "arrays"],
  },
  {
    slug: "trees",
    name: "Trees",
    blurb: "Connected graphs without cycles, where recursion becomes the natural tool.",
    requires: ["recursion"],
  },
  {
    slug: "modular-arithmetic",
    name: "Modular arithmetic",
    blurb: "Working under a modulus, and keeping intermediates from overflowing.",
    requires: ["number-theory"],
  },

  // ── Third layer ───────────────────────────────────────────────────────
  {
    slug: "graphs",
    name: "Graphs",
    blurb: "Nodes and edges — the general case that trees are a special case of.",
    requires: ["trees", "queues"],
  },
  {
    slug: "segment-tree",
    name: "Segment tree",
    blurb: "A tree over ranges, making both queries and updates logarithmic.",
    requires: ["trees", "prefix-sums"],
  },
  {
    slug: "bitmask-dp",
    name: "Bitmask DP",
    blurb: "Subsets as integers, when the state space is small enough to enumerate.",
    requires: ["dynamic-programming"],
  },
  {
    slug: "tree-dp",
    name: "Tree DP",
    blurb: "Dynamic programming where the recurrence follows the tree's own shape.",
    requires: ["trees", "dynamic-programming"],
  },
  {
    slug: "combinatorics",
    name: "Combinatorics",
    blurb: "Counting without enumerating, usually under a modulus.",
    requires: ["modular-arithmetic"],
  },

  // ── Fourth layer ──────────────────────────────────────────────────────
  {
    slug: "bfs",
    name: "Breadth-first search",
    blurb: "Level-order traversal, and shortest paths when every edge costs the same.",
    requires: ["graphs", "queues"],
  },
  {
    slug: "dfs",
    name: "Depth-first search",
    blurb: "Going as deep as possible first — the basis of ordering and connectivity.",
    requires: ["graphs", "recursion"],
  },
  {
    slug: "union-find",
    name: "Union-find",
    blurb: "Disjoint sets with near-constant merging, for connectivity under additions.",
    requires: ["graphs"],
  },
  {
    slug: "lazy-propagation",
    name: "Lazy propagation",
    blurb: "Deferring segment-tree updates until something actually reads them.",
    requires: ["segment-tree"],
  },

  // ── Fifth layer ───────────────────────────────────────────────────────
  {
    slug: "shortest-paths",
    name: "Shortest paths",
    blurb: "Dijkstra and friends, once edges carry weights.",
    requires: ["bfs", "greedy"],
  },
  {
    slug: "topological-sort",
    name: "Topological sort",
    blurb: "Ordering a DAG so every edge points forwards — dependency resolution itself.",
    requires: ["dfs"],
  },
  {
    slug: "minimum-spanning-tree",
    name: "Minimum spanning tree",
    blurb: "The cheapest way to connect everything, where greedy provably works.",
    requires: ["union-find", "greedy"],
  },
];
