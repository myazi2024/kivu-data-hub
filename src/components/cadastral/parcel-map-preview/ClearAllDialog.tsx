import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

interface ClearAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ClearAllDialog = ({ open, onOpenChange, onConfirm }: ClearAllDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[180px] rounded-xl p-2 shadow-2xl z-[99999] bg-background border border-border">
        <AlertDialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xs font-semibold">
              Supprimer tout ?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-[10px] text-muted-foreground leading-tight">
            Supprime toutes les bornes et données associées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-1 p-1.5 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-[9px] text-muted-foreground flex items-start gap-1">
            <Info className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-primary" />
            <span>Utilisez <Trash2 className="inline h-2 w-2" /> pour une seule borne.</span>
          </p>
        </div>
        <AlertDialogFooter className="mt-1.5 gap-1 sm:gap-1">
          <AlertDialogCancel className="h-6 px-2 rounded-lg text-[10px]">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-6 px-2 rounded-lg text-[10px] bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
