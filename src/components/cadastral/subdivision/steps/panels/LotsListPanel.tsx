import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SubdivisionLot, LOT_COLORS } from '../../types';
import { formatSqm } from '../../utils/metrics';
import LotsBulkActions from '../LotsBulkActions';

interface Props {
  lots: SubdivisionLot[];
  setLots: (lots: SubdivisionLot[]) => void;
  selectedLotId: string | null;
  onSelectLot: (id: string) => void;
}

const LotsListPanel: React.FC<Props> = ({ lots, setLots, selectedLotId, onSelectLot }) => (
  <Card>
    <CardContent className="pt-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="font-semibold text-xs">Tous les lots ({lots.length})</h4>
        <LotsBulkActions lots={lots} setLots={setLots} />
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto" role="list" aria-label="Liste des lots">
        {lots.map(lot => (
          <button
            key={lot.id}
            type="button"
            onClick={() => onSelectLot(lot.id)}
            aria-label={`Sélectionner le lot ${lot.lotNumber} de ${formatSqm(lot.areaSqm)}`}
            aria-pressed={lot.id === selectedLotId}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left
              ${lot.id === selectedLotId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}
            `}
          >
            <span
              className="h-3 w-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: lot.color || LOT_COLORS[lot.intendedUse] }}
              aria-hidden="true"
            />
            <span className="font-medium flex-1">Lot {lot.lotNumber}</span>
            <span className="text-muted-foreground">{formatSqm(lot.areaSqm)}</span>
          </button>
        ))}
        {lots.length === 0 && (
          <p className="text-center text-muted-foreground text-[10px] py-3">
            Tracez une ligne entre deux bords pour diviser le lot.
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default LotsListPanel;
