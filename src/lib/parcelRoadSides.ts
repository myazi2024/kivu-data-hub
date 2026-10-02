import type { RoadSideInfo } from '@/components/cadastral/RoadBorderingSidesPanel';

/** Declared road-facing sides only; geometry alone never implies a road. */
export function getParcelRoadSides(value: unknown): RoadSideInfo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((side, index): RoadSideInfo[] => {
    if (!side || typeof side !== 'object') return [];
    const data = side as Partial<RoadSideInfo>;
    if (!(data.hasRoad ?? (data.bordersRoad === true || data.borderType === 'route'))) return [];
    return [{ ...data, sideIndex: typeof data.sideIndex === 'number' ? data.sideIndex : index } as RoadSideInfo];
  });
}

export function sideNumber(side: RoadSideInfo, fallbackIndex: number): number {
  return typeof side.sideIndex === 'number' && Number.isInteger(side.sideIndex) && side.sideIndex >= 0
    ? side.sideIndex + 1
    : fallbackIndex + 1;
}