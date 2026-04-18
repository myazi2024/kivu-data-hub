import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parcelNumber?: string;
  deleting: boolean;
  onConfirm: () => void;
}

export function UserContributionDeleteDialog({ open, onOpenChange, parcelNumber, deleting, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[340px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Supprimer cette contribution ?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Vous êtes sur le point de supprimer la contribution pour la parcelle{' '}
            <span className="font-medium text-foreground">{parcelNumber}</span>. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-9 text-sm rounded-xl" disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-9 text-sm rounded-xl bg-destructive hover:bg-destructive/90"
            disabled={deleting}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
