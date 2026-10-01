import { Button } from '@/components/ui/button';

interface BuildingVertexEditOverlayProps {
  vertexLabel: string;
  constructionLabel: string;
  coords: { lat: string; lng: string };
  onCoordsChange: (coords: { lat: string; lng: string }) => void;
  onClose: () => void;
  onApply: () => void;
}

export const BuildingVertexEditOverlay = ({
  vertexLabel,
  constructionLabel,
  coords,
  onCoordsChange,
  onClose,
  onApply,
}: BuildingVertexEditOverlayProps) => {
  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/30 rounded-2xl">
      <div className="bg-card rounded-xl p-4 shadow-2xl border border-border/50 w-64 space-y-3">
        <p className="text-xs font-semibold text-foreground text-center">
          🏗️ {constructionLabel} — Sommet {vertexLabel}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground w-8">Lat</span>
            <input
              type="number" step="0.000001"
              value={coords.lat}
              onChange={(e) => onCoordsChange({ ...coords, lat: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              autoFocus
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground w-8">Lng</span>
            <input
              type="number" step="0.000001"
              value={coords.lng}
              onChange={(e) => onCoordsChange({ ...coords, lng: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="flex-1 h-8 rounded-lg text-xs" onClick={onClose}>Fermer</Button>
          <Button type="button" size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={onApply}>Appliquer</Button>
        </div>
      </div>
    </div>
  );
};
