import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';

interface BlockUserDialogProps {
  userId: string;
  userName: string;
  userRole: string;
  onBlock: (userId: string, reason: string, userRole: string) => Promise<boolean>;
}

export const BlockUserDialog: React.FC<BlockUserDialogProps> = ({ 
  userId, 
  userName, 
  userRole,
  onBlock 
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast.error('Veuillez indiquer une raison pour le blocage');
      return;
    }

    setIsBlocking(true);
    const success = await onBlock(userId, reason, userRole);
    setIsBlocking(false);

    if (success) {
      setOpen(false);
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:flex-1 gap-2 h-8 text-xs">
          <Ban className="w-3 h-3" />
          Bloquer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Bloquer l'utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de bloquer <strong>{userName}</strong>. 
            Cette action empêchera l'utilisateur d'accéder à la plateforme.
          </p>
          <Input
            placeholder="Raison du blocage..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isBlocking) {
                handleBlock();
              }
            }}
            className="text-sm"
            disabled={isBlocking}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isBlocking}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              className="flex-1"
              disabled={isBlocking}
            >
              {isBlocking ? 'Blocage...' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
