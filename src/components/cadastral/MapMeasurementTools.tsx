import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Ruler, Square as SquareIcon, Trash2, ChevronDown } from 'lucide-react';

interface MapMeasurementToolsProps {
  onMeasureDistance: () => void;
  onMeasureArea: () => void;
  onClearMeasurements: () => void;
  measurements: {
    distance?: string;
    area?: string;
  };
  isCompact?: boolean;
}

const MapMeasurementTools: React.FC<MapMeasurementToolsProps> = ({
  onMeasureDistance,
  onMeasureArea,
  onClearMeasurements,
  measurements,
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'distance' | 'area' | null>(null);

  const padding = isCompact ? 'p-1.5' : 'p-3';
  const textSize = isCompact ? 'text-[10px]' : 'text-xs';
  const buttonHeight = isCompact ? 'h-7' : 'h-8';
  const iconSize = isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <Card className={`${padding} bg-white/95 backdrop-blur-sm shadow-lg`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={`w-full justify-between ${buttonHeight} ${textSize} font-semibold px-2`}
          >
            <div className="flex items-center gap-1.5">
              <Ruler className={iconSize} />
              <span>Outils de mesure</span>
              {(measurements.distance || measurements.area) && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <ChevronDown className={`${iconSize} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className={`pt-2 ${isCompact ? 'mt-1' : 'mt-1.5'}`}>
          <div className="space-y-1.5">
            <p className={`${textSize} text-muted-foreground mb-1`}>
              Mesurer des distances ou surfaces
            </p>
            
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant={activeMode === 'distance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveMode('distance');
                  onMeasureDistance();
                }}
                className={`${buttonHeight} ${textSize}`}
              >
                <Ruler className={`${iconSize} mr-1`} />
                Distance
              </Button>
              
              <Button
                variant={activeMode === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveMode('area');
                  onMeasureArea();
                }}
                className={`${buttonHeight} ${textSize}`}
              >
                <SquareIcon className={`${iconSize} mr-1`} />
                Surface
              </Button>
            </div>

            {(measurements.distance || measurements.area) && (
              <div className={`bg-muted/50 rounded p-1.5 space-y-0.5 mt-2`}>
                {measurements.distance && (
                  <div className="flex justify-between items-center">
                    <span className={`${textSize} text-muted-foreground`}>Distance:</span>
                    <span className={`${textSize} font-bold`}>{measurements.distance}</span>
                  </div>
                )}
                {measurements.area && (
                  <div className="flex justify-between items-center">
                    <span className={`${textSize} text-muted-foreground`}>Surface:</span>
                    <span className={`${textSize} font-bold`}>{measurements.area}</span>
                  </div>
                )}
              </div>
            )}

            {(measurements.distance || measurements.area) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveMode(null);
                  onClearMeasurements();
                }}
                className={`w-full ${buttonHeight} ${textSize} mt-1`}
              >
                <Trash2 className={`${iconSize} mr-1`} />
                Effacer les mesures
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MapMeasurementTools;
