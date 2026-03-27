import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Wand2, Plus, Trash2, Undo2, Redo2, AlertTriangle, CheckCircle,
  Grid3X3, ArrowLeftRight, ArrowUpDown, Info, Settings2, Route,
  Scissors, MousePointer, Pencil, TreePine, Shield, Sticker
} from 'lucide-react';
import { 
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  AutoSubdivideOptions, ParentParcelInfo, LOT_COLORS, USAGE_LABELS, ROAD_SURFACE_LABELS, 
  COMMON_SPACE_LABELS, COMMON_SPACE_COLORS, Point2D, LotAnnotation
} from '../types';
import { ValidationResult, mergeLotsThroughDeletedRoad, polygonArea } from '../utils/geometry';
import LotCanvas, { CanvasMode } from '../LotCanvas';

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
  onAutoSubdivide: (options: AutoSubdivideOptions) => void;
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

const StepLotDesigner: React.FC<StepLotDesignerProps> = ({
  parentParcel, parentVertices, parentSides, lots, setLots, roads, setRoads,
  commonSpaces, setCommonSpaces, servitudes, setServitudes, lotIds,
  onAutoSubdivide, validation, canUndo, canRedo, onUndo, onRedo
}) => {
  const [numberOfLots, setNumberOfLots] = useState(4);
  const [direction, setDirection] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [includeRoad, setIncludeRoad] = useState(true);
  const [roadWidth, setRoadWidth] = useState(6);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [showAutoPanel, setShowAutoPanel] = useState(lots.length === 0);
  const [editingRoadId, setEditingRoadId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [canvasShowGrid, setCanvasShowGrid] = useState(true);
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

  const handleAutoGenerate = () => {
    onAutoSubdivide({
      numberOfLots,
      direction,
      includeRoad,
      roadWidthM: roadWidth,
      equalSize: true,
    });
    setShowAutoPanel(false);
  };

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

  // Handle finished road drawing
  const handleFinishRoadDraw = useCallback((path: Point2D[]) => {
    if (path.length < 2) return;
    const newRoad: SubdivisionRoad = {
      id: `road-draw-${Date.now()}`,
      name: `Voie ${roads.length + 1}`,
      widthM: roadPresetWidth,
      surfaceType: roadPresetSurface,
      isExisting: false,
      path,
    };
    setRoads([...roads, newRoad]);
    setEditingRoadId(newRoad.id);
    setCanvasMode('select');
  }, [roads, setRoads, roadPresetWidth, roadPresetSurface]);

  const handleUpdateRoad = useCallback((roadId: string, updates: Partial<SubdivisionRoad>) => {
    setRoads(roads.map(r => r.id === roadId ? { ...r, ...updates } : r));
  }, [roads, setRoads]);

  const totalArea = lots.reduce((s, l) => s + l.areaSqm, 0);
  const parentArea = parentParcel?.areaSqm || 0;
  const coveragePercent = parentArea > 0 ? Math.round(totalArea / parentArea * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showAutoPanel ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAutoPanel(!showAutoPanel)}
          className="gap-1 text-xs"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Auto-découpage
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Mode buttons */}
        <Button
          variant={canvasMode === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCanvasMode('select')}
          className="gap-1 text-xs"
          title="Sélectionner et déplacer"
        >
          <MousePointer className="h-3.5 w-3.5" />
          Sélection
        </Button>
        <Button
          variant={canvasMode === 'cut' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCanvasMode(canvasMode === 'cut' ? 'select' : 'cut')}
          className="gap-1 text-xs"
          disabled={lots.length === 0}
          title="Découper un lot en traçant une ligne"
        >
          <Scissors className="h-3.5 w-3.5" />
          Découper
        </Button>
        <Button
          variant={canvasMode === 'drawRoad' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCanvasMode(canvasMode === 'drawRoad' ? 'select' : 'drawRoad')}
          className="gap-1 text-xs"
          title="Tracer une voie manuellement"
        >
          <Pencil className="h-3.5 w-3.5" />
          Tracer voie
        </Button>
        <Button
          variant={canvasMode === 'clipart' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCanvasMode(canvasMode === 'clipart' ? 'select' : 'clipart')}
          className="gap-1 text-xs"
          title="Placer des cliparts sur les lots"
        >
          <Sticker className="h-3.5 w-3.5" />
          Cliparts
        </Button>
        
        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-1 text-xs">
          <Undo2 className="h-3.5 w-3.5" /> Annuler
        </Button>
        <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} className="gap-1 text-xs">
          <Redo2 className="h-3.5 w-3.5" /> Rétablir
        </Button>
        <div className="flex-1" />
        <Badge variant="outline" className="text-[10px]">
          {lots.length} lot{lots.length !== 1 ? 's' : ''} • {coveragePercent}% couvert
        </Badge>
      </div>

      {/* Auto-subdivide panel */}
      {showAutoPanel && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Découpage automatique</h4>
            </div>
            
            {/* Road-bordering info */}
            {parentSides && parentSides.some((s: any) => s?.borderType === 'route') && (
              <Alert className="border-amber-500/30 bg-amber-50/50 py-2">
                <AlertDescription className="text-[11px] text-amber-800 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  La parcelle borde une route — les lots adjacents seront automatiquement desservis par celle-ci.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-muted-foreground">
              Le système découpera automatiquement la parcelle en tenant compte des routes existantes. Vous pourrez ensuite ajuster manuellement chaque lot.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Nombre de lots</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={numberOfLots}
                  onChange={e => setNumberOfLots(parseInt(e.target.value) || 2)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">
                      <span className="flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Horizontal</span>
                    </SelectItem>
                    <SelectItem value="vertical">
                      <span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Vertical</span>
                    </SelectItem>
                    <SelectItem value="grid">
                      <span className="flex items-center gap-1"><Grid3X3 className="h-3 w-3" /> Grille</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Voie interne</Label>
                <Select value={includeRoad ? 'yes' : 'no'} onValueChange={v => setIncludeRoad(v === 'yes')}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Oui</SelectItem>
                    <SelectItem value="no">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {includeRoad && (
                <div>
                  <Label className="text-xs">Largeur voie (m)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={15}
                    value={roadWidth}
                    onChange={e => setRoadWidth(parseInt(e.target.value) || 6)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleAutoGenerate} className="gap-1 w-full sm:w-auto">
              <Wand2 className="h-3.5 w-3.5" />
              Générer {numberOfLots} lots
            </Button>
          </CardContent>
        </Card>
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
                onDeleteLot={deleteLot}
                onDuplicateLot={duplicateLot}
                onUpdateLotAnnotations={updateLotAnnotations}
                onSplitLot={handleSplitLot}
                onMergeLots={handleMergeLots}
                onCutLot={handleCutLot}
                onFinishRoadDraw={handleFinishRoadDraw}
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
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Surface</span>
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
                    Utilisez l'auto-découpage pour commencer
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
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddRoad}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
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
                        <Label className="text-xs">Largeur (m)</Label>
                        <Input type="number" min={2} max={30} value={editingRoad.widthM} onChange={e => updateRoad(editingRoad.id, { widthM: parseFloat(e.target.value) || 6 })} className="h-7 text-xs" />
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
  );
};

export default StepLotDesigner;
