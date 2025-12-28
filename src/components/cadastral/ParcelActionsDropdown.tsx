import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import MutationRequestDialog from './MutationRequestDialog';
import MortgageFormDialog from './MortgageFormDialog';
import MortgageCancellationDialog from './MortgageCancellationDialog';
import BuildingPermitFormDialog from './BuildingPermitFormDialog';
import TaxFormDialog from './TaxFormDialog';
import BuildingPermitRequestDialog from './BuildingPermitRequestDialog';

interface ParcelActionsDropdownProps {
  parcelNumber: string;
  parcelId?: string;
  className?: string;
}

const ParcelActionsDropdown: React.FC<ParcelActionsDropdownProps> = ({
  parcelNumber,
  parcelId,
  className
}) => {
  const [showMutationDialog, setShowMutationDialog] = useState(false);
  const [showMortgageDialog, setShowMortgageDialog] = useState(false);
  const [showMortgageCancellationDialog, setShowMortgageCancellationDialog] = useState(false);
  const [showBuildingPermitDialog, setShowBuildingPermitDialog] = useState(false);
  const [showRegularizationPermitDialog, setShowRegularizationPermitDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showPermitRequestDialog, setShowPermitRequestDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className={`flex-1 h-9 text-xs rounded-xl font-medium gap-1 ${className}`}
          >
            Actions
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="top"
          align="end" 
          sideOffset={70}
          className="w-52 p-1.5 rounded-xl bg-transparent border-0 shadow-none z-[1100] space-y-1"
        >
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">Demander Mutation</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">Ajouter Hypothèque</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageCancellationDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">Retirer Hypothèque</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">Ajouter Permis</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">P. Régularisation</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:bg-destructive hover:shadow-md active:scale-95"
          >
            <span className="text-xs font-medium">Ajouter Taxe foncière</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowPermitRequestDialog(true)}
            className="cursor-pointer rounded-lg bg-destructive text-destructive-foreground backdrop-blur-sm px-3 py-2 transition-all duration-200 hover:scale-[1.03] hover:shadow-md active:scale-95 font-semibold"
          >
            <span className="text-xs font-bold">Obtenir un permis</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog Mutation */}
      <MutationRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMutationDialog}
        onOpenChange={setShowMutationDialog}
      />

      {/* Dialog Hypothèque */}
      <MortgageFormDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMortgageDialog}
        onOpenChange={setShowMortgageDialog}
      />

      {/* Dialog Radiation Hypothèque */}
      <MortgageCancellationDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMortgageCancellationDialog}
        onOpenChange={setShowMortgageCancellationDialog}
      />

      {/* Dialog Permis de construire */}
      <BuildingPermitFormDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        permitType="construction"
        open={showBuildingPermitDialog}
        onOpenChange={setShowBuildingPermitDialog}
      />

      {/* Dialog Permis de régularisation */}
      <BuildingPermitFormDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        permitType="regularisation"
        open={showRegularizationPermitDialog}
        onOpenChange={setShowRegularizationPermitDialog}
      />

      {/* Dialog Taxe */}
      <TaxFormDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showTaxDialog}
        onOpenChange={setShowTaxDialog}
      />

      {/* Dialog Demande de permis de construire */}
      <BuildingPermitRequestDialog
        parcelNumber={parcelNumber}
        open={showPermitRequestDialog}
        onOpenChange={setShowPermitRequestDialog}
        hasExistingConstruction={false}
      />
    </>
  );
};

export default ParcelActionsDropdown;
