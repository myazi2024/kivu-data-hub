import React from 'react';
import { CLIPART_TYPES, LotAnnotation } from './types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ClipartPaletteProps {
  onSelect: (type: LotAnnotation['type']) => void;
  onClose: () => void;
  selectedType?: LotAnnotation['type'] | null;
}

const ClipartPalette: React.FC<ClipartPaletteProps> = ({ onSelect, onClose, selectedType }) => {
  return (
    <div className="absolute top-2 left-2 z-20 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold">Cliparts</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {CLIPART_TYPES.map(item => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md text-xs transition-colors hover:bg-muted
              ${selectedType === item.type ? 'bg-primary/15 ring-1 ring-primary/40' : ''}
            `}
            title={item.label}
          >
            <span className="text-base">{item.emoji}</span>
            <span className="text-[8px] text-muted-foreground leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
        Sélectionnez puis cliquez sur un lot
      </p>
    </div>
  );
};

export default ClipartPalette;
