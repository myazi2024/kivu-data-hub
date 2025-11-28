import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle } from 'lucide-react';
import { UserProfile } from '@/hooks/useUserManagement';
import { UserStatistics, useUserStatistics } from '@/hooks/useUserStatistics';
import { UserStatsDisplay } from './UserStatsDisplay';
import { BlockUserDialog } from './BlockUserDialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, User as UserIcon } from 'lucide-react';

interface UserDetailsDialogProps {
  user: UserProfile;
  onBlock: (userId: string, reason: string, userRole: string) => Promise<boolean>;
  onUnblock: (userId: string) => Promise<boolean>;
}

export const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ 
  user, 
  onBlock, 
  onUnblock 
}) => {
  const [open, setOpen] = useState(false);
  const { statistics, loading: statsLoading, refetch } = useUserStatistics();
  const [isUnblocking, setIsUnblocking] = useState(false);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleUnblock = async () => {
    setIsUnblocking(true);
    const success = await onUnblock(user.user_id);
    setIsUnblocking(false);
    if (success) {
      setOpen(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: any, icon: any, label: string }> = {
      super_admin: { variant: 'destructive', icon: Shield, label: 'Super Admin' },
      admin: { variant: 'destructive', icon: Shield, label: 'Admin' },
      partner: { variant: 'default', icon: Users, label: 'Partenaire' },
      user: { variant: 'secondary', icon: UserIcon, label: 'Utilisateur' }
    };
    
    const { variant, icon: Icon, label } = config[role] || config.user;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1 text-xs py-0.5 px-2">
        <Icon className="w-3 h-3" />
        {label}
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
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Détails utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Nom complet</p>
              <p className="font-medium text-sm md:text-base">{user.full_name || 'Non défini'}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-sm md:text-base break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Organisation</p>
              <p className="font-medium text-sm md:text-base">{user.organization || 'Non spécifiée'}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Rôle</p>
              <div className="mt-1">
                {getRoleBadge(user.role)}
              </div>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Statut</p>
              <div className="mt-1">
                <Badge variant={user.is_blocked ? 'destructive' : 'secondary'}>
                  {user.is_blocked ? 'Bloqué' : 'Actif'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Avertissements</p>
              <div className="mt-1">
                <Badge variant={user.fraud_strikes > 0 ? 'destructive' : 'secondary'}>
                  {user.fraud_strikes} strikes
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Inscription</p>
              <p className="font-medium text-sm md:text-base">
                {new Date(user.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <UserStatsDisplay stats={statistics} loading={statsLoading} />

          {user.is_blocked && user.blocked_reason && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 text-sm md:text-base text-destructive">Raison du blocage</h4>
              <p className="text-xs md:text-sm text-muted-foreground">{user.blocked_reason}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Bloqué le: {new Date(user.blocked_at!).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {user.is_blocked ? (
              <Button 
                onClick={handleUnblock}
                className="w-full sm:flex-1 gap-2 h-8 text-xs"
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
                userRole={user.role}
                onBlock={onBlock}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
