import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Edit2, Check, X, Settings2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { CCC_STATIC_PICKLIST_REGISTRY } from '@/hooks/useCCCFormPicklists';

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
  is_active: boolean;
}

const AdminStaticPicklistManager: React.FC = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>(Object.keys(CCC_STATIC_PICKLIST_REGISTRY)[0]);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingValues, setEditingValues] = useState<string[]>([]);
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const registryEntry = CCC_STATIC_PICKLIST_REGISTRY[selectedKey];
  const isDependent = registryEntry && !Array.isArray(registryEntry.fallback);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const keys = Object.keys(CCC_STATIC_PICKLIST_REGISTRY);
      const { data, error } = await supabase
        .from('cadastral_contribution_config')
        .select('*')
        .in('config_key', keys);
      if (error) throw error;
      setConfigs(data || []);
    } catch (err) {
      console.error('Error fetching static picklists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Load current values when key changes
  useEffect(() => {
    if (!selectedKey || !registryEntry) return;
    const config = configs.find(c => c.config_key === selectedKey);
    const currentValues = config?.config_value || registryEntry.fallback;

    if (isDependent) {
      // For dependent picklists, start with first sub-key
      const map = currentValues as Record<string, string[]>;
      const firstSubKey = Object.keys(map)[0] || null;
      setEditingSubKey(firstSubKey);
      setEditingValues(firstSubKey ? (map[firstSubKey] || []) : []);
    } else {
      setEditingValues(Array.isArray(currentValues) ? currentValues : []);
      setEditingSubKey(null);
    }
    setEditingIndex(null);
    setNewValue('');
  }, [selectedKey, configs]);

  // When sub-key changes for dependent picklists
  useEffect(() => {
    if (!isDependent || !editingSubKey) return;
    const config = configs.find(c => c.config_key === selectedKey);
    const map = (config?.config_value || registryEntry.fallback) as Record<string, string[]>;
    setEditingValues(map[editingSubKey] || []);
    setEditingIndex(null);
    setNewValue('');
  }, [editingSubKey]);

  const getDependentMap = (): Record<string, string[]> => {
    const config = configs.find(c => c.config_key === selectedKey);
    return (config?.config_value || registryEntry.fallback) as Record<string, string[]>;
  };

  const saveValues = async (newValues: string[]) => {
    setSaving(true);
    try {
      let newConfigValue: any;
      if (isDependent && editingSubKey) {
        const map = { ...getDependentMap() };
        map[editingSubKey] = newValues;
        newConfigValue = map;
      } else {
        newConfigValue = newValues;
      }

      const config = configs.find(c => c.config_key === selectedKey);
      if (config) {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .update({ config_value: newConfigValue, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .insert({
            config_key: selectedKey,
            config_value: newConfigValue,
            description: registryEntry.description,
            is_active: true,
          });
        if (error) throw error;
      }

      toast({ title: 'Liste mise à jour' });
      setEditingValues(newValues);
      await fetchConfigs();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!newValue.trim() || editingValues.includes(newValue.trim())) return;
    const updated = [...editingValues, newValue.trim()];
    saveValues(updated);
    setNewValue('');
  };

  const handleRemove = (index: number) => {
    const updated = editingValues.filter((_, i) => i !== index);
    saveValues(updated);
  };

  const handleEdit = (index: number) => {
    if (!editingText.trim() || (editingValues.includes(editingText.trim()) && editingValues[index] !== editingText.trim())) return;
    const updated = [...editingValues];
    updated[index] = editingText.trim();
    saveValues(updated);
    setEditingIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...editingValues];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    saveValues(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= editingValues.length - 1) return;
    const updated = [...editingValues];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    saveValues(updated);
  };

  // For dependent picklists: add a new sub-key
  const [newSubKey, setNewSubKey] = useState('');
  const handleAddSubKey = async () => {
    if (!newSubKey.trim()) return;
    const map = { ...getDependentMap() };
    if (map[newSubKey.trim()]) return;
    map[newSubKey.trim()] = [];

    setSaving(true);
    try {
      const config = configs.find(c => c.config_key === selectedKey);
      if (config) {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .update({ config_value: map as Json, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      }
      toast({ title: 'Catégorie ajoutée' });
      setNewSubKey('');
      await fetchConfigs();
      setEditingSubKey(newSubKey.trim());
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubKey = async (subKey: string) => {
    if (!confirm(`Supprimer la catégorie "${subKey}" et toutes ses valeurs ?`)) return;
    const map = { ...getDependentMap() };
    delete map[subKey];

    setSaving(true);
    try {
      const config = configs.find(c => c.config_key === selectedKey);
      if (config) {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .update({ config_value: map as Json, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      }
      toast({ title: 'Catégorie supprimée' });
      await fetchConfigs();
      const keys = Object.keys(map);
      setEditingSubKey(keys[0] || null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Settings2 className="h-4 w-4" />
        <AlertDescription>
          Gérez les listes déroulantes fixes du formulaire CCC (statut juridique, types de construction, taxes, etc.).
          Les modifications sont appliquées immédiatement au formulaire.
        </AlertDescription>
      </Alert>

      {/* Sélection de la picklist */}
      <div className="space-y-1.5">
        <Label className="text-sm">Liste à configurer</Label>
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CCC_STATIC_PICKLIST_REGISTRY).map(([key, def]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <span>{def.label}</span>
                  {!Array.isArray(def.fallback) && (
                    <Badge variant="outline" className="text-[9px] h-4">dépendant</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {registryEntry && (
          <p className="text-xs text-muted-foreground">{registryEntry.description}</p>
        )}
      </div>

      {/* Dependent picklist: sub-key selector */}
      {isDependent && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-xs font-medium">Catégorie parente</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(getDependentMap()).map(subKey => (
                <div key={subKey} className="flex items-center gap-0.5">
                  <Badge
                    variant={editingSubKey === subKey ? 'default' : 'outline'}
                    className="text-xs cursor-pointer"
                    onClick={() => setEditingSubKey(subKey)}
                  >
                    {subKey}
                  </Badge>
                  <button
                    onClick={() => handleRemoveSubKey(subKey)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <Input
                placeholder="Nouvelle catégorie..."
                value={newSubKey}
                onChange={(e) => setNewSubKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubKey()}
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" onClick={handleAddSubKey} disabled={saving || !newSubKey.trim()} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajouter une nouvelle valeur */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Ajouter une option</Label>
              <Input
                placeholder="Nouvelle valeur..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newValue.trim()} className="h-8">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des valeurs */}
      {editingValues.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Aucune valeur. Ajoutez-en une ci-dessus.
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {editingValues.map((val, index) => (
            <div
              key={`${val}-${index}`}
              className="flex items-center gap-1.5 p-2 border rounded-lg hover:bg-muted/30 transition-colors group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <GripVertical className="h-3 w-3 rotate-180" />
                </button>
                <button onClick={() => handleMoveDown(index)} disabled={index >= editingValues.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <GripVertical className="h-3 w-3" />
                </button>
              </div>

              {editingIndex === index ? (
                <>
                  <Input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit(index)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(index)} disabled={saving} className="h-7 w-7 p-0">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)} className="h-7 w-7 p-0">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">{val}</span>
                  <Badge variant="secondary" className="text-[9px] h-5">#{index + 1}</Badge>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => { setEditingIndex(index); setEditingText(val); }}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleRemove(index)}
                    className="h-7 w-7 p-0 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>{editingValues.length} option{editingValues.length !== 1 ? 's' : ''}</span>
        {isDependent && editingSubKey && <span>Catégorie : {editingSubKey}</span>}
      </div>
    </div>
  );
};

export default AdminStaticPicklistManager;
