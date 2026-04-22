import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Grid3X3, Eye, Check, X, User, MapPin, Clock, Loader2, ChevronLeft, ChevronRight,
  RotateCcw, Eye as EyeIcon, Flame, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { computeSla } from '@/utils/adminQueueUtils';
import type { ValidationResult } from '@/hooks/useZoningRules';
import { SUBDIVISION_STATUS_MAP, OPEN_STATUSES, type SubdivisionRequest, type ActionType } from './types';

interface Props {
  loading: boolean;
  rows: SubdivisionRequest[];
  validations: Record<string, ValidationResult>;
  page: number;
  totalPages: number;
  setPage: (updater: (p: number) => number) => void;
  onOpenDetails: (req: SubdivisionRequest) => void;
  onStartReview: (req: SubdivisionRequest) => void;
  onAction: (req: SubdivisionRequest, action: ActionType) => void;
}

export function RequestsList({
  loading, rows, validations, page, totalPages, setPage,
  onOpenDetails, onStartReview, onAction,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(request => {
              const sla = computeSla(request.created_at, request.estimated_processing_days || 14);
              const validation = validations[request.id];
              const isOpen = OPEN_STATUSES.includes(request.status);
              const slaTone = sla.level === 'overdue'
                ? 'border-destructive/50 bg-destructive/5'
                : sla.level === 'warning'
                  ? 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10'
                  : '';
              return (
                <div key={request.id} className={`p-4 border rounded-xl hover:bg-muted/50 transition-colors ${slaTone} ${request.escalated ? 'ring-1 ring-destructive/40' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">{request.reference_number}</Badge>
                        <StatusBadge status={SUBDIVISION_STATUS_MAP[request.status] || 'pending'} compact />
                        {isOpen && (
                          <Badge
                            variant={sla.level === 'overdue' ? 'destructive' : sla.level === 'warning' ? 'default' : 'outline'}
                            className="gap-1 text-[10px]"
                          >
                            <Clock className="h-3 w-3" /> {sla.label}
                          </Badge>
                        )}
                        {request.escalated && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <Flame className="h-3 w-3" /> Escaladée
                          </Badge>
                        )}
                        {validation && (
                          validation.valid ? (
                            <Badge variant="outline" className="gap-1 text-[10px] border-green-500/50 text-green-700 dark:text-green-400">
                              <ShieldCheck className="h-3 w-3" /> Conforme
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]" title={validation.violations.map(v => v.message).join(' | ')}>
                              <ShieldAlert className="h-3 w-3" /> Non conforme ({validation.violations.length})
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="font-mono">{request.parcel_number}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" /><span>{request.requester_last_name} {request.requester_first_name}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Grid3X3 className="h-3.5 w-3.5" /><span>{request.number_of_lots} lots</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => onOpenDetails(request)} className="gap-1">
                        <Eye className="h-4 w-4" /> Détails
                      </Button>
                      {request.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => onStartReview(request)} className="gap-1">
                          <EyeIcon className="h-4 w-4" /> Mettre en examen
                        </Button>
                      )}
                      {OPEN_STATUSES.includes(request.status) && (
                        <>
                          <Button size="sm" onClick={() => onAction(request, 'approve')} className="gap-1"><Check className="h-4 w-4" /> Approuver</Button>
                          <Button variant="outline" size="sm" onClick={() => onAction(request, 'return')} className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"><RotateCcw className="h-4 w-4" /> Renvoyer</Button>
                          <Button variant="destructive" size="sm" onClick={() => onAction(request, 'reject')} className="gap-1"><X className="h-4 w-4" /> Rejeter</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Page {page}/{totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
