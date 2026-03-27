import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Compass, Ruler, Hash, SquareStack, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import {
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  PlanElements, ParentParcelInfo, LOT_COLORS, USAGE_LABELS, Point2D
} from '../types';
import LotCanvas from '../LotCanvas';

interface StepPlanViewProps {
  parentParcel: ParentParcelInfo | null;
  parentVertices?: Point2D[];
  parentSides?: any[];
  lots: SubdivisionLot[];
  roads: SubdivisionRoad[];
  commonSpaces: SubdivisionCommonSpace[];
  servitudes: SubdivisionServitude[];
  planElements: PlanElements;
  onPlanElementsChange: (p: PlanElements) => void;
}

const ELEMENT_TOGGLES: { key: keyof PlanElements; label: string; icon: React.ReactNode }[] = [
  { key: 'showGrid', label: 'Grille', icon: <SquareStack className="h-3.5 w-3.5" /> },
  { key: 'showNorthIndicator', label: 'Indicateur Nord', icon: <Compass className="h-3.5 w-3.5" /> },
  { key: 'showDimensions', label: 'Dimensions', icon: <Ruler className="h-3.5 w-3.5" /> },
  { key: 'showLotNumbers', label: 'Numéros de lots', icon: <Hash className="h-3.5 w-3.5" /> },
  { key: 'showAreas', label: 'Surfaces', icon: <Eye className="h-3.5 w-3.5" /> },
  { key: 'showRoads', label: 'Voies d\'accès', icon: <Route className="h-3.5 w-3.5" /> },
  { key: 'showOwnerNames', label: 'Noms propriétaires', icon: <Eye className="h-3.5 w-3.5" /> },
  { key: 'showLegend', label: 'Légende', icon: <Eye className="h-3.5 w-3.5" /> },
  { key: 'showScale', label: 'Échelle', icon: <Ruler className="h-3.5 w-3.5" /> },
];

const StepPlanView: React.FC<StepPlanViewProps> = ({
  parentParcel, parentVertices, parentSides, lots, roads, commonSpaces, servitudes, planElements, onPlanElementsChange
}) => {
  const handleToggle = (key: keyof PlanElements) => {
    onPlanElementsChange({ ...planElements, [key]: !planElements[key] });
  };

  const handleExportPNG = async () => {
    const canvasContainer = document.getElementById('subdivision-canvas');
    if (!canvasContainer) return;
    
    try {
      const canvas = await html2canvas(canvasContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `lotissement-${parentParcel?.parcelNumber || 'plan'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export PNG error:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Prévisualisation du plan</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-1 text-xs">
          <Download className="h-3.5 w-3.5" />
          Exporter PNG
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Canvas */}
        <div className="lg:col-span-3" id="subdivision-canvas">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <LotCanvas
                lots={lots}
                roads={roads}
                parentAreaSqm={parentParcel?.areaSqm || 0}
                parentVertices={parentVertices}
                parentSides={parentSides}
                selectedLotId={null}
                onSelectLot={() => {}}
                onUpdateLot={() => {}}
                showGrid={planElements.showGrid}
                showDimensions={planElements.showDimensions}
                showLotNumbers={planElements.showLotNumbers}
                showAreas={planElements.showAreas}
                showRoads={planElements.showRoads}
                showNorth={planElements.showNorthIndicator}
                showLegend={planElements.showLegend}
                showScale={planElements.showScale}
                showOwnerNames={planElements.showOwnerNames}
                readOnly
              />
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <Card>
            <CardContent className="pt-3 space-y-2">
              <h4 className="font-semibold text-xs mb-2">Éléments à afficher</h4>
              {ELEMENT_TOGGLES.map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    {toggle.icon}
                    <span>{toggle.label}</span>
                  </div>
                  <Switch
                    checked={planElements[toggle.key] as boolean}
                    onCheckedChange={() => handleToggle(toggle.key)}
                    className="scale-75"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Legend */}
          {planElements.showLegend && (
            <Card>
              <CardContent className="pt-3">
                <h4 className="font-semibold text-xs mb-2">Légende</h4>
                <div className="space-y-1.5">
                  {Object.entries(USAGE_LABELS).map(([key, label]) => {
                    const count = lots.filter(l => l.intendedUse === key).length;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-[10px]">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LOT_COLORS[key as keyof typeof LOT_COLORS] }} />
                        <span>{label}</span>
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-auto">{count}</Badge>
                      </div>
                    );
                  })}
                  {roads.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" />
                      <span>Voie d'accès</span>
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-auto">{roads.length}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepPlanView;
