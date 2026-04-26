import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, Undo2, Redo2,
  Info, Route,
  MousePointer, Scissors, Shield
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  ParentParcelInfo, LOT_COLORS, USAGE_LABELS, ROAD_SURFACE_LABELS,
  Point2D, LotAnnotation
} from '../types';
import { ValidationResult, mergeLotsThroughDeletedRoad, polygonArea } from '../utils/geometry';
import { convertZoneType, ZoneType } from '../utils/convertZoneType';
import LotCanvas, { CanvasMode } from '../LotCanvas';
import { buildMetricFrame, polygonAreaSqmAccurate, polygonPerimeterM, formatMeters, formatSqm } from '../utils/metrics';
import { genId, nextLotNumber, polygonUnionMany } from '../utils/polygonOps';
import LotVerticesEditor from './LotVerticesEditor';
import LotsListPanel from './panels/LotsListPanel';
import RoadsListPanel from './panels/RoadsListPanel';
import CommonSpacesPanel from './panels/CommonSpacesPanel';
import ServitudesPanel from './panels/ServitudesPanel';
import ValidationPanel from './panels/ValidationPanel';
import { useAdminAnalytics } from '@/lib/adminAnalytics';

interface StepLotDesignerProps {
  parentParcel: ParentParcelInfo | null;
  parentVertices?: Point2D[];
  parentSides?: any[];
  lots: SubdivisionLot[];
  setLots: (lots: SubdivisionLot[]) => void;
  roads: SubdivisionRoad[];
  setRoads: (roads: SubdivisionRoad[]) => void;
  commonSpaces: SubdivisionCommonSpace[];
  setCommonSpaces: (spaces: SubdivisionCommonSpace[]) => void;
  servitudes: SubdivisionServitude[];
  setServitudes: (servitudes: SubdivisionServitude[]) => void;
  lotIds: string[];
  onCreateInitialLot?: () => void;
  validation: ValidationResult;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// Note: convex-hull merging was removed in P0 — replaced by polygonUnionMany
// (see utils/polygonOps.ts) which preserves concavities and refuses
// non-adjacent lots instead of swallowing external area.

// Line segment intersection helper
function lineSegmentIntersection(
  p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D
): { point: Point2D; t: number } | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (u < 0 || u > 1) return null; // Must hit the edge segment
  // t can be any value (we extend the cut line)
  return {
    point: { x: p1.x + t * d1x, y: p1.y + t * d1y },
    t: u,
  };
}

// Segment-segment intersection: both t and u must be in [0,1]
function segmentSegmentIntersection(
  p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D
): { point: Point2D; t: number } | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < 0 || t > 1) return null; // Must be on the drawn segment
  if (u < 0 || u > 1) return null; // Must be on the lot edge
  return {
    point: { x: p1.x + t * d1x, y: p1.y + t * d1y },
    t: u,
  };
}

