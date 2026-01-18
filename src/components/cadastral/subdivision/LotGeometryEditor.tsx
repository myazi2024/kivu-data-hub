import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Trash2,
  Copy,
  Ruler,
  CornerUpRight,
  Route,
  Building2,
  Fence,
  Move,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LotData, SideDimension, FENCE_TYPES, SURFACE_TYPES } from './types';
import { cn } from '@/lib/utils';

interface LotGeometryEditorProps {
  lots: LotData[];
  onLotsChange: (lots: LotData[]) => void;
  parentParcelArea: number;
  onDuplicateLot: (lotId: string, count: number) => void;
}

const generateSideId = () => crypto.randomUUID().slice(0, 8);

const createDefaultSide = (index: number, total: number): SideDimension => ({
  id: generateSideId(),
  length: 0,
  angle: 360 / total,
  isShared: false,
  isRoadBordering: false,
  roadType: 'none'
});

const createDefaultLot = (lotNumber: number, numberOfSides: number = 4): LotData => {
  const sides: SideDimension[] = [];
  for (let i = 0; i < numberOfSides; i++) {
    sides.push(createDefaultSide(i, numberOfSides));
  }
  
  return {
    id: crypto.randomUUID(),
    lotNumber: `LOT-${lotNumber.toString().padStart(3, '0')}`,
    sides,
    numberOfSides,
    position: { x: 50 + (lotNumber % 3) * 100, y: 50 + Math.floor(lotNumber / 3) * 100 },
    rotation: 0,
    areaSqm: 0,
    perimeter: 0,
    isBuilt: false,
    hasFence: false,
    intendedUse: 'residential',
    color: '#22c55e'
  };
};

// Calculer l'aire d'un polygone régulier ou irrégulier
const calculatePolygonArea = (sides: SideDimension[]): number => {
  if (sides.length < 3) return 0;
  
  // Pour un polygone simple, utiliser la formule du lacet (shoelace)
  // Approximation basée sur les longueurs des côtés et les angles
  const n = sides.length;
  const totalAngle = sides.reduce((sum, s) => sum + s.angle, 0);
  
  if (n === 4) {
    // Quadrilatère: moyenne des côtés opposés
    const avgLength = (sides[0].length + sides[2].length) / 2;
    const avgWidth = (sides[1].length + sides[3].length) / 2;
    return avgLength * avgWidth;
  } else if (n === 3) {
    // Triangle: formule de Héron
    const a = sides[0].length;
    const b = sides[1].length;
    const c = sides[2].length;
    const s = (a + b + c) / 2;
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
  } else {
    // Polygone régulier approximatif
    const perimeter = sides.reduce((sum, s) => sum + s.length, 0);
    const sideLength = perimeter / n;
    return (n * sideLength * sideLength) / (4 * Math.tan(Math.PI / n));
  }
};

const calculatePerimeter = (sides: SideDimension[]): number => {
  return sides.reduce((sum, s) => sum + s.length, 0);
};

const SIDE_LABELS = ['Nord', 'Est', 'Sud', 'Ouest', 'Nord-Est', 'Sud-Est', 'Sud-Ouest', 'Nord-Ouest'];

