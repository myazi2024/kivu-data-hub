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
import MortgageManagementDialog from './MortgageManagementDialog';
import BuildingPermitManagementDialog from './BuildingPermitManagementDialog';
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
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    
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
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.04);
    
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (e) {
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
  const [showMortgageManagementDialog, setShowMortgageManagementDialog] = useState(false);
  const [showBuildingPermitManagementDialog, setShowBuildingPermitManagementDialog] = useState(false);
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

  // Map action keys to their handlers — both permit keys open the unified dialog
  const getActionHandler = (key: string) => {
    const handlers: Record<string, () => void> = {
      'expertise': () => setShowExpertiseDialog(true),
      'mutation': () => setShowMutationDialog(true),
      'mortgage_management': () => setShowMortgageManagementDialog(true),
      'permit_add': () => setShowBuildingPermitManagementDialog(true),
      'permit_regularization': () => setShowBuildingPermitManagementDialog(true),
      'tax': () => setShowTaxDialog(true),
      'permit_request': () => setShowPermitRequestDialog(true),
      'subdivision': () => setShowSubdivisionDialog(true),
    };
    return handlers[key];
  };

  // Get sorted visible actions, filtering out permit_regularization (merged into permit_add)
  const visibleActions = actions
    .filter(a => a.isVisible && a.key !== 'permit_regularization')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Override the label for permit_add to the unified name
  const getDisplayLabel = (action: ParcelAction) => {
    if (action.key === 'permit_add') return 'Ajouter un permis';
    return action.label;
  };

  const getDisplayDescription = (action: ParcelAction) => {
    if (action.key === 'permit_add') return 'Construire ou régulariser';
    return action.description;
  };

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
                        <span className="font-medium text-sm">{getDisplayLabel(action)}</span>
                        <ActionBadge badge={action.badge} />
                      </div>
                      <div className="text-xs text-muted-foreground">{getDisplayDescription(action)}</div>
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

      {/* Dialog Gestion Hypothèque (unifié) */}
      <MortgageManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMortgageManagementDialog}
        onOpenChange={setShowMortgageManagementDialog}
      />

      {/* Dialog Ajouter un permis (unifié: construire + régularisation) */}
      <BuildingPermitManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showBuildingPermitManagementDialog}
        onOpenChange={setShowBuildingPermitManagementDialog}
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
