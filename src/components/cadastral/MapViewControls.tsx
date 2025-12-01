import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Grid3x3, List, SortAsc, Download, Share2, Maximize } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MapViewControlsProps {
  viewMode: 'map' | 'list' | 'grid';
  onViewModeChange: (mode: 'map' | 'list' | 'grid') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onExport: () => void;
  onShare: () => void;
  onFullscreen: () => void;
  resultsCount: number;
  isCompact?: boolean;
}

const MapViewControls: React.FC<MapViewControlsProps> = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  onExport,
  onShare,
  onFullscreen,
  resultsCount,
  isCompact = false
}) => {
  const padding = isCompact ? 'p-1.5' : 'p-3';
  const textSize = isCompact ? 'text-[10px]' : 'text-xs';
  const buttonHeight = isCompact ? 'h-7' : 'h-8';
  const iconSize = isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <Card className={`${padding} bg-white/95 backdrop-blur-sm shadow-lg`}>
      <div className="flex items-center justify-between gap-1.5">
        {/* Vue */}
        <div className="flex gap-0.5">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('map')}
            className={`${buttonHeight} px-2`}
          >
            <Grid3x3 className={iconSize} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className={`${buttonHeight} px-2`}
          >
            <List className={iconSize} />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className={`${buttonHeight} px-2`}
          >
            <Grid3x3 className={iconSize} />
          </Button>
        </div>

        {/* Tri */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className={`${buttonHeight} ${textSize} w-24`}>
            <SortAsc className={`${iconSize} mr-1`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parcel_number">N° Parcelle</SelectItem>
            <SelectItem value="area_sqm">Surface</SelectItem>
            <SelectItem value="owner_name">Propriétaire</SelectItem>
            <SelectItem value="created_at">Date</SelectItem>
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className={`${buttonHeight} px-2`}
            title="Exporter en CSV"
          >
            <Download className={iconSize} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className={`${buttonHeight} px-2`}
            title="Partager"
          >
            <Share2 className={iconSize} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            className={`${buttonHeight} px-2`}
            title="Plein écran"
          >
            <Maximize className={iconSize} />
          </Button>
        </div>

        {/* Compteur de résultats */}
        <div className={`${textSize} text-muted-foreground font-semibold`}>
          {resultsCount} résultat{resultsCount > 1 ? 's' : ''}
        </div>
      </div>
    </Card>
  );
};

export default MapViewControls;
