import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CadastralMapLegendProps {
  compact?: boolean;
}

const CadastralMapLegend: React.FC<CadastralMapLegendProps> = ({ compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const legendItems = [
    { color: '#ef4444', label: 'Parcelle cadastrale', type: 'polygon' },
    { color: '#3b82f6', label: 'Avec permis de construire', type: 'marker' },
    { color: '#eab308', label: 'Avec hypothèque', type: 'marker' },
    { color: '#f97316', label: 'Arriérés d\'impôts', type: 'marker' },
    { color: '#8b5cf6', label: 'Zone de recherche', type: 'area' }
  ];

  return (
    <Card className="absolute bottom-4 right-4 z-[1000] w-64 backdrop-blur-sm bg-background/95">
      <CardHeader className={`${compact ? 'p-2' : 'p-3'} pb-0`}>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-xs' : 'text-sm'}>Légende</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={compact ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
          >
            {isExpanded ? (
              <ChevronDown className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            ) : (
              <ChevronUp className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className={compact ? 'p-2 pt-2' : 'p-3 pt-2'}>
          <div className="space-y-1.5">
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.type === 'polygon' ? (
                  <div
                    className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} border-2 rounded`}
                    style={{ borderColor: item.color, backgroundColor: `${item.color}33` }}
                  />
                ) : item.type === 'marker' ? (
                  <div
                    className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full`}
                    style={{ backgroundColor: item.color }}
                  />
                ) : (
                  <div
                    className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded`}
                    style={{ backgroundColor: `${item.color}66` }}
                  />
                )}
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t">
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground`}>
              Cliquez sur une parcelle pour voir les détails
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default CadastralMapLegend;
