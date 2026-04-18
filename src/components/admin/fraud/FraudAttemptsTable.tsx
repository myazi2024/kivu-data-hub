import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
} from '@/components/ui/responsive-table';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/usePagination';

export interface FraudAttempt {
  id: string;
  user_id: string;
  fraud_type: string;
  severity: string;
  description: string | null;
  contribution_id: string | null;
  created_at: string;
}

interface Props {
  attempts: FraudAttempt[];
  severityFilter: string;
  onSeverityChange: (v: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onExport: () => void;
}

const getSeverityBadge = (severity: string) => {
  const variants: Record<string, any> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
    critical: 'destructive',
  };
  return (
    <Badge variant={variants[severity] || 'outline'}>{severity.toUpperCase()}</Badge>
  );
};

const FraudAttemptsTable: React.FC<Props> = ({
  attempts,
  severityFilter,
  onSeverityChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExport,
}) => {
  const pagination = usePagination(attempts, { initialPageSize: 15 });

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
              <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Tentatives ({attempts.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onExport} className="h-7 text-xs">
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-1.5">
            <Select value={severityFilter} onValueChange={onSeverityChange}>
              <SelectTrigger className="h-7 text-xs sm:w-32">
                <SelectValue placeholder="Gravité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toutes</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-7 text-xs sm:w-40"
              placeholder="Du"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-7 text-xs sm:w-40"
              placeholder="Au"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        <div className="overflow-x-auto">
          <ResponsiveTable className="border-none">
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Type</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Gravité</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Description</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Détails</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {pagination.paginatedData.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" label="">
                    <div className="text-center py-8 text-muted-foreground col-span-full">
                      Aucune tentative de fraude
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                pagination.paginatedData.map((a) => (
                  <ResponsiveTableRow key={a.id}>
                    <ResponsiveTableCell priority="low" label="Date">
                      <span className="text-xs">
                        {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Type">
                      <span className="font-medium text-sm">{a.fraud_type}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Gravité">
                      {getSeverityBadge(a.severity)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Description">
                      <span className="text-xs line-clamp-2">{a.description || '-'}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Détails">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-base">Détails de la tentative</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              <span className="font-medium">{a.fraud_type}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gravité: </span>
                              {getSeverityBadge(a.severity)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date: </span>
                              {format(new Date(a.created_at), 'PPP à HH:mm', { locale: fr })}
                            </div>
                            {a.description && (
                              <div>
                                <span className="text-muted-foreground">Description: </span>
                                <span>{a.description}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">User ID: </span>
                              <code className="text-[10px] break-all">{a.user_id}</code>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))
              )}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </div>
        {pagination.totalPages > 1 && (
          <div className="p-2">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onPageChange={pagination.goToPage}
              onPageSizeChange={pagination.changePageSize}
              onNextPage={pagination.goToNextPage}
              onPreviousPage={pagination.goToPreviousPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FraudAttemptsTable;
