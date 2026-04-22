import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, RotateCcw, UserCog, Loader2 } from 'lucide-react';
import { useAssignableAdmins } from './useAssignableAdmins';

interface Props {
  selectedCount: number;
  processing: boolean;
  onClear: () => void;
  onBulk: (action: 'approve' | 'reject' | 'return') => void;
  onReassign: (assigneeId: string) => void;
}

export function BulkActionsBar({ selectedCount, processing, onClear, onBulk, onReassign }: Props) {
  const { admins, loading } = useAssignableAdmins();
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-xl bg-muted/40">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{selectedCount} demande(s) sélectionnée(s)</span>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={processing}>
          Effacer
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select disabled={processing || loading} onValueChange={onReassign}>
          <SelectTrigger className="h-9 w-[220px] gap-1">
            <UserCog className="h-4 w-4" />
            <SelectValue placeholder="Réassigner à…" />
          </SelectTrigger>
          <SelectContent>
            {admins.length === 0 ? (
              <SelectItem value="_none" disabled>Aucun admin disponible</SelectItem>
            ) : admins.map(a => (
              <SelectItem key={a.user_id} value={a.user_id}>
                {a.full_name || a.email || a.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => onBulk('approve')} disabled={processing} className="gap-1">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approuver
        </Button>
        <Button size="sm" variant="outline" onClick={() => onBulk('return')} disabled={processing} className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50">
          <RotateCcw className="h-4 w-4" /> Renvoyer
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onBulk('reject')} disabled={processing} className="gap-1">
          <X className="h-4 w-4" /> Rejeter
        </Button>
      </div>
    </div>
  );
}
