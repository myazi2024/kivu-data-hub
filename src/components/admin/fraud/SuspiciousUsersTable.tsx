import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Ban, CheckCircle, Eye } from 'lucide-react';
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

export interface SuspiciousUser {
  user_id: string;
  full_name: string | null;
  email: string;
  fraud_strikes: number;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  suspicious_contributions: number;
  total_contributions: number;
}

interface Props {
  users: SuspiciousUser[];
  onBlock: (userId: string) => void;
  onUnblock: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

const SuspiciousUsersTable: React.FC<Props> = ({ users, onBlock, onUnblock, onViewProfile }) => {
  const pagination = usePagination(users, { initialPageSize: 15 });

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
          <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Utilisateurs Suspects ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        <div className="overflow-x-auto">
          <ResponsiveTable className="border-none">
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Email</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Avert.</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Contributions</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Statut</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {pagination.paginatedData.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" label="">
                    <div className="text-center py-8 text-muted-foreground col-span-full">
                      Aucun utilisateur suspect
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                pagination.paginatedData.map((user) => (
                  <ResponsiveTableRow key={user.user_id}>
                    <ResponsiveTableCell priority="high" label="Utilisateur">
                      <div className="font-medium text-sm">{user.full_name || 'Sans nom'}</div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Email">
                      <div className="text-xs md:text-sm text-muted-foreground break-all">
                        {user.email}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Avertissements">
                      <Badge
                        variant={user.fraud_strikes >= 3 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {user.fraud_strikes}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Contributions">
                      <div className="text-xs md:text-sm">
                        {user.suspicious_contributions}/{user.total_contributions}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Statut">
                      {user.is_blocked ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <Ban className="h-3 w-3" />
                          Bloqué
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Actif
                        </Badge>
                      )}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Actions">
                      <div className="flex gap-1.5">
                        {onViewProfile && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewProfile(user.user_id)}
                            className="text-xs h-7 gap-1"
                            title="Voir le profil"
                          >
                            <Eye className="h-3 w-3" />
                            Profil
                          </Button>
                        )}
                        {user.is_blocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUnblock(user.user_id)}
                            className="text-xs h-7"
                          >
                            Débloquer
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onBlock(user.user_id)}
                            className="text-xs h-7"
                          >
                            Bloquer
                          </Button>
                        )}
                      </div>
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

export default SuspiciousUsersTable;
