import React from 'react';
import { useRequestAudit } from '@/hooks/useRequestAudit';
import { Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Props { requestId?: string }

const ACTION_LABEL: Record<string, string> = {
  status_change: 'Changement de statut',
  escalated: 'Escalade',
};

export const MutationAuditTimeline: React.FC<Props> = ({ requestId }) => {
  const { entries, loading } = useRequestAudit('mutation_requests', requestId);

  if (!requestId) return null;
  if (loading) {
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        Chargement de l'historique…
      </div>
    );
  }
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune décision enregistrée pour le moment.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <History className="h-4 w-4" />
        Historique des décisions ({entries.length})
      </h4>
      <ol className="space-y-2 border-l border-border pl-4">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <div className="text-xs text-muted-foreground">
              {format(new Date(e.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </div>
            <div className="text-sm flex items-center flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {ACTION_LABEL[e.action] || e.action}
              </Badge>
              {e.old_status && e.new_status && (
                <span>
                  <span className="font-mono">{e.old_status}</span> → <span className="font-mono">{e.new_status}</span>
                </span>
              )}
            </div>
            {e.rejection_reason && (
              <p className="text-xs mt-1 bg-muted/50 p-2 rounded">{e.rejection_reason}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default MutationAuditTimeline;
