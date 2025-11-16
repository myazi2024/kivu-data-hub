import React from 'react';

interface ParcelTooltipProps {
  parcelNumber: string;
  ownerName?: string;
  area?: number;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  latitude?: number;
  longitude?: number;
  compact?: boolean;
}

const ParcelTooltip: React.FC<ParcelTooltipProps> = ({
  parcelNumber,
  ownerName,
  area,
  province,
  ville,
  commune,
  quartier,
  latitude,
  longitude,
  compact = false
}) => {
  const formatArea = (sqm?: number) => {
    if (!sqm) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(sqm);
  };

  if (compact) {
    return (
      <div className="min-w-[200px] p-2 bg-background/95 backdrop-blur-sm border border-border shadow-md rounded-md">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-foreground border-b border-border/50 pb-1 mb-1">
            {parcelNumber}
          </h3>
          
          {ownerName && (
            <div className="text-xs">
              <span className="text-muted-foreground">Propriétaire: </span>
              <span className="font-medium text-foreground">{ownerName}</span>
            </div>
          )}
          
          {area && (
            <div className="text-xs">
              <span className="text-muted-foreground">Surface: </span>
              <span className="font-medium text-foreground">{formatArea(area)} m²</span>
            </div>
          )}
          
          {province && (
            <div className="text-xs">
              <span className="text-muted-foreground">Province: </span>
              <span className="font-medium text-foreground">{province}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[250px] p-3 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-md">
      <div className="space-y-2">
        <h3 className="font-semibold text-base text-foreground border-b border-border/50 pb-1.5 mb-2">
          Parcelle {parcelNumber}
        </h3>
        
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {ownerName && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground">Propriétaire:</span>
              <span className="font-medium text-foreground text-right">{ownerName}</span>
            </div>
          )}
          
          {area && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Surface:</span>
              <span className="font-medium text-foreground">{formatArea(area)} m²</span>
            </div>
          )}
          
          {province && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Province:</span>
              <span className="font-medium text-foreground">{province}</span>
            </div>
          )}
          
          {ville && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ville:</span>
              <span className="font-medium text-foreground">{ville}</span>
            </div>
          )}
          
          {commune && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Commune:</span>
              <span className="font-medium text-foreground">{commune}</span>
            </div>
          )}
          
          {quartier && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quartier:</span>
              <span className="font-medium text-foreground">{quartier}</span>
            </div>
          )}
          
          {latitude && longitude && (
            <div className="flex justify-between items-center pt-1.5 border-t border-border/30 mt-1.5">
              <span className="text-muted-foreground text-[10px]">Coordonnées GPS:</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParcelTooltip;
