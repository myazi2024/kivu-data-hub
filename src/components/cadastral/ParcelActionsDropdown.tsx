import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Beaker, Tag, FileText, ArrowRightLeft, Landmark, ShieldCheck, Calculator, LayoutGrid, AlertTriangle, Award, ScrollText, ChevronDown } from 'lucide-react';
import { useParcelActionsConfig, ParcelAction } from '@/hooks/useParcelActionsConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  onDetailExpandedChange?: (expanded: boolean) => void;
  onRequestLandTitle?: () => void;
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Award, FileText, ArrowRightLeft, Landmark, ShieldCheck, Calculator, LayoutGrid, AlertTriangle,
};

const DEFAULT_ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  expertise: Award,
  mutation: ArrowRightLeft,
  mortgage_management: Landmark,
  land_title_request: ScrollText,
  permit_add: ShieldCheck,
  tax: Calculator,
  permit_request: FileText,
  subdivision: LayoutGrid,
  land_dispute: AlertTriangle,
};

const ActionIcon: React.FC<{ iconName?: string; actionKey: string; className?: string }> = ({ iconName, actionKey, className }) => {
  const Icon = (iconName && ICON_MAP[iconName]) || DEFAULT_ACTION_ICONS[actionKey];
  if (!Icon) return null;
  return <Icon className={className ?? 'h-4 w-4'} />;
};

