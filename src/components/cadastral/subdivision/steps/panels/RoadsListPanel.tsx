import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Route } from 'lucide-react';
import { SubdivisionRoad, ROAD_SURFACE_LABELS } from '../../types';
import type { CanvasMode } from '../../LotCanvas';

interface Props {
  roads: SubdivisionRoad[];
  editingRoad: SubdivisionRoad | null;
  editingRoadId: string | null;
  setEditingRoadId: (id: string | null) => void;
  onDeleteRoad: (id: string) => void;
  onUpdateRoad: (id: string, updates: Partial<SubdivisionRoad>) => void;
  onAddRoad: () => void;
  canvasMode: CanvasMode;
  setCanvasMode: (mode: CanvasMode) => void;
  hasMultipleLots: boolean;
}

const formatWidth = (n: number) => Math.round(n * 10) / 10;

const RoadsListPanel: React.FC<Props> = ({
  roads, editingRoad, editingRoadId, setEditingRoadId,
  onDeleteRoad, onUpdateRoad, onAddRoad,
  canvasMode, setCanvasMode, hasMultipleLots,
}) => (
  <Card>
    <CardContent className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-xs flex items-center gap-1">
          <Route className="h-3.5 w-3.5" aria-hidden="true" />
          Voies ({roads.length})
        </h4>
        <div className="flex gap-1">
          <Button
            variant={canvasMode === 'selectEdge' ? 'default' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              if (hasMultipleLots) {
                setCanvasMode(canvasMode === 'selectEdge' ? 'select' : 'selectEdge');
              } else {
                onAddRoad();
              }
            }}
            aria-label={hasMultipleLots ? 'Convertir une limite entre lots en voie' : 'Ajouter une voie'}
            title={hasMultipleLots ? 'Cliquer sur une limite entre lots' : 'Ajouter une voie'}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-[180px] overflow-y-auto">
        {roads.map(road => {
          const isExisting = road.isExisting;
          const isEditing = editingRoadId === road.id;
          return (
            <div
              key={road.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${isEditing ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isExisting ? 'bg-amber-600' : 'bg-muted-foreground'}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className="flex-1 text-left truncate"
                onClick={() => setEditingRoadId(isEditing ? null : road.id)}
                aria-label={`${isEditing ? 'Fermer les détails de' : 'Ouvrir les détails de'} ${road.name}`}
                aria-pressed={isEditing}
              >
                <span className="font-medium">{road.name}</span>
                <span className="text-muted-foreground ml-1">({formatWidth(road.widthM)}m)</span>
              </button>
              {!isExisting && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={() => onDeleteRoad(road.id)}
                  aria-label={`Supprimer ${road.name}`}
                  title="Supprimer cette voie"
                >
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
              <Label htmlFor={`road-name-${editingRoad.id}`} className="text-xs">Nom</Label>
              <Input
                id={`road-name-${editingRoad.id}`}
                value={editingRoad.name}
                onChange={e => onUpdateRoad(editingRoad.id, { name: e.target.value })}
                className="h-7 text-xs"
                disabled={editingRoad.isExisting}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Largeur ({formatWidth(editingRoad.widthM)}m)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    min={2}
                    max={30}
                    step={0.5}
                    value={[editingRoad.widthM]}
                    onValueChange={([v]) => onUpdateRoad(editingRoad.id, { widthM: formatWidth(v) })}
                    className="flex-1"
                    aria-label="Largeur de la voie en mètres"
                  />
                  <Input
                    type="number"
                    min={2}
                    max={30}
                    step={0.5}
                    value={formatWidth(editingRoad.widthM)}
                    onChange={e => onUpdateRoad(editingRoad.id, { widthM: formatWidth(parseFloat(e.target.value) || 6) })}
                    className="h-7 text-xs w-16"
                    aria-label="Largeur (saisie numérique)"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`road-surface-${editingRoad.id}`} className="text-xs">Revêtement</Label>
                <Select
                  value={editingRoad.surfaceType}
                  onValueChange={(v: SubdivisionRoad['surfaceType']) => onUpdateRoad(editingRoad.id, { surfaceType: v })}
                >
                  <SelectTrigger id={`road-surface-${editingRoad.id}`} className="h-7 text-xs"><SelectValue /></SelectTrigger>
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
);

export default RoadsListPanel;
