import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { TabConfig } from '@/hooks/useAnalyticsChartsConfig';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { CROSS_VARIABLE_REGISTRY } from '@/config/crossVariables';
import { LocalCrossConfig } from '@/hooks/useInitializedConfig';

interface CrossVariableManagerProps {
  localCross: LocalCrossConfig;
  onUpdateCross: (cross: LocalCrossConfig) => void;
  localTabs: TabConfig[];
  activeTab?: string;
}

export const CrossVariableManager: React.FC<CrossVariableManagerProps> = ({ localCross, onUpdateCross, localTabs, activeTab: externalTab }) => {
  const analyticsTabKeys = Object.keys(CROSS_VARIABLE_REGISTRY).filter(key => !!ANALYTICS_TABS_REGISTRY[key]);
  const [selectedTab, setSelectedTab] = React.useState(
    externalTab && analyticsTabKeys.includes(externalTab) ? externalTab : analyticsTabKeys[0]
  );

  // Sync with parent activeTab when switching to Cross view
  useEffect(() => {
    if (externalTab && analyticsTabKeys.includes(externalTab)) {
      setSelectedTab(externalTab);
    }
  }, [externalTab, analyticsTabKeys]);

  const tabCross = localCross[selectedTab] || {};
  const chartKeys = Object.keys(CROSS_VARIABLE_REGISTRY[selectedTab] || {});

  const toggleChartPicklist = (chartKey: string) => {
    const current = tabCross[chartKey] || { enabled: true, variables: [] };
    onUpdateCross({ ...localCross, [selectedTab]: { ...tabCross, [chartKey]: { ...current, enabled: !current.enabled } } });
  };

  const toggleVariable = (chartKey: string, field: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross, [selectedTab]: { ...tabCross, [chartKey]: {
        ...current, variables: current.variables.map(v => v.field === field ? { ...v, enabled: !v.enabled } : v),
      } },
    });
  };

  const updateVariableLabel = (chartKey: string, field: string, newLabel: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross, [selectedTab]: { ...tabCross, [chartKey]: {
        ...current, variables: current.variables.map(v => v.field === field ? { ...v, label: newLabel } : v),
      } },
    });
  };

  const updateVariableField = (chartKey: string, oldField: string, newField: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross, [selectedTab]: { ...tabCross, [chartKey]: {
        ...current, variables: current.variables.map(v => v.field === oldField ? { ...v, field: newField } : v),
      } },
    });
  };

  const addVariable = (chartKey: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross, [selectedTab]: { ...tabCross, [chartKey]: {
        ...current, variables: [...current.variables, { label: 'Nouveau', field: 'new_field', enabled: true }],
      } },
    });
  };

  const removeVariable = (chartKey: string, field: string) => {
    const current = tabCross[chartKey];
    if (!current) return;
    onUpdateCross({
      ...localCross, [selectedTab]: { ...tabCross, [chartKey]: {
        ...current, variables: current.variables.filter(v => v.field !== field),
      } },
    });
  };

  const getChartTitle = (tabKey: string, chartKey: string): string => {
    const tab = ANALYTICS_TABS_REGISTRY[tabKey];
    if (!tab) return chartKey;
    const item = [...tab.charts, ...tab.kpis].find(c => c.item_key === chartKey);
    return item?.custom_title || chartKey;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Onglets</CardTitle>
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
                  <button key={key} onClick={() => setSelectedTab(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedTab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}>
                    <span className="font-medium">{label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{crossCount}</Badge>
                      {disabledCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{disabledCount} off</Badge>}
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
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />Croisements — {ANALYTICS_TABS_REGISTRY[selectedTab]?.label || selectedTab}
          </CardTitle>
          <CardDescription className="text-xs mt-1">Activez/désactivez le picklist de croisement par graphique.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {chartKeys.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Aucun graphique croisable.</div>}
              {chartKeys.map(chartKey => {
                const config = tabCross[chartKey] || { enabled: true, variables: [] };
                const chartTitle = getChartTitle(selectedTab, chartKey);
                return (
                  <div key={chartKey} className={`rounded-lg border p-3 space-y-2 transition-colors ${
                    config.enabled ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={config.enabled} onCheckedChange={() => toggleChartPicklist(chartKey)} />
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
                            <Switch checked={v.enabled} onCheckedChange={() => toggleVariable(chartKey, v.field)} className="scale-75" />
                            <Input value={v.label} onChange={(e) => updateVariableLabel(chartKey, v.field, e.target.value)} className="h-6 text-[10px] flex-1 max-w-[120px]" placeholder="Label" />
                            <Input value={v.field} onChange={(e) => updateVariableField(chartKey, v.field, e.target.value)} className="h-6 text-[10px] flex-1 max-w-[140px] font-mono" placeholder="field_name" />
                            <button onClick={() => removeVariable(chartKey, v.field)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors" title="Supprimer">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 mt-1" onClick={() => addVariable(chartKey)}>
                          <Plus className="h-3 w-3 mr-1" />Ajouter une variable
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
