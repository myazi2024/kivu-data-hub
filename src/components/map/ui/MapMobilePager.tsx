import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ShareButton from '@/components/shared/ShareButton';
import { MapPin, BarChart3, ChevronDown, ChevronUp, Maximize, Minimize } from 'lucide-react';

interface Props {
  activeMobilePanel: 'map' | 'analytics';
  setActiveMobilePanel: (p: 'map' | 'analytics') => void;
  isDragging: boolean;
  isMobile: boolean;
  dragProgress: number;
  canShare: boolean;
  getMapBlob: () => Promise<Blob>;
  shareTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * Bottom mobile pager: two pagination bars that fluidly stretch with the
 * swipe drag progress, plus pill-shaped Map/Analytics toggle buttons.
 */
export const MapMobilePager: React.FC<Props> = ({
  activeMobilePanel,
  setActiveMobilePanel,
  isDragging,
  isMobile,
  dragProgress,
  canShare,
  getMapBlob,
  shareTitle,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const onAnalyticsPanel = activeMobilePanel === 'analytics';
  const progressTowardNext = isMobile && isDragging
    ? Math.max(0, Math.min(1, onAnalyticsPanel ? dragProgress : -dragProgress))
    : 0;
  const activeBarW = 16 - progressTowardNext * 10;
  const inactiveBarW = 6 + progressTowardNext * 10;

  return (
    <div className="lg:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex flex-col items-center gap-1.5">
        {!collapsed && <div className="flex items-center gap-1.5" role="tablist" aria-label="Vue active">
          <span
            role="tab"
            aria-selected={!onAnalyticsPanel}
            aria-label="Carte"
            className="h-1.5 rounded-full transition-[width,background-color] duration-150"
            style={{
              width: `${onAnalyticsPanel ? inactiveBarW : activeBarW}px`,
              backgroundColor: onAnalyticsPanel
                ? 'hsl(var(--muted-foreground) / 0.4)'
                : 'hsl(var(--primary))',
            }}
          />
          <span
            role="tab"
            aria-selected={onAnalyticsPanel}
            aria-label="Analytics"
            className="h-1.5 rounded-full transition-[width,background-color] duration-150"
            style={{
              width: `${onAnalyticsPanel ? activeBarW : inactiveBarW}px`,
              backgroundColor: !onAnalyticsPanel
                ? 'hsl(var(--muted-foreground) / 0.4)'
                : 'hsl(var(--primary))',
            }}
          />
        </div>}
        <div className="flex items-center justify-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full p-1 shadow-lg">
          {collapsed ? (
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCollapsed(false)}
              aria-label="Afficher les commandes"
              title="Afficher les commandes"
              className="h-11 w-11 rounded-full"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          ) : <>
          {!onAnalyticsPanel && canShare && (
            <ShareButton
              getBlob={getMapBlob}
              title={shareTitle}
              variant="map"
              className="h-11 w-11"
            />
          )}
          <Button
            size="icon"
            variant={!onAnalyticsPanel ? 'default' : 'outline'}
            onClick={() => setActiveMobilePanel('map')}
            aria-label="Carte & Données"
            title="Carte"
            className="h-11 w-11 rounded-full"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={onAnalyticsPanel ? 'default' : 'outline'}
            onClick={() => setActiveMobilePanel('analytics')}
            aria-label="Analytics"
            title="Analytics"
            className="h-11 w-11 rounded-full"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className="h-11 w-11 rounded-full"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed(true)}
            aria-label="Masquer les commandes"
            title="Masquer les commandes"
            className="h-11 w-11 rounded-full"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          </>}
        </div>
      </div>
    </div>
  );
};
