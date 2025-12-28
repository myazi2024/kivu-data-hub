import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  ArrowRightLeft, 
  Landmark, 
  XCircle, 
  Building2, 
  FileCheck, 
  Receipt, 
  FileText 
} from 'lucide-react';
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
            className={`flex-1 h-9 text-xs rounded-xl font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all duration-200 ${className}`}
          >
            <span>Actions</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="top"
          align="end" 
          sideOffset={8}
          className="w-72 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-2xl z-[1100] p-2"
        >
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Propriété & Transfert
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => setShowMutationDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Demander Mutation</div>
              <div className="text-xs text-muted-foreground mt-0.5">Transfert de propriété</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 bg-border/50" />
          
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Hypothèques
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20 transition-colors">
              <Landmark className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Ajouter Hypothèque</div>
              <div className="text-xs text-muted-foreground mt-0.5">Ajouter une hypothèque active</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowMortgageCancellationDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 group-hover:bg-red-500/20 transition-colors">
              <XCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Retirer Hypothèque</div>
              <div className="text-xs text-muted-foreground mt-0.5">Demander la radiation</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 bg-border/50" />
          
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Permis de construire
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => setShowBuildingPermitDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600 group-hover:bg-green-500/20 transition-colors">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Ajouter Permis</div>
              <div className="text-xs text-muted-foreground mt-0.5">Nouvelle construction</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRegularizationPermitDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Permis Régularisation</div>
              <div className="text-xs text-muted-foreground mt-0.5">Construction existante sans permis</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 bg-border/50" />
          
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Taxes & Demandes
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => setShowTaxDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20 transition-colors">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Ajouter Taxe foncière</div>
              <div className="text-xs text-muted-foreground mt-0.5">Signaler paiement effectué</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowPermitRequestDialog(true)}
            className="cursor-pointer rounded-xl p-3 flex items-start gap-3 hover:bg-primary/10 focus:bg-primary/10 transition-colors duration-150 group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20 transition-colors">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">Obtenir un permis</div>
              <div className="text-xs text-muted-foreground mt-0.5">Demande officielle de permis</div>
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
