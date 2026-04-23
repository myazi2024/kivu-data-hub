import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, BarChart3 } from 'lucide-react';

interface Props {
  activeMobilePanel: 'map' | 'analytics';
  setActiveMobilePanel: (p: 'map' | 'analytics') => void;
  isDragging: boolean;
  isMobile: boolean;
  dragProgress: number;
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
}) => {
  const onAnalyticsPanel = activeMobilePanel === 'analytics';
  const progressTowardNext = isMobile && isDragging
    ? Math.max(0, Math.min(1, onAnalyticsPanel ? dragProgress : -dragProgress))
    : 0;
  const activeBarW = 16 - progressTowardNext * 10;
  const inactiveBarW = 6 + progressTowardNext * 10;

  return (
    <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Vue active">
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
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2.5 py-1.5 shadow-lg">
          <Button
            size="sm"
            variant={!onAnalyticsPanel ? 'default' : 'outline'}
            onClick={() => setActiveMobilePanel('map')}
            aria-label="Carte & Données"
            aria-live="polite"
            className="rounded-full h-7 px-3 text-[10px] gap-1"
          >
            <MapPin className="w-3 h-3" />
            Carte
          </Button>
          <Button
            size="sm"
            variant={onAnalyticsPanel ? 'default' : 'outline'}
            onClick={() => setActiveMobilePanel('analytics')}
            aria-label="Analytics"
            aria-live="polite"
            className="rounded-full h-7 px-3 text-[10px] gap-1"
          >
            <BarChart3 className="w-3 h-3" />
            Analytics
          </Button>
        </div>
      </div>
    </div>
  );
};
