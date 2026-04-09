import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings, Save, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Loader2,
  BarChart3, PieChart as PieChartIcon, TrendingUp, LayoutGrid, Palette, GripVertical,
  Layers, Map as MapIcon, Globe, Filter, GitBranch, Plus, Trash2, ExternalLink, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAnalyticsChartsConfig,
  useAnalyticsChartsConfigMutations,
  useAnalyticsTabsConfig,
  ANALYTICS_TABS_REGISTRY,
  TAB_FILTER_DEFAULTS,
  DATE_FIELD_OPTIONS,
  STATUS_FIELD_OPTIONS,
  buildFilterDefaults,
  ChartConfigItem,
  TabConfig,
} from '@/hooks/useAnalyticsChartsConfig';
import { CROSS_VARIABLE_REGISTRY, CrossVariable } from '@/config/crossVariables';

/** Tabs excluded from all user-facing views (system-level only) */
const EXCLUDED_SYSTEM_TABS = ['_global'];
/** Tabs that only appear in the Charts view (no KPIs/Filters/Cross) */
const CHARTS_ONLY_TABS = ['rdc-map'];
/** Filter helper: exclude system + charts-only tabs */
const isUserTab = (key: string) => !EXCLUDED_SYSTEM_TABS.includes(key) && !CHARTS_ONLY_TABS.includes(key);
/** Filter helper: exclude system tabs only (charts view includes rdc-map) */
const isChartsViewTab = (key: string) => !EXCLUDED_SYSTEM_TABS.includes(key);

