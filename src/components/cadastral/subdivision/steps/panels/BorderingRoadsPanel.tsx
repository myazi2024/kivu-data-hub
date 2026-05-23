import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Trash2, MapPinned, Check, Info } from 'lucide-react';
import { SubdivisionRoad, Point2D } from '../../types';
import { genId } from '../../utils/polygonOps';
import { buildMetricFrame, edgeLengthM, type MetricFrame } from '../../utils/metrics';

const ROAD_TYPES: Array<{ value: string; label: string }> = [
  { value: 'nationale', label: 'Route Nationale' },
  { value: 'provinciale', label: 'Route Provinciale' },
  { value: 'urbaine', label: 'Route Urbaine' },
  { value: 'avenue', label: 'Avenue' },
  { value: 'rue', label: 'Rue' },
  { value: 'ruelle', label: 'Ruelle' },
  { value: 'chemin', label: 'Chemin' },
  { value: 'piste', label: 'Piste' },
];

interface Props {
  roads: SubdivisionRoad[];
  setRoads: (roads: SubdivisionRoad[]) => void;
  parentVertices?: Point2D[];
  metricFrame?: MetricFrame;
}

const formatWidth = (n: number) => Math.round(n * 10) / 10;

const BorderingRoadsPanel: React.FC<Props> = ({ roads, setRoads, parentVertices, metricFrame }) => {
  const [activeSide, setActiveSide] = useState<number | null>(null);
  const [draftType, setDraftType] = useState<string>('avenue');
  const [draftName, setDraftName] = useState<string>('');
  const [draftWidth, setDraftWidth] = useState<number>(8);

  const sides = React.useMemo(() => {
    if (!parentVertices || parentVertices.length < 3) return [];
    const frame = metricFrame ?? buildMetricFrame(undefined, 0);
    return parentVertices.map((v, i) => {
      const next = parentVertices[(i + 1) % parentVertices.length];
      return {
        index: i,
        a: v,
        b: next,
        lengthM: edgeLengthM(v, next, frame),
      };
    });
  }, [parentVertices, metricFrame]);

  const externalRoads = roads.filter(r => r.isExternal);
  const occupiedSides = new Set(externalRoads.map(r => r.borderingParcelSideIndex));

  const resetDraft = () => {
    setActiveSide(null);
    setDraftType('avenue');
    setDraftName('');
    setDraftWidth(8);
  };

  const handleConfirm = () => {
    if (activeSide == null) return;
    const side = sides[activeSide];
    if (!side) return;
    const typeLabel = ROAD_TYPES.find(t => t.value === draftType)?.label ?? draftType;
    const finalName = draftName.trim() || typeLabel;
    const newRoad: SubdivisionRoad = {
      id: genId('road-ext'),
      name: finalName,
      widthM: Math.max(2, draftWidth),
      surfaceType: 'paved',
      isExisting: true,
      isExternal: true,
      borderingParcelSideIndex: activeSide,
      roadType: draftType,
      path: [side.a, side.b],
      drainageCanal: null,
      solarLighting: null,
      roadSurface: null,
    };
    setRoads([...roads, newRoad]);
    resetDraft();
  };

  const handleRemove = (roadId: string) => {
    setRoads(roads.filter(r => r.id !== roadId));
  };

  if (sides.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <MapPinned className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h4 className="font-semibold text-xs">
            Routes bordant la parcelle ({externalRoads.length})
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Déclarez ici une route publique existante (avenue, rue…) qui longe un côté
          de la parcelle. Ceci lève l'alerte d'enclavement pour les lots adjacents,
          sans coût d'infrastructure ni modification de la géométrie.
        </p>

        {/* Bordering roads list */}
        {externalRoads.length > 0 && (
          <div className="space-y-1">
            {externalRoads.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-primary/5"
              >
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-primary" aria-hidden="true" />
                <div className="flex-1 truncate">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground ml-1">
                    ({formatWidth(r.widthM)}m · côté {(r.borderingParcelSideIndex ?? 0) + 1})
                  </span>
                  <Badge variant="secondary" className="ml-1 h-4 text-[9px]">Publique</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(r.id)}
                  aria-label={`Supprimer ${r.name}`}
                  title="Retirer cette route bordante"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Side picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Sélectionnez un côté de la parcelle</Label>
          <div className="grid grid-cols-2 gap-1">
            {sides.map(s => {
              const taken = occupiedSides.has(s.index);
              const isActive = activeSide === s.index;
              return (
                <button
                  key={s.index}
                  type="button"
                  disabled={taken}
                  onClick={() => setActiveSide(isActive ? null : s.index)}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition-colors text-left ${
                    taken
                      ? 'opacity-50 cursor-not-allowed bg-muted border-border'
                      : isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="font-medium">Côté {s.index + 1}</span>
                  <span className="ml-1 opacity-75">({s.lengthM.toFixed(1)}m)</span>
                  {taken && <span className="ml-1 text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {activeSide != null && (
          <div className="space-y-2 animate-fade-in pt-1">
            <div>
              <Label className="text-xs">Type de route *</Label>
              <Select value={draftType} onValueChange={setDraftType}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROAD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-xs">Nom</Label>
                <Input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  placeholder="Av. Lumumba"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Largeur (m) *</Label>
                <Input
                  type="number"
                  min={2}
                  step={0.5}
                  value={draftWidth}
                  onChange={e => setDraftWidth(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                className="flex-1 h-7 text-xs gap-1"
                disabled={!draftType || !(draftWidth > 0)}
                onClick={handleConfirm}
              >
                <Check className="h-3 w-3" />
                Ajouter cette route
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={resetDraft}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {externalRoads.length === 0 && activeSide == null && (
          <Alert className="py-1.5 px-2 rounded-lg bg-muted/50 border-0">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Cliquez sur un côté ci-dessus pour le déclarer comme bordant une route publique.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default BorderingRoadsPanel;

