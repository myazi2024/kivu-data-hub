import { Droplets, Lamp, Route } from 'lucide-react';
import type { RoadSideInfo } from './RoadBorderingSidesPanel';
import { roadSurfaceLabel } from './RoadBorderingSidesPanel';
import { sideNumber } from '@/lib/parcelRoadSides';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  sides: RoadSideInfo[];
  selectedSide: number | null;
  onSelectSide: (side: number | null) => void;
}

export default function ParcelRoadDetails({ sides, selectedSide, onSelectSide }: Props) {
  return (
    <section aria-label="Voirie de la parcelle" className="border-t border-border pt-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Route className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-foreground">Voirie et équipements</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{sides.length} côté{sides.length > 1 ? 's' : ''}</span>
      </div>
      {sides.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune donnée de voirie renseignée pour cette parcelle.</p>
      ) : (
        <div className="space-y-2">
          {sides.map((side, index) => {
            const number = sideNumber(side, index);
            const isSelected = selectedSide === number - 1;
            const roadLabel = [side.roadType?.trim(), side.roadName?.trim()].filter(Boolean).join(' · ');
            const width = Number(side.roadWidth);
            return (
              <div key={`${number}-${index}`} className={cn('border-l-2 pl-2.5 py-1.5 bg-muted/30', isSelected ? 'border-primary' : 'border-border')}>
                <div className="flex items-start gap-2">
                  <Button
                    type="button" variant={isSelected ? 'default' : 'outline'} size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-xs"
                    onClick={() => onSelectSide(isSelected ? null : number - 1)}
                    aria-label={`Repérer le côté ${number} sur la carte`}
                    aria-pressed={isSelected}
                    title={`Repérer le côté ${number} sur la carte`}
                  >{number}</Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground break-words">{roadLabel || `Côté ${number} · Route sans nom renseigné`}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                      {side.roadSurface && <span>Revêtement : <strong className="text-foreground font-medium">{roadSurfaceLabel(side.roadSurface)}</strong></span>}
                      {Number.isFinite(width) && width > 0 && <span>Largeur : <strong className="text-foreground font-medium">{width.toLocaleString('fr-FR')} m</strong></span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                      {side.hasStreetLighting !== undefined && (
                        <span className={cn('inline-flex items-center gap-1', side.hasStreetLighting ? 'text-foreground' : 'text-muted-foreground')}>
                          <Lamp className="h-3 w-3" aria-hidden="true" />
                          {side.hasStreetLighting ? `Éclairage public${Number(side.streetLampCount) > 0 ? ` · ${side.streetLampCount} lampadaire(s)` : ''}` : 'Sans éclairage public'}
                        </span>
                      )}
                      {side.hasGutter !== undefined && (
                        <span className={cn('inline-flex items-center gap-1', side.hasGutter ? 'text-foreground' : 'text-muted-foreground')}>
                          <Droplets className="h-3 w-3" aria-hidden="true" />
                          {side.hasGutter ? `Caniveau${side.gutterConnected === true ? ' raccordé' : side.gutterConnected === false ? ' non raccordé' : ''}` : 'Sans caniveau'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}