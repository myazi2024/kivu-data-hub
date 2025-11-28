import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, Briefcase, User, Plus, X, Search, History, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveTable,
  ResponsiveTableBody,
  ResponsiveTableCell,
  ResponsiveTableHead,
  ResponsiveTableHeader,
  ResponsiveTableRow,
} from '@/components/ui/responsive-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type AppRole = 'super_admin' | 'admin' | 'partner' | 'user';

interface AllUserProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface RoleHistory {
  id: string;
  action: string;
  user_id: string;
  table_name: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

const roleConfig = {
  super_admin: {
    icon: Crown,
    label: 'Super Admin',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Tous les privilèges système',
  },
  admin: {
    icon: Shield,
    label: 'Administrateur',
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    description: 'Gestion des utilisateurs et contenus',
  },
  partner: {
    icon: Briefcase,
    label: 'Partenaire',
    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    description: 'Codes de remise et commissions',
  },
  user: {
    icon: User,
    label: 'Utilisateur',
    color: 'bg-gradient-to-r from-gray-500 to-slate-500',
    description: 'Accès standard',
  },
};

export const AdminUserRolesEnhanced: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<AllUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleHistory, setRoleHistory] = useState<RoleHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user) {
        setHasAdminAccess(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'super_admin']);

        if (error) throw error;

        const hasAccess = data && data.length > 0;
        setHasAdminAccess(hasAccess);

        if (hasAccess) {
          fetchUserRoles();
          fetchAllUsers();
          fetchRoleHistory();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error verifying access:', error);
        setHasAdminAccess(false);
        setLoading(false);
      }
    };

    verifyAccess();
  }, [user]);

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      // Optimized: Single query with JOIN to avoid N+1
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles!inner(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data with proper null checks
      const transformedData = (data || []).map((item: any) => {
        // Safely access nested profile data
        const profileData = item.profiles;
        
        return {
          id: item.id,
          user_id: item.user_id,
          role: item.role,
          created_at: item.created_at,
          profiles: {
            full_name: profileData?.full_name || null,
            email: profileData?.email || 'Email non disponible'
          }
        };
      });

      setUserRoles(transformedData);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les rôles',
        variant: 'destructive',
      });
      setUserRoles([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'user_roles')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRoleHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const addRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un utilisateur et un rôle',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check for duplicate role
      const { data: existingRoles, error: checkError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedUserId)
        .eq('role', selectedRole);

      if (checkError) throw checkError;

      if (existingRoles && existingRoles.length > 0) {
        toast({
          title: 'Rôle déjà attribué',
          description: `L'utilisateur possède déjà le rôle ${roleConfig[selectedRole].label}`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedUserId,
        role: selectedRole,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Rôle ajouté avec succès',
      });

      fetchUserRoles();
      fetchRoleHistory();
      setSelectedUserId('');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter le rôle',
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (roleId: string, targetUserId: string, roleToRemove: AppRole) => {
    // Empêcher de retirer son propre rôle admin
    if (targetUserId === user?.id && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
      toast({
        title: 'Action interdite',
        description: 'Vous ne pouvez pas retirer votre propre rôle administrateur',
        variant: 'destructive',
      });
      return;
    }

    // Double confirmation pour super_admin
    if (roleToRemove === 'super_admin') {
      const confirmation = window.prompt(
        'ATTENTION: Vous êtes sur le point de retirer un rôle Super Admin.\n' +
        'Cette action est critique et irréversible.\n\n' +
        'Tapez "CONFIRMER" pour continuer:'
      );
      
      if (confirmation !== 'CONFIRMER') {
        toast({
          title: 'Action annulée',
          description: 'Retrait du rôle Super Admin annulé',
        });
        return;
      }
    } else {
      if (!confirm(`Êtes-vous sûr de vouloir retirer le rôle ${roleConfig[roleToRemove].label} ?`)) return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Rôle retiré avec succès',
      });

      fetchUserRoles();
      fetchRoleHistory();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer le rôle',
        variant: 'destructive',
      });
    }
  };

  const userRolesGrouped = userRoles.reduce((acc, role) => {
    if (!acc[role.user_id]) {
      acc[role.user_id] = {
        user: role.profiles,
        roles: [],
      };
    }
    acc[role.user_id].roles.push(role);
    return acc;
  }, {} as Record<string, { user: { full_name: string | null; email: string }; roles: UserRole[] }>);

  const filteredUsers = Object.entries(userRolesGrouped).filter(([userId, data]) => {
    const matchesSearch = !searchQuery || 
      data.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
      data.roles.some(r => r.role === roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const availableUsers = allUsers.filter(u => 
    !searchQuery || 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Seuls les administrateurs peuvent gérer les rôles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Role Hierarchy */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="text-sm md:text-base">Hiérarchie des Rôles</CardTitle>
          <CardDescription className="text-[10px] md:text-xs">
            Organisation des privilèges par ordre décroissant
          </CardDescription>
        </CardHeader>
        <CardContent className="p-1.5 md:p-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            {(Object.keys(roleConfig) as AppRole[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              const count = userRoles.filter(r => r.role === role).length;
              return (
                <div
                  key={role}
                  className="p-1.5 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className={`w-7 h-7 rounded-full ${config.color} flex items-center justify-center mb-1`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-[11px] mb-0.5">{config.label}</h3>
                  <p className="text-[9px] text-muted-foreground mb-0.5 line-clamp-1">{config.description}</p>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1">{count}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Role */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm md:text-base">Attribuer un Rôle</CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Ajouter un nouveau rôle à un utilisateur
              </CardDescription>
            </div>
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                  <History className="w-3 h-3" />
                  <span className="hidden sm:inline">Historique</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">Historique des modifications</DialogTitle>
                </DialogHeader>
                <div className="overflow-x-auto">
                  <ResponsiveTable className="border-none">
                    <ResponsiveTableHeader>
                      <ResponsiveTableRow>
                        <ResponsiveTableHead priority="high">Date</ResponsiveTableHead>
                        <ResponsiveTableHead priority="medium">Action</ResponsiveTableHead>
                        <ResponsiveTableHead priority="high">Détails</ResponsiveTableHead>
                      </ResponsiveTableRow>
                    </ResponsiveTableHeader>
                    <ResponsiveTableBody>
                      {roleHistory.map((log) => (
                        <ResponsiveTableRow key={log.id}>
                          <ResponsiveTableCell priority="high" label="Date">
                            <span className="text-xs">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell priority="medium" label="Action">
                            <Badge variant={log.action === 'DELETE' ? 'destructive' : 'default'} className="text-xs">
                              {log.action}
                            </Badge>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell priority="high" label="Détails">
                            <span className="text-xs">
                              {log.new_values?.role && `Rôle ajouté: ${log.new_values.role}`}
                              {log.old_values?.role && `Rôle retiré: ${log.old_values.role}`}
                            </span>
                          </ResponsiveTableCell>
                        </ResponsiveTableRow>
                      ))}
                    </ResponsiveTableBody>
                  </ResponsiveTable>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 md:p-2">
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 text-xs h-7"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-1.5">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1 text-xs h-7">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((usr) => (
                    <SelectItem key={usr.user_id} value={usr.user_id} className="text-sm">
                      <div className="flex flex-col">
                        <span>{usr.full_name || usr.email}</span>
                        <span className="text-xs text-muted-foreground">{usr.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger className="w-full sm:w-36 text-xs h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleConfig) as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role} className="text-xs">
                      {roleConfig[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={addRole} disabled={!selectedUserId} className="w-full sm:w-auto gap-1 text-xs h-7 px-3">
                <Plus className="h-3 w-3" />
                <span>Ajouter</span>
              </Button>
            </div>

            <div className="flex items-center gap-1 p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[9px] text-amber-700 dark:text-amber-300">
                Vous ne pouvez pas retirer votre propre rôle administrateur
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users and Their Roles */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm md:text-base">Utilisateurs et Rôles</CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                {Object.keys(userRolesGrouped).length} utilisateur(s) avec rôles
              </CardDescription>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-36 text-xs h-7">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {(Object.keys(roleConfig) as AppRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleConfig[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 md:p-2">
          <div className="space-y-1.5">
            {filteredUsers.map(([userId, data]) => {
              const highestRole = data.roles.sort((a, b) => {
                const order = { super_admin: 0, admin: 1, partner: 2, user: 3 };
                return order[a.role as AppRole] - order[b.role as AppRole];
              })[0];

              const config = roleConfig[highestRole.role as AppRole];
              const Icon = config.icon;

              return (
                <div
                  key={userId}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-1.5 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[11px] truncate">
                        {data.user.full_name || data.user.email}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">{data.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 flex-wrap w-full sm:w-auto">
                    {data.roles.map((role) => {
                      const roleConf = roleConfig[role.role as AppRole];
                      const isCurrentUserRole = userId === user?.id && (role.role === 'admin' || role.role === 'super_admin');
                      
                      return (
                        <Badge
                          key={role.id}
                          variant="secondary"
                          className="flex items-center gap-0.5 text-[9px] py-0 px-1"
                        >
                          <span className="truncate max-w-[80px]">{roleConf.label}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-2.5 w-2.5 p-0 hover:bg-destructive/20 shrink-0"
                            onClick={() => removeRole(role.id, userId, role.role as AppRole)}
                            disabled={isCurrentUserRole}
                            title={isCurrentUserRole ? "Vous ne pouvez pas retirer votre propre rôle admin" : "Retirer ce rôle"}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
