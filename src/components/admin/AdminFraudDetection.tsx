import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Shield, 
  Eye,
  TrendingUp,
  Users,
  Ban,
  CheckCircle
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
        .limit(100);

      if (attemptsError) throw attemptsError;
      setFraudAttempts(attempts || []);

      // Fetch suspicious users
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

      // Enrichir avec les stats de contributions
      const enrichedUsers = await Promise.all(
        (users || []).map(async (user) => {
          const { data: contributions } = await supabase
            .from('cadastral_contributions')
            .select('id, is_suspicious')
            .eq('user_id', user.user_id);

          return {
            ...user,
            total_contributions: contributions?.length || 0,
            suspicious_contributions: contributions?.filter(c => c.is_suspicious).length || 0
          };
        })
      );

      setSuspiciousUsers(enrichedUsers);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {stats.highSeverity > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.highSeverity} tentative{stats.highSeverity > 1 ? 's' : ''} de fraude de haute gravité détectée{stats.highSeverity > 1 ? 's' : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
              Tentatives totales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.totalAttempts}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              {stats.highSeverity} haute gravité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              Utilisateurs suspects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.usersWithStrikes}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Avec avertissements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="h-3 w-3 md:h-4 md:w-4" />
              Utilisateurs bloqués
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-destructive">{stats.blockedUsers}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Actuellement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-3 w-3 md:h-4 md:w-4" />
              Taux de détection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-success">
              {stats.totalAttempts > 0 
                ? ((stats.usersWithStrikes / stats.totalAttempts) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Actions prises</p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Users */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            Utilisateurs Suspects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
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
                {suspiciousUsers.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell priority="high" label="">
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        Aucun utilisateur suspect
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : (
                  suspiciousUsers.map((user) => (
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
        </CardContent>
      </Card>

      {/* Fraud Attempts */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
            Tentatives de Fraude Récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
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
                {fraudAttempts.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell priority="high" label="">
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        Aucune tentative de fraude
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : (
                  fraudAttempts.map((attempt) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
