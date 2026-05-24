// Greedy anti-collision label placement for the subdivision canvas.
//
// Each LabelBox declares its preferred center, AABB and priority. The solver
// places labels in priority order; if the preferred position collides, it
// tries 8 surrounding offsets at increasing radii and marks the label as
// "leadered" (needs a connector line back to its anchor) once moved beyond
// `leaderThresholdPx`. Labels that can't find any free spot within
// `maxOffsetPx` are kept at the preferred position with `leadered=true` if
// their priority is high, or `dropped=true` if low.

export interface LabelBox {
  id: string;
  /** Higher = placed first / more protected. */
  priority: number;
  /** Real attachment point on the geometry (edge midpoint, centroid…). */
  anchor: { x: number; y: number };
  /** Preferred label center. */
  cx: number;
  cy: number;
  /** Bounding box (already scaled with sw/fs). */
  width: number;
  height: number;
  /** Extra payload used by the renderer (text, fill, kind…). */
  payload?: any;
}

export interface PlacedLabel extends LabelBox {
  leadered: boolean;
  dropped: boolean;
}

function overlaps(a: PlacedLabel, b: PlacedLabel, pad: number): boolean {
  return (
    Math.abs(a.cx - b.cx) * 2 < a.width + b.width + pad * 2 &&
    Math.abs(a.cy - b.cy) * 2 < a.height + b.height + pad * 2
  );
}

export interface PlaceLabelsOptions {
  /** Max search radius (in screen px) before giving up. */
  maxOffsetPx?: number;
  /** Distance from preferred beyond which a leader line is drawn. */
  leaderThresholdPx?: number;
  /** Step between candidate radii. */
  stepPx?: number;
  /** Padding kept between any two placed labels. */
  paddingPx?: number;
  /** Visible viewBox AABB (in screen coords) — labels fully outside are dropped early. */
  viewport?: { x0: number; y0: number; x1: number; y1: number };
  /** Labels with priority strictly below this number may be dropped when no spot is found. */
  dropBelowPriority?: number;
}

const DIRS: Array<[number, number]> = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

export function placeLabels(
  inputs: LabelBox[],
  opts: PlaceLabelsOptions = {},
): PlacedLabel[] {
  const maxOff = opts.maxOffsetPx ?? 60;
  const step = opts.stepPx ?? 8;
  const leaderTh = opts.leaderThresholdPx ?? 6;
  const pad = opts.paddingPx ?? 2;
  const dropTh = opts.dropBelowPriority ?? 35;
  const vp = opts.viewport;

  const sorted = [...inputs].sort((a, b) => b.priority - a.priority);
  const placed: PlacedLabel[] = [];

  for (const inp of sorted) {
    if (vp) {
      const w2 = inp.width / 2;
      const h2 = inp.height / 2;
      if (
        inp.cx + w2 < vp.x0 ||
        inp.cx - w2 > vp.x1 ||
        inp.cy + h2 < vp.y0 ||
        inp.cy - h2 > vp.y1
      ) {
        continue; // off-screen
      }
    }

    const candidates: Array<{ cx: number; cy: number; off: number }> = [
      { cx: inp.cx, cy: inp.cy, off: 0 },
    ];
    for (let r = step; r <= maxOff; r += step) {
      for (const [dx, dy] of DIRS) {
        candidates.push({ cx: inp.cx + dx * r, cy: inp.cy + dy * r, off: r });
      }
    }

    let chosen: PlacedLabel | null = null;
    for (const c of candidates) {
      const trial: PlacedLabel = {
        ...inp,
        cx: c.cx,
        cy: c.cy,
        leadered: c.off > leaderTh,
        dropped: false,
      };
      const collides = placed.some(p => !p.dropped && overlaps(trial, p, pad));
      if (!collides) {
        chosen = trial;
        break;
      }
    }

    if (!chosen) {
      if (inp.priority < dropTh) {
        placed.push({ ...inp, leadered: false, dropped: true });
        continue;
      }
      // Keep high-priority labels at preferred position with leader.
      chosen = { ...inp, leadered: true, dropped: false };
    }
    placed.push(chosen);
  }

  return placed;
}

/** Rough text width estimator (monospace-equivalent). */
export function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(8, text.length * fontSize * 0.6);
}
