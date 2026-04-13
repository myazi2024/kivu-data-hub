import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Save, Loader2, BarChart3, LayoutGrid, Filter, GitBranch,
  AlertTriangle, Layers, Eye, EyeOff, RotateCcw, Settings,
  Palette, Map as MapIcon, Globe
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useAnalyticsChartsConfig,
  useAnalyticsChartsConfigMutations,
  useAnalyticsTabsConfig,
  ChartConfigItem,
  TabConfig,
} from '@/hooks/useAnalyticsChartsConfig';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { CROSS_VARIABLE_REGISTRY } from '@/config/crossVariables';
import { useInitializedConfig, buildCrossItems, isUserTab, isChartsViewTab } from '@/hooks/useInitializedConfig';
import { ItemEditor } from '@/components/admin/analytics-config/ItemEditor';
import { TabManager } from '@/components/admin/analytics-config/TabManager';
import { FilterManager } from '@/components/admin/analytics-config/FilterManager';
import { CrossVariableManager } from '@/components/admin/analytics-config/CrossVariableManager';
import { GlobalWatermarkConfig } from '@/components/admin/analytics-config/GlobalWatermarkConfig';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

const CHART_TYPE_OPTIONS = [
  { value: 'bar-h', label: 'Barres horiz.', icon: '▬' },
  { value: 'bar-v', label: 'Barres vert.', icon: '▮' },
  { value: 'pie', label: 'Camembert', icon: '◕' },
  { value: 'donut', label: 'Donut', icon: '◔' },
  { value: 'area', label: 'Courbe', icon: '〜' },
  { value: 'multi-area', label: 'Multi-courbes', icon: '≋' },
];

const SYSTEM_TABS = ['_global', 'rdc-map'];

const MODE_CONFIG = [
  { key: 'tabs' as const, icon: Layers, label: 'Onglets' },
  { key: 'kpis' as const, icon: LayoutGrid, label: 'KPIs' },
  { key: 'charts' as const, icon: BarChart3, label: 'Graphiques' },
  { key: 'filters' as const, icon: Filter, label: 'Filtres' },
  { key: 'cross' as const, icon: GitBranch, label: 'Croisements' },
];

