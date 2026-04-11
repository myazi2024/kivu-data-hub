import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChartConfigItem } from '@/hooks/useAnalyticsChartsConfig';

interface GlobalWatermarkConfigProps {
  charts: ChartConfigItem[];
  onUpdateItem: (itemKey: string, updated: ChartConfigItem) => void;
}

export const GlobalWatermarkConfig: React.FC<GlobalWatermarkConfigProps> = ({ charts, onUpdateItem }) => {
  const opacityItem = charts.find(c => c.item_key === 'logo-watermark-opacity');
  const sizeItem = charts.find(c => c.item_key === 'logo-watermark-size');
  const posItem = charts.find(c => c.item_key === 'logo-watermark-position');
  const watermarkItem = charts.find(c => c.item_key === 'global-watermark');

  const opacity = parseFloat(opacityItem?.custom_title || '0.06') || 0.06;
  const size = parseInt(sizeItem?.custom_title || '80', 10) || 80;
  const position = posItem?.custom_title || 'center';

  const posStyles: Record<string, React.CSSProperties> = {
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px' },
    'bottom-left': { bottom: '8px', left: '8px' },
    'bottom-right': { bottom: '8px', right: '8px' },
  };

  return (
    <div className="space-y-4">
      {watermarkItem && (
        <div>
          <Label className="text-xs font-semibold">Texte filigrane</Label>
          <Input value={watermarkItem.custom_title || ''} onChange={(e) => onUpdateItem('global-watermark', { ...watermarkItem, custom_title: e.target.value })} className="h-7 text-xs mt-1" />
        </div>
      )}
      <Separator />
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filigrane Logo</h4>

      {opacityItem && (
        <div>
          <Label className="text-xs">Opacité : {(opacity * 100).toFixed(0)}%</Label>
          <input type="range" min={1} max={30} step={1} value={Math.round(opacity * 100)}
            onChange={(e) => onUpdateItem('logo-watermark-opacity', { ...opacityItem, custom_title: (parseInt(e.target.value) / 100).toFixed(2) })}
            className="w-full h-2 mt-1 accent-primary" />
        </div>
      )}

      {sizeItem && (
        <div>
          <Label className="text-xs">Taille : {size}px</Label>
          <input type="range" min={30} max={200} step={5} value={size}
            onChange={(e) => onUpdateItem('logo-watermark-size', { ...sizeItem, custom_title: e.target.value })}
            className="w-full h-2 mt-1 accent-primary" />
        </div>
      )}

      {posItem && (
        <div>
          <Label className="text-xs">Position</Label>
          <Select value={position} onValueChange={(v) => onUpdateItem('logo-watermark-position', { ...posItem, custom_title: v })}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Centre</SelectItem>
              <SelectItem value="top-left">Haut-gauche</SelectItem>
              <SelectItem value="top-right">Haut-droite</SelectItem>
              <SelectItem value="bottom-left">Bas-gauche</SelectItem>
              <SelectItem value="bottom-right">Bas-droite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="relative border rounded-lg bg-muted/30 h-32 flex items-center justify-center overflow-hidden">
        <span className="text-xs text-muted-foreground">Aperçu</span>
        <img src="/bic-logo.png" alt="" className="absolute pointer-events-none"
          style={{ width: size, height: size, objectFit: 'contain', opacity,
            filter: 'brightness(0) sepia(1) saturate(5) hue-rotate(185deg)',
            ...posStyles[position] || posStyles['center'],
          }} />
      </div>
    </div>
  );
};