const CHART_TYPE_OPTIONS = [
  { value: 'bar-h', label: 'Barres horiz.', icon: '▬' },
  { value: 'bar-v', label: 'Barres vert.', icon: '▮' },
  { value: 'pie', label: 'Camembert', icon: '◕' },
  { value: 'donut', label: 'Donut', icon: '◔' },
  { value: 'area', label: 'Courbe', icon: '〜' },
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

// ─── Tab Manager Component ───────────────────────────────────────────
interface TabManagerProps {
  localTabs: TabConfig[];
  onUpdate: (tabs: TabConfig[]) => void;
}

const TabManager: React.FC<TabManagerProps> = ({ localTabs, onUpdate }) => {
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
      key,
      label: reg.label,
      defaultLabel: reg.label,
      is_visible: true,
      display_order: i,
    })));
  };

  const hiddenCount = localTabs.filter(t => !t.is_visible).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Gestion des onglets
            <Badge variant="outline" className="text-[9px] ml-1">
              {localTabs.length} onglets · {hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={showAll}>
              <Eye className="h-3 w-3 mr-1" /> Tout afficher
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={hideAll}>
              <EyeOff className="h-3 w-3 mr-1" /> Tout masquer
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetAll}>
              <RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {localTabs.map((tab, idx) => (
            <div
              key={tab.key}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                tab.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTab(idx, 'up')} disabled={idx === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTab(idx, 'down')} disabled={idx === localTabs.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              <Switch
                checked={tab.is_visible}
                onCheckedChange={() => toggleVisibility(idx)}
                className="shrink-0"
              />

              <div className="flex-1 min-w-0">
                <Input
                  value={tab.label}
                  onChange={(e) => updateLabel(idx, e.target.value)}
                  className="h-7 text-xs"
                  placeholder={tab.defaultLabel}
                />
              </div>

              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                {tab.key}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Filter Manager Component ────────────────────────────────────────
interface FilterManagerProps {
  localFilters: Record<string, ChartConfigItem[]>;
  onUpdateFilters: (filters: Record<string, ChartConfigItem[]>) => void;
  localTabs: TabConfig[];
  onSave: (items: ChartConfigItem[]) => Promise<void>;
  isSaving: boolean;
}

const FILTER_LABELS: Record<string, { label: string; description: string }> = {
  'filter-status': { label: 'Filtre statut', description: 'Afficher le sélecteur de statut (approuvé, en attente, etc.)' },
  'filter-time': { label: 'Filtre temporel', description: 'Afficher les sélecteurs Année / Semestre / Trimestre / Mois' },
  'filter-location': { label: 'Filtre géographique', description: 'Afficher la cascade Province / Section / Ville / Commune / Quartier' },
};

const FilterManager: React.FC<FilterManagerProps> = ({ localFilters, onUpdateFilters, localTabs, onSave, isSaving }) => {
  const [selectedTab, setSelectedTab] = useState(Object.keys(TAB_FILTER_DEFAULTS)[0]);

  const currentFilters = localFilters[selectedTab] || [];
  const toggleFilters = currentFilters.filter(f => ['filter-status', 'filter-time', 'filter-location'].includes(f.item_key));
  const dateFieldItem = currentFilters.find(f => f.item_key === 'filter-date-field');
  const statusFieldItem = currentFilters.find(f => f.item_key === 'filter-status-field');

  const toggleFilter = (itemKey: string) => {
    onUpdateFilters({
      ...localFilters,
      [selectedTab]: (localFilters[selectedTab] || []).map(f =>
        f.item_key === itemKey ? { ...f, is_visible: !f.is_visible } : f
      ),
    });
  };

  const updateFieldValue = (itemKey: string, value: string) => {
    onUpdateFilters({
      ...localFilters,
      [selectedTab]: (localFilters[selectedTab] || []).map(f =>
        f.item_key === itemKey ? { ...f, custom_title: value } : f
      ),
    });
  };

  const handleSave = async () => {
    const allFilterItems = Object.values(localFilters).flat();
    await onSave(allFilterItems);
  };

  const analyticsTabKeys = Object.keys(TAB_FILTER_DEFAULTS);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Onglets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-0.5 p-2">
              {analyticsTabKeys.map(key => {
                const reg = ANALYTICS_TABS_REGISTRY[key];
                const tabConf = localTabs.find(t => t.key === key);
                const label = tabConf?.label || reg?.label || key;
                const filters = localFilters[key] || [];
                const hiddenCount = filters.filter(f => ['filter-status', 'filter-time', 'filter-location'].includes(f.item_key) && !f.is_visible).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTab(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedTab === key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    {hiddenCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        {hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres — {ANALYTICS_TABS_REGISTRY[selectedTab]?.label || selectedTab}
            </CardTitle>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Sauvegarder filtres
            </Button>
          </div>
          <CardDescription className="text-xs mt-1">
            Activez ou désactivez les filtres et configurez les champs sources pour cet onglet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {toggleFilters.map(f => {
              const meta = FILTER_LABELS[f.item_key];
              return (
                <div key={f.item_key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  f.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                }`}>
                  <Switch
                    checked={f.is_visible}
                    onCheckedChange={() => toggleFilter(f.item_key)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{meta?.label || f.item_key}</div>
                    <div className="text-xs text-muted-foreground">{meta?.description || ''}</div>
                  </div>
                  <Badge variant={f.is_visible ? 'default' : 'secondary'} className="text-[9px]">
                    {f.is_visible ? 'Actif' : 'Masqué'}
                  </Badge>
                </div>
              );
            })}

            <Separator className="my-2" />

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Champ date source</Label>
              <Select
                value={dateFieldItem?.custom_title || 'created_at'}
                onValueChange={(v) => updateFieldValue('filter-date-field', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FIELD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Le champ utilisé pour le filtrage temporel (année, mois, etc.)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Champ statut source</Label>
              <Select
                value={statusFieldItem?.custom_title || 'status'}
                onValueChange={(v) => updateFieldValue('filter-status-field', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FIELD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Le champ utilisé pour le filtrage par statut</p>
            </div>

            {toggleFilters.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Aucun filtre configurable pour cet onglet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Cross Variable Manager Component ────────────────────────────────
interface CrossVariableManagerProps {
  localCross: Record<string, Record<string, { enabled: boolean; variables: { label: string; field: string; enabled: boolean }[] }>>;
  onUpdateCross: (cross: Record<string, Record<string, { enabled: boolean; variables: { label: string; field: string; enabled: boolean }[] }>>) => void;
  localTabs: TabConfig[];
}

const CrossVariableManager: React.FC<CrossVariableManagerProps> = ({ localCross, onUpdateCross, localTabs }) => {
  const [selectedTab, setSelectedTab] = useState(Object.keys(CROSS_VARIABLE_REGISTRY)[0]);

  const tabCross = localCross[selectedTab] || {};
  const chartKeys = Object.keys(CROSS_VARIABLE_REGISTRY[selectedTab] || {});

  const toggleChartPicklist = (chartKey: string) => {
    const current = tabCross[chartKey] || { enabled: true, variables: [] };
    onUpdateCross({
      ...localCross,
      [selectedTab]: { ...tabCross, [chartKey]: { ...current, enabled: !current.enabled } },
    });
  };

  const toggleVariable = (chartKey: string, field: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross,
      [selectedTab]: {
        ...tabCross,
        [chartKey]: {
          ...current,
          variables: current.variables.map(v => v.field === field ? { ...v, enabled: !v.enabled } : v),
        },
      },
    });
  };

  const updateVariableLabel = (chartKey: string, field: string, newLabel: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross,
      [selectedTab]: {
        ...tabCross,
        [chartKey]: {
          ...current,
          variables: current.variables.map(v => v.field === field ? { ...v, label: newLabel } : v),
        },
      },
    });
  };

  const updateVariableField = (chartKey: string, oldField: string, newField: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross,
      [selectedTab]: {
        ...tabCross,
        [chartKey]: {
          ...current,
          variables: current.variables.map(v => v.field === oldField ? { ...v, field: newField } : v),
        },
      },
    });
  };

  const addVariable = (chartKey: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross,
      [selectedTab]: {
        ...tabCross,
        [chartKey]: {
          ...current,
          variables: [...current.variables, { label: 'Nouveau', field: 'new_field', enabled: true }],
        },
      },
    });
  };

  const removeVariable = (chartKey: string, field: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross,
      [selectedTab]: {
        ...tabCross,
        [chartKey]: {
          ...current,
          variables: current.variables.filter(v => v.field !== field),
        },
      },
    });
  };

  // Get chart title from registry
  const getChartTitle = (tabKey: string, chartKey: string): string => {
    const tab = ANALYTICS_TABS_REGISTRY[tabKey];
    if (!tab) return chartKey;
    const item = [...tab.charts, ...tab.kpis].find(c => c.item_key === chartKey);
    return item?.custom_title || chartKey;
  };

  const analyticsTabKeys = Object.keys(CROSS_VARIABLE_REGISTRY);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Onglets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-0.5 p-2">
              {analyticsTabKeys.map(key => {
                const reg = ANALYTICS_TABS_REGISTRY[key];
                const tabConf = localTabs.find(t => t.key === key);
                const label = tabConf?.label || reg?.label || key;
                const crossCount = Object.keys(CROSS_VARIABLE_REGISTRY[key] || {}).length;
                const disabledCount = Object.values(localCross[key] || {}).filter(c => !c.enabled).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTab(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedTab === key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {crossCount}
                      </Badge>
                      {disabledCount > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          {disabledCount} off
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Croisements — {ANALYTICS_TABS_REGISTRY[selectedTab]?.label || selectedTab}
            </CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Activez/désactivez le picklist de croisement par graphique et configurez les variables disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {chartKeys.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Aucun graphique croisable pour cet onglet.
                </div>
              )}
              {chartKeys.map(chartKey => {
                const config = tabCross[chartKey] || { enabled: true, variables: [] };
                const chartTitle = getChartTitle(selectedTab, chartKey);
                return (
                  <div key={chartKey} className={`rounded-lg border p-3 space-y-2 transition-colors ${
                    config.enabled ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={() => toggleChartPicklist(chartKey)}
                        />
                        <span className="text-xs font-semibold">{chartTitle}</span>
                        <Badge variant="outline" className="text-[8px] font-mono">{chartKey}</Badge>
                      </div>
                      <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-[9px]">
                        {config.variables.filter(v => v.enabled).length} variable{config.variables.filter(v => v.enabled).length > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {config.enabled && (
                      <div className="space-y-1 pl-4">
                        {config.variables.map((v, vi) => (
                          <div key={`${v.field}-${vi}`} className="flex items-center gap-2">
                            <Switch
                              checked={v.enabled}
                              onCheckedChange={() => toggleVariable(chartKey, v.field)}
                              className="scale-75"
                            />
                            <Input
                              value={v.label}
                              onChange={(e) => updateVariableLabel(chartKey, v.field, e.target.value)}
                              className="h-6 text-[10px] flex-1 max-w-[120px]"
                              placeholder="Label"
                            />
                            <Input
                              value={v.field}
                              onChange={(e) => updateVariableField(chartKey, v.field, e.target.value)}
                              className="h-6 text-[10px] flex-1 max-w-[140px] font-mono"
                              placeholder="field_name"
                            />
                            <button
                              onClick={() => removeVariable(chartKey, v.field)}
                              className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2 mt-1"
                          onClick={() => addVariable(chartKey)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Ajouter une variable
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
const AdminAnalyticsChartsConfig: React.FC = () => {
  const navigate = useNavigate();
  const { configs, isLoading } = useAnalyticsChartsConfig();
  const { tabs: dbTabs } = useAnalyticsTabsConfig();
  const { upsertConfig, deleteTabOverrides } = useAnalyticsChartsConfigMutations();
  const [activeTab, setActiveTab] = useState(Object.keys(ANALYTICS_TABS_REGISTRY).filter(isUserTab)[0]);
  const [localItems, setLocalItems] = useState<Record<string, ChartConfigItem[]>>({});
  const [localTabs, setLocalTabs] = useState<TabConfig[]>([]);
  const [localFilters, setLocalFilters] = useState<Record<string, ChartConfigItem[]>>({});
  const [localCross, setLocalCross] = useState<Record<string, Record<string, { enabled: boolean; variables: { label: string; field: string; enabled: boolean }[] }>>>({});
  const [hasTabChanges, setHasTabChanges] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const [hasCrossChanges, setHasCrossChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'tabs' | 'kpis' | 'charts' | 'filters' | 'cross'>('tabs');
  const [modifiedTabs, setModifiedTabs] = useState<Set<string>>(new Set());
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);

  const hasChartChanges = modifiedTabs.size > 0;
  const hasChanges = hasChartChanges || hasTabChanges || hasFilterChanges || hasCrossChanges;

  // Initialize local state from defaults + DB overrides
  useEffect(() => {
    if (isLoading) return;
    const dbMap: Map<string, ChartConfigItem> = new Map();
    configs.filter(c => c.item_type !== 'tab').forEach(c => dbMap.set(`${c.tab_key}::${c.item_key}`, c));

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
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      });
    });
    setLocalItems(result);
  }, [configs, isLoading]);

  // Initialize local tabs
  useEffect(() => {
    if (isLoading) return;
    setLocalTabs(dbTabs);
  }, [dbTabs, isLoading]);

  // Initialize local filters from defaults + DB overrides
  useEffect(() => {
    if (isLoading) return;
    const result: Record<string, ChartConfigItem[]> = {};
    const dbFilterMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type === 'filter').forEach(c => dbFilterMap.set(`${c.tab_key}::${c.item_key}`, c));

    Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isUserTab(key)).forEach(([tabKey]) => {
      const defaults = buildFilterDefaults(tabKey);
      result[tabKey] = defaults.map(d => {
        const override = dbFilterMap.get(`${d.tab_key}::${d.item_key}`);
        return override ? { ...d, is_visible: override.is_visible, custom_title: override.custom_title || d.custom_title, id: override.id } : d;
      });
    });
    setLocalFilters(result);
    setHasFilterChanges(false);
  }, [configs, isLoading]);

  // Initialize local cross config from registry + DB overrides
  useEffect(() => {
    if (isLoading) return;
    const dbCrossMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type === 'cross').forEach(c => dbCrossMap.set(`${c.tab_key}::${c.item_key}`, c));

    const result: Record<string, Record<string, { enabled: boolean; variables: { label: string; field: string; enabled: boolean }[] }>> = {};
    Object.entries(CROSS_VARIABLE_REGISTRY).forEach(([tabKey, charts]) => {
      result[tabKey] = {};
      Object.entries(charts).forEach(([chartKey, defaults]) => {
        const dbItem = dbCrossMap.get(`${tabKey}::cross-${chartKey}`);
        if (dbItem) {
          let variables: { label: string; field: string; enabled: boolean }[];
          try {
            variables = dbItem.custom_title ? JSON.parse(dbItem.custom_title) : defaults.map(d => ({ label: d.label, field: d.field, enabled: true }));
          } catch {
            variables = defaults.map(d => ({ label: d.label, field: d.field, enabled: true }));
          }
          result[tabKey][chartKey] = { enabled: dbItem.is_visible, variables };
        } else {
          result[tabKey][chartKey] = {
            enabled: true,
            variables: defaults.map(d => ({ label: d.label, field: d.field, enabled: true })),
          };
        }
      });
    });
    setLocalCross(result);
    setHasCrossChanges(false);
  }, [configs, isLoading]);

  // ─── C6: Desync detection — warn if cross registry keys don't match analytics registry ───
  const desyncWarnings = useMemo(() => {
    const warnings: string[] = [];
    Object.keys(CROSS_VARIABLE_REGISTRY).forEach(tabKey => {
      if (!ANALYTICS_TABS_REGISTRY[tabKey]) {
        warnings.push(`Croisements: onglet orphelin « ${tabKey} » absent du registre Analytics`);
      } else {
        const chartKeys = Object.keys(CROSS_VARIABLE_REGISTRY[tabKey]);
        const regChartKeys = new Set(ANALYTICS_TABS_REGISTRY[tabKey].charts.map(c => c.item_key));
        chartKeys.forEach(ck => {
          if (!regChartKeys.has(ck)) {
            warnings.push(`Croisements: clé « ${ck} » (onglet ${tabKey}) absente du registre Charts`);
          }
        });
      }
    });
    return warnings;
  }, []);

  const currentItems = localItems[activeTab] || [];
  const currentKpis = currentItems.filter(i => i.item_type === 'kpi');
  const currentCharts = currentItems.filter(i => i.item_type === 'chart');

  const markTabModified = useCallback((tabKey: string) => {
    setModifiedTabs(prev => new Set(prev).add(tabKey));
  }, []);

  const updateItem = useCallback((itemKey: string, updated: ChartConfigItem) => {
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(i => i.item_key === itemKey ? updated : i),
    }));
    markTabModified(activeTab);
  }, [activeTab, markTabModified]);

  const moveItem = useCallback((itemKey: string, direction: 'up' | 'down', type: 'kpi' | 'chart') => {
    setLocalItems(prev => {
      const items = [...(prev[activeTab] || [])];
      const typeItems = items.filter(i => i.item_type === type);
      const idx = typeItems.findIndex(i => i.item_key === itemKey);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= typeItems.length) return prev;
      
      const tempOrder = typeItems[idx].display_order;
      typeItems[idx] = { ...typeItems[idx], display_order: typeItems[swapIdx].display_order };
      typeItems[swapIdx] = { ...typeItems[swapIdx], display_order: tempOrder };
      
      const otherItems = items.filter(i => i.item_type !== type);
      return { ...prev, [activeTab]: [...otherItems, ...typeItems].sort((a, b) => {
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      }) };
    });
    markTabModified(activeTab);
  }, [activeTab, markTabModified]);

  const tabConfigToItems = useCallback((tabs: TabConfig[]): ChartConfigItem[] => {
    return tabs.map(t => ({
      tab_key: t.key,
      item_key: '__tab__',
      item_type: 'tab' as const,
      is_visible: t.is_visible,
      display_order: t.display_order,
      custom_title: t.label !== t.defaultLabel ? t.label : null,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const items = localItems[activeTab] || [];
      await upsertConfig.mutateAsync(items);
      toast.success(`Configuration "${ANALYTICS_TABS_REGISTRY[activeTab]?.label}" sauvegardée`);
      setModifiedTabs(prev => { const n = new Set(prev); n.delete(activeTab); return n; });
    } catch (error: any) {
      console.error('Save chart error:', error);
      toast.error(`Erreur: ${error?.message || 'Sauvegarde impossible'}`);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, localItems, upsertConfig]);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const allChartItems = Object.values(localItems).flat();
      const tabItems = tabConfigToItems(localTabs);
      const allFilterItems = Object.values(localFilters).flat();
      // Build cross items
      const crossItems: ChartConfigItem[] = [];
      Object.entries(localCross).forEach(([tabKey, charts]) => {
        Object.entries(charts).forEach(([chartKey, config]) => {
          crossItems.push({
            tab_key: tabKey,
            item_key: `cross-${chartKey}`,
            item_type: 'cross',
            is_visible: config.enabled,
            display_order: 0,
            custom_title: JSON.stringify(config.variables),
          });
        });
      });
      await upsertConfig.mutateAsync([...allChartItems, ...tabItems, ...allFilterItems, ...crossItems]);
      toast.success('Toute la configuration Analytics a été sauvegardée');
      setModifiedTabs(new Set());
      setHasTabChanges(false);
      setHasFilterChanges(false);
      setHasCrossChanges(false);
    } catch (error: any) {
      console.error('Save all error:', error);
      toast.error(`Erreur: ${error?.message || 'Sauvegarde globale impossible'}`);
    } finally {
      setIsSaving(false);
    }
  }, [localItems, localTabs, localFilters, localCross, upsertConfig, tabConfigToItems]);

  const handleSaveTabs = useCallback(async () => {
    setIsSaving(true);
    try {
      const tabItems = tabConfigToItems(localTabs);
      await upsertConfig.mutateAsync(tabItems);
      toast.success('Configuration des onglets sauvegardée');
      setHasTabChanges(false);
    } catch (error: any) {
      console.error('Save tabs error:', error);
      toast.error(`Erreur: ${error?.message || 'Sauvegarde des onglets impossible'}`);
    } finally {
      setIsSaving(false);
    }
  }, [localTabs, upsertConfig, tabConfigToItems]);

  const handleReset = useCallback(() => {
    const tab = ANALYTICS_TABS_REGISTRY[activeTab];
    if (!tab) return;
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: [...tab.kpis, ...tab.charts],
    }));
    markTabModified(activeTab);
    toast.info('Configuration réinitialisée (non sauvegardée)');
  }, [activeTab, markTabModified]);

  const toggleAll = useCallback((type: 'kpi' | 'chart', visible: boolean) => {
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(i => i.item_type === type ? { ...i, is_visible: visible } : i),
    }));
    markTabModified(activeTab);
  }, [activeTab, markTabModified]);

  /** Tab switch with unsaved changes confirmation */
  const handleTabSwitch = useCallback((targetTab: string) => {
    if (modifiedTabs.has(activeTab)) {
      setPendingTabSwitch(targetTab);
    } else {
      setActiveTab(targetTab);
    }
  }, [activeTab, modifiedTabs]);

  const confirmTabSwitch = useCallback(() => {
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
  }, [pendingTabSwitch]);

  const cancelTabSwitch = useCallback(() => {
    setPendingTabSwitch(null);
  }, []);


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
                Gérez les onglets, la visibilité, l'ordre, les titres, couleurs et types de chaque graphique et KPI.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  Non sauvegardé
                </Badge>
              )}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  size="sm"
                  variant={viewMode === 'tabs' ? 'default' : 'ghost'}
                  className="rounded-none h-8 text-xs"
                  onClick={() => setViewMode('tabs')}
                >
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  Onglets
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'kpis' ? 'default' : 'ghost'}
                  className="rounded-none h-8 text-xs"
                  onClick={() => setViewMode('kpis')}
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                  KPIs
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'charts' ? 'default' : 'ghost'}
                  className="rounded-none h-8 text-xs"
                  onClick={() => setViewMode('charts')}
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Graphiques
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'filters' ? 'default' : 'ghost'}
                  className="rounded-none h-8 text-xs"
                  onClick={() => setViewMode('filters')}
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Filtres
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'cross' ? 'default' : 'ghost'}
                  className="rounded-none h-8 text-xs"
                  onClick={() => setViewMode('cross')}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-1" />
                  Croisements
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Sauvegarder tout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ─── TAB MANAGEMENT VIEW ─── */}
      {viewMode === 'tabs' && (
        <div className="space-y-4">
          <TabManager
            localTabs={localTabs}
            onUpdate={(tabs) => { setLocalTabs(tabs); setHasTabChanges(true); }}
          />
          <Button onClick={handleSaveTabs} disabled={!hasTabChanges || isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Sauvegarder la configuration des onglets
          </Button>
        </div>
      )}

      {/* ─── KPIs MANAGEMENT VIEW ─── */}
      {viewMode === 'kpis' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Onglets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-0.5 p-2">
                  {Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isUserTab(key)).map(([key, tab]) => {
                    const kpis = (localItems[key] || []).filter(i => i.item_type === 'kpi');
                    const hiddenKpis = kpis.filter(k => !k.is_visible).length;
                    const tabConf = localTabs.find(t => t.key === key);
                    const tabLabel = tabConf?.label || tab.label;
                    return (
                      <button
                        key={key}
                        onClick={() => handleTabSwitch(key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          activeTab === key
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="font-medium">{tabLabel}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{kpis.length}</Badge>
                          {hiddenKpis > 0 && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {hiddenKpis} masqué{hiddenKpis > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  KPIs — {ANALYTICS_TABS_REGISTRY[activeTab]?.label}
                  <Badge variant="outline" className="text-[9px] ml-1">
                    {currentKpis.length} indicateurs
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('kpi', true)}>
                    <Eye className="h-3 w-3 mr-1" />Tout afficher
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll('kpi', false)}>
                    <EyeOff className="h-3 w-3 mr-1" />Tout masquer
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Sauvegarder
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs mt-1">
                Gérez la visibilité, l'ordre et les titres des indicateurs clés affichés en haut de chaque onglet Analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {currentKpis.length > 0 ? currentKpis.map((item, idx) => (
                  <ItemEditor
                    key={item.item_key}
                    item={item}
                    onChange={(updated) => updateItem(item.item_key, updated)}
                    onMoveUp={() => moveItem(item.item_key, 'up', 'kpi')}
                    onMoveDown={() => moveItem(item.item_key, 'down', 'kpi')}
                    isFirst={idx === 0}
                    isLast={idx === currentKpis.length - 1}
                  />
                )) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Aucun KPI configuré pour cet onglet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── CHARTS MANAGEMENT VIEW ─── */}
      {viewMode === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Tab selector */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Onglets Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-0.5 p-2">
                  {Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isChartsViewTab(key)).map(([key, tab]) => {
                    const stat = tabStats[key];
                    const tabConf = localTabs.find(t => t.key === key);
                    const tabLabel = tabConf?.label || tab.label;
                    const isHiddenTab = tabConf && !tabConf.is_visible;
                    const isModified = modifiedTabs.has(key);
                    const isSpecial = key === 'rdc-map' || key === '_global';
                    return (
                      <button
                        key={key}
                        onClick={() => handleTabSwitch(key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          activeTab === key
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        } ${isHiddenTab ? 'opacity-50' : ''}`}
                      >
                        <span className="font-medium flex items-center gap-1">
                          {isHiddenTab && <EyeOff className="h-3 w-3" />}
                          {key === 'rdc-map' && <MapIcon className="h-3 w-3" />}
                          {key === '_global' && <Globe className="h-3 w-3" />}
                          {tabLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          {isModified && (
                            <Badge variant="destructive" className="text-[8px] h-3.5 px-1">
                              modifié
                            </Badge>
                          )}
                          {key === 'rdc-map' && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1">Carte</Badge>
                          )}
                          {key === '_global' && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1">Global</Badge>
                          )}
                          {stat && stat.hidden > 0 && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {stat.hidden} masqué{stat.hidden > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
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
                  {/* Special sections for rdc-map */}
                  {activeTab === 'rdc-map' && currentCharts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Palette className="h-3.5 w-3.5" />
                          Paramètres carte ({currentCharts.length})
                        </h4>
                      </div>
                      <div className="space-y-1">
                        {currentCharts.map((item, idx) => (
                          <div key={item.item_key} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                            item.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                          }`}>
                            <Switch
                              checked={item.is_visible}
                              onCheckedChange={(checked) => updateItem(item.item_key, { ...item, is_visible: checked })}
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <Input
                                value={item.custom_title || ''}
                                onChange={(e) => updateItem(item.item_key, { ...item, custom_title: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Valeur..."
                              />
                            </div>
                            {item.item_key.startsWith('map-tier-') && (
                              <input
                                type="color"
                                value={item.custom_color || '#3b82f6'}
                                onChange={(e) => updateItem(item.item_key, { ...item, custom_color: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                title="Couleur du palier"
                              />
                            )}
                            <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                              {item.item_key}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-3" />
                    </div>
                  )}

                  {/* KPIs section */}
                  {currentKpis.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {activeTab === 'rdc-map' ? 'KPIs Tooltip & Détails' : `Indicateurs KPI (${currentKpis.length})`}
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
                  )}

                  {/* Charts section — skip for rdc-map (already shown above) */}
                  {activeTab !== 'rdc-map' && currentCharts.length > 0 && (
                  <>
                  <Separator />
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
                  </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── FILTERS MANAGEMENT VIEW ─── */}
      {viewMode === 'filters' && (
        <FilterManager
          localFilters={localFilters}
          onUpdateFilters={(filters) => { setLocalFilters(filters); setHasFilterChanges(true); }}
          localTabs={localTabs}
          onSave={async (items: ChartConfigItem[]) => {
            setIsSaving(true);
            try {
              await upsertConfig.mutateAsync(items);
              toast.success('Configuration des filtres sauvegardée');
              setHasFilterChanges(false);
            } catch (error: any) {
              toast.error(`Erreur: ${error?.message || 'Sauvegarde impossible'}`);
            } finally {
              setIsSaving(false);
            }
          }}
          isSaving={isSaving}
        />
      )}

      {/* ─── CROSS VARIABLES MANAGEMENT VIEW ─── */}
      {viewMode === 'cross' && (
        <div className="space-y-4">
          <CrossVariableManager
            localCross={localCross}
            onUpdateCross={(cross) => { setLocalCross(cross); setHasCrossChanges(true); }}
            localTabs={localTabs}
          />
          <Button
            onClick={async () => {
              setIsSaving(true);
              try {
                const crossItems: ChartConfigItem[] = [];
                Object.entries(localCross).forEach(([tabKey, charts]) => {
                  Object.entries(charts).forEach(([chartKey, config]) => {
                    crossItems.push({
                      tab_key: tabKey,
                      item_key: `cross-${chartKey}`,
                      item_type: 'cross',
                      is_visible: config.enabled,
                      display_order: 0,
                      custom_title: JSON.stringify(config.variables),
                    });
                  });
                });
                await upsertConfig.mutateAsync(crossItems);
                toast.success('Configuration des croisements sauvegardée');
                setHasCrossChanges(false);
              } catch (error: any) {
                toast.error(`Erreur: ${error?.message || 'Sauvegarde impossible'}`);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={!hasCrossChanges || isSaving}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Sauvegarder la configuration des croisements
          </Button>
        </div>
      )}


      <AlertDialog open={!!pendingTabSwitch} onOpenChange={(open) => { if (!open) cancelTabSwitch(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              L'onglet « {ANALYTICS_TABS_REGISTRY[activeTab]?.label} » contient des modifications non sauvegardées. Voulez-vous continuer sans sauvegarder ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabSwitch}>Rester</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabSwitch}>Continuer sans sauvegarder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnalyticsChartsConfig;
