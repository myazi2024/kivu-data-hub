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
import { ChevronDown, Sparkles, Clock, Beaker, Tag } from 'lucide-react';
import { useParcelActionsConfig, ParcelAction } from '@/hooks/useParcelActionsConfig';
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

// Create a reusable haptic sound feedback utility with proper AudioContext handling
const triggerHapticFeedback = async () => {
  // Haptic vibration first (more reliable on mobile)
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    
    // Resume AudioContext if suspended (required for mobile browsers)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    // Quick fade out for smoother sound
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.04);
    
    // Clean up after sound finishes
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (e) {
    // Silent fallback - vibration already triggered above
    console.log('Audio feedback not available');
  }
};

// Badge rendering component
const ActionBadge: React.FC<{ badge: ParcelAction['badge'] }> = ({ badge }) => {
  if (badge.type === 'none') return null;

  const getBadgeConfig = () => {
    switch (badge.type) {
      case 'nouveau':
        return { 
          label: 'nouveau', 
          className: 'bg-seloger-red text-white',
          icon: <Sparkles className="h-2.5 w-2.5" />
        };
      case 'bientot':
        return { 
          label: 'Bientôt', 
          className: 'bg-amber-500 text-white',
          icon: <Clock className="h-2.5 w-2.5" />
        };
      case 'beta':
        return { 
          label: 'Bêta', 
          className: 'bg-blue-500 text-white',
          icon: <Beaker className="h-2.5 w-2.5" />
        };
      case 'promo':
        return { 
          label: 'Promo', 
          className: 'bg-green-500 text-white',
          icon: <Tag className="h-2.5 w-2.5" />
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  return (
    <Badge 
      className={`h-4 px-1.5 text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5 ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

const ParcelActionsDropdown: React.FC<ParcelActionsDropdownProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  className
}) => {
  const { actions, loading } = useParcelActionsConfig();
  
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
      triggerHapticFeedback();
    }
    lastFocusedIndexRef.current = index;
  }, []);

  const resetFocusTracking = () => {
    lastFocusedIndexRef.current = null;
  };

  // Map action keys to their handlers
  const getActionHandler = (key: string) => {
    const handlers: Record<string, () => void> = {
      'expertise': () => setShowExpertiseDialog(true),
      'mutation': () => setShowMutationDialog(true),
      'mortgage_add': () => setShowMortgageDialog(true),
      'mortgage_remove': () => setShowMortgageCancellationDialog(true),
      'permit_add': () => setShowBuildingPermitDialog(true),
      'permit_regularization': () => setShowRegularizationPermitDialog(true),
      'tax': () => setShowTaxDialog(true),
      'permit_request': () => setShowPermitRequestDialog(true),
      'subdivision': () => setShowSubdivisionDialog(true),
    };
    return handlers[key];
  };

  // Get sorted visible actions
  const visibleActions = actions
    .filter(a => a.isVisible)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Group actions by category for separators
  const groupedActions: (ParcelAction | 'separator')[] = [];
  let lastCategory = '';
  
  visibleActions.forEach((action, index) => {
    if (index > 0 && action.category !== lastCategory) {
      groupedActions.push('separator');
    }
    groupedActions.push(action);
    lastCategory = action.category;
  });

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
              {groupedActions.map((item, index) => {
                if (item === 'separator') {
                  return <DropdownMenuSeparator key={`sep-${index}`} className="my-1" />;
                }

                const action = item;
                const handler = getActionHandler(action.key);

                return (
                  <DropdownMenuItem 
                    key={action.id}
                    onClick={handler}
                    onFocus={() => handleMenuItemFocus(index)}
                    disabled={!action.isActive}
                    className={`cursor-pointer rounded-lg ${!action.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{action.label}</span>
                        <ActionBadge badge={action.badge} />
                      </div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
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
