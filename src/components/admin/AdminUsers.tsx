import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
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
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              Gestion des Utilisateurs ({filteredAndSortedUsers.length})
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full sm:w-48 md:w-64 h-9 text-sm"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="partner">Partenaire</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
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
              className="gap-2"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">Utilisateur</TableHead>
              <TableHead className="hidden md:table-cell text-xs md:text-sm">Email</TableHead>
              <TableHead className="hidden lg:table-cell text-xs md:text-sm">Organisation</TableHead>
              <TableHead className="text-xs md:text-sm">Rôle</TableHead>
              <TableHead className="hidden sm:table-cell text-xs md:text-sm">Inscription</TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="py-2 md:py-3">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs md:text-sm truncate flex items-center gap-2">
                        {user.full_name || 'Nom non défini'}
                        {user.fraud_strikes > 0 && (
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        )}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground truncate md:hidden">{user.email}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">ID: {user.user_id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs md:text-sm">{user.email}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs md:text-sm">{user.organization || 'Non spécifiée'}</TableCell>
                <TableCell className="py-2 md:py-3">
                  <div className="flex flex-col gap-1">
                    {getRoleBadge(user.role)}
                    {user.is_blocked && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <Ban className="w-2 h-2" />
                        Bloqué
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs md:text-sm">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="py-2 md:py-3">
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            fetchUserStats(user.user_id);
                          }}
                          className="h-8 text-xs"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Détails utilisateur</DialogTitle>
                        </DialogHeader>
                        {selectedUser && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Nom complet</p>
                                <p className="font-medium">{selectedUser.full_name || 'Non défini'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{selectedUser.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Organisation</p>
                                <p className="font-medium">{selectedUser.organization || 'Non spécifiée'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Rôle</p>
                                {getRoleBadge(selectedUser.role)}
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Statut</p>
                                {selectedUser.is_blocked ? (
                                  <Badge variant="destructive">Bloqué</Badge>
                                ) : (
                                  <Badge variant="secondary">Actif</Badge>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Avertissements</p>
                                <Badge variant={selectedUser.fraud_strikes > 0 ? "destructive" : "secondary"}>
                                  {selectedUser.fraud_strikes} strikes
                                </Badge>
                              </div>
                            </div>

                            {userStats && (
                              <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Statistiques</h4>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 bg-muted rounded">
                                    <p className="text-xs text-muted-foreground">Contributions</p>
                                    <p className="text-lg font-bold">{userStats.total_contributions}</p>
                                  </div>
                                  <div className="p-3 bg-muted rounded">
                                    <p className="text-xs text-muted-foreground">Codes CCC</p>
                                    <p className="text-lg font-bold">{userStats.ccc_codes_earned}</p>
                                  </div>
                                  <div className="p-3 bg-muted rounded">
                                    <p className="text-xs text-muted-foreground">Dépenses</p>
                                    <p className="text-lg font-bold">${userStats.total_spent}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-4">
                              {selectedUser.is_blocked ? (
                                <Button
                                  variant="outline"
                                  onClick={() => handleUnblockUser(selectedUser.user_id)}
                                  className="gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Débloquer
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt('Raison du blocage:');
                                    if (reason) handleBlockUser(selectedUser.user_id, reason);
                                  }}
                                  className="gap-2"
                                >
                                  <Ban className="w-4 h-4" />
                                  Bloquer
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                onClick={() => window.location.href = `/admin?tab=roles&user=${selectedUser.user_id}`}
                              >
                                Gérer les rôles
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {paginatedUsers.length === 0 && (
          <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Aucun utilisateur trouvé avec ces critères'
              : 'Aucun utilisateur trouvé'
            }
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-xs md:text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages} ({filteredAndSortedUsers.length} utilisateur{filteredAndSortedUsers.length > 1 ? 's' : ''})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsers;