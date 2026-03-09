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
  Grid3X3, ArrowLeftRight, ArrowUpDown, Info, Settings2, Route
} from 'lucide-react';
import { SubdivisionLot, SubdivisionRoad, AutoSubdivideOptions, ParentParcelInfo, LOT_COLORS, USAGE_LABELS, ROAD_SURFACE_LABELS, Point2D } from '../types';
import { ValidationResult, mergeLotsThroughDeletedRoad } from '../utils/geometry';
import LotCanvas from '../LotCanvas';

interface StepLotDesignerProps {
  parentParcel: ParentParcelInfo | null;
  parentVertices?: Point2D[];
  parentSides?: any[];
  lots: SubdivisionLot[];
  setLots: (lots: SubdivisionLot[]) => void;
  roads: SubdivisionRoad[];
  setRoads: (roads: SubdivisionRoad[]) => void;
  onAutoSubdivide: (options: AutoSubdivideOptions) => void;
  validation: ValidationResult;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const StepLotDesigner: React.FC<StepLotDesignerProps> = ({
  parentParcel, parentVertices, parentSides, lots, setLots, roads, setRoads,
  onAutoSubdivide, validation, canUndo, canRedo, onUndo, onRedo
}) => {
  const [numberOfLots, setNumberOfLots] = useState(4);
  const [direction, setDirection] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [includeRoad, setIncludeRoad] = useState(true);
  const [roadWidth, setRoadWidth] = useState(6);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [showAutoPanel, setShowAutoPanel] = useState(lots.length === 0);
  const [editingRoadId, setEditingRoadId] = useState<string | null>(null);

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
                onSelectLot={setSelectedLotId}
                selectedRoadId={editingRoadId}
                onSelectRoad={setEditingRoadId}
                onDeleteRoad={handleDeleteRoad}
                onUpdateLot={(id, vertices) => {
                  setLots(lots.map(l => l.id === id ? { ...l, vertices } : l));
                }}
              />
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleAddRoad}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {roads.map(road => {
                  const isExisting = (road as any).isExisting;
                  const isEditing = editingRoadId === road.id;
                  return (
                    <div
                      key={road.id}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors
                        ${isEditing ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}
                      `}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isExisting ? 'bg-amber-600' : 'bg-muted-foreground'}`} />
                      <button
                        className="flex-1 text-left truncate"
                        onClick={() => setEditingRoadId(isEditing ? null : road.id)}
                      >
                        <span className="font-medium">{road.name}</span>
                        <span className="text-muted-foreground ml-1">({road.widthM}m)</span>
                      </button>
                      {!isExisting && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRoad(road.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {roads.length === 0 && (
                  <p className="text-center text-muted-foreground text-[10px] py-2">
                    Aucune voie
                  </p>
                )}
              </div>

              {/* Road editor */}
              {editingRoad && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input
                        value={editingRoad.name}
                        onChange={e => updateRoad(editingRoad.id, { name: e.target.value })}
                        className="h-7 text-xs"
                        disabled={(editingRoad as any).isExisting}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Largeur (m)</Label>
                        <Input
                          type="number"
                          min={2}
                          max={30}
                          value={editingRoad.widthM}
                          onChange={e => updateRoad(editingRoad.id, { widthM: parseFloat(e.target.value) || 6 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Revêtement</Label>
                        <Select
                          value={editingRoad.surfaceType}
                          onValueChange={(v: any) => updateRoad(editingRoad.id, { surfaceType: v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
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
