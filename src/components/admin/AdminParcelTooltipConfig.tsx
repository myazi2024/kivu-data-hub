import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Eye } from 'lucide-react';
import ParcelTooltip from '@/components/cadastral/ParcelTooltip';

interface TooltipFieldConfig {
  field: string;
  label: string;
  enabled: boolean;
  order: number;
}

const AdminParcelTooltipConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<TooltipFieldConfig[]>([
    { field: 'parcelNumber', label: 'Numéro de parcelle', enabled: true, order: 1 },
    { field: 'ownerName', label: 'Nom du propriétaire', enabled: true, order: 2 },
    { field: 'area', label: 'Surface (m²)', enabled: true, order: 3 },
    { field: 'province', label: 'Province', enabled: true, order: 4 },
    { field: 'ville', label: 'Ville', enabled: true, order: 5 },
    { field: 'commune', label: 'Commune', enabled: true, order: 6 },
    { field: 'quartier', label: 'Quartier', enabled: false, order: 7 },
    { field: 'gpsCoordinates', label: 'Coordonnées GPS', enabled: true, order: 8 },
  ]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_results_config')
        .select('*')
        .eq('config_key', 'parcel_tooltip_fields')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.config_value && Array.isArray(data.config_value)) {
        setFields(data.config_value as unknown as TooltipFieldConfig[]);
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('cadastral_results_config')
        .upsert({
          config_key: 'parcel_tooltip_fields',
          config_value: fields as any,
          description: 'Configuration des champs affichés dans l\'infobulle de la carte cadastrale',
          is_active: true
        });

      if (error) throw error;

      toast.success('Configuration sauvegardée avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (field: string) => {
    setFields(prev => prev.map(f => 
      f.field === field ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const moveField = (field: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.field === field);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === fields.length - 1)
    ) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    newFields.forEach((f, i) => f.order = i + 1);
    setFields(newFields);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuration Infobulle Cadastrale</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les champs affichés dans l'infobulle de la carte cadastrale
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="w-full md:w-auto">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration des champs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Champs disponibles</CardTitle>
            <CardDescription>
              Activez ou désactivez les champs à afficher
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div 
                key={field.field}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={field.enabled}
                    onCheckedChange={() => toggleField(field.field)}
                    disabled={field.field === 'parcelNumber'}
                  />
                  <Label className="cursor-pointer flex-1">
                    {field.label}
                    {field.field === 'parcelNumber' && (
                      <span className="text-xs text-muted-foreground ml-2">(obligatoire)</span>
                    )}
                  </Label>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveField(field.field, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveField(field.field, 'down')}
                    disabled={index === fields.length - 1}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Aperçu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu de l'infobulle
            </CardTitle>
            <CardDescription>
              Voici comment l'infobulle apparaîtra sur la carte
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-start justify-center p-6">
            <ParcelTooltip
              parcelNumber="12345/AB/2024"
              ownerName={fields.find(f => f.field === 'ownerName')?.enabled ? "Jean KABAMBA" : undefined}
              area={fields.find(f => f.field === 'area')?.enabled ? 2500 : undefined}
              province={fields.find(f => f.field === 'province')?.enabled ? "Kinshasa" : undefined}
              ville={fields.find(f => f.field === 'ville')?.enabled ? "Kinshasa" : undefined}
              commune={fields.find(f => f.field === 'commune')?.enabled ? "Gombe" : undefined}
              quartier={fields.find(f => f.field === 'quartier')?.enabled ? "Centre-ville" : undefined}
              latitude={fields.find(f => f.field === 'gpsCoordinates')?.enabled ? -4.32190 : undefined}
              longitude={fields.find(f => f.field === 'gpsCoordinates')?.enabled ? 15.30739 : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminParcelTooltipConfig;
