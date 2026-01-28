import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles } from 'lucide-react';
import MutationRequestDialog from './MutationRequestDialog';
import MortgageFormDialog from './MortgageFormDialog';
import MortgageCancellationDialog from './MortgageCancellationDialog';
import BuildingPermitFormDialog from './BuildingPermitFormDialog';
import TaxFormDialog from './TaxFormDialog';
import BuildingPermitRequestDialog from './BuildingPermitRequestDialog';
import SubdivisionRequestDialog from './SubdivisionRequestDialog';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';

interface ParcelActionsDropdownProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  className?: string;
}

// Create a reusable haptic sound feedback utility
const createHapticSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 1200;
  oscillator.type = 'sine';
  gainNode.gain.value = 0.08;
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.03);
  
  // Haptic vibration if available
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

const ParcelActionsDropdown: React.FC<ParcelActionsDropdownProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  className
}) => {
  const [showMutationDialog, setShowMutationDialog] = useState(false);
  const [showMortgageDialog, setShowMortgageDialog] = useState(false);
  const [showMortgageCancellationDialog, setShowMortgageCancellationDialog] = useState(false);
  const [showBuildingPermitDialog, setShowBuildingPermitDialog] = useState(false);
  const [showRegularizationPermitDialog, setShowRegularizationPermitDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showPermitRequestDialog, setShowPermitRequestDialog] = useState(false);
  const [showSubdivisionDialog, setShowSubdivisionDialog] = useState(false);
  const [showExpertiseDialog, setShowExpertiseDialog] = useState(false);

  // Track last focused item for haptic feedback on scroll
  const lastFocusedIndexRef = useRef<number | null>(null);

  const handleMenuItemFocus = useCallback((index: number) => {
    if (lastFocusedIndexRef.current !== null && lastFocusedIndexRef.current !== index) {
      try {
        createHapticSound();
      } catch (e) {
        // Audio context may fail on some browsers, silent fallback
      }
    }
    lastFocusedIndexRef.current = index;
  }, []);

  const resetFocusTracking = () => {
    lastFocusedIndexRef.current = null;
  };

  return (
    <>
      <DropdownMenu onOpenChange={(open) => !open && resetFocusTracking()}>
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
          className="w-56 rounded-xl bg-popover border shadow-lg z-[1100] p-0"
        >
          <ScrollArea className="h-[280px] sm:h-[320px]">
            <div className="p-1">
              {/* Expertise Immobilière - NEW */}
              <DropdownMenuItem 
                onClick={() => setShowExpertiseDialog(true)}
                onFocus={() => handleMenuItemFocus(0)}
                className="cursor-pointer rounded-lg relative"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    Expertise immobilière
                    <Badge 
                      variant="default" 
                      className="h-4 px-1.5 text-[9px] font-bold bg-seloger-red text-white uppercase tracking-wide flex items-center gap-0.5"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      nouveau
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Obtenir un certificat de valeur vénale</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem 
                onClick={() => setShowMutationDialog(true)}
                onFocus={() => handleMenuItemFocus(1)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Demander Mutation</div>
                  <div className="text-xs text-muted-foreground">Transfert de propriété</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem 
                onClick={() => setShowMortgageDialog(true)}
                onFocus={() => handleMenuItemFocus(2)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Ajouter Hypothèque</div>
                  <div className="text-xs text-muted-foreground">Ajouter une Hypothèque active</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setShowMortgageCancellationDialog(true)}
                onFocus={() => handleMenuItemFocus(3)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Retirer Hypothèque</div>
                  <div className="text-xs text-muted-foreground">Demander la radiation</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem 
                onClick={() => setShowBuildingPermitDialog(true)}
                onFocus={() => handleMenuItemFocus(4)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Ajouter Permis</div>
                  <div className="text-xs text-muted-foreground">Pour une nouvelle construction</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setShowRegularizationPermitDialog(true)}
                onFocus={() => handleMenuItemFocus(5)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Ajouter P. Régularisation</div>
                  <div className="text-xs text-muted-foreground">Régulariser une construction existante</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem 
                onClick={() => setShowTaxDialog(true)}
                onFocus={() => handleMenuItemFocus(6)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Ajouter Taxe foncière</div>
                  <div className="text-xs text-muted-foreground">Signaler le paiement d'une taxe</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem 
                onClick={() => setShowPermitRequestDialog(true)}
                onFocus={() => handleMenuItemFocus(7)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Obtenir un permis</div>
                  <div className="text-xs text-muted-foreground">Demande de permis de construire</div>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1" />
              
              <DropdownMenuItem 
                onClick={() => setShowSubdivisionDialog(true)}
                onFocus={() => handleMenuItemFocus(8)}
                className="cursor-pointer rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">Demande de Lotissement</div>
                  <div className="text-xs text-muted-foreground">Diviser cette parcelle en lots</div>
                </div>
              </DropdownMenuItem>
            </div>
          </ScrollArea>
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

      {/* Dialog Demande de lotissement */}
      <SubdivisionRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showSubdivisionDialog}
        onOpenChange={setShowSubdivisionDialog}
      />

      {/* Dialog Expertise immobilière */}
      <RealEstateExpertiseRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showExpertiseDialog}
        onOpenChange={setShowExpertiseDialog}
      />
    </>
  );
};

export default ParcelActionsDropdown;