export const LotGeometryEditor: React.FC<LotGeometryEditorProps> = ({
  lots,
  onLotsChange,
  parentParcelArea,
  onDuplicateLot
}) => {
  const [duplicateCount, setDuplicateCount] = React.useState<Record<string, number>>({});
  
  const addLot = (numberOfSides: number = 4) => {
    const newLot = createDefaultLot(lots.length + 1, numberOfSides);
    onLotsChange([...lots, newLot]);
  };
  
  const removeLot = (id: string) => {
    onLotsChange(lots.filter(l => l.id !== id));
  };
  
  const updateLot = (id: string, updates: Partial<LotData>) => {
    onLotsChange(lots.map(lot => {
      if (lot.id === id) {
        const updated = { ...lot, ...updates };
        updated.areaSqm = calculatePolygonArea(updated.sides);
        updated.perimeter = calculatePerimeter(updated.sides);
        return updated;
      }
      return lot;
    }));
  };
  
  const updateLotSide = (lotId: string, sideIndex: number, updates: Partial<SideDimension>) => {
    onLotsChange(lots.map(lot => {
      if (lot.id === lotId) {
        const newSides = [...lot.sides];
        newSides[sideIndex] = { ...newSides[sideIndex], ...updates };
        const updated = { ...lot, sides: newSides };
        updated.areaSqm = calculatePolygonArea(updated.sides);
        updated.perimeter = calculatePerimeter(updated.sides);
        return updated;
      }
      return lot;
    }));
  };
  
  const changeNumberOfSides = (lotId: string, newCount: number) => {
    onLotsChange(lots.map(lot => {
      if (lot.id === lotId) {
        const currentSides = [...lot.sides];
        const newSides: SideDimension[] = [];
        
        for (let i = 0; i < newCount; i++) {
          if (i < currentSides.length) {
            newSides.push({ ...currentSides[i], angle: 360 / newCount });
          } else {
            newSides.push(createDefaultSide(i, newCount));
          }
        }
        
        const updated = { ...lot, sides: newSides, numberOfSides: newCount };
        updated.areaSqm = calculatePolygonArea(updated.sides);
        updated.perimeter = calculatePerimeter(updated.sides);
        return updated;
      }
      return lot;
    }));
  };
  
  const handleDuplicate = (lotId: string) => {
    const count = duplicateCount[lotId] || 1;
    onDuplicateLot(lotId, count);
  };
  
  const totalLotsArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const remainingArea = parentParcelArea - totalLotsArea;
  
  const getSideLabel = (index: number, total: number): string => {
    if (total === 4) {
      return SIDE_LABELS[index];
    } else if (total === 3) {
      return `Côté ${index + 1}`;
    } else {
      return `Côté ${index + 1}`;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Actions et statistiques */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold">Définition géométrique des lots</h3>
          <p className="text-sm text-muted-foreground">
            Créez des lots avec 3 à 8 côtés, définissez dimensions et angles
          </p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={(v) => addLot(parseInt(v))}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Ajouter un lot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Triangle (3 côtés)</SelectItem>
              <SelectItem value="4">Quadrilatère (4 côtés)</SelectItem>
              <SelectItem value="5">Pentagone (5 côtés)</SelectItem>
              <SelectItem value="6">Hexagone (6 côtés)</SelectItem>
              <SelectItem value="7">Heptagone (7 côtés)</SelectItem>
              <SelectItem value="8">Octogone (8 côtés)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => addLot(4)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Lot rectangle</span>
          </Button>
        </div>
      </div>
      
      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card className="p-2 md:p-3">
          <div className="text-xl md:text-2xl font-bold text-primary">{lots.length}</div>
          <div className="text-xs text-muted-foreground">Lots créés</div>
        </Card>
        <Card className="p-2 md:p-3">
          <div className="text-xl md:text-2xl font-bold text-green-600">{totalLotsArea.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-muted-foreground">m² attribués</div>
        </Card>
        <Card className="p-2 md:p-3">
          <div className={cn("text-xl md:text-2xl font-bold", remainingArea < 0 ? 'text-destructive' : 'text-orange-600')}>
            {remainingArea.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground">m² restants</div>
        </Card>
        <Card className="p-2 md:p-3">
          <div className="text-xl md:text-2xl font-bold text-blue-600">
            {/* Protection contre division par zéro */}
            {parentParcelArea > 0 ? ((totalLotsArea / parentParcelArea) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="text-xs text-muted-foreground">Utilisé</div>
        </Card>
      </div>
      
      {/* Liste des lots */}
      <Accordion type="multiple" className="space-y-2">
        {lots.map((lot, lotIndex) => (
          <AccordionItem key={lot.id} value={lot.id} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${lot.color}20` }}
                >
                  <span className="text-sm font-bold" style={{ color: lot.color }}>{lotIndex + 1}</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{lot.lotNumber}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {lot.numberOfSides} côtés
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lot.areaSqm > 0 
                      ? `${lot.areaSqm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} m² • P: ${lot.perimeter.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m` 
                      : 'Dimensions à définir'}
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-2">
                  {lot.isBuilt && <Badge variant="secondary" className="text-[10px]">🏠</Badge>}
                  {lot.hasFence && <Badge variant="outline" className="text-[10px]">🧱</Badge>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                {/* En-tête avec actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">N° du lot</Label>
                      <Input
                        value={lot.lotNumber}
                        onChange={(e) => updateLot(lot.id, { lotNumber: e.target.value })}
                        className="h-8 text-sm w-32"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre de côtés</Label>
                      <Select 
                        value={lot.numberOfSides.toString()} 
                        onValueChange={(v) => changeNumberOfSides(lot.id, parseInt(v))}
                      >
                        <SelectTrigger className="h-8 w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 4, 5, 6, 7, 8].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} côtés</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={duplicateCount[lot.id] || 1}
                        onChange={(e) => setDuplicateCount({
                          ...duplicateCount,
                          [lot.id]: parseInt(e.target.value) || 1
                        })}
                        className="h-8 w-16 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(lot.id)}
                        className="h-8 gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Dupliquer
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLot(lot.id)}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Caractéristiques */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Usage prévu</Label>
                    <Select 
                      value={lot.intendedUse} 
                      onValueChange={(v) => updateLot(lot.id, { intendedUse: v as LotData['intendedUse'] })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">🏠 Résidentiel</SelectItem>
                        <SelectItem value="commercial">🏪 Commercial</SelectItem>
                        <SelectItem value="industrial">🏭 Industriel</SelectItem>
                        <SelectItem value="agricultural">🌾 Agricole</SelectItem>
                        <SelectItem value="mixed">🏗️ Mixte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col justify-end gap-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lot.isBuilt}
                        onCheckedChange={(checked) => updateLot(lot.id, { isBuilt: checked })}
                        className="scale-75"
                      />
                      <Label className="text-xs">Construit</Label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-end gap-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lot.hasFence}
                        onCheckedChange={(checked) => updateLot(lot.id, { hasFence: checked })}
                        className="scale-75"
                      />
                      <Label className="text-xs">Clôturé</Label>
                    </div>
                  </div>
                  
                  {lot.hasFence && (
                    <div className="space-y-1">
                      <Label className="text-xs">Type de clôture</Label>
                      <Select 
                        value={lot.fenceType || 'wall'} 
                        onValueChange={(v) => updateLot(lot.id, { fenceType: v as LotData['fenceType'] })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FENCE_TYPES.map(f => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.icon} {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Position et rotation */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Move className="h-3 w-3" /> Position X
                    </Label>
                    <Input
                      type="number"
                      value={lot.position.x}
                      onChange={(e) => updateLot(lot.id, { 
                        position: { ...lot.position, x: parseFloat(e.target.value) || 0 } 
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Move className="h-3 w-3" /> Position Y
                    </Label>
                    <Input
                      type="number"
                      value={lot.position.y}
                      onChange={(e) => updateLot(lot.id, { 
                        position: { ...lot.position, y: parseFloat(e.target.value) || 0 } 
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Rotation (°)
                    </Label>
                    <Input
                      type="number"
                      value={lot.rotation}
                      onChange={(e) => updateLot(lot.id, { rotation: parseFloat(e.target.value) || 0 })}
                      min={0}
                      max={360}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                {/* Dimensions des côtés */}
                <div className="pt-3 border-t">
                  <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <Ruler className="h-4 w-4" />
                    Dimensions et caractéristiques de chaque côté
                  </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lot.sides.map((side, sideIndex) => (
                      <div key={side.id} className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CornerUpRight 
                            className="h-3 w-3" 
                            style={{ transform: `rotate(${sideIndex * (360 / lot.numberOfSides)}deg)` }}
                          />
                          {getSideLabel(sideIndex, lot.numberOfSides)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Longueur (m)</Label>
                            <Input
                              type="number"
                              value={side.length || ''}
                              onChange={(e) => updateLotSide(lot.id, sideIndex, { 
                                length: parseFloat(e.target.value) || 0 
                              })}
                              placeholder="0"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Angle (°)</Label>
                            <Input
                              type="number"
                              value={side.angle}
                              onChange={(e) => updateLotSide(lot.id, sideIndex, { 
                                angle: parseFloat(e.target.value) || 90 
                              })}
                              min={0}
                              max={180}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={side.isShared}
                              onCheckedChange={(checked) => updateLotSide(lot.id, sideIndex, { isShared: checked })}
                              className="scale-75"
                            />
                            <Label className="text-xs">Côté mitoyen</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={side.isRoadBordering}
                              onCheckedChange={(checked) => updateLotSide(lot.id, sideIndex, { isRoadBordering: checked })}
                              className="scale-75"
                            />
                            <Label className="text-xs">Borde une route</Label>
                          </div>
                        </div>
                        
                        {side.isShared && (
                          <div className="space-y-1">
                            <Label className="text-xs">Lot adjacent</Label>
                            <Input
                              value={side.adjacentLotNumber || ''}
                              onChange={(e) => updateLotSide(lot.id, sideIndex, { 
                                adjacentLotNumber: e.target.value 
                              })}
                              placeholder="N° du lot voisin"
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                        
                        {side.isRoadBordering && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Type de route</Label>
                              <Select
                                value={side.roadType}
                                onValueChange={(v) => updateLotSide(lot.id, sideIndex, { 
                                  roadType: v as SideDimension['roadType'] 
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="existing">Route existante</SelectItem>
                                  <SelectItem value="created">Route créée</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Largeur (m)</Label>
                              <Input
                                type="number"
                                value={side.roadWidth || ''}
                                onChange={(e) => updateLotSide(lot.id, sideIndex, { 
                                  roadWidth: parseFloat(e.target.value) || 0 
                                })}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Revêtement</Label>
                              <Select
                                value={side.surfaceType || 'asphalt'}
                                onValueChange={(v) => updateLotSide(lot.id, sideIndex, { 
                                  surfaceType: v as SideDimension['surfaceType'] 
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SURFACE_TYPES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded" 
                                          style={{ backgroundColor: s.color }} 
                                        />
                                        {s.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Nom de la route</Label>
                              <Input
                                value={side.roadName || ''}
                                onChange={(e) => updateLotSide(lot.id, sideIndex, { 
                                  roadName: e.target.value 
                                })}
                                placeholder="Avenue, Rue..."
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    value={lot.notes || ''}
                    onChange={(e) => updateLot(lot.id, { notes: e.target.value })}
                    placeholder="Notes supplémentaires..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {lots.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-4xl mb-3">📐</div>
          <p className="text-muted-foreground">Aucun lot créé</p>
          <p className="text-sm text-muted-foreground mb-4">
            Cliquez sur "Ajouter un lot" pour commencer
          </p>
          <Button onClick={() => addLot(4)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer le premier lot
          </Button>
        </div>
      )}
    </div>
  );
};
