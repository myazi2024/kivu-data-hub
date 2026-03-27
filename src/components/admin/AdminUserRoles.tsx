import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, Briefcase, User, Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserSearchSelect } from './users/UserSearchSelect';

type AppRole = 'super_admin' | 'admin' | 'partner' | 'user' | 'expert_immobilier' | 'mortgage_officer' | 'notaire' | 'geometre' | 'urbaniste';

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
  expert_immobilier: {
    icon: Shield,
    label: 'Expert Immobilier',
    color: 'bg-gradient-to-r from-amber-500 to-orange-500',
    description: 'Évaluation des biens immobiliers',
  },
  mortgage_officer: {
    icon: Shield,
    label: 'Officier Hypothécaire',
    color: 'bg-gradient-to-r from-red-500 to-rose-500',
    description: 'Traitement des demandes de radiation d\'hypothèque',
  },
  notaire: {
    icon: Briefcase,
    label: 'Notaire',
    color: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    description: 'Mutations et attestations notariées',
  },
  geometre: {
    icon: Shield,
    label: 'Géomètre',
    color: 'bg-gradient-to-r from-lime-500 to-green-500',
    description: 'Bornage et lotissement',
  },
  urbaniste: {
    icon: Shield,
    label: 'Agent d\'urbanisme',
    color: 'bg-gradient-to-r from-rose-500 to-red-500',
    description: 'Autorisations de bâtir',
  },
  user: {
    icon: User,
    label: 'Utilisateur',
    color: 'bg-gradient-to-r from-gray-500 to-slate-500',
    description: 'Accès standard',
  },
};

export const AdminUserRoles: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);

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

  const fetchUserRoles = async () => {
    try {
      // Optimized query with single JOIN to avoid N+1
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles!inner (
            user_id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Transform the data to match expected structure
      const data = rolesData?.map(role => ({
        id: role.id,
        user_id: role.user_id,
        role: role.role,
        created_at: role.created_at,
        profiles: Array.isArray(role.profiles) ? role.profiles[0] : role.profiles
      }));

      setUserRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les rôles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = async () => {
    if (!selectedUserId || !selectedRole) return;

    try {
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
      setSelectedUserId('');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter le rôle',
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (roleId: string) => {
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
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer le rôle',
        variant: 'destructive',
      });
    }
  };

  // Group roles by user
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
    <div className="space-y-6">
      {/* Role Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Hiérarchie des Rôles</CardTitle>
          <CardDescription>
            Organisation des privilèges par ordre décroissant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(roleConfig) as AppRole[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <div
                  key={role}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{config.label}</h3>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Role */}
      <Card>
        <CardHeader>
          <CardTitle>Attribuer un Rôle</CardTitle>
          <CardDescription>
            Ajouter un nouveau rôle à un utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <UserSearchSelect 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
            />

            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleConfig) as AppRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleConfig[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={addRole} disabled={!selectedUserId}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users and Their Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs et Rôles</CardTitle>
          <CardDescription>
            {Object.keys(userRolesGrouped).length} utilisateur(s) avec rôles attribués
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(userRolesGrouped).map(([userId, data]) => {
              const highestRole = data.roles.sort((a, b) => {
                const order = { super_admin: 0, admin: 1, partner: 2, user: 3 };
                return order[a.role as AppRole] - order[b.role as AppRole];
              })[0];

              const config = roleConfig[highestRole.role as AppRole];
              const Icon = config.icon;

              return (
                <div
                  key={userId}
                  className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {data.user.full_name || data.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{data.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {data.roles.map((role) => {
                      const roleConf = roleConfig[role.role as AppRole];
                      return (
                        <Badge
                          key={role.id}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          {roleConf.label}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => removeRole(role.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
