import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pentagon, Square, Circle, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface MapDrawingToolsProps {
  onDrawPolygon: () => void;
  onDrawRectangle: () => void;
  onDrawCircle: () => void;
  onClearDrawings: () => void;
  isActive: boolean;
  isCompact?: boolean;
}

const MapDrawingTools: React.FC<MapDrawingToolsProps> = ({
  onDrawPolygon,
  onDrawRectangle,
  onDrawCircle,
  onClearDrawings,
  isActive,
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'polygon' | 'rectangle' | 'circle' | null>(null);

  const handleToolClick = (tool: 'polygon' | 'rectangle' | 'circle', action: () => void) => {
    setActiveMode(tool);
    action();
    toast.info(`Mode ${tool === 'polygon' ? 'polygone' : tool === 'rectangle' ? 'rectangle' : 'cercle'} activé`);
  };

  const handleClear = () => {
    setActiveMode(null);
    onClearDrawings();
    toast.success('Dessins effacés');
  };

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
              <Pentagon className={iconSize} />
              <span>Outils de dessin</span>
              {activeMode && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  Actif
                </span>
              )}
            </div>
            <ChevronDown className={`${iconSize} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className={`pt-2 ${isCompact ? 'mt-1' : 'mt-1.5'}`}>
          <div className="space-y-1">
            <p className={`${textSize} text-muted-foreground mb-1.5`}>
              Dessinez une zone personnalisée sur la carte
            </p>
            
            <div className="grid grid-cols-3 gap-1">
              <Button
                variant={activeMode === 'polygon' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToolClick('polygon', onDrawPolygon)}
                className={`${buttonHeight} ${textSize} flex-col py-1`}
              >
                <Pentagon className={iconSize} />
                <span className="mt-0.5">Polygone</span>
              </Button>
              
              <Button
                variant={activeMode === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToolClick('rectangle', onDrawRectangle)}
                className={`${buttonHeight} ${textSize} flex-col py-1`}
              >
                <Square className={iconSize} />
                <span className="mt-0.5">Rectangle</span>
              </Button>
              
              <Button
                variant={activeMode === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToolClick('circle', onDrawCircle)}
                className={`${buttonHeight} ${textSize} flex-col py-1`}
              >
                <Circle className={iconSize} />
                <span className="mt-0.5">Cercle</span>
              </Button>
            </div>

            {activeMode && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                className={`w-full ${buttonHeight} ${textSize} mt-2`}
              >
                <Trash2 className={`${iconSize} mr-1`} />
                Effacer les dessins
              </Button>
            )}

            <p className="text-[9px] text-muted-foreground mt-1.5 italic">
              Les parcelles dans la zone dessinée seront sélectionnées
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MapDrawingTools;
