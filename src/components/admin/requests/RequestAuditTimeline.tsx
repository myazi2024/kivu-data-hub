import { useRequestAudit } from '@/hooks/useRequestAudit';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  table: string;
  requestId: string;
}

export const RequestAuditTimeline = ({ table, requestId }: Props) => {
  const { entries, loading } = useRequestAudit(table, requestId);

  if (loading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">Aucune modification enregistrée.</p>;

  return (
    <ScrollArea className="max-h-64">
      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="flex items-start gap-2 text-xs border-l-2 border-primary/40 pl-3 pb-2">
            <Clock className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {e.old_status && <Badge variant="outline" className="text-[10px]">{e.old_status}</Badge>}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                {e.new_status && <Badge variant="secondary" className="text-[10px]">{e.new_status}</Badge>}
              </div>
              {e.rejection_reason && <p className="mt-1 text-muted-foreground italic">« {e.rejection_reason} »</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(e.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                {e.admin_name && ` · ${e.admin_name}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
