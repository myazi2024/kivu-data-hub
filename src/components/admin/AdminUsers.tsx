import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, Shield, User, Search } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  organization: string;
  role: string;
  created_at: string;
  avatar_url: string;
}

interface AdminUsersProps {
  onRefresh: () => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onRefresh }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Rôle utilisateur mis à jour');
      fetchUsers();
      onRefresh();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { variant: 'destructive' as const, icon: Shield, label: 'Admin' },
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            Gestion des Utilisateurs
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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
              <SelectTrigger className="w-full sm:w-36 md:w-48 h-9 text-sm">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateurs</SelectItem>
                <SelectItem value="user">Utilisateurs</SelectItem>
              </SelectContent>
            </Select>
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
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="py-2 md:py-3">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs md:text-sm truncate">{user.full_name || 'Nom non défini'}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground truncate md:hidden">{user.email}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">ID: {user.user_id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs md:text-sm">{user.email}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs md:text-sm">{user.organization || 'Non spécifiée'}</TableCell>
                <TableCell className="py-2 md:py-3">{getRoleBadge(user.role)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs md:text-sm">{new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</TableCell>
                <TableCell className="py-2 md:py-3">
                  <Select
                    value={user.role}
                    onValueChange={(newRole: 'admin' | 'user') => updateUserRole(user.user_id, newRole)}
                  >
                    <SelectTrigger className="w-24 md:w-32 h-8 md:h-9 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user" className="text-xs md:text-sm">Utilisateur</SelectItem>
                      <SelectItem value="admin" className="text-xs md:text-sm">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
            {searchQuery || roleFilter !== 'all' 
              ? 'Aucun utilisateur trouvé avec ces critères'
              : 'Aucun utilisateur trouvé'
            }
          </div>
        )}
        
        <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
          Total: {filteredUsers.length} utilisateur(s)
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;