import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Gift, DollarSign, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface CCCCode {
  id: string;
  code: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  invalidation_reason: string | null;
  contribution_id: string;
}

interface UserCCCCodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: CCCCode | null;
}

export const UserCCCCodeDetailsDialog: React.FC<UserCCCCodeDetailsDialogProps> = ({
  open,
  onOpenChange,
  code
}) => {
  if (!code) return null;

  const isExpired = new Date(code.expires_at) < new Date();
  const daysUntilExpiry = Math.ceil((new Date(code.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Détails du code CCC
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Code */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Code</p>
            <p className="text-2xl font-mono font-bold">{code.code}</p>
          </div>

          {/* Status alerts */}
          {!code.is_valid && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">Code invalide</p>
              </div>
              {code.invalidation_reason && (
                <p className="text-sm text-muted-foreground">{code.invalidation_reason}</p>
              )}
            </div>
          )}

          {code.is_used && (
            <div className="bg-muted border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Code déjà utilisé</p>
              </div>
              {code.used_at && (
                <p className="text-xs text-muted-foreground">
                  Utilisé le {new Date(code.used_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {!code.is_used && code.is_valid && isExpired && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">Code expiré</p>
              </div>
            </div>
          )}

          {!code.is_used && code.is_valid && !isExpired && daysUntilExpiry <= 7 && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Valeur
              </label>
              <p className="text-lg font-bold text-green-600">${Number(code.value_usd).toFixed(2)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Numéro de parcelle</label>
              <p className="text-base font-medium">{code.parcel_number}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Date de création
              </label>
              <p className="text-base">{new Date(code.created_at).toLocaleDateString('fr-FR')}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Date d'expiration
              </label>
              <p className="text-base">{new Date(code.expires_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Comment utiliser ce code ?</strong><br />
              Lors de votre prochaine recherche cadastrale, entrez ce code pour bénéficier d'une réduction de ${Number(code.value_usd).toFixed(2)} sur le montant total.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
