// LotVerticesEditor — numerical GPS / normalized editor for a lot's vertices.
//
// P1 addition (subdivision lot designer): users could only drag vertices on
// the canvas. This panel exposes the underlying coordinates so they can be
// typed precisely (e.g. when copying from a survey report).
//
// Inputs are GPS lat/lng when the parent parcel has GPS coordinates, otherwise
// fall back to normalized 0–1 coordinates. Edits flow through the same
// onChange handler that recomputes area/perimeter via the metric frame.

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Point2D, GpsPoint } from '../types';
import { gpsToNormalized, normalizedToGps } from '../utils/geometry';
import { isPolygonInsidePolygon } from '../utils/polygonOps';

interface LotVerticesEditorProps {
  vertices: Point2D[];
  parentGps?: GpsPoint[];
  parentVertices?: Point2D[];
  onChange: (next: Point2D[]) => void;
  /** Locks editing (e.g. parent boundary lot). */
  disabled?: boolean;
}

const fmt = (n: number, digits: number) => {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(digits);
};

export const LotVerticesEditor: React.FC<LotVerticesEditorProps> = ({
  vertices,
  parentGps,
  parentVertices,
  onChange,
  disabled,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasGps = !!(parentGps && parentGps.length >= 3);

  const updateVertex = (idx: number, next: Point2D) => {
    const updated = vertices.map((v, i) => (i === idx ? next : v));
    // Refuse moves that would push the lot outside the parent parcel.
    if (parentVertices && parentVertices.length >= 3) {
      if (!isPolygonInsidePolygon(updated, parentVertices, 1e-3)) {
        // eslint-disable-next-line no-alert
        window.alert(
          'Coordonnée refusée : ce sommet sortirait des limites de la parcelle mère.',
        );
        return;
      }
    }
    onChange(updated);
  };

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Coordonnées des sommets ({vertices.length})
        </span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
          {vertices.map((v, idx) => {
            const display = hasGps ? normalizedToGps(v, parentGps!) : null;
            return (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground w-4 text-right">{idx + 1}</span>
                {hasGps ? (
                  <>
                    <Input
                      type="number"
                      step="0.000001"
                      value={fmt(display!.lat, 6)}
                      disabled={disabled}
                      onChange={e => {
                        const lat = parseFloat(e.target.value);
                        if (!Number.isFinite(lat)) return;
                        const next = gpsToNormalized({ lat, lng: display!.lng }, parentGps!);
                        updateVertex(idx, next);
                      }}
                      className="h-6 text-[10px] flex-1 px-1.5"
                      aria-label={`Latitude du sommet ${idx + 1}`}
                    />
                    <Input
                      type="number"
                      step="0.000001"
                      value={fmt(display!.lng, 6)}
                      disabled={disabled}
                      onChange={e => {
                        const lng = parseFloat(e.target.value);
                        if (!Number.isFinite(lng)) return;
                        const next = gpsToNormalized({ lat: display!.lat, lng }, parentGps!);
                        updateVertex(idx, next);
                      }}
                      className="h-6 text-[10px] flex-1 px-1.5"
                      aria-label={`Longitude du sommet ${idx + 1}`}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      step="0.001"
                      value={fmt(v.x, 4)}
                      disabled={disabled}
                      onChange={e => {
                        const x = parseFloat(e.target.value);
                        if (!Number.isFinite(x)) return;
                        updateVertex(idx, { x, y: v.y });
                      }}
                      className="h-6 text-[10px] flex-1 px-1.5"
                      aria-label={`X (normalisé) du sommet ${idx + 1}`}
                    />
                    <Input
                      type="number"
                      step="0.001"
                      value={fmt(v.y, 4)}
                      disabled={disabled}
                      onChange={e => {
                        const y = parseFloat(e.target.value);
                        if (!Number.isFinite(y)) return;
                        updateVertex(idx, { x: v.x, y });
                      }}
                      className="h-6 text-[10px] flex-1 px-1.5"
                      aria-label={`Y (normalisé) du sommet ${idx + 1}`}
                    />
                  </>
                )}
              </div>
            );
          })}
          {!hasGps && (
            <p className="text-[9px] text-muted-foreground italic">
              La parcelle mère n'a pas de coordonnées GPS — édition en repère normalisé (0–1).
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LotVerticesEditor;
