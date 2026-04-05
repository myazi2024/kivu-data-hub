import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Shield, 
  Eye,
  Users,
  Ban,
  CheckCircle,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead
} from '@/components/ui/responsive-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { exportToCSV } from '@/utils/csvExport';

interface FraudAttempt {
  id: string;
  user_id: string;
  fraud_type: string;
  severity: string;
  description: string | null;
  contribution_id: string | null;
  created_at: string;
}

interface SuspiciousUser {
  user_id: string;
  full_name: string | null;
  email: string;
  fraud_strikes: number;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  suspicious_contributions: number;
  total_contributions: number;
}

export default function AdminFraudDetection() {
  const [fraudAttempts, setFraudAttempts] = useState<FraudAttempt[]>([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch fraud attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('fraud_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (attemptsError) throw attemptsError;
      setFraudAttempts(attempts || []);

      // Fetch suspicious users with contribution stats in a single optimized query
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          email,
          fraud_strikes,
          is_blocked,
          blocked_at,
          blocked_reason
        `)
        .or('fraud_strikes.gt.0,is_blocked.eq.true')
        .order('fraud_strikes', { ascending: false });

      if (usersError) throw usersError;

      // Fetch all contributions for suspicious users in ONE query (fix N+1)
      const userIds = (users || []).map(u => u.user_id);
      let contributionStats: Record<string, { total: number; suspicious: number }> = {};
      
      if (userIds.length > 0) {
        const { data: allContributions } = await supabase
          .from('cadastral_contributions')
          .select('user_id, is_suspicious')
          .in('user_id', userIds);

        // Aggregate contributions by user
        (allContributions || []).forEach(c => {
          if (!contributionStats[c.user_id]) {
            contributionStats[c.user_id] = { total: 0, suspicious: 0 };
          }
          contributionStats[c.user_id].total++;
          if (c.is_suspicious) contributionStats[c.user_id].suspicious++;
        });
      }

      const enrichedUsers = (users || []).map(user => ({
        ...user,
        total_contributions: contributionStats[user.user_id]?.total || 0,
        suspicious_contributions: contributionStats[user.user_id]?.suspicious || 0
      }));

      setSuspiciousUsers(enrichedUsers);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    // Check if target is admin/super_admin before blocking
    const targetUser = suspiciousUsers.find(u => u.user_id === userId);
    if (targetUser) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const userRoles = roles?.map(r => r.role) || [];
      if (userRoles.includes('super_admin' as any) || userRoles.includes('admin' as any)) {
        toast.error('Impossible de bloquer un administrateur depuis cette interface');
        return;
      }
    }

    if (!confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: 'Bloqué manuellement par un administrateur pour comportement suspect'
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Utilisateur bloqué');
      fetchData();
    } catch (error: any) {
      console.error('Erreur:', error);
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
      fetchData();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du déblocage');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      'low': 'secondary',
      'medium': 'default',
      'high': 'destructive'
    };
    return (
      <Badge variant={variants[severity] || 'outline'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const stats = {
    totalAttempts: fraudAttempts.length,
    highSeverity: fraudAttempts.filter(a => a.severity === 'high').length,
    blockedUsers: suspiciousUsers.filter(u => u.is_blocked).length,
    usersWithStrikes: suspiciousUsers.filter(u => u.fraud_strikes > 0).length
  };

  // Pagination for fraud attempts
  const {
    currentPage: fraudPage,
    pageSize: fraudPageSize,
    totalPages: fraudTotalPages,
    paginatedData: paginatedFraudAttempts,
    goToPage: goToFraudPage,
    goToNextPage: goToNextFraudPage,
    goToPreviousPage: goToPreviousFraudPage,
    changePageSize: changeFraudPageSize,
    hasNextPage: hasNextFraudPage,
    hasPreviousPage: hasPreviousFraudPage,
    totalItems: totalFraudItems
  } = usePagination(fraudAttempts, { initialPageSize: 15 });

  // Pagination for suspicious users
  const {
    currentPage: userPage,
    pageSize: userPageSize,
    totalPages: userTotalPages,
    paginatedData: paginatedUsers,
    goToPage: goToUserPage,
    goToNextPage: goToNextUserPage,
    goToPreviousPage: goToPreviousUserPage,
    changePageSize: changeUserPageSize,
    hasNextPage: hasNextUserPage,
    hasPreviousPage: hasPreviousUserPage,
    totalItems: totalUserItems
  } = usePagination(suspiciousUsers, { initialPageSize: 15 });

  const handleExportCSV = () => {
    exportToCSV({
      filename: `fraud_detection_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      headers: ['Date', 'Type', 'Gravité', 'Description', 'ID Utilisateur'],
      data: fraudAttempts.map(a => [
        format(new Date(a.created_at), 'dd/MM/yyyy HH:mm'),
        a.fraud_type,
        a.severity,
        a.description || '',
        a.user_id
      ])
    });
    toast.success('Export CSV téléchargé');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Alert Banner */}
      {stats.highSeverity > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {stats.highSeverity} tentative{stats.highSeverity > 1 ? 's' : ''} de fraude de haute gravité détectée{stats.highSeverity > 1 ? 's' : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Tentatives totales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg md:text-xl font-bold">{stats.totalAttempts}</div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">
              {stats.highSeverity} haute gravité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Utilisateurs suspects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg md:text-xl font-bold">{stats.usersWithStrikes}</div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Avec avertissements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Utilisateurs bloqués
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg md:text-xl font-bold text-destructive">{stats.blockedUsers}</div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Actuellement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 p-2">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Taux de détection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-lg md:text-xl font-bold text-success">
              {stats.totalAttempts > 0 
                ? ((stats.usersWithStrikes / stats.totalAttempts) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Actions prises</p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Users */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
            <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Utilisateurs Suspects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-2">
          <div className="overflow-x-auto">
            <ResponsiveTable className="border-none">
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Email</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Avert.</ResponsiveTableHead>
                  <ResponsiveTableHead priority="low">Contributions</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Statut</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {paginatedUsers.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell priority="high" label="">
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        Aucun utilisateur suspect
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <ResponsiveTableRow key={user.user_id}>
                      <ResponsiveTableCell priority="high" label="Utilisateur">
                        <div className="font-medium text-sm">
                          {user.full_name || 'Sans nom'}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="low" label="Email">
                        <div className="text-xs md:text-sm text-muted-foreground break-all">
                          {user.email}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Avertissements">
                        <Badge variant={user.fraud_strikes >= 3 ? 'destructive' : 'secondary'} className="text-xs">
                          {user.fraud_strikes}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="low" label="Contributions">
                        <div className="text-xs md:text-sm">
                          {user.suspicious_contributions}/{user.total_contributions}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Statut">
                        {user.is_blocked ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <Ban className="h-3 w-3" />
                            Bloqué
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Actif
                          </Badge>
                        )}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Actions">
                        {user.is_blocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockUser(user.user_id)}
                            className="text-xs"
                          >
                            Débloquer
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockUser(user.user_id)}
                            className="text-xs"
                          >
                            Bloquer
                          </Button>
                        )}
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))
                )}
              </ResponsiveTableBody>
            </ResponsiveTable>
          </div>
          {/* Pagination for users */}
          {totalUserItems > 10 && (
            <div className="p-2">
              <PaginationControls
                currentPage={userPage}
                totalPages={userTotalPages}
                pageSize={userPageSize}
                totalItems={totalUserItems}
                hasNextPage={hasNextUserPage}
                hasPreviousPage={hasPreviousUserPage}
                onPageChange={goToUserPage}
                onPageSizeChange={changeUserPageSize}
                onNextPage={goToNextUserPage}
                onPreviousPage={goToPreviousUserPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Attempts */}
      <Card>
        <CardHeader className="p-2 md:p-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Tentatives de Fraude Récentes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0 md:p-2">
          <div className="overflow-x-auto">
            <ResponsiveTable className="border-none">
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead priority="low">Date</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Type</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Gravité</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Description</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Détails</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {paginatedFraudAttempts.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell priority="high" label="">
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        Aucune tentative de fraude
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : (
                  paginatedFraudAttempts.map((attempt) => (
                    <ResponsiveTableRow key={attempt.id}>
                      <ResponsiveTableCell priority="low" label="Date">
                        <span className="text-xs md:text-sm">
                          {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Type">
                        <span className="font-medium text-sm">{attempt.fraud_type}</span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Gravité">
                        {getSeverityBadge(attempt.severity)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Description">
                        <span className="text-xs md:text-sm line-clamp-2">
                          {attempt.description || '-'}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Détails">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8">
                              <Eye className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-base md:text-lg">Détails de la tentative</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Type</p>
                                <p className="font-medium text-sm md:text-base">{attempt.fraud_type}</p>
                              </div>
                              <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Gravité</p>
                                <div className="mt-1">{getSeverityBadge(attempt.severity)}</div>
                              </div>
                              <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Date</p>
                                <p className="font-medium text-sm md:text-base">
                                  {format(new Date(attempt.created_at), 'PPP à HH:mm', { locale: fr })}
                                </p>
                              </div>
                              {attempt.description && (
                                <div>
                                  <p className="text-xs md:text-sm text-muted-foreground">Description</p>
                                  <p className="font-medium text-sm md:text-base">{attempt.description}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs md:text-sm text-muted-foreground">ID Utilisateur</p>
                                <code className="text-[10px] md:text-xs break-all">{attempt.user_id}</code>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))
                )}
              </ResponsiveTableBody>
            </ResponsiveTable>
          </div>
          {/* Pagination for fraud attempts */}
          {totalFraudItems > 20 && (
            <div className="p-2">
              <PaginationControls
                currentPage={fraudPage}
                totalPages={fraudTotalPages}
                pageSize={fraudPageSize}
                totalItems={totalFraudItems}
                hasNextPage={hasNextFraudPage}
                hasPreviousPage={hasPreviousFraudPage}
                onPageChange={goToFraudPage}
                onPageSizeChange={changeFraudPageSize}
                onNextPage={goToNextFraudPage}
                onPreviousPage={goToPreviousFraudPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