const ParcelActionsDropdown: React.FC<ParcelActionsDropdownProps> = ({
  parcelNumber, parcelId, parcelData, expanded, onCollapse, onDetailExpandedChange, onRequestLandTitle
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
  // Explication détaillée dépliée : une seule à la fois (l'ouverture d'une
  // autre réduit automatiquement la précédente)
  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);
  const toggleDetails = useCallback((actionId: string) => {
    setExpandedDetailId(prev => {
      const next = prev === actionId ? null : actionId;
      onDetailExpandedChange?.(next !== null);
      return next;
    });
  }, [onDetailExpandedChange]);

  useEffect(() => {
    if (expanded) return;
    setExpandedDetailId(null);
    onDetailExpandedChange?.(false);
  }, [expanded, onDetailExpandedChange]);

  const collapseMobileDetails = useCallback(() => {
    if (!expandedDetailId) return;
    setExpandedDetailId(null);
    onDetailExpandedChange?.(false);
  }, [expandedDetailId, onDetailExpandedChange]);

  const lastFocusedIndexRef = useRef<number | null>(null);
  const handleMenuItemFocus = useCallback((index: number) => {
    if (lastFocusedIndexRef.current !== null && lastFocusedIndexRef.current !== index) {
      triggerHapticFeedback();
    }
    lastFocusedIndexRef.current = index;
  }, []);

  // Conditions d'accès alignées sur le formulaire CCC : hypothèque et mutation
  // exigent un titre enregistré ; la demande de titre foncier n'est proposée
  // que s'il n'y en a pas. On ne bloque que si la donnée a bien été chargée.
  const titleKnown = !!parcelData && Object.prototype.hasOwnProperty.call(parcelData, 'property_title_type');
  const hasTitle = titleKnown && !!String(parcelData?.property_title_type ?? '').trim();
  const getBlockedReason = (key: string): string | null => {
    if (!titleKnown) return null;
    if ((key === 'mortgage_management' || key === 'mutation') && !hasTitle) {
      return 'Indisponible : aucun titre de propriété enregistré pour cette parcelle.';
    }
    if (key === 'land_title_request' && hasTitle) {
      return 'Indisponible : un titre de propriété est déjà enregistré pour cette parcelle.';
    }
    return null;
  };

  const getActionHandler = (key: string) => {
    const handlers: Record<string, () => void> = {
      'expertise': () => setShowExpertiseDialog(true),
      'mutation': () => setShowMutationDialog(true),
      'mortgage_management': () => setShowMortgageManagementDialog(true),
      'land_title_request': () => onRequestLandTitle?.(),
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

  const handleActionClick = async (action: ParcelAction) => {
    const handler = getActionHandler(action.key);
    if (!handler || getBlockedReason(action.key)) return;

    // Auth guard
    if (action.requiresAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Connexion requise', {
          description: 'Veuillez vous connecter pour accéder à ce service.',
          action: { label: 'Se connecter', onClick: () => window.location.href = '/auth' },
        });
        return;
      }
    }

    triggerHapticFeedback();
    handler();
    onCollapse();
  };

  return (
    <>
      {/* Expandable services panel */}
      {expanded && (
        <div className="bg-gradient-to-b from-muted/30 to-muted/10">
          <div className="px-3 py-1.5 sm:px-3.5 sm:py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              <p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                <span className="sm:hidden">Actions · {parcelNumber}</span>
                <span className="hidden sm:inline">Services disponibles</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded-full">{visibleActions.length}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCollapse}
                className="h-8 w-8 sm:hidden"
                aria-label="Fermer le menu Actions"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            className="sm:hidden min-h-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-thin px-2.5 pb-2 snap-x snap-mandatory touch-pan-x"
            aria-label="Services disponibles"
            onScroll={collapseMobileDetails}
          >
            <div className="flex h-full w-max gap-2">
              {visibleActions.map((action, index) => {
                const blockedReason = action.isActive ? getBlockedReason(action.key) : null;
                const disabled = !action.isActive || !!blockedReason;
                const detailExpanded = expandedDetailId === action.id;
                return (
                  <article
                    key={action.id}
                    onFocus={() => handleMenuItemFocus(index)}
                    className={`flex h-full w-[15rem] max-w-[calc(100vw-3.5rem)] shrink-0 snap-start flex-col rounded-lg border bg-background px-3 py-2 text-left shadow-sm transition-[border-color,box-shadow] motion-reduce:transition-none ${disabled ? 'border-border/50 opacity-55' : 'border-border/80'}`}
                    aria-label={`${action.label}${blockedReason ? `. ${blockedReason}` : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${disabled ? 'bg-muted text-muted-foreground/50' : 'bg-primary/10 text-primary'}`}>
                        <ActionIcon iconName={action.iconName} actionKey={action.key} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-1 text-xs font-semibold leading-tight text-foreground">{action.label}</h4>
                        <ActionBadge badge={action.badge} />
                      </div>
                    </div>

                    <p className={`mt-1.5 text-[11px] leading-snug text-muted-foreground ${detailExpanded ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {blockedReason ?? action.description}
                    </p>

                    {detailExpanded && action.detailedDescription && (
                      <div
                        className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-muted/25 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground scrollbar-thin touch-pan-y"
                        tabIndex={0}
                        aria-label={`Explication de ${action.label}`}
                      >
                        {action.detailedDescription}
                      </div>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {action.detailedDescription && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={detailExpanded}
                          onClick={() => toggleDetails(action.id)}
                          className="h-11 flex-1 justify-center gap-1 px-2 text-[11px]"
                        >
                          {detailExpanded ? 'Réduire' : 'En savoir plus'}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${detailExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={disabled}
                        onClick={() => handleActionClick(action)}
                        className="h-11 flex-1 px-3 text-xs"
                      >
                        Ouvrir
                      </Button>
                    </div>
                    {disabled && <span className="sr-only">Indisponible</span>}
                  </article>
                );
              })}
            </div>
          </div>
          {/* Hauteur liée au panneau (max 82dvh) moins l'en-tête + rang de boutons
              (~11rem) : les boutons restent toujours visibles sous la liste. */}
          <div className="hidden sm:block overflow-y-auto overscroll-contain sm:max-h-[420px] scrollbar-thin">
            <div className="px-2.5 pb-2 space-y-2">
              {groupedActions.map((item, index) => {
                if (item === 'separator') return null;
                const action = item;
                const blockedReason = action.isActive ? getBlockedReason(action.key) : null;
                const disabled = !action.isActive || !!blockedReason;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    onFocus={() => handleMenuItemFocus(index)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 min-h-12 rounded-2xl border-2 shadow-md text-left transition-all duration-200
                      ${disabled
                        ? 'opacity-40 cursor-not-allowed border-border/50 bg-muted/20'
                        : 'border-primary/40 bg-background hover:border-primary/60 hover:bg-primary/5 hover:shadow-lg active:scale-[0.99] cursor-pointer'}`}
                  >
                    <div className={`shrink-0 p-2 rounded-xl ${disabled ? 'bg-muted text-muted-foreground/50' : 'bg-primary/10 text-primary'}`}>
                      <ActionIcon iconName={action.iconName} actionKey={action.key} className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-foreground leading-tight truncate">{action.label}</h4>
                        <ActionBadge badge={action.badge} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
                      {blockedReason && (
                        <p className="text-[11px] font-medium text-foreground/80 mt-0.5">{blockedReason}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {action.detailedDescription && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-expanded={expandedDetailId === action.id}
                            aria-label={expandedDetailId === action.id ? `Réduire l'explication de ${action.label}` : `En savoir plus sur ${action.label}`}
                            onClick={(e) => { e.stopPropagation(); toggleDetails(action.id); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleDetails(action.id); } }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer select-none rounded focus-visible-ring"
                          >
                            {expandedDetailId === action.id ? 'Réduire' : 'En savoir plus'}
                            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expandedDetailId === action.id ? 'rotate-180' : ''}`} />
                          </span>
                        )}
                        {!disabled && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Ouvrir ${action.label}`}
                            onClick={(e) => { e.stopPropagation(); handleActionClick(action); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleActionClick(action); } }}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer select-none focus-visible-ring"
                          >
                            Ouvrir
                          </span>
                        )}
                      </div>
                      {action.detailedDescription && expandedDetailId === action.id && (
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 pr-1">
                          {action.detailedDescription}
                        </p>
                      )}
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
      <MortgageManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showMortgageManagementDialog} onOpenChange={setShowMortgageManagementDialog} />
      <BuildingPermitManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showBuildingPermitManagementDialog} onOpenChange={setShowBuildingPermitManagementDialog} />
      <TaxManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showTaxDialog} onOpenChange={setShowTaxDialog}
        onOpenServiceCatalog={() => { setShowTaxDialog(false); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog')); }, 150); }}
      />
      <BuildingPermitRequestDialog parcelNumber={parcelNumber} parcelData={parcelData} open={showPermitRequestDialog} onOpenChange={setShowPermitRequestDialog} hasExistingConstruction={!!(parcelData?.construction_type || parcelData?.construction_nature || (Array.isArray(parcelData?.building_outlines) && parcelData.building_outlines.length > 0))} />
      <SubdivisionRequestDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showSubdivisionDialog} onOpenChange={setShowSubdivisionDialog} />
      <RealEstateExpertiseRequestDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showExpertiseDialog} onOpenChange={setShowExpertiseDialog} />
      <LandDisputeManagementDialog parcelNumber={parcelNumber} parcelId={parcelId} parcelData={parcelData} open={showLandDisputeDialog} onOpenChange={setShowLandDisputeDialog}
        onOpenServiceCatalog={() => { setShowLandDisputeDialog(false); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-cadastral-results-dialog')); }, 150); }}
      />
    </>
  );
};

export default ParcelActionsDropdown;
