import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, Ban, CheckCircle, Shield } from 'lucide-react';
import { useBulkUserActions } from '@/hooks/useBulkUserActions';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BulkActionsDialogProps {
  selectedUsers: string[];
  onComplete: () => void;
}

type ActionType = 'block' | 'unblock' | 'add_role';

export const BulkActionsDialog: React.FC<BulkActionsDialogProps> = ({
  selectedUsers,
  onComplete,
}) => {
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('block');
  const [blockReason, setBlockReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('partner');
  const { processing, progress, bulkBlockUsers, bulkUnblockUsers, bulkAddRole } = useBulkUserActions();

  const handleExecute = async () => {
    let result = { success: 0, failed: 0 };

    if (actionType === 'block') {
      if (!blockReason.trim()) return;
      result = await bulkBlockUsers(selectedUsers, blockReason);
    } else if (actionType === 'unblock') {
      result = await bulkUnblockUsers(selectedUsers);
    } else if (actionType === 'add_role') {
      result = await bulkAddRole(selectedUsers, selectedRole);
    }

    if (result.success > 0) {
      setOpen(false);
      setBlockReason('');
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-7 text-xs" disabled={selectedUsers.length === 0}>
          <Users className="w-3 h-3" />
          Actions en masse ({selectedUsers.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Actions en masse</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted p-2 rounded-lg">
            <p className="text-xs font-medium mb-0.5">Utilisateurs sélectionnés</p>
            <Badge variant="secondary" className="text-xs">{selectedUsers.length} utilisateur(s)</Badge>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Type d'action</label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Bloquer les utilisateurs
                  </div>
                </SelectItem>
                <SelectItem value="unblock">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Débloquer les utilisateurs
                  </div>
                </SelectItem>
                <SelectItem value="add_role">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Ajouter un rôle
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType === 'block' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Raison du blocage</label>
              <Textarea
                placeholder="Expliquez la raison du blocage en masse..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="min-h-[80px] text-xs"
                disabled={processing}
              />
            </div>
          )}

          {actionType === 'add_role' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Rôle à ajouter</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                  <SelectItem value="expert_immobilier">Expert Immobilier</SelectItem>
                  <SelectItem value="mortgage_officer">Agent Hypothécaire</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {processing && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span>Traitement en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              variant={actionType === 'block' ? 'destructive' : 'default'}
              onClick={handleExecute}
              className="flex-1"
              disabled={processing || (actionType === 'block' && !blockReason.trim())}
            >
              {processing ? 'Traitement...' : 'Exécuter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
