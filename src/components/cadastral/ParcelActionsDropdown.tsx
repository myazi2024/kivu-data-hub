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
          className="w-64 p-3 rounded-2xl bg-background/95 backdrop-blur-lg border-2 border-destructive/20 shadow-2xl z-[1100] space-y-2"
        >
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Demander Mutation</div>
              <div className="text-xs opacity-70">Transfert de propriété</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Ajouter Hypothèque</div>
              <div className="text-xs opacity-70">Ajouter une Hypothèque active</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageCancellationDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Retirer Hypothèque</div>
              <div className="text-xs opacity-70">Demander la radiation</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Ajouter Permis</div>
              <div className="text-xs opacity-70">Nouvelle construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Ajouter P. Régularisation</div>
              <div className="text-xs opacity-70">Régulariser une construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:bg-destructive focus:text-destructive-foreground"
          >
            <div>
              <div className="font-semibold text-sm">Ajouter Taxe foncière</div>
              <div className="text-xs opacity-70">Signaler un paiement</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowPermitRequestDialog(true)}
            className="cursor-pointer rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-semibold"
          >
            <div>
              <div className="font-bold text-sm">Obtenir un permis</div>
              <div className="text-xs opacity-80">Introduire une demande</div>
            </div>
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
