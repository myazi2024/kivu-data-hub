import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Shield, User, Search, Ban, CheckCircle, Eye, Download, ArrowUpDown, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  organization: string;
  role: string;
  created_at: string;
  avatar_url: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  fraud_strikes: number;
}

interface UserStats {
  total_contributions: number;
  approved_contributions: number;
  pending_contributions: number;
  rejected_contributions: number;
  total_invoices: number;
  total_spent: number;
  ccc_codes_earned: number;
}

interface AdminUsersProps {
  onRefresh: () => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onRefresh }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'email'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Erreur lors du chargement des profils utilisateurs');
        throw profilesError;
      }

      // Fetch roles for all users
      const userIds = profilesData?.map(p => p.user_id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Combine profiles with their highest role
      const roleHierarchy = ['super_admin', 'admin', 'partner', 'user'];
      const usersWithRoles = profilesData?.map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        let highestRole = 'user';
        
        for (const hierarchyRole of roleHierarchy) {
          if (userRoles.includes(hierarchyRole as any)) {
            highestRole = hierarchyRole;
            break;
          }
        }

        return {
          ...profile,
          role: highestRole
        };
      });

      setUsers(usersWithRoles || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_statistics', {
        target_user_id: userId,
        start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      setUserStats(data as unknown as UserStats);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleBlockUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: reason
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Utilisateur bloqué');
      fetchUsers();
    } catch (error: any) {
      toast.error('Erreur lors du blocage');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Utilisateur débloqué');
      fetchUsers();
    } catch (error: any) {
      toast.error('Erreur lors du déblocage');
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Organisation', 'Rôle', 'Statut', 'Date inscription'];
    const rows = filteredAndSortedUsers.map(u => [
      u.full_name || '',
      u.email,
      u.organization || '',
      u.role,
      u.is_blocked ? 'Bloqué' : 'Actif',
      new Date(u.created_at).toLocaleDateString('fr-FR')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export réussi');
  };

  const getRoleBadge = (role: string) => {
    const config = {
      super_admin: { variant: 'destructive' as const, icon: Shield, label: 'Super Admin' },
      admin: { variant: 'destructive' as const, icon: Shield, label: 'Admin' },
      partner: { variant: 'default' as const, icon: Users, label: 'Partenaire' },
      user: { variant: 'secondary' as const, icon: User, label: 'Utilisateur' }
    };
    
    const { variant, icon: Icon, label } = config[role as keyof typeof config] || config.user;
    
    return (
      <Badge variant={variant} className="flex items-center gap-0.5 text-[10px] py-0 px-1.5">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = !searchQuery || 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.organization?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && !user.is_blocked) ||
        (statusFilter === 'blocked' && user.is_blocked) ||
        (statusFilter === 'suspicious' && user.fraud_strikes > 0);
      
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'name') {
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'email') {
        comparison = a.email.localeCompare(b.email);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Gestion des Utilisateurs ({filteredAndSortedUsers.length})
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Download className="w-3 h-3" />
              Exporter
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
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
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="partner">Partenaire</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-28 h-7 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="blocked">Bloqués</SelectItem>
                <SelectItem value="suspicious">Suspects</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}
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
                <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Email</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Organisation</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Rôle</ResponsiveTableHead>
                <ResponsiveTableHead priority="low">Inscription</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {paginatedUsers.map((user) => (
                <ResponsiveTableRow key={user.id}>
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
                  <ResponsiveTableCell priority="low" label="Email">
                    {user.email}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell priority="low" label="Organisation">
                    {user.organization || 'Non spécifiée'}
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
                    {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell priority="high" label="Actions">
                    <div className="flex flex-wrap gap-0.5">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserStats(user.user_id);
                            }}
                            className="h-6 gap-1 px-2 text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Voir</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-base md:text-lg">Détails utilisateur</DialogTitle>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Nom complet</p>
                                  <p className="font-medium text-sm md:text-base">{selectedUser.full_name || 'Non défini'}</p>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                                  <p className="font-medium text-sm md:text-base break-all">{selectedUser.email}</p>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Organisation</p>
                                  <p className="font-medium text-sm md:text-base">{selectedUser.organization || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Rôle</p>
                                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Statut</p>
                                  <div className="mt-1">
                                    {selectedUser.is_blocked ? (
                                      <Badge variant="destructive">Bloqué</Badge>
                                    ) : (
                                      <Badge variant="secondary">Actif</Badge>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Avertissements</p>
                                  <div className="mt-1">
                                    <Badge variant={selectedUser.fraud_strikes > 0 ? "destructive" : "secondary"}>
                                      {selectedUser.fraud_strikes} strikes
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {userStats && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-3 text-sm md:text-base">Statistiques</h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                                    <div className="p-3 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Contributions</p>
                                      <p className="text-lg md:text-xl font-bold">{userStats.total_contributions}</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Codes CCC</p>
                                      <p className="text-lg md:text-xl font-bold">{userStats.ccc_codes_earned}</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Dépenses</p>
                                      <p className="text-lg md:text-xl font-bold">{userStats.total_spent}$</p>
                                    </div>
                                    <div className="p-3 bg-success/10 rounded">
                                      <p className="text-xs text-muted-foreground">Approuvées</p>
                                      <p className="text-lg md:text-xl font-bold text-success">{userStats.approved_contributions}</p>
                                    </div>
                                    <div className="p-3 bg-amber-500/10 rounded">
                                      <p className="text-xs text-muted-foreground">En attente</p>
                                      <p className="text-lg md:text-xl font-bold text-amber-600">{userStats.pending_contributions}</p>
                                    </div>
                                    <div className="p-3 bg-destructive/10 rounded">
                                      <p className="text-xs text-muted-foreground">Rejetées</p>
                                      <p className="text-lg md:text-xl font-bold text-destructive">{userStats.rejected_contributions}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedUser.is_blocked && selectedUser.blocked_reason && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-2 text-sm md:text-base text-destructive">Raison du blocage</h4>
                                  <p className="text-xs md:text-sm text-muted-foreground">{selectedUser.blocked_reason}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Bloqué le: {new Date(selectedUser.blocked_at!).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                                {selectedUser.is_blocked ? (
                                  <Button 
                                    onClick={() => handleUnblockUser(selectedUser.user_id)}
                                    className="w-full sm:flex-1 gap-2"
                                    variant="default"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Débloquer
                                  </Button>
                                ) : (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="destructive" className="w-full sm:flex-1 gap-2">
                                        <Ban className="w-4 h-4" />
                                        Bloquer
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[95vw] sm:max-w-md">
                                      <DialogHeader>
                                        <DialogTitle className="text-base">Bloquer l'utilisateur</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <Input
                                          placeholder="Raison du blocage..."
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.currentTarget.value) {
                                              handleBlockUser(selectedUser.user_id, e.currentTarget.value);
                                            }
                                          }}
                                          className="text-sm"
                                        />
                                        <Button
                                          variant="destructive"
                                          onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            if (input?.value) {
                                              handleBlockUser(selectedUser.user_id, input.value);
                                            }
                                          }}
                                          className="w-full"
                                        >
                                          Confirmer le blocage
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </div>
        
        {paginatedUsers.length === 0 && (
          <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Aucun utilisateur trouvé avec ces critères'
              : 'Aucun utilisateur trouvé'
            }
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-2 pt-2 px-2 md:px-0 border-t">
            <div className="text-[10px] md:text-xs text-muted-foreground text-center sm:text-left">
              Page {currentPage}/{totalPages} ({filteredAndSortedUsers.length} user{filteredAndSortedUsers.length > 1 ? 's' : ''})
            </div>
            <div className="flex gap-1.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none h-7 text-xs"
              >
                Préc.
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none h-7 text-xs"
              >
                Suiv.
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsers;