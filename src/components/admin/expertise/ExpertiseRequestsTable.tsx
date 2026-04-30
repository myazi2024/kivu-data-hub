import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody,
  ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead,
} from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Eye, FileSearch, Loader2, UserCheck, AlertTriangle, Flag } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ExpertiseRequest } from '@/types/expertise';

interface ExpertiseRequestsTableProps {
  loading: boolean;
  requests: ExpertiseRequest[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (req: ExpertiseRequest) => void;
  onProcess: (req: ExpertiseRequest) => void;
  onAssign: (req: ExpertiseRequest) => void;
  onEscalate: (req: ExpertiseRequest) => void;
  overdueDays?: number;
}

const ExpertiseRequestsTable: React.FC<ExpertiseRequestsTableProps> = ({
  loading, requests, selectedIds, onToggleSelect, onToggleSelectAll,
  onViewDetails, onProcess, onAssign, onEscalate, overdueDays = 14,
}) => {
  const allSelected = requests.length > 0 && requests.every(r => selectedIds.includes(r.id));

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune demande d'expertise trouvée</p>
          </div>
        ) : (
          <ResponsiveTable>
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead className="w-8">
                  <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} aria-label="Tout sélectionner" />
                </ResponsiveTableHead>
                <ResponsiveTableHead>Référence</ResponsiveTableHead>
                <ResponsiveTableHead>Parcelle</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Demandeur</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                <ResponsiveTableHead>Statut</ResponsiveTableHead>
                <ResponsiveTableHead>Paiement</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Valeur</ResponsiveTableHead>
                <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {requests.map((request) => {
                const ageDays = differenceInDays(new Date(), new Date(request.created_at));
                const isFinal = request.status === 'completed' || request.status === 'rejected';
                const isOverdue = !isFinal && ageDays >= overdueDays;
                const isEscalated = !!(request as any).escalated_at;
                return (
                  <ResponsiveTableRow key={request.id}>
                    <ResponsiveTableCell>
                      <Checkbox
                        checked={selectedIds.includes(request.id)}
                        onCheckedChange={() => onToggleSelect(request.id)}
                        aria-label={`Sélectionner ${request.reference_number}`}
                      />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <span className="font-mono text-sm">{request.reference_number}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <span className="font-medium">{request.parcel_number}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Demandeur" priority="low">
                      <div>
                        <p className="text-sm font-medium">{request.requester_name}</p>
                        {request.requester_email && (
                          <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                        )}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Date" priority="low">
                      <span className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                      <span className="block text-[10px] text-muted-foreground">{ageDays} j</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={request.status as any} />
                        {isEscalated && <Badge variant="destructive" className="text-[9px]"><Flag className="h-2.5 w-2.5 mr-0.5" />Escaladé</Badge>}
                        {isOverdue && !isEscalated && <Badge variant="outline" className="text-[9px] border-red-500 text-red-600"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />En retard</Badge>}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <Badge variant={request.payment_status === 'paid' ? 'default' : request.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                        {request.payment_status === 'paid' ? 'Payé' : request.payment_status === 'failed' ? 'Échoué' : 'En attente'}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Valeur" priority="low">
                      {request.market_value_usd ? (
                        <span className="font-bold text-green-600">${request.market_value_usd.toLocaleString()}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => onViewDetails(request)} aria-label="Voir détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isFinal && !request.assigned_to && (
                          <Button variant="ghost" size="sm" onClick={() => onAssign(request)} title="Assigner un expert">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {!isFinal && !isEscalated && isOverdue && (
                          <Button variant="ghost" size="sm" onClick={() => onEscalate(request)} title="Escalader" className="text-red-600">
                            <Flag className="h-4 w-4" />
                          </Button>
                        )}
                        {!isFinal && (
                          <Button variant="outline" size="sm" onClick={() => onProcess(request)}>
                            Traiter
                          </Button>
                        )}
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                );
              })}
            </ResponsiveTableBody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpertiseRequestsTable;
