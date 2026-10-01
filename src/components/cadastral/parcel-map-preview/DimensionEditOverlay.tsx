import { Button } from '@/components/ui/button';

interface DimensionEditOverlayProps {
  editingSideIndex: number;
  editingSideValue: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DimensionEditOverlay = ({
  editingSideIndex,
  editingSideValue,
  onValueChange,
  onConfirm,
  onCancel,
}: DimensionEditOverlayProps) => {
  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/30 rounded-2xl">
      <div className="bg-card rounded-xl p-4 shadow-2xl border border-border/50 w-56 space-y-3">
        <p className="text-xs font-semibold text-foreground text-center">
          Modifier Côté {editingSideIndex + 1}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={editingSideValue}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm();
              if (e.key === 'Escape') onCancel();
            }}
            autoFocus
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-sm font-medium text-muted-foreground">m</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 rounded-lg text-xs"
            onClick={onCancel}
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 h-8 rounded-lg text-xs"
            onClick={onConfirm}
          >
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
};
