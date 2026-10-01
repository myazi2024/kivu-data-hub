import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, RotateCw } from 'lucide-react';

interface LongPressProps {
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: any) => void;
  onKeyDown: (e: any) => void;
  onKeyUp: (e: any) => void;
  onBlur: () => void;
}

interface ParcelControlPanelProps {
  moveStepMeters: number;
  parcelRotationDegrees: number;
  getLongPressProps: (action: () => void) => LongPressProps;
  onNudgeEntireParcel: (direction: 'N' | 'S' | 'E' | 'W') => void;
  onRotateParcel: (angleDegrees: number) => void;
}

export const ParcelControlPanel = ({
  moveStepMeters,
  parcelRotationDegrees,
  getLongPressProps,
  onNudgeEntireParcel,
  onRotateParcel,
}: ParcelControlPanelProps) => {
  return (
    <div className="absolute bottom-8 right-14 z-[1000] md:scale-[0.65] md:origin-bottom-right">
      <div className="flex flex-col items-end gap-0.5">
        {/* Indicateurs compacts */}
        <div className="flex items-center gap-1 bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-lg px-1 py-0.5 shadow-sm border border-blue-400/30">
          <span className="text-[8px] text-blue-600 dark:text-blue-400 font-medium">{moveStepMeters.toFixed(1)}m</span>
          <span className="text-[8px] text-muted-foreground">|</span>
          <span className="text-[8px] text-blue-600 dark:text-blue-400 font-medium">{parcelRotationDegrees.toFixed(0)}°</span>
        </div>

        {/* Contrôles compacts en ligne */}
        <div className="flex items-center gap-0.5 bg-white/95 dark:bg-card/95 backdrop-blur-sm rounded-lg p-0.5 shadow-md border border-blue-400/30">
          {/* Flèches directionnelles */}
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              {...getLongPressProps(() => onNudgeEntireParcel('N'))}
              className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
              title="Nord (maintenir pour répéter)"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <div className="flex gap-0.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                {...getLongPressProps(() => onNudgeEntireParcel('W'))}
                className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                title="Ouest (maintenir pour répéter)"
              >
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                {...getLongPressProps(() => onNudgeEntireParcel('E'))}
                className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                title="Est (maintenir pour répéter)"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              {...getLongPressProps(() => onNudgeEntireParcel('S'))}
              className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
              title="Sud (maintenir pour répéter)"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Séparateur fin */}
          <div className="w-px h-10 bg-border/50 mx-0.5" />

          {/* Rotation */}
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              {...getLongPressProps(() => onRotateParcel(-1))}
              className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
              title="-1° (maintenir pour répéter)"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              {...getLongPressProps(() => onRotateParcel(1))}
              className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
              title="+1° (maintenir pour répéter)"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
