import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Filter, Save, Loader2 } from 'lucide-react';
import {
  ChartConfigItem, TabConfig,
  DATE_FIELD_OPTIONS, STATUS_FIELD_OPTIONS,
} from '@/hooks/useAnalyticsChartsConfig';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { isUserTab } from '@/hooks/useInitializedConfig';

const FILTER_LABELS: Record<string, { label: string; description: string }> = {
  'filter-status': { label: 'Filtre statut', description: 'Afficher le sélecteur de statut (approuvé, en attente, etc.)' },
  'filter-time': { label: 'Filtre temporel', description: 'Afficher les sélecteurs Année / Semestre / Trimestre / Mois' },
  'filter-location': { label: 'Filtre géographique', description: 'Afficher la cascade Province / Section / Ville / Commune / Quartier' },
};

interface FilterManagerProps {
  localFilters: Record<string, ChartConfigItem[]>;
  onUpdateFilters: (filters: Record<string, ChartConfigItem[]>) => void;
  localTabs: TabConfig[];
  onSave: (items: ChartConfigItem[]) => Promise<void>;
  isSaving: boolean;
}

export const FilterManager: React.FC<FilterManagerProps> = ({ localFilters, onUpdateFilters, localTabs, onSave, isSaving }) => {
  const [selectedTab, setSelectedTab] = useState(Object.keys(ANALYTICS_TABS_REGISTRY).filter(isUserTab)[0]);

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
    await onSave(Object.values(localFilters).flat());
  };

  const analyticsTabKeys = Object.keys(ANALYTICS_TABS_REGISTRY).filter(isUserTab);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4 text-primary" />Onglets</CardTitle>
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
                  <button key={key} onClick={() => setSelectedTab(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedTab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}>
                    <span className="font-medium">{label}</span>
                    {hiddenCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}</Badge>}
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
              <Filter className="h-4 w-4" />Filtres — {ANALYTICS_TABS_REGISTRY[selectedTab]?.label || selectedTab}
            </CardTitle>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}Sauvegarder filtres
            </Button>
          </div>
          <CardDescription className="text-xs mt-1">Activez ou désactivez les filtres et configurez les champs sources.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {toggleFilters.map(f => {
              const meta = FILTER_LABELS[f.item_key];
              return (
                <div key={f.item_key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  f.is_visible ? 'bg-card border-border/50' : 'bg-muted/30 border-border/20 opacity-60'
                }`}>
                  <Switch checked={f.is_visible} onCheckedChange={() => toggleFilter(f.item_key)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{meta?.label || f.item_key}</div>
                    <div className="text-xs text-muted-foreground">{meta?.description || ''}</div>
                  </div>
                  <Badge variant={f.is_visible ? 'default' : 'secondary'} className="text-[9px]">{f.is_visible ? 'Actif' : 'Masqué'}</Badge>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Champ date source</Label>
              <Select value={dateFieldItem?.custom_title || 'created_at'} onValueChange={(v) => updateFieldValue('filter-date-field', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Le champ utilisé pour le filtrage temporel</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Champ statut source</Label>
              <Select value={statusFieldItem?.custom_title || 'status'} onValueChange={(v) => updateFieldValue('filter-status-field', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Le champ utilisé pour le filtrage par statut</p>
            </div>
            {toggleFilters.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">Aucun filtre configurable pour cet onglet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
