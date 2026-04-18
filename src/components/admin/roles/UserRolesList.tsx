import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search } from 'lucide-react';
import { ROLE_CONFIG, ROLE_HIERARCHY, getHighestRole, type AppRole } from '@/constants/roles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserRole } from '../AdminUserRolesEnhanced';

interface Props {
  userRoles: UserRole[];
  currentUserId?: string;
  isSuperAdmin: boolean;
  onRoleRemoved: () => void;
}

export const UserRolesList: React.FC<Props> = ({ userRoles, currentUserId, isSuperAdmin, onRoleRemoved }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const grouped = userRoles.reduce((acc, role) => {
    if (!acc[role.user_id]) acc[role.user_id] = { user: role.profiles, roles: [] };
    acc[role.user_id].roles.push(role);
    return acc;
  }, {} as Record<string, { user: { full_name: string | null; email: string }; roles: UserRole[] }>);

  const filtered = Object.entries(grouped).filter(([, data]) => {
    const matchesSearch = !search || data.user.full_name?.toLowerCase().includes(search.toLowerCase()) || data.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filter === 'all' || data.roles.some(r => r.role === filter);
    return matchesSearch && matchesRole;
  });

  const removeRole = async (roleId: string, targetUserId: string, roleToRemove: AppRole) => {
    if (targetUserId === currentUserId) { toast.error('Vous ne pouvez pas retirer votre propre rôle'); return; }
    if (roleToRemove === 'super_admin' && !isSuperAdmin) { toast.error('Seul un super admin peut retirer ce rôle'); return; }
    if (!confirm(`Retirer le rôle ${ROLE_CONFIG[roleToRemove].label} ?`)) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) { toast.error(error.message); return; }
    toast.success('Rôle retiré');
    onRoleRemoved();
  };

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm md:text-base">Utilisateurs et Rôles</CardTitle>
            <CardDescription className="text-[10px] md:text-xs">{Object.keys(grouped).length} utilisateur(s) avec rôles</CardDescription>
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7 text-xs h-7 w-full sm:w-40" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-36 text-xs h-7"><SelectValue placeholder="Filtrer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {ROLE_HIERARCHY.map(r => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-1.5 md:p-2">
        <div className="space-y-1.5">
          {filtered.map(([userId, data]) => {
            const highestRoleKey = getHighestRole(data.roles.map(r => r.role));
            const cfg = ROLE_CONFIG[highestRoleKey];
            const Icon = cfg.icon;
            return (
              <div key={userId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-1.5 rounded-lg border hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-full ${cfg.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[11px] truncate">{data.user.full_name || data.user.email}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{data.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-wrap w-full sm:w-auto">
                  {data.roles.map(role => {
                    const rcfg = ROLE_CONFIG[role.role as AppRole];
                    const isOwn = userId === currentUserId;
                    const isProtectedSA = role.role === 'super_admin' && !isSuperAdmin;
                    const disabled = isOwn || isProtectedSA;
                    return (
                      <Badge key={role.id} variant="secondary" className="flex items-center gap-0.5 text-[9px] py-0 px-1">
                        <span className="truncate max-w-[80px]">{rcfg.label}</span>
                        <Button size="sm" variant="ghost" className="h-2.5 w-2.5 p-0 hover:bg-destructive/20 shrink-0"
                          onClick={() => removeRole(role.id, userId, role.role as AppRole)}
                          disabled={disabled}
                          title={isOwn ? "Vous ne pouvez pas retirer votre propre rôle" : isProtectedSA ? "Réservé aux super admins" : "Retirer"}
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
          {filtered.length === 0 && <div className="text-center py-4 text-xs text-muted-foreground">Aucun utilisateur trouvé</div>}
        </div>
      </CardContent>
    </Card>
  );
};