const StepLotDesigner: React.FC<StepLotDesignerProps> = ({
  parentParcel, parentVertices, parentSides, lots, setLots, roads, setRoads,
  commonSpaces, setCommonSpaces, servitudes, setServitudes, lotIds,
  onCreateInitialLot, validation, canUndo, canRedo, onUndo, onRedo
}) => {
  const [selectedLotId, setSelectedLotIdState] = useState<string | null>(null);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [editingRoadId, setEditingRoadIdState] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [canvasShowGrid, setCanvasShowGrid] = useState(true);
  const detailsPanelRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll vers le panneau de détails sur mobile lors d'une sélection
  const scrollToDetailsOnMobile = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) return; // lg+: panneau déjà visible à droite
    requestAnimationFrame(() => {
      detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const setSelectedLotId = React.useCallback((id: string | null) => {
    setSelectedLotIdState(id);
    if (id) scrollToDetailsOnMobile();
  }, [scrollToDetailsOnMobile]);

  const setEditingRoadId = React.useCallback((id: string | null) => {
    setEditingRoadIdState(id);
    if (id) scrollToDetailsOnMobile();
  }, [scrollToDetailsOnMobile]);
  // Measure mode state
  const [measurePoints, setMeasurePoints] = useState<Point2D[]>([]);
  // Road pre-configuration
  const [roadPresetWidth, setRoadPresetWidth] = useState(6);
  const [roadPresetSurface, setRoadPresetSurface] = useState<SubdivisionRoad['surfaceType']>('planned');

  const editingRoad = roads.find(r => r.id === editingRoadId) || null;

  // Single source of truth for distances/areas in this designer.
  // Falls back to isotropic √A scale if the parent has no GPS coordinates.
  const metricFrame = React.useMemo(
    () => buildMetricFrame(parentParcel?.gpsCoordinates, parentParcel?.areaSqm || 0),
    [parentParcel?.gpsCoordinates, parentParcel?.areaSqm],
  );

  // Helpers — accurate area + perimeter via the metric frame.
  const computeArea = useCallback(
    (poly: Point2D[]) => Math.max(1, Math.round(polygonAreaSqmAccurate(poly, metricFrame))),
    [metricFrame],
  );
  const computePerim = useCallback(
    (poly: Point2D[]) => Math.round(polygonPerimeterM(poly, metricFrame)),
    [metricFrame],
  );

  const handleAddRoad = useCallback(() => {
    const parentPoly = parentVertices && parentVertices.length >= 3 ? parentVertices : null;
    const bounds = parentPoly
      ? parentPoly.reduce((b, p) => ({
          minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
          minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y),
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
      : { minX: 0, maxX: 1, minY: 0, maxY: 1 };

    const cx = (bounds.minX + bounds.maxX) / 2;
    const newRoad: SubdivisionRoad = {
      id: genId('road'),
      name: `Voie ${roads.length + 1}`,
      widthM: 6,
      surfaceType: 'planned',
      isExisting: false,
      path: [
        { x: cx, y: bounds.minY },
        { x: cx, y: bounds.maxY },
      ],
    };
    setRoads([...roads, newRoad]);
    setEditingRoadId(newRoad.id);
  }, [roads, setRoads, parentVertices]);

  const handleDeleteRoad = useCallback((roadId: string) => {
    const road = roads.find(r => r.id === roadId);
    if (road) {
      const parentArea = parentParcel?.areaSqm || 0;
      const mergedLots = mergeLotsThroughDeletedRoad(road, lots, parentArea, parentVertices);
      setLots(mergedLots);
    }
    setRoads(roads.filter(r => r.id !== roadId));
    if (editingRoadId === roadId) setEditingRoadId(null);
  }, [roads, setRoads, editingRoadId, lots, setLots, parentParcel, parentVertices]);

  const updateRoad = useCallback((roadId: string, updates: Partial<SubdivisionRoad>) => {
    setRoads(roads.map(r => r.id === roadId ? { ...r, ...updates } : r));
  }, [roads, setRoads]);

  // Add empty lot
  const handleAddEmptyLot = useCallback(() => {
    const parentPoly = parentVertices && parentVertices.length >= 3 ? parentVertices : null;
    const bounds = parentPoly
      ? parentPoly.reduce((b, p) => ({
          minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
          minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y),
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
      : { minX: 0, maxX: 1, minY: 0, maxY: 1 };

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const w = (bounds.maxX - bounds.minX) * 0.2;
    const h = (bounds.maxY - bounds.minY) * 0.2;
    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const verts: Point2D[] = [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
    ];
    const newLot: SubdivisionLot = {
      id: genId('lot'),
      lotNumber: String(maxLotNum + 1),
      vertices: verts,
      areaSqm: computeArea(verts),
      perimeterM: computePerim(verts),
      intendedUse: 'residential',
      isBuilt: false,
      hasFence: false,
      color: '#22c55e',
    };
    setLots([...lots, newLot]);
    setSelectedLotId(newLot.id);
  }, [lots, setLots, parentVertices, parentParcel, computeArea, computePerim]);

  const selectedLot = lots.find(l => l.id === selectedLotId);

  const updateSelectedLot = useCallback((updates: Partial<SubdivisionLot>) => {
    if (!selectedLotId) return;
    setLots(lots.map(l => l.id === selectedLotId ? { ...l, ...updates } : l));
  }, [selectedLotId, lots, setLots]);

  const deleteLot = useCallback((id: string) => {
    const target = lots.find(l => l.id === id);
    if (target?.isParentBoundary) return; // Locked: must be split/cut, not deleted
    setLots(lots.filter(l => l.id !== id));
    if (selectedLotId === id) setSelectedLotId(null);
  }, [lots, setLots, selectedLotId]);

  const duplicateLot = useCallback((id: string) => {
    const lot = lots.find(l => l.id === id);
    if (!lot) return;
    if (lot.isParentBoundary) return; // Cannot duplicate the locked parent parcel
    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);
    const offset = 0.03;
    const newLot: SubdivisionLot = {
      ...lot,
      id: genId('lot'),
      lotNumber: String(maxLotNum + 1),
      vertices: lot.vertices.map(v => ({ x: Math.min(1, v.x + offset), y: Math.min(1, v.y + offset) })),
      annotations: [],
      isParentBoundary: false,
    };
    setLots([...lots, newLot]);
    setSelectedLotId(newLot.id);
  }, [lots, setLots]);

  const updateLotAnnotations = useCallback((id: string, annotations: LotAnnotation[]) => {
    setLots(lots.map(l => l.id === id ? { ...l, annotations } : l));
  }, [lots, setLots]);

  // Convert the selected lot to a road or common space (or stay a lot).
  const handleConvertSelectedZone = useCallback((toType: ZoneType) => {
    if (!selectedLotId) return;
    const lot = lots.find(l => l.id === selectedLotId);
    if (!lot) return;
    if (toType === 'lot') return;

    const parentPoly = parentVertices && parentVertices.length >= 3
      ? parentVertices
      : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const parentNormArea = polygonArea(parentPoly);
    const parentAreaSqm = parentParcel?.areaSqm || 1000;
    // Anisotropic frame from GPS bounds → accurate meters on both axes.
    const sideLengthM = (metricFrame.sxM + metricFrame.syM) / 2;

    const nextNumber = toType === 'road'
      ? roads.length + 1
      : toType === 'commonSpace'
        ? commonSpaces.length + 1
        : nextLotNumber(lots);

    const result = convertZoneType(
      { lot },
      toType,
      { parentAreaSqm, parentNormArea, sideLengthM, metricFrame, nextNumber, defaultRoadWidthM: roadPresetWidth },
    );

    // Remove from lots
    setLots(lots.filter(l => l.id !== selectedLotId));
    setSelectedLotId(null);

    if (result.road) {
      setRoads([...roads, result.road]);
      setEditingRoadId(result.road.id);
    } else if (result.commonSpace) {
      setCommonSpaces([...commonSpaces, result.commonSpace]);
    }
  }, [selectedLotId, lots, setLots, roads, setRoads, commonSpaces, setCommonSpaces, parentParcel, parentVertices, roadPresetWidth, metricFrame]);


  const handleSplitLot = useCallback((lotId: string) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.vertices.length < 3) return;

    // Find the longest edge to split along
    const verts = lot.vertices;
    let longestIdx = 0;
    let longestDist = 0;
    for (let i = 0; i < verts.length; i++) {
      const next = verts[(i + 1) % verts.length];
      const dx = next.x - verts[i].x;
      const dy = next.y - verts[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > longestDist) {
        longestDist = dist;
        longestIdx = i;
      }
    }

    // Find the opposite edge (approximately halfway around the polygon)
    const oppositeIdx = (longestIdx + Math.floor(verts.length / 2)) % verts.length;

    // Midpoints of the two edges
    const mid1 = {
      x: (verts[longestIdx].x + verts[(longestIdx + 1) % verts.length].x) / 2,
      y: (verts[longestIdx].y + verts[(longestIdx + 1) % verts.length].y) / 2,
    };
    const mid2 = {
      x: (verts[oppositeIdx].x + verts[(oppositeIdx + 1) % verts.length].x) / 2,
      y: (verts[oppositeIdx].y + verts[(oppositeIdx + 1) % verts.length].y) / 2,
    };

    // Build two sub-polygons by splitting the vertex ring
    const buildSubPoly = (startIdx: number, endIdx: number, midStart: Point2D, midEnd: Point2D): Point2D[] => {
      const poly: Point2D[] = [midStart];
      let i = (startIdx + 1) % verts.length;
      while (i !== (endIdx + 1) % verts.length) {
        poly.push(verts[i]);
        i = (i + 1) % verts.length;
      }
      poly.push(midEnd);
      return poly;
    };

    const poly1 = buildSubPoly(longestIdx, oppositeIdx, mid1, mid2);
    const poly2 = buildSubPoly(oppositeIdx, longestIdx, mid2, mid1);

    const calcArea = (poly: Point2D[]) => {
      let a = 0;
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
      }
      return Math.abs(a) / 2;
    };

    const nextNum = nextLotNumber(lots);

    const newLot1: SubdivisionLot = {
      ...lot,
      id: genId('lot'),
      lotNumber: String(nextNum),
      vertices: poly1,
      areaSqm: computeArea(poly1),
      perimeterM: computePerim(poly1),
      isParentBoundary: false,
    };
    const newLot2: SubdivisionLot = {
      ...lot,
      id: genId('lot'),
      lotNumber: String(nextNum + 1),
      vertices: poly2,
      areaSqm: computeArea(poly2),
      perimeterM: computePerim(poly2),
      isParentBoundary: false,
    };

    setLots(lots.map(l => l.id === lotId ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
  }, [lots, setLots, computeArea, computePerim]);

  const handleToggleLotSelection = useCallback((lotId: string) => {
    setSelectedLotIds(prev =>
      prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
    );
    setSelectedLotId(null);
  }, []);

  const handleMergeLots = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    const lotsToMerge = lots.filter(l => ids.includes(l.id));
    if (lotsToMerge.length < 2) return;

    // Real polygon union (preserves concavities). Refuses non-adjacent lots
    // to avoid swallowing roads/spaces between them.
    const merged = polygonUnionMany(lotsToMerge.map(l => l.vertices));
    if (!merged) {
      // eslint-disable-next-line no-alert
      window.alert(
        'Fusion impossible : les lots sélectionnés ne sont pas tous adjacents (ils ne partagent pas de bord commun).',
      );
      return;
    }

    const keepLot = lotsToMerge[0];
    const nextNum = nextLotNumber(lots);

    const mergedLot: SubdivisionLot = {
      ...keepLot,
      id: genId('lot'),
      lotNumber: String(nextNum),
      vertices: merged,
      areaSqm: computeArea(merged),
      perimeterM: computePerim(merged),
      isParentBoundary: false,
    };

    setLots([...lots.filter(l => !ids.includes(l.id)), mergedLot]);
    setSelectedLotIds([]);
    setSelectedLotId(mergedLot.id);
  }, [lots, setLots, computeArea, computePerim]);

  // Handle manual cut through a lot
  const handleCutLot = useCallback((lotId: string, cutStart: Point2D, cutEnd: Point2D) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.vertices.length < 3) return;

    // Find intersections of cut line with lot edges
    const verts = lot.vertices;
    const intersections: { point: Point2D; edgeIdx: number; t: number }[] = [];
    
    for (let i = 0; i < verts.length; i++) {
      const j = (i + 1) % verts.length;
      const inter = lineSegmentIntersection(cutStart, cutEnd, verts[i], verts[j]);
      if (inter) {
        intersections.push({ point: inter.point, edgeIdx: i, t: inter.t });
      }
    }

    if (intersections.length < 2) return; // Need at least 2 intersections
    
    // Take first two intersections (sorted by edge index)
    intersections.sort((a, b) => a.edgeIdx - b.edgeIdx || a.t - b.t);
    const int1 = intersections[0];
    const int2 = intersections[1];

    // Build two polygons
    const poly1: Point2D[] = [int1.point];
    for (let i = (int1.edgeIdx + 1) % verts.length; i !== (int2.edgeIdx + 1) % verts.length; i = (i + 1) % verts.length) {
      poly1.push(verts[i]);
    }
    poly1.push(int2.point);

    const poly2: Point2D[] = [int2.point];
    for (let i = (int2.edgeIdx + 1) % verts.length; i !== (int1.edgeIdx + 1) % verts.length; i = (i + 1) % verts.length) {
      poly2.push(verts[i]);
    }
    poly2.push(int1.point);

    if (poly1.length < 3 || poly2.length < 3) return;

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const newLot1: SubdivisionLot = {
      ...lot, id: genId('lot'), lotNumber: String(maxLotNum + 1),
      vertices: poly1,
      areaSqm: computeArea(poly1),
      perimeterM: computePerim(poly1),
      isParentBoundary: false,
    };
    const newLot2: SubdivisionLot = {
      ...lot, id: genId('lot'), lotNumber: String(maxLotNum + 2),
      vertices: poly2,
      areaSqm: computeArea(poly2),
      perimeterM: computePerim(poly2),
      isParentBoundary: false,
    };

    setLots(lots.map(l => l.id === lotId ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
    setCanvasMode('select');
  }, [lots, setLots, computeArea, computePerim]);

  // Handle finished road drawing — also split the traversed lot
  const handleFinishRoadDraw = useCallback((path: Point2D[]) => {
    if (path.length < 2) return;
    const cutStart = path[0];
    const cutEnd = path[path.length - 1];

    // 1. Create the road (affectedLotIds will be set below)
    const newRoad: SubdivisionRoad = {
      id: genId('road'),
      name: `Voie ${roads.length + 1}`,
      widthM: roadPresetWidth,
      surfaceType: roadPresetSurface,
      isExisting: false,
      path,
      affectedLotIds: [],
    };
    // Split existing roads at intersection points with the new road
    const allRoads = [...roads, newRoad];
    const splitRoads = splitRoadsAtIntersections(allRoads) as SubdivisionRoad[];
    setRoads(splitRoads);
    setEditingRoadId(newRoad.id);

    // 2. Find lot traversed by the drawn line
    let targetLot: SubdivisionLot | null = null;
    let bestIntersections: { point: Point2D; edgeIdx: number; t: number }[] = [];

    for (const lot of lots) {
      const verts = lot.vertices;
      if (verts.length < 3) continue;
      const intersections: { point: Point2D; edgeIdx: number; t: number }[] = [];
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        const inter = segmentSegmentIntersection(cutStart, cutEnd, verts[i], verts[j]);
        if (inter) {
          intersections.push({ point: inter.point, edgeIdx: i, t: inter.t });
        }
      }
      if (intersections.length >= 2) {
        targetLot = lot;
        bestIntersections = intersections;
        break;
      }
    }

    if (!targetLot || bestIntersections.length < 2) {
      // Fallback: road drawn along a shared edge — shrink bordering lots
      const sideLength = Math.sqrt(parentParcel?.areaSqm || 1000);
      const halfWidthNorm = (roadPresetWidth / 2) / sideLength;
      const rdx = cutEnd.x - cutStart.x;
      const rdy = cutEnd.y - cutStart.y;
      const roadLen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
      const nx = -rdy / roadLen;
      const ny = rdx / roadLen;
      const TOLERANCE = 0.02;

      let anyBordering = false;
      const borderingLotIds: string[] = [];
      const updatedLots = lots.map(lot => {
        const nearCount = lot.vertices.filter(v => {
          const perpDist = Math.abs((v.x - cutStart.x) * nx + (v.y - cutStart.y) * ny);
          return perpDist < TOLERANCE;
        }).length;
        if (nearCount < 2) return lot;

        anyBordering = true;
        borderingLotIds.push(lot.id);
        const centroid = {
          x: lot.vertices.reduce((s, v) => s + v.x, 0) / lot.vertices.length,
          y: lot.vertices.reduce((s, v) => s + v.y, 0) / lot.vertices.length,
        };
        const side = (centroid.x - cutStart.x) * nx + (centroid.y - cutStart.y) * ny;
        const pushDir = side > 0 ? 1 : -1;

        const newVertices = lot.vertices.map(v => {
          const perpDist = Math.abs((v.x - cutStart.x) * nx + (v.y - cutStart.y) * ny);
          if (perpDist < TOLERANCE) {
            return { x: v.x + nx * pushDir * halfWidthNorm, y: v.y + ny * pushDir * halfWidthNorm };
          }
          return v;
        });

        return { ...lot, vertices: newVertices, areaSqm: computeArea(newVertices), perimeterM: computePerim(newVertices) };
      });

      if (anyBordering) {
        // Store affectedLotIds on the new road
        const updatedRoads = splitRoads.map(r =>
          r.id === newRoad.id ? { ...r, affectedLotIds: borderingLotIds } : r
        );
        setRoads(updatedRoads);
        setLots(updatedLots);
      }
      setCanvasMode('select');
      return;
    }

    // 3. Cut the lot in two (same algo as handleCutLot)
    const verts = targetLot.vertices;
    bestIntersections.sort((a, b) => a.edgeIdx - b.edgeIdx || a.t - b.t);
    const int1 = bestIntersections[0];
    const int2 = bestIntersections[1];

    const poly1: Point2D[] = [int1.point];
    for (let i = (int1.edgeIdx + 1) % verts.length; i !== (int2.edgeIdx + 1) % verts.length; i = (i + 1) % verts.length) {
      poly1.push(verts[i]);
    }
    poly1.push(int2.point);

    const poly2: Point2D[] = [int2.point];
    for (let i = (int2.edgeIdx + 1) % verts.length; i !== (int1.edgeIdx + 1) % verts.length; i = (i + 1) % verts.length) {
      poly2.push(verts[i]);
    }
    poly2.push(int1.point);

    if (poly1.length < 3 || poly2.length < 3) {
      setCanvasMode('select');
      return;
    }

    // 4. Shrink both polygons away from the road centerline by halfWidth
    const sideLength = Math.sqrt(parentParcel?.areaSqm || 1000);
    const halfWidthNorm = (roadPresetWidth / 2) / sideLength;
    const rdx = cutEnd.x - cutStart.x;
    const rdy = cutEnd.y - cutStart.y;
    const roadLen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
    const nx = -rdy / roadLen;
    const ny = rdx / roadLen;
    const TOLERANCE = 0.02;

    const shrinkPoly = (poly: Point2D[]): Point2D[] => {
      const centroid = {
        x: poly.reduce((s, v) => s + v.x, 0) / poly.length,
        y: poly.reduce((s, v) => s + v.y, 0) / poly.length,
      };
      const side = (centroid.x - cutStart.x) * nx + (centroid.y - cutStart.y) * ny;
      const pushDir = side > 0 ? 1 : -1;

      return poly.map(v => {
        const perpDist = Math.abs((v.x - cutStart.x) * nx + (v.y - cutStart.y) * ny);
        if (perpDist < TOLERANCE) {
          return { x: v.x + nx * pushDir * halfWidthNorm, y: v.y + ny * pushDir * halfWidthNorm };
        }
        return v;
      });
    };

    const shrunk1 = shrinkPoly(poly1);
    const shrunk2 = shrinkPoly(poly2);

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const newLot1: SubdivisionLot = {
      ...targetLot, id: genId('lot'), lotNumber: String(maxLotNum + 1),
      vertices: shrunk1,
      areaSqm: computeArea(shrunk1),
      perimeterM: computePerim(shrunk1),
      isParentBoundary: false,
    };
    const newLot2: SubdivisionLot = {
      ...targetLot, id: genId('lot'), lotNumber: String(maxLotNum + 2),
      vertices: shrunk2,
      areaSqm: computeArea(shrunk2),
      perimeterM: computePerim(shrunk2),
      isParentBoundary: false,
    };

    // Store affectedLotIds on the new road for future width adjustments
    const updatedRoads = splitRoads.map(r =>
      r.id === newRoad.id ? { ...r, affectedLotIds: [newLot1.id, newLot2.id] } : r
    );
    setRoads(updatedRoads);

    setLots(lots.map(l => l.id === targetLot!.id ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
    setCanvasMode('select');
  }, [lots, setLots, roads, setRoads, roadPresetWidth, roadPresetSurface, parentParcel, parentVertices, computeArea, computePerim]);

  // Convert an edge between lots to a road
  const handleConvertEdgeToRoad = useCallback((edge: EdgeInfo) => {
    const sideLength = Math.sqrt(parentParcel?.areaSqm || 1000);
    const widthM = roadPresetWidth;
    const halfWidthNorm = (widthM / 2) / sideLength;

    // Calculate edge normal
    const edx = edge.p2.x - edge.p1.x;
    const edy = edge.p2.y - edge.p1.y;
    const edgeLen = Math.sqrt(edx * edx + edy * edy) || 1;
    const nx = -edy / edgeLen;
    const ny = edx / edgeLen;

    // Create road along this edge
    const newRoad: SubdivisionRoad = {
      id: genId('road'),
      name: `Voie ${roads.length + 1}`,
      widthM,
      surfaceType: roadPresetSurface,
      isExisting: false,
      path: [edge.p1, edge.p2],
      affectedLotIds: [edge.lotId1, ...(edge.lotId2 ? [edge.lotId2] : [])],
    };

    // Shrink adjacent lots
    const updatedLots = lots.map(lot => {
      const isLot1 = lot.id === edge.lotId1;
      const isLot2 = lot.id === edge.lotId2;
      if (!isLot1 && !isLot2) return lot;

      // Determine which side of the edge this lot is on
      const centroid = {
        x: lot.vertices.reduce((s, v) => s + v.x, 0) / lot.vertices.length,
        y: lot.vertices.reduce((s, v) => s + v.y, 0) / lot.vertices.length,
      };
      const side = (centroid.x - edge.p1.x) * nx + (centroid.y - edge.p1.y) * ny;
      const pushDir = side > 0 ? 1 : -1;

      // Move vertices that are on/near the edge
      const TOLERANCE = 0.02;
      const newVertices = lot.vertices.map(v => {
        // Check if this vertex is on the shared edge
        // Project vertex onto edge line and check distance
        const vdx = v.x - edge.p1.x;
        const vdy = v.y - edge.p1.y;
        const perpDist = Math.abs(vdx * nx + vdy * ny);
        if (perpDist < TOLERANCE) {
          // This vertex is on/near the edge - push it away
          return {
            x: v.x + nx * pushDir * halfWidthNorm,
            y: v.y + ny * pushDir * halfWidthNorm,
          };
        }
        return v;
      });

      return {
        ...lot,
        vertices: newVertices,
        areaSqm: computeArea(newVertices),
        perimeterM: computePerim(newVertices),
      };
    });

    setLots(updatedLots);
    setRoads([...roads, newRoad]);
    setEditingRoadId(newRoad.id);
    setCanvasMode('select');
  }, [lots, setLots, roads, setRoads, parentParcel, parentVertices, roadPresetWidth, roadPresetSurface, computeArea, computePerim]);

  const handleUpdateRoad = useCallback((roadId: string, updates: Partial<SubdivisionRoad>) => {
    const road = roads.find(r => r.id === roadId);
    if (!road) return;

    const newWidthM = updates.widthM;
    const oldWidthM = road.widthM;

    // If width changed, adjust adjacent lots
    if (newWidthM !== undefined && newWidthM !== oldWidthM && road.path.length >= 2) {
      const sideLength = Math.sqrt(parentParcel?.areaSqm || 1000);
      const deltaHalfNorm = ((newWidthM - oldWidthM) / 2) / sideLength;

      // Road direction and normal
      const p0 = road.path[0];
      const p1 = road.path[road.path.length - 1];
      const edx = p1.x - p0.x;
      const edy = p1.y - p0.y;
      const edgeLen = Math.sqrt(edx * edx + edy * edy);
      if (edgeLen > 0.001) {
        const nx = -edy / edgeLen;
        const ny = edx / edgeLen;
        const oldHalfNorm = (oldWidthM / sideLength) / 2;
        const TOLERANCE = oldHalfNorm + 0.025;
        const hasAffectedIds = road.affectedLotIds && road.affectedLotIds.length > 0;

        const updatedLots = lots.map(lot => {
          // If affectedLotIds is set, only adjust those lots; otherwise fallback to proximity
          if (hasAffectedIds && !road.affectedLotIds!.includes(lot.id)) return lot;

          const centroid = {
            x: lot.vertices.reduce((s, v) => s + v.x, 0) / lot.vertices.length,
            y: lot.vertices.reduce((s, v) => s + v.y, 0) / lot.vertices.length,
          };
          const side = (centroid.x - p0.x) * nx + (centroid.y - p0.y) * ny;
          const pushDir = side > 0 ? 1 : -1;

          let modified = false;
          const newVertices = lot.vertices.map(v => {
            const vdx = v.x - p0.x;
            const vdy = v.y - p0.y;
            const perpDist = Math.abs(vdx * nx + vdy * ny);
            if (perpDist < TOLERANCE) {
              modified = true;
              return {
                x: v.x + nx * pushDir * deltaHalfNorm,
                y: v.y + ny * pushDir * deltaHalfNorm,
              };
            }
            return v;
          });

          if (!modified) return lot;

          return {
            ...lot,
            vertices: newVertices,
            areaSqm: computeArea(newVertices),
            perimeterM: computePerim(newVertices),
          };
        });

        setLots(updatedLots);
      }
    }

    setRoads(roads.map(r => r.id === roadId ? { ...r, ...updates } : r));
  }, [roads, setRoads, lots, setLots, parentParcel, parentVertices, computeArea, computePerim]);

  const totalArea = lots.reduce((s, l) => s + l.areaSqm, 0);
  const parentArea = parentParcel?.areaSqm || 0;
  const coveragePercent = parentArea > 0 ? Math.round(totalArea / parentArea * 100) : 0;

  // Contextual hint shown under the canvas, depends on active tool
  const modeHint =
    canvasMode === 'drawLine'
      ? 'Cliquez sur le premier bord du lot, puis sur le second bord, pour le couper en deux.'
      : canvasMode === 'selectEdge'
      ? 'Cliquez sur une limite entre deux lots pour la convertir en voie.'
      : 'Cliquez sur un lot pour le sélectionner. Glissez pour le déplacer. Désignez ensuite chaque zone comme lot ou voie dans le panneau de droite.';

  return (
    <TooltipProvider delayDuration={250}>
    <div className="space-y-3">
      {/* Toolbar grand public — 3 zones : Outils · Actions rapides · État */}
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* Zone 1 — Outils */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Outils</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canvasMode === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCanvasMode('select')}
                className="gap-1.5 text-xs flex-shrink-0"
              >
                <MousePointer className="h-3.5 w-3.5" />
                Sélection
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              Cliquez sur un lot pour le sélectionner. Glissez-le pour le déplacer ou modifiez ses détails dans le panneau de droite.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canvasMode === 'drawLine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCanvasMode(canvasMode === 'drawLine' ? 'select' : 'drawLine')}
                className="gap-1.5 text-xs flex-shrink-0"
                disabled={lots.length === 0}
              >
                <Scissors className="h-3.5 w-3.5" />
                Diviser un lot
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-xs">
              Coupez un lot en deux : cliquez sur un premier bord, puis sur le bord opposé. Le lot sera automatiquement séparé en deux nouveaux lots.
            </TooltipContent>
          </Tooltip>

        </div>

        <Separator orientation="vertical" className="hidden sm:block h-8" />

        {/* Zone 2 — Actions rapides */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Actions</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEmptyLot}
                className="gap-1.5 text-xs flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un lot
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              Ajoute un petit lot rectangulaire vide au centre de la parcelle. Vous pourrez ensuite le déplacer et le redimensionner.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-1.5 text-xs flex-shrink-0">
                  <Undo2 className="h-3.5 w-3.5" /> Annuler
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Annule la dernière modification</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} className="gap-1.5 text-xs flex-shrink-0">
                  <Redo2 className="h-3.5 w-3.5" /> Rétablir
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Rétablit la modification annulée</TooltipContent>
          </Tooltip>
        </div>

        <div className="hidden sm:block flex-1" />

        {/* Zone 3 — État */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Badge variant="outline" className="text-[10px]">
            {lots.length} lot{lots.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {coveragePercent}% couvert
          </Badge>
        </div>
      </div>

      {/* Guide when only the locked parent parcel is present */}
      {lots.length === 1 && lots[0].isParentBoundary && (
        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="text-xs flex items-center gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              La <strong>parcelle mère</strong> est verrouillée — sa forme officielle ne peut pas être modifiée.
              Utilisez l'outil <strong>Diviser un lot</strong> ou <strong>Couper</strong> pour la découper en lots éditables.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Canvas + lot editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <LotCanvas
                lots={lots}
                roads={roads}
                commonSpaces={commonSpaces}
                parentAreaSqm={parentArea}
                parentVertices={parentVertices}
                parentSides={parentSides}
                parentGpsCoordinates={parentParcel?.gpsCoordinates}
                selectedLotId={selectedLotId}
                selectedLotIds={selectedLotIds}
                onSelectLot={id => { setSelectedLotId(id); setSelectedLotIds([]); }}
                onToggleLotSelection={handleToggleLotSelection}
                selectedRoadId={editingRoadId}
                onSelectRoad={setEditingRoadId}
                onDeleteRoad={handleDeleteRoad}
                onUpdateRoad={handleUpdateRoad}
                onDeleteLot={deleteLot}
                onDuplicateLot={duplicateLot}
                onUpdateLotAnnotations={updateLotAnnotations}
                onSplitLot={handleSplitLot}
                onMergeLots={handleMergeLots}
                onCutLot={handleCutLot}
                onFinishRoadDraw={handleFinishRoadDraw}
                onConvertEdgeToRoad={handleConvertEdgeToRoad}
                roadPresetWidth={roadPresetWidth}
                roadPresetSurface={roadPresetSurface}
                mode={canvasMode}
                onModeChange={setCanvasMode}
                showGrid={canvasShowGrid}
                onToggleGrid={() => setCanvasShowGrid(prev => !prev)}
                onUpdateLot={(id, vertices, areaSqm, perimeterM) => {
                  setLots(lots.map(l => {
                    if (l.id !== id) return l;
                    if (l.isParentBoundary) return l; // locked geometry
                    return {
                      ...l,
                      vertices,
                      areaSqm: areaSqm ?? l.areaSqm,
                      perimeterM: perimeterM ?? l.perimeterM,
                    };
                  }));
                }}
                onUndo={onUndo}
                onRedo={onRedo}
              />
              {/* Hint contextuel selon l'outil actif */}
              <p className="text-[11px] text-muted-foreground text-center px-2 py-1.5 border-t bg-muted/20">
                <Info className="h-3 w-3 inline mr-1 -mt-0.5 opacity-60" />
                {modeHint}
              </p>
              {lots.length > 1 && selectedLotIds.length === 0 && (
                <p className="hidden sm:block text-[10px] text-muted-foreground text-center py-1">
                  💡 Ctrl+clic (⌘+clic sur Mac) pour sélectionner plusieurs lots et les fusionner
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lot details panel */}
        <div ref={detailsPanelRef} className="space-y-2 scroll-mt-4">
          {selectedLot ? (
            <Card className="border-primary/20">
              <CardContent className="pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="font-semibold text-sm truncate">Lot {selectedLot.lotNumber}</h4>
                    {selectedLot.isParentBoundary && (
                      <Badge variant="secondary" className="text-[9px] gap-1 px-1.5 py-0 h-4 shrink-0">
                        <Shield className="h-2.5 w-2.5" />
                        Parcelle mère — verrouillée
                      </Badge>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteLot(selectedLot.id)}
                            disabled={!!selectedLot.isParentBoundary}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        {selectedLot.isParentBoundary
                          ? 'La parcelle mère ne peut pas être supprimée. Utilisez Diviser ou Couper.'
                          : 'Supprimer ce lot'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Type de zone — convertir lot ↔ voie ↔ espace commun */}
                <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Type de zone
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => { /* déjà un lot */ }}
                    >
                      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                      Lot
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => handleConvertSelectedZone('road')}
                        >
                          <Route className="h-3 w-3" />
                          Voie
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        Convertir cette zone en voie. Vous pourrez ensuite régler sa largeur et son revêtement.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => handleConvertSelectedZone('commonSpace')}
                        >
                          <TreePine className="h-3 w-3" />
                          Espace
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        Convertir cette zone en espace commun (espace vert, parking, drainage…).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Surface</span>
                    <p className="font-bold text-sm">{formatSqm(selectedLot.areaSqm)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Périmètre</span>
                    <p className="font-bold text-sm">{formatMeters(selectedLot.perimeterM)}</p>
                  </div>
                </div>
                <Separator />
                <LotVerticesEditor
                  vertices={selectedLot.vertices}
                  parentGps={parentParcel?.gpsCoordinates}
                  parentVertices={parentVertices}
                  disabled={!!selectedLot.isParentBoundary}
                  onChange={(verts) => updateSelectedLot({
                    vertices: verts,
                    areaSqm: computeArea(verts),
                    perimeterM: computePerim(verts),
                  })}
                />
                <div>
                  <Label className="text-xs">Numéro du lot</Label>
                  <Input
                    value={selectedLot.lotNumber}
                    onChange={e => updateSelectedLot({ lotNumber: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Usage prévu</Label>
                  <Select
                    value={selectedLot.intendedUse}
                    onValueChange={(v: any) => updateSelectedLot({ intendedUse: v, color: LOT_COLORS[v as keyof typeof LOT_COLORS] })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(USAGE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LOT_COLORS[key as keyof typeof LOT_COLORS] }} />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Propriétaire (optionnel)</Label>
                  <Input
                    value={selectedLot.ownerName || ''}
                    onChange={e => updateSelectedLot({ ownerName: e.target.value })}
                    className="h-7 text-xs"
                    placeholder="Nom du propriétaire"
                  />
                </div>
              </CardContent>
            </Card>
          ) : editingRoad ? (
            <Card className="border-primary/20">
              <CardContent className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Route className="h-4 w-4" />
                    {editingRoad.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleDeleteRoad(editingRoad.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Type de zone (rester voie ou reconvertir) */}
                <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Type de zone
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Cette zone est une <span className="font-semibold text-foreground">voie</span>.
                    Réglez ci-dessous sa largeur et son revêtement — la voie se met à jour
                    immédiatement sur le plan.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={editingRoad.name}
                    onChange={e => updateRoad(editingRoad.id, { name: e.target.value })}
                    className="h-7 text-xs"
                    disabled={(editingRoad as any).isExisting}
                  />
                </div>

                <div>
                  <Label className="text-xs">Largeur ({editingRoad.widthM} m)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      min={2}
                      max={30}
                      step={0.5}
                      value={[editingRoad.widthM]}
                      onValueChange={([v]) => updateRoad(editingRoad.id, { widthM: v })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={2}
                      max={30}
                      step={0.5}
                      value={editingRoad.widthM}
                      onChange={e => updateRoad(editingRoad.id, { widthM: parseFloat(e.target.value) || 6 })}
                      className="h-7 text-xs w-16"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Type de surface</Label>
                  <Select
                    value={editingRoad.surfaceType}
                    onValueChange={(v: any) => updateRoad(editingRoad.id, { surfaceType: v })}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROAD_SURFACE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-3">
                <div className="text-center text-xs text-muted-foreground py-4">
                  <Info className="h-5 w-5 mx-auto mb-2 opacity-40" />
                  Cliquez sur un lot ou une voie pour voir ses détails et le modifier
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lot list */}
          <LotsListPanel
            lots={lots}
            setLots={setLots}
            selectedLotId={selectedLotId}
            onSelectLot={setSelectedLotId}
          />

          {/* Roads management */}
          <RoadsListPanel
            roads={roads}
            editingRoad={editingRoad}
            editingRoadId={editingRoadId}
            setEditingRoadId={setEditingRoadId}
            onDeleteRoad={handleDeleteRoad}
            onUpdateRoad={updateRoad}
            onAddRoad={handleAddRoad}
            canvasMode={canvasMode}
            setCanvasMode={setCanvasMode}
            hasMultipleLots={lots.length >= 2}
          />

          {/* Common Spaces */}
          <CommonSpacesPanel commonSpaces={commonSpaces} setCommonSpaces={setCommonSpaces} />

          {/* Servitudes */}
          <ServitudesPanel servitudes={servitudes} setServitudes={setServitudes} />

          {/* Validation */}
          <ValidationPanel validation={validation} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default StepLotDesigner;
