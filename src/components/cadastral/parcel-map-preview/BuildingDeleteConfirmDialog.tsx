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

interface BuildingDeleteConfirmDialogProps {
  pendingBuildingDeletion: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const BuildingDeleteConfirmDialog = ({
  pendingBuildingDeletion,
  onOpenChange,
  onConfirm,
}: BuildingDeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={!!pendingBuildingDeletion} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette construction ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le tracé sera retiré de la carte. Les autres constructions et la hauteur saisie dans le bloc Construction sont conservées. Vous pourrez annuler juste après la suppression.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
