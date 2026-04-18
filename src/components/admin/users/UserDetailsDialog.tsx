import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, History, StickyNote, Activity } from 'lucide-react';
import { AdminUserNotes } from './AdminUserNotes';
import { AdminUserActivity } from './AdminUserActivity';
import { UserProfile } from '@/hooks/useUserManagement';
import { useAdminUserStatistics } from '@/hooks/useAdminUserStatistics';
import { UserStatsDisplay } from './UserStatsDisplay';
import { BlockUserDialog } from './BlockUserDialog';
import { AdminUserNotes } from './AdminUserNotes';
import { AdminUserActivity } from './AdminUserActivity';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ROLE_CONFIG, type AppRole } from '@/constants/roles';

interface UserDetailsDialogProps {
  user: UserProfile;
  onBlock: (userId: string, reason: string, userRole: string) => Promise<boolean>;
  onUnblock: (userId: string) => Promise<boolean>;
}

interface UserRole {
  role: string;
  created_at: string;
}

interface BlockHistory {
  blocked_at: string;
  blocked_reason: string;
  unblocked_at?: string;
  admin_name?: string;
}

export const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ 
  user, 
  onBlock, 
  onUnblock 
}) => {
  const [open, setOpen] = useState(false);
  const { statistics, loading: statsLoading, refetch } = useAdminUserStatistics(user.user_id);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [blockHistory, setBlockHistory] = useState<BlockHistory[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showBlockHistory, setShowBlockHistory] = useState(false);

  useEffect(() => {
    if (open) {
      refetch();
      fetchAllRoles();
      fetchBlockHistory();
    }
  }, [open, refetch, user.user_id]);

  const fetchAllRoles = async () => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, created_at')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchBlockHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('created_at, new_values, old_values, admin_name')
        .eq('table_name', 'profiles')
        .eq('record_id', user.user_id)
        .eq('action', 'UPDATE')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching block history:', error);
        toast.error('Erreur lors du chargement de l\'historique');
        setBlockHistory([]);
        return;
      }

      const history: BlockHistory[] = [];
      // Data is ordered ascending (oldest first) so blocks appear before their unblocks
      (data || []).forEach((log) => {
        if (log.new_values && typeof log.new_values === 'object') {
          const newVals = log.new_values as any;
          if (newVals.is_blocked === true && newVals.blocked_reason) {
            history.push({
              blocked_at: log.created_at,
              blocked_reason: newVals.blocked_reason,
              admin_name: log.admin_name || 'Admin inconnu'
            });
          } else if (newVals.is_blocked === false && history.length > 0) {
            history[history.length - 1].unblocked_at = log.created_at;
          }
        }
      });
      // Reverse to show newest first in UI
      history.reverse();

      setBlockHistory(history);
    } catch (error) {
      console.error('Error fetching block history:', error);
      toast.error('Erreur lors du chargement de l\'historique');
      setBlockHistory([]);
    }
  };

  const handleUnblock = async () => {
    setIsUnblocking(true);
    const success = await onUnblock(user.user_id);
    
    if (success) {
      // Send notification to the user
      try {
        await supabase.from('notifications').insert({
          user_id: user.user_id,
          type: 'account',
          title: 'Compte débloqué',
          message: 'Votre compte a été débloqué. Vous pouvez à nouveau accéder à la plateforme.',
          action_url: '/user-dashboard'
        });
      } catch (error) {
        console.error('Error sending unblock notification:', error);
      }

      setOpen(false);
    }
    
    setIsUnblocking(false);
  };

  const getRoleBadge = (role: string) => {
    const meta = ROLE_CONFIG[(role as AppRole)] || ROLE_CONFIG.user;
    const Icon = meta.icon;
    return (
      <Badge variant={meta.badgeVariant} className="flex items-center gap-1 text-xs py-0.5 px-2">
        <Icon className="w-3 h-3" />
        {meta.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
        >
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">Voir</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Détails utilisateur</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="info" className="text-xs">Infos</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><StickyNote className="w-3 h-3" />Notes</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="w-3 h-3" />Activité</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-3">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Nom complet</p>
              <p className="font-medium text-xs md:text-sm">{user.full_name || 'Non défini'}</p>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-xs md:text-sm break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Organisation</p>
              <p className="font-medium text-xs md:text-sm">{user.organization || 'Non spécifiée'}</p>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Rôle principal</p>
              <div className="mt-0.5">
                {getRoleBadge(user.role)}
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Statut</p>
              <div className="mt-0.5">
                <Badge variant={user.is_blocked ? 'destructive' : 'secondary'} className="text-xs">
                  {user.is_blocked ? 'Bloqué' : 'Actif'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Avertissements fraude</p>
              <div className="mt-0.5">
                <Badge variant={user.fraud_strikes > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  {user.fraud_strikes} strike{user.fraud_strikes > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Inscription</p>
              <p className="font-medium text-xs md:text-sm">
                {new Date(user.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* All Roles Section */}
          {allRoles.length >= 1 && (
            <div className="border-t pt-3">
              <h4 className="font-semibold mb-1.5 text-xs md:text-sm">Tous les rôles ({allRoles.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {loadingRoles ? (
                  <div className="text-[10px] text-muted-foreground">Chargement...</div>
                ) : (
                  allRoles.map((roleItem, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      {getRoleBadge(roleItem.role)}
                      <span className="text-[10px] text-muted-foreground">
                        depuis {new Date(roleItem.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <UserStatsDisplay 
            stats={statistics} 
            loading={statsLoading}
            onPeriodChange={(start, end) => refetch(start, end)}
          />

          {/* Current Block Info */}
          {user.is_blocked && user.blocked_reason && (
            <div className="border-t pt-3">
              <h4 className="font-semibold mb-1.5 text-xs md:text-sm text-destructive">Blocage actuel</h4>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                <p className="text-[10px] md:text-xs font-medium mb-0.5">Raison:</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{user.blocked_reason}</p>
                <p className="text-[9px] text-muted-foreground mt-1.5">
                  Bloqué le: {new Date(user.blocked_at!).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Block History */}
          {blockHistory.length > 0 && (
            <div className="border-t pt-3">
              <Collapsible open={showBlockHistory} onOpenChange={setShowBlockHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-7">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      <span className="font-semibold text-xs">Historique des blocages ({blockHistory.length})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {showBlockHistory ? 'Masquer' : 'Afficher'}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1.5">
                  {blockHistory.map((block, index) => (
                    <div key={index} className="bg-muted rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="destructive" className="text-[9px] py-0 px-1">
                          Blocage #{blockHistory.length - index}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(block.blocked_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1">{block.blocked_reason}</p>
                      {block.admin_name && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Par: <span className="font-medium">{block.admin_name}</span>
                        </p>
                      )}
                      {block.unblocked_at && (
                        <p className="text-[10px] text-success">
                          Débloqué le: {new Date(block.unblocked_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-1.5 pt-3 border-t">
            {user.is_blocked ? (
              <Button 
                onClick={handleUnblock}
                className="w-full sm:flex-1 gap-1.5 h-7 text-xs"
                variant="default"
                disabled={isUnblocking}
              >
                <CheckCircle className="w-3 h-3" />
                {isUnblocking ? 'Déblocage...' : 'Débloquer'}
              </Button>
            ) : (
              <BlockUserDialog 
                userId={user.user_id}
                userName={user.full_name || user.email}
                userEmail={user.email}
                userRole={user.role}
                onBlock={onBlock}
              />
            )}
          </div>
        </div>
        </TabsContent>
        <TabsContent value="notes" className="mt-3">
          <AdminUserNotes userId={user.user_id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-3">
          <AdminUserActivity userId={user.user_id} />
        </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
