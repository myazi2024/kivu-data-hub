import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { ROLE_CONFIG, ROLE_HIERARCHY, SENSITIVE_ROLES, type AppRole } from '@/constants/roles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  allUsers: { user_id: string; full_name: string | null; email: string }[];
  currentUserId?: string;
  isSuperAdmin: boolean;
  onAssigned: () => void;
}

export const RoleAssignForm: React.FC<Props> = ({ allUsers, currentUserId, isSuperAdmin, onAssigned }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');

  const filtered = allUsers.filter(u =>
    !searchQuery || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSensitive = SENSITIVE_ROLES.includes(selectedRole);
  const canAssignSelected = !isSensitive || isSuperAdmin || selectedRole === 'admin';

  const handleAdd = async () => {
    if (!selectedUserId || !selectedRole) { toast.error('Sélectionnez un utilisateur et un rôle'); return; }
    if (selectedRole === 'super_admin' && !isSuperAdmin) { toast.error('Seul un super admin peut attribuer ce rôle'); return; }
    if (SENSITIVE_ROLES.includes(selectedRole)) {
      if (!confirm(`Attribuer le rôle sensible "${ROLE_CONFIG[selectedRole].label}" ?`)) return;
    }
    const { data: existing } = await supabase
      .from('user_roles').select('id').eq('user_id', selectedUserId).eq('role', selectedRole as any).maybeSingle();
    if (existing) { toast.error(`Rôle ${ROLE_CONFIG[selectedRole].label} déjà attribué`); return; }
    const { error } = await supabase.from('user_roles').insert({ user_id: selectedUserId, role: selectedRole as any, created_by: currentUserId });
    if (error) { toast.error(error.message); return; }
    toast.success('Rôle ajouté avec succès');
    setSelectedUserId('');
    onAssigned();
  };

  return (
    <div className="flex-1 space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
        <Input placeholder="Rechercher un utilisateur..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 text-xs h-7" />
      </div>
      <div className="flex flex-col sm:flex-row gap-1.5">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1 text-xs h-7"><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
          <SelectContent>
            {filtered.map(u => (
              <SelectItem key={u.user_id} value={u.user_id} className="text-sm">
                <div className="flex flex-col">
                  <span>{u.full_name || u.email}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedRole} onValueChange={v => setSelectedRole(v as AppRole)}>
          <SelectTrigger className="w-full sm:w-40 text-xs h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLE_HIERARCHY.map(r => (
              <SelectItem key={r} value={r} className="text-xs" disabled={r === 'super_admin' && !isSuperAdmin}>
                {ROLE_CONFIG[r].label}{r === 'super_admin' && !isSuperAdmin ? ' (réservé)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selectedUserId || !canAssignSelected} className="w-full sm:w-auto gap-1 text-xs h-7 px-3">
          <Plus className="h-3 w-3" /><span>Ajouter</span>
        </Button>
      </div>
      {isSensitive && (
        <div className="flex items-center gap-1 p-1.5 bg-warning/10 rounded-lg border border-warning/30">
          <AlertTriangle className="w-2.5 h-2.5 text-warning shrink-0" />
          <p className="text-[9px] text-warning-foreground">
            Rôle sensible — confirmation requise lors de l'attribution.
          </p>
        </div>
      )}
    </div>
  );
};
