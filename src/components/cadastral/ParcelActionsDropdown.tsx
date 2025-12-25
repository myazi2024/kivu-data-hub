import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, FileEdit, Building2, FileCheck, Receipt, Landmark } from 'lucide-react';
import MutationRequestDialog from './MutationRequestDialog';
import MortgageFormDialog from './MortgageFormDialog';
import BuildingPermitFormDialog from './BuildingPermitFormDialog';
import TaxFormDialog from './TaxFormDialog';

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
          align="end" 
          sideOffset={5}
          className="w-56 rounded-xl bg-popover border shadow-lg z-[1100]"
        >
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            <FileEdit className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium text-sm">Mutation</div>
              <div className="text-xs text-muted-foreground">Transfert de propriété</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            <Landmark className="h-4 w-4 text-amber-600" />
            <div>
              <div className="font-medium text-sm">Hypothèque</div>
              <div className="text-xs text-muted-foreground">Ajouter une garantie</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            <Building2 className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-medium text-sm">Permis construire</div>
              <div className="text-xs text-muted-foreground">Nouvelle construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            <FileCheck className="h-4 w-4 text-green-600" />
            <div>
              <div className="font-medium text-sm">Régularisation</div>
              <div className="text-xs text-muted-foreground">Construction existante</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            <Receipt className="h-4 w-4 text-purple-600" />
            <div>
              <div className="font-medium text-sm">Taxe foncière</div>
              <div className="text-xs text-muted-foreground">Paiement fiscal</div>
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
    </>
  );
};

export default ParcelActionsDropdown;
