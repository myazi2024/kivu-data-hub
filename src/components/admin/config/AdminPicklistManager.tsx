import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Edit2, Check, X, ListFilter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PicklistValue {
  id: string;
  picklist_key: string;
  value: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Known picklist keys used in the CCC form and expertise form
const KNOWN_PICKLIST_KEYS = [
  { key: 'state_agencies_drc', label: 'Agences de l\'État (RDC)', description: 'Services et agences de l\'État congolais' },
  { key: 'noise_sources', label: 'Sources de bruit', description: 'Sources de nuisance sonore à proximité' },
  { key: 'nearby_amenities', label: 'Commodités à proximité', description: 'Infrastructures et services à proximité' },
];

const AdminPicklistManager: React.FC = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<PicklistValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>(KNOWN_PICKLIST_KEYS[0].key);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New value form
  const [newValue, setNewValue] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(true);
  const [adding, setAdding] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // New custom key
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');

  const fetchAllKeys = useCallback(async () => {
    const { data } = await supabase
      .from('suggestive_picklist_values')
      .select('picklist_key');
    
    if (data) {
      const uniqueKeys = [...new Set(data.map(d => d.picklist_key))];
      setAllKeys(uniqueKeys);
    }
  }, []);

  const fetchValues = useCallback(async () => {
    if (!selectedKey) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suggestive_picklist_values')
        .select('*')
        .eq('picklist_key', selectedKey)
        .order('is_default', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setValues(data || []);
    } catch (err) {
      console.error('Error fetching picklist values:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    fetchAllKeys();
  }, [fetchAllKeys]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from('suggestive_picklist_values')
        .insert({
          picklist_key: selectedKey,
          value: newValue.trim(),
          is_default: newIsDefault,
          usage_count: 0,
        });
      if (error) throw error;
      toast({ title: 'Valeur ajoutée', description: `"${newValue.trim()}" a été ajoutée à la liste` });
      setNewValue('');
      setNewIsDefault(true);
      fetchValues();
      fetchAllKeys();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('suggestive_picklist_values')
        .update({ value: editValue.trim(), is_default: editIsDefault, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Valeur mise à jour' });
      setEditingId(null);
      fetchValues();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, value: string) => {
    if (!confirm(`Supprimer "${value}" de la liste ?`)) return;
    try {
      const { error } = await supabase
        .from('suggestive_picklist_values')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Valeur supprimée' });
      fetchValues();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleDefault = async (id: string, currentDefault: boolean) => {
    try {
      const { error } = await supabase
        .from('suggestive_picklist_values')
        .update({ is_default: !currentDefault, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      fetchValues();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddCustomKey = () => {
    if (!newKeyValue.trim()) return;
    const slug = newKeyValue.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setSelectedKey(slug);
    setShowNewKey(false);
    setNewKeyValue('');
    setNewKeyLabel('');
    toast({ title: 'Nouvelle liste créée', description: `Ajoutez des valeurs à "${slug}"` });
  };

  const combinedKeys = [...new Set([...KNOWN_PICKLIST_KEYS.map(k => k.key), ...allKeys])];
  const getKeyLabel = (key: string) => {
    const known = KNOWN_PICKLIST_KEYS.find(k => k.key === key);
    return known?.label || key;
  };
  const getKeyDescription = (key: string) => {
    const known = KNOWN_PICKLIST_KEYS.find(k => k.key === key);
    return known?.description || '';
  };

  const filteredValues = values.filter(v =>
    v.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Alert>
        <ListFilter className="h-4 w-4" />
        <AlertDescription>
          Gérez les listes de valeurs proposées dans le formulaire CCC (picklists suggestifs).
          Les valeurs marquées "Par défaut" apparaissent toujours. Les autres apparaissent après 2 utilisations.
        </AlertDescription>
      </Alert>

      {/* Sélection de la picklist */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm">Liste de valeurs</Label>
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {combinedKeys.map(key => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{getKeyLabel(key)}</span>
                    <Badge variant="outline" className="text-[9px] h-4">{key}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getKeyDescription(selectedKey) && (
            <p className="text-xs text-muted-foreground">{getKeyDescription(selectedKey)}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewKey(!showNewKey)}
          className="h-9"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nouvelle liste
        </Button>
      </div>

      {/* Créer nouvelle clé */}
      {showNewKey && (
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Identifiant (slug)</Label>
                <Input
                  placeholder="ex: building_materials"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Libellé (optionnel)</Label>
                <Input
                  placeholder="ex: Matériaux de construction"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCustomKey} className="h-7 text-xs">Créer</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewKey(false)} className="h-7 text-xs">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajouter une nouvelle valeur */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nouvelle valeur</Label>
              <Input
                placeholder="Saisir une nouvelle valeur..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Par défaut</Label>
              <Switch checked={newIsDefault} onCheckedChange={setNewIsDefault} />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding || !newValue.trim()} className="h-8">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recherche */}
      {values.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filtrer les valeurs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      )}

      {/* Liste des valeurs */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredValues.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {values.length === 0
            ? 'Aucune valeur dans cette liste. Ajoutez-en une ci-dessus.'
            : 'Aucun résultat pour votre recherche.'}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {filteredValues.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {editingId === item.id ? (
                // Edit mode
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(item.id)}
                  />
                  <div className="flex items-center gap-1">
                    <Label className="text-[10px]">Défaut</Label>
                    <Switch
                      checked={editIsDefault}
                      onCheckedChange={setEditIsDefault}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdate(item.id)}
                    disabled={saving}
                    className="h-7 w-7 p-0"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                // View mode
                <>
                  <span className="text-sm flex-1 truncate">{item.value}</span>
                  <Badge
                    variant={item.is_default ? 'default' : 'outline'}
                    className="text-[9px] h-5 cursor-pointer"
                    onClick={() => handleToggleDefault(item.id, item.is_default)}
                  >
                    {item.is_default ? 'Par défaut' : 'Suggéré'}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] h-5">
                    {item.usage_count} usage{item.usage_count !== 1 ? 's' : ''}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditValue(item.value);
                      setEditIsDefault(item.is_default);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.value)}
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

      {/* Stats */}
      {values.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span>{values.length} valeur{values.length !== 1 ? 's' : ''} au total</span>
          <span>{values.filter(v => v.is_default).length} par défaut</span>
          <span>{values.reduce((sum, v) => sum + v.usage_count, 0)} utilisations</span>
        </div>
      )}
    </div>
  );
};

export default AdminPicklistManager;
