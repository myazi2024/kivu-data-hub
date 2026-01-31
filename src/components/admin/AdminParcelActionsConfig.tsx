import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, Plus, Save, 
  Eye, EyeOff, Sparkles, Clock,
  ChevronUp, ChevronDown, RotateCcw, Beaker, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useParcelActionsConfig, ParcelAction, ActionBadge } from '@/hooks/useParcelActionsConfig';

const BADGE_TYPES = [
  { value: 'none', label: 'Aucun', color: 'bg-transparent' },
  { value: 'nouveau', label: 'Nouveau', color: 'bg-seloger-red' },
  { value: 'bientot', label: 'Bientôt', color: 'bg-amber-500' },
  { value: 'beta', label: 'Bêta', color: 'bg-blue-500' },
  { value: 'promo', label: 'Promo', color: 'bg-green-500' }
];

const CATEGORIES = [
  { value: 'expertise', label: 'Expertise' },
  { value: 'mutation', label: 'Mutation' },
  { value: 'mortgage', label: 'Hypothèque' },
  { value: 'permit', label: 'Permis' },
  { value: 'tax', label: 'Taxes' },
  { value: 'subdivision', label: 'Lotissement' }
];

const AdminParcelActionsConfig: React.FC = () => {
  const { actions: loadedActions, saveConfig, resetToDefaults, DEFAULT_ACTIONS, loading } = useParcelActionsConfig();
  const [actions, setActions] = useState<ParcelAction[]>(DEFAULT_ACTIONS);
  const [selectedAction, setSelectedAction] = useState<ParcelAction | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with loaded actions from hook
  useEffect(() => {
    if (!loading && loadedActions.length > 0) {
      setActions(loadedActions);
    }
  }, [loadedActions, loading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveConfig(actions);
      
      toast.success('Configuration sauvegardée', {
        description: 'Les modifications seront appliquées immédiatement dans le dropdown Actions.'
      });
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setActions(DEFAULT_ACTIONS);
    setSelectedAction(null);
    setHasChanges(false);
    toast.info('Configuration réinitialisée aux valeurs par défaut');
  };

  const updateAction = (id: string, updates: Partial<ParcelAction>) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (selectedAction?.id === id) {
      setSelectedAction(prev => prev ? { ...prev, ...updates } : null);
    }
    setHasChanges(true);
  };

  const moveAction = (id: string, direction: 'up' | 'down') => {
    const index = actions.findIndex(a => a.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === actions.length - 1)) {
      return;
    }
    
    const newActions = [...actions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
    
    // Mettre à jour displayOrder
    newActions.forEach((a, i) => {
      a.displayOrder = i + 1;
    });
    
    setActions(newActions);
    setHasChanges(true);
  };

  const getBadgePreview = (badge: ActionBadge) => {
    if (badge.type === 'none') return null;
    
    const badgeConfig = BADGE_TYPES.find(b => b.value === badge.type);
    const label = badge.type === 'nouveau' ? 'nouveau' : 
                  badge.type === 'bientot' ? 'Bientôt' :
                  badge.type === 'beta' ? 'Bêta' :
                  badge.type === 'promo' ? 'Promo' : '';
    
    return (
      <Badge 
        className={`h-4 px-1.5 text-[9px] font-bold text-white uppercase tracking-wide flex items-center gap-0.5 ${badgeConfig?.color}`}
      >
        {badge.type === 'nouveau' && <Sparkles className="h-2.5 w-2.5" />}
        {badge.type === 'bientot' && <Clock className="h-2.5 w-2.5" />}
        {label}
      </Badge>
    );
  };

  const sortedActions = [...actions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration Actions Parcelle
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gérez les actions disponibles dans le menu déroulant des résultats cadastraux
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions du menu</CardTitle>
            <CardDescription className="text-xs">
              Cliquez sur une action pour modifier ses paramètres
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {sortedActions.map((action, index) => (
                  <div
                    key={action.id}
                    onClick={() => setSelectedAction(action)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedAction?.id === action.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                    } ${!action.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); moveAction(action.id, 'up'); }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); moveAction(action.id, 'down'); }}
                        disabled={index === sortedActions.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{action.label}</span>
                        {getBadgePreview(action.badge)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {action.isVisible ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={action.isActive}
                        onCheckedChange={(checked) => {
                          updateAction(action.id, { isActive: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Panneau d'édition */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {selectedAction ? 'Modifier l\'action' : 'Sélectionnez une action'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAction ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Libellé</Label>
                  <Input
                    value={selectedAction.label}
                    onChange={(e) => updateAction(selectedAction.id, { label: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={selectedAction.description}
                    onChange={(e) => updateAction(selectedAction.id, { description: e.target.value })}
                    className="h-16 resize-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Badge</Label>
                  <Select
                    value={selectedAction.badge.type}
                    onValueChange={(value) => updateAction(selectedAction.id, { 
                      badge: { ...selectedAction.badge, type: value as ActionBadge['type'] }
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BADGE_TYPES.map(badge => (
                        <SelectItem key={badge.value} value={badge.value}>
                          <div className="flex items-center gap-2">
                            {badge.value !== 'none' && (
                              <div className={`w-3 h-3 rounded-full ${badge.color}`} />
                            )}
                            {badge.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Catégorie</Label>
                  <Select
                    value={selectedAction.category}
                    onValueChange={(value) => updateAction(selectedAction.id, { category: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Visible dans le menu</Label>
                    <Switch
                      checked={selectedAction.isVisible}
                      onCheckedChange={(checked) => updateAction(selectedAction.id, { isVisible: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Actif (cliquable)</Label>
                    <Switch
                      checked={selectedAction.isActive}
                      onCheckedChange={(checked) => updateAction(selectedAction.id, { isActive: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Requiert authentification</Label>
                    <Switch
                      checked={selectedAction.requiresAuth}
                      onCheckedChange={(checked) => updateAction(selectedAction.id, { requiresAuth: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Aperçu */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Aperçu</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{selectedAction.label}</span>
                      {getBadgePreview(selectedAction.badge)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedAction.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sélectionnez une action dans la liste pour modifier ses paramètres</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistiques */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>{actions.filter(a => a.isActive && a.isVisible).length} actions actives</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{actions.filter(a => a.badge.type === 'bientot').length} en développement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-seloger-red" />
              <span>{actions.filter(a => a.badge.type === 'nouveau').length} nouveautés</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span>{actions.filter(a => !a.isVisible).length} masquées</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminParcelActionsConfig;
