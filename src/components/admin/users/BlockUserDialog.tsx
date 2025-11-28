import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BlockUserDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  onBlock: (userId: string, reason: string, userRole: string) => Promise<boolean>;
}

export const BlockUserDialog: React.FC<BlockUserDialogProps> = ({ 
  userId, 
  userName, 
  userEmail,
  userRole,
  onBlock 
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const MIN_REASON_LENGTH = 10;
  const MAX_REASON_LENGTH = 500;

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast.error('Veuillez indiquer une raison pour le blocage');
      return;
    }

    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error(`La raison doit contenir au moins ${MIN_REASON_LENGTH} caractères`);
      return;
    }

    if (reason.length > MAX_REASON_LENGTH) {
      toast.error(`La raison ne peut pas dépasser ${MAX_REASON_LENGTH} caractères`);
      return;
    }

    setIsBlocking(true);
    const success = await onBlock(userId, reason.trim(), userRole);

    if (success) {
      // Send notification to the user
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'account',
          title: 'Compte bloqué',
          message: `Votre compte a été bloqué. Raison: ${reason.trim()}`,
          action_url: '/user-dashboard?tab=security'
        });
      } catch (error) {
        console.error('Error sending block notification:', error);
      }

      setOpen(false);
      setReason('');
    }
    
    setIsBlocking(false);
  };

  const characterCount = reason.length;
  const isReasonValid = characterCount >= MIN_REASON_LENGTH && characterCount <= MAX_REASON_LENGTH;

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
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium mb-1">
              Attention: Action critique
            </p>
            <p className="text-xs text-muted-foreground">
              Vous êtes sur le point de bloquer <strong>{userName}</strong> ({userEmail}). 
              Cette action empêchera l'utilisateur d'accéder à la plateforme et une notification lui sera envoyée.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="block-reason" className="text-sm font-medium">
                Raison du blocage
              </label>
              <span className={`text-xs ${
                characterCount < MIN_REASON_LENGTH 
                  ? 'text-muted-foreground' 
                  : isReasonValid 
                  ? 'text-success' 
                  : 'text-destructive'
              }`}>
                {characterCount}/{MAX_REASON_LENGTH}
              </span>
            </div>
            <Textarea
              id="block-reason"
              placeholder="Expliquez en détail la raison du blocage (minimum 10 caractères)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm min-h-[100px]"
              disabled={isBlocking}
              maxLength={MAX_REASON_LENGTH}
            />
            {characterCount > 0 && characterCount < MIN_REASON_LENGTH && (
              <p className="text-xs text-muted-foreground">
                Encore {MIN_REASON_LENGTH - characterCount} caractère(s) minimum requis
              </p>
            )}
          </div>

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
              disabled={isBlocking || !isReasonValid}
            >
              {isBlocking ? 'Blocage...' : 'Confirmer le blocage'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
