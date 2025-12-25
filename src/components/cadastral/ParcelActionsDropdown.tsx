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
          className="w-56 rounded-xl bg-popover border shadow-lg z-[1100]"
        >
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Demander Mutation</div>
              <div className="text-xs text-muted-foreground">Transfert de propriété</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Ajouter Hypothèque</div>
              <div className="text-xs text-muted-foreground">Ajouter une Hypothèque active sur ce bien</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Ajouter Permis</div>
              <div className="text-xs text-muted-foreground">Pour une nouvelle construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Ajouter P. Régularisation</div>
              <div className="text-xs text-muted-foreground">Permis pour regulariser une construction existante construite sans permis de construire.</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Ajouter Taxe foncière</div>
              <div className="text-xs text-muted-foreground">Ajouter une taxe foncière pour signaler qu'elle a été payé</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowPermitRequestDialog(true)}
            className="cursor-pointer rounded-lg"
          >
            <div>
              <div className="font-medium text-sm">Obtenir un permis</div>
              <div className="text-xs text-muted-foreground">Introduire une demande d'un Permis de construire ou de régularisation.</div>
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
