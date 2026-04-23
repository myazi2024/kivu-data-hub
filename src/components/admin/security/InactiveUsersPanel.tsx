import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { UserX, Ban } from 'lucide-react';
import {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
} from '@/components/ui/responsive-table';

interface InactiveUser {
  user_id: string;
  email: string;
  full_name: string | null;
  last_activity: string | null;
  days_inactive: number;
}

const InactiveUsersPanel: React.FC = () => {
  const [thresholdDays, setThresholdDays] = useState(180);
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const fetchInactive = async (days: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_inactive_users', {
        _threshold_days: days,
      });
      if (error) throw error;
      setUsers((data as unknown as InactiveUser[]) || []);
      setSelected([]);
    } catch (e: any) {
      console.error('inactive_users error', e);
      toast.error("Erreur lors du chargement des utilisateurs inactifs");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactive(thresholdDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBulkBlock = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Bloquer ${selected.length} utilisateur(s) inactifs ?`)) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: `Bloqué pour inactivité (>${thresholdDays} jours)`,
        })
        .in('user_id', selected);
      if (error) throw error;
      toast.success(`${selected.length} utilisateur(s) bloqué(s)`);
      fetchInactive(thresholdDays);
    } catch (e) {
      toast.error('Erreur lors du blocage');
    }
  };

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
            <UserX className="w-4 h-4" /> Utilisateurs inactifs ({users.length})
          </CardTitle>
          <div className="flex gap-1.5 items-center">
            <select
              value={thresholdDays}
              onChange={(e) => {
                const v = Number(e.target.value);
                setThresholdDays(v);
                fetchInactive(v);
              }}
              className="h-7 text-xs border rounded px-2 bg-background"
            >
              <option value={90}>90 jours</option>
              <option value={180}>180 jours</option>
              <option value={365}>1 an</option>
            </select>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1"
              disabled={selected.length === 0}
              onClick={handleBulkBlock}
            >
              <Ban className="w-3 h-3" />
              Bloquer ({selected.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        {loading ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Chargement...</div>
        ) : (
          <ResponsiveTable className="border-none">
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="high" className="w-8">
                  <Checkbox
                    checked={selected.length === users.length && users.length > 0}
                    onCheckedChange={(c) =>
                      setSelected(c ? users.map((u) => u.user_id) : [])
                    }
                  />
                </ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Dernière activité</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Jours inactif</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {users.length === 0 ? (
                <ResponsiveTableRow>
                  <ResponsiveTableCell priority="high" colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                    Aucun utilisateur inactif
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ) : (
                users.map((u) => (
                  <ResponsiveTableRow key={u.user_id}>
                    <ResponsiveTableCell priority="high">
                      <Checkbox
                        checked={selected.includes(u.user_id)}
                        onCheckedChange={(c) =>
                          setSelected((prev) =>
                            c ? [...prev, u.user_id] : prev.filter((id) => id !== u.user_id)
                          )
                        }
                      />
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Utilisateur">
                      <div className="text-xs font-medium">{u.full_name || 'Sans nom'}</div>
                      <div className="text-[10px] text-muted-foreground break-all">{u.email}</div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Dernière activité">
                      <span className="text-xs">
                        {u.last_activity
                          ? new Date(u.last_activity).toLocaleDateString('fr-FR')
                          : 'Jamais'}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Jours inactif">
                      <Badge variant={u.days_inactive > 365 ? 'destructive' : 'secondary'} className="text-xs">
                        {u.days_inactive}j
                      </Badge>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))
              )}
            </ResponsiveTableBody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
};

export default InactiveUsersPanel;
