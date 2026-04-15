import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ChartConfigItem } from '@/hooks/useAnalyticsChartsConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { CHART_TYPE_OPTIONS } from '@/config/chartTypeOptions';

interface ItemEditorProps {
  item: ChartConfigItem;
  onChange: (updated: ChartConfigItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

/** A chart with chart_type === null in the registry is a special/composite chart (StackedBar, MultiArea, Geo) whose type cannot be changed */
const isFixedTypeChart = (item: ChartConfigItem) =>
  item.item_type === 'chart' && !item.chart_type;

export const ItemEditor: React.FC<ItemEditorProps> = ({ item, onChange, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const isMobile = useIsMobile();
  const fixedType = isFixedTypeChart(item);

  if (isMobile) {
    return (
      <div className={`p-2.5 rounded-lg border transition-colors space-y-2 ${
        item.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
      }`}>
        {/* Line 1: Switch + Title */}
        <div className="flex items-center gap-2">
          <Switch checked={item.is_visible} onCheckedChange={(checked) => onChange({ ...item, is_visible: checked })} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <Input value={item.custom_title || ''} onChange={(e) => onChange({ ...item, custom_title: e.target.value })} className="h-7 text-xs" placeholder="Titre..." />
          </div>
        </div>
        {/* Line 2: Arrows + Chart type + Icon + Color + Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}><ChevronDown className="h-3 w-3" /></Button>
          </div>
          {item.item_type === 'chart' && !fixedType && item.chart_type && (
            <Select value={item.chart_type || ''} onValueChange={(v) => onChange({ ...item, chart_type: v as any })}>
              <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.icon} {opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {fixedType && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">Type fixe</Badge>
          )}
          {item.item_type === 'chart' && (
            <Input
              value={item.custom_icon || ''}
              onChange={(e) => onChange({ ...item, custom_icon: e.target.value || null })}
              className="w-[70px] h-6 text-[10px]"
              placeholder="Icône"
              title="Nom icône Lucide (ex: FileText)"
            />
          )}
          {item.item_type === 'chart' && (
            <input type="color" value={item.custom_color || '#3b82f6'} onChange={(e) => onChange({ ...item, custom_color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Couleur" />
          )}
          <Badge variant={item.item_type === 'kpi' ? 'secondary' : 'outline'} className="text-[9px] ml-auto">
            {item.item_type === 'kpi' ? 'KPI' : 'Chart'}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
      item.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
    }`}>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}><ChevronDown className="h-3 w-3" /></Button>
      </div>
      <Switch checked={item.is_visible} onCheckedChange={(checked) => onChange({ ...item, is_visible: checked })} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <Input value={item.custom_title || ''} onChange={(e) => onChange({ ...item, custom_title: e.target.value })} className="h-7 text-xs" placeholder="Titre..." />
      </div>
      {item.item_type === 'chart' && !fixedType && item.chart_type && (
        <Select value={item.chart_type || ''} onValueChange={(v) => onChange({ ...item, chart_type: v as any })}>
          <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CHART_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.icon} {opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {fixedType && (
        <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">Type fixe</Badge>
      )}
      {item.item_type === 'chart' && (
        <Input
          value={item.custom_icon || ''}
          onChange={(e) => onChange({ ...item, custom_icon: e.target.value || null })}
          className="w-[80px] h-7 text-xs shrink-0"
          placeholder="Icône"
          title="Nom icône Lucide (ex: FileText)"
        />
      )}
      {item.item_type === 'chart' && (
        <div className="flex items-center gap-1 shrink-0">
          <input type="color" value={item.custom_color || '#3b82f6'} onChange={(e) => onChange({ ...item, custom_color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Couleur" />
        </div>
      )}
      <Badge variant={item.item_type === 'kpi' ? 'secondary' : 'outline'} className="text-[9px] shrink-0">
        {item.item_type === 'kpi' ? 'KPI' : 'Chart'}
      </Badge>
    </div>
  );
};
