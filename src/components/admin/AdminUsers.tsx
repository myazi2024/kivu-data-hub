import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, User, Search, Download, ArrowUpDown, AlertTriangle, Shield, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useUserFiltering } from '@/hooks/useUserFiltering';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { UserDetailsDialog } from './users/UserDetailsDialog';
import { BulkActionsDialog } from './users/BulkActionsDialog';
import { exportToCSV } from '@/utils/csvExport';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminUsersProps {
  onRefresh: () => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onRefresh }) => {
  const { users, loading, fetchUsers, blockUser, unblockUser } = useUserManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('_all');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'email'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const filteredUsers = useUserFiltering({
    users,
    searchQuery,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder
  });

  const pagination = usePagination(filteredUsers, { initialPageSize: 15 });

  useEffect(() => {
    fetchUsers();

    // Set up real-time listener for profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile changed:', payload);
          // Refetch users when a profile is updated
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  // Reset pagination and selection when search or filters change
  useEffect(() => {
    pagination.goToPage(1);
    setSelectedUsers([]);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleExportCSV = () => {
    exportToCSV({
      filename: `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`,
      headers: [
        'ID Utilisateur',
        'Nom',
        'Email',
        'Organisation',
        'Rôle',
        'Statut',
        'Avertissements',
        'Date inscription',
        'Bloqué le',
        'Raison du blocage',
        'Avatar URL'
      ],
      data: filteredUsers.map(u => [
        u.user_id,
        u.full_name || '',
        u.email,
        u.organization || '',
        u.role,
        u.is_blocked ? 'Bloqué' : 'Actif',
        u.fraud_strikes.toString(),
        new Date(u.created_at).toLocaleDateString('fr-FR'),
        u.blocked_at ? new Date(u.blocked_at).toLocaleDateString('fr-FR') : '',
        u.blocked_reason || '',
        u.avatar_url || ''
      ])
    });
    toast.success('Export réussi');
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: any, icon: any, label: string }> = {
      super_admin: { variant: 'destructive', icon: Shield, label: 'Super Admin' },
      admin: { variant: 'destructive', icon: Shield, label: 'Admin' },
      partner: { variant: 'default', icon: Users, label: 'Partenaire' },
      expert_immobilier: { variant: 'default', icon: User, label: 'Expert Immobilier' },
      mortgage_officer: { variant: 'default', icon: User, label: 'Agent Hypothécaire' },
      user: { variant: 'secondary', icon: User, label: 'Utilisateur' }
    };
    
    const { variant, icon: Icon, label } = config[role] || config.user;
    
    return (
      <Badge variant={variant} className="flex items-center gap-0.5 text-[10px] py-0 px-1.5">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-2 md:p-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-2 md:p-3">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Gestion des Utilisateurs ({filteredUsers.length})
            </CardTitle>
            <div className="flex gap-1.5">
              <BulkActionsDialog 
                selectedUsers={selectedUsers} 
                onComplete={() => { fetchUsers(); setSelectedUsers([]); }} 
              />
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                <Download className="w-3 h-3" />
                Exporter CSV
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Nom, email, organisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 w-full sm:w-40 md:w-52 h-7 text-xs"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-28 h-7 text-xs">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="partner">Partenaire</SelectItem>
                <SelectItem value="expert_immobilier">Expert Immobilier</SelectItem>
                <SelectItem value="mortgage_officer">Agent Hypothécaire</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-28 h-7 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="blocked">Bloqués</SelectItem>
                <SelectItem value="suspicious">Suspects</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'name' | 'email')}>
              <SelectTrigger className="w-full sm:w-28 h-7 text-xs">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="gap-1 h-7 text-xs"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-3">
        <div className="overflow-x-auto">
          <ResponsiveTable className="border-none">
            <ResponsiveTableHeader>
            <ResponsiveTableRow>
                <ResponsiveTableHead priority="high" className="w-8">
                  <Checkbox
                    checked={selectedUsers.length === pagination.paginatedData.length && pagination.paginatedData.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(pagination.paginatedData.map(u => u.user_id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Organisation</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Rôle</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Inscription</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {pagination.paginatedData.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" colSpan={6} className="text-center text-xs sm:text-sm text-muted-foreground">
                    {searchQuery || roleFilter !== '_all' || statusFilter !== '_all'
                      ? 'Aucun utilisateur trouvé avec ces critères'
                      : 'Aucun utilisateur trouvé'
                    }
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                pagination.paginatedData.map((user) => (
                  <ResponsiveTableRow key={user.id}>
                    <ResponsiveTableCell priority="high">
                      <Checkbox
                        checked={selectedUsers.includes(user.user_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(prev => [...prev, user.user_id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.user_id));
                          }
                        }}
                      />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Utilisateur">
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-xs flex items-center gap-1 flex-wrap">
                            {user.full_name || 'Nom non défini'}
                            {user.fraud_strikes > 0 && (
                              <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Organisation">
                      <span className="text-xs">{user.organization || 'Non spécifiée'}</span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Rôle">
                      <div className="flex flex-col gap-0.5">
                        {getRoleBadge(user.role)}
                        {user.is_blocked && (
                          <Badge variant="destructive" className="text-[10px] gap-0.5 w-fit py-0 px-1">
                            <Ban className="w-2.5 h-2.5" />
                            Bloqué
                          </Badge>
                        )}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="low" label="Inscription">
                      <span className="text-xs">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Actions">
                      <UserDetailsDialog 
                        user={user}
                        onBlock={blockUser}
                        onUnblock={unblockUser}
                      />
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))
              )}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </div>
        
        {pagination.totalPages > 1 && (
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
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsers;
