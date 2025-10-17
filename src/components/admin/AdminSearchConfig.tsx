import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSearchConfig } from '@/hooks/useSearchConfig';
import { Loader2, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdminSearchConfig = () => {
  const { configs, loading, refetch } = useSearchConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  const handleSave = async (config: any) => {
    try {
      setSaving(config.id);
      
      let parsedValue = config.config_value;
      if (typeof config.config_value === 'string') {
        try {
          parsedValue = JSON.parse(config.config_value);
        } catch (e) {
          toast({
            title: "Erreur de format",
            description: "Le JSON est invalide",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('cadastral_search_config')
        .update({
          config_value: parsedValue,
          description: config.description,
          is_active: config.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Configuration mise à jour avec succès"
      });
      
      setEditingConfig(null);
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (config: any) => {
    try {
      const { error } = await supabase
        .from('cadastral_search_config')
        .update({
          is_active: !config.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Configuration ${!config.is_active ? 'activée' : 'désactivée'}`
      });
      
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderConfigEditor = (config: any) => {
    const isEditing = editingConfig?.id === config.id;
    const currentConfig = isEditing ? editingConfig : config;

    return (
      <Card key={config.id} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{config.config_key}</CardTitle>
              <Badge variant={config.is_active ? "default" : "secondary"}>
                {config.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(config)}
              >
                {config.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingConfig({
                    ...config,
                    config_value: JSON.stringify(config.config_value, null, 2)
                  })}
                >
                  Modifier
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingConfig(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(currentConfig)}
                    disabled={saving === config.id}
                  >
                    {saving === config.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
          {currentConfig.description && (
            <CardDescription>{currentConfig.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={currentConfig.description || ''}
                    onChange={(e) => setEditingConfig({
                      ...currentConfig,
                      description: e.target.value
                    })}
                    placeholder="Description de la configuration"
                  />
                </div>
                <div>
                  <Label>Valeur (JSON)</Label>
                  <Textarea
                    value={currentConfig.config_value}
                    onChange={(e) => setEditingConfig({
                      ...currentConfig,
                      config_value: e.target.value
                    })}
                    className="font-mono text-sm"
                    rows={12}
                  />
                </div>
              </>
            ) : (
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(config.config_value, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuration de la recherche</h2>
        <p className="text-muted-foreground">
          Gérez les paramètres d'affichage et de comportement de la barre de recherche cadastrale
        </p>
      </div>

      <div className="grid gap-4">
        {configs.map(renderConfigEditor)}
      </div>

      {configs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucune configuration trouvée
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSearchConfig;
