import { Point2D, SubdivisionRoad } from '../types';

/**
 * Découpe un segment [start,end] (coordonnées normalisées 0-1) en sous-segments
 * en retirant toutes les portions qui passent à l'intérieur d'une bande de voie.
 * Une voie est modélisée par son axe (`path[0]` → `path[last]`) et sa largeur,
 * convertie en bande rectangulaire via `halfWidthNorm = (widthM/2) / sideLength`.
 *
 * Utilisé pour scinder une limite de lotissement traversant des voies : la
 * partie visuellement masquée au-dessus de la voie n'est tout simplement pas
 * conservée.
 */
export function splitLineByRoads(
  start: Point2D,
  end: Point2D,
  roads: SubdivisionRoad[],
  sideLength: number,
): { start: Point2D; end: Point2D }[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return [];

  // Intervalles [t_in, t_out] (t ∈ [0,1]) à RETIRER (la ligne est à l'intérieur d'une voie).
  const removed: Array<[number, number]> = [];

  for (const road of roads) {
    if (!road.path || road.path.length < 2) continue;
    const a = road.path[0];
    const b = road.path[road.path.length - 1];
    const rdx = b.x - a.x;
    const rdy = b.y - a.y;
    const roadLen = Math.sqrt(rdx * rdx + rdy * rdy);
    if (roadLen < 1e-9) continue;
    const ux = rdx / roadLen;
    const uy = rdy / roadLen;
    const nx = -uy;
    const ny = ux;
    const halfW = Math.max(1e-6, (road.widthM / 2) / Math.max(1, sideLength));

    // Pour chaque extrémité du segment, calculer (proj le long de l'axe, dist perp).
    const proj = (p: Point2D) => ({
      s: (p.x - a.x) * ux + (p.y - a.y) * uy, // distance le long de la voie (normalisée)
      d: (p.x - a.x) * nx + (p.y - a.y) * ny, // distance perpendiculaire signée
    });
    const ps = proj(start);
    const pe = proj(end);
    const inside = (s: number, d: number) =>
      s >= 0 && s <= roadLen && Math.abs(d) <= halfW;

    // Si le segment ne touche pas la bande dans son bounding box, ignorer.
    if (
      (ps.s < -halfW && pe.s < -halfW) ||
      (ps.s > roadLen + halfW && pe.s > roadLen + halfW) ||
      (ps.d > halfW && pe.d > halfW) ||
      (ps.d < -halfW && pe.d < -halfW)
    ) {
      continue;
    }

    // Collecte des t où le segment franchit l'une des 4 frontières de la bande.
    const ts: number[] = [];
    // d = +halfW  -> ps.d + t*(pe.d - ps.d) = halfW
    const dPe = pe.d - ps.d;
    if (Math.abs(dPe) > 1e-12) {
      const t1 = (halfW - ps.d) / dPe;
      const t2 = (-halfW - ps.d) / dPe;
      if (t1 >= 0 && t1 <= 1) ts.push(t1);
      if (t2 >= 0 && t2 <= 1) ts.push(t2);
    }
    const dPs = pe.s - ps.s;
    if (Math.abs(dPs) > 1e-12) {
      const t3 = (0 - ps.s) / dPs;
      const t4 = (roadLen - ps.s) / dPs;
      if (t3 >= 0 && t3 <= 1) ts.push(t3);
      if (t4 >= 0 && t4 <= 1) ts.push(t4);
    }
    // Inclure les extrémités si elles sont déjà dans la bande.
    if (inside(ps.s, ps.d)) ts.push(0);
    if (inside(pe.s, pe.d)) ts.push(1);

    if (ts.length === 0) continue;
    ts.sort((a, b) => a - b);

    // Construire l'intervalle "inside" en marchant sur les segments [ts_i, ts_{i+1}]
    // et en testant le milieu.
    let tIn: number | null = null;
    let tOut: number | null = null;
    // Si l'extrémité gauche est dedans, on commence "in".
    let currentlyIn = inside(ps.s, ps.d);
    if (currentlyIn) tIn = 0;
    const allTs = [0, ...ts, 1];
    for (let i = 0; i < allTs.length - 1; i++) {
      const tA = allTs[i];
      const tB = allTs[i + 1];
      const tm = (tA + tB) / 2;
      const sm = ps.s + tm * (pe.s - ps.s);
      const dm = ps.d + tm * (pe.d - ps.d);
      const insideMid = inside(sm, dm);
      if (insideMid && !currentlyIn) {
        tIn = tA;
        currentlyIn = true;
      } else if (!insideMid && currentlyIn) {
        tOut = tA;
        currentlyIn = false;
        if (tIn !== null && tOut > tIn) removed.push([tIn, tOut]);
        tIn = null;
        tOut = null;
      }
    }
    if (currentlyIn && tIn !== null) removed.push([tIn, 1]);
  }

  if (removed.length === 0) {
    return [{ start, end }];
  }

  // Fusionner les intervalles à retirer.
  removed.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of removed) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + 1e-9) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  // Construire les sous-segments restants (complément dans [0,1]).
  const kept: Array<[number, number]> = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor + 1e-6) kept.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < 1 - 1e-6) kept.push([cursor, 1]);

  return kept.map(([t0, t1]) => ({
    start: { x: start.x + t0 * dx, y: start.y + t0 * dy },
    end: { x: start.x + t1 * dx, y: start.y + t1 * dy },
  }));
}
