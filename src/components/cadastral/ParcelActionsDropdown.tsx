import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, FileEdit, Building2, FileCheck, Receipt, Landmark, FilePlus } from 'lucide-react';
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
          className="w-72 rounded-2xl bg-popover border border-border/50 shadow-xl z-[1100] p-2"
        >
          {/* Header du dropdown */}
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions disponibles</p>
          </div>
          
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-primary/5 focus:bg-primary/5 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileEdit className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Mutation</div>
              <div className="text-xs text-muted-foreground">Transfert de propriété</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1.5" />
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 focus:bg-amber-50 dark:focus:bg-amber-950/30 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Hypothèque</div>
              <div className="text-xs text-muted-foreground">Ajouter une garantie</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1.5" />
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 focus:bg-blue-50 dark:focus:bg-blue-950/30 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Permis construire</div>
              <div className="text-xs text-muted-foreground">Nouvelle construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-green-50 dark:hover:bg-green-950/30 focus:bg-green-50 dark:focus:bg-green-950/30 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Régularisation</div>
              <div className="text-xs text-muted-foreground">Construction existante</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1.5" />
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-purple-50 dark:hover:bg-purple-950/30 focus:bg-purple-50 dark:focus:bg-purple-950/30 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Taxe foncière</div>
              <div className="text-xs text-muted-foreground">Paiement fiscal</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1.5" />
          
          <DropdownMenuItem 
            onClick={() => setShowPermitRequestDialog(true)}
            className="flex items-center gap-3 cursor-pointer rounded-xl p-3 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 focus:bg-cyan-50 dark:focus:bg-cyan-950/30 transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
              <FilePlus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Demande permis</div>
              <div className="text-xs text-muted-foreground">Permis de construire ou régularisation</div>
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
