import type { RoadSideInfo } from '@/components/cadastral/RoadBorderingSidesPanel';

/** Declared road-facing sides only; geometry alone never implies a road. */
export function getParcelRoadSides(value: unknown): RoadSideInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter((side): side is RoadSideInfo => {
    if (!side || typeof side !== 'object') return false;
    const data = side as Partial<RoadSideInfo>;
    return data.hasRoad ?? (data.bordersRoad === true || data.borderType === 'route');
  });
}

export function sideNumber(side: RoadSideInfo, fallbackIndex: number): number {
  return typeof side.sideIndex === 'number' && Number.isInteger(side.sideIndex) && side.sideIndex >= 0
    ? side.sideIndex + 1
    : fallbackIndex + 1;
}