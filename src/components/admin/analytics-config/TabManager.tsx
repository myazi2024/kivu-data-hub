import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, RotateCcw, Layers } from 'lucide-react';
import { TabConfig } from '@/hooks/useAnalyticsChartsConfig';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { isUserTab } from '@/hooks/useInitializedConfig';

interface TabManagerProps {
  localTabs: TabConfig[];
  onUpdate: (tabs: TabConfig[]) => void;
}

export const TabManager: React.FC<TabManagerProps> = ({ localTabs, onUpdate }) => {
  const moveTab = (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= localTabs.length) return;
    const updated = [...localTabs];
    const tempOrder = updated[index].display_order;
    updated[index] = { ...updated[index], display_order: updated[swapIdx].display_order };
    updated[swapIdx] = { ...updated[swapIdx], display_order: tempOrder };
    updated.sort((a, b) => a.display_order - b.display_order);
    onUpdate(updated);
  };

  const toggleVisibility = (index: number) => {
    const updated = [...localTabs];
    updated[index] = { ...updated[index], is_visible: !updated[index].is_visible };
    onUpdate(updated);
  };

  const updateLabel = (index: number, label: string) => {
    const updated = [...localTabs];
    updated[index] = { ...updated[index], label };
    onUpdate(updated);
  };

  const showAll = () => onUpdate(localTabs.map(t => ({ ...t, is_visible: true })));
  const hideAll = () => onUpdate(localTabs.map(t => ({ ...t, is_visible: false })));
  const resetAll = () => {
    onUpdate(Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isUserTab(key)).map(([key, reg], i) => ({
      key, label: reg.label, defaultLabel: reg.label, is_visible: true, display_order: i,
    })));
  };

  const hiddenCount = localTabs.filter(t => !t.is_visible).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />Gestion des onglets
            <Badge variant="outline" className="text-[9px] ml-1">{localTabs.length} onglets · {hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={showAll}><Eye className="h-3 w-3 mr-1" /> Tout afficher</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={hideAll}><EyeOff className="h-3 w-3 mr-1" /> Tout masquer</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetAll}><RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {localTabs.map((tab, idx) => (
            <div key={tab.key} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
              tab.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
            }`}>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTab(idx, 'up')} disabled={idx === 0}><ChevronUp className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTab(idx, 'down')} disabled={idx === localTabs.length - 1}><ChevronDown className="h-3 w-3" /></Button>
              </div>
              <Switch checked={tab.is_visible} onCheckedChange={() => toggleVisibility(idx)} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <Input value={tab.label} onChange={(e) => updateLabel(idx, e.target.value)} className="h-7 text-xs" placeholder={tab.defaultLabel} />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{tab.key}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
