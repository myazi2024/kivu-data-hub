import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Settings, Save, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Loader2,
  BarChart3, PieChart as PieChartIcon, TrendingUp, LayoutGrid, Palette, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAnalyticsChartsConfig,
  useAnalyticsChartsConfigMutations,
  ANALYTICS_TABS_REGISTRY,
  ChartConfigItem,
} from '@/hooks/useAnalyticsChartsConfig';

const CHART_TYPE_OPTIONS = [
  { value: 'bar-h', label: 'Barres horiz.', icon: '▬' },
  { value: 'bar-v', label: 'Barres vert.', icon: '▮' },
  { value: 'pie', label: 'Camembert', icon: '◕' },
  { value: 'donut', label: 'Donut', icon: '◔' },
  { value: 'area', label: 'Courbe', icon: '〜' },
];

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
];

interface ItemEditorProps {
  item: ChartConfigItem;
  onChange: (updated: ChartConfigItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const ItemEditor: React.FC<ItemEditorProps> = ({ item, onChange, onMoveUp, onMoveDown, isFirst, isLast }) => {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
      item.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
    }`}>
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <Switch
        checked={item.is_visible}
        onCheckedChange={(checked) => onChange({ ...item, is_visible: checked })}
        className="shrink-0"
      />

      <div className="flex-1 min-w-0">
        <Input
          value={item.custom_title || ''}
          onChange={(e) => onChange({ ...item, custom_title: e.target.value })}
          className="h-7 text-xs"
          placeholder="Titre..."
        />
      </div>

      {item.item_type === 'chart' && item.chart_type && (
        <Select
          value={item.chart_type || ''}
          onValueChange={(v) => onChange({ ...item, chart_type: v as any })}
        >
          <SelectTrigger className="w-[110px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.icon} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {item.item_type === 'chart' && (
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="color"
            value={item.custom_color || '#3b82f6'}
            onChange={(e) => onChange({ ...item, custom_color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
            title="Couleur"
          />
        </div>
      )}

      <Badge variant={item.item_type === 'kpi' ? 'secondary' : 'outline'} className="text-[9px] shrink-0">
        {item.item_type === 'kpi' ? 'KPI' : 'Chart'}
      </Badge>
    </div>
  );
};

const AdminAnalyticsChartsConfig: React.FC = () => {
  const { configs, isLoading } = useAnalyticsChartsConfig();
  const { upsertConfig } = useAnalyticsChartsConfigMutations();
  const [activeTab, setActiveTab] = useState(Object.keys(ANALYTICS_TABS_REGISTRY)[0]);
  const [localItems, setLocalItems] = useState<Record<string, ChartConfigItem[]>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state from defaults + DB overrides
  useEffect(() => {
    if (isLoading) return;
    const dbMap = new Map<string, ChartConfigItem>();
    configs.forEach(c => dbMap.set(`${c.tab_key}::${c.item_key}`, c));

    const result: Record<string, ChartConfigItem[]> = {};
    Object.entries(ANALYTICS_TABS_REGISTRY).forEach(([tabKey, tab]) => {
      const allDefaults = [...tab.kpis, ...tab.charts];
      result[tabKey] = allDefaults.map((d, i) => {
        const override = dbMap.get(`${d.tab_key}::${d.item_key}`);
        if (!override) return { ...d, display_order: d.display_order ?? i };
        return {
          ...d,
          id: override.id,
          is_visible: override.is_visible,
          display_order: override.display_order ?? i,
          custom_title: override.custom_title || d.custom_title,
          custom_color: override.custom_color || d.custom_color,
          chart_type: override.chart_type || d.chart_type,
          custom_icon: override.custom_icon || d.custom_icon,
          col_span: override.col_span ?? d.col_span,
        };
      }).sort((a, b) => {
        // KPIs first, then charts
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      });
    });
    setLocalItems(result);
  }, [configs, isLoading]);

  const currentItems = localItems[activeTab] || [];
  const currentKpis = currentItems.filter(i => i.item_type === 'kpi');
  const currentCharts = currentItems.filter(i => i.item_type === 'chart');

  const updateItem = useCallback((itemKey: string, updated: ChartConfigItem) => {
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(i => i.item_key === itemKey ? updated : i),
    }));
    setHasChanges(true);
  }, [activeTab]);

  const moveItem = useCallback((itemKey: string, direction: 'up' | 'down', type: 'kpi' | 'chart') => {
    setLocalItems(prev => {
      const items = [...(prev[activeTab] || [])];
      const typeItems = items.filter(i => i.item_type === type);
      const idx = typeItems.findIndex(i => i.item_key === itemKey);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= typeItems.length) return prev;
      
      // Swap display_order
      const tempOrder = typeItems[idx].display_order;
      typeItems[idx] = { ...typeItems[idx], display_order: typeItems[swapIdx].display_order };
      typeItems[swapIdx] = { ...typeItems[swapIdx], display_order: tempOrder };
      
      const otherItems = items.filter(i => i.item_type !== type);
      return { ...prev, [activeTab]: [...otherItems, ...typeItems].sort((a, b) => {
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      }) };
    });
    setHasChanges(true);
  }, [activeTab]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const items = localItems[activeTab] || [];
      await upsertConfig.mutateAsync(items);
      toast.success(`Configuration "${ANALYTICS_TABS_REGISTRY[activeTab]?.label}" sauvegardée`);
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, localItems, upsertConfig]);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const allItems = Object.values(localItems).flat();
      await upsertConfig.mutateAsync(allItems);
      toast.success('Toute la configuration Analytics a été sauvegardée');
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde globale');
    } finally {
      setIsSaving(false);
    }
  }, [localItems, upsertConfig]);

  const handleReset = useCallback(() => {
    const tab = ANALYTICS_TABS_REGISTRY[activeTab];
    if (!tab) return;
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: [...tab.kpis, ...tab.charts],
    }));
    setHasChanges(true);
    toast.info('Configuration réinitialisée (non sauvegardée)');
  }, [activeTab]);

  const toggleAll = useCallback((type: 'kpi' | 'chart', visible: boolean) => {
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(i => i.item_type === type ? { ...i, is_visible: visible } : i),
    }));
    setHasChanges(true);
  }, [activeTab]);

  const tabStats = useMemo(() => {
    const stats: Record<string, { kpis: number; charts: number; hidden: number }> = {};
    Object.entries(localItems).forEach(([key, items]) => {
      const kpis = items.filter(i => i.item_type === 'kpi').length;
      const charts = items.filter(i => i.item_type === 'chart').length;
      const hidden = items.filter(i => !i.is_visible).length;
      stats[key] = { kpis, charts, hidden };
    });
    return stats;
  }, [localItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de la configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Configuration des graphiques Analytics
              </CardTitle>
              <CardDescription className="mt-1">
                Gérez la visibilité, l'ordre, les titres, couleurs et types de chaque graphique et KPI dans les Données foncières.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  Non sauvegardé
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Sauvegarder tout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tab selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Onglets Analytics</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-0.5 p-2">
                {Object.entries(ANALYTICS_TABS_REGISTRY).map(([key, tab]) => {
                  const stat = tabStats[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        activeTab === key
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="font-medium">{tab.label}</span>
                      {stat && stat.hidden > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          {stat.hidden} masqué{stat.hidden > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Config editor */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {ANALYTICS_TABS_REGISTRY[activeTab]?.label}
                <Badge variant="outline" className="text-[9px] ml-1">
                  {currentKpis.length} KPIs · {currentCharts.length} Charts
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleReset}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Sauvegarder
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px]">
              <div className="space-y-4">
                {/* KPIs section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Indicateurs KPI ({currentKpis.length})
                    </h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('kpi', true)}>
                        <Eye className="h-3 w-3 mr-1" />Tout afficher
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('kpi', false)}>
                        <EyeOff className="h-3 w-3 mr-1" />Tout masquer
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {currentKpis.map((item, idx) => (
                      <ItemEditor
                        key={item.item_key}
                        item={item}
                        onChange={(updated) => updateItem(item.item_key, updated)}
                        onMoveUp={() => moveItem(item.item_key, 'up', 'kpi')}
                        onMoveDown={() => moveItem(item.item_key, 'down', 'kpi')}
                        isFirst={idx === 0}
                        isLast={idx === currentKpis.length - 1}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Charts section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Graphiques ({currentCharts.length})
                    </h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('chart', true)}>
                        <Eye className="h-3 w-3 mr-1" />Tout afficher
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('chart', false)}>
                        <EyeOff className="h-3 w-3 mr-1" />Tout masquer
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {currentCharts.map((item, idx) => (
                      <ItemEditor
                        key={item.item_key}
                        item={item}
                        onChange={(updated) => updateItem(item.item_key, updated)}
                        onMoveUp={() => moveItem(item.item_key, 'up', 'chart')}
                        onMoveDown={() => moveItem(item.item_key, 'down', 'chart')}
                        isFirst={idx === 0}
                        isLast={idx === currentCharts.length - 1}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsChartsConfig;
