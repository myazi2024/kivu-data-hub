import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pentagon, Square, Circle, Trash2 } from 'lucide-react';
import { DrawingMode } from '@/hooks/useMapDrawing';

interface CadastralDrawingToolsProps {
  mode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  onClear: () => void;
  onFinish: () => void;
  compact?: boolean;
}

const CadastralDrawingTools: React.FC<CadastralDrawingToolsProps> = ({
  mode,
  onModeChange,
  onClear,
  onFinish,
  compact = false
}) => {
  return (
    <Card className="absolute top-1/2 right-4 -translate-y-1/2 z-[1000] backdrop-blur-sm bg-background/95">
      <CardContent className={compact ? 'p-1.5' : 'p-2'}>
        <div className="flex flex-col gap-1">
          <Button
            variant={mode === 'polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'polygon' ? 'none' : 'polygon')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Dessiner un polygone"
          >
            <Pentagon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          <Button
            variant={mode === 'rectangle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'rectangle' ? 'none' : 'rectangle')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Dessiner un rectangle"
          >
            <Square className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          <Button
            variant={mode === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'circle' ? 'none' : 'circle')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Dessiner un cercle"
          >
            <Circle className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          {mode !== 'none' && (
            <>
              <Separator className="my-1" />
              <Button
                variant="destructive"
                size="sm"
                onClick={onClear}
                className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
                title="Effacer"
              >
                <Trash2 className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CadastralDrawingTools;
