import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody,
  ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead,
} from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Eye, FileSearch, Loader2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ExpertiseRequest } from '@/types/expertise';

interface ExpertiseRequestsTableProps {
  loading: boolean;
  requests: ExpertiseRequest[];
  onViewDetails: (req: ExpertiseRequest) => void;
  onProcess: (req: ExpertiseRequest) => void;
}

const ExpertiseRequestsTable: React.FC<ExpertiseRequestsTableProps> = ({
  loading,
  requests,
  onViewDetails,
  onProcess,
}) => {
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
              {requests.map((request) => (
                <ResponsiveTableRow key={request.id}>
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
                    <span className="text-sm">
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell>
                    <StatusBadge status={request.status as any} />
                  </ResponsiveTableCell>
                  <ResponsiveTableCell>
                    <Badge variant={request.payment_status === 'paid' ? 'default' : request.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                      {request.payment_status === 'paid' ? 'Payé' : request.payment_status === 'failed' ? 'Échoué' : 'En attente'}
                    </Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Valeur" priority="low">
                    {request.market_value_usd ? (
                      <span className="font-bold text-green-600">
                        ${request.market_value_usd.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewDetails(request)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {request.status !== 'completed' && request.status !== 'rejected' && (
                        <Button variant="outline" size="sm" onClick={() => onProcess(request)}>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Traiter
                        </Button>
                      )}
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpertiseRequestsTable;
