import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid, List, MapPin, ArrowUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParcelResult {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type: string;
  property_title_type: string;
  latitude: number;
  longitude: number;
}

interface CadastralSearchResultsProps {
  results: ParcelResult[];
  onSelectParcel: (parcel: ParcelResult) => void;
  selectedParcelId?: string;
  sortBy: 'area' | 'owner' | 'date';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'area' | 'owner' | 'date') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  compact?: boolean;
}

const CadastralSearchResults: React.FC<CadastralSearchResultsProps> = ({
  results,
  onSelectParcel,
  selectedParcelId,
  sortBy,
  sortOrder,
  onSortChange,
  onSortOrderChange,
  compact = false
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  if (results.length === 0) return null;

  return (
    <Card className="absolute bottom-4 left-4 right-4 md:left-6 md:w-96 z-[1000] max-h-[50vh] backdrop-blur-sm bg-background/95">
      <CardHeader className={compact ? 'p-2' : 'p-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-sm' : 'text-base'}>
            Résultats ({results.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={compact ? 'h-6 px-2' : 'h-7 px-2'}
            >
              <ArrowUpDown className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={compact ? 'h-6 px-2' : 'h-7 px-2'}
            >
              <List className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={compact ? 'h-6 px-2' : 'h-7 px-2'}
            >
              <Grid className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'p-2' : 'p-3'}>
        <ScrollArea className="h-full">
          {viewMode === 'list' ? (
            <div className="space-y-1.5">
              {results.map(parcel => (
                <div
                  key={parcel.id}
                  className={`p-2 rounded-md border cursor-pointer transition-colors hover:bg-accent ${
                    selectedParcelId === parcel.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => onSelectParcel(parcel)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className={compact ? 'text-[9px] h-4' : 'text-[10px] h-5'}>
                          {parcel.parcel_number}
                        </Badge>
                        <Badge className={compact ? 'text-[9px] h-4' : 'text-[10px] h-5'}>
                          {parcel.parcel_type}
                        </Badge>
                      </div>
                      <p className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                        {parcel.current_owner_name}
                      </p>
                      <p className={`text-muted-foreground truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                        {parcel.area_sqm.toFixed(0)} m² · {parcel.ville || parcel.province}
                      </p>
                    </div>
                    <MapPin className={`flex-shrink-0 text-primary ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {results.map(parcel => (
                <div
                  key={parcel.id}
                  className={`p-2 rounded-md border cursor-pointer transition-colors hover:bg-accent ${
                    selectedParcelId === parcel.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => onSelectParcel(parcel)}
                >
                  <Badge variant="outline" className={`mb-1 ${compact ? 'text-[9px] h-4' : 'text-[10px] h-5'}`}>
                    {parcel.parcel_number}
                  </Badge>
                  <p className={`font-medium truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {parcel.current_owner_name}
                  </p>
                  <p className={`text-muted-foreground ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                    {parcel.area_sqm.toFixed(0)} m²
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CadastralSearchResults;
