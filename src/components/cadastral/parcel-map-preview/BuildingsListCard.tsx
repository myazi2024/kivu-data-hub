import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Layers, Trash2 } from 'lucide-react';
import type { BuildingShape } from './types';

interface BuildingsListCardProps {
  buildingShapes: BuildingShape[];
  constructionLabels: string[];
  requiredBuildingCount: number;
  heightInputExternal: boolean;
  hoveredBuildingId: string | null;
  onHoverChange: (id: string | null) => void;
  onReassignLinkedIndex: (buildingId: string, newLinkedIndex: number) => void;
  onDeleteRequest: (buildingId: string) => void;
  onHeightChange: (buildingId: string, heightM: number | undefined) => void;
}

export const BuildingsListCard = ({
  buildingShapes,
  constructionLabels,
  requiredBuildingCount,
  heightInputExternal,
  hoveredBuildingId,
  onHoverChange,
  onReassignLinkedIndex,
  onDeleteRequest,
  onHeightChange,
}: BuildingsListCardProps) => {
  return (
    <Card className={`p-3 rounded-2xl shadow-sm border-border/50 ${buildingShapes.length >= requiredBuildingCount ? 'bg-green-50 dark:bg-green-950/20 border-green-200/50' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200/50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Building2 className={`h-4 w-4 ${buildingShapes.length >= requiredBuildingCount ? 'text-green-500' : 'text-orange-500'}`} />
        <span className={`text-sm font-medium ${buildingShapes.length >= requiredBuildingCount ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
          {buildingShapes.length}/{requiredBuildingCount} construction{requiredBuildingCount > 1 ? 's' : ''} tracée{requiredBuildingCount > 1 ? 's' : ''}
        </span>
      </div>
      {buildingShapes.length > 0 && (
        <div className="space-y-1.5">
          {buildingShapes.map((shape, idx) => {
            const label = constructionLabels[shape.linkedIndex ?? idx] || `Construction ${idx + 1}`;
            return (
              <div
                key={shape.id}
                onMouseEnter={() => onHoverChange(shape.id)}
                onMouseLeave={() => onHoverChange(hoveredBuildingId === shape.id ? null : hoveredBuildingId)}
                className={`space-y-1.5 text-xs bg-background/60 rounded-lg px-2 py-1.5 border transition-colors ${hoveredBuildingId === shape.id ? 'border-primary/60 bg-primary/5' : 'border-border/30'}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Layers className="h-3 w-3 text-primary flex-shrink-0" />
                    {requiredBuildingCount > 1 && constructionLabels.length > 1 ? (
                      <Select
                        value={String(shape.linkedIndex ?? idx)}
                        onValueChange={(val) => onReassignLinkedIndex(shape.id, parseInt(val))}
                      >
                        <SelectTrigger className="h-6 text-xs border-border/50 rounded-md px-1.5 min-w-0 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {constructionLabels.map((cl, i) => {
                            const takenBy = buildingShapes.find(s => s.linkedIndex === i && s.id !== shape.id);
                            return (
                              <SelectItem key={i} value={String(i)}>
                                {cl}{takenBy ? ' ↔ permuter' : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium truncate">{label}</span>
                    )}
                    <span className="text-muted-foreground flex-shrink-0">
                      {shape.areaSqm.toFixed(1)} m²
                      {heightInputExternal && shape.heightM != null && ` · H: ${shape.heightM} m`}
                    </span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteRequest(shape.id)} title="Supprimer cette construction" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 flex-shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {!heightInputExternal && (
                  <div className="flex flex-col gap-0.5 pl-4">
                    <div className="flex items-center gap-1.5">
                      <label className="text-muted-foreground whitespace-nowrap">Hauteur :</label>
                      <Input
                        type="number"
                        min={3}
                        step={0.1}
                        placeholder="≥ 3"
                        value={shape.heightM ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          onHeightChange(shape.id, val);
                        }}
                        className={`h-6 w-20 text-xs px-1.5 ${(shape.heightM == null || shape.heightM < 3) ? 'border-destructive' : ''}`}
                      />
                      <span className="text-muted-foreground">m</span>
                    </div>
                    {(shape.heightM == null || shape.heightM < 3) && (
                      <p className="text-[10px] text-destructive">Hauteur minimale : 3 m</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
