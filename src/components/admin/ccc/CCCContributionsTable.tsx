import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye } from 'lucide-react';
import {
  ResponsiveTable,
  ResponsiveTableBody,
  ResponsiveTableCell,
  ResponsiveTableHead,
  ResponsiveTableHeader,
  ResponsiveTableRow,
} from '@/components/ui/responsive-table';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { calculateCCCCompleteness } from './cccCompleteness';

interface CCCContributionsTableProps {
  rows: any[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onView: (contribution: any) => void;
  onUserFilterClick: (userId: string) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onPageSizeChange: (size: number) => void;
  };
}

/** Table + pagination for the CCC contributions list. Stateless. */
export const CCCContributionsTable: React.FC<CCCContributionsTableProps> = ({
  rows,
  selectedIds,
  onToggleSelect,
  onView,
  onUserFilterClick,
  pagination,
}) => (
  <div className="overflow-x-auto">
    <ResponsiveTable>
      <ResponsiveTableHeader>
        <ResponsiveTableRow>
          <ResponsiveTableHead priority="high"> </ResponsiveTableHead>
          <ResponsiveTableHead priority="high">Parcelle</ResponsiveTableHead>
          <ResponsiveTableHead priority="low">Contributeur</ResponsiveTableHead>
          <ResponsiveTableHead priority="medium">Complétion</ResponsiveTableHead>
          <ResponsiveTableHead priority="high">Statut</ResponsiveTableHead>
          <ResponsiveTableHead priority="low">Score</ResponsiveTableHead>
          <ResponsiveTableHead priority="medium">Date</ResponsiveTableHead>
          <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
        </ResponsiveTableRow>
      </ResponsiveTableHeader>
      <ResponsiveTableBody>
        {rows.map((contribution) => {
          const completeness = calculateCCCCompleteness(contribution);
          const canSelect = contribution.status === 'pending' || contribution.status === 'returned';
          return (
            <ResponsiveTableRow key={contribution.id}>
              <ResponsiveTableCell priority="high" label="Sélection">
                {canSelect ? (
                  <Checkbox
                    checked={selectedIds.has(contribution.id)}
                    onCheckedChange={() => onToggleSelect(contribution.id)}
                    aria-label="Sélectionner"
                  />
                ) : null}
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="high" label="Parcelle" className="font-mono text-xs md:text-sm">
                {contribution.parcel_number}
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="low" label="Contributeur" className="text-xs md:text-sm">
                <button
                  type="button"
                  className="font-mono text-primary hover:underline"
                  onClick={() => onUserFilterClick(contribution.user_id)}
                  title="Filtrer par cet utilisateur"
                >
                  {contribution.user_id.substring(0, 8)}…
                </button>
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="medium" label="Complétion">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-12 md:w-16 bg-secondary rounded-full h-1.5 md:h-2">
                    <div
                      className="bg-primary h-1.5 md:h-2 rounded-full"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-xs md:text-sm">{completeness}%</span>
                </div>
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="high" label="Statut">
                <StatusBadge status={contribution.status as StatusType} />
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="low" label="Score">
                {contribution.is_suspicious ? (
                  <Badge variant="destructive" className="text-xs">{contribution.fraud_score}</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="medium" label="Date" className="text-xs md:text-sm">
                {new Date(contribution.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </ResponsiveTableCell>
              <ResponsiveTableCell priority="high" label="Actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(contribution)}
                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </ResponsiveTableCell>
            </ResponsiveTableRow>
          );
        })}
      </ResponsiveTableBody>
    </ResponsiveTable>

    {pagination.totalPages > 1 && (
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={pagination.hasNextPage}
        onPageChange={pagination.onPageChange}
        onPreviousPage={pagination.onPreviousPage}
        onNextPage={pagination.onNextPage}
        onPageSizeChange={pagination.onPageSizeChange}
      />
    )}
  </div>
);
