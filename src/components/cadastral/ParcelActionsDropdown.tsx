import React, { useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Clock, Beaker, Tag } from 'lucide-react';
import { useParcelActionsConfig, ParcelAction } from '@/hooks/useParcelActionsConfig';
import MutationRequestDialog from './MutationRequestDialog';
import MortgageManagementDialog from './MortgageManagementDialog';
import BuildingPermitManagementDialog from './BuildingPermitManagementDialog';
import TaxManagementDialog from './TaxManagementDialog';
import BuildingPermitRequestDialog from './BuildingPermitRequestDialog';
import SubdivisionRequestDialog from './SubdivisionRequestDialog';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';
import LandDisputeManagementDialog from './LandDisputeManagementDialog';

interface ParcelActionsDropdownProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  expanded: boolean;
  onCollapse: () => void;
}

// Haptic feedback utility
const triggerHapticFeedback = async () => {
  if (navigator.vibrate) navigator.vibrate(15);
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') await audioContext.resume();
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
    oscillator.onended = () => audioContext.close();
  } catch (e) { /* Audio not available */ }
};

const ActionBadge: React.FC<{ badge: ParcelAction['badge'] }> = ({ badge }) => {
  if (badge.type === 'none') return null;
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode } | null> = {
    nouveau: { label: badge.label || 'nouveau', className: 'bg-destructive text-destructive-foreground', icon: <Sparkles className="h-2.5 w-2.5" /> },
    bientot: { label: 'Bientôt', className: 'bg-amber-500 text-white', icon: <Clock className="h-2.5 w-2.5" /> },
    beta: { label: 'Bêta', className: 'bg-blue-500 text-white', icon: <Beaker className="h-2.5 w-2.5" /> },
    promo: { label: 'Promo', className: 'bg-green-500 text-white', icon: <Tag className="h-2.5 w-2.5" /> },
  };
  const config = configs[badge.type] || null;
  if (!config) return null;
  return (
    <Badge className={`h-4 px-1.5 text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5 ${config.className}`}>
      {config.icon}{config.label}
    </Badge>
  );
};

const ParcelActionsDropdown: React.FC<ParcelActionsDropdownProps> = ({
  parcelNumber, parcelId, parcelData, expanded, onCollapse
}) => {
  const { actions } = useParcelActionsConfig();
  const [showMutationDialog, setShowMutationDialog] = useState(false);
  const [showMortgageManagementDialog, setShowMortgageManagementDialog] = useState(false);
  const [showBuildingPermitManagementDialog, setShowBuildingPermitManagementDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showPermitRequestDialog, setShowPermitRequestDialog] = useState(false);
  const [showSubdivisionDialog, setShowSubdivisionDialog] = useState(false);
  const [showExpertiseDialog, setShowExpertiseDialog] = useState(false);
  const [showLandDisputeDialog, setShowLandDisputeDialog] = useState(false);

  const lastFocusedIndexRef = useRef<number | null>(null);
  const handleMenuItemFocus = useCallback((index: number) => {
    if (lastFocusedIndexRef.current !== null && lastFocusedIndexRef.current !== index) {
      triggerHapticFeedback();
    }
    lastFocusedIndexRef.current = index;
  }, []);

  const getActionHandler = (key: string) => {
    const handlers: Record<string, () => void> = {
      'expertise': () => setShowExpertiseDialog(true),
      'mutation': () => setShowMutationDialog(true),
      'mortgage_management': () => setShowMortgageManagementDialog(true),
      'permit_add': () => setShowBuildingPermitManagementDialog(true),
      'tax': () => setShowTaxDialog(true),
      'permit_request': () => setShowPermitRequestDialog(true),
      'subdivision': () => setShowSubdivisionDialog(true),
      'land_dispute': () => setShowLandDisputeDialog(true),
    };
    return handlers[key];
  };

  // No need to filter permit_regularization — already removed from config
  const visibleActions = actions
    .filter(a => a.isVisible)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const groupedActions: (ParcelAction | 'separator')[] = [];
  let lastCategory = '';
  visibleActions.forEach((action, index) => {
    if (index > 0 && action.category !== lastCategory) groupedActions.push('separator');
    groupedActions.push(action);
    lastCategory = action.category;
  });

  const handleActionClick = (action: ParcelAction) => {
    const handler = getActionHandler(action.key);
    if (handler) {
      triggerHapticFeedback();
      handler();
      onCollapse();
    }
  };

  return (
    <>
      {/* Expandable services panel */}
      {expanded && (
        <div className="bg-gradient-to-b from-muted/30 to-muted/10">
          <div className="px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              <p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">Services disponibles</p>
            </div>
            <span className="text-[9px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded-full">{visibleActions.length}</span>
          </div>
          <div className="overflow-y-auto max-h-[200px] sm:max-h-[260px] scrollbar-thin">
            <div className="px-2.5 pb-2 space-y-0.5">
              {groupedActions.map((item, index) => {
                if (item === 'separator') return <Separator key={`sep-${index}`} className="my-1 opacity-30" />;
                const action = item;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    onFocus={() => handleMenuItemFocus(index)}
                    disabled={!action.isActive}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150
                      ${action.isActive ? 'hover:bg-primary/5 hover:shadow-sm active:scale-[0.98] cursor-pointer' : 'opacity-35 cursor-not-allowed'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[13px] text-foreground truncate">{action.label}</span>
                        <ActionBadge badge={action.badge} />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{action.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Visual separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        </div>
      )}

      {/* All dialogs */}
      <MutationRequestDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showMutationDialog} onOpenChange={setShowMutationDialog} />
      <MortgageManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} open={showMortgageManagementDialog} onOpenChange={setShowMortgageManagementDialog} />
      <BuildingPermitManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} open={showBuildingPermitManagementDialog} onOpenChange={setShowBuildingPermitManagementDialog} />
      <TaxManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showTaxDialog} onOpenChange={setShowTaxDialog}
        onOpenServiceCatalog={() => { setShowTaxDialog(false); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog')); }, 150); }}
      />
      <BuildingPermitRequestDialog parcelNumber={parcelNumber} open={showPermitRequestDialog} onOpenChange={setShowPermitRequestDialog} hasExistingConstruction={false} />
      <SubdivisionRequestDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showSubdivisionDialog} onOpenChange={setShowSubdivisionDialog} />
      <RealEstateExpertiseRequestDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showExpertiseDialog} onOpenChange={setShowExpertiseDialog} />
      <LandDisputeManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showLandDisputeDialog} onOpenChange={setShowLandDisputeDialog}
        onOpenServiceCatalog={() => { setShowLandDisputeDialog(false); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog')); }, 150); }}
      />
    </>
  );
};

export default ParcelActionsDropdown;
