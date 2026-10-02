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
  coordinateCount: number;
}

export default function ParcelRoadDetails({ sides, selectedSide, onSelectSide, coordinateCount }: Props) {
  return (
    <section aria-label="Voirie de la parcelle" className="border-t border-border pt-2 mb-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Route className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <h3 className="text-[11px] font-semibold text-foreground">Voirie et équipements</h3>
        <span className="ml-auto text-[9px] text-muted-foreground">{sides.length} côté{sides.length > 1 ? 's' : ''}</span>
      </div>
      {sides.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Aucune donnée de voirie renseignée pour cette parcelle.</p>
      ) : (
        <div className="space-y-1.5">
          {sides.map((side, index) => {
            const number = sideNumber(side, index);
            const isSelected = selectedSide === number - 1;
            const roadLabel = [side.roadType?.trim(), side.roadName?.trim()].filter(Boolean).join(' · ');
            const width = Number(side.roadWidth);
            return (
              <div key={`${number}-${index}`} className={cn('border-l-2 pl-2 py-1 bg-muted/30', isSelected ? 'border-primary' : 'border-border')}>
                <div className="flex items-start gap-1.5">
                  <Button
                    type="button" variant={isSelected ? 'default' : 'outline'} size="sm"
                    className="h-6 w-6 shrink-0 p-0 text-[10px]"
                    onClick={() => onSelectSide(isSelected ? null : number - 1)}
                    disabled={coordinateCount < 3 || number > coordinateCount}
                    aria-label={`Repérer le côté ${number} sur la carte`}
                    aria-pressed={isSelected}
                    title={coordinateCount < 3 || number > coordinateCount ? 'Tracé de parcelle indisponible' : `Repérer le côté ${number} sur la carte`}
                  >{number}</Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground break-words leading-tight">{roadLabel || `Côté ${number} · Route sans nom renseigné`}</p>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                      <span>Revêtement : <strong className="text-foreground font-medium">{side.roadSurface ? roadSurfaceLabel(side.roadSurface) : 'Non renseigné'}</strong></span>
                      <span>Largeur : <strong className="text-foreground font-medium">{Number.isFinite(width) && width > 0 ? `${width.toLocaleString('fr-FR')} m` : 'Non renseignée'}</strong></span>
                    </div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-[10px]">
                      <span className={cn('inline-flex items-center gap-1', side.hasStreetLighting ? 'text-foreground' : 'text-muted-foreground')}>
                        <Lamp className="h-3 w-3" aria-hidden="true" />
                        {side.hasStreetLighting === true ? `Éclairage public${Number(side.streetLampCount) > 0 ? ` · ${side.streetLampCount} lampadaire(s)` : ''}` : side.hasStreetLighting === false ? 'Sans éclairage public' : 'Éclairage non renseigné'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1', side.hasGutter ? 'text-foreground' : 'text-muted-foreground')}>
                        <Droplets className="h-3 w-3" aria-hidden="true" />
                        {side.hasGutter === true ? `Caniveau${side.gutterConnected === true ? ' raccordé' : side.gutterConnected === false ? ' non raccordé' : ''}` : side.hasGutter === false ? 'Sans caniveau' : 'Caniveau non renseigné'}
                      </span>
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