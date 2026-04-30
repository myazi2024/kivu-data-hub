import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useExpertiseExperts } from '@/hooks/useExpertiseExperts';
import type { ExpertiseRequest } from '@/types/expertise';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: ExpertiseRequest | null;
  onAssigned: () => void;
}

export const ExpertiseAssignDialog: React.FC<Props> = ({ open, onOpenChange, request, onAssigned }) => {
  const { data: experts = [], isLoading } = useExpertiseExperts(open);
  const [expertId, setExpertId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleAssign = async () => {
    if (!request || !expertId) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc('assign_expertise_request', {
        p_request_id: request.id,
        p_expert_id: expertId,
      });
      if (error) throw error;
      toast.success('Expert assigné — demande au statut "assigné"');
      onOpenChange(false);
      setExpertId('');
      onAssigned();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'assignation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assigner un expert
          </DialogTitle>
          <DialogDescription>
            {request?.reference_number} — Parcelle {request?.parcel_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>Expert immobilier</Label>
          <Select value={expertId} onValueChange={setExpertId}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Chargement…' : 'Sélectionnez un expert'} />
            </SelectTrigger>
            <SelectContent>
              {experts.map((e) => (
                <SelectItem key={e.user_id} value={e.user_id}>
                  {e.full_name}{e.email ? ` — ${e.email}` : ''}
                </SelectItem>
              ))}
              {!isLoading && experts.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Aucun utilisateur avec le rôle « expert immobilier ».
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAssign} disabled={!expertId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertiseAssignDialog;