const AdminAnalyticsChartsConfig: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { configs, isLoading } = useAnalyticsChartsConfig();
  const { tabs: dbTabs } = useAnalyticsTabsConfig();
  const { upsertConfig } = useAnalyticsChartsConfigMutations();

  const urlMode = searchParams.get('mode') as 'tabs' | 'kpis' | 'charts' | 'filters' | 'cross' | null;
  const urlConfigTab = searchParams.get('configTab');

  const defaultFirstTab = Object.keys(ANALYTICS_TABS_REGISTRY).filter(isUserTab)[0];
  const [activeTab, setActiveTab] = useState(urlConfigTab && ANALYTICS_TABS_REGISTRY[urlConfigTab] ? urlConfigTab : defaultFirstTab);
  const [viewMode, setViewMode] = useState<'tabs' | 'kpis' | 'charts' | 'filters' | 'cross'>(
    urlMode || (urlConfigTab && SYSTEM_TABS.includes(urlConfigTab) ? 'charts' : 'charts')
  );

  useEffect(() => {
    if (SYSTEM_TABS.includes(activeTab) && viewMode !== 'charts') {
      setViewMode('charts');
    }
  }, [activeTab, viewMode]);

  const updateUrl = useCallback((mode: string, tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('mode', mode);
      next.set('configTab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSetViewMode = useCallback((mode: 'tabs' | 'kpis' | 'charts' | 'filters' | 'cross') => {
    setViewMode(mode);
    updateUrl(mode, activeTab);
  }, [activeTab, updateUrl]);

  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    const newMode = SYSTEM_TABS.includes(tab) ? 'charts' : viewMode;
    if (SYSTEM_TABS.includes(tab)) setViewMode('charts');
    updateUrl(newMode, tab);
  }, [viewMode, updateUrl]);

  const {
    localItems, setLocalItems, localTabs, setLocalTabs,
    localFilters, setLocalFilters, localCross, setLocalCross,
  } = useInitializedConfig(configs, dbTabs, isLoading);

  const [hasTabChanges, setHasTabChanges] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const [hasCrossChanges, setHasCrossChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedTabs, setModifiedTabs] = useState<Set<string>>(new Set());
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const hasChartChanges = modifiedTabs.size > 0;
  const hasChanges = hasChartChanges || hasTabChanges || hasFilterChanges || hasCrossChanges;

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
  }, [activeTab, markTabModified, setLocalItems]);

  const moveItem = useCallback((itemKey: string, direction: 'up' | 'down', type: 'kpi' | 'chart') => {
    setLocalItems(prev => {
      const items = [...(prev[activeTab] || [])];
      const typeItems = items.filter(i => i.item_type === type);
      const idx = typeItems.findIndex(i => i.item_key === itemKey);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= typeItems.length) return prev;
      [typeItems[idx], typeItems[swapIdx]] = [typeItems[swapIdx], typeItems[idx]];
      typeItems.forEach((item, i) => { typeItems[i] = { ...item, display_order: i }; });
      const otherItems = items.filter(i => i.item_type !== type);
      return { ...prev, [activeTab]: [...otherItems, ...typeItems].sort((a, b) => {
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      }) };
    });
    markTabModified(activeTab);
  }, [activeTab, markTabModified, setLocalItems]);

  const tabConfigToItems = useCallback((tabs: TabConfig[]): ChartConfigItem[] => {
    return tabs.map(t => ({
      tab_key: t.key, item_key: '__tab__', item_type: 'tab' as const,
      is_visible: t.is_visible, display_order: t.display_order,
      custom_title: t.label !== t.defaultLabel ? t.label : null,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await upsertConfig.mutateAsync(localItems[activeTab] || []);
      toast.success(`Configuration "${ANALYTICS_TABS_REGISTRY[activeTab]?.label}" sauvegardée`);
      setModifiedTabs(prev => { const n = new Set(prev); n.delete(activeTab); return n; });
    } catch (error: any) {
      toast.error(`Erreur: ${error?.message || 'Sauvegarde impossible'}`);
    } finally { setIsSaving(false); }
  }, [activeTab, localItems, upsertConfig]);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const allChartItems = Object.values(localItems).flat();
      const tabItems = tabConfigToItems(localTabs);
      const allFilterItems = Object.values(localFilters).flat();
      const crossItems = buildCrossItems(localCross);
      await upsertConfig.mutateAsync([...allChartItems, ...tabItems, ...allFilterItems, ...crossItems]);
      toast.success('Toute la configuration Analytics a été sauvegardée');
      setModifiedTabs(new Set());
      setHasTabChanges(false); setHasFilterChanges(false); setHasCrossChanges(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error?.message || 'Sauvegarde globale impossible'}`);
    } finally { setIsSaving(false); }
  }, [localItems, localTabs, localFilters, localCross, upsertConfig, tabConfigToItems]);

  const handleSaveTabs = useCallback(async () => {
    setIsSaving(true);
    try {
      await upsertConfig.mutateAsync(tabConfigToItems(localTabs));
      toast.success('Configuration des onglets sauvegardée');
      setHasTabChanges(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error?.message || 'Sauvegarde des onglets impossible'}`);
    } finally { setIsSaving(false); }
  }, [localTabs, upsertConfig, tabConfigToItems]);

  const handleReset = useCallback(() => {
    const tab = ANALYTICS_TABS_REGISTRY[activeTab];
    if (!tab) return;
    setLocalItems(prev => ({ ...prev, [activeTab]: [...tab.kpis, ...tab.charts] }));
    markTabModified(activeTab);
    setShowResetConfirm(false);
    toast.info('Configuration réinitialisée (non sauvegardée)');
  }, [activeTab, markTabModified, setLocalItems]);

  const toggleAll = useCallback((type: 'kpi' | 'chart', visible: boolean) => {
    setLocalItems(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(i => i.item_type === type ? { ...i, is_visible: visible } : i),
    }));
    markTabModified(activeTab);
  }, [activeTab, markTabModified, setLocalItems]);

  const handleTabSwitch = useCallback((targetTab: string) => {
    if (modifiedTabs.has(activeTab)) { setPendingTabSwitch(targetTab); }
    else { handleSetActiveTab(targetTab); }
  }, [activeTab, modifiedTabs, handleSetActiveTab]);

  const confirmTabSwitch = useCallback(() => {
    if (pendingTabSwitch) { handleSetActiveTab(pendingTabSwitch); setPendingTabSwitch(null); }
  }, [pendingTabSwitch, handleSetActiveTab]);

  const tabStats = useMemo(() => {
    const stats: Record<string, { kpis: number; charts: number; hidden: number }> = {};
    Object.entries(localItems).forEach(([key, items]) => {
      stats[key] = {
        kpis: items.filter(i => i.item_type === 'kpi').length,
        charts: items.filter(i => i.item_type === 'chart').length,
        hidden: items.filter(i => !i.is_visible).length,
      };
    });
    return stats;
  }, [localItems]);

  // Build sidebar entries for reuse (charts & kpis views)
  const chartsViewEntries = useMemo(() => 
    Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isChartsViewTab(key)), []);
  const kpisViewEntries = useMemo(() => 
    Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isUserTab(key)), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de la configuration...</span>
      </div>
    );
  }

  // Mobile sidebar replacement: a <Select> dropdown
  const renderMobileSidebarSelect = (entries: [string, any][], showIcons?: boolean) => (
    <Select value={activeTab} onValueChange={(v) => handleTabSwitch(v)}>
      <SelectTrigger className="h-9 text-xs w-full">
        <SelectValue placeholder="Choisir un onglet..." />
      </SelectTrigger>
      <SelectContent>
        {entries.map(([key, tab]) => {
          const tabConf = localTabs.find(t => t.key === key);
          return (
            <SelectItem key={key} value={key} className="text-xs">
              {showIcons && key === '_global' && '🌐 '}
              {showIcons && key === 'rdc-map' && '🗺️ '}
              {tabConf?.label || tab.label}
              {modifiedTabs.has(key) ? ' •' : ''}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  // Toggle buttons (show all / hide all) — compact on mobile
  const renderToggleButtons = (type: 'kpi' | 'chart') => (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll(type, true)}>
        <Eye className="h-3 w-3" />{!isMobile && <span className="ml-1">Tout afficher</span>}
      </Button>
      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => toggleAll(type, false)}>
        <EyeOff className="h-3 w-3" />{!isMobile && <span className="ml-1">Tout masquer</span>}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Configuration des graphiques Analytics</span>
            </CardTitle>
            {!isMobile && (
              <CardDescription className="mt-1">
                Gérez les onglets, la visibilité, l'ordre, les titres, couleurs et types de chaque graphique et KPI.
              </CardDescription>
            )}
          </div>

          {/* Mode bar + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Mode switcher */}
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex items-center border rounded-lg overflow-hidden w-max">
                {MODE_CONFIG.map(({ key, icon: Icon, label }) => (
                  <Button key={key} size="sm" variant={viewMode === key ? 'default' : 'ghost'}
                    className="rounded-none h-8 text-xs px-2 sm:px-3 shrink-0" onClick={() => handleSetViewMode(key)}>
                    <Icon className="h-3.5 w-3.5" />
                    {!isMobile && <span className="ml-1">{label}</span>}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                  Non sauvegardé
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={!hasChanges || isSaving} className={isMobile ? 'flex-1' : ''}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {isMobile ? 'Sauvegarder' : 'Sauvegarder tout'}
              </Button>
            </div>
          </div>

          {desyncWarnings.length > 0 && (
            <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                {desyncWarnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* TAB MANAGEMENT VIEW */}
      {viewMode === 'tabs' && (
        <div className="space-y-4">
          <TabManager localTabs={localTabs} onUpdate={(tabs) => { setLocalTabs(tabs); setHasTabChanges(true); }} />
          <Button onClick={handleSaveTabs} disabled={!hasTabChanges || isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Sauvegarder la configuration des onglets
          </Button>
        </div>
      )}

      {/* KPIs VIEW */}
      {viewMode === 'kpis' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar: Select on mobile, full list on desktop */}
          {isMobile ? (
            <div className="px-1">
              {renderMobileSidebarSelect(kpisViewEntries)}
            </div>
          ) : (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" />Onglets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-0.5 p-2">
                    {kpisViewEntries.map(([key, tab]) => {
                      const kpis = (localItems[key] || []).filter(i => i.item_type === 'kpi');
                      const hiddenKpis = kpis.filter(k => !k.is_visible).length;
                      const tabConf = localTabs.find(t => t.key === key);
                      return (
                        <button key={key} onClick={() => handleTabSwitch(key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            activeTab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}>
                          <span className="font-medium">{tabConf?.label || tab.label}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{kpis.length}</Badge>
                            {hiddenKpis > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{hiddenKpis} masqué{hiddenKpis > 1 ? 's' : ''}</Badge>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card className={isMobile ? '' : 'lg:col-span-3'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="truncate">KPIs — {ANALYTICS_TABS_REGISTRY[activeTab]?.label}</span>
                  <Badge variant="outline" className="text-[9px] ml-1">{currentKpis.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  {renderToggleButtons('kpi')}
                  <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {!isMobile && 'Sauvegarder'}
                  </Button>
                </div>
              </div>
              {!isMobile && <CardDescription className="text-xs mt-1">Gérez la visibilité, l'ordre et les titres des indicateurs clés.</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {currentKpis.length > 0 ? currentKpis.map((item, idx) => (
                  <ItemEditor key={item.item_key} item={item}
                    onChange={(updated) => updateItem(item.item_key, updated)}
                    onMoveUp={() => moveItem(item.item_key, 'up', 'kpi')}
                    onMoveDown={() => moveItem(item.item_key, 'down', 'kpi')}
                    isFirst={idx === 0} isLast={idx === currentKpis.length - 1} />
                )) : <div className="text-sm text-muted-foreground text-center py-8">Aucun KPI configuré pour cet onglet.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CHARTS VIEW */}
      {viewMode === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar: Select on mobile, full list on desktop */}
          {isMobile ? (
            <div className="px-1">
              {renderMobileSidebarSelect(chartsViewEntries, true)}
            </div>
          ) : (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Onglets Analytics</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-0.5 p-2">
                    {chartsViewEntries.map(([key, tab]) => {
                      const stat = tabStats[key];
                      const tabConf = localTabs.find(t => t.key === key);
                      const isHiddenTab = tabConf && !tabConf.is_visible;
                      const isModified = modifiedTabs.has(key);
                      return (
                        <button key={key} onClick={() => handleTabSwitch(key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            activeTab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                          } ${isHiddenTab ? 'opacity-50' : ''}`}>
                          <span className="font-medium flex items-center gap-1">
                            {isHiddenTab && <EyeOff className="h-3 w-3" />}
                            {key === 'rdc-map' && <MapIcon className="h-3 w-3" />}
                            {key === '_global' && <Globe className="h-3 w-3" />}
                            {tabConf?.label || tab.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {isModified && <Badge variant="destructive" className="text-[8px] h-3.5 px-1">modifié</Badge>}
                            {key === 'rdc-map' && <Badge variant="outline" className="text-[8px] h-3.5 px-1">Carte</Badge>}
                            {key === '_global' && <Badge variant="outline" className="text-[8px] h-3.5 px-1">Global</Badge>}
                            {stat && stat.hidden > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{stat.hidden} masqué{stat.hidden > 1 ? 's' : ''}</Badge>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card className={isMobile ? '' : 'lg:col-span-3'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="truncate">{ANALYTICS_TABS_REGISTRY[activeTab]?.label}</span>
                  {!isMobile && <Badge variant="outline" className="text-[9px] ml-1">{currentKpis.length} KPIs · {currentCharts.length} Charts</Badge>}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowResetConfirm(true)}>
                    <RotateCcw className="h-3 w-3" />{!isMobile && <span className="ml-1">Réinitialiser</span>}
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {!isMobile && 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className={isMobile ? 'max-h-[60vh]' : 'h-[460px]'}>
                <div className="space-y-4">
                  {/* rdc-map special section */}
                  {activeTab === 'rdc-map' && currentCharts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Palette className="h-3.5 w-3.5" />Paramètres carte ({currentCharts.length})
                        </h4>
                      </div>
                      <div className="space-y-1">
                        {currentCharts.map((item) => (
                          <div key={item.item_key} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border transition-colors ${
                            item.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                          }`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Switch checked={item.is_visible} onCheckedChange={(checked) => updateItem(item.item_key, { ...item, is_visible: checked })} className="shrink-0" />
                              <Input value={item.custom_title || ''} onChange={(e) => updateItem(item.item_key, { ...item, custom_title: e.target.value })} className="h-7 text-xs flex-1" placeholder="Valeur..." />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {item.item_key.startsWith('map-tier-') && (
                                <input type="color" value={item.custom_color || '#3b82f6'} onChange={(e) => updateItem(item.item_key, { ...item, custom_color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Couleur du palier" />
                              )}
                              <Badge variant="outline" className="text-[9px] shrink-0 font-mono">{item.item_key}</Badge>
                            </div>
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
                        {renderToggleButtons('kpi')}
                      </div>
                      <div className="space-y-1">
                        {currentKpis.map((item, idx) => (
                          <ItemEditor key={item.item_key} item={item}
                            onChange={(updated) => updateItem(item.item_key, updated)}
                            onMoveUp={() => moveItem(item.item_key, 'up', 'kpi')}
                            onMoveDown={() => moveItem(item.item_key, 'down', 'kpi')}
                            isFirst={idx === 0} isLast={idx === currentKpis.length - 1} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Global watermark config */}
                  {activeTab === '_global' && currentCharts.length > 0 && (
                    <GlobalWatermarkConfig charts={currentCharts} onUpdateItem={updateItem} />
                  )}

                  {/* Charts section */}
                  {activeTab !== 'rdc-map' && activeTab !== '_global' && currentCharts.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" />Graphiques ({currentCharts.length})
                          </h4>
                          {renderToggleButtons('chart')}
                        </div>
                        <div className="space-y-1">
                          {currentCharts.map((item, idx) => (
                            <ItemEditor key={item.item_key} item={item}
                              onChange={(updated) => updateItem(item.item_key, updated)}
                              onMoveUp={() => moveItem(item.item_key, 'up', 'chart')}
                              onMoveDown={() => moveItem(item.item_key, 'down', 'chart')}
                              isFirst={idx === 0} isLast={idx === currentCharts.length - 1} />
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

      {/* FILTERS VIEW */}
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
            } finally { setIsSaving(false); }
          }}
          isSaving={isSaving}
        />
      )}

      {/* CROSS VARIABLES VIEW */}
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
                const crossItems = buildCrossItems(localCross);
                await upsertConfig.mutateAsync(crossItems);
                toast.success('Configuration des croisements sauvegardée');
                setHasCrossChanges(false);
              } catch (error: any) {
                toast.error(`Erreur: ${error?.message || 'Sauvegarde impossible'}`);
              } finally { setIsSaving(false); }
            }}
            disabled={!hasCrossChanges || isSaving}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Sauvegarder la configuration des croisements
          </Button>
        </div>
      )}

      {/* Unsaved changes dialog */}
      <AlertDialog open={!!pendingTabSwitch} onOpenChange={(open) => { if (!open) setPendingTabSwitch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              L'onglet « {ANALYTICS_TABS_REGISTRY[activeTab]?.label} » contient des modifications non sauvegardées. Voulez-vous continuer sans sauvegarder ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTabSwitch(null)}>Rester</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabSwitch}>Continuer sans sauvegarder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser la configuration ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les paramètres de l'onglet « {ANALYTICS_TABS_REGISTRY[activeTab]?.label} » seront remis aux valeurs par défaut. Cette action n'est pas sauvegardée tant que vous ne cliquez pas sur "Sauvegarder".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Réinitialiser</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnalyticsChartsConfig;
