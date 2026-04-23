import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Ban, ShieldAlert, KeyRound, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import InactiveUsersPanel from './InactiveUsersPanel';

interface SecurityMetrics {
  fraudHigh7d: number;
  blocked7d: number;
  roleChanges7d: number;
  topRiskUsers: Array<{ user_id: string; email: string; full_name: string | null; fraud_strikes: number }>;
}

const AdminSecurityHub: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    fraudHigh7d: 0,
    blocked7d: 0,
    roleChanges7d: 0,
    topRiskUsers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const since = subDays(new Date(), 7).toISOString();

        const [{ count: fraudHigh }, { data: roleAudit, count: roleCnt }, { count: blockedCnt }, { data: top }] =
          await Promise.all([
            supabase
              .from('fraud_attempts')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', since)
              .in('severity', ['high', 'critical']),
            supabase
              .from('audit_logs')
              .select('id', { count: 'exact', head: true })
              .eq('table_name', 'user_roles')
              .gte('created_at', since),
            supabase
              .from('audit_logs')
              .select('id', { count: 'exact', head: true })
              .eq('table_name', 'profiles')
              .gte('created_at', since)
              .eq('action', 'UPDATE'),
            supabase
              .from('profiles')
              .select('user_id, email, full_name, fraud_strikes')
              .gt('fraud_strikes', 0)
              .order('fraud_strikes', { ascending: false })
              .limit(5),
          ]);

        setMetrics({
          fraudHigh7d: fraudHigh || 0,
          blocked7d: blockedCnt || 0,
          roleChanges7d: roleCnt || 0,
          topRiskUsers: (top as SecurityMetrics['topRiskUsers']) || [],
        });
      } catch (e) {
        console.error('Security hub load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Fraude high/critical (7j)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold text-destructive">
              {loading ? '…' : metrics.fraudHigh7d}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Ban className="h-3 w-3" /> Mouvements profils (7j)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold">{loading ? '…' : metrics.blocked7d}</div>
            <p className="text-[10px] text-muted-foreground">blocages, déblocages, modifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> Modifs rôles (7j)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-2xl font-bold">{loading ? '…' : metrics.roleChanges7d}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top risk users */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="w-4 h-4" /> Top utilisateurs à risque
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Chargement...</div>
          ) : metrics.topRiskUsers.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              Aucun utilisateur à risque
            </div>
          ) : (
            <ul className="space-y-1.5">
              {metrics.topRiskUsers.map((u) => (
                <li
                  key={u.user_id}
                  className="flex items-center justify-between p-1.5 rounded border bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{u.full_name || 'Sans nom'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {u.fraud_strikes} avert.
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Inactive users panel */}
      <InactiveUsersPanel />

      {/* 2FA debt notice */}
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="flex items-center gap-1.5 text-sm text-warning">
            <ShieldAlert className="w-4 h-4" /> Dette sécurité — 2FA admin
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 text-xs text-muted-foreground">
          L'authentification à deux facteurs n'est pas encore appliquée aux comptes
          <span className="font-medium"> admin / super_admin</span>. À planifier
          (Supabase Auth MFA) pour toute mise en production publique.
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurityHub;
