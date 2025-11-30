import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Ruler, Square, Maximize, Trash2 } from 'lucide-react';
import { MeasurementMode } from '@/hooks/useMapMeasurement';
import { Badge } from '@/components/ui/badge';

interface CadastralMeasurementToolsProps {
  mode: MeasurementMode;
  result: number;
  onModeChange: (mode: MeasurementMode) => void;
  onClear: () => void;
  compact?: boolean;
}

const CadastralMeasurementTools: React.FC<CadastralMeasurementToolsProps> = ({
  mode,
  result,
  onModeChange,
  onClear,
  compact = false
}) => {
  const formatResult = () => {
    if (result === 0) return null;

    if (mode === 'distance' || mode === 'perimeter') {
      if (result < 1000) {
        return `${result.toFixed(2)} m`;
      } else {
        return `${(result / 1000).toFixed(2)} km`;
      }
    } else if (mode === 'area') {
      if (result < 10000) {
        return `${result.toFixed(2)} m²`;
      } else {
        return `${(result / 10000).toFixed(2)} ha`;
      }
    }
  };

  return (
    <Card className="absolute top-1/2 right-20 -translate-y-1/2 z-[1000] backdrop-blur-sm bg-background/95">
      <CardContent className={compact ? 'p-1.5' : 'p-2'}>
        <div className="flex flex-col gap-1">
          <Button
            variant={mode === 'distance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'distance' ? 'none' : 'distance')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Mesurer une distance"
          >
            <Ruler className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          <Button
            variant={mode === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'area' ? 'none' : 'area')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Mesurer une surface"
          >
            <Square className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          <Button
            variant={mode === 'perimeter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode === 'perimeter' ? 'none' : 'perimeter')}
            className={compact ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
            title="Mesurer un périmètre"
          >
            <Maximize className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>

          {mode !== 'none' && (
            <>
              <Separator className="my-1" />
              {result > 0 && (
                <Badge variant="secondary" className={compact ? 'text-[9px] px-1' : 'text-[10px] px-1.5'}>
                  {formatResult()}
                </Badge>
              )}
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

export default CadastralMeasurementTools;
