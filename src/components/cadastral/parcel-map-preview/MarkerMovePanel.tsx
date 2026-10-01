import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from 'lucide-react';

interface MarkerMovePanelProps {
  selectedBorne: string;
  moveStepMeters: number;
  onNudge: (direction: 'N' | 'S' | 'E' | 'W') => void;
  onExit: () => void;
}

export const MarkerMovePanel = ({ selectedBorne, moveStepMeters, onNudge, onExit }: MarkerMovePanelProps) => {
  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]">
      <Card className="p-2 rounded-2xl shadow-lg bg-white/95 dark:bg-card/95 backdrop-blur-sm border-primary/30">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs h-5 px-2 rounded-lg bg-primary/10 border-primary/30">
              Borne {selectedBorne}
            </Badge>
            <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-lg text-muted-foreground">
              {moveStepMeters.toFixed(1)}m/mvt
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onNudge('N')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onNudge('W')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onExit}
              className="h-8 w-8 p-0 rounded-lg"
              title="Quitter mode déplacement"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onNudge('E')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onNudge('S')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <div />
          </div>

          <p className="text-[10px] text-muted-foreground">Appui long sur borne = sélection</p>
        </div>
      </Card>
    </div>
  );
};
