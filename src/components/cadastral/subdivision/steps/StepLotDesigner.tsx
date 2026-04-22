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
  Plus, Trash2, Undo2, Redo2, AlertTriangle,
  Info, Route,
  MousePointer, Scissors, Shield, TreePine
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  ParentParcelInfo, LOT_COLORS, USAGE_LABELS, ROAD_SURFACE_LABELS, 
  COMMON_SPACE_LABELS, COMMON_SPACE_COLORS, Point2D, LotAnnotation
} from '../types';
import { ValidationResult, mergeLotsThroughDeletedRoad, polygonArea, splitRoadsAtIntersections } from '../utils/geometry';
import { convertZoneType, ZoneType } from '../utils/convertZoneType';
import LotCanvas, { CanvasMode, EdgeInfo } from '../LotCanvas';

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

// Simple convex hull (gift wrapping / Jarvis march)
function convexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return points;
  const pts = [...points];
  let leftmost = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < pts[leftmost].x || (pts[i].x === pts[leftmost].x && pts[i].y < pts[leftmost].y)) {
      leftmost = i;
    }
  }
  const hull: Point2D[] = [];
  let current = leftmost;
  do {
    hull.push(pts[current]);
    let next = 0;
    for (let i = 1; i < pts.length; i++) {
      if (next === current) { next = i; continue; }
      const cross = (pts[i].x - pts[current].x) * (pts[next].y - pts[current].y) -
                    (pts[i].y - pts[current].y) * (pts[next].x - pts[current].x);
      if (cross > 0) next = i;
    }
    current = next;
  } while (current !== leftmost && hull.length < pts.length);
  return hull;
}

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
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [editingRoadId, setEditingRoadId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [canvasShowGrid, setCanvasShowGrid] = useState(true);
  // Measure mode state
  const [measurePoints, setMeasurePoints] = useState<Point2D[]>([]);
  // Road pre-configuration
  const [roadPresetWidth, setRoadPresetWidth] = useState(6);
  const [roadPresetSurface, setRoadPresetSurface] = useState<SubdivisionRoad['surfaceType']>('planned');

  const editingRoad = roads.find(r => r.id === editingRoadId) || null;

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
      id: `road-new-${Date.now()}`,
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
    const sideLength = Math.sqrt(parentParcel?.areaSqm || 1000);

    const newLot: SubdivisionLot = {
      id: `lot-${Date.now()}-new`,
      lotNumber: String(maxLotNum + 1),
      vertices: [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        { x: cx - w / 2, y: cy + h / 2 },
      ],
      areaSqm: Math.round(w * h * (parentParcel?.areaSqm || 1000)),
      perimeterM: Math.round(2 * (w + h) * sideLength),
      intendedUse: 'residential',
      isBuilt: false,
      hasFence: false,
      color: '#22c55e',
    };
    setLots([...lots, newLot]);
    setSelectedLotId(newLot.id);
  }, [lots, setLots, parentVertices, parentParcel]);

  const selectedLot = lots.find(l => l.id === selectedLotId);

  const updateSelectedLot = useCallback((updates: Partial<SubdivisionLot>) => {
    if (!selectedLotId) return;
    setLots(lots.map(l => l.id === selectedLotId ? { ...l, ...updates } : l));
  }, [selectedLotId, lots, setLots]);

  const deleteLot = useCallback((id: string) => {
    setLots(lots.filter(l => l.id !== id));
    if (selectedLotId === id) setSelectedLotId(null);
  }, [lots, setLots, selectedLotId]);

  const duplicateLot = useCallback((id: string) => {
    const lot = lots.find(l => l.id === id);
    if (!lot) return;
    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);
    const offset = 0.03;
    const newLot: SubdivisionLot = {
      ...lot,
      id: `lot-${Date.now()}-dup`,
      lotNumber: String(maxLotNum + 1),
      vertices: lot.vertices.map(v => ({ x: Math.min(1, v.x + offset), y: Math.min(1, v.y + offset) })),
      annotations: [],
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
    const sideLengthM = Math.sqrt(parentAreaSqm);

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);
    const nextNumber = toType === 'road'
      ? roads.length + 1
      : toType === 'commonSpace'
        ? commonSpaces.length + 1
        : maxLotNum + 1;

    const result = convertZoneType(
      { lot },
      toType,
      { parentAreaSqm, parentNormArea, sideLengthM, nextNumber, defaultRoadWidthM: roadPresetWidth },
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
  }, [selectedLotId, lots, setLots, roads, setRoads, commonSpaces, setCommonSpaces, parentParcel, parentVertices, roadPresetWidth]);


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

    const totalNormArea = calcArea(verts);
    const norm1 = calcArea(poly1);
    const norm2 = calcArea(poly2);
    const area1 = totalNormArea > 0 ? Math.round(lot.areaSqm * norm1 / totalNormArea) : Math.round(lot.areaSqm / 2);
    const area2 = lot.areaSqm - area1;

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const newLot1: SubdivisionLot = {
      ...lot,
      id: `lot-${Date.now()}-a`,
      lotNumber: String(maxLotNum + 1),
      vertices: poly1,
      areaSqm: area1,
    };
    const newLot2: SubdivisionLot = {
      ...lot,
      id: `lot-${Date.now()}-b`,
      lotNumber: String(maxLotNum + 2),
      vertices: poly2,
      areaSqm: area2,
    };

    setLots(lots.map(l => l.id === lotId ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
  }, [lots, setLots]);

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

    // Combine all vertices into a convex hull approximation
    const allPoints = lotsToMerge.flatMap(l => l.vertices);
    // Simple convex hull (gift wrapping)
    const hull = convexHull(allPoints);

    const totalArea = lotsToMerge.reduce((s, l) => s + l.areaSqm, 0);
    const keepLot = lotsToMerge[0];
    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const mergedLot: SubdivisionLot = {
      ...keepLot,
      id: `lot-${Date.now()}-merged`,
      lotNumber: String(maxLotNum + 1),
      vertices: hull,
      areaSqm: totalArea,
    };

    setLots([...lots.filter(l => !ids.includes(l.id)), mergedLot]);
    setSelectedLotIds([]);
    setSelectedLotId(mergedLot.id);
  }, [lots, setLots]);

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

    const totalNormArea = polygonArea(verts);
    const norm1 = polygonArea(poly1);
    const norm2 = polygonArea(poly2);
    const area1 = totalNormArea > 0 ? Math.round(lot.areaSqm * norm1 / totalNormArea) : Math.round(lot.areaSqm / 2);
    const area2 = lot.areaSqm - area1;

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const newLot1: SubdivisionLot = {
      ...lot, id: `lot-${Date.now()}-a`, lotNumber: String(maxLotNum + 1),
      vertices: poly1, areaSqm: Math.max(1, area1),
    };
    const newLot2: SubdivisionLot = {
      ...lot, id: `lot-${Date.now()}-b`, lotNumber: String(maxLotNum + 2),
      vertices: poly2, areaSqm: Math.max(1, area2),
    };

    setLots(lots.map(l => l.id === lotId ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
    setCanvasMode('select');
  }, [lots, setLots]);

  // Handle finished road drawing — also split the traversed lot
  const handleFinishRoadDraw = useCallback((path: Point2D[]) => {
    if (path.length < 2) return;
    const cutStart = path[0];
    const cutEnd = path[path.length - 1];

    // 1. Create the road (affectedLotIds will be set below)
    const newRoad: SubdivisionRoad = {
      id: `road-draw-${Date.now()}`,
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

        const parentPoly = parentVertices && parentVertices.length >= 3
          ? parentVertices
          : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
        const parentNormArea = polygonArea(parentPoly);
        const totalParentArea = parentParcel?.areaSqm || 1000;
        const areaSqm = Math.max(1, Math.round((polygonArea(newVertices) / parentNormArea) * totalParentArea));
        const perimeterM = Math.round(newVertices.reduce((sum, v, i) => {
          const next = newVertices[(i + 1) % newVertices.length];
          const dx2 = (next.x - v.x) * sideLength;
          const dy2 = (next.y - v.y) * sideLength;
          return sum + Math.sqrt(dx2 * dx2 + dy2 * dy2);
        }, 0));

        return { ...lot, vertices: newVertices, areaSqm, perimeterM };
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

    const parentPoly = parentVertices && parentVertices.length >= 3
      ? parentVertices
      : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const parentNormArea = polygonArea(parentPoly);
    const totalParentArea = parentParcel?.areaSqm || 1000;

    const computeArea = (poly: Point2D[]) => Math.max(1, Math.round((polygonArea(poly) / parentNormArea) * totalParentArea));

    const maxLotNum = lots.reduce((m, l) => Math.max(m, parseInt(l.lotNumber) || 0), 0);

    const newLot1: SubdivisionLot = {
      ...targetLot, id: `lot-${Date.now()}-a`, lotNumber: String(maxLotNum + 1),
      vertices: shrunk1, areaSqm: computeArea(shrunk1),
    };
    const newLot2: SubdivisionLot = {
      ...targetLot, id: `lot-${Date.now()}-b`, lotNumber: String(maxLotNum + 2),
      vertices: shrunk2, areaSqm: computeArea(shrunk2),
    };

    // Store affectedLotIds on the new road for future width adjustments
    const updatedRoads = splitRoads.map(r =>
      r.id === newRoad.id ? { ...r, affectedLotIds: [newLot1.id, newLot2.id] } : r
    );
    setRoads(updatedRoads);

    setLots(lots.map(l => l.id === targetLot!.id ? newLot1 : l).concat(newLot2));
    setSelectedLotId(newLot1.id);
    setCanvasMode('select');
  }, [lots, setLots, roads, setRoads, roadPresetWidth, roadPresetSurface, parentParcel, parentVertices]);

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
      id: `road-edge-${Date.now()}`,
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

      const normArea = polygonArea(newVertices);
      const parentPoly = parentVertices && parentVertices.length >= 3
        ? parentVertices
        : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
      const parentNormArea = polygonArea(parentPoly);
      const areaSqm = Math.round((normArea / parentNormArea) * (parentParcel?.areaSqm || 1000));
      const perimeterM = Math.round(newVertices.reduce((sum, v, i) => {
        const next = newVertices[(i + 1) % newVertices.length];
        const dx = (next.x - v.x) * sideLength;
        const dy = (next.y - v.y) * sideLength;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0));

      return { ...lot, vertices: newVertices, areaSqm, perimeterM };
    });

    setLots(updatedLots);
    setRoads([...roads, newRoad]);
    setEditingRoadId(newRoad.id);
    setCanvasMode('select');
  }, [lots, setLots, roads, setRoads, parentParcel, parentVertices, roadPresetWidth, roadPresetSurface]);

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

          const parentPoly = parentVertices && parentVertices.length >= 3
            ? parentVertices
            : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
          const parentNormArea = polygonArea(parentPoly);
          const normArea = polygonArea(newVertices);
          const areaSqm = Math.round((normArea / parentNormArea) * (parentParcel?.areaSqm || 1000));
          const perimeterM = Math.round(newVertices.reduce((sum, v, i) => {
            const next = newVertices[(i + 1) % newVertices.length];
            const dx2 = (next.x - v.x) * sideLength;
            const dy2 = (next.y - v.y) * sideLength;
            return sum + Math.sqrt(dx2 * dx2 + dy2 * dy2);
          }, 0));

          return { ...lot, vertices: newVertices, areaSqm, perimeterM };
        });

        setLots(updatedLots);
      }
    }

    setRoads(roads.map(r => r.id === roadId ? { ...r, ...updates } : r));
  }, [roads, setRoads, lots, setLots, parentParcel, parentVertices]);

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
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-2">
        {/* Zone 1 — Outils */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Outils</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canvasMode === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCanvasMode('select')}
                className="gap-1.5 text-xs"
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
                className="gap-1.5 text-xs"
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

        <Separator orientation="vertical" className="h-8" />

        {/* Zone 2 — Actions rapides */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Actions</span>
          {lots.length === 0 && onCreateInitialLot ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onCreateInitialLot}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Lot = parcelle entière
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                Crée un premier lot couvrant toute votre parcelle. C'est le point de départ recommandé : ensuite, vous pouvez le diviser.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEmptyLot}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un lot
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                Ajoute un petit lot rectangulaire vide au centre de la parcelle. Vous pourrez ensuite le déplacer et le redimensionner.
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-1.5 text-xs">
                  <Undo2 className="h-3.5 w-3.5" /> Annuler
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Annule la dernière modification</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} className="gap-1.5 text-xs">
                  <Redo2 className="h-3.5 w-3.5" /> Rétablir
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Rétablit la modification annulée</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        {/* Zone 3 — État */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {lots.length} lot{lots.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {coveragePercent}% couvert
          </Badge>
        </div>
      </div>

      {/* Guide when no lots */}
      {lots.length === 0 && (
        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="text-xs flex items-center gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              Commencez par créer le <strong>lot parcelle entière</strong>, puis utilisez l'outil <strong>Diviser un lot</strong> pour le découper en plusieurs lots.
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
                parentAreaSqm={parentArea}
                parentVertices={parentVertices}
                parentSides={parentSides}
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
                onUpdateLot={(id, vertices) => {
                  setLots(lots.map(l => l.id === id ? { ...l, vertices } : l));
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
                <p className="text-[10px] text-muted-foreground text-center py-1">
                  💡 Ctrl+clic (⌘+clic sur Mac) pour sélectionner plusieurs lots et les fusionner
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lot details panel */}
        <div className="space-y-2">
          {selectedLot ? (
            <Card className="border-primary/20">
              <CardContent className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Lot {selectedLot.lotNumber}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deleteLot(selectedLot.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

                    <p className="font-bold text-sm">{selectedLot.areaSqm.toLocaleString()} m²</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Périmètre</span>
                    <p className="font-bold text-sm">{selectedLot.perimeterM.toLocaleString()} m</p>
                  </div>
                </div>
                <Separator />
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
          ) : (
            <Card>
              <CardContent className="pt-3">
                <div className="text-center text-xs text-muted-foreground py-4">
                  <Info className="h-5 w-5 mx-auto mb-2 opacity-40" />
                  Cliquez sur un lot pour voir ses détails et le modifier
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lot list */}
          <Card>
            <CardContent className="pt-3">
              <h4 className="font-semibold text-xs mb-2">Tous les lots ({lots.length})</h4>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {lots.map(lot => (
                  <button
                    key={lot.id}
                    onClick={() => setSelectedLotId(lot.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left
                      ${lot.id === selectedLotId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}
                    `}
                  >
                    <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: lot.color || LOT_COLORS[lot.intendedUse] }} />
                    <span className="font-medium flex-1">Lot {lot.lotNumber}</span>
                    <span className="text-muted-foreground">{lot.areaSqm.toLocaleString()} m²</span>
                  </button>
                ))}
                {lots.length === 0 && (
                  <p className="text-center text-muted-foreground text-[10px] py-3">
                    Cliquez sur "Lot parcelle entière" puis tracez des lignes pour diviser
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roads management */}
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-xs flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" />
                  Voies ({roads.length})
                </h4>
                <div className="flex gap-1">
                  <Button
                    variant={canvasMode === 'selectEdge' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (lots.length >= 2) {
                        setCanvasMode(canvasMode === 'selectEdge' ? 'select' : 'selectEdge');
                      } else {
                        handleAddRoad();
                      }
                    }}
                    title={lots.length >= 2 ? 'Cliquer sur une limite entre lots' : 'Ajouter une voie'}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {roads.map(road => {
                  const isExisting = (road as any).isExisting;
                  const isEditing = editingRoadId === road.id;
                  return (
                    <div key={road.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${isEditing ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}>
                      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isExisting ? 'bg-amber-600' : 'bg-muted-foreground'}`} />
                      <button className="flex-1 text-left truncate" onClick={() => setEditingRoadId(isEditing ? null : road.id)}>
                        <span className="font-medium">{road.name}</span>
                        <span className="text-muted-foreground ml-1">({road.widthM}m)</span>
                      </button>
                      {!isExisting && (
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => handleDeleteRoad(road.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {roads.length === 0 && <p className="text-center text-muted-foreground text-[10px] py-2">Aucune voie</p>}
              </div>
              {editingRoad && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input value={editingRoad.name} onChange={e => updateRoad(editingRoad.id, { name: e.target.value })} className="h-7 text-xs" disabled={(editingRoad as any).isExisting} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Largeur ({editingRoad.widthM}m)</Label>
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
                        <Label className="text-xs">Revêtement</Label>
                        <Select value={editingRoad.surfaceType} onValueChange={(v: any) => updateRoad(editingRoad.id, { surfaceType: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROAD_SURFACE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Common Spaces */}
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-xs flex items-center gap-1">
                  <TreePine className="h-3.5 w-3.5" />
                  Espaces communs ({commonSpaces.length})
                </h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  const newSpace: SubdivisionCommonSpace = {
                    id: `cs-${Date.now()}`,
                    type: 'green_space',
                    name: `Espace ${commonSpaces.length + 1}`,
                    vertices: [],
                    areaSqm: 0,
                    color: COMMON_SPACE_COLORS.green_space,
                  };
                  setCommonSpaces([...commonSpaces, newSpace]);
                }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {commonSpaces.map((space, idx) => (
                  <div key={space.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs hover:bg-muted/50">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: space.color }} />
                    <div className="flex-1 space-y-1">
                      <Input value={space.name} onChange={e => {
                        setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, name: e.target.value } : s));
                      }} className="h-6 text-xs" />
                      <div className="flex gap-1">
                        <Select value={space.type} onValueChange={(v: any) => {
                          setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, type: v, color: COMMON_SPACE_COLORS[v as keyof typeof COMMON_SPACE_COLORS] || s.color } : s));
                        }}>
                          <SelectTrigger className="h-6 text-[10px] flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMMON_SPACE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="m²" value={space.areaSqm || ''} onChange={e => {
                          setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, areaSqm: parseFloat(e.target.value) || 0 } : s));
                        }} className="h-6 text-[10px] w-16" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setCommonSpaces(commonSpaces.filter(s => s.id !== space.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {commonSpaces.length === 0 && <p className="text-center text-muted-foreground text-[10px] py-2">Aucun espace commun</p>}
              </div>
            </CardContent>
          </Card>

          {/* Servitudes */}
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-xs flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Servitudes ({servitudes.length})
                </h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  const newServitude: SubdivisionServitude = {
                    id: `srv-${Date.now()}`,
                    type: 'passage',
                    description: '',
                    affectedLots: [],
                    widthM: 3,
                  };
                  setServitudes([...servitudes, newServitude]);
                }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {servitudes.map(srv => (
                  <div key={srv.id} className="px-2 py-1.5 rounded-lg text-xs hover:bg-muted/50 space-y-1">
                    <div className="flex items-center gap-1">
                      <Select value={srv.type} onValueChange={(v: any) => {
                        setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, type: v } : s));
                      }}>
                        <SelectTrigger className="h-6 text-[10px] flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passage">Passage</SelectItem>
                          <SelectItem value="drainage">Drainage</SelectItem>
                          <SelectItem value="utility">Réseau (eau/élec)</SelectItem>
                          <SelectItem value="view">Vue</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="m" value={srv.widthM || ''} onChange={e => {
                        setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, widthM: parseFloat(e.target.value) || 0 } : s));
                      }} className="h-6 text-[10px] w-14" />
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setServitudes(servitudes.filter(s => s.id !== srv.id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input value={srv.description} onChange={e => {
                      setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, description: e.target.value } : s));
                    }} className="h-6 text-[10px]" placeholder="Description de la servitude..." />
                  </div>
                ))}
                {servitudes.length === 0 && <p className="text-center text-muted-foreground text-[10px] py-2">Aucune servitude</p>}
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <Card className={validation.errors.length > 0 ? 'border-destructive/30' : 'border-amber-500/30'}>
              <CardContent className="pt-3 space-y-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    {err}
                  </div>
                ))}
                {validation.warnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600">
                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    {warn}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default StepLotDesigner;
