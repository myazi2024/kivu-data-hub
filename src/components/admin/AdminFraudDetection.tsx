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
import { ResponsiveTable } from '@/components/ui/responsive-table';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Tentatives totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.highSeverity} haute gravité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs suspects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersWithStrikes}</div>
            <p className="text-xs text-muted-foreground mt-1">Avec avertissements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Utilisateurs bloqués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.blockedUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Actuellement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Taux de détection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.totalAttempts > 0 
                ? ((stats.usersWithStrikes / stats.totalAttempts) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Actions prises</p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Utilisateurs Suspects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Avert.</TableHead>
                  <TableHead className="hidden lg:table-cell">Contributions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur suspect
                    </TableCell>
                  </TableRow>
                ) : (
                  suspiciousUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Sans nom'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.fraud_strikes >= 3 ? 'destructive' : 'secondary'}>
                          {user.fraud_strikes}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {user.suspicious_contributions}/{user.total_contributions}
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Bloqué
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockUser(user.user_id)}
                          >
                            Débloquer
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockUser(user.user_id)}
                          >
                            Bloquer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Fraud Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Tentatives de Fraude Récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Gravité</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune tentative de fraude
                    </TableCell>
                  </TableRow>
                ) : (
                  fraudAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">{attempt.fraud_type}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getSeverityBadge(attempt.severity)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {attempt.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Détails de la tentative</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Type</p>
                                <p className="font-medium">{attempt.fraud_type}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Gravité</p>
                                {getSeverityBadge(attempt.severity)}
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Date</p>
                                <p className="font-medium">
                                  {format(new Date(attempt.created_at), 'PPP à HH:mm', { locale: fr })}
                                </p>
                              </div>
                              {attempt.description && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Description</p>
                                  <p className="font-medium">{attempt.description}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground">ID Utilisateur</p>
                                <code className="text-xs">{attempt.user_id}</code>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
