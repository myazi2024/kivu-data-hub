import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Compass, Navigation, RotateCcw, RotateCw } from 'lucide-react';

interface CompassControlProps {
  mapBearing: number;
  onBearingChange: (bearing: number) => void;
}

export const CompassControl = ({ mapBearing, onBearingChange }: CompassControlProps) => {
  return (
    <>
      {/* Boussole avec indicateur Nord */}
      <div
        className="relative w-10 h-10 bg-white/95 dark:bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border/50 flex items-center justify-center"
        style={{ transform: `rotate(${-mapBearing}deg)` }}
      >
        {/* Flèche Nord */}
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-red-500" />
        </div>
        {/* Indicateur N */}
        <span className="absolute top-2 text-[7px] font-bold text-red-500">N</span>
        {/* Indicateur S */}
        <span className="absolute bottom-1 text-[6px] font-medium text-muted-foreground">S</span>
        {/* Indicateur E */}
        <span className="absolute right-1 text-[6px] font-medium text-muted-foreground">E</span>
        {/* Indicateur O */}
        <span className="absolute left-1 text-[6px] font-medium text-muted-foreground">O</span>
        {/* Centre */}
        <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
      </div>

      {/* Bouton calibrer orientation */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-10 p-0 rounded-xl bg-white/95 hover:bg-blue-50 shadow-md border-border/50"
            title="Calibrer l'orientation de la carte"
          >
            <Compass className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="end"
          className="w-56 p-3 rounded-xl shadow-lg bg-background border"
          sideOffset={5}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Orientation carte</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Ajustez l'orientation de la carte pour qu'elle corresponde à l'orientation réelle du terrain.
            </p>

            {/* Contrôles de rotation de la carte */}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const newBearing = (mapBearing - 15 + 360) % 360;
                  onBearingChange(newBearing);
                  // Note: Leaflet standard ne supporte pas setBearing — seule la boussole et les orientations changent
                }}
                className="h-8 w-8 p-0 rounded-lg"
                title="-15°"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <div className="flex-1 text-center">
                <span className="text-sm font-medium">{mapBearing.toFixed(0)}°</span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const newBearing = (mapBearing + 15) % 360;
                  onBearingChange(newBearing);
                }}
                className="h-8 w-8 p-0 rounded-lg"
                title="+15°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Bouton recalibrer au Nord */}
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onBearingChange(0)}
              className="w-full h-8 rounded-lg text-xs"
            >
              <Navigation className="h-3 w-3 mr-1" />
              Recalibrer au Nord
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Le Nord (N) est indiqué par la flèche rouge sur la boussole
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
