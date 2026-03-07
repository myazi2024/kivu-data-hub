import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronUp, ChevronDown, Sparkles, Clock, Beaker, Tag } from 'lucide-react';
import { useParcelActionsConfig, ParcelAction } from '@/hooks/useParcelActionsConfig';
import MutationRequestDialog from './MutationRequestDialog';
import MortgageManagementDialog from './MortgageManagementDialog';
import BuildingPermitManagementDialog from './BuildingPermitManagementDialog';
import TaxFormDialog from './TaxFormDialog';
import TaxManagementDialog from './TaxManagementDialog';
import BuildingPermitRequestDialog from './BuildingPermitRequestDialog';
import SubdivisionRequestDialog from './SubdivisionRequestDialog';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';
import LandDisputeManagementDialog from './LandDisputeManagementDialog';

interface ParcelActionsDropdownProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  className?: string;
  /** When true, renders an expandable inline panel instead of a button+dropdown */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

// Haptic feedback utility
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
          label: badge.label || 'nouveau', 
          className: 'bg-destructive text-destructive-foreground',
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
  className,
  expanded = false,
  onToggleExpand
}) => {
  const { actions, loading } = useParcelActionsConfig();
  
  const [showMutationDialog, setShowMutationDialog] = useState(false);
  const [showMortgageManagementDialog, setShowMortgageManagementDialog] = useState(false);
  const [showBuildingPermitManagementDialog, setShowBuildingPermitManagementDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showPermitRequestDialog, setShowPermitRequestDialog] = useState(false);
  const [showSubdivisionDialog, setShowSubdivisionDialog] = useState(false);
  const [showExpertiseDialog, setShowExpertiseDialog] = useState(false);
  const [showLandDisputeDialog, setShowLandDisputeDialog] = useState(false);

  // Track last focused item for haptic feedback
  const lastFocusedIndexRef = useRef<number | null>(null);

  const handleMenuItemFocus = useCallback((index: number) => {
    if (lastFocusedIndexRef.current !== null && lastFocusedIndexRef.current !== index) {
      triggerHapticFeedback();
    }
    lastFocusedIndexRef.current = index;
  }, []);

  // Map action keys to their handlers
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
      'land_dispute': () => setShowLandDisputeDialog(true),
    };
    return handlers[key];
  };

  // Get sorted visible actions
  const visibleActions = actions
    .filter(a => a.isVisible && a.key !== 'permit_regularization')
    .sort((a, b) => a.displayOrder - b.displayOrder);

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

  const handleActionClick = (action: ParcelAction) => {
    const handler = getActionHandler(action.key);
    if (handler) {
      triggerHapticFeedback();
      handler();
      // Collapse after selecting
      onToggleExpand?.();
    }
  };

  return (
    <>
      {/* Toggle button */}
      <Button
        variant="secondary"
        size="sm"
        className={`flex-1 h-9 text-xs rounded-xl font-medium gap-1 ${className}`}
        onClick={onToggleExpand}
      >
        Actions
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>

      {/* Expandable services panel — rendered separately via the parent */}
      {/* The actual panel is rendered by ParcelActionsPanel below */}

      {/* All dialogs */}
      <MutationRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMutationDialog}
        onOpenChange={setShowMutationDialog}
      />
      <MortgageManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showMortgageManagementDialog}
        onOpenChange={setShowMortgageManagementDialog}
      />
      <BuildingPermitManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={showBuildingPermitManagementDialog}
        onOpenChange={setShowBuildingPermitManagementDialog}
      />
      <TaxManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showTaxDialog}
        onOpenChange={setShowTaxDialog}
        onOpenServiceCatalog={() => {
          setShowTaxDialog(false);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog'));
          }, 150);
        }}
      />
      <BuildingPermitRequestDialog
        parcelNumber={parcelNumber}
        open={showPermitRequestDialog}
        onOpenChange={setShowPermitRequestDialog}
        hasExistingConstruction={false}
      />
      <SubdivisionRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showSubdivisionDialog}
        onOpenChange={setShowSubdivisionDialog}
      />
      <RealEstateExpertiseRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showExpertiseDialog}
        onOpenChange={setShowExpertiseDialog}
      />
      <LandDisputeManagementDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showLandDisputeDialog}
        onOpenChange={setShowLandDisputeDialog}
        onOpenServiceCatalog={() => {
          setShowLandDisputeDialog(false);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog'));
          }, 150);
        }}
      />

      {/* Inline expandable panel */}
      {expanded && (
        <div className="absolute bottom-full left-0 right-0 mb-0 z-[1050]">
          <div className="bg-background/95 backdrop-blur-md rounded-t-2xl border border-b-0 border-border/50 shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Services disponibles</p>
            </div>
            <ScrollArea className="max-h-[240px] sm:max-h-[300px]">
              <div className="p-1.5 space-y-0.5">
                {groupedActions.map((item, index) => {
                  if (item === 'separator') {
                    return <Separator key={`sep-${index}`} className="my-1" />;
                  }

                  const action = item;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      onFocus={() => handleMenuItemFocus(index)}
                      disabled={!action.isActive}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors
                        ${action.isActive 
                          ? 'hover:bg-accent/50 active:bg-accent cursor-pointer' 
                          : 'opacity-40 cursor-not-allowed'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{getDisplayLabel(action)}</span>
                          <ActionBadge badge={action.badge} />
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{getDisplayDescription(action)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
};

export default ParcelActionsDropdown;
