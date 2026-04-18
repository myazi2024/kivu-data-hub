import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportToCSV } from '@/utils/csvExport';
import FraudStats, { type FraudStatsData } from './fraud/FraudStats';
import SuspiciousUsersTable, { type SuspiciousUser } from './fraud/SuspiciousUsersTable';
import FraudAttemptsTable, { type FraudAttempt } from './fraud/FraudAttemptsTable';
import { UserDetailsDialog } from './users/UserDetailsDialog';
import { useUserManagement } from '@/hooks/useUserManagement';

export default function AdminFraudDetection() {
  const [fraudAttempts, setFraudAttempts] = useState<FraudAttempt[]>([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('_all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { users: allUsers, blockUser, unblockUser, fetchUsers } = useUserManagement();

  useEffect(() => {
    fetchData();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: attempts, error: attemptsError } = await supabase
        .from('fraud_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (attemptsError) throw attemptsError;
      setFraudAttempts(attempts || []);

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, fraud_strikes, is_blocked, blocked_at, blocked_reason')
        .or('fraud_strikes.gt.0,is_blocked.eq.true')
        .order('fraud_strikes', { ascending: false });
      if (usersError) throw usersError;

      const userIds = (users || []).map((u) => u.user_id);
      const contributionStats: Record<string, { total: number; suspicious: number }> = {};

      if (userIds.length > 0) {
        const { data: allContributions } = await supabase
          .from('cadastral_contributions')
          .select('user_id, is_suspicious')
          .in('user_id', userIds);
        (allContributions || []).forEach((c) => {
          if (!c.user_id) return;
          if (!contributionStats[c.user_id]) {
            contributionStats[c.user_id] = { total: 0, suspicious: 0 };
          }
          contributionStats[c.user_id].total++;
          if (c.is_suspicious) contributionStats[c.user_id].suspicious++;
        });
      }

      const enriched = (users || []).map((u) => ({
        ...u,
        total_contributions: contributionStats[u.user_id]?.total || 0,
        suspicious_contributions: contributionStats[u.user_id]?.suspicious || 0,
      }));
      setSuspiciousUsers(enriched);
    } catch (e) {
      console.error('Erreur:', e);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const userRoles = roles?.map((r) => r.role) || [];
    if (userRoles.includes('super_admin' as any) || userRoles.includes('admin' as any)) {
      toast.error('Impossible de bloquer un administrateur depuis cette interface');
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: 'Bloqué manuellement pour comportement suspect',
        })
        .eq('user_id', userId);
      if (error) throw error;
      toast.success('Utilisateur bloqué');
      fetchData();
    } catch (e) {
      toast.error('Erreur lors du blocage');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: false, blocked_at: null, blocked_reason: null })
        .eq('user_id', userId);
      if (error) throw error;
      toast.success('Utilisateur débloqué');
      fetchData();
    } catch (e) {
      toast.error('Erreur lors du déblocage');
    }
  };

  // Filters applied to attempts
  const filteredAttempts = useMemo(() => {
    return fraudAttempts.filter((a) => {
      if (severityFilter !== '_all' && a.severity !== severityFilter) return false;
      if (startDate && new Date(a.created_at) < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(a.created_at) > end) return false;
      }
      return true;
    });
  }, [fraudAttempts, severityFilter, startDate, endDate]);

  const stats: FraudStatsData = useMemo(
    () => ({
      totalAttempts: fraudAttempts.length,
      highSeverity: fraudAttempts.filter((a) => a.severity === 'high' || a.severity === 'critical').length,
      blockedUsers: suspiciousUsers.filter((u) => u.is_blocked).length,
      usersWithStrikes: suspiciousUsers.filter((u) => u.fraud_strikes > 0).length,
    }),
    [fraudAttempts, suspiciousUsers]
  );

  const handleExportCSV = () => {
    exportToCSV({
      filename: `fraud_detection_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Type', 'Gravité', 'Description', 'ID Utilisateur'],
      data: filteredAttempts.map((a) => [
        format(new Date(a.created_at), 'dd/MM/yyyy HH:mm'),
        a.fraud_type,
        a.severity,
        a.description || '',
        a.user_id,
      ]),
    });
    toast.success('Export CSV téléchargé');
  };

  const profileUser = profileUserId ? allUsers.find((u) => u.user_id === profileUserId) : null;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-2">
      {stats.highSeverity > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {stats.highSeverity} tentative{stats.highSeverity > 1 ? 's' : ''} de fraude haute/critique
            détectée{stats.highSeverity > 1 ? 's' : ''}
          </AlertDescription>
        </Alert>
      )}

      <FraudStats stats={stats} />

      <SuspiciousUsersTable
        users={suspiciousUsers}
        onBlock={handleBlockUser}
        onUnblock={handleUnblockUser}
        onViewProfile={(uid) => setProfileUserId(uid)}
      />

      <FraudAttemptsTable
        attempts={filteredAttempts}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={handleExportCSV}
      />

      {/* Profile bridge dialog */}
      <Dialog open={!!profileUserId} onOpenChange={(o) => !o && setProfileUserId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Profil utilisateur</DialogTitle>
          </DialogHeader>
          {profileUser ? (
            <UserDetailsDialog user={profileUser} onBlock={blockUser} onUnblock={unblockUser} />
          ) : (
            <div className="text-xs text-muted-foreground py-4 text-center">
              Profil introuvable dans la liste — l'utilisateur n'est peut-être pas chargé.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
