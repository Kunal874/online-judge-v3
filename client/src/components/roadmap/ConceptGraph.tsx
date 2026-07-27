import { useMemo } from "react";
import type { ConceptNode, MasteryLevel } from "@online-judge/shared";

const COL_WIDTH = 200;
const ROW_HEIGHT = 58;
const NODE_WIDTH = 152;
const NODE_HEIGHT = 34;
const PAD = 28;

// Fill is mastery, per the design's legend. Unseen is deliberately hollow
// rather than a pale fill — "nothing here yet" should read as absence, not
// as a low score.
const FILL: Record<MasteryLevel, string> = {
  mastered: "var(--second)",
  solid: "var(--accent)",
  shaky: "var(--accent-tint)",
  unseen: "transparent",
};

const TEXT: Record<MasteryLevel, string> = {
  mastered: "var(--accent-contrast)",
  solid: "var(--accent-contrast)",
  shaky: "var(--accent-ink)",
  unseen: "var(--ink-muted)",
};

interface Placed extends ConceptNode {
  x: number;
  y: number;
}

/**
 * Layered layout: a concept's column is its depth, so every edge points
 * rightwards and the graph reads as "what comes before what" without
 * anyone tracing arrows.
 *
 * Row order within a column is one barycentre pass — each node pulled
 * towards the average row of its prerequisites. Not optimal crossing
 * reduction, which is NP-hard, but it turns an arbitrary ordering into a
 * mostly-untangled one for a graph this size.
 */
function layout(concepts: ConceptNode[]): { placed: Placed[]; width: number; height: number } {
  const byDepth = new Map<number, ConceptNode[]>();
  for (const concept of concepts) {
    const column = byDepth.get(concept.depth) ?? [];
    column.push(concept);
    byDepth.set(concept.depth, column);
  }

  const rowOf = new Map<string, number>();
  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  for (const depth of depths) {
    const column = byDepth.get(depth)!;
    if (depth === 0) {
      column.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const barycentre = (concept: ConceptNode) => {
        const rows = concept.requires.map((r) => rowOf.get(r)).filter((r) => r !== undefined);
        return rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : 999;
      };
      column.sort((a, b) => barycentre(a) - barycentre(b) || a.name.localeCompare(b.name));
    }
    column.forEach((concept, row) => rowOf.set(concept.slug, row));
  }

  const maxRows = Math.max(...[...byDepth.values()].map((c) => c.length));
  const placed: Placed[] = [];
  for (const depth of depths) {
    const column = byDepth.get(depth)!;
    // Columns are centred against the tallest one, so a sparse layer sits
    // opposite the middle of its neighbours rather than at the top.
    const offset = (maxRows - column.length) / 2;
    column.forEach((concept, row) => {
      placed.push({
        ...concept,
        x: PAD + depth * COL_WIDTH,
        y: PAD + (row + offset) * ROW_HEIGHT,
      });
    });
  }

  return {
    placed,
    width: PAD * 2 + (depths.length - 1) * COL_WIDTH + NODE_WIDTH,
    height: PAD * 2 + maxRows * ROW_HEIGHT,
  };
}

export default function ConceptGraph({
  concepts,
  selected,
  onSelect,
  routeSlugs,
}: {
  concepts: ConceptNode[];
  selected: string | null;
  onSelect: (slug: string) => void;
  routeSlugs: string[];
}) {
  const { placed, width, height } = useMemo(() => layout(concepts), [concepts]);
  const positions = useMemo(() => new Map(placed.map((p) => [p.slug, p])), [placed]);
  const onRoute = useMemo(() => new Set(routeSlugs), [routeSlugs]);

  const edges = placed.flatMap((node) =>
    node.requires
      .map((requiredSlug) => {
        const from = positions.get(requiredSlug);
        if (!from) return null;
        const x1 = from.x + NODE_WIDTH;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = node.x;
        const y2 = node.y + NODE_HEIGHT / 2;
        const mid = (x1 + x2) / 2;
        return {
          key: `${requiredSlug}->${node.slug}`,
          // Horizontal-tangent cubic: the curve leaves and enters each node
          // flat, so an edge is readable where several converge on one node.
          d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
          highlighted: onRoute.has(requiredSlug) && onRoute.has(node.slug),
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null),
  );

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Concept prerequisite graph"
        className="max-w-none"
      >
        <g>
          {edges.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              fill="none"
              stroke={edge.highlighted ? "var(--accent)" : "var(--edge)"}
              strokeWidth={edge.highlighted ? 2 : 1}
            />
          ))}
        </g>

        {placed.map((node) => {
          const isSelected = node.slug === selected;
          const isOnRoute = onRoute.has(node.slug);
          return (
            <g
              key={node.slug}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onSelect(node.slug)}
              className="cursor-pointer"
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={NODE_HEIGHT / 2}
                fill={FILL[node.mastery]}
                stroke={
                  isSelected
                    ? "var(--ink)"
                    : isOnRoute
                      ? "var(--accent)"
                      : node.mastery === "unseen"
                        ? "var(--edge)"
                        : "transparent"
                }
                strokeWidth={isSelected ? 2 : isOnRoute ? 2 : 1}
                strokeDasharray={node.mastery === "unseen" ? "4 3" : undefined}
              />
              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fill={TEXT[node.mastery]}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
